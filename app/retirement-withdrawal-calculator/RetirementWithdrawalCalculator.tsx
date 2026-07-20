'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { NumericInput, Tooltip } from '../_mortgage-shared/ui';
import { fmtCAD, fmtCADx, fmtUSD, fmtUSDx } from '../_mortgage-shared/math';
import { useRegion } from '@/lib/region/context';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  AlertTriangle, BookOpen, Banknote,
  HelpCircle, Mail, Download, ShieldAlert, Sparkles, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import { buildWithdrawalPDF } from '@/lib/pdf/adapters/withdrawalAdapter';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimingKey = 'beginning' | 'end';

interface FormState {
  currentSavings:      string;
  annualWithdrawal:    string;
  annualReturn:        string;
  inflationRate:       string;
  currentAge:          string;
  withdrawalStartAge:  string;
  targetEndingBalance: string;
}

interface YearSnapshot {
  year:             number;
  age:              number;
  balance:          number;
  withdrawal:       number;
  growth:           number;
  totalWithdrawn:   number;
}

interface WithdrawalResults {
  // Inputs (parsed)
  currentSavings:       number;
  annualWithdrawal:     number;
  annualReturn:         number;
  inflationRate:        number;
  currentAge:           number;
  withdrawalStartAge:   number;
  targetEndingBalance:  number;
  timing:               TimingKey;
  // Simulation outputs
  yearsLasting:         number;       // years withdrawals ran before depletion/horizon
  depletionAge:         number | null; // null = never depleted within horizon
  depleted:             boolean;
  targetReached:        boolean;      // depleted, but stopped at a positive target reserve (not true $0 depletion)
  noWithdrawalPhase:    boolean;      // horizon ended before any withdrawal year was simulated
  snapshots:            YearSnapshot[];
  // Key outputs
  firstYearRate:        number;        // annualWithdrawal / currentSavings
  withdrawalAtYear10:   number;
  withdrawalAtYear20:   number;
  withdrawalAtYear30:   number;
  totalWithdrawn:       number;
  remainingBalance:     number;        // balance at end of sim
  // Sustainability
  sustainabilityStatus: 'Sustainable' | 'Watch' | 'At Risk' | 'Depleted' | 'Target Balance Reached' | 'No Withdrawal Phase Simulated';
  sustainabilityScore:  number;        // 0–100 (raw internal value — not meaningful for targetReached/noWithdrawalPhase, see sustainabilityScoreDisplay)
  sustainabilityScoreRated: boolean;   // false when the numeric score should NOT be shown as meaningful (targetReached or noWithdrawalPhase)
  sustainabilityScoreDisplay: string;  // what to actually render in place of the number: "Goal Met" / "Not Rated" / the numeric score
  sustainabilityColor:  string;
  sustainabilityBg:     string;
  sustainabilityRgb:    string;        // "r,g,b" channel triple matching sustainabilityColor, for inline rgba() use
  // Smart insight
  rateLabel:            'Conservative' | 'Moderate / Watch' | 'Elevated Pressure';
  rateColor:            string;
  keyDriver:            string;
  // Withdrawal pressure
  pressureScore:        number;        // 0–100 (higher = more portfolio pressure)
  pressureStatus:       'Conservative' | 'Moderate' | 'Watch' | 'Elevated Pressure';
  pressureColor:        string;
  pressureBg:           string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  currentSavings:      '500000',
  annualWithdrawal:    '25000',
  annualReturn:        '6',
  inflationRate:       '2.5',
  currentAge:          '65',
  withdrawalStartAge:  '65',
  targetEndingBalance: '0',
};

const DEFAULT_TIMING: TimingKey = 'end';
const MAX_HORIZON = 50;

// ─── Math helpers ─────────────────────────────────────────────────────────────

function safe(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

// ─── Year-by-year simulation ──────────────────────────────────────────────────

function runSimulation(
  currentSavings: number,
  annualWithdrawal: number,
  annualReturn: number,  // decimal e.g. 0.06
  inflationRate: number, // decimal e.g. 0.025
  currentAge: number,
  withdrawalStartAge: number,
  targetEndingBalance: number,
  timing: TimingKey,
): { snapshots: YearSnapshot[]; depleted: boolean; finalBalance: number } {
  const snapshots: YearSnapshot[] = [];
  let balance = currentSavings;
  let totalWithdrawn = 0;
  let depleted = false;
  const target = Math.max(0, targetEndingBalance);

  for (let y = 0; y < MAX_HORIZON; y++) {
    const age = currentAge + y;

    if (age < withdrawalStartAge) {
      // Deferral phase: grow only
      const growth = balance * annualReturn;
      balance = balance + growth;
      snapshots.push({ year: y, age, balance: safe(balance), withdrawal: 0, growth: safe(growth), totalWithdrawn });
      continue;
    }

    const yearsIntoWithdrawal = age - withdrawalStartAge;
    const inflationFactor = Math.pow(1 + inflationRate, yearsIntoWithdrawal);
    const thisWithdrawal = annualWithdrawal * (Number.isFinite(inflationFactor) ? inflationFactor : 1);

    let growth: number;

    if (timing === 'beginning') {
      // Withdraw first, then grow
      balance = balance - thisWithdrawal;
      if (balance <= target) {
        totalWithdrawn += Math.max(0, balance + thisWithdrawal - target);
        balance = target;
        snapshots.push({ year: y, age, balance: safe(balance), withdrawal: safe(thisWithdrawal), growth: 0, totalWithdrawn: safe(totalWithdrawn) });
        depleted = true;
        break;
      }
      growth = balance * annualReturn;
      balance = balance + growth;
    } else {
      // Grow first, then withdraw
      growth = balance * annualReturn;
      balance = balance + growth;
      balance = balance - thisWithdrawal;
      if (balance <= target) {
        // Actual funds available to withdraw this year, capped at the pre-withdrawal
        // balance minus the target floor (mirrors the Beginning-of-Year branch above).
        totalWithdrawn += Math.max(0, balance + thisWithdrawal - target);
        balance = target;
        snapshots.push({ year: y, age, balance: safe(balance), withdrawal: safe(thisWithdrawal), growth: safe(growth), totalWithdrawn: safe(totalWithdrawn) });
        depleted = true;
        break;
      }
    }

    totalWithdrawn += thisWithdrawal;
    snapshots.push({ year: y, age, balance: safe(balance), withdrawal: safe(thisWithdrawal), growth: safe(growth), totalWithdrawn: safe(totalWithdrawn) });
  }

  return { snapshots, depleted, finalBalance: safe(balance) };
}

// ─── Core compute ─────────────────────────────────────────────────────────────

function computeResults(form: FormState, timing: TimingKey): WithdrawalResults | null {
  const currentSavings      = Math.max(0, parseFloat(form.currentSavings)      || 0);
  const annualWithdrawal    = Math.max(0, parseFloat(form.annualWithdrawal)    || 0);
  const annualReturnPct     = clamp(parseFloat(form.annualReturn)    || 0, 0, 49.9);
  const inflationRatePct    = clamp(parseFloat(form.inflationRate)   || 0, 0, 49.9);
  const currentAge          = clamp(parseInt(form.currentAge)        || 65, 18, 100);
  const withdrawalStartAge  = clamp(parseInt(form.withdrawalStartAge) || 65, currentAge, currentAge + 50);
  const targetEndingBalance = Math.max(0, parseFloat(form.targetEndingBalance) || 0);

  if (currentSavings <= 0) return null;
  if (annualWithdrawal <= 0) return null;

  const annualReturn = annualReturnPct / 100;
  const inflationRate = inflationRatePct / 100;

  const { snapshots, depleted, finalBalance } = runSimulation(
    currentSavings, annualWithdrawal, annualReturn, inflationRate,
    currentAge, withdrawalStartAge, targetEndingBalance, timing,
  );

  if (snapshots.length === 0) return null;

  // Years the portfolio lasted (withdrawal years only)
  const withdrawalSnapshots = snapshots.filter(s => s.withdrawal > 0);
  const yearsLasting = withdrawalSnapshots.length;

  // Depletion age
  const depletionAge = depleted
    ? snapshots[snapshots.length - 1].age
    : null;

  // Key outputs
  const firstYearRate = currentSavings > 0 ? annualWithdrawal / currentSavings : 0;
  const inflFactor = (y: number) => {
    const f = Math.pow(1 + inflationRate, y);
    return Number.isFinite(f) ? f : 1;
  };
  const withdrawalAtYear10 = annualWithdrawal * inflFactor(10);
  const withdrawalAtYear20 = annualWithdrawal * inflFactor(20);
  const withdrawalAtYear30 = annualWithdrawal * inflFactor(30);

  const lastSnap = snapshots[snapshots.length - 1];
  const totalWithdrawn = safe(lastSnap.totalWithdrawn);
  const remainingBalance = depleted ? safe(targetEndingBalance) : finalBalance;

  // A positive Target Ending Balance was reached — this is a preserved reserve, not true depletion.
  const targetReached = depleted && targetEndingBalance > 0;
  // The modeled horizon ended entirely within the deferral phase — no withdrawal year was ever simulated.
  const noWithdrawalPhase = !depleted && yearsLasting === 0;

  // Sustainability status
  let sustainabilityStatus: WithdrawalResults['sustainabilityStatus'];
  if (targetReached) {
    sustainabilityStatus = 'Target Balance Reached';
  } else if (noWithdrawalPhase) {
    sustainabilityStatus = 'No Withdrawal Phase Simulated';
  } else if (!depleted) {
    sustainabilityStatus = 'Sustainable';
  } else if (yearsLasting >= 30) {
    sustainabilityStatus = 'Sustainable';
  } else if (yearsLasting >= 20) {
    sustainabilityStatus = 'Watch';
  } else if (yearsLasting >= 10) {
    sustainabilityStatus = 'At Risk';
  } else {
    sustainabilityStatus = 'Depleted';
  }

  // Sustainability score 0–100
  let score: number;
  if (!depleted) {
    score = 100;
  } else if (yearsLasting >= 50) {
    score = 100;
  } else if (yearsLasting >= 40) {
    score = 90;
  } else if (yearsLasting >= 30) {
    score = 75;
  } else if (yearsLasting >= 20) {
    score = 55;
  } else if (yearsLasting >= 10) {
    score = 30;
  } else {
    score = 10;
  }
  const firstYearRatePct = firstYearRate * 100;
  if (firstYearRatePct < 3.5) score = Math.min(100, score + 5);
  else if (firstYearRatePct > 6) score = Math.max(0, score - 15);
  else if (firstYearRatePct > 5) score = Math.max(0, score - 10);
  const sustainabilityScore = Math.round(clamp(score, 0, 100));

  // The numeric score is not a meaningful assessment for these two special states —
  // present a state-appropriate label instead (score formula/thresholds above are unchanged).
  const sustainabilityScoreRated = !targetReached && !noWithdrawalPhase;
  const sustainabilityScoreDisplay = targetReached
    ? 'Goal Met'
    : noWithdrawalPhase
      ? 'Not Rated'
      : `${sustainabilityScore}`;

  const sustainabilityColor =
    sustainabilityStatus === 'Sustainable' || sustainabilityStatus === 'Target Balance Reached' ? '#1DB584' :
    sustainabilityStatus === 'Watch'                                                            ? '#f59e0b' :
    sustainabilityStatus === 'No Withdrawal Phase Simulated'                                     ? '#64748b' : '#ef4444';
  const sustainabilityBg =
    sustainabilityStatus === 'Sustainable' || sustainabilityStatus === 'Target Balance Reached' ? 'rgba(29,181,132,0.10)' :
    sustainabilityStatus === 'Watch'                                                            ? 'rgba(245,158,11,0.10)' :
    sustainabilityStatus === 'No Withdrawal Phase Simulated'                                     ? 'rgba(100,116,139,0.10)' : 'rgba(239,68,68,0.10)';
  const sustainabilityRgb =
    sustainabilityStatus === 'Sustainable' || sustainabilityStatus === 'Target Balance Reached' ? '29,181,132' :
    sustainabilityStatus === 'Watch'                                                            ? '245,158,11' :
    sustainabilityStatus === 'No Withdrawal Phase Simulated'                                     ? '100,116,139' : '239,68,68';

  // Rate label
  const rateLabel: WithdrawalResults['rateLabel'] =
    firstYearRatePct < 3.5 ? 'Conservative' :
    firstYearRatePct <= 5  ? 'Moderate / Watch' :
    'Elevated Pressure';
  const rateColor =
    rateLabel === 'Conservative'     ? '#1DB584' :
    rateLabel === 'Moderate / Watch' ? '#f59e0b' : '#ef4444';

  // Key driver
  let keyDriver: string;
  const returnVsInflation = annualReturnPct - inflationRatePct;
  if (noWithdrawalPhase) {
    keyDriver = 'deferred withdrawal start beyond the simulation horizon';
  } else if (targetReached) {
    keyDriver = 'target balance preservation';
  } else if (firstYearRatePct > 5) {
    keyDriver = 'withdrawal rate pressure';
  } else if (returnVsInflation < 1.5 && inflationRatePct > 2) {
    keyDriver = 'inflation pressure';
  } else if (annualReturnPct < 4) {
    keyDriver = 'return rate gap';
  } else if (timing === 'beginning') {
    keyDriver = 'beginning-of-year withdrawal timing';
  } else {
    keyDriver = 'portfolio longevity';
  }

  // Withdrawal pressure score (0–100; higher = more pressure on portfolio)
  let pressureScore: number;
  if (firstYearRatePct < 3.5)      pressureScore = 12;
  else if (firstYearRatePct < 5)   pressureScore = 38;
  else if (firstYearRatePct < 6)   pressureScore = 62;
  else                             pressureScore = 82;
  if (inflationRatePct > 4)        pressureScore = Math.min(100, pressureScore + 10);
  else if (inflationRatePct > 3)   pressureScore = Math.min(100, pressureScore + 5);
  if (depleted && yearsLasting < 10)       pressureScore = Math.min(100, pressureScore + 15);
  else if (depleted && yearsLasting < 20)  pressureScore = Math.min(100, pressureScore + 10);
  pressureScore = Math.round(clamp(pressureScore, 0, 100));
  const pressureStatus: WithdrawalResults['pressureStatus'] =
    pressureScore <= 30 ? 'Conservative' :
    pressureScore <= 55 ? 'Moderate' :
    pressureScore <= 72 ? 'Watch' : 'Elevated Pressure';
  const pressureColor =
    pressureStatus === 'Conservative'    ? '#1DB584' :
    pressureStatus === 'Moderate'        ? '#22c55e' :
    pressureStatus === 'Watch'           ? '#f59e0b' : '#ef4444';
  const pressureBg =
    pressureStatus === 'Conservative'    ? 'rgba(29,181,132,0.10)' :
    pressureStatus === 'Moderate'        ? 'rgba(34,197,94,0.10)' :
    pressureStatus === 'Watch'           ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

  return {
    currentSavings, annualWithdrawal, annualReturn: annualReturnPct,
    inflationRate: inflationRatePct, currentAge, withdrawalStartAge, targetEndingBalance, timing,
    yearsLasting, depletionAge, depleted, targetReached, noWithdrawalPhase, snapshots,
    firstYearRate, withdrawalAtYear10, withdrawalAtYear20, withdrawalAtYear30,
    totalWithdrawn, remainingBalance,
    sustainabilityStatus, sustainabilityScore, sustainabilityScoreRated, sustainabilityScoreDisplay,
    sustainabilityColor, sustainabilityBg, sustainabilityRgb,
    rateLabel, rateColor, keyDriver,
    pressureScore, pressureStatus, pressureColor, pressureBg,
  };
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(15,41,66,0.09)',
  borderRadius: '20px',
  background: '#ffffff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.03)',
};

const inputClsCompact =
  'w-full rounded-brand-sm border-[1.5px] border-brand-gray-200 text-brand-navy bg-brand-gray-50 ' +
  'pr-2 md:pr-3 pl-3 py-1 md:py-2 text-sm transition-colors duration-150 ' +
  'focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/[0.15]';

const navyLabelStyle: React.CSSProperties = {
  fontWeight: 700, color: '#0D1B2A',
  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4,
};
const navyLabelCls = 'text-[10px] md:text-xs';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RetirementWithdrawalCalculator({ formulaContent, faqItems = [] }: Props) {
  const { region } = useRegion();
  const isCA = region === 'ca';
  const cp   = isCA ? 'CA$' : '$';
  const fmt  = isCA ? fmtCAD  : fmtUSD;
  const fmtx = isCA ? fmtCADx : fmtUSDx;

  const [form, setForm]     = useState<FormState>(DEFAULTS);
  const [timing, setTiming] = useState<TimingKey>(DEFAULT_TIMING);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const results = useMemo(() => computeResults(form, timing), [form, timing]);

  function scrollToAI() {
    const el = document.getElementById('rw-ai');
    if (!el) return;
    const navH = (document.querySelector('header') as HTMLElement | null)?.getBoundingClientRect().height ?? 64;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - 16), behavior: 'smooth' });
  }

  function fmtShort(n: number): string {
    if (n >= 1_000_000) return `${cp}${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${cp}${Math.round(n / 1_000)}k`;
    return `${cp}${Math.round(n)}`;
  }

  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      await buildWithdrawalPDF({
        currentSavings:       results.currentSavings,
        annualWithdrawal:     results.annualWithdrawal,
        annualReturn:         results.annualReturn,
        inflationRate:        results.inflationRate,
        currentAge:           results.currentAge,
        withdrawalStartAge:   results.withdrawalStartAge,
        targetEndingBalance:  results.targetEndingBalance,
        timing:               results.timing,
        yearsLasting:         results.yearsLasting,
        depletionAge:         results.depletionAge,
        depleted:             results.depleted,
        firstYearRate:        results.firstYearRate,
        withdrawalAtYear10:   results.withdrawalAtYear10,
        withdrawalAtYear20:   results.withdrawalAtYear20,
        withdrawalAtYear30:   results.withdrawalAtYear30,
        totalWithdrawn:       results.totalWithdrawn,
        remainingBalance:     results.remainingBalance,
        targetReached:        results.targetReached,
        noWithdrawalPhase:    results.noWithdrawalPhase,
        sustainabilityStatus: results.sustainabilityStatus,
        sustainabilityScore:  results.sustainabilityScore,
        pressureScore:        results.pressureScore,
        pressureStatus:       results.pressureStatus,
        region,
      });
    } catch (e) {
      console.error('PDF generation failed', e);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-y-7 md:gap-y-8 min-w-0">

      <style>{`
        @keyframes teal-glow-rw {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-rw {
          animation: teal-glow-rw 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-rw:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
        .rw-pill { flex: 1; min-width: 0; text-align: center; }
        .rw-pills { display: flex; gap: 6px; }
      `}</style>

      {/* ══ Block A: Input Card + Results Card ══════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

        {/* ── Input Card ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 lg:self-start" style={cardStyle}>
          <div className="p-5 md:p-6">

            <div className="flex items-center gap-3 mb-4 md:mb-5">
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'linear-gradient(135deg,#1DB584 0%,#0ea56e 100%)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(29,181,132,0.30)',
              }}>
                <Banknote size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Canada &amp; USA · Retirement Drawdown
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Withdrawal Details</p>
              </div>
            </div>

            {/* Row 1: two columns */}
            <div className="grid grid-cols-2 gap-x-3 md:gap-x-5 mb-3">
              <div className="space-y-3 min-w-0">
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Current Retirement Savings
                    <Tooltip text="Your total portfolio value at the start of retirement — the balance you will draw from." />
                  </label>
                  <NumericInput
                    value={form.currentSavings}
                    onChange={v => set('currentSavings', v)}
                    prefix={cp}
                    inputClassName={inputClsCompact}
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Expected Annual Return
                    <Tooltip text="Assumed annual investment return on your portfolio during retirement. Actual returns vary and are not guaranteed." />
                  </label>
                  <NumericInput
                    value={form.annualReturn}
                    onChange={v => set('annualReturn', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Current Age
                    <Tooltip text="Your age today. Used to calculate your depletion age and chart your portfolio timeline." />
                  </label>
                  <NumericInput
                    value={form.currentAge}
                    onChange={v => set('currentAge', v)}
                    inputClassName={inputClsCompact}
                    placeholder="e.g. 65"
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Target Ending Balance
                    <Tooltip text="Optional minimum balance to preserve — for example, to leave an inheritance or maintain a buffer. Default is $0 (full drawdown)." />
                  </label>
                  <NumericInput
                    value={form.targetEndingBalance}
                    onChange={v => set('targetEndingBalance', v)}
                    prefix={cp}
                    inputClassName={inputClsCompact}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="border-l pl-2 md:pl-5 space-y-3 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Annual Withdrawal
                    <Tooltip text="The amount you plan to withdraw in the first year of retirement. This grows with inflation each year." />
                  </label>
                  <NumericInput
                    value={form.annualWithdrawal}
                    onChange={v => set('annualWithdrawal', v)}
                    prefix={cp}
                    inputClassName={inputClsCompact}
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Inflation Rate
                    <Tooltip text="Annual inflation rate applied to your withdrawal each year to maintain the same real purchasing power." />
                  </label>
                  <NumericInput
                    value={form.inflationRate}
                    onChange={v => set('inflationRate', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Withdrawal Start Age
                    <Tooltip text="The age at which you begin withdrawals. If later than your current age, your portfolio grows without withdrawals during the deferral period." />
                  </label>
                  <NumericInput
                    value={form.withdrawalStartAge}
                    onChange={v => set('withdrawalStartAge', v)}
                    inputClassName={inputClsCompact}
                    placeholder="e.g. 65"
                  />
                </div>
              </div>
            </div>

            {/* Withdrawal Timing pills */}
            <div className="pt-3" style={{ borderTop: '1px solid rgba(15,41,66,0.07)' }}>
              <label className={navyLabelCls} style={{ ...navyLabelStyle, marginBottom: 6 }}>
                Withdrawal Timing
                <Tooltip text="Beginning of Year: withdraw first, then invest for the year. End of Year: invest first, then withdraw. Beginning of Year is slightly more conservative." />
              </label>
              <div className="rw-pills">
                {([
                  { key: 'beginning' as TimingKey, label: 'Beginning of Year' },
                  { key: 'end'       as TimingKey, label: 'End of Year' },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    className="rw-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
                    onClick={() => setTiming(opt.key)}
                    style={
                      timing === opt.key
                        ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                        : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Derived display */}
            {results && (
              <div className="flex items-center gap-2 mt-3 px-1">
                <div className="h-px flex-1" style={{ background: 'rgba(15,41,66,0.06)' }} />
                <span className="text-[11px] font-semibold" style={{ color: results.rateColor, whiteSpace: 'nowrap' }}>
                  First-year rate: {(results.firstYearRate * 100).toFixed(1)}%
                </span>
                <div className="h-px flex-1" style={{ background: 'rgba(15,41,66,0.06)' }} />
              </div>
            )}

          </div>
        </div>

        {/* Mobile CTA */}
        <div className="lg:hidden">
          <MobileCalcCTA />
        </div>

        {/* ── Results Card ─────────────────────────────────────────────────── */}
        <div id="calc-results" className="lg:col-span-5" style={{ scrollMarginTop: '80px' }}>
          <div
            className="flex flex-col h-full p-5 md:p-6 rounded-[20px]"
            style={{
              background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 55%, #0D1B2A 100%)',
              border: `1px solid rgba(${results ? results.sustainabilityRgb : '29,181,132'},0.22)`,
              minHeight: 340,
              boxShadow: `0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(${results ? results.sustainabilityRgb : '29,181,132'},0.08)`,
            }}
          >
            {!results && (
              <div className="flex flex-1 items-center justify-center py-12">
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                  Enter your retirement savings and withdrawal amount to see the projection.
                </p>
              </div>
            )}

            {results && (
              <div className="flex flex-col flex-1 gap-4">

                {/* Hero */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${results.sustainabilityRgb},0.18)` }}
                >
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: `rgba(${results.sustainabilityRgb},0.7)` }}>
                    {results.noWithdrawalPhase ? 'No Withdrawal Phase Simulated' :
                     results.targetReached     ? 'Target Balance Reached At' :
                     results.depleted          ? 'Portfolio Depletes At' : 'Portfolio Lasts Through'}
                  </p>
                  <p style={{ color: results.sustainabilityColor, fontSize: '36px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 6 }}>
                    {results.depleted
                      ? `Age ${results.depletionAge}`
                      : `Age ${results.currentAge + MAX_HORIZON}+`}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', marginTop: 4, fontWeight: 500 }}>
                    {results.noWithdrawalPhase
                      ? `withdrawals start at age ${results.withdrawalStartAge} — beyond the ${MAX_HORIZON}-year horizon`
                      : results.targetReached
                        ? `${results.yearsLasting} year${results.yearsLasting !== 1 ? 's' : ''} of withdrawals · reaches target balance at age ${results.depletionAge}`
                        : results.depleted
                          ? `${results.yearsLasting} year${results.yearsLasting !== 1 ? 's' : ''} of withdrawals · depletes at age ${results.depletionAge}`
                          : `lasts ${results.yearsLasting} withdrawal years · ending balance ${fmtShort(results.remainingBalance)}`}
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Starting Portfolio</span>
                    <span className="text-[13px] font-bold" style={{ color: '#1DB584' }}>{fmt(results.currentSavings)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">Annual Withdrawal (Year 1)</span>
                    <span className="text-[13px] font-semibold text-white">{fmt(results.annualWithdrawal)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">First-Year Rate</span>
                    <span className="text-[13px] font-semibold" style={{ color: results.rateColor }}>
                      {(results.firstYearRate * 100).toFixed(1)}% · {results.rateLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">Total Withdrawn</span>
                    <span className="text-[13px] font-semibold text-white">{fmt(results.totalWithdrawn)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">
                      {results.depleted ? 'Ending Balance' : 'Remaining at Horizon'}
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: results.depleted && !results.targetReached ? '#94a3b8' : '#1DB584' }}>
                      {results.depleted && results.targetEndingBalance === 0 ? '—' : fmt(results.remainingBalance)}
                    </span>
                  </div>
                </div>

                {/* Status pill */}
                {(() => {
                  const s =
                    results.sustainabilityStatus === 'Sustainable' || results.sustainabilityStatus === 'Target Balance Reached'
                                                                    ? { bg: 'rgba(29,181,132,0.15)',  border: 'rgba(29,181,132,0.35)', color: '#1DB584'  } :
                    results.sustainabilityStatus === 'Watch'       ? { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.30)', color: '#f59e0b'  } :
                    results.sustainabilityStatus === 'At Risk'     ? { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.28)', color: '#ef4444'  } :
                    results.sustainabilityStatus === 'No Withdrawal Phase Simulated'
                                                                    ? { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.35)', color: '#64748b' } :
                    { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)', color: '#ef4444' };
                  const showCheck = (results.targetReached || !results.depleted) && !results.noWithdrawalPhase;
                  return (
                    <div className="flex items-center justify-center rounded-xl py-2 px-3"
                      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: s.color }}>
                        {showCheck ? '✓ ' : ''}
                        {results.sustainabilityStatus}
                        {results.noWithdrawalPhase
                          ? ` · Starts Age ${results.withdrawalStartAge}`
                          : results.targetReached
                            ? ` · Reaches Target Age ${results.depletionAge}`
                            : !results.depleted
                              ? ` · Lasts ${MAX_HORIZON}+ years`
                              : ` · Depletes Age ${results.depletionAge}`}
                      </span>
                    </div>
                  );
                })()}

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See your withdrawal sustainability score, drawdown chart, and insights below.
                  </p>
                  <button
                    className="btn-ai-cta-rw w-full font-bold overflow-hidden"
                    onClick={scrollToAI}
                    onMouseEnter={() => setAiCtaHovered(true)}
                    onMouseLeave={() => setAiCtaHovered(false)}
                    style={{
                      position: 'relative', background: '#060F1A', color: '#ffffff',
                      borderRadius: 8, height: 40, fontSize: '13px',
                      border: '1px solid rgba(29,181,132,0.4)',
                    }}
                  >
                    <span style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      whiteSpace: 'nowrap', opacity: aiCtaHovered ? 0 : 1, transition: 'opacity 200ms ease', pointerEvents: 'none',
                    }}>
                      View Withdrawal Insight ↓
                    </span>
                    <span style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      whiteSpace: 'nowrap', opacity: aiCtaHovered ? 1 : 0, transition: 'opacity 200ms ease', pointerEvents: 'none',
                    }}>
                      <Sparkles size={13} style={{ marginRight: 6, color: '#1DB584' }} aria-hidden />
                      See Drawdown Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ Block B: Drawdown Chart (7) + Sustainability Snapshot (5) ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

        {/* ── Left: Retirement Drawdown Timeline ────────────────────────── */}
        <div className="lg:col-span-7" style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Portfolio over time
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Retirement Drawdown Timeline</h3>
            </div>

            {!results && (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter your details to see the drawdown timeline.
                </p>
              </div>
            )}

            {results && (() => {
              const snaps = results.snapshots;
              if (snaps.length < 2) return (
                <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                  style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                  <p className="text-sm text-center px-4" style={{ color: 'rgba(13,27,42,0.4)' }}>
                    Portfolio depletes immediately at this withdrawal amount. Reduce your annual withdrawal to see a timeline.
                  </p>
                </div>
              );

              const firstAge = snaps[0].age;
              const lastAge  = snaps[snaps.length - 1].age;

              // Sample at 5-year intervals (2-year if short horizon)
              const ageStep = (lastAge - firstAge) <= 12 ? 2 : 5;
              const sampleAges: number[] = [firstAge];
              const startMult = Math.ceil((firstAge + 1) / ageStep) * ageStep;
              for (let a = startMult; a < lastAge; a += ageStep) sampleAges.push(a);
              if (sampleAges[sampleAges.length - 1] !== lastAge) sampleAges.push(lastAge);

              // Balance at a given age (nearest snapshot)
              const getBalAt = (targetAge: number) => {
                let best = snaps[0];
                for (const s of snaps) {
                  if (Math.abs(s.age - targetAge) < Math.abs(best.age - targetAge)) best = s;
                }
                return best.balance;
              };

              const barData = sampleAges.map(age => ({ age, balance: getBalAt(age) }));
              const n = barData.length;

              const maxBal = Math.max(...barData.map(d => d.balance), results.currentSavings);
              const maxVal = maxBal > 0 ? maxBal * 1.08 : 10000;

              const CW = 500, CH = 195, PAD_T = 28, PAD_B = 22, PAD_L = 6, PAD_R = 6;
              const plotW = CW - PAD_L - PAD_R;
              const plotH = CH - PAD_T - PAD_B;
              const slotW  = plotW / n;
              const barW   = Math.max(6, slotW * 0.62);
              const xOf    = (i: number) => PAD_L + slotW * i + slotW / 2;
              const yOf    = (v: number) => PAD_T + plotH * (1 - Math.min(1, v / maxVal));
              const baseY  = PAD_T + plotH;

              // Bar color (pressure-aware gradient when depleted)
              const getBarColor = (balance: number): string => {
                if (!results.depleted || results.targetReached) return '#1DB584';
                const ratio = balance / results.currentSavings;
                if (ratio > 0.45) return '#1DB584';
                if (ratio > 0.18) return '#f59e0b';
                return '#ef4444';
              };

              const linePts = barData.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.balance).toFixed(1)}`).join(' ');

              // Deferral phase
              const firstWithdrawalSnap = snaps.find(s => s.withdrawal > 0);
              const hasDeferral = !!firstWithdrawalSnap && firstWithdrawalSnap.age > firstAge;
              const deferralEndAge = hasDeferral ? firstWithdrawalSnap!.age : firstAge;
              let deferralEndX = PAD_L;
              if (hasDeferral) {
                let bestIdx = 0;
                for (let i = 1; i < barData.length; i++) {
                  if (barData[i].age <= deferralEndAge) bestIdx = i;
                }
                deferralEndX = xOf(bestIdx) + slotW / 2;
              }

              return (
                <div className="flex-1 flex flex-col min-w-0">
                  <div style={{ position: 'relative' }}>
                    <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden>

                      {/* Baseline */}
                      <line x1={PAD_L} y1={baseY} x2={CW - PAD_R} y2={baseY}
                        stroke="rgba(15,41,66,0.08)" strokeWidth="1" />

                      {/* Deferral region */}
                      {hasDeferral && (
                        <>
                          <rect x={PAD_L} y={PAD_T} width={(deferralEndX - PAD_L).toFixed(1)} height={plotH}
                            fill="rgba(56,119,219,0.07)" rx="3" />
                          <line x1={deferralEndX.toFixed(1)} y1={PAD_T.toFixed(1)}
                                x2={deferralEndX.toFixed(1)} y2={baseY.toFixed(1)}
                            stroke="rgba(56,119,219,0.35)" strokeWidth="1.5" strokeDasharray="4 3" />
                          {/* Label above chart area — clear of bars and axis labels */}
                          <text
                            x={Math.max(58, Math.min(CW - 58, deferralEndX)).toFixed(1)}
                            y={(PAD_T - 7).toFixed(1)}
                            textAnchor="middle"
                            fill="rgba(56,119,219,0.85)"
                            fontSize="9.5"
                            fontWeight="700"
                          >
                            Withdrawals start
                          </text>
                        </>
                      )}

                      {/* Bars */}
                      {barData.map((d, i) => {
                        const cx  = xOf(i);
                        const bh  = Math.max(2, baseY - yOf(d.balance));
                        const by  = baseY - bh;
                        const col = getBarColor(d.balance);
                        return (
                          <rect key={i}
                            x={(cx - barW / 2).toFixed(1)} y={by.toFixed(1)}
                            width={barW.toFixed(1)} height={bh.toFixed(1)}
                            rx="3" fill={col} opacity={d.balance === 0 ? 0.3 : 0.82}
                          />
                        );
                      })}

                      {/* Overlay line */}
                      <polyline points={linePts} fill="none"
                        stroke={results.depleted && !results.targetReached ? '#ef4444' : '#1DB584'}
                        strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity={0.65} />

                      {/* Dots on bar tops */}
                      {barData.map((d, i) => (
                        <circle key={i} cx={xOf(i).toFixed(1)} cy={yOf(d.balance).toFixed(1)} r="2.5"
                          fill={getBarColor(d.balance)} stroke="white" strokeWidth="1" />
                      ))}

                      {/* Depletion / target-reached marker */}
                      {results.depleted && (() => {
                        const cx = xOf(n - 1);
                        const cy = yOf(barData[n - 1].balance);
                        const markerColor = results.targetReached ? '#1DB584' : '#ef4444';
                        const markerLabel = results.targetReached ? 'TARGET MET' : 'DEPLETED';
                        const pillW = results.targetReached ? 74 : 62, pillH = 28;
                        const pillX = Math.max(PAD_L, Math.min(CW - PAD_R - pillW, cx - pillW / 2));
                        const pillY = Math.max(PAD_T - 10, cy - 42);
                        const midX  = (pillX + pillW / 2).toFixed(1);
                        return (
                          <>
                            <line x1={cx.toFixed(1)} y1={PAD_T.toFixed(1)}
                                  x2={cx.toFixed(1)} y2={(baseY - Math.max(2, baseY - cy)).toFixed(1)}
                              stroke={results.targetReached ? 'rgba(29,181,132,0.3)' : 'rgba(239,68,68,0.3)'} strokeWidth="1" strokeDasharray="4 3" />
                            <rect x={pillX.toFixed(1)} y={pillY.toFixed(1)} width={pillW} height={pillH} rx="5" fill={markerColor} />
                            <text textAnchor="middle" fill="white">
                              <tspan x={midX} y={(pillY + 11).toFixed(1)} fontSize="7.5" fontWeight="600" opacity="0.85">{markerLabel}</tspan>
                              <tspan x={midX} y={(pillY + 22).toFixed(1)} fontSize="11" fontWeight="800">Age {results.depletionAge}</tspan>
                            </text>
                          </>
                        );
                      })()}

                      {/* Ending balance callout */}
                      {!results.depleted && (() => {
                        const cx = xOf(n - 1);
                        const cy = yOf(barData[n - 1].balance);
                        return (
                          <>
                            <circle cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="5"
                              fill="#1DB584" stroke="white" strokeWidth="1.5" />
                            <text x={(cx - 8).toFixed(1)} y={(cy - 9).toFixed(1)}
                              textAnchor="end" fill="#0D1B2A" fontSize="10" fontWeight="700">
                              {fmtShort(barData[n - 1].balance)}
                            </text>
                          </>
                        );
                      })()}

                    </svg>

                    {/* X-axis age labels */}
                    <div style={{ position: 'relative', height: 18, marginTop: 2 }}>
                      {barData.map((d, i) => {
                        const isFirst = i === 0;
                        const isLast  = i === n - 1;
                        if (n > 7 && !isFirst && !isLast && i % 2 !== 0) return null;
                        const xPct      = ((xOf(i) / CW) * 100).toFixed(1);
                        const transform = isFirst ? 'none' : isLast ? 'translateX(-100%)' : 'translateX(-50%)';
                        return (
                          <span key={i} style={{
                            position: 'absolute', left: `${xPct}%`, transform,
                            fontSize: '11px', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap',
                          }}>
                            Age {d.age}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chart legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-3 rounded-sm" style={{ background: results.depleted && !results.targetReached ? '#ef4444' : '#1DB584', opacity: 0.85 }} />
                      <span style={{ fontSize: '10.5px', color: '#6B7A8D' }}>Portfolio Balance</span>
                    </div>
                    {hasDeferral && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(56,119,219,0.35)' }} />
                        <span style={{ fontSize: '10.5px', color: '#6B7A8D' }}>Deferral Phase</span>
                      </div>
                    )}
                    {results.depleted && results.targetReached && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: '#1DB584' }} />
                        <span style={{ fontSize: '10.5px', color: '#6B7A8D' }}>Target Reached</span>
                      </div>
                    )}
                    {results.depleted && !results.targetReached && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
                        <span style={{ fontSize: '10.5px', color: '#6B7A8D' }}>Depletion Point</span>
                      </div>
                    )}
                    {!results.depleted && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: '#1DB584' }} />
                        <span style={{ fontSize: '10.5px', color: '#6B7A8D' }}>Ending Balance</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Right: Withdrawal Sustainability Snapshot ─────────────────── */}
        <div className="lg:col-span-5" style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Sustainability
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Withdrawal Sustainability Snapshot</h3>
            </div>

            {!results && (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter your details to see sustainability.
                </p>
              </div>
            )}

            {results && (() => {
              const SEMI_R = 88, CX = 104, CY = 100;
              const SEMI_C = Math.PI * SEMI_R;
              const ratio   = results.targetReached ? 1 : results.noWithdrawalPhase ? 0 : results.sustainabilityScore / 100;
              const fillAmt = ratio * SEMI_C;
              const trackPath = `M ${CX - SEMI_R} ${CY} A ${SEMI_R} ${SEMI_R} 0 0 1 ${CX + SEMI_R} ${CY}`;
              const gc = results.sustainabilityColor;
              const gb = results.sustainabilityBg;
              return (
                <div className="flex flex-col flex-1 gap-2">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1 w-full">
                      <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                        Withdrawal Sustainability Score
                      </p>
                      <span className="ml-auto px-2 py-0.5 rounded-full shrink-0" style={{ fontSize: '10px', fontWeight: 700, background: gb, color: gc }}>
                        {results.sustainabilityStatus}
                      </span>
                    </div>
                    <div style={{ position: 'relative', width: CX * 2, maxWidth: '100%' }}>
                      <svg viewBox={`0 0 ${CX * 2} ${CY + 10}`} width="100%" style={{ display: 'block' }} aria-hidden>
                        <path d={trackPath} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="22" strokeLinecap="round" />
                        <path d={trackPath} fill="none" stroke={gc} strokeWidth="22" strokeLinecap="round"
                          strokeDasharray={`${fillAmt.toFixed(1)} 1000`}
                          style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                      </svg>
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 0,
                      }}>
                        <span style={{
                          fontSize: results.sustainabilityScoreRated ? '2rem' : '1.15rem',
                          fontWeight: 800, color: gc, lineHeight: 1.1, textAlign: 'center', padding: '0 8px',
                        }}>
                          {results.sustainabilityScoreDisplay}
                        </span>
                        {results.sustainabilityScoreRated && (
                          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>/ 100</span>
                        )}
                      </div>
                    </div>
                    <span className="mt-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: gb, color: gc }}>
                      {results.sustainabilityStatus}
                    </span>
                  </div>

                  <div className="divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Years Portfolio Lasts</span>
                      <span className="font-bold" style={{ color: gc, fontSize: '12.5px' }}>
                        {results.noWithdrawalPhase ? '0 yr' : results.depleted ? `${results.yearsLasting} yr` : `${MAX_HORIZON}+ yr`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>{results.noWithdrawalPhase ? 'Withdrawal Status' : 'Depletion Age'}</span>
                      <span className="font-semibold" style={{ color: results.noWithdrawalPhase ? '#64748b' : results.targetReached ? '#1DB584' : results.depleted ? '#ef4444' : '#1DB584', fontSize: '12.5px' }}>
                        {results.noWithdrawalPhase ? 'Not simulated' : results.depleted ? `Age ${results.depletionAge}` : 'Lasts through horizon'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>First-Year Rate</span>
                      <span className="font-semibold" style={{ color: results.rateColor, fontSize: '12.5px' }}>
                        {(results.firstYearRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Rate Category</span>
                      <span className="font-semibold" style={{ color: results.rateColor, fontSize: '12.5px' }}>
                        {results.rateLabel}
                      </span>
                    </div>
                    <div className="pt-1 pb-0.5">
                      <p className="text-[10.5px] leading-relaxed" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        {results.targetReached
                          ? 'Your target ending balance was reached before depletion, so a sustainability score is not applicable — this is a positive outcome.'
                          : results.noWithdrawalPhase
                            ? 'No withdrawal years occurred within the simulation horizon, so a sustainability score could not be evaluated.'
                            : <>Score reflects years lasting, withdrawal rate, and horizon coverage. Assumes {results.annualReturn}% return and {results.inflationRate}% inflation. Actual results vary.</>}
                      </p>
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>
        </div>

      </div>

      {/* ══ Block C: AI Insight ══════════════════════════════════════════════ */}
      <div
        id="rw-ai"
        className="overflow-hidden"
        style={{ ...cardStyle, padding: 0, scrollMarginTop: '80px' }}
      >

        <div
          className="px-4 md:px-6 py-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,181,132,0.18)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#1DB584' }} aria-hidden />
            </span>
            <div>
              <p className="text-white text-lg md:text-xl font-bold tracking-tight">
                FinCalc <span style={{ color: '#1DB584' }}>Smart</span> Retirement Withdrawal Insight
              </p>
              <p className="text-slate-400" style={{ fontSize: '11px' }}>AI-assisted insights by FinCalc Smart</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={!results || pdfLoading}
              aria-disabled={!results || pdfLoading}
              title={!results ? 'Calculate first to generate a report' : 'Download PDF report'}
              className="inline-flex items-center gap-1.5"
              style={{
                background: '#1DB584', color: '#ffffff', borderRadius: 9999,
                padding: '7px 16px', fontSize: '13px', fontWeight: 700,
                opacity: (!results || pdfLoading) ? 0.65 : 1,
                cursor: (!results || pdfLoading) ? 'not-allowed' : 'pointer',
              }}>
              <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
            <button disabled aria-disabled="true" title="Coming soon"
              className="inline-flex items-center gap-1.5 cursor-not-allowed select-none"
              style={{ border: '1.5px solid rgba(255,255,255,0.30)', color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700 }}>
              <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Email Results
            </button>
          </div>
        </div>

        <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

          {!results && (
            <div className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#1DB584' }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                Enter your retirement details above to see the analysis.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 360 }}>
                The analysis will show your Withdrawal Sustainability Score, drawdown timeline, and insight cards covering your withdrawal rate, inflation impact, and longevity outlook.
              </p>
            </div>
          )}

          {results && (
            <>
              {/* ── Row 1: Sustainability gauge + Smart card ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Left — Withdrawal Pressure Score gauge */}
                <div className="rounded-2xl p-4 flex flex-col"
                  style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 shrink-0" style={{ color: results.pressureColor }} aria-hidden />
                    <span className="text-sm font-bold text-slate-800">Withdrawal Pressure Score</span>
                  </div>

                  {(() => {
                    const GR = 68; const GC = 2 * Math.PI * GR;
                    const GARC = (240 / 360) * GC;
                    const GFIL = GARC * (results.pressureScore / 100);
                    const pc = results.pressureColor;
                    const pb = results.pressureBg;
                    const yr1Color   = '#1DB584';
                    const yr1Bg      = 'rgba(29,181,132,0.08)';
                    const yr1Border  = 'rgba(29,181,132,0.22)';
                    const rateColor  = results.rateColor;
                    const rateBg     =
                      results.rateLabel === 'Conservative'     ? 'rgba(29,181,132,0.08)' :
                      results.rateLabel === 'Moderate / Watch' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)';
                    const rateBorder =
                      results.rateLabel === 'Conservative'     ? 'rgba(29,181,132,0.22)' :
                      results.rateLabel === 'Moderate / Watch' ? 'rgba(245,158,11,0.22)' : 'rgba(239,68,68,0.22)';
                    const inflColor  = results.inflationRate > 3.5 ? '#D97706' : '#1e3a5f';
                    const inflBg     = results.inflationRate > 3.5 ? 'rgba(245,158,11,0.08)' : 'rgba(15,41,66,0.05)';
                    const inflBorder = results.inflationRate > 3.5 ? 'rgba(245,158,11,0.22)' : 'rgba(15,41,66,0.11)';
                    return (
                      <div className="flex flex-col items-center flex-1">
                        {/* Gauge */}
                        <div style={{ position: 'relative', width: 200, height: 200, flexShrink: 0 }}>
                          <svg viewBox="0 0 180 180" width="200" height="200" style={{ display: 'block' }} aria-hidden>
                            <circle cx="90" cy="90" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="12" strokeLinecap="round"
                              strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 90, 90)" />
                            <circle cx="90" cy="90" r={GR} fill="none" stroke={pc} strokeWidth="12" strokeLinecap="round"
                              strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 90, 90)"
                              style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 22 }}>
                            <span style={{ fontSize: 'clamp(2.4rem, 6vw, 3.2rem)', fontWeight: 800, color: '#0D1B2A', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                              {results.pressureScore}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1.6 }}>/100</span>
                          </div>
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: pc }}>{results.pressureStatus}</span>
                          </div>
                        </div>

                        {/* Rate summary line */}
                        <p className="text-center mt-1 mb-1" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(13,27,42,0.50)' }}>
                          First-year rate:{' '}
                          <span style={{ color: rateColor, fontWeight: 700 }}>{(results.firstYearRate * 100).toFixed(1)}%</span>
                          {' '}— {results.rateLabel}
                        </p>

                        {/* 3-stat row */}
                        <div className="grid grid-cols-3 gap-2.5 w-full mt-2">
                          {[
                            { label: 'Year 1 Withdrawal', value: fmtx(safe(results.annualWithdrawal)), color: yr1Color,   bg: yr1Bg,   border: yr1Border  },
                            { label: 'First-Year Rate',   value: `${(results.firstYearRate * 100).toFixed(1)}%`,        color: rateColor, bg: rateBg,   border: rateBorder },
                            { label: 'Inflation Rate',    value: `${results.inflationRate}%`,                            color: inflColor, bg: inflBg,   border: inflBorder },
                          ].map(({ label, value, color, bg, border }) => (
                            <div key={label} className="rounded-xl text-center"
                              style={{ background: bg, border: `1px solid ${border}`, padding: '10px 4px 10px' }}>
                              <p style={{ fontSize: '8.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                                {label}
                              </p>
                              <p style={{ fontSize: '12px', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.2px' }}>
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>

                        <p className="text-slate-400 mt-3 text-center" style={{ fontSize: '11px', lineHeight: 1.55 }}>
                          {results.pressureStatus === 'Conservative'
                            ? 'Low withdrawal pressure. Your rate leaves meaningful room for market variation and inflation over a long retirement.'
                            : results.pressureStatus === 'Moderate'
                              ? 'Moderate pressure. Your portfolio is sensitive to actual returns and inflation — worth revisiting annually.'
                              : results.pressureStatus === 'Watch'
                                ? 'Elevated pressure. Consider whether your return assumptions are realistic and whether withdrawals can be reduced.'
                                : 'High pressure. Risk of early depletion is significant at this rate — review your withdrawal plan carefully.'}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Right — Dark smart card */}
                <div className="rounded-2xl p-3 flex flex-col"
                  style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: `1px solid rgba(${results.sustainabilityRgb},0.14)`, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 shrink-0" style={{ color: results.sustainabilityColor }} aria-hidden />
                    <span className="text-sm font-bold" style={{ color: results.sustainabilityColor }}>
                      {results.noWithdrawalPhase ? 'No Withdrawal Phase Simulated' :
                       results.targetReached     ? 'Target Balance Reached' :
                       results.sustainabilityStatus === 'Sustainable' ? 'Sustainable Drawdown' :
                       results.sustainabilityStatus === 'Watch'       ? 'Watchlist — Monitor Closely' :
                       results.sustainabilityStatus === 'At Risk'     ? 'At Risk — Review Plan' :
                       'High Depletion Risk'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 mt-1 flex-1 justify-center">
                    <div className="rounded-xl flex items-center justify-center px-4 py-5"
                      style={{
                        background: results.sustainabilityBg,
                        border: `1px solid rgba(${results.sustainabilityRgb},0.25)`,
                      }}>
                      <div className="text-center">
                        <span className="font-extrabold tabular-nums"
                          style={{ fontSize: 'clamp(1.6rem, 6vw, 2.2rem)', color: results.sustainabilityColor, letterSpacing: '-1.5px', lineHeight: 1 }}>
                          {results.noWithdrawalPhase ? `Age ${results.withdrawalStartAge}` : results.depleted ? `Age ${results.depletionAge}` : `Age ${results.currentAge + MAX_HORIZON}+`}
                        </span>
                        <p style={{ fontSize: '10px', color: `rgba(${results.sustainabilityRgb},0.7)`, fontWeight: 600, marginTop: 4 }}>
                          {results.noWithdrawalPhase ? 'withdrawals not yet started' : results.targetReached ? 'target balance reached' : results.depleted ? 'portfolio depletes' : 'portfolio lasts beyond'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {results.noWithdrawalPhase
                          ? `Withdrawals begin at age ${results.withdrawalStartAge} — beyond the ${MAX_HORIZON}-year simulation horizon`
                          : results.targetReached
                            ? `Portfolio reaches your target balance at age ${results.depletionAge} — ${results.yearsLasting} withdrawal years`
                            : results.depleted
                              ? `Savings may last until age ${results.depletionAge} — ${results.yearsLasting} withdrawal years`
                              : `Portfolio lasts through age ${results.currentAge + MAX_HORIZON}+`}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Key driver: {results.keyDriver}. At {results.annualReturn}% return, {results.inflationRate}% inflation, {(results.firstYearRate * 100).toFixed(1)}% first-year withdrawal rate.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1rem', lineHeight: 1.2 }}>{fmtx(safe(results.annualWithdrawal))}/yr</div>
                        <div className="flex items-center gap-1.5">
                          <TrendingDown className="w-3 h-3 shrink-0" style={{ color: results.sustainabilityColor }} aria-hidden />
                          <span className="text-slate-400 text-xs">Year 1 withdrawal</span>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <div className="font-bold tabular-nums mb-1" style={{ fontSize: '1rem', lineHeight: 1.2, color: results.rateColor }}>{(results.firstYearRate * 100).toFixed(1)}%</div>
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3 h-3 shrink-0" style={{ color: results.rateColor }} aria-hidden />
                          <span className="text-slate-400 text-xs">First-year rate</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      Illustrative projection only. No taxes, RRIF rules, CPP/OAS, or Social Security included. Not financial advice.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Card 1 — Withdrawal Rate Check */}
                <div className="rounded-2xl p-4" style={{
                  background: results.rateLabel === 'Conservative' ? '#f0fdf4' : results.rateLabel === 'Moderate / Watch' ? '#fffbeb' : '#fff7ed',
                  border: `1px solid ${results.rateLabel === 'Conservative' ? '#bbf7d0' : results.rateLabel === 'Moderate / Watch' ? '#fde68a' : '#fed7aa'}`,
                }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: 8, background: results.rateLabel === 'Conservative' ? '#dcfce7' : results.rateLabel === 'Moderate / Watch' ? '#fef3c7' : '#ffedd5' }}>
                      <TrendingDown className={`w-3.5 h-3.5 ${results.rateLabel === 'Conservative' ? 'text-emerald-500' : results.rateLabel === 'Moderate / Watch' ? 'text-amber-500' : 'text-orange-500'}`} aria-hidden />
                    </span>
                    <p className={`text-xs font-bold uppercase tracking-widest ${results.rateLabel === 'Conservative' ? 'text-emerald-600' : results.rateLabel === 'Moderate / Watch' ? 'text-amber-600' : 'text-orange-600'}`}>Withdrawal Rate Check</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Your first-year withdrawal rate is{' '}
                    <strong style={{ color: results.rateColor }}>{(results.firstYearRate * 100).toFixed(1)}%</strong>
                    {' '}— classified as{' '}
                    <strong style={{ color: results.rateColor }}>{results.rateLabel}</strong>.{' '}
                    {results.rateLabel === 'Conservative'
                      ? 'Rates under 3.5% leave considerable room for market variation. Your portfolio may last well beyond the simulation horizon at this pace.'
                      : results.rateLabel === 'Moderate / Watch'
                        ? 'Rates in the 3.5–5% range are widely used in retirement planning but are sensitive to actual returns and inflation. Monitor over time.'
                        : 'Rates above 5% place elevated pressure on portfolio longevity. Your portfolio may deplete faster than expected if returns fall short of assumptions.'}
                    {' '}These are illustrative benchmarks only — not guaranteed thresholds. Actual sustainability depends on returns, inflation, health, and spending flexibility.
                  </p>
                </div>

                {/* Card 2 — Inflation Pressure */}
                <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Inflation Pressure</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    At <strong className="text-sky-700">{results.inflationRate}%</strong> inflation, your{' '}
                    <strong className="text-sky-700">{fmt(safe(results.annualWithdrawal))}</strong> first-year withdrawal grows to:{' '}
                    <strong className="text-sky-700">{fmt(safe(results.withdrawalAtYear10))}</strong> at year 10
                    {results.yearsLasting >= 20 || !results.depleted
                      ? <>, <strong className="text-sky-700">{fmt(safe(results.withdrawalAtYear20))}</strong> at year 20</>
                      : null}
                    {results.yearsLasting >= 30 || !results.depleted
                      ? <>, and <strong className="text-sky-700">{fmt(safe(results.withdrawalAtYear30))}</strong> at year 30</>
                      : null}.{' '}
                    Inflation compounding significantly increases the real cost of withdrawals over time and is one of the most important factors in retirement portfolio longevity.
                  </p>
                </div>

                {/* Card 3 — Longevity Buffer */}
                <div className="rounded-2xl p-4" style={{
                  background: results.noWithdrawalPhase ? '#f8fafc' : results.depleted && !results.targetReached ? '#fff7ed' : '#f0fdf4',
                  border: `1px solid ${results.noWithdrawalPhase ? '#e2e8f0' : results.depleted && !results.targetReached ? '#fed7aa' : '#bbf7d0'}`,
                }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: results.noWithdrawalPhase ? '#e2e8f0' : results.depleted && !results.targetReached ? '#ffedd5' : '#dcfce7' }}>
                      <AlertTriangle className={`w-3.5 h-3.5 ${results.noWithdrawalPhase ? 'text-slate-500' : results.depleted && !results.targetReached ? 'text-orange-500' : 'text-emerald-500'}`} aria-hidden />
                    </span>
                    <p className={`text-xs font-bold uppercase tracking-widest ${results.noWithdrawalPhase ? 'text-slate-500' : results.depleted && !results.targetReached ? 'text-orange-600' : 'text-emerald-600'}`}>
                      Longevity Buffer
                    </p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.noWithdrawalPhase
                      ? <>
                          Your withdrawal phase does not begin until{' '}
                          <strong className="text-slate-600">age {results.withdrawalStartAge}</strong>, which falls beyond the {MAX_HORIZON}-year simulation horizon from your current age.{' '}
                          No withdrawal years were modeled, so longevity cannot be assessed yet. Lower your withdrawal start age or revisit this calculator closer to that date.
                        </>
                      : results.targetReached
                        ? <>
                            At current inputs, your portfolio reaches your target balance at{' '}
                            <strong className="text-emerald-700">age {results.depletionAge}</strong> after{' '}
                            <strong className="text-emerald-700">{results.yearsLasting} years</strong> of withdrawals, preserving your chosen reserve rather than depleting.{' '}
                            Total withdrawn: <strong className="text-emerald-700">{fmt(safe(results.totalWithdrawn))}</strong> with a remaining balance of{' '}
                            <strong className="text-emerald-700">{fmt(safe(results.remainingBalance))}</strong>.
                          </>
                        : results.depleted
                          ? <>
                              At current inputs, your portfolio is estimated to deplete at{' '}
                              <strong className="text-orange-700">age {results.depletionAge}</strong> after{' '}
                              <strong className="text-orange-700">{results.yearsLasting} years</strong> of withdrawals.{' '}
                              If you live into your 80s or 90s, there may be a gap between portfolio depletion and end of life. This is a key longevity risk to plan around. Review your withdrawal rate, return assumption, or other income sources.
                            </>
                          : <>
                              At current inputs, your portfolio lasts through{' '}
                              <strong className="text-emerald-700">age {results.currentAge + MAX_HORIZON}+</strong> — beyond the 50-year simulation horizon.{' '}
                              Total withdrawn: <strong className="text-emerald-700">{fmt(safe(results.totalWithdrawn))}</strong> with an ending balance of{' '}
                              <strong className="text-emerald-700">{fmt(safe(results.remainingBalance))}</strong>. Your plan has significant longevity buffer at current inputs.
                            </>
                    }
                    {' '}This is not financial advice. Consult a financial advisor for a complete plan.
                  </p>
                </div>

              </div>
            </>
          )}

        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
          style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
          <p className="text-slate-400 text-xs leading-relaxed">
            <strong className="text-slate-500 font-semibold">Disclaimer:</strong>{' '}
            This calculator is for educational and illustrative purposes only. Results depend on investment returns, inflation, withdrawal timing, taxes, fees, market volatility, pension income, government benefits, and personal spending changes. It does not include RRIF minimums, CPP/OAS, Social Security, taxes, or sequence-of-returns risk. Withdrawal rate benchmarks shown are illustrative ranges — not guaranteed safe withdrawal thresholds. This is not financial, tax, legal, or retirement advice.
          </p>
        </div>

      </div>

      {/* ══ Block D: How It Works ════════════════════════════════════════════ */}
      {formulaContent && (
        <div style={cardStyle} className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
            How It Works
          </h2>
          <div className="space-y-4 text-sm md:text-base text-slate-600 leading-relaxed">
            {formulaContent}
          </div>
        </div>
      )}

      {/* ══ Block E: FAQ ═════════════════════════════════════════════════════ */}
      {faqItems.length > 0 && (
        <div style={cardStyle} className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
            Frequently Asked Questions
          </h2>
          <CalculatorFaqAccordion faqs={faqItems} />
        </div>
      )}

      <p className="text-xs text-slate-400 text-center mt-4 pb-12 px-4 leading-relaxed max-w-4xl mx-auto">
        This calculator is for educational and illustrative purposes only. Results depend on investment returns, inflation, withdrawal timing, taxes, fees, market volatility, pension income, government benefits, and personal spending changes. It does not include RRIF minimums, CPP/OAS, Social Security, taxes, or sequence-of-returns risk. This is not financial, tax, legal, or retirement advice.
      </p>

    </div>
  );
}
