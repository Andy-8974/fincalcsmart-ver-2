'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip } from '../_mortgage-shared/ui';
import { fmtCAD, fmtCADx, fmtUSD, fmtUSDx } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  Activity, AlertTriangle, BookOpen, Download,
  HelpCircle, Mail, ShieldAlert, Sparkles, Target, TrendingUp, Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type FreqKey = 'annually' | 'semi' | 'monthly' | 'daily';

interface FormState {
  currentSavings: string;
  monthlyContribution: string;
  annualRate: string;
  retirementGoal: string;
  currentAge: string;
  retirementAge: string;
}

interface RetirementResults {
  currentSavings: number;
  monthlyContribution: number;
  annualRate: number;
  currentAge: number;
  retirementAge: number;
  retirementGoal: number;
  freq: FreqKey;
  yearsToRetirement: number;
  monthsToRetirement: number;
  effectiveMonthlyRate: number;
  projectedSavings: number;
  totalContributions: number;
  investmentGrowth: number;
  growthPct: number;
  hasGoal: boolean;
  goalProgressPct: number;
  gapOrSurplus: number;       // positive = gap (behind), negative = surplus
  requiredMonthly: number;
  additionalMonthlyNeeded: number;
  statusLabel: 'On Track' | 'Nearly There' | 'Behind Target' | 'Significantly Behind' | 'No Goal';
  smartActionText: string;
  readinessScore: number;
  readinessLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  readinessStatus: 'Healthy' | 'Watch' | 'Caution';
  readinessColor: string;
  readinessBg: string;
  goalGaugeColor: string;
  goalGaugeBg: string;
  leverState: 'behind' | 'on-track' | 'no-goal';
  valAt10yr: number;
  valAt20yr: number;
  valIfDelayed5yr: number;
}

interface ChartSample {
  age: number;
  savingsGrowth: number;
  contribBase: number;
  totalFV: number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  currentSavings:      '25000',
  monthlyContribution: '500',
  annualRate:          '6',
  retirementGoal:      '1000000',
  currentAge:          '35',
  retirementAge:       '65',
};

const DEFAULT_FREQ: FreqKey = 'monthly';

const FREQ_OPTIONS: { key: FreqKey; label: string; periods: number }[] = [
  { key: 'annually', label: 'Annually',  periods: 1   },
  { key: 'semi',     label: 'Semi-Ann.', periods: 2   },
  { key: 'monthly',  label: 'Monthly',   periods: 12  },
  { key: 'daily',    label: 'Daily',     periods: 365 },
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
  const growth = Math.pow(1 + r, months);
  if (!Number.isFinite(growth)) return Math.max(0, principal + monthly * months);
  return Math.max(0, principal * growth + monthly * (growth - 1) / r);
}

function computeChartSamples(
  currentAge: number, retirementAge: number,
  currentSavings: number, monthlyContribution: number,
  r: number,
): ChartSample[] {
  const years = retirementAge - currentAge;
  if (years <= 0) return [];
  const step = years <= 10 ? Math.max(1, Math.ceil(years / 5)) : years <= 20 ? 4 : 5;
  const ageSet = new Set<number>([currentAge]);
  for (let a = currentAge + step; a < retirementAge; a += step) ageSet.add(a);
  ageSet.add(retirementAge);
  const ages = Array.from(ageSet).sort((a, b) => a - b).slice(0, 9);
  return ages.map(age => {
    const months = (age - currentAge) * 12;
    const gf = Math.abs(r) > 1e-10 ? Math.pow(1 + r, months) : 1;
    const sg = Number.isFinite(gf) ? safe(currentSavings * gf) : currentSavings;
    const cb = safe(monthlyContribution * months);
    const fv = safe(calcFVRate(r, months, currentSavings, monthlyContribution));
    return { age, savingsGrowth: sg, contribBase: cb, totalFV: fv };
  });
}

// ─── Core compute ─────────────────────────────────────────────────────────────

function computeResults(form: FormState, freq: FreqKey): RetirementResults | null {
  const currentSavings      = Math.max(0, parseFloat(form.currentSavings)      || 0);
  const monthlyContribution = Math.max(0, parseFloat(form.monthlyContribution) || 0);
  const annualRate          = Math.max(0, Math.min(49.9, parseFloat(form.annualRate) || 0));
  const retirementGoal      = Math.max(0, parseFloat(form.retirementGoal)      || 0);
  const rawCurr = parseInt(form.currentAge)    || 35;
  const rawRet  = parseInt(form.retirementAge) || 65;
  const currentAge    = Math.max(18, Math.min(99, rawCurr));
  const retirementAge = Math.max(currentAge + 1, Math.min(100, rawRet));

  if (currentSavings <= 0 && monthlyContribution <= 0) return null;

  const yearsToRetirement  = retirementAge - currentAge;
  const monthsToRetirement = yearsToRetirement * 12;
  const periods = FREQ_OPTIONS.find(f => f.key === freq)!.periods;
  const r = getEffectiveMonthlyRate(annualRate, periods);

  const projectedSavings   = safe(calcFVRate(r, monthsToRetirement, currentSavings, monthlyContribution));
  const totalContributions = Math.max(0, currentSavings + monthlyContribution * monthsToRetirement);
  const investmentGrowth   = Math.max(0, projectedSavings - totalContributions);
  const growthPct          = totalContributions > 0 ? (investmentGrowth / totalContributions) * 100 : 0;

  const hasGoal        = retirementGoal > 0;
  const goalProgressPct = hasGoal ? Math.min(200, (projectedSavings / retirementGoal) * 100) : 0;
  const gapOrSurplus   = hasGoal ? retirementGoal - projectedSavings : 0;

  // PMT reverse-solve
  let requiredMonthly = 0;
  let additionalMonthlyNeeded = 0;
  if (hasGoal && projectedSavings < retirementGoal && monthsToRetirement > 0) {
    if (Math.abs(r) > 1e-10) {
      const gf = Math.pow(1 + r, monthsToRetirement);
      const af = Number.isFinite(gf) ? (gf - 1) / r : monthsToRetirement;
      const pv = Number.isFinite(gf) ? currentSavings * gf : currentSavings;
      requiredMonthly = af > 0 ? Math.max(0, (retirementGoal - pv) / af) : 0;
    } else {
      requiredMonthly = Math.max(0, (retirementGoal - currentSavings) / monthsToRetirement);
    }
    if (!Number.isFinite(requiredMonthly)) requiredMonthly = 0;
    additionalMonthlyNeeded = Math.max(0, requiredMonthly - monthlyContribution);
  }

  // Status label
  const statusLabel: RetirementResults['statusLabel'] =
    !hasGoal             ? 'No Goal' :
    goalProgressPct >= 100 ? 'On Track' :
    goalProgressPct >= 75  ? 'Nearly There' :
    goalProgressPct >= 50  ? 'Behind Target' :
    'Significantly Behind';

  const smartActionText =
    !hasGoal       ? 'Enter a retirement goal above to see your action plan.' :
    gapOrSurplus <= 0 ? `On track — projected surplus.` :
    `Add more monthly savings to reach your goal.`;

  // Readiness score
  let score = 0;
  if (hasGoal) {
    score += Math.min(70, goalProgressPct * 0.7);
    score += yearsToRetirement >= 20 ? 15 : yearsToRetirement >= 10 ? 8 : yearsToRetirement >= 5 ? 3 : 0;
    score += gapOrSurplus <= 0 ? 15 : additionalMonthlyNeeded < monthlyContribution * 0.5 ? 8 : 0;
  } else {
    score += Math.min(60, growthPct * 0.8);
    score += yearsToRetirement >= 20 ? 15 : yearsToRetirement >= 10 ? 8 : 0;
  }
  const readinessScore = Math.round(Math.min(100, Math.max(0, score)));
  const readinessLabel: RetirementResults['readinessLabel'] =
    readinessScore >= 80 ? 'Excellent' : readinessScore >= 65 ? 'Good' : readinessScore >= 45 ? 'Fair' : 'Poor';
  const readinessStatus: RetirementResults['readinessStatus'] =
    readinessLabel === 'Poor' ? 'Caution' : readinessLabel === 'Fair' ? 'Watch' : 'Healthy';
  const readinessColor = readinessStatus === 'Healthy' ? '#1DB584' : readinessStatus === 'Watch' ? '#f59e0b' : '#ef4444';
  const readinessBg    = readinessStatus === 'Healthy' ? 'rgba(29,181,132,0.10)' : readinessStatus === 'Watch' ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

  const goalGaugeColor =
    !hasGoal ? '#94a3b8' :
    statusLabel === 'On Track' || statusLabel === 'Nearly There' ? '#1DB584' :
    statusLabel === 'Behind Target' ? '#f59e0b' : '#ef4444';
  const goalGaugeBg =
    !hasGoal ? 'rgba(148,163,184,0.10)' :
    statusLabel === 'On Track' || statusLabel === 'Nearly There' ? 'rgba(29,181,132,0.10)' :
    statusLabel === 'Behind Target' ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

  const leverState: RetirementResults['leverState'] =
    !hasGoal ? 'no-goal' : gapOrSurplus <= 0 ? 'on-track' : 'behind';

  // Milestones
  const valAt10yr = safe(calcFVRate(r, Math.min(120, monthsToRetirement), currentSavings, monthlyContribution));
  const valAt20yr = safe(calcFVRate(r, Math.min(240, monthsToRetirement), currentSavings, monthlyContribution));
  const valIfDelayed5yr = yearsToRetirement > 5
    ? safe(calcFVRate(r, (yearsToRetirement - 5) * 12, currentSavings, monthlyContribution))
    : currentSavings;

  return {
    currentSavings, monthlyContribution, annualRate, currentAge, retirementAge, retirementGoal,
    freq, yearsToRetirement, monthsToRetirement, effectiveMonthlyRate: r,
    projectedSavings, totalContributions, investmentGrowth, growthPct,
    hasGoal, goalProgressPct, gapOrSurplus, requiredMonthly, additionalMonthlyNeeded,
    statusLabel, smartActionText, readinessScore, readinessLabel, readinessStatus,
    readinessColor, readinessBg, goalGaugeColor, goalGaugeBg, leverState,
    valAt10yr, valAt20yr, valIfDelayed5yr,
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

interface RetirementSavingsCalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RetirementSavingsCalculator({
  formulaContent,
  faqItems = [],
}: RetirementSavingsCalculatorProps) {
  const { region } = useRegion();
  const [form, setForm]   = useState<FormState>(DEFAULTS);
  const [freq, setFreq]   = useState<FreqKey>(DEFAULT_FREQ);
  const [aiCtaHovered, setAiCtaHovered]   = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError]           = useState<string | null>(null);

  const isCA = region === 'ca';
  const currencyPrefix = isCA ? 'CA$' : '$';
  const fmt  = isCA ? fmtCAD  : fmtUSD;
  const fmtx = isCA ? fmtCADx : fmtUSDx;

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const results = useMemo(() => computeResults(form, freq), [form, freq]);

  async function handleDownloadPDF() {
    if (!results || pdfGenerating) return;
    setPdfGenerating(true);
    setPdfError(null);
    try {
      const { buildRetirementPDF } = await import('@/lib/pdf/adapters/retirementAdapter');
      await buildRetirementPDF(results, region, fmt, fmtx);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setPdfError('PDF generation failed. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  }

  function scrollToAI() {
    const el = document.getElementById('ai-analysis');
    if (!el) return;
    const navH = (document.querySelector('header') as HTMLElement | null)?.getBoundingClientRect().height ?? 64;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - 16), behavior: 'smooth' });
  }

  // Short format for chart labels
  function fmtShort(n: number): string {
    const p = isCA ? 'CA$' : '$';
    if (n >= 1_000_000) return `${p}${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${p}${Math.round(n / 1_000)}k`;
    return `${p}${Math.round(n)}`;
  }

  return (
    <div className="flex flex-col gap-y-7 md:gap-y-8 min-w-0">

      <style>{`
        @keyframes teal-glow-rsc {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-rsc {
          animation: teal-glow-rsc 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-rsc:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
        .rsc-pill { flex: 1; min-width: calc(50% - 4px); text-align: center; }
        @media (min-width: 480px) { .rsc-pill { min-width: 0; } }
        .rsc-pills { display: flex; flex-wrap: wrap; gap: 6px; }
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
                <Target size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Canada &amp; USA · Retirement
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Retirement Details</p>
              </div>
            </div>

            {/* 2-col grid: [Savings / Return / Current Age] | [Monthly / Goal / Retirement Age] */}
            <div className="grid grid-cols-2 gap-x-3 md:gap-x-5 mb-3">

              {/* Left column */}
              <div className="space-y-3 min-w-0">
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Current Retirement Savings
                    <Tooltip text="Your existing retirement savings balance today. This is your starting point for the growth projection." />
                  </label>
                  <NumericInput
                    value={form.currentSavings}
                    onChange={v => set('currentSavings', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Expected Annual Return
                    <Tooltip text="Assumed annual growth rate for this illustration. Actual investment returns vary and are not guaranteed." />
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
                    Current Age
                    <Tooltip text="Your age today. Used to calculate years remaining until retirement." />
                  </label>
                  <NumericInput
                    value={form.currentAge}
                    onChange={v => set('currentAge', v)}
                    inputClassName={inputClsCompact}
                    placeholder="e.g. 35"
                  />
                </div>
              </div>

              {/* Right column */}
              <div className="border-l pl-2 md:pl-5 space-y-3 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Monthly Contribution
                    <Tooltip text="The amount you add to your retirement savings each month, ongoing." />
                  </label>
                  <NumericInput
                    value={form.monthlyContribution}
                    onChange={v => set('monthlyContribution', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Retirement Goal
                    <Tooltip text="Your target nest egg at retirement. The calculator shows how close your current plan gets you and the extra monthly savings needed if you're behind." />
                  </label>
                  <NumericInput
                    value={form.retirementGoal}
                    onChange={v => set('retirementGoal', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Retirement Age
                    <Tooltip text="The age at which you plan to retire. Must be greater than your current age." />
                  </label>
                  <NumericInput
                    value={form.retirementAge}
                    onChange={v => set('retirementAge', v)}
                    inputClassName={inputClsCompact}
                    placeholder="e.g. 65"
                  />
                </div>
              </div>
            </div>

            {/* Years to retirement derived display */}
            {results && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-px flex-1" style={{ background: 'rgba(15,41,66,0.06)' }} />
                <span className="text-[11px] font-semibold" style={{ color: '#1DB584', whiteSpace: 'nowrap' }}>
                  {results.yearsToRetirement} year{results.yearsToRetirement !== 1 ? 's' : ''} to retirement
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
              <div className="rsc-pills">
                {FREQ_OPTIONS.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    className="rsc-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
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
                  Enter your retirement savings details to see your projection.
                </p>
              </div>
            )}

            {results && (
              <div className="flex flex-col flex-1 gap-4">

                <div
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(29,181,132,0.18)' }}
                >
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(29,181,132,0.7)' }}>
                    Projected Retirement Savings
                  </p>
                  <p style={{ color: '#1DB584', fontSize: '36px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 6 }}>
                    {fmt(safe(results.projectedSavings))}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', marginTop: 4, fontWeight: 500 }}>
                    by age {results.retirementAge} · {results.yearsToRetirement} yr projection
                  </p>
                </div>

                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Estimated Investment Growth</span>
                    <span className="text-[13px] font-semibold text-white">{fmt(safe(results.investmentGrowth))}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">Total Contributions</span>
                    <span className="text-[13px] font-bold text-white">{fmt(safe(results.totalContributions))}</span>
                  </div>
                  {results.hasGoal && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>
                        {results.gapOrSurplus > 0 ? 'Goal Gap' : 'Goal Surplus'}
                      </span>
                      <span className="text-[13px] font-semibold" style={{ color: results.gapOrSurplus > 0 ? '#f59e0b' : '#1DB584' }}>
                        {results.gapOrSurplus > 0 ? `-${fmt(safe(results.gapOrSurplus))}` : `+${fmt(safe(-results.gapOrSurplus))}`}
                      </span>
                    </div>
                  )}
                  {results.hasGoal && results.leverState === 'behind' && results.additionalMonthlyNeeded > 0 && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[13px]" style={{ color: '#fbbf24' }}>Additional Monthly Needed</span>
                      <span className="text-[13px] font-semibold" style={{ color: '#fbbf24' }}>
                        +{fmtx(safe(results.additionalMonthlyNeeded))}/mo
                      </span>
                    </div>
                  )}
                  {!results.hasGoal && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Growth Share</span>
                      <span className="text-[13px] font-semibold text-white">{results.growthPct.toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                {results.hasGoal && (
                  <div
                    className="flex items-center justify-between rounded-xl py-2 px-3"
                    style={
                      results.statusLabel === 'On Track' || results.statusLabel === 'Nearly There'
                        ? { background: 'rgba(29,181,132,0.12)', border: '1px solid rgba(29,181,132,0.25)' }
                        : results.statusLabel === 'Behind Target'
                          ? { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.30)' }
                          : { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)' }
                    }
                  >
                    <span style={{
                      fontSize: '12px', fontWeight: 700,
                      color: results.statusLabel === 'On Track' || results.statusLabel === 'Nearly There'
                        ? '#1DB584' : results.statusLabel === 'Behind Target' ? '#f59e0b' : '#ef4444',
                    }}>
                      {results.statusLabel === 'Behind Target' || results.statusLabel === 'Significantly Behind' ? '⚠ ' : ''}
                      {results.statusLabel} · {Math.min(200, Math.round(results.goalProgressPct))}% of goal
                    </span>
                  </div>
                )}

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See your full Retirement Readiness Insight below.
                  </p>
                  <button
                    className="btn-ai-cta-rsc w-full font-bold overflow-hidden"
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
                      View Retirement Readiness Insight ↓
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
                      See Full Readiness Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* ══ Block C: Growth Journey (7) + Goal Progress (5) ══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

        {/* ── Left: Retirement Growth Journey ───────────────────────────── */}
        <div className="lg:col-span-7" style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Growth over time
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Retirement Growth Journey</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter your details to see your growth journey.
                </p>
              </div>
            )}

            {results && (() => {
              const samples = computeChartSamples(
                results.currentAge, results.retirementAge,
                results.currentSavings, results.monthlyContribution,
                results.effectiveMonthlyRate,
              );
              if (samples.length < 2) return null;

              const n = samples.length;
              const maxRaw = Math.max(...samples.map(s => s.totalFV), results.hasGoal ? results.retirementGoal : 0);
              const maxVal = maxRaw > 0 ? maxRaw * 1.1 : 10000;

              const CW = 500, CH = 160, PAD_T = 12, PAD_L = 2, PAD_R = 2;
              const plotW = CW - PAD_L - PAD_R;
              const plotH = CH - PAD_T;

              const xOf = (i: number) => PAD_L + (i / (n - 1)) * plotW;
              const yOf = (v: number) => PAD_T + plotH * (1 - Math.min(1, v / maxVal));

              function polyPts(topVals: number[], botVals: number[]): string {
                const fwd = samples.map((_, i) => `${xOf(i).toFixed(1)},${yOf(topVals[i]).toFixed(1)}`).join(' ');
                const rev = samples.map((_, i) => {
                  const ri = n - 1 - i;
                  return `${xOf(ri).toFixed(1)},${yOf(botVals[ri]).toFixed(1)}`;
                }).join(' ');
                return `${fwd} ${rev}`;
              }

              const v0 = samples.map(() => 0);
              const v1 = samples.map(s => s.savingsGrowth);
              const v2 = samples.map(s => s.savingsGrowth + s.contribBase);
              const v3 = samples.map(s => s.totalFV);

              const goalY = results.hasGoal && results.retirementGoal > 0 && results.retirementGoal <= maxVal
                ? yOf(results.retirementGoal) : null;

              // X-axis labels: always show first and last; add midpoint if ≥ 3 samples
              const labelIs: number[] = n >= 3 ? [0, Math.round((n - 1) / 2), n - 1] : [0, n - 1];

              return (
                <div className="flex-1 flex flex-col min-w-0">
                  <div style={{ position: 'relative' }}>
                    <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden>
                      <defs>
                        <linearGradient id="rsc-g3" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1DB584" stopOpacity="0.75" />
                          <stop offset="100%" stopColor="#0c6e4f" stopOpacity="0.45" />
                        </linearGradient>
                      </defs>
                      {/* Band 1: existing savings growth — soft teal */}
                      <polygon points={polyPts(v1, v0)} fill="rgba(29,181,132,0.18)" />
                      {/* Band 2: contribution principal — slate */}
                      <polygon points={polyPts(v2, v1)} fill="rgba(100,116,139,0.18)" />
                      {/* Band 3: investment growth — gradient teal */}
                      <polygon points={polyPts(v3, v2)} fill="url(#rsc-g3)" />
                      {/* Top outline */}
                      <polyline
                        points={samples.map((_, i) => `${xOf(i).toFixed(1)},${yOf(v3[i]).toFixed(1)}`).join(' ')}
                        fill="none" stroke="#1DB584" strokeWidth="1.5" strokeLinejoin="round"
                      />
                      {/* Goal line */}
                      {goalY !== null && (
                        <>
                          <line x1={PAD_L} y1={goalY.toFixed(1)} x2={CW - PAD_R} y2={goalY.toFixed(1)}
                            stroke="#F97316" strokeWidth="1.5" strokeDasharray="5 4" />
                          <rect
                            x={CW - PAD_R - 38} y={(goalY - 12).toFixed(1)}
                            width="36" height="13" rx="3"
                            fill="#F97316"
                          />
                          <text
                            x={CW - PAD_R - 20} y={(goalY - 3).toFixed(1)}
                            textAnchor="middle" fill="white" fontSize="9" fontWeight="700"
                          >
                            Goal
                          </text>
                        </>
                      )}
                      {/* Retirement age callout dot */}
                      <circle
                        cx={xOf(n - 1).toFixed(1)} cy={yOf(v3[n - 1]).toFixed(1)}
                        r="4" fill="#1DB584" stroke="white" strokeWidth="1.5"
                      />
                      {/* Projected value label above dot */}
                      <text
                        x={xOf(n - 1).toFixed(1)} y={(yOf(v3[n - 1]) - 9).toFixed(1)}
                        textAnchor="end" fill="#0D1B2A" fontSize="10" fontWeight="700"
                      >
                        {fmtShort(v3[n - 1])}
                      </text>
                    </svg>

                    {/* X-axis labels as HTML (scale-responsive) */}
                    <div style={{ position: 'relative', height: 18, marginTop: 2 }}>
                      {labelIs.map((sampleIdx, labelIdx) => {
                        const isFirst = labelIdx === 0;
                        const isLast  = labelIdx === labelIs.length - 1;
                        const xPct    = ((xOf(sampleIdx) / CW) * 100).toFixed(1);
                        const transform = isFirst ? 'none' : isLast ? 'translateX(-100%)' : 'translateX(-50%)';
                        return (
                          <span
                            key={sampleIdx}
                            style={{
                              position: 'absolute',
                              left: `${xPct}%`,
                              transform,
                              fontSize: '10px', color: '#94a3b8', fontWeight: 500,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Age {samples[sampleIdx].age}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
                    {[
                      { color: 'rgba(29,181,132,0.40)', label: 'Existing Savings Growth' },
                      { color: 'rgba(100,116,139,0.40)', label: 'Future Contributions' },
                      { color: '#1DB584', label: 'Investment Growth', gradient: true },
                    ].map(({ color, label, gradient }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className="w-3 h-2.5 rounded-sm shrink-0" style={{ background: gradient ? 'linear-gradient(135deg,#1DB584,#0a7a55)' : color }} />
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{label}</span>
                      </div>
                    ))}
                    {results.hasGoal && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-0 shrink-0" style={{ borderTop: '2px dashed #F97316' }} />
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Goal</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Right: Retirement Goal Progress ───────────────────────────── */}
        <div className="lg:col-span-5" style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Goal progress
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Retirement Goal Progress</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter your details to see goal progress.
                </p>
              </div>
            )}

            {results && (() => {
              const SEMI_R = 88, CX = 104, CY = 100;
              const SEMI_C = Math.PI * SEMI_R;
              const ratio = results.hasGoal ? Math.min(1, results.goalProgressPct / 100) : 0;
              const fillAmt = ratio * SEMI_C;
              const trackPath = `M ${CX - SEMI_R} ${CY} A ${SEMI_R} ${SEMI_R} 0 0 1 ${CX + SEMI_R} ${CY}`;
              const gc = results.goalGaugeColor;

              return (
                <div className="flex flex-col flex-1 gap-1">
                  {/* Semi-circle gauge */}
                  <div className="flex flex-col items-center">
                    <div style={{ position: 'relative', width: CX * 2, maxWidth: '100%' }}>
                      <svg viewBox={`0 0 ${CX * 2} ${CY + 10}`} width="100%" style={{ display: 'block' }} aria-hidden>
                        <path d={trackPath} fill="none"
                          stroke="rgba(15,41,66,0.09)" strokeWidth="22" strokeLinecap="round" />
                        <path d={trackPath} fill="none"
                          stroke={gc} strokeWidth="22" strokeLinecap="round"
                          strokeDasharray={`${fillAmt.toFixed(1)} 1000`}
                          style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                      </svg>
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        paddingBottom: 0,
                      }}>
                        <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>
                          {results.hasGoal ? `${Math.min(200, Math.round(results.goalProgressPct))}%` : '—'}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>
                          of goal projected
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    {results.hasGoal && (
                      <span
                        className="mt-2 px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: results.goalGaugeBg, color: gc }}
                      >
                        {results.statusLabel}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="divide-y flex-1" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Projected Savings</span>
                      <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>
                        {fmt(safe(results.projectedSavings))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Retirement Goal</span>
                      <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>
                        {results.hasGoal ? fmt(safe(results.retirementGoal)) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>
                        {results.gapOrSurplus > 0 ? 'Goal Gap' : 'Goal Surplus'}
                      </span>
                      <span className="font-semibold" style={{
                        color: !results.hasGoal ? 'rgba(15,41,66,0.35)'
                          : results.gapOrSurplus > 0 ? '#f59e0b' : '#1DB584',
                        fontSize: '12.5px',
                      }}>
                        {!results.hasGoal ? '—'
                          : results.gapOrSurplus > 0
                            ? `-${fmt(safe(results.gapOrSurplus))}`
                            : `+${fmt(safe(-results.gapOrSurplus))}`}
                      </span>
                    </div>
                    {results.leverState === 'behind' && results.additionalMonthlyNeeded > 0 && (
                      <div className="flex items-center justify-between py-1">
                        <span style={{ color: '#f59e0b', fontSize: '12.5px' }}>Add monthly to reach goal</span>
                        <span className="font-bold" style={{ color: '#f59e0b', fontSize: '12.5px' }}>
                          +{fmtx(safe(results.additionalMonthlyNeeded))}/mo
                        </span>
                      </div>
                    )}
                    <div className="py-1">
                      <p className="text-[10.5px] leading-relaxed" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        Based on a {results.annualRate}% annual return assumption. Actual returns vary.{' '}
                        Enter a retirement goal above to track progress.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      </div>

      {/* ══ Block D: Retirement Readiness Insight ════════════════════════════ */}
      <div
        id="ai-analysis"
        className="overflow-hidden"
        style={{ ...cardStyle, padding: 0, scrollMarginTop: '80px' }}
      >

        {/* Header */}
        <div
          className="px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,181,132,0.18)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#1DB584' }} aria-hidden />
            </span>
            <div>
              <p className="text-white text-lg md:text-xl font-bold tracking-tight">
                FinCalc <span style={{ color: '#1DB584' }}>Smart</span> Retirement Readiness Insight
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', fontWeight: 500, marginTop: 1 }}>
                AI-assisted insights by FinCalc Smart
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfGenerating || !results}
              className="inline-flex items-center gap-1.5"
              style={{
                background: '#1DB584', color: '#ffffff', borderRadius: 9999,
                padding: '7px 16px', fontSize: '13px', fontWeight: 700,
                opacity: (pdfGenerating || !results) ? 0.7 : 1,
                cursor: (pdfGenerating || !results) ? 'not-allowed' : 'pointer',
                transition: 'opacity 150ms',
              }}
            >
              <Download className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {pdfGenerating ? 'Generating…' : 'Download PDF'}
            </button>
            <button disabled aria-disabled="true" title="Coming soon"
              className="inline-flex items-center gap-1.5 cursor-not-allowed select-none"
              style={{ border: '1.5px solid rgba(255,255,255,0.30)', color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700 }}>
              <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Email Results <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: 2 }}>· Soon</span>
            </button>
          </div>
        </div>

        {pdfError && (
          <div className="flex items-center gap-2 px-5 py-2.5"
            style={{ background: 'rgba(239,68,68,0.08)', borderTop: '1px solid rgba(239,68,68,0.20)' }}>
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-400" aria-hidden />
            <p className="text-red-400 text-xs font-medium">{pdfError}</p>
          </div>
        )}

        <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

          {!results && (
            <div className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#1DB584' }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                Enter your retirement details above to see the analysis.
              </p>
            </div>
          )}

          {results && (
            <>
              {/* ── Row 1: Two gauges + Smart lever ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Left: Two arc gauges side by side */}
                <div className="rounded-2xl p-4 flex flex-col"
                  style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold text-slate-800">Retirement Analysis</span>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row">

                    {/* Gauge 1: Readiness Score */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0 pb-3 sm:pb-0 sm:pr-3">
                      {(() => {
                        const GR = 48, GC = 2 * Math.PI * GR;
                        const GARC = (240 / 360) * GC;
                        const GFIL = GARC * (results.readinessScore / 100);
                        return (
                          <>
                            <div className="flex items-center w-full mb-2">
                              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Readiness Score</p>
                              <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                                style={{ fontSize: '10px', fontWeight: 700, background: results.readinessBg, color: results.readinessColor }}>
                                {results.readinessStatus}
                              </span>
                            </div>
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
                            <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                              {results.readinessStatus === 'Healthy'
                                ? `Strong trajectory. ${results.yearsToRetirement} years gives compounding meaningful time to work.`
                                : results.readinessStatus === 'Watch'
                                  ? `Moderate pace. A higher contribution or longer horizon would strengthen your position.`
                                  : `Significant gap at current pace. Increasing contributions now has the most impact.`}
                            </p>
                          </>
                        );
                      })()}
                    </div>

                    <div className="hidden sm:block self-stretch w-px mx-1" style={{ background: 'rgba(15,41,66,0.08)' }} />
                    <div className="block sm:hidden h-px w-full mb-3" style={{ background: 'rgba(15,41,66,0.08)' }} />

                    {/* Gauge 2: Goal Progress */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0 sm:pl-3">
                      {(() => {
                        const GR = 48, GC = 2 * Math.PI * GR;
                        const GARC = (240 / 360) * GC;
                        const displayPct = results.hasGoal ? Math.min(100, results.goalProgressPct) : 0;
                        const GFIL = GARC * (displayPct / 100);
                        const gc = results.goalGaugeColor;
                        return (
                          <>
                            <div className="flex items-center w-full mb-2">
                              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Goal Progress</p>
                              <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                                style={{ fontSize: '10px', fontWeight: 700, background: results.goalGaugeBg, color: gc }}>
                                {results.statusLabel}
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
                                {results.hasGoal ? (
                                  <>
                                    <span style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>
                                      {Math.min(200, Math.round(results.goalProgressPct))}<span style={{ fontSize: '1rem' }}>%</span>
                                    </span>
                                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>of goal</span>
                                  </>
                                ) : (
                                  <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>—</span>
                                )}
                              </div>
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: gc }}>
                                  {results.hasGoal ? `${Math.min(200, Math.round(results.goalProgressPct))}%` : 'No Goal'}
                                </span>
                              </div>
                            </div>
                            <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                              {!results.hasGoal
                                ? 'Enter a retirement goal above to track your progress and see the monthly savings needed.'
                                : results.gapOrSurplus <= 0
                                  ? `Your plan projects a ${fmt(safe(-results.gapOrSurplus))} surplus above your ${fmt(safe(results.retirementGoal))} goal.`
                                  : `Your plan projects ${fmt(safe(results.projectedSavings))} — ${fmt(safe(results.gapOrSurplus))} short of your ${fmt(safe(results.retirementGoal))} goal.`
                              }
                            </p>
                          </>
                        );
                      })()}
                    </div>

                  </div>
                </div>

                {/* Right: Smart lever */}
                <div className="rounded-2xl p-3 flex flex-col"
                  style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 shrink-0" style={{ color: results.leverState === 'behind' ? '#f59e0b' : '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold" style={{ color: results.leverState === 'behind' ? '#f59e0b' : '#1DB584' }}>
                      {results.leverState === 'behind'   ? 'Action Required' :
                       results.leverState === 'on-track' ? 'On Track' :
                       'Set Your Retirement Goal'}
                    </span>
                  </div>

                  {/* State: behind */}
                  {results.leverState === 'behind' && (() => (
                    <div className="flex flex-col gap-3 mt-1 flex-1 justify-center">
                      {/* Full-width hero block */}
                      <div className="rounded-xl flex flex-col items-center justify-center px-4 py-5"
                        style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                        <span className="font-extrabold tabular-nums"
                          style={{ fontSize: 'clamp(2rem, 6vw, 2.6rem)', color: '#f59e0b', letterSpacing: '-2px', lineHeight: 1 }}>
                          +{fmtx(safe(results.additionalMonthlyNeeded))}/mo
                        </span>
                        <span style={{ fontSize: '11px', color: 'rgba(245,158,11,0.7)', fontWeight: 500, marginTop: 5 }}>
                          additional monthly savings needed
                        </span>
                      </div>
                      {/* Two stat cards below */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <div className="font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2, color: '#f59e0b' }}>
                            {fmtx(safe(results.requiredMonthly))}/mo
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                            <span className="text-slate-400 text-xs">Required total monthly</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                            {fmt(safe(results.gapOrSurplus))}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                            <span className="text-slate-400 text-xs">Goal gap</span>
                          </div>
                        </div>
                      </div>
                      {/* Supporting copy */}
                      <div>
                        <p className="text-white font-semibold text-sm">
                          to reach your {fmt(safe(results.retirementGoal))} goal by age {results.retirementAge}
                        </p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          At {results.annualRate}% annual return. Estimate based on current inputs.
                        </p>
                      </div>
                      <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                        This does not constitute financial, investment, or retirement advice.
                      </p>
                    </div>
                  ))()}

                  {/* State: on-track */}
                  {results.leverState === 'on-track' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex flex-col items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(29,181,132,0.12)', border: '1px solid rgba(29,181,132,0.25)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(safe(-results.gapOrSurplus))}
                          </span>
                          <span style={{ fontSize: '11px', color: 'rgba(29,181,132,0.7)', fontWeight: 500, marginTop: 4 }}>projected surplus</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">above your {fmt(safe(results.retirementGoal))} goal by age {results.retirementAge}</p>
                          <p className="text-slate-400 text-xs mt-0.5">At {results.annualRate}% annual return. Your current plan is on pace to exceed your goal.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.projectedSavings))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Projected savings</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{Math.round(results.goalProgressPct)}%</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">of goal</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Estimate based on current inputs. Actual results depend on realised returns.
                        </p>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(29,181,132,0.12)', border: '1px solid rgba(29,181,132,0.25)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmt(safe(-results.gapOrSurplus))}
                            </span>
                            <span style={{ fontSize: '10px', color: 'rgba(29,181,132,0.7)', fontWeight: 500, marginTop: 4 }}>projected surplus</span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.projectedSavings))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Projected savings</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{Math.round(results.goalProgressPct)}%</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">of goal</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">above your {fmt(safe(results.retirementGoal))} goal — your plan is on track</p>
                          <p className="text-slate-400 text-xs mt-0.5">At {results.annualRate}% annual return. Estimate based on current inputs.</p>
                        </div>
                      </div>
                    </>
                  ))()}

                  {/* State: no-goal */}
                  {results.leverState === 'no-goal' && (
                    <div className="flex flex-col gap-3 mt-1 flex-1 justify-center items-center text-center px-2">
                      <div className="rounded-xl px-4 py-4 w-full"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <p className="text-white font-semibold text-sm mb-1">Enter your retirement goal above</p>
                        <p className="text-slate-400 text-xs">Set a target nest egg to see your goal progress, the required monthly contribution, and whether you&apos;re on track.</p>
                      </div>
                      <div className="rounded-xl px-4 py-3 w-full"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.2rem' }}>{fmt(safe(results.projectedSavings))}</div>
                        <p className="text-slate-400 text-xs">projected by age {results.retirementAge} at {results.annualRate}% return</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Card 1: Savings Pace */}
                <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Savings Pace</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.hasGoal && results.leverState === 'behind'
                      ? <>Your current {fmtx(safe(results.monthlyContribution))}/mo contribution covers <strong className="text-sky-700">{results.requiredMonthly > 0 ? Math.round((results.monthlyContribution / results.requiredMonthly) * 100) : 100}%</strong> of the required {fmtx(safe(results.requiredMonthly))}/mo needed to reach your {fmt(safe(results.retirementGoal))} goal. Adding <strong className="text-sky-700">{fmtx(safe(results.additionalMonthlyNeeded))}/mo</strong> now has the greatest long-term impact due to compounding.</>
                      : results.hasGoal && results.leverState === 'on-track'
                        ? <>Your {fmtx(safe(results.monthlyContribution))}/mo contribution is on pace to reach your {fmt(safe(results.retirementGoal))} goal with a <strong className="text-sky-700">{fmt(safe(-results.gapOrSurplus))} projected surplus</strong> by age {results.retirementAge}.</>
                        : <>At {fmtx(safe(results.monthlyContribution))}/mo you are contributing consistently toward retirement. Set a retirement goal above to see whether your pace is sufficient.</>
                    }
                  </p>
                </div>

                {/* Card 2: Time Horizon Impact */}
                <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                      <Zap className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Time Horizon Impact</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    At {results.annualRate}% return, your {results.yearsToRetirement}-year horizon projects{' '}
                    <strong className="text-emerald-700">{fmt(safe(results.projectedSavings))}</strong>.
                    {results.yearsToRetirement > 10 && (
                      <> At the 10-year mark (age {results.currentAge + 10}), your projected balance is <strong className="text-emerald-700">{fmt(safe(results.valAt10yr))}</strong>.</>
                    )}
                    {results.yearsToRetirement > 5 && (
                      <> Delaying contributions by 5 years would reduce your projected retirement savings to approximately <strong className="text-emerald-700">{fmt(safe(results.valIfDelayed5yr))}</strong> — illustrating the cost of waiting to start or increase contributions.</>
                    )}
                  </p>
                </div>

                {/* Card 3: Goal Gap Check */}
                {(() => {
                  const isOver  = results.leverState === 'on-track';
                  const noGoal  = results.leverState === 'no-goal';
                  const bg      = isOver ? '#f0fdf4' : noGoal ? '#fdf4ff' : '#fff7ed';
                  const bdr     = isOver ? '#bbf7d0' : noGoal ? '#e9d5ff' : '#fed7aa';
                  const iconBg  = isOver ? '#dcfce7' : noGoal ? '#f3e8ff' : '#ffedd5';
                  const iconCls = isOver ? 'text-emerald-500' : noGoal ? 'text-purple-500' : 'text-orange-500';
                  const labelCls = isOver ? 'text-emerald-600' : noGoal ? 'text-purple-600' : 'text-orange-600';
                  return (
                    <div className="rounded-2xl p-4" style={{ background: bg, border: `1px solid ${bdr}` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center justify-center shrink-0"
                          style={{ width: 28, height: 28, borderRadius: 8, background: iconBg }}>
                          <AlertTriangle className={`w-3.5 h-3.5 ${iconCls}`} aria-hidden />
                        </span>
                        <p className={`text-xs font-bold uppercase tracking-widest ${labelCls}`}>Goal Gap Check</p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {noGoal
                          ? 'Enter a retirement goal above to assess whether your current savings rate and investment horizon are likely to reach it. A common starting benchmark is 10–25× your estimated annual retirement spending — but your personal goal depends on your circumstances.'
                          : isOver
                            ? <>Your projected <strong className="text-emerald-700">{fmt(safe(results.projectedSavings))}</strong> exceeds your <strong className="text-emerald-700">{fmt(safe(results.retirementGoal))}</strong> goal by <strong className="text-emerald-700">{fmt(safe(-results.gapOrSurplus))}</strong>. Maintaining your current contribution rate and return assumption keeps you on track. Actual results depend on realised investment returns.</>
                            : <>Your plan projects a <strong className="text-orange-700">{fmt(safe(results.gapOrSurplus))}</strong> shortfall against your <strong className="text-orange-700">{fmt(safe(results.retirementGoal))}</strong> goal. To close this gap, you would need approximately <strong className="text-orange-700">{fmtx(safe(results.requiredMonthly))}/mo</strong> in total monthly contributions — an additional <strong className="text-orange-700">{fmtx(safe(results.additionalMonthlyNeeded))}/mo</strong> above your current rate. These are estimates based on a fixed {results.annualRate}% return assumption and do not account for inflation, fees, or taxes.</>
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
            This analysis is for illustrative and informational purposes only. Projected values are estimates based on a fixed assumed annual return. This tool does not account for inflation, investment fees, taxes, CPP/OAS, Social Security, pension income, withdrawal rates, retirement spending needs, or changes in contributions over time. Actual retirement outcomes will vary. This does not constitute financial, investment, tax, or legal advice. Consult a qualified financial advisor for personalized retirement planning.
          </p>
        </div>

      </div>

      {/* ══ Block E: How It Works ════════════════════════════════════════════ */}
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

      {/* ══ Block F: FAQ ═════════════════════════════════════════════════════ */}
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
        This calculator is for illustrative and informational purposes only. Projected retirement savings values are estimates based on a fixed assumed annual return and do not account for inflation, investment fees, taxes, CPP/OAS or Social Security income, pension income, withdrawal rates, retirement spending requirements, or changes in contribution amounts over time. Actual retirement outcomes will differ. This does not constitute financial, investment, tax, or legal advice. Consult a qualified financial advisor before making retirement planning decisions.
      </p>

    </div>
  );
}
