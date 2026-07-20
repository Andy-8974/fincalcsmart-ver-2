'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { NumericInput, Tooltip } from '../_mortgage-shared/ui';
import { fmtCAD, fmtCADx, fmtUSD, fmtUSDx } from '../_mortgage-shared/math';
import { useRegion } from '@/lib/region/context';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  Activity, AlertTriangle, BookOpen, Download,
  Flame, HelpCircle, Mail, ShieldAlert, Sparkles, TrendingUp, Zap,
} from 'lucide-react';
import { buildFIREPDF } from '@/lib/pdf/adapters/fireAdapter';

// ─── Types ────────────────────────────────────────────────────────────────────

type FreqKey = 'annually' | 'semi' | 'monthly' | 'daily';
type FireMultiple = 20 | 25 | 30 | 33;

interface FormState {
  currentAge:        string;
  currentAssets:     string;
  monthlyInvestment: string;
  annualExpenses:    string;
  annualRate:        string;
  annualIncome:      string; // optional
}

interface FIREResults {
  currentAge:        number;
  currentAssets:     number;
  monthlyInvestment: number;
  annualExpenses:    number;
  annualRate:        number;
  annualIncome:      number | null;
  fireMultiple:      number;
  freq:              FreqKey;
  r:                 number;
  // Target
  fireTarget:        number;
  // Current progress
  rawProgressPct:    number;
  fireProgressPct:   number; // capped at 200 for display
  gapToFIRE:         number;
  alreadyFI:         boolean;
  // Time to FIRE
  monthsToFIRE:      number | null; // null = not reachable within cap
  yearsToFIRE:       number | null;
  fireAge:           number | null;
  // Portfolio at FIRE date
  projectedAtFIRE:   number;
  totalContribs:     number;
  investGrowth:      number;
  // Savings rate
  savingsRate:       number | null;
  // Sooner lever (5yr earlier, when in building state)
  soonerYears:       number;
  extraMonthlySooner: number;
  // Not-reachable lever (monthly to reach in 20yr)
  monthlyFor20yr:    number;
  // Scoring
  readinessScore:    number;
  readinessLabel:    'Excellent' | 'Good' | 'Fair' | 'Poor';
  readinessStatus:   'Healthy' | 'Watch' | 'Caution';
  readinessColor:    string;
  readinessBg:       string;
  // Progress gauge
  progressGaugeColor: string;
  progressGaugeBg:    string;
  progressBadge:      string;
  // Lever
  leverState: 'already-fi' | 'on-track' | 'building' | 'not-reachable';
}

interface FireChartSample { age: number; fv: number; ia: number; tc: number; }

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  currentAge:        '30',
  currentAssets:     '50000',
  monthlyInvestment: '1500',
  annualExpenses:    '48000',
  annualRate:        '7',
  annualIncome:      '',
};

const DEFAULT_FREQ: FreqKey      = 'monthly';
const DEFAULT_MULTIPLE: FireMultiple = 25;

const FREQ_OPTIONS: { key: FreqKey; label: string; periods: number }[] = [
  { key: 'annually', label: 'Annually',  periods: 1   },
  { key: 'semi',     label: 'Semi-Ann.', periods: 2   },
  { key: 'monthly',  label: 'Monthly',   periods: 12  },
  { key: 'daily',    label: 'Daily',     periods: 365 },
];

const MULTIPLE_OPTIONS: { value: FireMultiple; label: string; rate: string }[] = [
  { value: 20, label: '20×', rate: '5% rule' },
  { value: 25, label: '25×', rate: '4% rule' },
  { value: 30, label: '30×', rate: '3.3% rule' },
  { value: 33, label: '33×', rate: '3% rule' },
];

// ─── Math helpers ─────────────────────────────────────────────────────────────

function safe(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function getEffectiveMonthlyRate(annualRatePct: number, periods: number): number {
  if (Math.abs(annualRatePct) < 1e-10) return 0;
  const eAR = Math.pow(1 + annualRatePct / 100 / periods, periods) - 1;
  const eMR = Math.pow(1 + eAR, 1 / 12) - 1;
  return Number.isFinite(eMR) ? eMR : 0;
}

function calcFVRate(r: number, months: number, principal: number, monthly: number): number {
  if (months <= 0) return Math.max(0, principal);
  if (Math.abs(r) < 1e-10) return Math.max(0, principal + monthly * months);
  const g = Math.pow(1 + r, months);
  if (!Number.isFinite(g)) return Math.max(0, principal + monthly * months);
  return Math.max(0, principal * g + monthly * (g - 1) / r);
}

/** Binary search: returns months until portfolio >= target. null = not reachable within 1200 months. */
function solveMonthsToFIRE(
  r: number, currentAssets: number, monthly: number, target: number,
): number | null {
  if (currentAssets >= target) return 0;
  // 0% return
  if (Math.abs(r) < 1e-10) {
    if (monthly <= 0) return null;
    const m = Math.ceil((target - currentAssets) / monthly);
    return m > 0 && m <= 1200 ? m : null;
  }
  // Check cap
  const fvCap = calcFVRate(r, 1200, currentAssets, monthly);
  if (!Number.isFinite(fvCap) || fvCap < target) return null;
  // Binary search
  let lo = 1, hi = 1200;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (calcFVRate(r, mid, currentAssets, monthly) >= target) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** Solve required monthly contribution to hit target in exactly horizonMonths. */
function solveMonthlyForHorizon(
  r: number, currentAssets: number, horizonMonths: number, target: number,
): number {
  if (horizonMonths <= 0) return 0;
  if (Math.abs(r) < 1e-10) {
    return Math.max(0, (target - currentAssets) / horizonMonths);
  }
  const gf = Math.pow(1 + r, horizonMonths);
  if (!Number.isFinite(gf)) return 0;
  const pv   = currentAssets * gf;
  const af   = (gf - 1) / r;
  if (af <= 0) return 0;
  return Math.max(0, (target - pv) / af);
}

// ─── Chart samples ────────────────────────────────────────────────────────────

function computeFireChartSamples(
  currentAge: number,
  chartEndAge: number,
  currentAssets: number,
  monthly: number,
  r: number,
): FireChartSample[] {
  function sampleAt(age: number): FireChartSample {
    const months = (age - currentAge) * 12;
    const fv = safe(calcFVRate(r, months, currentAssets, monthly));
    const ia = Math.min(currentAssets, fv);
    const rawTc = safe(monthly * months);
    const tc = Math.min(rawTc, Math.max(0, fv - ia));
    return { age, fv, ia, tc };
  }
  if (chartEndAge <= currentAge) {
    return [0, 1, 2, 3, 5].map(dy => sampleAt(currentAge + dy));
  }
  const horizonYrs = chartEndAge - currentAge;
  const step = Math.max(1, Math.ceil(horizonYrs / 7));
  const ageSet = new Set<number>([currentAge]);
  for (let a = currentAge + step; a < chartEndAge; a += step) ageSet.add(a);
  ageSet.add(chartEndAge);
  return Array.from(ageSet).sort((a, b) => a - b).slice(0, 9).map(age => ({
    ...sampleAt(age),
  }));
}

// ─── Core compute ─────────────────────────────────────────────────────────────

function computeResults(
  form: FormState, freq: FreqKey, fireMultiple: FireMultiple,
): FIREResults | null {
  const currentAssets     = Math.max(0, parseFloat(form.currentAssets)     || 0);
  const monthlyInvestment = Math.max(0, parseFloat(form.monthlyInvestment) || 0);
  const annualExpenses    = Math.max(0, parseFloat(form.annualExpenses)    || 0);
  const annualRate        = Math.max(0, Math.min(49.9, parseFloat(form.annualRate) || 0));
  const rawAge            = parseInt(form.currentAge) || 30;
  const currentAge        = Math.max(18, Math.min(80, rawAge));
  const annualIncomeRaw   = parseFloat(form.annualIncome) || 0;
  const annualIncome      = annualIncomeRaw > 0 ? annualIncomeRaw : null;

  if (currentAssets <= 0 && monthlyInvestment <= 0) return null;
  if (annualExpenses <= 0) return null;

  const periods = FREQ_OPTIONS.find(f => f.key === freq)!.periods;
  const r = getEffectiveMonthlyRate(annualRate, periods);

  // FIRE target
  const fireTarget = annualExpenses * fireMultiple;

  // Current progress
  const rawProgressPct  = fireTarget > 0 ? (currentAssets / fireTarget) * 100 : 0;
  const fireProgressPct = Math.min(200, rawProgressPct);
  const gapToFIRE       = Math.max(0, fireTarget - currentAssets);
  const alreadyFI       = currentAssets >= fireTarget;

  // Time to FIRE
  const monthsToFIRE = solveMonthsToFIRE(r, currentAssets, monthlyInvestment, fireTarget);
  const yearsToFIRE  = monthsToFIRE !== null ? Math.ceil(monthsToFIRE / 12) : null;
  const fireAge      = yearsToFIRE !== null ? currentAge + yearsToFIRE : null;

  // Portfolio at FIRE date (or at 240 months if not reachable)
  const horizonMonths = monthsToFIRE !== null ? monthsToFIRE : 240;
  const projectedAtFIRE = safe(calcFVRate(r, horizonMonths, currentAssets, monthlyInvestment));
  const totalContribs   = Math.max(0, currentAssets + monthlyInvestment * horizonMonths);
  const investGrowth    = Math.max(0, projectedAtFIRE - totalContribs);

  // Savings rate
  const savingsRate = annualIncome !== null && annualIncome > 0
    ? Math.min(100, (monthlyInvestment * 12) / annualIncome * 100)
    : null;

  // Sooner lever: 5 years sooner
  const soonerYears = alreadyFI ? 0 : yearsToFIRE !== null ? Math.max(1, yearsToFIRE - 5) : 0;
  const soonerMonths = soonerYears * 12;
  let extraMonthlySooner = 0;
  if (!alreadyFI && yearsToFIRE !== null && yearsToFIRE > 5 && soonerMonths > 0) {
    const needed = solveMonthlyForHorizon(r, currentAssets, soonerMonths, fireTarget);
    extraMonthlySooner = Math.max(0, needed - monthlyInvestment);
  }

  // Not-reachable lever: monthly to reach FIRE in 20 years
  const monthlyFor20yr = monthsToFIRE === null
    ? solveMonthlyForHorizon(r, currentAssets, 240, fireTarget)
    : 0;

  // Readiness score
  let score = Math.min(45, rawProgressPct * 0.45);
  if (alreadyFI) score += 40;
  else if (yearsToFIRE !== null && yearsToFIRE <= 5)  score += 35;
  else if (yearsToFIRE !== null && yearsToFIRE <= 10) score += 28;
  else if (yearsToFIRE !== null && yearsToFIRE <= 20) score += 18;
  else if (yearsToFIRE !== null && yearsToFIRE <= 35) score += 8;
  if (savingsRate !== null && savingsRate >= 50) score += 15;
  else if (savingsRate !== null && savingsRate >= 30) score += 9;
  else if (savingsRate !== null && savingsRate >= 15) score += 4;
  const readinessScore = Math.round(Math.min(100, Math.max(0, score)));
  const readinessLabel: FIREResults['readinessLabel'] =
    readinessScore >= 80 ? 'Excellent' : readinessScore >= 65 ? 'Good' : readinessScore >= 45 ? 'Fair' : 'Poor';
  const readinessStatus: FIREResults['readinessStatus'] =
    readinessLabel === 'Poor' ? 'Caution' : readinessLabel === 'Fair' ? 'Watch' : 'Healthy';
  const readinessColor = readinessStatus === 'Healthy' ? '#1DB584' : readinessStatus === 'Watch' ? '#f59e0b' : '#ef4444';
  const readinessBg    = readinessStatus === 'Healthy' ? 'rgba(29,181,132,0.10)' : readinessStatus === 'Watch' ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

  // Progress gauge
  const progressGaugeColor =
    alreadyFI || rawProgressPct >= 75 ? '#1DB584' :
    rawProgressPct >= 40              ? '#1DB584' :
    rawProgressPct >= 15              ? '#f59e0b' :
    '#94a3b8';
  const progressGaugeBg =
    alreadyFI || rawProgressPct >= 75 ? 'rgba(29,181,132,0.10)' :
    rawProgressPct >= 40              ? 'rgba(29,181,132,0.10)' :
    rawProgressPct >= 15              ? 'rgba(245,158,11,0.10)' :
    'rgba(148,163,184,0.10)';
  const progressBadge =
    alreadyFI             ? 'Already FI' :
    rawProgressPct >= 75  ? 'Nearly There' :
    rawProgressPct >= 50  ? 'Halfway There' :
    rawProgressPct >= 25  ? 'Building' :
    'Early Stage';

  // Lever state
  const leverState: FIREResults['leverState'] =
    alreadyFI                       ? 'already-fi' :
    yearsToFIRE === null            ? 'not-reachable' :
    yearsToFIRE <= 15               ? 'on-track' :
    'building';

  return {
    currentAge, currentAssets, monthlyInvestment, annualExpenses, annualRate,
    annualIncome, fireMultiple, freq, r,
    fireTarget, rawProgressPct, fireProgressPct, gapToFIRE, alreadyFI,
    monthsToFIRE, yearsToFIRE, fireAge,
    projectedAtFIRE, totalContribs, investGrowth,
    savingsRate,
    soonerYears, extraMonthlySooner, monthlyFor20yr,
    readinessScore, readinessLabel, readinessStatus, readinessColor, readinessBg,
    progressGaugeColor, progressGaugeBg, progressBadge,
    leverState,
  };
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(15,41,66,0.09)',
  borderRadius: '20px',
  background: '#ffffff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.03)',
};

const inputClsBase =
  'w-full rounded-brand-sm border-[1.5px] border-brand-gray-200 text-brand-navy bg-brand-gray-50 ' +
  'px-3 py-2.5 text-sm transition-colors duration-150 ' +
  'focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/[0.15]';

const inputClsCompact = inputClsBase
  .replace('py-2.5', 'py-1 md:py-2')
  .replace('px-3', 'pr-2 md:pr-3 pl-3');

const navyLabelStyle: React.CSSProperties = {
  fontWeight: 700, color: '#0D1B2A',
  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4,
};
const navyLabelCls = 'text-[10px] md:text-xs';

// ─── Props ────────────────────────────────────────────────────────────────────

interface FIRECalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FIRECalculator({
  formulaContent,
  faqItems = [],
}: FIRECalculatorProps) {
  const { region }   = useRegion();
  const isCA         = region === 'ca';
  const cp           = isCA ? 'CA$' : '$';
  const fmt          = isCA ? fmtCAD  : fmtUSD;
  const fmtx         = isCA ? fmtCADx : fmtUSDx;

  const [form, setForm]         = useState<FormState>(DEFAULTS);
  const [freq, setFreq]         = useState<FreqKey>(DEFAULT_FREQ);
  const [fireMultiple, setMult] = useState<FireMultiple>(DEFAULT_MULTIPLE);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const results = useMemo(
    () => computeResults(form, freq, fireMultiple),
    [form, freq, fireMultiple],
  );

  // Determine why results is null — for specific empty-state messaging
  const emptyReason = useMemo(() => {
    const expenses = parseFloat(form.annualExpenses) || 0;
    const assets   = parseFloat(form.currentAssets)  || 0;
    const monthly  = parseFloat(form.monthlyInvestment) || 0;
    if (expenses <= 0) return 'expenses' as const;
    if (assets <= 0 && monthly <= 0) return 'assets' as const;
    return null;
  }, [form]);

  function scrollToAI() {
    const el = document.getElementById('fire-ai');
    if (!el) return;
    const navH = (document.querySelector('header') as HTMLElement | null)?.getBoundingClientRect().height ?? 64;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - 16), behavior: 'smooth' });
  }

  function fmtShort(n: number): string {
    const p = cp;
    if (n >= 1_000_000) return `${p}${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${p}${Math.round(n / 1_000)}k`;
    return `${p}${Math.round(n)}`;
  }

  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      await buildFIREPDF({
        currentAge:        results.currentAge,
        currentAssets:     results.currentAssets,
        monthlyInvestment: results.monthlyInvestment,
        annualExpenses:    results.annualExpenses,
        annualRate:        results.annualRate,
        fireMultiple:      results.fireMultiple,
        freq:              results.freq,
        annualIncome:      results.annualIncome,
        fireTarget:        results.fireTarget,
        rawProgressPct:    results.rawProgressPct,
        fireProgressPct:   results.fireProgressPct,
        gapToFIRE:         results.gapToFIRE,
        alreadyFI:         results.alreadyFI,
        monthsToFIRE:      results.monthsToFIRE,
        yearsToFIRE:       results.yearsToFIRE,
        fireAge:           results.fireAge,
        projectedAtFIRE:   results.projectedAtFIRE,
        totalContribs:     results.totalContribs,
        investGrowth:      results.investGrowth,
        savingsRate:       results.savingsRate,
        monthlyFor20yr:    results.monthlyFor20yr,
        readinessScore:    results.readinessScore,
        readinessLabel:    results.readinessLabel,
        leverState:        results.leverState,
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
        @keyframes teal-glow-fire {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-fire {
          animation: teal-glow-fire 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-fire:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
        .fire-pill      { flex: 1; min-width: calc(50% - 4px); text-align: center; }
        @media (min-width: 480px) { .fire-pill { min-width: 0; } }
        .fire-mult-pill { flex: 1; min-width: 0; text-align: center; }
        .fire-pills     { display: flex; flex-wrap: wrap; gap: 6px; }
      `}</style>

      {/* ══ Block A: Input Card (7) + Results Card (5) ═══════════════════════ */}
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
                <Flame size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Canada &amp; USA · FIRE
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>FIRE Details</p>
              </div>
            </div>

            {/* Row 1: Assets | Monthly Investment */}
            <div className="grid grid-cols-2 gap-x-3 md:gap-x-5 mb-3">
              <div className="space-y-3 min-w-0">
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Current Invested Assets
                    <Tooltip text="The current value of your invested portfolio today — stocks, ETFs, index funds, retirement accounts. This is your starting balance for the FIRE projection." />
                  </label>
                  <NumericInput
                    value={form.currentAssets}
                    onChange={v => set('currentAssets', v)}
                    prefix={cp}
                    inputClassName={inputClsCompact}
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Annual Expenses
                    <Tooltip text="Your estimated annual living expenses in financial independence — the amount your portfolio needs to support each year. This drives your FIRE target calculation." />
                  </label>
                  <NumericInput
                    value={form.annualExpenses}
                    onChange={v => set('annualExpenses', v)}
                    prefix={cp}
                    inputClassName={inputClsCompact}
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Current Age
                    <Tooltip text="Your age today. Used to estimate your projected FIRE age." />
                  </label>
                  <NumericInput
                    value={form.currentAge}
                    onChange={v => set('currentAge', v)}
                    inputClassName={inputClsCompact}
                    placeholder="e.g. 30"
                  />
                </div>
              </div>

              <div className="border-l pl-2 md:pl-5 space-y-3 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Monthly Investment
                    <Tooltip text="The amount you invest each month. Consistent contributions are the largest accelerator toward FIRE." />
                  </label>
                  <NumericInput
                    value={form.monthlyInvestment}
                    onChange={v => set('monthlyInvestment', v)}
                    prefix={cp}
                    inputClassName={inputClsCompact}
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Expected Annual Return
                    <Tooltip text="Assumed annual investment return for this illustration. Actual returns vary and are not guaranteed." />
                  </label>
                  <NumericInput
                    value={form.annualRate}
                    onChange={v => set('annualRate', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                  <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>Applied to projection</p>
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Annual Income
                    <Tooltip text="Optional. Enter your gross annual income to see your savings rate. Does not affect FIRE target or timeline calculations." />
                  </label>
                  <NumericInput
                    value={form.annualIncome}
                    onChange={v => set('annualIncome', v)}
                    prefix={cp}
                    inputClassName={inputClsCompact}
                    placeholder="Optional"
                  />
                  <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>For savings rate only</p>
                </div>
              </div>
            </div>

            {/* FIRE Target Multiple pills */}
            <div className="mb-3">
              <label className={navyLabelCls} style={{ ...navyLabelStyle, marginBottom: 6 }}>
                FIRE Target Multiple
                <Tooltip text="The multiple of your annual expenses your portfolio needs to reach financial independence. 25× corresponds to the widely cited 4% safe withdrawal rate. Higher multiples (30×, 33×) are more conservative." />
              </label>
              <div className="fire-pills">
                {MULTIPLE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className="fire-mult-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
                    onClick={() => setMult(opt.value)}
                    style={
                      fireMultiple === opt.value
                        ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                        : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                    }
                  >
                    {opt.label}
                    <span style={{ fontSize: '9px', display: 'block', opacity: 0.75, fontWeight: 500, marginTop: 1 }}>
                      {opt.rate}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* FIRE derived display */}
            {results && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-px flex-1" style={{ background: 'rgba(15,41,66,0.06)' }} />
                <span className="text-[11px] font-semibold" style={{ color: '#F97316', whiteSpace: 'nowrap' }}>
                  FIRE target: {fmt(safe(results.fireTarget))}
                </span>
                <div className="h-px flex-1" style={{ background: 'rgba(15,41,66,0.06)' }} />
              </div>
            )}

            {/* Compound Frequency */}
            <div className="pt-3" style={{ borderTop: '1px solid rgba(15,41,66,0.07)' }}>
              <label className={navyLabelCls} style={navyLabelStyle}>
                Compound Frequency
                <Tooltip text="How often returns are compounded in this projection." />
              </label>
              <div className="fire-pills">
                {FREQ_OPTIONS.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    className="fire-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
                    onClick={() => setFreq(f.key)}
                    style={
                      freq === f.key
                        ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                        : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                    }
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

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
              border: '1px solid rgba(29,181,132,0.22)',
              minHeight: 340,
              boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(29,181,132,0.08)',
            }}
          >
            {!results && (
              <div className="flex flex-1 items-center justify-center py-12">
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                  {emptyReason === 'expenses'
                    ? 'Enter your annual expenses to calculate your FIRE target.'
                    : 'Enter your invested assets or monthly investment to see your projection.'}
                </p>
              </div>
            )}

            {results && (
              <div className="flex flex-col flex-1 gap-4">

                {/* Hero */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(29,181,132,0.18)' }}
                >
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(29,181,132,0.7)' }}>
                    {results.alreadyFI ? 'Portfolio at FIRE Target' : results.fireAge !== null ? 'Projected Portfolio at FIRE' : 'Projected Portfolio (20 Years)'}
                  </p>
                  <p style={{ color: '#1DB584', fontSize: '36px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 6 }}>
                    {results.alreadyFI ? fmt(safe(results.currentAssets)) : fmt(safe(results.projectedAtFIRE))}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', marginTop: 4, fontWeight: 500 }}>
                    {results.alreadyFI
                      ? `${(results.currentAssets / results.annualExpenses).toFixed(1)}× your annual expenses — you&apos;ve reached FI`
                      : results.fireAge !== null
                        ? `at age ${results.fireAge} · ${results.yearsToFIRE} year${results.yearsToFIRE !== 1 ? 's' : ''} away`
                        : 'not reachable at current pace — see analysis below'}
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>FIRE Target</span>
                    <span className="text-[13px] font-bold" style={{ color: '#F97316' }}>{fmt(safe(results.fireTarget))}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">Current FIRE Progress</span>
                    <span className="text-[13px] font-semibold text-white">
                      {results.alreadyFI ? '100%+' : `${Math.round(results.rawProgressPct)}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">Gap to FIRE</span>
                    <span className="text-[13px] font-semibold" style={{ color: results.gapToFIRE === 0 ? '#1DB584' : 'rgba(255,255,255,0.85)' }}>
                      {results.gapToFIRE === 0 ? '—' : fmt(safe(results.gapToFIRE))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">Estimated FIRE Age</span>
                    <span className="text-[13px] font-semibold text-white">
                      {results.alreadyFI ? `Age ${results.currentAge}` : results.fireAge !== null ? `Age ${results.fireAge}` : 'Not reachable'}
                    </span>
                  </div>
                  {results.savingsRate !== null && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[13px] text-slate-300">Savings Rate</span>
                      <span className="text-[13px] font-semibold" style={{ color: results.savingsRate >= 30 ? '#1DB584' : 'rgba(255,255,255,0.85)' }}>
                        {results.savingsRate.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Status pill */}
                {(() => {
                  const { leverState } = results;
                  const s =
                    leverState === 'already-fi'    ? { bg: 'rgba(29,181,132,0.15)',  border: 'rgba(29,181,132,0.35)', color: '#1DB584',  text: '✓ Already Financially Independent' } :
                    leverState === 'on-track'       ? { bg: 'rgba(29,181,132,0.12)',  border: 'rgba(29,181,132,0.28)', color: '#1DB584',  text: `On Track · FIRE Age ${results.fireAge}` } :
                    leverState === 'building'       ? { bg: 'rgba(29,181,132,0.12)',  border: 'rgba(29,181,132,0.25)', color: '#1DB584',  text: `Building · FIRE Age ${results.fireAge} · ${results.yearsToFIRE} yr` } :
                    { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.28)', color: '#ef4444',  text: 'Not Reachable at Current Pace' };
                  return (
                    <div className="flex items-center justify-center rounded-xl py-2 px-3"
                      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: s.color }}>{s.text}</span>
                    </div>
                  );
                })()}

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See your FIRE readiness score, progress, and independence timeline below.
                  </p>
                  <button
                    className="btn-ai-cta-fire w-full font-bold overflow-hidden"
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
                      View Independence Insight ↓
                    </span>
                    <span style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      whiteSpace: 'nowrap', opacity: aiCtaHovered ? 1 : 0, transition: 'opacity 200ms ease', pointerEvents: 'none',
                    }}>
                      <Sparkles size={13} style={{ marginRight: 6, color: '#1DB584' }} aria-hidden />
                      See FI Insight Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ Block C: FIRE Progress Journey (7) + FI Progress Gauge (5) ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

        {/* ── Left: FIRE Progress Journey (line chart) ──────────────────── */}
        <div className="lg:col-span-7" style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Growth over time
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>FIRE Progress Journey</h3>
            </div>

            {!results && (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  {emptyReason === 'expenses'
                    ? 'Enter your annual expenses to calculate your FIRE target.'
                    : 'Enter your details to see your FIRE journey.'}
                </p>
              </div>
            )}

            {results && (() => {
              // Chart horizon
              const alreadyFI = results.alreadyFI;
              const chartEndAge = alreadyFI
                ? results.currentAge + 5
                : results.fireAge !== null
                  ? Math.max(results.fireAge, results.currentAge + 2)
                  : results.currentAge + 40;

              const samples = computeFireChartSamples(
                results.currentAge, chartEndAge,
                results.currentAssets, results.monthlyInvestment, results.r,
              );
              if (samples.length < 2) return null;

              const n = samples.length;
              const maxSampleFV = Math.max(...samples.map(s => s.fv));
              const maxRaw = Math.max(maxSampleFV, results.fireTarget);
              const maxVal = maxRaw > 0 ? maxRaw * 1.12 : 10000;

              const CW = 500, CH = 180, PAD_T = 20, PAD_L = 2, PAD_R = 48;
              const plotW = CW - PAD_L - PAD_R;
              const plotH = CH - PAD_T;

              const xOf = (i: number) => PAD_L + (i / (n - 1)) * plotW;
              const yOf = (v: number) => PAD_T + plotH * (1 - Math.min(1, v / maxVal));

              const fireTargetY = yOf(results.fireTarget);
              const targetVisible = results.fireTarget > 0 && results.fireTarget <= maxVal;

              // FIRE crossover index (last sample ≈ fireTarget when reachable)
              const fireIdx = !alreadyFI && results.fireAge !== null
                ? n - 1  // fireAge is the last sample
                : null;

              const labelIs: number[] = n >= 3
                ? [0, Math.round((n - 1) / 2), n - 1]
                : [0, n - 1];

              return (
                <div className="flex-1 flex flex-col min-w-0">
                  <div style={{ position: 'relative' }}>
                    <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden>

                      {/* ── Stacked areas: Initial Assets / Contributions / Growth ── */}
                      {(() => {
                        const base = (PAD_T + plotH).toFixed(1);
                        // top edges (forward) and bottom edges (reverse)
                        const iaTop   = samples.map((s, i) => `${xOf(i).toFixed(1)},${yOf(s.ia).toFixed(1)}`);
                        const tcTop   = samples.map((s, i) => `${xOf(i).toFixed(1)},${yOf(s.ia + s.tc).toFixed(1)}`);
                        const fvTop   = samples.map((s, i) => `${xOf(i).toFixed(1)},${yOf(s.fv).toFixed(1)}`);
                        const iaTopR  = [...iaTop].reverse();
                        const tcTopR  = [...tcTop].reverse();
                        const blStart = `${xOf(0).toFixed(1)},${base}`;
                        const blEnd   = `${xOf(n - 1).toFixed(1)},${base}`;
                        return (
                          <>
                            {/* Initial Assets — slate */}
                            <polygon
                              points={[...iaTop, blEnd, blStart].join(' ')}
                              fill="rgba(100,116,139,0.18)"
                            />
                            {/* Future Contributions — blue */}
                            <polygon
                              points={[...tcTop, ...iaTopR].join(' ')}
                              fill="rgba(56,119,219,0.20)"
                            />
                            {/* Investment Growth — teal */}
                            <polygon
                              points={[...fvTop, ...tcTopR].join(' ')}
                              fill="rgba(29,181,132,0.30)"
                            />
                          </>
                        );
                      })()}

                      {/* Portfolio line */}
                      <polyline
                        points={samples.map((_, i) => `${xOf(i).toFixed(1)},${yOf(samples[i].fv).toFixed(1)}`).join(' ')}
                        fill="none" stroke="#1DB584" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                      />

                      {/* FIRE target line */}
                      {targetVisible && (
                        <>
                          <line
                            x1={PAD_L} y1={fireTargetY.toFixed(1)}
                            x2={CW - PAD_R} y2={fireTargetY.toFixed(1)}
                            stroke="#F97316" strokeWidth="1.5" strokeDasharray="5 4"
                          />
                          <rect x={(PAD_L + 2).toFixed(1)} y={(fireTargetY - 12).toFixed(1)} width="36" height="13" rx="3" fill="#F97316" />
                          <text x={(PAD_L + 20).toFixed(1)} y={(fireTargetY - 3).toFixed(1)} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">
                            FIRE
                          </text>
                        </>
                      )}

                      {/* FIRE crossing callout — bullseye marker + pill label */}
                      {fireIdx !== null && (() => {
                        const cx = xOf(fireIdx);
                        const cy = yOf(samples[fireIdx].fv);
                        const pillW = 68, pillH = 18, pillX = cx - pillW / 2, pillY = cy - 38;
                        // clamp pill left edge
                        const clampedPillX = Math.max(PAD_L, Math.min(CW - PAD_R - pillW, pillX));
                        return (
                          <>
                            {/* Subtle vertical guide */}
                            <line x1={cx.toFixed(1)} y1={PAD_T.toFixed(1)} x2={cx.toFixed(1)} y2={cy.toFixed(1)}
                              stroke="rgba(249,115,22,0.22)" strokeWidth="1" strokeDasharray="4 3" />
                            {/* Outer glow ring */}
                            <circle cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="10"
                              fill="rgba(249,115,22,0.15)" stroke="#F97316" strokeWidth="1.5" />
                            {/* Inner dot */}
                            <circle cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="4" fill="#F97316" />
                            {/* FIRE age pill */}
                            <rect x={clampedPillX.toFixed(1)} y={pillY.toFixed(1)} width={pillW} height={pillH} rx="5" fill="#F97316" />
                            <text
                              x={(clampedPillX + pillW / 2).toFixed(1)}
                              y={(pillY + pillH - 4).toFixed(1)}
                              textAnchor="middle" fill="white" fontSize="10" fontWeight="700"
                            >
                              FIRE Age {results.fireAge}
                            </text>
                          </>
                        );
                      })()}

                      {/* Already-FI current portfolio callout */}
                      {alreadyFI && (
                        <>
                          <circle cx={xOf(0).toFixed(1)} cy={yOf(samples[0].fv).toFixed(1)} r="5" fill="#1DB584" stroke="white" strokeWidth="1.5" />
                          <text x={(xOf(0) + 8).toFixed(1)} y={(yOf(samples[0].fv) - 6).toFixed(1)} textAnchor="start" fill="#1DB584" fontSize="9" fontWeight="700">
                            FI ✓
                          </text>
                        </>
                      )}

                      {/* End-of-horizon dot + value — only when NOT at the FIRE crossing (not-reachable/already-fi) */}
                      {!alreadyFI && fireIdx === null && (
                        <>
                          <circle cx={xOf(n - 1).toFixed(1)} cy={yOf(samples[n - 1].fv).toFixed(1)} r="4" fill="#1DB584" stroke="white" strokeWidth="1.5" />
                          <text x={(xOf(n - 1) - 6).toFixed(1)} y={(yOf(samples[n - 1].fv) - 9).toFixed(1)} textAnchor="end" fill="#0D1B2A" fontSize="10" fontWeight="700">
                            {fmtShort(samples[n - 1].fv)}
                          </text>
                        </>
                      )}
                    </svg>

                    {/* X-axis labels */}
                    <div style={{ position: 'relative', height: 18, marginTop: 2 }}>
                      {labelIs.map((si, li) => {
                        const isFirst = li === 0;
                        const isLast  = li === labelIs.length - 1;
                        const xPct    = ((xOf(si) / CW) * 100).toFixed(1);
                        const transform = isFirst ? 'none' : isLast ? 'translateX(-100%)' : 'translateX(-50%)';
                        return (
                          <span
                            key={si}
                            style={{
                              position: 'absolute', left: `${xPct}%`,
                              transform, fontSize: '11px', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap',
                            }}
                          >
                            Age {samples[si].age}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chart legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(100,116,139,0.40)' }} />
                      <span style={{ fontSize: '10.5px', color: '#6B7A8D' }}>Initial Assets</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(56,119,219,0.40)' }} />
                      <span style={{ fontSize: '10.5px', color: '#6B7A8D' }}>Future Contributions</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(29,181,132,0.55)' }} />
                      <span style={{ fontSize: '10.5px', color: '#6B7A8D' }}>Investment Growth</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 rounded" style={{ background: '#1DB584' }} />
                      <span style={{ fontSize: '10.5px', color: '#6B7A8D' }}>Portfolio Value</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 rounded" style={{ background: '#F97316', borderTop: '1.5px dashed #F97316' }} />
                      <span style={{ fontSize: '10.5px', color: '#6B7A8D' }}>FIRE Target ({results.fireMultiple}× expenses)</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Right: Financial Independence Progress gauge ────────────────── */}
        <div className="lg:col-span-5" style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Goal progress
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Financial Independence Progress</h3>
            </div>

            {!results && (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  {emptyReason === 'expenses'
                    ? 'Enter your annual expenses to calculate your FIRE target.'
                    : 'Enter your details to see your FI progress.'}
                </p>
              </div>
            )}

            {results && (() => {
              const SEMI_R = 88, CX = 104, CY = 100;
              const SEMI_C = Math.PI * SEMI_R;
              const ratio   = Math.min(1, results.rawProgressPct / 100);
              const fillAmt = ratio * SEMI_C;
              const trackPath = `M ${CX - SEMI_R} ${CY} A ${SEMI_R} ${SEMI_R} 0 0 1 ${CX + SEMI_R} ${CY}`;
              const gc = results.progressGaugeColor;
              const gb = results.progressGaugeBg;
              return (
                <div className="flex flex-col flex-1 gap-2">

                  {/* Semi-circle gauge */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1 w-full">
                      <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Current Portfolio vs FIRE Target</p>
                      <span className="ml-auto px-2 py-0.5 rounded-full shrink-0" style={{ fontSize: '10px', fontWeight: 700, background: gb, color: gc }}>
                        {results.progressBadge}
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
                        <span style={{ fontSize: '2rem', fontWeight: 800, color: gc, lineHeight: 1 }}>
                          {results.alreadyFI ? '100%+' : `${Math.round(results.rawProgressPct)}%`}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>of FIRE target</span>
                      </div>
                    </div>
                    <span className="mt-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: gb, color: gc }}>
                      {results.progressBadge}
                    </span>
                  </div>

                  {/* Stat rows — condensed */}
                  <div className="divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>FIRE Target</span>
                      <span className="font-bold" style={{ color: '#F97316', fontSize: '12.5px' }}>{fmt(safe(results.fireTarget))}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Current Portfolio</span>
                      <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmt(safe(results.currentAssets))}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Gap to FIRE</span>
                      <span className="font-semibold" style={{ color: results.gapToFIRE === 0 ? '#1DB584' : '#0D1B2A', fontSize: '12.5px' }}>
                        {results.gapToFIRE === 0 ? '—' : fmt(safe(results.gapToFIRE))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Estimated FIRE Age</span>
                      <span className="font-semibold" style={{ color: results.fireAge !== null || results.alreadyFI ? '#1DB584' : '#94a3b8', fontSize: '12.5px' }}>
                        {results.alreadyFI ? `Age ${results.currentAge}` : results.fireAge !== null ? `Age ${results.fireAge}` : '—'}
                      </span>
                    </div>
                    <div className="pt-1 pb-0.5">
                      <p className="text-[10.5px] leading-relaxed" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        Progress reflects today&apos;s portfolio vs your {results.fireMultiple}× FIRE target. Projected values assume a {results.annualRate}% constant annual return. Actual returns vary.
                      </p>
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>
        </div>

      </div>

      {/* ══ Block D: Financial Independence Insight ══════════════════════════ */}
      <div
        id="fire-ai"
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
                FinCalc <span style={{ color: '#F97316' }}>Smart</span> Financial Independence Insight
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
                {emptyReason === 'expenses'
                  ? 'Enter your annual expenses above to calculate your FIRE target.'
                  : 'Enter your FIRE details above to see the analysis.'}
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 360 }}>
                {emptyReason === 'expenses'
                  ? 'Annual expenses × your chosen multiple = your FIRE target. Once entered, the analysis will show your readiness score, FI progress, and estimated time to independence.'
                  : 'The analysis will show your FIRE Readiness Score, FI Progress, estimated time to independence, and personalised insight cards.'}
              </p>
            </div>
          )}

          {results && (
            <>
              {/* ── Row 1: Two gauges + Smart lever ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Left — FIRE Analysis gauges */}
                <div className="rounded-2xl p-4 flex flex-col"
                  style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold text-slate-800">FIRE Analysis</span>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row">

                    {/* Gauge 1: FIRE Readiness Score */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0 pb-3 sm:pb-0 sm:pr-3">
                      <div className="flex items-center w-full mb-2">
                        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Readiness Score</p>
                        <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                          style={{ fontSize: '10px', fontWeight: 700, background: results.readinessBg, color: results.readinessColor }}>
                          {results.readinessStatus}
                        </span>
                      </div>
                      {(() => {
                        const GR = 48; const GC = 2 * Math.PI * GR;
                        const GARC = (240 / 360) * GC;
                        const GFIL = GARC * (results.readinessScore / 100);
                        return (
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 66, 66)" />
                              <circle cx="66" cy="66" r={GR} fill="none" stroke={results.readinessColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>{results.readinessScore}</span>
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>/ 100</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: results.readinessColor }}>{results.readinessLabel}</span>
                            </div>
                          </div>
                        );
                      })()}
                      <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                        {results.alreadyFI
                          ? 'Your portfolio has reached your FIRE target. Financial independence is within reach at current expenses.'
                          : results.readinessStatus === 'Healthy'
                            ? `Strong trajectory toward financial independence${results.fireAge !== null ? ` at age ${results.fireAge}` : ''}.`
                            : results.readinessStatus === 'Watch'
                              ? 'Moderate pace. Increasing contributions or return assumption accelerates your path to FI.'
                              : 'Early stage. Consistent monthly investment and time are the two most powerful levers.'}
                      </p>
                    </div>

                    <div className="hidden sm:block self-stretch w-px mx-1" style={{ background: 'rgba(15,41,66,0.08)' }} />
                    <div className="block sm:hidden h-px w-full mb-3" style={{ background: 'rgba(15,41,66,0.08)' }} />

                    {/* Gauge 2: FI Progress */}
                    {(() => {
                      const GR = 48; const GC = 2 * Math.PI * GR;
                      const GARC = (240 / 360) * GC;
                      const displayPct = Math.min(100, results.rawProgressPct);
                      const GFIL = GARC * (displayPct / 100);
                      const gc = results.progressGaugeColor;
                      const gb = results.progressGaugeBg;
                      return (
                        <div className="flex-1 flex flex-col items-center text-center min-w-0 sm:pl-3">
                          <div className="flex items-center w-full mb-2">
                            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>FI Progress</p>
                            <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                              style={{ fontSize: '10px', fontWeight: 700, background: gb, color: gc }}>
                              {results.progressBadge}
                            </span>
                          </div>
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 66, 66)" />
                              <circle cx="66" cy="66" r={GR} fill="none" stroke={gc} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>
                                {results.alreadyFI ? '100' : Math.round(displayPct)}<span style={{ fontSize: '1rem' }}>%</span>
                              </span>
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>of target</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: gc }}>{results.progressBadge}</span>
                            </div>
                          </div>
                          <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                            {results.alreadyFI
                              ? `Your current portfolio of ${fmt(safe(results.currentAssets))} exceeds your ${results.fireMultiple}× FIRE target.`
                              : `Your current portfolio is ${Math.round(results.rawProgressPct)}% of your ${fmt(safe(results.fireTarget))} FIRE target.`}
                          </p>
                        </div>
                      );
                    })()}

                  </div>
                </div>

                {/* Right — Smart Lever */}
                <div className="rounded-2xl p-3 flex flex-col"
                  style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 shrink-0" style={{ color: results.leverState === 'not-reachable' ? '#ef4444' : '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold" style={{ color: results.leverState === 'not-reachable' ? '#ef4444' : '#1DB584' }}>
                      {results.leverState === 'already-fi'     ? 'Financially Independent' :
                       results.leverState === 'on-track'       ? 'On Track to FI' :
                       results.leverState === 'building'       ? 'Building Toward FI' :
                       'Contribution Needed'}
                    </span>
                  </div>

                  {/* State A: already-fi */}
                  {results.leverState === 'already-fi' && (
                    <div className="flex flex-col gap-3 mt-1 flex-1 justify-center">
                      <div className="rounded-xl flex items-center justify-center px-4 py-5"
                        style={{ background: 'rgba(29,181,132,0.12)', border: '1px solid rgba(29,181,132,0.25)' }}>
                        <div className="text-center">
                          <span className="font-extrabold tabular-nums" style={{ fontSize: 'clamp(1.8rem, 7vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(safe(results.currentAssets))}
                          </span>
                          <p className="text-emerald-300 text-xs mt-1" style={{ fontWeight: 600 }}>current portfolio</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">exceeds your {results.fireMultiple}× FIRE target of {fmt(safe(results.fireTarget))}</p>
                        <p className="text-slate-400 text-xs mt-0.5">At {results.annualRate}% annual return and {fmt(safe(results.annualExpenses))}/year in expenses, your portfolio supports your FIRE number.</p>
                      </div>
                      <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                        This is an illustrative projection only. Actual withdrawal sustainability depends on sequence of returns, expenses, and personal circumstances. This is not financial advice.
                      </p>
                    </div>
                  )}

                  {/* State B: on-track */}
                  {results.leverState === 'on-track' && (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#F97316', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            Age {results.fireAge}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">estimated FIRE age — {results.yearsToFIRE} years from now</p>
                          <p className="text-slate-400 text-xs mt-0.5">At {results.annualRate}% return and {fmtx(safe(results.monthlyInvestment))}/month, your projection reaches your {results.fireMultiple}× FIRE target.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.currentAssets))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Current portfolio</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2, color: '#F97316' }}>{fmtx(safe(results.monthlyInvestment))}/mo</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#F97316' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Monthly investment</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#F97316', letterSpacing: '-2px', lineHeight: 1 }}>
                              Age {results.fireAge}
                            </span>
                            <span style={{ fontSize: '10px', color: 'rgba(249,115,22,0.7)', fontWeight: 600, marginTop: 4 }}>estimated FIRE age</span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(safe(results.currentAssets))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Today&apos;s portfolio</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2, color: '#F97316' }}>{fmtx(safe(results.monthlyInvestment))}/mo</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#F97316' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Monthly investment</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{results.yearsToFIRE} year{results.yearsToFIRE !== 1 ? 's' : ''} until estimated financial independence</p>
                          <p className="text-slate-400 text-xs mt-0.5">At {results.annualRate}% annual return. Projection based on current inputs. Estimate based on current inputs.</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* State C: building */}
                  {results.leverState === 'building' && (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
                          <div className="text-center">
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#F97316', letterSpacing: '-1.5px', lineHeight: 1 }}>
                              Age {results.fireAge}
                            </span>
                            <p style={{ fontSize: '10px', color: 'rgba(249,115,22,0.7)', fontWeight: 600, marginTop: 2 }}>{results.yearsToFIRE} years away</p>
                          </div>
                        </div>
                        {results.extraMonthlySooner > 0 && (
                          <div>
                            <p className="text-white font-semibold text-sm">
                              To reach FIRE 5 years sooner (age {results.currentAge + results.soonerYears}), contribute an extra{' '}
                              <span style={{ color: '#F97316' }}>{fmtx(safe(results.extraMonthlySooner))}/mo</span>
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.fireTarget))}</div>
                            <div className="flex items-center gap-1.5">
                              <Flame className="w-3 h-3 shrink-0" style={{ color: '#F97316' }} aria-hidden />
                              <span className="text-slate-400 text-xs">FIRE target</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2, color: '#F97316' }}>{fmtx(safe(results.monthlyInvestment))}/mo</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#F97316' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Current pace</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Based on {results.annualRate}% return assumption. Estimate based on current inputs — actual results vary.
                        </p>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#F97316', letterSpacing: '-2px', lineHeight: 1 }}>
                              Age {results.fireAge}
                            </span>
                            <span style={{ fontSize: '10px', color: 'rgba(249,115,22,0.7)', fontWeight: 600, marginTop: 4 }}>estimated FIRE age</span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(safe(results.fireTarget))}</div>
                            <div className="flex items-center gap-1.5">
                              <Flame className="w-3 h-3 shrink-0" style={{ color: '#F97316' }} aria-hidden />
                              <span className="text-slate-400 text-xs">FIRE target</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2, color: '#F97316' }}>{fmtx(safe(results.monthlyInvestment))}/mo</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#F97316' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Monthly investment</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">
                            {results.yearsToFIRE} years to estimated FIRE at age {results.fireAge}
                          </p>
                          {results.extraMonthlySooner > 0 && (
                            <p className="text-slate-400 text-xs mt-0.5">
                              To reach FIRE 5 years sooner, invest an additional{' '}
                              <span style={{ color: '#F97316', fontWeight: 700 }}>{fmtx(safe(results.extraMonthlySooner))}/month</span>.
                              Estimate based on current inputs.
                            </p>
                          )}
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Based on {results.annualRate}% annual return. Estimate based on current inputs — not financial advice.
                        </p>
                      </div>
                    </>
                  )}

                  {/* State D: not-reachable */}
                  {results.leverState === 'not-reachable' && (
                    <div className="flex flex-col gap-3 mt-1 flex-1 justify-center">
                      <div className="rounded-xl px-4 py-4"
                        style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)' }}>
                        <p className="text-white font-semibold text-sm mb-1">Not reachable at current pace</p>
                        <p className="text-slate-400 text-xs">
                          Your current portfolio and monthly investment do not reach your {fmt(safe(results.fireTarget))} FIRE target within 100 years at {results.annualRate}% return.
                        </p>
                      </div>
                      {results.monthlyFor20yr > 0 && (
                        <div className="rounded-xl px-4 py-3"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <p className="text-white font-semibold text-sm">To reach FIRE in 20 years:</p>
                          <p className="font-extrabold tabular-nums mt-1" style={{ fontSize: '1.6rem', color: '#F97316', letterSpacing: '-1px', lineHeight: 1 }}>
                            {fmtx(safe(results.monthlyFor20yr))}/mo
                          </p>
                          <p className="text-slate-400 text-xs mt-0.5">Estimated monthly investment needed. Estimate based on current inputs and return assumption.</p>
                        </div>
                      )}
                      <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                        Consider increasing monthly contributions, adjusting expenses, or revisiting your return assumption. This is not financial advice.
                      </p>
                    </div>
                  )}

                </div>
              </div>

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Card 1 — Contribution / Savings Pace */}
                <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Savings Pace</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    You are investing <strong className="text-sky-700">{fmtx(safe(results.monthlyInvestment))}/month</strong>
                    {results.savingsRate !== null && (
                      <>, a savings rate of{' '}
                        <strong className="text-sky-700">{results.savingsRate.toFixed(1)}%</strong> of your income
                      </>
                    )}.{' '}
                    {results.yearsToFIRE !== null
                      ? `Over ${results.yearsToFIRE} year${results.yearsToFIRE !== 1 ? 's' : ''}, your contributions total ${fmt(Math.max(0, safe(results.totalContribs) - safe(results.currentAssets)))} before investment growth.`
                      : `At current pace, your contributions over 20 years would total ${fmt(Math.max(0, safe(results.totalContribs) - safe(results.currentAssets)))}.`}
                    {results.savingsRate !== null && results.savingsRate >= 50 && ' A 50%+ savings rate is among the fastest paths to FIRE.'}
                    {results.savingsRate !== null && results.savingsRate < 20 && ' Increasing your savings rate is the highest-impact lever for accelerating FIRE.'}
                  </p>
                </div>

                {/* Card 2 — FIRE Target Check */}
                <div className="rounded-2xl p-4" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#ffedd5' }}>
                      <Flame className="w-3.5 h-3.5 text-orange-500" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-orange-600">FIRE Target</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Your FIRE target is{' '}
                    <strong className="text-orange-700">{fmt(safe(results.fireTarget))}</strong>{' '}
                    — {results.fireMultiple}× your annual expenses of{' '}
                    <strong className="text-orange-700">{fmt(safe(results.annualExpenses))}</strong>.{' '}
                    The {results.fireMultiple}× multiple corresponds to a{' '}
                    {results.fireMultiple === 25 ? '4% implied withdrawal rate (the widely cited "4% rule")' :
                     results.fireMultiple === 20 ? '5% implied withdrawal rate (aggressive — shorter runway)' :
                     results.fireMultiple === 30 ? '3.3% implied withdrawal rate (moderately conservative)' :
                     '3% implied withdrawal rate (conservative — longer runway)'}.{' '}
                    These are illustrative benchmarks only. Your actual sustainability depends on expenses, market returns, and retirement length.
                  </p>
                </div>

                {/* Card 3 — Time to Independence */}
                {(() => {
                  const bg   = results.leverState === 'already-fi'    ? '#f0fdf4' :
                               results.leverState === 'not-reachable' ? '#fff7ed' : '#fdf4ff';
                  const bdr  = results.leverState === 'already-fi'    ? '#bbf7d0' :
                               results.leverState === 'not-reachable' ? '#fed7aa' : '#e9d5ff';
                  const ibg  = results.leverState === 'already-fi'    ? '#dcfce7' :
                               results.leverState === 'not-reachable' ? '#ffedd5' : '#f3e8ff';
                  const lbl  = results.leverState === 'already-fi'    ? 'text-emerald-600' :
                               results.leverState === 'not-reachable' ? 'text-orange-600'  : 'text-purple-600';
                  const icol = results.leverState === 'already-fi'    ? 'text-emerald-500' :
                               results.leverState === 'not-reachable' ? 'text-orange-500'  : 'text-purple-500';
                  return (
                    <div className="rounded-2xl p-4" style={{ background: bg, border: `1px solid ${bdr}` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center justify-center shrink-0"
                          style={{ width: 28, height: 28, borderRadius: 8, background: ibg }}>
                          <AlertTriangle className={`w-3.5 h-3.5 ${icol}`} aria-hidden />
                        </span>
                        <p className={`text-xs font-bold uppercase tracking-widest ${lbl}`}>Time to Independence</p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {results.alreadyFI
                          ? <>Your portfolio of <strong className="text-emerald-700">{fmt(safe(results.currentAssets))}</strong> already exceeds your FIRE target. Continuing to invest grows your buffer further — providing greater flexibility against sequence-of-returns risk. This is not financial advice.</>
                          : results.leverState === 'not-reachable'
                            ? <>At {results.annualRate}% return, your plan does not reach {fmt(safe(results.fireTarget))} within 100 years. Review your target multiple, expected expenses, monthly investment, or return assumption. Consider increasing contributions or revisiting the {results.fireMultiple}× target. This is not financial advice.</>
                            : <>At an assumed {results.annualRate}% annual return, your projected portfolio reaches{' '}
                                <strong className="text-purple-700">{fmt(safe(results.projectedAtFIRE))}</strong> at age {results.fireAge} — your estimated FIRE age.{' '}
                                Investment growth of <strong className="text-purple-700">{fmt(safe(results.investGrowth))}</strong> drives{' '}
                                {results.totalContribs > 0 ? Math.round((results.investGrowth / results.projectedAtFIRE) * 100) : 0}% of that value.
                              </>
                        }
                      </p>
                    </div>
                  );
                })()}

              </div>
            </>
          )}

        </div>

        {/* Inner disclaimer */}
        <div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
          style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
          <p className="text-slate-400 text-xs leading-relaxed">
            <strong className="text-slate-500 font-semibold">Disclaimer:</strong>{' '}
            This analysis is for illustrative and educational purposes only. Projected FIRE ages and portfolio values assume a constant annual return and consistent monthly contributions. This tool does not account for taxes, inflation, investment fees, Social Security, CPP/OAS, pension income, healthcare costs, or sequence-of-returns risk. The withdrawal rate benchmarks shown (4%, 5%, etc.) are widely cited rules of thumb — not guaranteed safe withdrawal strategies. Actual paths to financial independence will differ. This is not investment, tax, or financial advice. Consult a qualified financial advisor for personalised guidance.
          </p>
        </div>

      </div>

      {/* ══ Block F: How It Works ════════════════════════════════════════════ */}
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

      {/* ══ Block G: FAQ ═════════════════════════════════════════════════════ */}
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
        This calculator is for illustrative and educational purposes only. It does not account for taxes, inflation, investment fees, Social Security, CPP/OAS, pension income, healthcare costs, or sequence-of-returns risk. The FIRE Target Multiple and withdrawal rate benchmarks are commonly cited rules of thumb — not guarantees of withdrawal sustainability. Projected FIRE ages are estimates based on a constant assumed return and consistent monthly contributions. Actual results will differ. This does not constitute investment, tax, or financial advice. Consult a qualified financial advisor for personalised retirement and financial independence planning.
      </p>

    </div>
  );
}
