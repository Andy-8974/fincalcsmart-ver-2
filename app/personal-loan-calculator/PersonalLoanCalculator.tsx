'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip, DonutChart, type PieSlice } from '../_mortgage-shared/ui';
import { fmtCAD, fmtCADx, fmtUSD, fmtUSDx } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  Activity, AlertTriangle, BookOpen, CreditCard, Download,
  HelpCircle, Mail, ShieldAlert, Sparkles, TrendingUp, User, Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  loanAmount: string;
  annualRate: string;
  annualIncome: string;
}

interface TermScenario {
  years: number;
  payment: number;
  totalInterest: number;
  isCurrent: boolean;
}

interface LoanResults {
  loanAmount: number;
  annualRate: number;
  loanTermYears: number;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  interestRatio: number;       // total interest as % of principal (0–100)
  dtiPct: number | null;       // null when income blank
  loanScore: number;           // 0–100
  scoreLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  statusLabel: 'Healthy' | 'Watch' | 'Caution';
  statusColor: string;
  statusBg: string;
  termScenarios: TermScenario[];
  shorterTermOpt: { years: number; payment: number; interestSaved: number; paymentDiff: number } | null;
  costPer1000: number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  loanAmount: '10000',
  annualRate: '8.5',
  annualIncome: '',
};

const DEFAULT_TERM = 3;
const TERM_OPTIONS = [1, 2, 3, 4, 5];

// ─── Math helpers ─────────────────────────────────────────────────────────────

function safe(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function calcPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0;
  const n = termYears * 12;
  if (annualRate === 0) return principal / n;
  const r = annualRate / 12 / 100;
  return principal * r / (1 - Math.pow(1 + r, -n));
}

function computeResults(form: FormState, loanTermYears: number): LoanResults | null {
  const loanAmount = parseFloat(form.loanAmount) || 0;
  const annualRate = Math.max(0, Math.min(49.9, parseFloat(form.annualRate) || 0));
  const annualIncome = parseFloat(form.annualIncome) || 0;

  if (loanAmount <= 0) return null;

  const monthlyPayment = calcPayment(loanAmount, annualRate, loanTermYears);
  const n = loanTermYears * 12;
  const totalCost = monthlyPayment * n;
  const totalInterest = totalCost - loanAmount;
  const interestRatio = loanAmount > 0 ? (totalInterest / loanAmount) * 100 : 0;

  const dtiPct = annualIncome > 0
    ? (monthlyPayment / (annualIncome / 12)) * 100
    : null;

  // Loan Cost Score — borrowing cost only (rate + interest ratio); DTI stays in affordability card
  const rateScore = Math.max(0, 50 - Math.max(0, annualRate - 5) * 3.5);
  const ratioScore = Math.max(0, 50 - interestRatio * 1.5);
  const loanScore = Math.round(rateScore + ratioScore);

  const scoreLabel: LoanResults['scoreLabel'] =
    loanScore >= 80 ? 'Excellent' : loanScore >= 65 ? 'Good' : loanScore >= 45 ? 'Fair' : 'Poor';

  const statusLabel: LoanResults['statusLabel'] =
    scoreLabel === 'Poor' ? 'Caution'
    : scoreLabel === 'Fair' ? 'Watch'
    : (annualRate > 12 || interestRatio > 20) ? 'Watch'
    : 'Healthy';

  const statusColor = statusLabel === 'Healthy' ? '#1DB584' : statusLabel === 'Watch' ? '#f59e0b' : '#ef4444';
  const statusBg = statusLabel === 'Healthy' ? 'rgba(29,181,132,0.10)' : statusLabel === 'Watch' ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

  // Term comparison: always 3 scenarios including current term
  const scenarioMap: Record<number, number[]> = {
    1: [1, 2, 3],
    2: [1, 2, 3],
    3: [2, 3, 5],
    4: [2, 3, 4],
    5: [3, 4, 5],
  };
  const scenarioYears = scenarioMap[loanTermYears] ?? [loanTermYears - 1, loanTermYears, loanTermYears + 1];
  const termScenarios: TermScenario[] = scenarioYears.map((y) => {
    const p = calcPayment(loanAmount, annualRate, y);
    return {
      years: y,
      payment: p,
      totalInterest: p * y * 12 - loanAmount,
      isCurrent: y === loanTermYears,
    };
  });

  // Shorter-term optimisation
  const shorterYear = loanTermYears > 1 ? loanTermYears - 1 : null;
  const shorterTermOpt = shorterYear !== null ? (() => {
    const p = calcPayment(loanAmount, annualRate, shorterYear);
    const tInt = p * shorterYear * 12 - loanAmount;
    return {
      years: shorterYear,
      payment: p,
      interestSaved: totalInterest - tInt,
      paymentDiff: p - monthlyPayment,
    };
  })() : null;

  const costPer1000 = loanAmount > 0 ? (totalInterest / loanAmount) * 1000 : 0;

  return {
    loanAmount, annualRate, loanTermYears,
    monthlyPayment, totalInterest, totalCost,
    interestRatio, dtiPct, loanScore, scoreLabel,
    statusLabel, statusColor, statusBg,
    termScenarios, shorterTermOpt, costPer1000,
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

// ─── Component props ──────────────────────────────────────────────────────────

interface PersonalLoanCalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PersonalLoanCalculator({
  formulaContent,
  faqItems = [],
}: PersonalLoanCalculatorProps) {
  const { region } = useRegion();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [loanTermYears, setLoanTermYears] = useState<number>(DEFAULT_TERM);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isCA = region === 'ca';
  const currencyPrefix = isCA ? 'CA$' : '$';
  const fmt = isCA ? fmtCAD : fmtUSD;
  const fmtx = isCA ? fmtCADx : fmtUSDx;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const results = useMemo(() => computeResults(form, loanTermYears), [form, loanTermYears]);

  const donutSlices = useMemo((): PieSlice[] | null => {
    if (!results) return null;
    return [
      { label: 'Principal', value: safe(results.loanAmount), color: '#1DB584', alwaysShow: true },
      { label: 'Total Interest', value: safe(results.totalInterest), color: '#F59E0B', alwaysShow: true },
    ];
  }, [results]);

  // ─── Download PDF ──────────────────────────────────────────────────────────
  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      const { buildLoanPDF } = await import('@/lib/pdf/adapters/loanAdapter');
      const input = {
        loanType:                 'personal' as const,
        loanAmount:               results.loanAmount,
        annualRate:               results.annualRate,
        monthlyPayment:           results.monthlyPayment,
        totalInterest:            results.totalInterest,
        totalCost:                results.totalCost,
        interestRatio:            results.interestRatio,
        dtiPct:                   results.dtiPct,
        loanScore:                results.loanScore,
        scoreLabel:               results.scoreLabel,
        statusLabel:              results.statusLabel,
        costPer1000:              results.costPer1000,
        loanTermYears:            results.loanTermYears,
        shorterTermYears:         results.shorterTermOpt?.years ?? null,
        shorterTermInterestSaved: results.shorterTermOpt?.interestSaved ?? 0,
        shorterTermPaymentDiff:   results.shorterTermOpt?.paymentDiff ?? 0,
        region:                   (isCA ? 'ca' : 'us') as 'ca' | 'us',
      };
      await buildLoanPDF(input);
    } finally {
      setPdfLoading(false);
    }
  }

  // ─── Scroll to AI Analysis ─────────────────────────────────────────────────
  function scrollToAI() {
    const el = document.getElementById('ai-analysis');
    if (!el) return;
    const navH = (document.querySelector('header') as HTMLElement | null)?.getBoundingClientRect().height ?? 64;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - 16), behavior: 'smooth' });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-y-7 md:gap-y-8 min-w-0">

      {/* Term pill CSS — wraps to 3+2 on 375px */}
      <style>{`
        @keyframes teal-glow-loan {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-loan {
          animation: teal-glow-loan 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-loan:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
        .loan-term-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .loan-term-pill  { flex: 1; min-width: calc(33.33% - 6px); }
        @media (min-width: 480px) { .loan-term-pill { min-width: 0; } }
        .dps-gauge { position: relative; flex-shrink: 0; width: 160px; height: 160px; }
        .dps-gauge svg { display: block; width: 160px; height: 160px; }
        .dps-gauge-label { padding-bottom: 14px; }
        @media (min-width: 768px) {
          .dps-gauge { width: 220px; height: 220px; }
          .dps-gauge svg { width: 220px; height: 220px; }
          .dps-gauge-label { padding-bottom: 22px; }
        }
      `}</style>

      {/* ══ Block A: Input Card (7) + Results Card (5) ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

        {/* ── Input Card ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 lg:self-start" style={cardStyle}>
          <div className="p-5 md:p-6">

            {/* Card header */}
            <div className="flex items-center gap-3 mb-4 md:mb-5">
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'linear-gradient(135deg,#1DB584 0%,#0ea56e 100%)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(29,181,132,0.30)',
              }}>
                <User size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Personal Loan
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Loan Details</p>
              </div>
            </div>

            {/* Fields — 2-col grid */}
            <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

              {/* Left column */}
              <div className="space-y-3 min-w-0">

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle} htmlFor="pl-amount">
                    Loan Amount
                    <Tooltip text="The total amount you want to borrow. Most unsecured personal loans range from $1,000 to $50,000." />
                  </label>
                  <NumericInput
                    value={form.loanAmount}
                    onChange={(v) => set('loanAmount', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle} htmlFor="pl-rate">
                    Annual Interest Rate
                    <Tooltip text="The annual percentage rate (APR) on the loan. Find this on your loan offer or statement. Rates for good-credit borrowers typically range 7–20%." />
                  </label>
                  <NumericInput
                    value={form.annualRate}
                    onChange={(v) => set('annualRate', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                  {(() => {
                    const raw = parseFloat(form.annualRate);
                    return !isNaN(raw) && (raw < 0 || raw > 49.9) ? (
                      <p className="mt-0.5 text-[10px]" style={{ color: '#f59e0b' }}>
                        Rate must be 0–49.9%. Using {Math.max(0, Math.min(49.9, raw))}%.
                      </p>
                    ) : null;
                  })()}
                </div>

              </div>{/* end left col */}

              {/* Right column */}
              <div className="border-l pl-2 md:pl-5 space-y-3 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>

                {/* Term pill selector */}
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Loan Term
                  </label>
                  <div className="loan-term-pills">
                    {TERM_OPTIONS.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        className="loan-term-pill text-center font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
                        onClick={() => setLoanTermYears(yr)}
                        style={
                          loanTermYears === yr
                            ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                            : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                        }
                      >
                        {yr} yr
                      </button>
                    ))}
                  </div>
                </div>

                {/* Income — optional */}
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle} htmlFor="pl-income">
                    Annual Income
                    <Tooltip text="Optional. Used only for affordability analysis in the AI section — shows your monthly payment as a percentage of gross monthly income." />
                  </label>
                  <NumericInput
                    value={form.annualIncome}
                    onChange={(v) => set('annualIncome', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                    placeholder="Optional"
                  />
                  <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>
                    Optional — for affordability analysis
                  </p>
                </div>

              </div>{/* end right col */}

            </div>
          </div>
        </div>{/* end Input Card */}

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

            {/* Empty state */}
            {!results && (
              <div className="flex flex-1 items-center justify-center py-12">
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                  Enter a loan amount to see your monthly payment.
                </p>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="flex flex-col flex-1 gap-4">

                {/* Primary result */}
                <div
                  className="rounded-xl p-5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <p style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
                  }}>
                    Monthly Payment
                  </p>
                  <p style={{ color: '#1DB584', fontSize: '38px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 8 }}>
                    {fmtx(safe(results.monthlyPayment))}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: 6, fontWeight: 500 }}>
                    {results.loanTermYears * 12} payments over {results.loanTermYears} {results.loanTermYears === 1 ? 'year' : 'years'}
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#F59E0B' }} />
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Total Interest</span>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: '#F59E0B' }}>
                      {fmt(safe(results.totalInterest))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300 font-medium">Total Cost</span>
                    <span className="text-[13px] font-bold text-white">{fmt(safe(results.totalCost))}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Interest / Principal</span>
                    <span className="text-[13px] font-semibold text-white">{results.interestRatio.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                {/* CTA */}
                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See how your loan term changes interest and monthly cost.
                  </p>
                  <button
                    className="btn-ai-cta-loan w-full font-bold overflow-hidden"
                    onClick={scrollToAI}
                    onMouseEnter={() => setAiCtaHovered(true)}
                    onMouseLeave={() => setAiCtaHovered(false)}
                    style={{
                      position: 'relative',
                      background: '#060F1A',
                      color: '#ffffff',
                      borderRadius: 8,
                      height: 40,
                      fontSize: '13px',
                      border: '1px solid rgba(29,181,132,0.4)',
                    }}
                  >
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      opacity: aiCtaHovered ? 0 : 1,
                      transition: 'opacity 200ms ease',
                      pointerEvents: 'none',
                    }}>
                      Review Smart Loan Insights ↓
                    </span>
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      opacity: aiCtaHovered ? 1 : 0,
                      transition: 'opacity 200ms ease',
                      pointerEvents: 'none',
                    }}>
                      <Sparkles size={13} style={{ marginRight: 6, color: '#1DB584' }} aria-hidden />
                      See AI Loan Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>{/* end Results Card */}

      </div>{/* end Block A */}

      {/* ══ Block C: Payment Breakdown + Term Comparison ═════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Left: Payment Breakdown donut ─────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Cost breakdown
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Payment Breakdown</h3>
            </div>

            {/* Empty placeholder */}
            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter loan details to see the breakdown.
                </p>
              </div>
            )}

            {/* Active */}
            {results && donutSlices && (() => {
              const rows = [
                { label: 'Principal', value: results.loanAmount, color: '#1DB584' },
                { label: 'Total Interest', value: results.totalInterest, color: '#F59E0B' },
              ];
              return (
                <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                  <div className="shrink-0">
                    <DonutChart
                      slices={donutSlices}
                      className="w-52 h-52"
                      centerValue={fmt(safe(results.totalCost))}
                      centerLabel="total cost"
                    />
                  </div>
                  <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    {rows.map(({ label, value, color }) => {
                      const pct = results.totalCost > 0 ? Math.round((safe(value) / results.totalCost) * 100) : 0;
                      return (
                        <div key={label} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                            <span style={{ color: '#4B5563', fontSize: '12.5px' }}>{label}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-400">{pct}%</span>
                            <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmt(safe(value))}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between py-2">
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>Total Cost</span>
                      <span className="font-bold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmt(safe(results.totalCost))}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        {/* ── Right: Term Comparison ─────────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Compare scenarios
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Term Comparison</h3>
            </div>

            {/* Empty placeholder */}
            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter loan details to compare terms.
                </p>
              </div>
            )}

            {/* Chart */}
            {results && (() => {
              const allTerms = [1, 2, 3, 4, 5].map((y) => {
                const payment = calcPayment(results.loanAmount, results.annualRate, y);
                const totalCost = payment * y * 12;
                const totalInterest = Math.max(0, totalCost - results.loanAmount);
                return { years: y, payment, totalCost, totalInterest, isCurrent: y === results.loanTermYears };
              });

              const cur = allTerms.find((t) => t.isCurrent) ?? allTerms[2];
              const maxCost = Math.max(...allTerms.map((t) => t.totalCost));
              const yMax = Math.ceil(maxCost / 1000) * 1000;
              const fmtTick = (val: number) => {
                if (val === 0) return '$0';
                if (yMax >= 1000000) {
                  const m = (val / 1000000).toFixed(2).replace(/0$/, '').replace(/\.0$/, '');
                  return `$${m}M`;
                }
                const decimals = yMax < 10000 ? 1 : 0;
                const k = (val / 1000).toFixed(decimals).replace(/\.0$/, '');
                return `$${k}k`;
              };
              const CHART_H = 188;
              const XLABEL_H = 30;
              const YAXIS_W = 30;

              const statRows = [
                { label: 'Monthly', value: fmtx(safe(cur.payment)), color: '#1DB584' as const },
                { label: 'Total Cost', value: fmt(safe(cur.totalCost)), color: '#0D1B2A' as const },
                { label: 'Interest', value: fmt(safe(cur.totalInterest)), color: '#F59E0B' as const },
              ];
              const legendRows = [
                { label: 'Principal', color: '#1DB584' as const },
                { label: 'Interest', color: '#F59E0B' as const },
              ];

              return (
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 flex-1 min-h-0">

                  {/* ── Left: summary + legend ───────────────────────────── */}
                  <div className="flex flex-col gap-4 sm:w-[108px] shrink-0 sm:justify-center">
                    <div className="flex flex-col gap-3 sm:gap-2.5">
                      {statRows.map(({ label, value, color }) => (
                        <div key={label}>
                          <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9BA8B5', marginBottom: 2 }}>{label}</p>
                          <p style={{ fontSize: '13px', fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="hidden sm:block" style={{ height: 1, background: 'rgba(15,41,66,0.08)' }} />
                    <div className="flex flex-col gap-2 sm:gap-1.5">
                      {legendRows.map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                          <span style={{ fontSize: '10px', color: '#6B7A8D' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Right: chart ─────────────────────────────────────── */}
                  <div
                    className="flex-1 relative"
                    style={{ minHeight: CHART_H + XLABEL_H + 60 }}
                  >
                    {/* Y-axis tick labels */}
                    {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                      <div
                        key={frac}
                        className="absolute"
                        style={{
                          left: 0,
                          width: YAXIS_W,
                          bottom: XLABEL_H + Math.round(frac * CHART_H) - 5,
                          fontSize: '8px',
                          color: '#9BA8B5',
                          textAlign: 'right',
                          lineHeight: 1,
                        }}
                      >
                        {fmtTick(yMax * frac)}
                      </div>
                    ))}

                    {/* Chart inner area (offset right of y-axis) */}
                    <div
                      className="absolute top-0 bottom-0"
                      style={{ left: YAXIS_W + 4, right: 0 }}
                    >
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                        <div
                          key={frac}
                          className="absolute left-0 right-0"
                          style={{
                            bottom: XLABEL_H + Math.round(frac * CHART_H),
                            borderTop: frac === 0
                              ? '1px solid rgba(15,41,66,0.12)'
                              : '1px dashed rgba(15,41,66,0.08)',
                          }}
                        />
                      ))}

                      {/* Bars + bar-anchored bubble */}
                      <div
                        className="absolute left-0 right-0 flex gap-1"
                        style={{ bottom: XLABEL_H, height: CHART_H }}
                      >
                        {allTerms.map((term) => {
                          const barH = yMax > 0 ? Math.round((term.totalCost / yMax) * CHART_H) : 0;
                          const prinH = term.totalCost > 0 ? Math.round((results.loanAmount / term.totalCost) * barH) : Math.round(barH / 2);
                          const intH = barH - prinH;
                          return (
                            <div key={term.years} className="flex-1 flex justify-center items-end">
                              <div style={{ position: 'relative', width: '58%', minWidth: 8 }}>
                                <div
                                  className="flex flex-col overflow-hidden"
                                  style={{ height: barH, width: '100%', borderRadius: '4px 4px 0 0' }}
                                >
                                  <div style={{ height: intH, background: '#F59E0B', flexShrink: 0 }} />
                                  <div style={{ height: prinH, background: '#1DB584', flexShrink: 0 }} />
                                </div>
                                {term.isCurrent && (
                                  <>
                                    <div style={{
                                      position: 'absolute', top: -7, left: -7, right: -7, bottom: 0,
                                      borderTop: '2px solid #1DB584', borderLeft: '2px solid #1DB584', borderRight: '2px solid #1DB584',
                                      borderRadius: '11px 11px 0 0',
                                      boxShadow: '0 0 14px rgba(29,181,132,0.20)',
                                      pointerEvents: 'none',
                                    }} />
                                    <div style={{
                                      position: 'absolute',
                                      bottom: barH + 12,
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      zIndex: 10,
                                    }}>
                                      <div
                                        className="relative rounded-xl px-3 py-2 text-center"
                                        style={{
                                          background: '#fff',
                                          boxShadow: '0 3px 14px rgba(0,0,0,0.12)',
                                          border: '1.5px solid rgba(29,181,132,0.30)',
                                          maxWidth: 96, minWidth: 68,
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        <p style={{ fontSize: '9px', fontWeight: 700, color: '#6B7A8D', marginBottom: 3 }}>Interest</p>
                                        <p style={{ fontSize: '15px', fontWeight: 800, color: '#F59E0B', lineHeight: 1 }}>{fmt(safe(term.totalInterest))}</p>
                                        <div className="absolute" style={{ bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(29,181,132,0.28)' }} />
                                        <div className="absolute" style={{ bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #fff' }} />
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* X-axis labels */}
                      <div
                        className="absolute left-0 right-0 bottom-0 flex gap-1"
                        style={{ height: XLABEL_H }}
                      >
                        {allTerms.map((term) => (
                          <div key={term.years} className="flex-1 flex justify-center items-center">
                            {term.isCurrent ? (
                              <span
                                className="rounded-full"
                                style={{ background: '#1DB584', color: '#fff', fontSize: '9px', fontWeight: 700, lineHeight: 1, display: 'inline-block', padding: '4px 10px' }}
                              >
                                {term.years} yr
                              </span>
                            ) : (
                              <span style={{ fontSize: '9px', color: '#9BA8B5' }}>{term.years} yr</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

          </div>
        </div>

      </div>{/* end Block C */}

      {/* ══ Block D: AI Analysis — always visible ════════════════════════════ */}
      <div
        id="ai-analysis"
        className="overflow-hidden"
        style={{ ...cardStyle, padding: 0, scrollMarginTop: '80px' }}
      >

        {/* Dark header */}
        <div
          className="px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,181,132,0.18)' }}
            >
              <Sparkles className="w-4 h-4" style={{ color: '#1DB584' }} aria-hidden />
            </span>
            <p className="text-white text-lg md:text-xl font-bold tracking-tight">
              FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Loan Analysis
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={!results || pdfLoading}
              className="inline-flex items-center gap-1.5 select-none"
              style={{ background: '#1DB584', color: '#ffffff', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700, opacity: (!results || pdfLoading) ? 0.6 : 1, cursor: (!results || pdfLoading) ? 'not-allowed' : 'pointer' }}>
              <Download className="w-3.5 h-3.5 shrink-0" aria-hidden />
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

        {/* Dashboard body */}
        <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

          {/* Empty state */}
          {!results && (
            <div
              className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}
            >
              <Sparkles className="w-5 h-5" style={{ color: '#1DB584' }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                Enter your loan details above to get AI loan insights.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 340 }}>
                The analysis will show your Loan Cost Score, rate competitiveness, and your best path to reducing total interest.
              </p>
            </div>
          )}

          {/* Active state */}
          {results && (
            <>
              {/* ── Row 1: White score card + Dark KPI card ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Left — 2-part Loan Analysis card */}
                <div
                  className="rounded-2xl p-4 flex flex-col"
                  style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold text-slate-800">Loan Analysis</span>
                  </div>

                  {/* Two halves */}
                  <div className="flex-1 flex flex-col sm:flex-row">

                    {/* ── Left half: Borrowing Cost Score ── */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0 pb-3 sm:pb-0 sm:pr-3">
                      <div className="flex items-center w-full mb-2">
                        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Borrowing Cost</p>
                        <span
                          className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                          style={{ fontSize: '10px', fontWeight: 700, background: results.statusBg, color: results.statusColor }}
                        >
                          {results.statusLabel}
                        </span>
                      </div>
                      {(() => {
                        const GR = 48;
                        const GC = 2 * Math.PI * GR;
                        const GARC = (240 / 360) * GC;
                        const GFIL = GARC * (results.loanScore / 100);
                        return (
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none"
                                stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`}
                                transform="rotate(150, 66, 66)"
                              />
                              <circle cx="66" cy="66" r={GR} fill="none"
                                stroke={results.statusColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`}
                                transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }}
                              />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>{results.loanScore}</span>
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>/ 100</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: results.statusColor }}>{results.scoreLabel}</span>
                            </div>
                          </div>
                        );
                      })()}
                      <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                        {results.statusLabel === 'Healthy'
                          ? `${results.annualRate}% rate is competitive — total interest is manageable.`
                          : results.statusLabel === 'Watch'
                            ? `${results.annualRate}% is above average. Comparing lenders could reduce your cost.`
                            : `At ${results.annualRate}%, interest cost is high. Shop 2–3 lenders before signing.`
                        }
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="hidden sm:block self-stretch w-px mx-1" style={{ background: 'rgba(15,41,66,0.08)' }} />
                    <div className="block sm:hidden h-px w-full mb-3" style={{ background: 'rgba(15,41,66,0.08)' }} />

                    {/* ── Right half: Affordability ── */}
                    {(() => {
                      const dti = results.dtiPct;
                      const affordColor = dti === null ? '#94a3b8' : dti <= 15 ? '#1DB584' : dti <= 20 ? '#f59e0b' : '#ef4444';
                      const affordBg = dti === null ? 'rgba(148,163,184,0.10)' : dti <= 15 ? 'rgba(29,181,132,0.10)' : dti <= 20 ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';
                      const aScoreLabel = dti === null ? '—' : dti <= 15 ? 'Manageable' : dti <= 20 ? 'Moderate' : 'High';
                      const aBadge = dti === null ? 'No Income' : dti <= 15 ? 'Affordable' : dti <= 20 ? 'Watch' : 'High Burden';
                      const affordPct = dti !== null ? Math.min(100, dti * 3.33) : 0;
                      const GR = 48;
                      const GC = 2 * Math.PI * GR;
                      const GARC = (240 / 360) * GC;
                      const GFIL = GARC * (affordPct / 100);
                      return (
                        <div className="flex-1 flex flex-col items-center text-center min-w-0 pt-0 sm:pl-3">
                          <div className="flex items-center w-full mb-2">
                            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Affordability</p>
                            <span
                              className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                              style={{ fontSize: '10px', fontWeight: 700, background: affordBg, color: affordColor }}
                            >
                              {aBadge}
                            </span>
                          </div>
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none"
                                stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`}
                                transform="rotate(150, 66, 66)"
                              />
                              <circle cx="66" cy="66" r={GR} fill="none"
                                stroke={affordColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`}
                                transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }}
                              />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              {dti !== null ? (
                                <>
                                  <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>
                                    {Math.round(dti)}<span style={{ fontSize: '1rem' }}>%</span>
                                  </span>
                                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>of income</span>
                                </>
                              ) : (
                                <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>—</span>
                              )}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: affordColor }}>{aScoreLabel}</span>
                            </div>
                          </div>
                          <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                            {dti !== null
                              ? `Payment is ${Math.round(dti)}% of gross monthly income. ${dti <= 15 ? 'Well within comfortable range.' : dti <= 20 ? 'Manageable but leaves less buffer.' : 'Consider a smaller loan or longer term.'}`
                              : 'Enter your income above to see how this payment fits your budget.'
                            }
                          </p>
                        </div>
                      );
                    })()}

                  </div>
                </div>

                {/* Right — Smart Optimization Found */}
                <div
                  className="rounded-2xl p-3 flex flex-col"
                  style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold" style={{ color: '#1DB584' }}>
                      {results.shorterTermOpt && results.shorterTermOpt.interestSaved <= 0 ? 'No Interest Savings' : 'Smart Optimization Found'}
                    </span>
                  </div>

                  {results.shorterTermOpt && results.shorterTermOpt.interestSaved > 0 ? (
                    <>
                      {/* Mobile */}
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(safe(results.shorterTermOpt.interestSaved))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">estimated interest saved</p>
                          <p className="text-slate-400 text-xs mt-0.5">by choosing the shorter term</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                              {results.loanTermYears}yr → {results.shorterTermOpt.years}yr
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Suggested change</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                              +{fmtx(safe(results.shorterTermOpt.paymentDiff))}<span className="text-slate-400 font-normal text-xs">/mo</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Monthly impact</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Choosing a shorter term may reduce total interest while increasing your monthly payment.
                        </p>
                      </div>

                      {/* Desktop */}
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmt(safe(results.shorterTermOpt.interestSaved))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                              {results.loanTermYears}yr → {results.shorterTermOpt.years}yr
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Suggested change</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                              +{fmtx(safe(results.shorterTermOpt.paymentDiff))}<span className="text-slate-400 font-normal text-sm">/mo</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Monthly impact</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">estimated interest saved</p>
                          <p className="text-slate-400 text-xs mt-0.5">by choosing the shorter term</p>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Choosing a shorter term may reduce total interest while increasing your monthly payment.
                        </p>
                      </div>
                    </>
                  ) : results.shorterTermOpt ? (
                    <>
                      {/* 0%-rate — Mobile */}
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">no interest to save</p>
                          <p className="text-slate-400 text-xs mt-0.5">a shorter term won&apos;t reduce interest at a 0% rate</p>
                        </div>
                      </div>

                      {/* 0%-rate — Desktop */}
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                            {fmt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">no interest to save</p>
                          <p className="text-slate-400 text-xs mt-0.5">a shorter term won&apos;t reduce interest at a 0% rate</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 1yr — Mobile */}
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            1yr
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">shortest term selected</p>
                          <p className="text-slate-400 text-xs mt-0.5">already minimized — no shorter term available</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                              {fmt(safe(results.totalInterest))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Activity className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Total interest</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                              {fmtx(safe(results.costPer1000))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Cost per {currencyPrefix}1k</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 1yr — Desktop */}
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                              1yr
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                              {fmt(safe(results.totalInterest))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Activity className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Total interest</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                              {fmtx(safe(results.costPer1000))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Cost per {currencyPrefix}1k</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">shortest term selected</p>
                          <p className="text-slate-400 text-xs mt-0.5">already minimized — no shorter term available</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Card 1 — Rate Check */}
                {(() => {
                  const r = results.annualRate;
                  const isHighCA = r > 15;
                  const isHighUS = r > 15;
                  const isHigh = isCA ? isHighCA : isHighUS;
                  const isBorderline = isCA ? (r > 12 && r <= 15) : (r > 12 && r <= 15);
                  const borderColor = isHigh ? '#fecaca' : isBorderline ? '#fde68a' : '#bbf7d0';
                  const bgColor = isHigh ? '#fff5f5' : isBorderline ? '#fffbeb' : '#f0fdf4';
                  const labelColor = isHigh ? 'text-red-500' : isBorderline ? 'text-amber-600' : 'text-emerald-600';
                  const iconColor = isHigh ? 'text-red-500' : isBorderline ? 'text-amber-500' : 'text-emerald-600';
                  const iconBg = isHigh ? '#fee2e2' : isBorderline ? '#fef3c7' : '#dcfce7';
                  const rangeText = isCA
                    ? 'Prime-based personal loans in Canada typically range 8–20% APR.'
                    : 'Personal loan rates in the USA typically range 7–25% APR.';
                  const positionText = isHigh
                    ? `Your rate of ${r}% is above the typical midpoint. Comparing 2–3 lenders before signing is worth the effort.`
                    : isBorderline
                      ? `Your rate of ${r}% is slightly above average. A small reduction could save you ${fmt(safe((r - 11) / 100 / 12 * results.loanTermYears * 12 * results.loanAmount * 0.5))}.`
                      : `Your rate of ${r}% is competitive. You're within the typical range for good-credit borrowers.`;
                  return (
                    <div className="rounded-2xl p-4" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center justify-center shrink-0"
                          style={{ width: 28, height: 28, borderRadius: 8, background: iconBg }}>
                          <Zap className={`w-3.5 h-3.5 ${iconColor}`} aria-hidden />
                        </span>
                        <p className={`text-xs font-bold uppercase tracking-widest ${labelColor}`}>Rate Check</p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {rangeText} {positionText}
                      </p>
                    </div>
                  );
                })()}

                {/* Card 2 — Term Optimization */}
                <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Term Optimization</p>
                  </div>
                  {results.shorterTermOpt ? (
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Choosing a <strong className="text-sky-700">{results.shorterTermOpt.years}-year term</strong> costs{' '}
                      <strong className="text-sky-700">{fmtx(safe(results.shorterTermOpt.paymentDiff))}/month</strong> more
                      but saves{' '}
                      <strong className="text-sky-700">{fmt(safe(results.shorterTermOpt.interestSaved))}</strong>{' '}
                      in total interest over the life of the loan.
                    </p>
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed">
                      You&apos;ve selected the shortest available term — interest cost is already minimised for this loan amount and rate.
                    </p>
                  )}
                </div>

                {/* Card 3 — Affordability Impact */}
                {(() => {
                  const dti = results.dtiPct;
                  const hasIncome = dti !== null;
                  const isHighDTI = hasIncome && dti > 20;
                  const isMidDTI = hasIncome && dti > 15 && dti <= 20;
                  const borderColor = isHighDTI ? '#fecaca' : isMidDTI ? '#fde68a' : '#bbf7d0';
                  const bgColor = isHighDTI ? '#fef2f2' : isMidDTI ? '#fffbeb' : '#f0fdf4';
                  const labelColor = isHighDTI ? 'text-red-600' : isMidDTI ? 'text-amber-600' : 'text-emerald-600';
                  const iconBg = isHighDTI ? '#fee2e2' : isMidDTI ? '#fef3c7' : '#dcfce7';
                  const iconColor = isHighDTI ? 'text-red-500' : isMidDTI ? 'text-amber-500' : 'text-emerald-600';
                  const dtiCopy = !hasIncome
                    ? 'Add your annual income above to see how this payment fits your monthly budget and unlock your full affordability score.'
                    : isHighDTI
                      ? `This payment is ${dti.toFixed(1)}% of your gross monthly income — above the 20% comfort guideline. Consider a smaller loan amount or longer term to reduce the burden.`
                      : isMidDTI
                        ? `This payment is ${dti.toFixed(1)}% of your gross monthly income — slightly above the 15% guideline. Manageable, but worth keeping in mind alongside other debts.`
                        : `This payment is ${dti.toFixed(1)}% of your gross monthly income — well within the 15% guideline. A comfortable borrowing level relative to your income.`;
                  return (
                    <div className="rounded-2xl p-4" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center justify-center shrink-0"
                          style={{ width: 28, height: 28, borderRadius: 8, background: iconBg }}>
                          <AlertTriangle className={`w-3.5 h-3.5 ${iconColor}`} aria-hidden />
                        </span>
                        <p className={`text-xs font-bold uppercase tracking-widest ${labelColor}`}>Affordability</p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{dtiCopy}</p>
                    </div>
                  );
                })()}

              </div>
            </>
          )}

        </div>{/* end dashboard body */}

        {/* Inner disclaimer */}
        <div
          className="flex items-start gap-2.5 px-5 md:px-6 py-4"
          style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}
        >
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
          <p className="text-slate-400 text-xs leading-relaxed">
            <strong className="text-slate-500 font-semibold">Disclaimer:</strong>{' '}
            This analysis is for illustrative purposes only and does not constitute financial, tax, or investment advice.
            Results assume a fixed interest rate and do not include origination fees, insurance, or other lender charges.
            Consult a licensed financial advisor before making financial decisions.
          </p>
        </div>

      </div>{/* end Block D */}

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

      {/* ══ Disclaimer ───────────────────────────────────────────────────── */}
      <p className="text-xs text-slate-400 text-center mt-4 pb-12 px-4 leading-relaxed max-w-4xl mx-auto">
        This calculator is for illustrative and informational purposes only. Results are estimates and
        may not reflect actual lender terms, fees, credit profile, approval requirements, or repayment
        conditions. This does not constitute financial, tax, or legal advice. Consult a licensed
        financial advisor or qualified professional before making financial decisions.
      </p>

    </div>
  );
}
