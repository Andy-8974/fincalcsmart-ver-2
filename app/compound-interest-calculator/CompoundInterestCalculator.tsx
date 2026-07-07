'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip, DonutChart, type PieSlice } from '../_mortgage-shared/ui';
import { fmtCAD, fmtCADx, fmtUSD, fmtUSDx } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  Activity, AlertTriangle, BookOpen, Download,
  HelpCircle, Mail, Percent, ShieldAlert, Sparkles, TrendingUp, Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type FreqKey = 'annually' | 'semi' | 'monthly' | 'daily';

interface FormState {
  initialInvestment: string;
  monthlyContribution: string;
  annualRate: string;
  targetAmount: string;
  startingAge: string;
}

interface CIResults {
  initialInvestment: number;
  monthlyContribution: number;
  annualRate: number;
  freq: FreqKey;
  yearsInvested: number;
  startingAge: number;
  hasAge: boolean;
  hasTarget: boolean;
  targetAmount: number;
  effectiveMonthlyRate: number;
  totalContributions: number;
  finalBalance: number;
  totalInterest: number;
  interestPct: number;
  targetGap: number;         // positive = behind, negative = surplus
  targetProgress: number;    // 0–200+
  // Scores
  powerScore: number;
  powerLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  powerStatus: 'Healthy' | 'Watch' | 'Caution';
  powerColor: string;
  powerBg: string;
  // Smart lever
  leverState: 'behind' | 'on-track' | 'no-target';
  extraMonthlyNeeded: number;
  surplus: number;
  boost100: number;
  boost100FV: number;
  // Insight data
  balAt10: number;
  intAt10: number;
  balAt20: number;
  intAt20: number;
  balAt30: number;
  intAt30: number;
  freqGainVsMonthly: number;  // gain switching to monthly from current (0 if already monthly/daily)
  freqGainVsAnnual: number;   // gain from current vs annual (for monthly/daily positive copy)
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  initialInvestment: '5000',
  monthlyContribution: '200',
  annualRate: '6',
  targetAmount: '',
  startingAge: '',
};

const DEFAULT_YEARS = 20;
const YEAR_OPTIONS = [5, 10, 20, 30, 40] as const;
const CHART_YEARS = [5, 10, 20, 30, 40] as const;
const DEFAULT_FREQ: FreqKey = 'monthly';

const FREQ_OPTIONS: { key: FreqKey; label: string; periods: number }[] = [
  { key: 'annually', label: 'Annually', periods: 1 },
  { key: 'semi',     label: 'Semi-Ann.', periods: 2 },
  { key: 'monthly',  label: 'Monthly',  periods: 12 },
  { key: 'daily',    label: 'Daily',    periods: 365 },
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

function niceMax(v: number): number {
  if (v <= 0) return 10000;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / exp) * exp;
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function computeResults(form: FormState, freq: FreqKey, yearsInvested: number): CIResults | null {
  const initialInvestment = Math.max(0, parseFloat(form.initialInvestment) || 0);
  const monthlyContribution = Math.max(0, parseFloat(form.monthlyContribution) || 0);
  const annualRate = Math.max(0, Math.min(49.9, parseFloat(form.annualRate) || 0));
  const targetAmount = Math.max(0, parseFloat(form.targetAmount) || 0);
  const rawAge = parseInt(form.startingAge) || 0;
  const startingAge = rawAge >= 10 ? rawAge : 0;
  const hasAge = startingAge > 0;
  const hasTarget = targetAmount > 0;

  if (initialInvestment <= 0 && monthlyContribution <= 0) return null;

  const periods = FREQ_OPTIONS.find(f => f.key === freq)!.periods;
  const r = getEffectiveMonthlyRate(annualRate, periods);
  const months = yearsInvested * 12;
  const totalContributions = Math.max(0, initialInvestment + monthlyContribution * months);

  const finalBalance = calcFVRate(r, months, initialInvestment, monthlyContribution);
  const totalInterest = Math.max(0, finalBalance - totalContributions);
  const interestPct = finalBalance > 0 ? (totalInterest / finalBalance) * 100 : 0;

  // Target
  const targetGap = hasTarget ? targetAmount - finalBalance : 0;
  const targetProgress = hasTarget && targetAmount > 0 ? Math.min(200, (finalBalance / targetAmount) * 100) : 0;

  // Compounding Power Score
  const powerScore = Math.round(Math.min(100, interestPct * 1.5));
  const powerLabel: CIResults['powerLabel'] =
    powerScore >= 80 ? 'Excellent' : powerScore >= 65 ? 'Good' : powerScore >= 45 ? 'Fair' : 'Poor';
  const powerStatus: CIResults['powerStatus'] =
    powerLabel === 'Poor' ? 'Caution' : powerLabel === 'Fair' ? 'Watch' : 'Healthy';
  const powerColor = powerStatus === 'Healthy' ? '#1DB584' : powerStatus === 'Watch' ? '#f59e0b' : '#ef4444';
  const powerBg = powerStatus === 'Healthy' ? 'rgba(29,181,132,0.10)' : powerStatus === 'Watch' ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

  // Smart lever
  let leverState: CIResults['leverState'] = 'no-target';
  let extraMonthlyNeeded = 0;
  let surplus = 0;
  if (hasTarget) {
    if (finalBalance >= targetAmount) {
      leverState = 'on-track';
      surplus = finalBalance - targetAmount;
    } else {
      leverState = 'behind';
      const annuityFactor = Math.abs(r) > 1e-10
        ? (Math.pow(1 + r, months) - 1) / r
        : months;
      extraMonthlyNeeded = annuityFactor > 0 ? Math.max(0, targetGap / annuityFactor) : 0;
    }
  }

  // Boost +$100/month
  const boost100FV = calcFVRate(r, months, initialInvestment, monthlyContribution + 100);
  const boost100 = Math.max(0, boost100FV - finalBalance);

  // Insight: balance at 10/20/30yr
  const balAt10 = calcFVRate(r, 120, initialInvestment, monthlyContribution);
  const intAt10 = Math.max(0, balAt10 - Math.min(initialInvestment + monthlyContribution * 120, balAt10));
  const balAt20 = calcFVRate(r, 240, initialInvestment, monthlyContribution);
  const intAt20 = Math.max(0, balAt20 - Math.min(initialInvestment + monthlyContribution * 240, balAt20));
  const balAt30 = calcFVRate(r, 360, initialInvestment, monthlyContribution);
  const intAt30 = Math.max(0, balAt30 - Math.min(initialInvestment + monthlyContribution * 360, balAt30));

  // Insight: frequency impact
  const rMonthly = getEffectiveMonthlyRate(annualRate, 12);
  const rAnnual = getEffectiveMonthlyRate(annualRate, 1);
  const fvMonthly = calcFVRate(rMonthly, months, initialInvestment, monthlyContribution);
  const fvAnnual = calcFVRate(rAnnual, months, initialInvestment, monthlyContribution);
  const freqGainVsMonthly = (freq === 'annually' || freq === 'semi')
    ? Math.max(0, fvMonthly - finalBalance)
    : 0;
  const freqGainVsAnnual = (freq === 'monthly' || freq === 'daily')
    ? Math.max(0, finalBalance - fvAnnual)
    : 0;

  return {
    initialInvestment, monthlyContribution, annualRate, freq, yearsInvested,
    startingAge, hasAge, hasTarget, targetAmount,
    effectiveMonthlyRate: r,
    totalContributions, finalBalance, totalInterest, interestPct,
    targetGap, targetProgress,
    powerScore, powerLabel, powerStatus, powerColor, powerBg,
    leverState, extraMonthlyNeeded, surplus, boost100, boost100FV,
    balAt10, intAt10, balAt20, intAt20, balAt30, intAt30,
    freqGainVsMonthly, freqGainVsAnnual,
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

interface CompoundInterestCalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CompoundInterestCalculator({
  formulaContent,
  faqItems = [],
}: CompoundInterestCalculatorProps) {
  const { region } = useRegion();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [freq, setFreq] = useState<FreqKey>(DEFAULT_FREQ);
  const [yearsInvested, setYearsInvested] = useState<number>(DEFAULT_YEARS);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const isCA = region === 'ca';
  const currencyPrefix = isCA ? 'CA$' : '$';
  const fmt = isCA ? fmtCAD : fmtUSD;
  const fmtx = isCA ? fmtCADx : fmtUSDx;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const results = useMemo(() => computeResults(form, freq, yearsInvested), [form, freq, yearsInvested]);

  const donutSlices = useMemo((): PieSlice[] | null => {
    if (!results) return null;
    return [
      { label: 'Contributions', value: safe(results.totalContributions), color: '#1DB584', alwaysShow: true },
      { label: 'Interest Earned', value: safe(results.totalInterest), color: '#334155', alwaysShow: false },
    ];
  }, [results]);

  async function handleDownloadPDF() {
    if (!results || pdfGenerating) return;
    setPdfGenerating(true);
    setPdfError(null);
    try {
      const { buildInvestmentGrowthPDF } = await import('@/lib/pdf/adapters/investmentGrowthAdapter');
      await buildInvestmentGrowthPDF({
        initialInvestment:    results.initialInvestment,
        monthlyContribution:  results.monthlyContribution,
        annualRate:           results.annualRate,
        freq:                 results.freq,
        yearsInvested:        results.yearsInvested,
        hasTarget:            results.hasTarget,
        targetAmount:         results.targetAmount,
        hasAge:               results.hasAge,
        startingAge:          results.startingAge,
        finalBalance:         results.finalBalance,
        totalContributions:   results.totalContributions,
        totalInterest:        results.totalInterest,
        interestPct:          results.interestPct,
        powerScore:           results.powerScore,
        powerLabel:           results.powerLabel,
        powerStatus:          results.powerStatus,
        leverState:           results.leverState,
        targetProgress:       results.targetProgress,
        targetGap:            results.targetGap,
        surplus:              results.surplus,
        extraMonthlyNeeded:   results.extraMonthlyNeeded,
        boost100:             results.boost100,
        boost100FV:           results.boost100FV,
        balAt10:              results.balAt10,
        balAt20:              results.balAt20,
        balAt30:              results.balAt30,
        freqGainVsMonthly:    results.freqGainVsMonthly,
        freqGainVsAnnual:     results.freqGainVsAnnual,
        region,
      });
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

  // Age milestone copy helper
  function ageCopy(res: CIResults): string {
    if (!res.hasAge) return '';
    return ` by age ${res.startingAge + res.yearsInvested}`;
  }

  return (
    <div className="flex flex-col gap-y-7 md:gap-y-8 min-w-0">

      <style>{`
        @keyframes teal-glow-ci {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-ci {
          animation: teal-glow-ci 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-ci:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
        .ci-pill { flex: 1; min-width: calc(50% - 4px); text-align: center; }
        @media (min-width: 480px) { .ci-pill { min-width: 0; } }
        .ci-year-pill { flex: 1; min-width: calc(33.33% - 5px); text-align: center; }
        @media (min-width: 480px) { .ci-year-pill { min-width: 0; } }
        .ci-pills { display: flex; flex-wrap: wrap; gap: 6px; }
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
                <Percent size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Compound Interest
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Growth Details</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

              {/* Left column */}
              <div className="space-y-3 min-w-0">

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Initial Investment
                    <Tooltip text="The lump sum you start with. Even a modest initial amount compounds meaningfully over a long horizon." />
                  </label>
                  <NumericInput
                    value={form.initialInvestment}
                    onChange={(v) => set('initialInvestment', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Monthly Contribution
                    <Tooltip text="The amount you add each month. Regular contributions dramatically increase the compounding effect over time." />
                  </label>
                  <NumericInput
                    value={form.monthlyContribution}
                    onChange={(v) => set('monthlyContribution', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Annual Interest Rate
                    <Tooltip text="The nominal annual interest or return rate before compounding. This is an illustrative estimate — actual returns vary and are not guaranteed." />
                  </label>
                  <NumericInput
                    value={form.annualRate}
                    onChange={(v) => set('annualRate', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                </div>

              </div>

              {/* Right column */}
              <div className="border-l pl-2 md:pl-5 space-y-3 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>

                {/* Compound Frequency */}
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Compound Frequency
                    <Tooltip text="How often interest is calculated and added to the balance. Monthly and daily compounding produce slightly higher returns than annual compounding at the same nominal rate." />
                  </label>
                  <div className="ci-pills">
                    {FREQ_OPTIONS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        className="ci-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
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

                {/* Years Invested */}
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Years Invested
                  </label>
                  <div className="ci-pills">
                    {YEAR_OPTIONS.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        className="ci-year-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
                        onClick={() => setYearsInvested(yr)}
                        style={
                          yearsInvested === yr
                            ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                            : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                        }
                      >
                        {yr}yr
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Amount */}
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Target Amount
                    <Tooltip text="Optional savings goal. When entered, the AI Analysis shows your projected progress and the extra monthly contribution needed to reach it on time." />
                  </label>
                  <NumericInput
                    value={form.targetAmount}
                    onChange={(v) => set('targetAmount', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                    placeholder="Optional"
                  />
                </div>

                {/* Starting Age */}
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Starting Age
                    <Tooltip text="Optional. Adds age-based milestone copy to the analysis — for example, your projected balance by a specific age. Does not affect any calculations." />
                  </label>
                  <NumericInput
                    value={form.startingAge}
                    onChange={(v) => set('startingAge', v)}
                    inputClassName={inputClsCompact}
                    placeholder="Optional"
                  />
                  <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>
                    Optional — for age milestone copy
                  </p>
                </div>

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
                  Enter an initial investment or monthly contribution to see your results.
                </p>
              </div>
            )}

            {results && (
              <div className="flex flex-col flex-1 gap-4">

                <div
                  className="rounded-xl p-5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <p style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
                  }}>
                    Final Balance
                  </p>
                  <p style={{ color: '#1DB584', fontSize: '38px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 8 }}>
                    {fmt(safe(results.finalBalance))}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: 6, fontWeight: 500 }}>
                    after {results.yearsInvested} years
                    {results.hasAge ? ` · by age ${results.startingAge + results.yearsInvested}` : ''}
                    {' '}· {FREQ_OPTIONS.find(f => f.key === results.freq)?.label?.toLowerCase()} compounding
                  </p>
                </div>

                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#334155' }} />
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Total Interest Earned</span>
                    </div>
                    <span className="text-[13px] font-semibold text-white">
                      {fmt(safe(results.totalInterest))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300 font-medium">Total Contributions</span>
                    <span className="text-[13px] font-bold text-white">{fmt(safe(results.totalContributions))}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    {results.hasTarget ? (
                      <>
                        <span className="text-[13px]" style={{ color: '#CBD5E1' }}>
                          {results.targetGap > 0 ? 'Target Gap' : 'Target Surplus'}
                        </span>
                        <span className="text-[13px] font-semibold" style={{ color: results.targetGap > 0 ? '#f59e0b' : '#1DB584' }}>
                          {results.targetGap > 0 ? '-' : '+'}{fmt(results.targetGap > 0 ? safe(results.targetGap) : safe(results.surplus))}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Interest Share</span>
                        <span className="text-[13px] font-semibold text-white">{results.interestPct.toFixed(1)}%</span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See how compounding frequency and contributions shape your final balance.
                  </p>
                  <button
                    className="btn-ai-cta-ci w-full font-bold overflow-hidden"
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
                      Review Growth Insights ↓
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
                      See AI Growth Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* ══ Block C: Growth Breakdown + Growth Over Time ═════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Left: Growth Breakdown donut ──────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Balance breakdown
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Growth Breakdown</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter details to see the growth breakdown.
                </p>
              </div>
            )}

            {results && donutSlices && (() => {
              const rows = [
                { label: 'Contributions', value: results.totalContributions, color: '#1DB584' },
                { label: 'Interest Earned', value: results.totalInterest, color: '#334155' },
              ];
              return (
                <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                  <div className="shrink-0">
                    <DonutChart
                      slices={donutSlices}
                      className="w-52 h-52"
                      centerValue={fmt(safe(results.finalBalance))}
                      centerLabel="final balance"
                    />
                  </div>
                  <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    {rows.map(({ label, value, color }) => {
                      const pct = results.finalBalance > 0 ? Math.round((safe(value) / results.finalBalance) * 100) : 0;
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
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>Final Balance</span>
                      <span className="font-bold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmt(safe(results.finalBalance))}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        {/* ── Right: Growth Over Time chart ─────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Growth over time
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Growth Over Time</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter details to see growth over time.
                </p>
              </div>
            )}

            {results && (() => {
              const r = results.effectiveMonthlyRate;
              const allYears = CHART_YEARS.map((yr) => {
                const m = yr * 12;
                const bal = calcFVRate(r, m, results.initialInvestment, results.monthlyContribution);
                const contribs = Math.min(Math.max(0, results.initialInvestment + results.monthlyContribution * m), bal);
                const interest = Math.max(0, bal - contribs);
                return { yr, bal, contributions: contribs, interest, isCurrent: yr === results.yearsInvested };
              });

              const cur = allYears.find((d) => d.isCurrent) ?? allYears[2];
              const yMax = niceMax(Math.max(...allYears.map((d) => d.bal)));
              const CHART_H = 188;
              const XLABEL_H = 30;
              const YAXIS_W = 36;

              // Target line
              const hasTargetLine = results.hasTarget && yMax > 0;
              const targetPx = hasTargetLine ? Math.round((results.targetAmount / yMax) * CHART_H) : 0;
              const showTargetLine = hasTargetLine && targetPx > 8 && targetPx < CHART_H - 4;

              const statRows = [
                { label: 'Balance', value: fmt(safe(cur.bal)), color: '#1DB584' as const },
                { label: 'Contributions', value: fmt(safe(cur.contributions)), color: '#0D1B2A' as const },
                { label: 'Interest', value: fmt(safe(cur.interest)), color: '#334155' as const },
              ];
              const legendRows = [
                { label: 'Contributions', color: '#1DB584' as const },
                { label: 'Interest', color: '#334155' as const },
              ];

              return (
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 flex-1 min-h-0">

                  <div className="flex flex-row sm:flex-col gap-4 sm:gap-4 sm:w-[108px] shrink-0 sm:justify-center">
                    <div className="flex flex-row sm:flex-col gap-3 sm:gap-2.5">
                      {statRows.map(({ label, value, color }) => (
                        <div key={label}>
                          <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9BA8B5', marginBottom: 2 }}>{label}</p>
                          <p style={{ fontSize: '13px', fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="hidden sm:block" style={{ height: 1, background: 'rgba(15,41,66,0.08)' }} />
                    <div className="flex flex-row sm:flex-col gap-2 sm:gap-1.5">
                      {legendRows.map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                          <span style={{ fontSize: '10px', color: '#6B7A8D' }}>{label}</span>
                        </div>
                      ))}
                      {showTargetLine && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-0 shrink-0" style={{ borderTop: '2px dashed rgba(29,181,132,0.6)', marginTop: 1 }} />
                          <span style={{ fontSize: '10px', color: '#1DB584' }}>Target</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 relative" style={{ minHeight: CHART_H + XLABEL_H + 60 }}>

                    {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                      <div key={frac} className="absolute"
                        style={{
                          left: 0, width: YAXIS_W,
                          bottom: XLABEL_H + Math.round(frac * CHART_H) - 5,
                          fontSize: '8px', color: '#9BA8B5', textAlign: 'right', lineHeight: 1,
                        }}
                      >
                        {frac === 0 ? '$0' : `$${Math.round((yMax * frac) / 1000)}k`}
                      </div>
                    ))}

                    <div className="absolute top-0 bottom-0" style={{ left: YAXIS_W + 4, right: 0 }}>

                      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                        <div key={frac} className="absolute left-0 right-0"
                          style={{
                            bottom: XLABEL_H + Math.round(frac * CHART_H),
                            borderTop: frac === 0 ? '1px solid rgba(15,41,66,0.12)' : '1px dashed rgba(15,41,66,0.08)',
                          }}
                        />
                      ))}

                      {/* Target line */}
                      {showTargetLine && (
                        <div className="absolute left-0 right-0" style={{ bottom: XLABEL_H + targetPx, zIndex: 2 }}>
                          <div style={{ borderTop: '1.5px dashed rgba(29,181,132,0.55)', position: 'relative' }}>
                            <span style={{
                              position: 'absolute', right: 0, top: -9,
                              fontSize: '7px', fontWeight: 700, color: '#1DB584',
                              background: '#fff', paddingLeft: 2,
                            }}>Target</span>
                          </div>
                        </div>
                      )}

                      {/* Bars + bar-anchored bubble */}
                      <div className="absolute left-0 right-0 flex gap-0.5" style={{ bottom: XLABEL_H, height: CHART_H }}>
                        {allYears.map((d) => {
                          const barH = yMax > 0 ? Math.round((d.bal / yMax) * CHART_H) : 0;
                          const contribH = d.bal > 0 ? Math.round((safe(d.contributions) / d.bal) * barH) : barH;
                          const intH = barH - contribH;
                          return (
                            <div key={d.yr} className="flex-1 flex justify-center items-end">
                              <div style={{ position: 'relative', width: '48%', minWidth: 6 }}>
                                {/* Value label above non-current bars so every bar is readable regardless of height */}
                                {!d.isCurrent && barH > 0 && (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: barH + 3,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontSize: '7px',
                                    color: '#9BA8B5',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'none',
                                    lineHeight: 1,
                                  }}>
                                    {fmtShort(d.bal)}
                                  </div>
                                )}
                                <div className="flex flex-col overflow-hidden"
                                  style={{ height: barH, width: '100%', borderRadius: '4px 4px 0 0' }}>
                                  <div style={{ height: Math.max(0, intH), background: '#334155', flexShrink: 0 }} />
                                  <div style={{ height: Math.max(0, contribH), background: '#1DB584', flexShrink: 0 }} />
                                </div>
                                {d.isCurrent && (
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
                                      <div className="relative rounded-xl px-2 py-2 text-center"
                                        style={{
                                          background: '#fff',
                                          boxShadow: '0 3px 14px rgba(0,0,0,0.12)',
                                          border: '1.5px solid rgba(29,181,132,0.30)',
                                          maxWidth: 80, minWidth: 52,
                                          whiteSpace: 'nowrap',
                                        }}>
                                        <p style={{ fontSize: '9px', fontWeight: 700, color: '#6B7A8D', marginBottom: 3 }}>Interest</p>
                                        <p style={{ fontSize: '13px', fontWeight: 800, color: '#334155', lineHeight: 1 }}>{fmt(safe(d.interest))}</p>
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
                      <div className="absolute left-0 right-0 bottom-0 flex gap-0.5" style={{ height: XLABEL_H }}>
                        {allYears.map((d) => (
                          <div key={d.yr} className="flex-1 flex justify-center items-center">
                            {d.isCurrent ? (
                              <span className="rounded-full"
                                style={{ background: '#1DB584', color: '#fff', fontSize: '8px', fontWeight: 700, lineHeight: 1, display: 'inline-block', padding: '3px 7px' }}>
                                {d.yr}yr
                              </span>
                            ) : (
                              <span style={{ fontSize: '8px', color: '#9BA8B5' }}>{d.yr}yr</span>
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

      </div>

      {/* ══ Block D: AI Analysis ═════════════════════════════════════════════ */}
      <div
        id="ai-analysis"
        className="overflow-hidden"
        style={{ ...cardStyle, padding: 0, scrollMarginTop: '80px' }}
      >

        <div
          className="px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,181,132,0.18)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#1DB584' }} aria-hidden />
            </span>
            <p className="text-white text-lg md:text-xl font-bold tracking-tight">
              FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Growth Analysis
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col items-start gap-1">
              <button
                onClick={handleDownloadPDF}
                disabled={!results || pdfGenerating}
                className="inline-flex items-center gap-1.5"
                style={{
                  background: '#1DB584', color: '#ffffff', borderRadius: 9999,
                  padding: '7px 16px', fontSize: '13px', fontWeight: 700,
                  opacity: (!results || pdfGenerating) ? 0.65 : 1,
                  cursor: (!results || pdfGenerating) ? 'not-allowed' : 'pointer',
                }}
              >
                <Download className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {pdfGenerating ? 'Generating…' : 'Download PDF'}
              </button>
              {pdfError && (
                <p style={{ fontSize: '11px', color: '#f87171', marginLeft: 4 }}>{pdfError}</p>
              )}
            </div>
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
                Enter your details above to see the growth analysis.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 340 }}>
                The analysis will show your Compounding Power Score, target progress, and the monthly contributions needed to reach your goal.
              </p>
            </div>
          )}

          {results && (
            <>
              {/* ── Row 1: two gauges + smart lever ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Left — two gauges */}
                <div className="rounded-2xl p-4 flex flex-col"
                  style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold text-slate-800">Growth Analysis</span>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row">

                    {/* Gauge 1: Compounding Power Score */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0 pb-3 sm:pb-0 sm:pr-3">
                      <div className="flex items-center w-full mb-2">
                        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Compounding Power</p>
                        <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                          style={{ fontSize: '10px', fontWeight: 700, background: results.powerBg, color: results.powerColor }}>
                          {results.powerStatus}
                        </span>
                      </div>
                      {(() => {
                        const GR = 48; const GC = 2 * Math.PI * GR;
                        const GARC = (240 / 360) * GC;
                        const GFIL = GARC * (results.powerScore / 100);
                        return (
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 66, 66)" />
                              <circle cx="66" cy="66" r={GR} fill="none" stroke={results.powerColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>{results.powerScore}</span>
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>/ 100</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: results.powerColor }}>{results.powerLabel}</span>
                            </div>
                          </div>
                        );
                      })()}
                      <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                        {results.interestPct.toFixed(1)}% of your final balance comes from compound interest.
                        {results.powerStatus === 'Healthy' ? ' Strong compounding effect over your chosen horizon.' : results.powerStatus === 'Watch' ? ' Compounding effect grows significantly over longer horizons.' : ' Extend your time horizon to let compounding work harder.'}
                      </p>
                    </div>

                    <div className="hidden sm:block self-stretch w-px mx-1" style={{ background: 'rgba(15,41,66,0.08)' }} />
                    <div className="block sm:hidden h-px w-full mb-3" style={{ background: 'rgba(15,41,66,0.08)' }} />

                    {/* Gauge 2: Target Progress */}
                    {(() => {
                      const hasTarget = results.hasTarget;
                      const progress = results.targetProgress;
                      const isOnTrack = progress >= 100;
                      const isClose = progress >= 70 && progress < 100;
                      const tColor = !hasTarget ? '#94a3b8' : isOnTrack ? '#1DB584' : isClose ? '#f59e0b' : '#ef4444';
                      const tBg = !hasTarget ? 'rgba(148,163,184,0.10)' : isOnTrack ? 'rgba(29,181,132,0.10)' : isClose ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';
                      const tBadge = !hasTarget ? 'No Target' : isOnTrack ? 'On Track' : isClose ? 'Close' : 'Behind';
                      const tLabel = !hasTarget ? '—' : isOnTrack ? 'On Track' : isClose ? 'Close' : 'Behind';
                      const fillPct = hasTarget ? Math.min(100, progress) : 0;
                      const GR = 48; const GC = 2 * Math.PI * GR;
                      const GARC = (240 / 360) * GC;
                      const GFIL = GARC * (fillPct / 100);
                      return (
                        <div className="flex-1 flex flex-col items-center text-center min-w-0 pt-0 sm:pl-3">
                          <div className="flex items-center w-full mb-2">
                            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Target Progress</p>
                            <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                              style={{ fontSize: '10px', fontWeight: 700, background: tBg, color: tColor }}>
                              {tBadge}
                            </span>
                          </div>
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 66, 66)" />
                              <circle cx="66" cy="66" r={GR} fill="none" stroke={tColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              {hasTarget ? (
                                <>
                                  <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>
                                    {Math.round(progress)}<span style={{ fontSize: '1rem' }}>%</span>
                                  </span>
                                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>of target</span>
                                </>
                              ) : (
                                <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>—</span>
                              )}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: tColor }}>{tLabel}</span>
                            </div>
                          </div>
                          <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                            {!hasTarget
                              ? 'Add a target amount above to see your progress toward a savings goal.'
                              : isOnTrack
                                ? `Projected to exceed your ${fmt(safe(results.targetAmount))} target by ${fmt(safe(results.surplus))}${ageCopy(results)}.`
                                : `Projected to reach ${Math.round(progress)}% of your ${fmt(safe(results.targetAmount))} target${ageCopy(results)}.`
                            }
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
                    <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold" style={{ color: '#1DB584' }}>
                      {results.leverState === 'on-track' ? 'On Track' : 'Smart Optimization Found'}
                    </span>
                  </div>

                  {/* State A: behind target */}
                  {results.leverState === 'behind' && (() => {
                    const ageStr = results.hasAge ? ` by age ${results.startingAge + results.yearsInvested}` : ` within ${results.yearsInvested} years`;
                    return (
                      <>
                        <div className="flex flex-col gap-3 mt-1 lg:hidden">
                          <div className="rounded-xl flex items-center justify-center px-4 py-4"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                              {fmtx(safe(results.extraMonthlyNeeded))}<span style={{ fontSize: '1rem', letterSpacing: 0, fontWeight: 700, color: 'rgba(29,181,132,0.7)' }}>/mo</span>
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">
                              {results.annualRate <= 0 ? 'contribution increase needed' : 'extra monthly contribution needed'}
                            </p>
                            <p className="text-slate-400 text-xs mt-0.5">
                              {results.annualRate <= 0
                                ? 'With a 0% return assumption, your balance grows only through contributions.'
                                : `to reach ${fmt(safe(results.targetAmount))}${ageStr}`
                              }
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                              <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.targetAmount))}</div>
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Target amount</span>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                              <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.targetGap))}</div>
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Gap to close</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                            Estimate based on current rate and contribution inputs. Actual results depend on market conditions.
                          </p>
                        </div>
                        <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                          <div className="flex items-stretch gap-3">
                            <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                              <span className="font-extrabold tabular-nums"
                                style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                                {fmtx(safe(results.extraMonthlyNeeded))}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'rgba(29,181,132,0.7)', fontWeight: 700 }}>/mo</span>
                            </div>
                            <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                              <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(safe(results.targetAmount))}</div>
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Target amount</span>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                              <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(safe(results.targetGap))}</div>
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Gap to close</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">
                              {results.annualRate <= 0 ? 'contribution increase needed' : 'extra monthly contribution needed'}
                            </p>
                            <p className="text-slate-400 text-xs mt-0.5">
                              {results.annualRate <= 0
                                ? 'With a 0% return assumption, your balance grows only through contributions.'
                                : `to reach ${fmt(safe(results.targetAmount))}${ageStr}`
                              }
                            </p>
                          </div>
                          <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                            Estimate based on current rate and contribution inputs. Actual results depend on market conditions.
                          </p>
                        </div>
                      </>
                    );
                  })()}

                  {/* State B: on track */}
                  {results.leverState === 'on-track' && (() => {
                    const ageStr = results.hasAge ? ` by age ${results.startingAge + results.yearsInvested}` : '';
                    return (
                      <>
                        <div className="flex flex-col gap-3 mt-1 lg:hidden">
                          <div className="rounded-xl flex items-center justify-center px-4 py-4"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                              {fmt(safe(results.surplus))}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">projected surplus above target</p>
                            <p className="text-slate-400 text-xs mt-0.5">on track to reach {fmt(safe(results.targetAmount))}{ageStr}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                              <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.finalBalance))}</div>
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Projected balance</span>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                              <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{Math.round(results.targetProgress)}%</div>
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">of target</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                          <div className="flex items-stretch gap-3">
                            <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                              <span className="font-extrabold tabular-nums"
                                style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                                {fmt(safe(results.surplus))}
                              </span>
                            </div>
                            <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                              <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(safe(results.finalBalance))}</div>
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Projected balance</span>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                              <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{Math.round(results.targetProgress)}%</div>
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">of target</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">projected surplus above target</p>
                            <p className="text-slate-400 text-xs mt-0.5">on track to reach {fmt(safe(results.targetAmount))}{ageStr}</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* State C: no target */}
                  {results.leverState === 'no-target' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(safe(results.boost100))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">extra balance from +{currencyPrefix}100/month</p>
                          <p className="text-slate-400 text-xs mt-0.5">added to your current monthly contribution</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.boost100FV))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">New balance</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{currencyPrefix}100<span className="text-slate-400 font-normal text-xs">/mo</span></div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Extra contribution</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Add a target amount above to unlock personalised goal analysis.
                        </p>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmt(safe(results.boost100))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(safe(results.boost100FV))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">New balance</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{currencyPrefix}100<span className="text-slate-400 font-normal text-sm">/mo</span></div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Extra contribution</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">extra balance from +{currencyPrefix}100/month</p>
                          <p className="text-slate-400 text-xs mt-0.5">added to your current monthly contribution</p>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Add a target amount above to unlock personalised goal analysis.
                        </p>
                      </div>
                    </>
                  ))()}

                </div>

              </div>

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Card 1 — Time Horizon Impact */}
                <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Time Horizon Impact</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    At your current rate, your balance would reach{' '}
                    <strong className="text-sky-700">{fmt(safe(results.balAt10))}</strong> in 10 years,{' '}
                    <strong className="text-sky-700">{fmt(safe(results.balAt20))}</strong> in 20 years, and{' '}
                    <strong className="text-sky-700">{fmt(safe(results.balAt30))}</strong> in 30 years. The longer you stay invested, the faster compounding accelerates your balance.
                  </p>
                </div>

                {/* Card 2 — Contribution Power */}
                <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                      <Zap className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Contribution Power</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Adding an extra <strong className="text-emerald-700">{currencyPrefix}100/month</strong> to your contributions would grow your final balance by{' '}
                    <strong className="text-emerald-700">{fmt(safe(results.boost100))}</strong> — reaching{' '}
                    <strong className="text-emerald-700">{fmt(safe(results.boost100FV))}</strong> after {results.yearsInvested} years. Consistent contributions are amplified by compounding over time.
                  </p>
                </div>

                {/* Card 3 — Frequency Impact */}
                {(() => {
                  const showGainToMonthly = results.freqGainVsMonthly > 0;
                  const showBenefitVsAnnual = results.freqGainVsAnnual > 0;
                  const freqLabel = FREQ_OPTIONS.find(f => f.key === results.freq)?.label ?? '';
                  return (
                    <div className="rounded-2xl p-4" style={{ background: '#fdf4ff', border: '1px solid #e9d5ff' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center justify-center shrink-0"
                          style={{ width: 28, height: 28, borderRadius: 8, background: '#f3e8ff' }}>
                          <AlertTriangle className="w-3.5 h-3.5 text-purple-500" aria-hidden />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Frequency Impact</p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {showGainToMonthly
                          ? <>Switching from <strong className="text-purple-700">{freqLabel}</strong> to <strong className="text-purple-700">Monthly</strong> compounding would add an estimated <strong className="text-purple-700">{fmt(safe(results.freqGainVsMonthly))}</strong> to your final balance — without changing your contributions or rate.</>
                          : showBenefitVsAnnual
                            ? <>You are using <strong className="text-purple-700">{freqLabel}</strong> compounding. Compared to annual compounding at the same rate, this adds approximately <strong className="text-purple-700">{fmt(safe(results.freqGainVsAnnual))}</strong> to your final balance — the power of more frequent compounding.</>
                            : <>You are using <strong className="text-purple-700">{freqLabel}</strong> compounding — one of the most frequent available. Your interest is calculated and compounded as often as possible at your stated rate.</>
                        }
                      </p>
                    </div>
                  );
                })()}

              </div>
            </>
          )}

        </div>

        <div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
          style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
          <p className="text-slate-400 text-xs leading-relaxed">
            <strong className="text-slate-500 font-semibold">Disclaimer:</strong>{' '}
            This analysis is for illustrative and informational purposes only. Results are estimates based on a fixed nominal interest rate and do not account for taxes, inflation, fees, or market volatility. This does not constitute financial, investment, tax, or legal advice. Consult a qualified financial advisor before making financial decisions.
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
        This calculator is for illustrative and informational purposes only. Results are estimates and depend on assumed interest rates, contribution amounts, compounding frequency, and time horizon. Actual investment performance, fees, taxes, and market conditions will vary. This does not constitute financial, investment, tax, or legal advice. Consult a qualified financial advisor before making financial decisions.
      </p>

    </div>
  );
}
