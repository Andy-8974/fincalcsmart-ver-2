'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip, DonutChart, type PieSlice } from '../_mortgage-shared/ui';
import { fmtCAD, fmtUSD } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  Activity, AlertTriangle, BookOpen, Download,
  HelpCircle, Mail, ShieldAlert, Sparkles, TrendingUp, Umbrella, Zap,
} from 'lucide-react';
import { buildEmergencyFundPDF } from '@/lib/pdf/adapters/emergencyFundAdapter';

// ─── Types ────────────────────────────────────────────────────────────────────

type StabilityKey = 'stable' | 'moderate' | 'variable';

interface FormState {
  monthlyExpenses: string;
  currentSavings: string;
  monthlyContribution: string;
}

interface EFResults {
  monthlyExpenses: number;
  currentSavings: number;
  monthlyContribution: number;
  stability: StabilityKey;
  targetMonths: number;
  targetAmount: number;
  currentCoverageMonths: number;
  gap: number;
  surplus: number;
  monthsToTarget: number | null;
  suggestedMonthly: number;
  boost100Months: number | null;
  readinessScore: number;
  readinessLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  readinessStatus: 'Healthy' | 'Watch' | 'Caution';
  readinessColor: string;
  readinessBg: string;
  targetProgress: number;
  tpColor: string;
  tpBg: string;
  tpBadge: 'On Track' | 'Close' | 'Behind';
  leverState: 'below-saving' | 'at-target' | 'below-no-savings';
  recommendedLabel: string;
  recommendedMin: number;
  underCovered: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  monthlyExpenses: '3000',
  currentSavings: '10000',
  monthlyContribution: '500',
};

const DEFAULT_STABILITY: StabilityKey = 'moderate';
const DEFAULT_TARGET_MONTHS = 6;

const STABILITY_OPTIONS: { key: StabilityKey; label: string }[] = [
  { key: 'stable',   label: 'Stable'   },
  { key: 'moderate', label: 'Moderate' },
  { key: 'variable', label: 'Variable' },
];

const COVERAGE_OPTIONS = [3, 6, 9, 12] as const;

const CHART_MILESTONES = [3, 6, 12, 18, 24] as const;

const STABILITY_RECS: Record<StabilityKey, { label: string; min: number; max: number }> = {
  stable:   { label: '3–4 months', min: 3,  max: 4  },
  moderate: { label: '4–6 months', min: 4,  max: 6  },
  variable: { label: '9–12 months', min: 9, max: 12 },
};

// ─── Math helpers ─────────────────────────────────────────────────────────────

function safe(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
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

function fmtMonths(n: number): string {
  const c = Math.max(1, Math.ceil(n));
  if (c < 12) return `${c} mo`;
  const yr = Math.floor(c / 12);
  const mo = c % 12;
  return mo === 0 ? `${yr} yr` : `${yr} yr ${mo} mo`;
}

function computeResults(
  form: FormState,
  stability: StabilityKey,
  targetMonths: number,
): EFResults | null {
  const monthlyExpenses = Math.max(0, parseFloat(form.monthlyExpenses) || 0);
  const currentSavings  = Math.max(0, parseFloat(form.currentSavings)  || 0);
  const monthlyContribution = Math.max(0, parseFloat(form.monthlyContribution) || 0);

  if (monthlyExpenses <= 0) return null;

  const targetAmount = targetMonths * monthlyExpenses;
  const currentCoverageMonths = currentSavings / monthlyExpenses;
  const gap     = Math.max(0, targetAmount - currentSavings);
  const surplus = Math.max(0, currentSavings - targetAmount);

  const monthsToTarget: number | null = gap > 0 && monthlyContribution > 0
    ? gap / monthlyContribution
    : null;
  const suggestedMonthly = gap > 0 ? gap / 12 : 0;
  const boost100Months: number | null = gap > 0 && (monthlyContribution + 100) > 0
    ? gap / (monthlyContribution + 100)
    : null;

  const rawScore = targetAmount > 0 ? (currentSavings / targetAmount) * 100 : 0;
  const readinessScore = Math.round(Math.min(100, Math.max(0, rawScore)));
  const readinessLabel: EFResults['readinessLabel'] =
    readinessScore >= 80 ? 'Excellent' : readinessScore >= 60 ? 'Good' : readinessScore >= 40 ? 'Fair' : 'Poor';
  const readinessStatus: EFResults['readinessStatus'] =
    readinessLabel === 'Poor' ? 'Caution' : readinessLabel === 'Fair' ? 'Watch' : 'Healthy';
  const readinessColor = readinessStatus === 'Healthy' ? '#1DB584' : readinessStatus === 'Watch' ? '#f59e0b' : '#ef4444';
  const readinessBg   = readinessStatus === 'Healthy' ? 'rgba(29,181,132,0.10)' : readinessStatus === 'Watch' ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

  const targetProgress = Math.min(200, rawScore);
  const tpOnTrack = targetProgress >= 100;
  const tpClose   = targetProgress >= 70 && targetProgress < 100;
  const tpColor = tpOnTrack ? '#1DB584' : tpClose ? '#f59e0b' : '#ef4444';
  const tpBg    = tpOnTrack ? 'rgba(29,181,132,0.10)' : tpClose ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';
  const tpBadge: EFResults['tpBadge'] = tpOnTrack ? 'On Track' : tpClose ? 'Close' : 'Behind';

  const rec = STABILITY_RECS[stability];
  const underCovered = targetMonths < rec.min;

  let leverState: EFResults['leverState'];
  if (currentSavings >= targetAmount) {
    leverState = 'at-target';
  } else if (monthlyContribution > 0) {
    leverState = 'below-saving';
  } else {
    leverState = 'below-no-savings';
  }

  return {
    monthlyExpenses, currentSavings, monthlyContribution, stability, targetMonths,
    targetAmount, currentCoverageMonths, gap, surplus,
    monthsToTarget, suggestedMonthly, boost100Months,
    readinessScore, readinessLabel, readinessStatus, readinessColor, readinessBg,
    targetProgress, tpColor, tpBg, tpBadge,
    leverState,
    recommendedLabel: rec.label,
    recommendedMin: rec.min,
    underCovered,
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

interface EmergencyFundCalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmergencyFundCalculator({
  formulaContent,
  faqItems = [],
}: EmergencyFundCalculatorProps) {
  const { region } = useRegion();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [stability, setStability] = useState<StabilityKey>(DEFAULT_STABILITY);
  const [targetMonths, setTargetMonths] = useState<number>(DEFAULT_TARGET_MONTHS);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isCA = region === 'ca';
  const currencyPrefix = isCA ? 'CA$' : '$';
  const fmt = isCA ? fmtCAD : fmtUSD;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const results = useMemo(
    () => computeResults(form, stability, targetMonths),
    [form, stability, targetMonths],
  );

  const donutSlices = useMemo((): PieSlice[] | null => {
    if (!results) return null;
    if (results.surplus > 0) {
      return [
        { label: 'Fund Target',  value: results.targetAmount, color: '#1DB584', alwaysShow: true },
        { label: 'Surplus',      value: results.surplus,      color: '#0D1B2A', alwaysShow: true },
      ];
    }
    return [
      { label: 'Current Savings', value: results.currentSavings, color: '#1DB584', alwaysShow: true },
      { label: 'Remaining Gap',   value: results.gap,            color: '#334155', alwaysShow: results.gap > 0 },
    ];
  }, [results]);

  function scrollToAI() {
    const el = document.getElementById('ai-analysis');
    if (!el) return;
    const navH = (document.querySelector('header') as HTMLElement | null)?.getBoundingClientRect().height ?? 64;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - 16), behavior: 'smooth' });
  }

  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      await buildEmergencyFundPDF({
        monthlyExpenses:       results.monthlyExpenses,
        currentSavings:        results.currentSavings,
        monthlyContribution:   results.monthlyContribution,
        stability:             results.stability,
        targetMonths:          results.targetMonths,
        targetAmount:          results.targetAmount,
        currentCoverageMonths: results.currentCoverageMonths,
        gap:                   results.gap,
        surplus:               results.surplus,
        monthsToTarget:        results.monthsToTarget,
        suggestedMonthly:      results.suggestedMonthly,
        readinessScore:        results.readinessScore,
        readinessLabel:        results.readinessLabel,
        readinessStatus:       results.readinessStatus,
        targetProgress:        results.targetProgress,
        tpBadge:               results.tpBadge,
        leverState:            results.leverState,
        recommendedLabel:      results.recommendedLabel,
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
        @keyframes teal-glow-ef {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-ef {
          animation: teal-glow-ef 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-ef:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
        .ef-pill { flex: 1; min-width: 0; text-align: center; }
        .ef-stability-pill { flex: 1; min-width: calc(50% - 4px); text-align: center; }
        @media (min-width: 640px) { .ef-stability-pill { min-width: 0; } }
        .ef-pills { display: flex; flex-wrap: wrap; gap: 6px; }
      `}</style>

      {/* ══ Block A: Input Card + Results Card ══════════════════════════════════ */}
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
                <Umbrella size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Emergency Fund
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Fund Details</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

              {/* Left column */}
              <div className="space-y-3 min-w-0">

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Monthly Essential Expenses
                    <Tooltip text="Your core monthly living costs — rent/mortgage, utilities, groceries, insurance, and minimum debt payments. Exclude discretionary spending." />
                  </label>
                  <NumericInput
                    value={form.monthlyExpenses}
                    onChange={(v) => set('monthlyExpenses', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Current Emergency Savings
                    <Tooltip text="The amount you currently have set aside specifically for emergencies in an accessible account. Enter 0 if starting from scratch." />
                  </label>
                  <NumericInput
                    value={form.currentSavings}
                    onChange={(v) => set('currentSavings', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Monthly Savings Contribution
                    <Tooltip text="How much you plan to add to your emergency fund each month. Enter 0 if you are not currently contributing." />
                  </label>
                  <NumericInput
                    value={form.monthlyContribution}
                    onChange={(v) => set('monthlyContribution', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

              </div>

              {/* Right column */}
              <div className="border-l pl-2 md:pl-5 space-y-3 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>

                {/* Income Stability pills */}
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Income Stability
                    <Tooltip text="How predictable your income is. Stable (salaried employment): 3–4 months recommended. Moderate (variable pay or hourly): 4–6 months. Variable (freelance, self-employed, commission): 9–12 months." />
                  </label>
                  <div className="ef-pills">
                    {STABILITY_OPTIONS.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        className="ef-stability-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
                        onClick={() => setStability(s.key)}
                        style={
                          stability === s.key
                            ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                            : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                        }
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Coverage pills */}
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Target Coverage
                    <Tooltip text="How many months of expenses you want your emergency fund to cover. This is your personal savings target — the AI Analysis will flag if it diverges from the recommendation for your income type." />
                  </label>
                  <div className="ef-pills">
                    {COVERAGE_OPTIONS.map((mo) => (
                      <button
                        key={mo}
                        type="button"
                        className="ef-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
                        onClick={() => setTargetMonths(mo)}
                        style={
                          targetMonths === mo
                            ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                            : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                        }
                      >
                        {mo}mo
                      </button>
                    ))}
                  </div>
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
                  Enter your monthly expenses to see your emergency fund target.
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
                    Current Coverage
                  </p>
                  <p style={{
                    color: results.currentSavings >= results.targetAmount ? '#1DB584' : results.currentCoverageMonths >= results.targetMonths * 0.7 ? '#f59e0b' : '#ffffff',
                    fontSize: '38px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 8,
                  }}>
                    {results.currentCoverageMonths.toFixed(1)} <span style={{ fontSize: '20px', fontWeight: 600, letterSpacing: 0 }}>mo</span>
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: 6, fontWeight: 500 }}>
                    covering {results.currentCoverageMonths.toFixed(1)} months · target: {results.targetMonths} months
                  </p>
                </div>

                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Fund Target</span>
                    <span className="text-[13px] font-semibold text-white">{fmt(results.targetAmount)}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>
                      {results.gap > 0 ? 'Savings Gap' : 'Surplus'}
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: results.gap > 0 ? '#f59e0b' : '#1DB584' }}>
                      {results.gap > 0 ? '−' : '+'}{fmt(results.gap > 0 ? results.gap : results.surplus)}
                    </span>
                  </div>

                  {results.monthsToTarget !== null && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Months to Target</span>
                      <span className="text-[13px] font-semibold text-white">
                        {fmtMonths(results.monthsToTarget)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Recommended</span>
                    <span className="text-[13px] font-semibold" style={{ color: results.underCovered ? '#f59e0b' : '#1DB584' }}>
                      {results.recommendedLabel}
                    </span>
                  </div>

                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See your coverage score, savings timeline, and how to close the gap faster.
                  </p>
                  <button
                    className="btn-ai-cta-ef w-full font-bold overflow-hidden"
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
                      Review Fund Analysis ↓
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
                      See AI Fund Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* ══ Block C: Coverage Donut + Savings Timeline ════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Left: Coverage Donut ──────────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Savings breakdown
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Emergency Fund Coverage</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter your expenses to see coverage breakdown.
                </p>
              </div>
            )}

            {results && donutSlices && (() => {
              const isOnTrack = results.surplus > 0;
              const denominator = isOnTrack ? results.currentSavings : results.targetAmount;
              const rows = isOnTrack
                ? [
                    { label: 'Fund Target',  value: results.targetAmount, color: '#1DB584' },
                    { label: 'Surplus',      value: results.surplus,      color: '#0D1B2A' },
                  ]
                : [
                    { label: 'Current Savings', value: results.currentSavings, color: '#1DB584' },
                    { label: 'Remaining Gap',   value: results.gap,            color: '#334155' },
                  ];
              const summaryLabel = isOnTrack ? 'Total Savings' : 'Fund Target';
              const summaryValue = isOnTrack ? results.currentSavings : results.targetAmount;

              return (
                <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                  <div className="shrink-0">
                    <DonutChart
                      slices={donutSlices}
                      className="w-52 h-52"
                      centerValue={fmt(safe(results.targetAmount))}
                      centerLabel="target"
                    />
                  </div>
                  <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    {rows.map(({ label, value, color }) => {
                      const pct = denominator > 0 ? Math.round((safe(value) / denominator) * 100) : 0;
                      return (
                        <div key={label} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                            <span style={{ color: '#4B5563', fontSize: '12.5px' }}>{label}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-400">{pct}%</span>
                            <span className="font-semibold" style={{ color, fontSize: '12.5px' }}>{fmt(safe(value))}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between py-2">
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>{summaryLabel}</span>
                      <span className="font-bold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmt(safe(summaryValue))}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        {/* ── Right: Savings Timeline chart ─────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Savings over time
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Savings Timeline</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter your details to see the savings timeline.
                </p>
              </div>
            )}

            {results && (() => {
              const CHART_H = 188;
              const XLABEL_H = 30;
              const YAXIS_W = 40;

              const chartData = CHART_MILESTONES.map((m) => ({
                months: m,
                projected: results.currentSavings + results.monthlyContribution * m,
                label: `${m}mo`,
              }));

              const firstReachIdx = chartData.findIndex((d) => d.projected >= results.targetAmount);
              const allVals = [...chartData.map((d) => d.projected), results.targetAmount];
              const yMax = niceMax(Math.max(...allVals, 1));

              const showTargetLine = yMax > 0;
              const targetPx = showTargetLine
                ? Math.round((results.targetAmount / yMax) * CHART_H)
                : 0;
              const targetLineVisible = showTargetLine && targetPx > 8 && targetPx <= CHART_H;

              const projected24 = chartData[4].projected;
              const statRows = [
                {
                  label: 'AT 24 MONTHS',
                  value: fmt(safe(projected24)),
                  color: projected24 >= results.targetAmount ? '#1DB584' : '#0D1B2A' as const,
                },
                { label: 'CONTRIBUTION', value: `${fmt(results.monthlyContribution)}/mo`, color: '#0D1B2A' as const },
                { label: 'TARGET', value: fmt(results.targetAmount), color: '#334155' as const },
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
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#334155' }} />
                        <span style={{ fontSize: '10px', color: '#6B7A8D' }}>Below target</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#1DB584' }} />
                        <span style={{ fontSize: '10px', color: '#6B7A8D' }}>At target</span>
                      </div>
                      {targetLineVisible && (
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
                        {fmtShort(yMax * frac)}
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
                      {targetLineVisible && (
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

                      {/* Bars */}
                      <div className="absolute left-0 right-0 flex gap-0.5" style={{ bottom: XLABEL_H, height: CHART_H }}>
                        {chartData.map((d, idx) => {
                          const barH = yMax > 0 ? Math.max(2, Math.round((d.projected / yMax) * CHART_H)) : 2;
                          const isSelected = idx === firstReachIdx;
                          const barColor = d.projected >= results.targetAmount ? '#1DB584' : '#334155';

                          return (
                            <div key={d.months} className="flex-1 flex justify-center items-end">
                              <div style={{ position: 'relative', width: '48%', minWidth: 6 }}>

                                {!isSelected && barH > 0 && (
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
                                    {fmtShort(d.projected)}
                                  </div>
                                )}

                                <div
                                  className="overflow-hidden"
                                  style={{ height: barH, width: '100%', borderRadius: '4px 4px 0 0', background: barColor }}
                                />

                                {isSelected && (
                                  <>
                                    <div style={{
                                      position: 'absolute', top: -7, left: -7, right: -7, bottom: 0,
                                      borderTop: '2px solid #1DB584',
                                      borderLeft: '2px solid #1DB584',
                                      borderRight: '2px solid #1DB584',
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
                                        <p style={{ fontSize: '9px', fontWeight: 700, color: '#6B7A8D', marginBottom: 3 }}>Goal</p>
                                        <p style={{ fontSize: '13px', fontWeight: 800, color: '#1DB584', lineHeight: 1 }}>{fmtShort(d.projected)}</p>
                                        <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(29,181,132,0.28)' }} />
                                        <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #fff' }} />
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
                        {chartData.map((d, idx) => (
                          <div key={d.months} className="flex-1 flex justify-center items-center">
                            {idx === firstReachIdx ? (
                              <span className="rounded-full"
                                style={{ background: '#1DB584', color: '#fff', fontSize: '8px', fontWeight: 700, lineHeight: 1, display: 'inline-block', padding: '3px 7px' }}>
                                {d.label}
                              </span>
                            ) : (
                              <span style={{ fontSize: '8px', color: '#9BA8B5' }}>{d.label}</span>
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
              FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Fund Analysis
            </p>
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
                Enter your expenses to see the fund analysis.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 340 }}>
                The analysis will show your Emergency Readiness Score, target progress, and how to reach your goal faster.
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
                    <span className="text-sm font-bold text-slate-800">Fund Analysis</span>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row">

                    {/* Gauge 1: Emergency Readiness Score */}
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
                        {results.currentCoverageMonths.toFixed(1)} months covered of your {results.targetMonths}-month target.
                        {results.readinessStatus === 'Healthy'
                          ? ' Your emergency fund is well-funded.'
                          : results.readinessStatus === 'Watch'
                          ? ' Continue building toward your full target.'
                          : ' Prioritise growing your emergency fund.'}
                      </p>
                    </div>

                    <div className="hidden sm:block self-stretch w-px mx-1" style={{ background: 'rgba(15,41,66,0.08)' }} />
                    <div className="block sm:hidden h-px w-full mb-3" style={{ background: 'rgba(15,41,66,0.08)' }} />

                    {/* Gauge 2: Target Progress */}
                    {(() => {
                      const fillPct = Math.min(100, results.targetProgress);
                      const GR = 48; const GC = 2 * Math.PI * GR;
                      const GARC = (240 / 360) * GC;
                      const GFIL = GARC * (fillPct / 100);
                      return (
                        <div className="flex-1 flex flex-col items-center text-center min-w-0 pt-0 sm:pl-3">
                          <div className="flex items-center w-full mb-2">
                            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Target Progress</p>
                            <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                              style={{ fontSize: '10px', fontWeight: 700, background: results.tpBg, color: results.tpColor }}>
                              {results.tpBadge}
                            </span>
                          </div>
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 66, 66)" />
                              <circle cx="66" cy="66" r={GR} fill="none" stroke={results.tpColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>
                                {Math.round(results.targetProgress)}<span style={{ fontSize: '1rem' }}>%</span>
                              </span>
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>of target</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: results.tpColor }}>{results.tpBadge}</span>
                            </div>
                          </div>
                          <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                            {results.leverState === 'at-target'
                              ? `Your ${fmt(results.currentSavings)} covers ${results.currentCoverageMonths.toFixed(1)} months — above your ${results.targetMonths}-month target.`
                              : `You need ${fmt(results.gap)} more to reach your ${results.targetMonths}-month target of ${fmt(results.targetAmount)}.`}
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
                      {results.leverState === 'at-target' ? 'Goal Achieved' : 'Smart Optimization Found'}
                    </span>
                  </div>

                  {/* State A: below-saving */}
                  {results.leverState === 'below-saving' && results.monthsToTarget !== null && (() => {
                    const mtt = results.monthsToTarget;
                    return (
                      <>
                        <div className="flex flex-col gap-3 mt-1 lg:hidden">
                          <div className="rounded-xl flex items-center justify-center px-4 py-4"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold"
                              style={{ fontSize: 'clamp(1.6rem, 8vw, 2.2rem)', color: '#1DB584', letterSpacing: '-1px', lineHeight: 1 }}>
                              {fmtMonths(mtt)}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">to reach your {results.targetMonths}-month emergency fund target</p>
                            <p className="text-slate-400 text-xs mt-0.5">at {fmt(results.monthlyContribution)}/month contribution</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                              <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(results.gap)}</div>
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Savings gap</span>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                              <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(results.monthlyContribution)}<span className="text-slate-400 font-normal text-xs">/mo</span></div>
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Monthly saving</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                          <div className="flex items-stretch gap-3">
                            <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                              <span className="font-extrabold"
                                style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1px', lineHeight: 1 }}>
                                {fmtMonths(mtt)}
                              </span>
                            </div>
                            <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                              <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(results.gap)}</div>
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Savings gap</span>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                              <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(results.monthlyContribution)}<span className="text-slate-400 font-normal text-sm">/mo</span></div>
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Monthly saving</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">to reach your {results.targetMonths}-month emergency fund target</p>
                            <p className="text-slate-400 text-xs mt-0.5">at {fmt(results.monthlyContribution)}/month contribution</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* State B: at-target */}
                  {results.leverState === 'at-target' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(results.surplus)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">emergency cushion above your {results.targetMonths}-month target</p>
                          <p className="text-slate-400 text-xs mt-0.5">your fund covers {results.currentCoverageMonths.toFixed(1)} months of essential expenses</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(results.currentSavings)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Current savings</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{results.currentCoverageMonths.toFixed(1)} mo</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Coverage</span>
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
                              {fmt(results.surplus)}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(results.currentSavings)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Current savings</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{results.currentCoverageMonths.toFixed(1)} mo</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Coverage</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">emergency cushion above your {results.targetMonths}-month target</p>
                          <p className="text-slate-400 text-xs mt-0.5">your fund covers {results.currentCoverageMonths.toFixed(1)} months of essential expenses</p>
                        </div>
                      </div>
                    </>
                  ))()}

                  {/* State C: below-no-savings */}
                  {results.leverState === 'below-no-savings' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#f59e0b', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(results.gap)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">savings gap — no monthly contribution entered</p>
                          <p className="text-slate-400 text-xs mt-0.5">to reach target in 12 months, save {fmt(Math.round(results.suggestedMonthly))}/month</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(results.targetAmount)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Target amount</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(Math.round(results.suggestedMonthly))}<span className="text-slate-400 font-normal text-xs">/mo</span></div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Suggested saving</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#f59e0b', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmt(results.gap)}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(results.targetAmount)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Target amount</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(Math.round(results.suggestedMonthly))}<span className="text-slate-400 font-normal text-sm">/mo</span></div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Suggested saving</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">savings gap — no monthly contribution entered</p>
                          <p className="text-slate-400 text-xs mt-0.5">to reach your target in 12 months, contribute approximately {fmt(Math.round(results.suggestedMonthly))}/month</p>
                        </div>
                      </div>
                    </>
                  ))()}

                </div>

              </div>

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Card 1 — Coverage Check */}
                <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Coverage Check</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.leverState === 'at-target'
                      ? <>Your current savings of <strong className="text-emerald-700">{fmt(results.currentSavings)}</strong> cover <strong className="text-emerald-700">{results.currentCoverageMonths.toFixed(1)} months</strong> of essential expenses — meeting your {results.targetMonths}-month target.</>
                      : results.currentCoverageMonths >= 1
                      ? <>Your current savings cover <strong className="text-emerald-700">{results.currentCoverageMonths.toFixed(1)} months</strong> of essential expenses. You need <strong className="text-emerald-700">{fmt(results.gap)}</strong> more to reach your {results.targetMonths}-month target of {fmt(results.targetAmount)}.</>
                      : <>Your current savings cover less than one month of expenses. Your {results.targetMonths}-month target is <strong className="text-emerald-700">{fmt(results.targetAmount)}</strong> — a gap of {fmt(results.gap)}.</>}
                  </p>
                </div>

                {/* Card 2 — Risk Adjustment */}
                <div className="rounded-2xl p-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#fef3c7' }}>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Risk Adjustment</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {stability === 'stable'
                      ? <>Stable, predictable income typically warrants <strong className="text-amber-700">3–4 months</strong> of coverage. Your {results.targetMonths}-month target {results.targetMonths <= 4 ? 'is within this range.' : `exceeds this guideline — adding extra security for a stable income situation.`}</>
                      : stability === 'moderate'
                      ? <>Moderate income variability typically warrants <strong className="text-amber-700">4–6 months</strong> of coverage. Your {results.targetMonths}-month target {results.targetMonths >= 4 && results.targetMonths <= 6 ? 'is within the recommended range.' : results.targetMonths < 4 ? 'is below the suggested 4-month minimum for variable pay.' : `provides additional security beyond the standard guideline.`}</>
                      : <>Variable or self-employed income typically warrants <strong className="text-amber-700">9–12 months</strong> of coverage due to income gaps and irregular cash flow. Your {results.targetMonths}-month target {results.targetMonths >= 9 ? 'meets this guideline.' : `is below the recommended 9-month minimum — consider extending your target.`}</>}
                  </p>
                </div>

                {/* Card 3 — Savings Plan */}
                <div className="rounded-2xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9' }}>
                      <Zap className="w-3.5 h-3.5 text-slate-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Savings Plan</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.leverState === 'at-target'
                      ? <>Your emergency fund is fully funded. Maintaining your {fmt(results.monthlyContribution > 0 ? results.monthlyContribution : 0)}{results.monthlyContribution > 0 ? '/month' : ''} contribution keeps your fund growing with expenses over time.</>
                      : results.monthlyContribution > 0 && results.monthsToTarget !== null
                      ? <>
                          At <strong className="text-slate-800">{fmt(results.monthlyContribution)}/month</strong>, you will reach your target in approximately <strong className="text-slate-800">{fmtMonths(results.monthsToTarget)}</strong>.
                          {results.boost100Months !== null && results.monthsToTarget - results.boost100Months >= 1
                            ? ` Adding an extra ${currencyPrefix}100/month would get you there in ${fmtMonths(results.boost100Months)} — ${fmtMonths(results.monthsToTarget - results.boost100Months)} sooner.`
                            : ''}
                        </>
                      : <>No monthly contribution is set. To reach your {fmt(results.targetAmount)} target in 12 months, contribute approximately <strong className="text-slate-800">{fmt(Math.round(results.suggestedMonthly))}/month</strong>. Even a small regular contribution builds your fund consistently.</>}
                  </p>
                </div>

              </div>
            </>
          )}

        </div>

        <div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
          style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
          <p className="text-slate-400 text-xs leading-relaxed">
            <strong className="text-slate-500 font-semibold">Disclaimer:</strong>{' '}
            This analysis is for illustrative and informational purposes only. Results are estimates based on the values entered and may not reflect changes in expenses, income, emergencies, inflation, taxes, or personal circumstances. This does not constitute financial, tax, legal, or professional advice. Consider speaking with a qualified financial professional before making major financial decisions.
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
        This calculator is for illustrative and informational purposes only. Results are estimates based on the values entered and may not reflect changes in expenses, income, emergencies, inflation, taxes, or personal circumstances. This does not constitute financial, tax, legal, or professional advice. Consider speaking with a qualified financial professional before making major financial decisions.
      </p>

    </div>
  );
}
