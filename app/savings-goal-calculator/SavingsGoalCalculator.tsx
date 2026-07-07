'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip, DonutChart, type PieSlice } from '../_mortgage-shared/ui';
import { fmtCAD, fmtUSD } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  Activity, AlertTriangle, BookOpen, Download,
  HelpCircle, Mail, ShieldAlert, Sparkles, Target, TrendingUp, Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type GoalType = 'vehicle' | 'home' | 'vacation' | 'education' | 'other';

interface FormState {
  savingsGoal: string;
  currentSavings: string;
  monthlyContribution: string;
  annualReturn: string;
  timeHorizon: string;
}

interface SGResults {
  savingsGoal: number;
  currentSavings: number;
  monthlyContribution: number;
  annualReturn: number;
  timeHorizon: number;
  n: number;
  r: number;
  projectedSavings: number;
  totalContributions: number;
  estimatedGrowth: number;
  goalGap: number;
  surplus: number;
  progressPct: number;
  requiredMonthly: number;
  additionalMonthlyNeeded: number;
  timeToGoalMonths: number | null;
  alreadyReached: boolean;
  neverReached: boolean;
  readinessScore: number;
  readinessLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  readinessStatus: 'On Track' | 'Nearly There' | 'Behind Target' | 'Needs More Monthly Savings';
  readinessColor: string;
  readinessBg: string;
  leverState: 'on-track' | 'behind-saving' | 'behind-no-saving';
  chartData: Array<{ year: number; projected: number; contribBase: number }>;
  goalReachedYear: number | null;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  savingsGoal: '25000',
  currentSavings: '5000',
  monthlyContribution: '500',
  annualReturn: '5.0',
  timeHorizon: '5',
};

const GOAL_TYPES: { key: GoalType; label: string }[] = [
  { key: 'vehicle',   label: 'Vehicle'           },
  { key: 'home',      label: 'Home Down Payment' },
  { key: 'vacation',  label: 'Vacation'          },
  { key: 'education', label: 'Education'         },
  { key: 'other',     label: 'Other'             },
];

const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  vehicle:   'Vehicle',
  home:      'Home Down Payment',
  vacation:  'Vacation',
  education: 'Education',
  other:     'Goal',
};

const READINESS_TITLE: Record<GoalType, string> = {
  vehicle:   'Vehicle Goal Readiness',
  home:      'Down Payment Readiness',
  vacation:  'Vacation Goal Readiness',
  education: 'Education Goal Readiness',
  other:     'Goal Readiness Score',
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

function fvSavings(principal: number, r: number, n: number): number {
  return safe(principal * Math.pow(1 + r, n));
}

function fvContributions(monthly: number, r: number, n: number): number {
  if (n === 0) return 0;
  if (r === 0) return safe(monthly * n);
  return safe(monthly * (Math.pow(1 + r, n) - 1) / r);
}

function computeChartYears(timeHorizon: number): number[] {
  if (timeHorizon <= 0) return [];
  if (timeHorizon <= 7) return Array.from({ length: timeHorizon }, (_, i) => i + 1);
  const step = Math.ceil(timeHorizon / 6);
  const years: number[] = [];
  for (let y = step; y < timeHorizon; y += step) years.push(y);
  years.push(timeHorizon);
  return years.slice(0, 8);
}

function solveTimeToGoal(
  currentSavings: number,
  monthly: number,
  goal: number,
  r: number,
): { months: number | null; alreadyReached: boolean; neverReached: boolean } {
  if (currentSavings >= goal) return { months: null, alreadyReached: true, neverReached: false };
  if (monthly <= 0 && r === 0) return { months: null, alreadyReached: false, neverReached: true };
  let bal = currentSavings;
  for (let m = 1; m <= 600; m++) {
    bal = bal * (1 + r) + monthly;
    if (bal >= goal) return { months: m, alreadyReached: false, neverReached: false };
  }
  return { months: null, alreadyReached: false, neverReached: true };
}

function computeResults(form: FormState): SGResults | null {
  const savingsGoal         = Math.max(0, parseFloat(form.savingsGoal)          || 0);
  const currentSavings      = Math.max(0, parseFloat(form.currentSavings)       || 0);
  const monthlyContribution = Math.max(0, parseFloat(form.monthlyContribution)  || 0);
  const annualReturn        = Math.max(0, parseFloat(form.annualReturn)          || 0);
  const timeHorizon         = Math.max(1, Math.floor(parseFloat(form.timeHorizon) || 1));

  if (savingsGoal <= 0) return null;

  const r = annualReturn / 100 / 12;
  const n = timeHorizon * 12;

  const FV_current  = fvSavings(currentSavings, r, n);
  const FV_contribs = fvContributions(monthlyContribution, r, n);
  const projectedSavings = safe(FV_current + FV_contribs);

  const totalContributions = safe(currentSavings + monthlyContribution * n);
  const estimatedGrowth    = safe(projectedSavings - totalContributions);
  const goalGap  = Math.max(0, savingsGoal - projectedSavings);
  const surplus  = Math.max(0, projectedSavings - savingsGoal);
  const rawPct   = (projectedSavings / savingsGoal) * 100;
  const progressPct = Math.min(200, safe(rawPct));

  // Reverse-solve required monthly PMT
  const FV_needed = Math.max(0, savingsGoal - FV_current);
  let requiredMonthly = 0;
  if (FV_needed > 0 && n > 0) {
    if (r === 0) {
      requiredMonthly = FV_needed / n;
    } else {
      requiredMonthly = FV_needed * r / (Math.pow(1 + r, n) - 1);
    }
  }
  requiredMonthly = safe(requiredMonthly);
  const additionalMonthlyNeeded = Math.max(0, requiredMonthly - monthlyContribution);

  const { months: timeToGoalMonths, alreadyReached, neverReached } = solveTimeToGoal(
    currentSavings, monthlyContribution, savingsGoal, r,
  );

  // Readiness score / label
  const readinessScore = Math.round(Math.min(100, Math.max(0, progressPct)));
  const readinessLabel: SGResults['readinessLabel'] =
    readinessScore >= 80 ? 'Excellent' : readinessScore >= 60 ? 'Good' : readinessScore >= 40 ? 'Fair' : 'Poor';
  let readinessStatus: SGResults['readinessStatus'];
  if (progressPct >= 100)      readinessStatus = 'On Track';
  else if (progressPct >= 70)  readinessStatus = 'Nearly There';
  else if (progressPct >= 40)  readinessStatus = 'Behind Target';
  else                         readinessStatus = 'Needs More Monthly Savings';

  const readinessColor =
    readinessStatus === 'On Track'    ? '#1DB584' :
    readinessStatus === 'Nearly There'? '#f59e0b' : '#ef4444';
  const readinessBg =
    readinessStatus === 'On Track'    ? 'rgba(29,181,132,0.10)' :
    readinessStatus === 'Nearly There'? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

  const leverState: SGResults['leverState'] =
    projectedSavings >= savingsGoal ? 'on-track' :
    monthlyContribution > 0         ? 'behind-saving' : 'behind-no-saving';

  // Chart data
  const chartYears = computeChartYears(timeHorizon);
  const chartData = chartYears.map((yr) => {
    const ny    = yr * 12;
    const proj  = safe(fvSavings(currentSavings, r, ny) + fvContributions(monthlyContribution, r, ny));
    const base  = safe(currentSavings + monthlyContribution * ny);
    return { year: yr, projected: proj, contribBase: Math.min(proj, base) };
  });
  const goalReachedYear = chartData.find((d) => d.projected >= savingsGoal)?.year ?? null;

  return {
    savingsGoal, currentSavings, monthlyContribution, annualReturn, timeHorizon, n, r,
    projectedSavings, totalContributions, estimatedGrowth,
    goalGap, surplus, progressPct,
    requiredMonthly, additionalMonthlyNeeded,
    timeToGoalMonths, alreadyReached, neverReached,
    readinessScore, readinessLabel, readinessStatus, readinessColor, readinessBg,
    leverState, chartData, goalReachedYear,
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

interface SavingsGoalCalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SavingsGoalCalculator({
  formulaContent,
  faqItems = [],
}: SavingsGoalCalculatorProps) {
  const { region } = useRegion();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [goalType, setGoalType] = useState<GoalType>('vehicle');
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const isCA = region === 'ca';
  const currencyPrefix = isCA ? 'CA$' : '$';
  const fmt = isCA ? fmtCAD : fmtUSD;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const results = useMemo(() => computeResults(form), [form]);

  async function handleDownloadPDF() {
    if (!results || pdfGenerating) return;
    setPdfGenerating(true);
    setPdfError(null);
    try {
      const { buildSavingsGoalPDF } = await import('@/lib/pdf/adapters/savingsGoalAdapter');
      await buildSavingsGoalPDF(results, region as 'ca' | 'us', goalType);
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

  return (
    <div className="flex flex-col gap-y-7 md:gap-y-8 min-w-0">

      <style>{`
        @keyframes teal-glow-sg {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-sg {
          animation: teal-glow-sg 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-sg:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
        .sg-pill { flex: 1; min-width: 0; text-align: center; }
        .sg-pills { display: flex; flex-wrap: wrap; gap: 6px; }
      `}</style>

      {/* ══ Block A: Input Card + Results Card ══════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

        {/* ── Input Card ────────────────────────────────────────────────────── */}
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
                  Savings Goal
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Goal Details</p>
              </div>
            </div>

            {/* Goal Type pills */}
            <div className="mb-4">
              <label className={navyLabelCls} style={navyLabelStyle}>
                Goal Type
                <Tooltip text="Choose what you are saving toward. This is for reference only and does not change any calculation." />
              </label>
              <div className="sg-pills">
                {GOAL_TYPES.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    className="sg-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
                    onClick={() => setGoalType(g.key)}
                    style={
                      goalType === g.key
                        ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                        : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                    }
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

              {/* Left column */}
              <div className="space-y-3 min-w-0">
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Savings Goal
                    <Tooltip text="The total amount you want to save — for example, a down payment, emergency fund, vacation, or education fund." />
                  </label>
                  <NumericInput
                    value={form.savingsGoal}
                    onChange={(v) => set('savingsGoal', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Current Savings
                    <Tooltip text="How much you already have set aside toward this goal. Enter 0 if starting from scratch." />
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
                    Monthly Contribution
                    <Tooltip text="How much you plan to add toward this goal each month. Enter 0 to see how your current savings grow on their own." />
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
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Expected Annual Return
                    <Tooltip text="Estimated average annual growth rate on your savings. Use 0% for a cash account. 4–6% is a common estimate for a balanced portfolio. Not guaranteed." />
                  </label>
                  <NumericInput
                    value={form.annualReturn}
                    onChange={(v) => set('annualReturn', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Time Horizon
                    <Tooltip text="How many years until you need to reach this savings goal. The calculator projects your savings to this target date." />
                  </label>
                  <NumericInput
                    value={form.timeHorizon}
                    onChange={(v) => set('timeHorizon', v)}
                    suffix="yr"
                    inputClassName={inputClsCompact}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="lg:hidden">
          <MobileCalcCTA />
        </div>

        {/* ── Results Card ──────────────────────────────────────────────────── */}
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
                  Enter a savings goal to see your projection.
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
                    Projected Savings in {results.timeHorizon} {results.timeHorizon === 1 ? 'Year' : 'Years'}
                  </p>
                  <p style={{
                    color: results.projectedSavings >= results.savingsGoal ? '#1DB584' : '#ffffff',
                    fontSize: '34px', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1, marginTop: 8,
                  }}>
                    {fmt(results.projectedSavings)}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: 6, fontWeight: 500 }}>
                    of {fmt(results.savingsGoal)} goal · {Math.round(Math.min(results.progressPct, 100))}% reached
                  </p>
                </div>

                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>
                      {results.goalGap > 0 ? 'Goal Gap' : 'Projected Surplus'}
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: results.goalGap > 0 ? '#f59e0b' : '#1DB584' }}>
                      {results.goalGap > 0 ? '−' : '+'}{fmt(results.goalGap > 0 ? results.goalGap : results.surplus)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Required Monthly</span>
                    <span className="text-[13px] font-semibold text-white">
                      {fmt(Math.round(results.requiredMonthly))}
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 400 }}>/mo</span>
                    </span>
                  </div>

                  {results.additionalMonthlyNeeded > 0.5 && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Add per Month</span>
                      <span className="text-[13px] font-semibold" style={{ color: '#f59e0b' }}>
                        +{fmt(Math.round(results.additionalMonthlyNeeded))}
                        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 400 }}>/mo</span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Time to Goal</span>
                    <span className="text-[13px] font-semibold text-white">
                      {results.alreadyReached
                        ? 'Already reached'
                        : results.neverReached
                        ? 'Increase contributions'
                        : results.timeToGoalMonths !== null
                        ? fmtMonths(results.timeToGoalMonths)
                        : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Total Contributions</span>
                    <span className="text-[13px] font-semibold text-white">{fmt(results.totalContributions)}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Estimated Growth</span>
                    <span className="text-[13px] font-semibold" style={{ color: '#1DB584' }}>
                      +{fmt(results.estimatedGrowth)}
                    </span>
                  </div>

                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See your Goal Readiness Score, growth timeline, and contribution gap.
                  </p>
                  <button
                    className="btn-ai-cta-sg w-full font-bold overflow-hidden"
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
                      Review Goal Analysis ↓
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
                      See AI Goal Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* ══ Block C: Progress Card + Growth Timeline ═════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Left: Goal Funding Breakdown ──────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Goal breakdown
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Goal Funding Breakdown</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter your savings goal to see the breakdown.
                </p>
              </div>
            )}

            {results && (() => {
              const isOnTrack = results.surplus > 0;
              const slices: PieSlice[] = isOnTrack
                ? [
                    { label: 'Goal Amount', value: results.savingsGoal,      color: '#1DB584', alwaysShow: true },
                    { label: 'Surplus',     value: results.surplus,          color: '#334155', alwaysShow: true },
                  ]
                : [
                    { label: 'Projected',    value: results.projectedSavings, color: '#f59e0b', alwaysShow: true },
                    { label: 'Remaining Gap',value: results.goalGap,          color: '#334155', alwaysShow: results.goalGap > 0 },
                  ];
              const denominator = isOnTrack ? results.projectedSavings : results.savingsGoal;
              const rows = isOnTrack
                ? [
                    { label: 'Goal Amount', value: results.savingsGoal,      color: '#1DB584' },
                    { label: 'Surplus',     value: results.surplus,          color: '#334155' },
                  ]
                : [
                    { label: 'Projected Savings', value: results.projectedSavings, color: '#f59e0b' },
                    { label: 'Remaining Gap',      value: results.goalGap,          color: '#334155' },
                  ];

              return (
                <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                  <div className="shrink-0">
                    <DonutChart
                      slices={slices}
                      className="w-52 h-52"
                      centerValue={fmt(safe(results.projectedSavings))}
                      centerLabel="projected"
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
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>Goal Amount</span>
                      <span className="font-bold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmt(safe(results.savingsGoal))}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Right: Savings Growth Timeline ────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Savings over time
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Savings Growth Timeline</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter your details to see the growth timeline.
                </p>
              </div>
            )}

            {results && results.chartData.length > 0 && (() => {
              const CHART_H = 188;
              const XLABEL_H = 30;
              const YAXIS_W = 40;

              const allVals = [...results.chartData.map((d) => d.projected), results.savingsGoal];
              const yMax = niceMax(Math.max(...allVals, 1));
              const targetPx = yMax > 0 ? Math.round((results.savingsGoal / yMax) * CHART_H) : 0;
              const targetLineVisible = targetPx > 8 && targetPx <= CHART_H;

              const statRows = [
                {
                  label: `AT YR ${results.timeHorizon}`,
                  value: fmt(safe(results.projectedSavings)),
                  color: (results.projectedSavings >= results.savingsGoal ? '#1DB584' : '#0D1B2A') as string,
                },
                { label: 'MONTHLY',  value: `${fmt(results.monthlyContribution)}/mo`, color: '#0D1B2A' as string },
                { label: 'GOAL',     value: fmt(results.savingsGoal),                 color: '#334155' as string },
              ];

              return (
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 flex-1 min-h-0">

                  {/* Sidebar stats + legend */}
                  <div className="flex flex-col sm:flex-col gap-3 sm:gap-4 sm:w-[108px] shrink-0 sm:justify-center">
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
                        <span style={{ fontSize: '10px', color: '#6B7A8D' }}>Contributions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#1DB584' }} />
                        <span style={{ fontSize: '10px', color: '#6B7A8D' }}>Growth</span>
                      </div>
                      {targetLineVisible && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-0 shrink-0" style={{ borderTop: '2px dashed rgba(29,181,132,0.6)', marginTop: 1 }} />
                          <span style={{ fontSize: '10px', color: '#1DB584' }}>Goal</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chart area */}
                  <div className="flex-1 relative" style={{ minHeight: CHART_H + XLABEL_H + 60 }}>

                    {/* Y-axis labels */}
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

                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                        <div key={frac} className="absolute left-0 right-0"
                          style={{
                            bottom: XLABEL_H + Math.round(frac * CHART_H),
                            borderTop: frac === 0 ? '1px solid rgba(15,41,66,0.12)' : '1px dashed rgba(15,41,66,0.08)',
                          }}
                        />
                      ))}

                      {/* Goal line */}
                      {targetLineVisible && (
                        <div className="absolute left-0 right-0" style={{ bottom: XLABEL_H + targetPx, zIndex: 2 }}>
                          <div style={{ borderTop: '1.5px dashed rgba(29,181,132,0.55)', position: 'relative' }}>
                            <span style={{
                              position: 'absolute', right: 0, top: -9,
                              fontSize: '7px', fontWeight: 700, color: '#1DB584',
                              background: '#fff', paddingLeft: 2,
                            }}>Goal</span>
                          </div>
                        </div>
                      )}

                      {/* Stacked bars */}
                      <div className="absolute left-0 right-0 flex gap-0.5" style={{ bottom: XLABEL_H, height: CHART_H }}>
                        {results.chartData.map((d) => {
                          const totalBarH = yMax > 0 ? Math.max(2, Math.round((d.projected / yMax) * CHART_H)) : 2;
                          const contribH  = yMax > 0 ? Math.max(0, Math.round((d.contribBase / yMax) * CHART_H)) : 0;
                          const growthH   = Math.max(0, totalBarH - contribH);
                          const isFirstReached = results.goalReachedYear === d.year;
                          const isAtGoal = d.projected >= results.savingsGoal;

                          return (
                            <div key={d.year} className="flex-1 flex justify-center items-end">
                              <div style={{ position: 'relative', width: '52%', minWidth: 6 }}>

                                {!isFirstReached && (
                                  <div style={{
                                    position: 'absolute', bottom: totalBarH + 3,
                                    left: '50%', transform: 'translateX(-50%)',
                                    fontSize: '7px', color: '#9BA8B5', fontWeight: 600,
                                    whiteSpace: 'nowrap', pointerEvents: 'none', lineHeight: 1,
                                  }}>
                                    {fmtShort(d.projected)}
                                  </div>
                                )}

                                {/* Stacked bar: contribution base + growth on top */}
                                <div style={{ width: '100%', height: totalBarH, position: 'relative', borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
                                  <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    height: contribH, background: isAtGoal ? '#1DB584' : '#334155',
                                  }} />
                                  {growthH > 0 && (
                                    <div style={{
                                      position: 'absolute', bottom: contribH, left: 0, right: 0,
                                      height: growthH, background: '#1DB584',
                                    }} />
                                  )}
                                </div>

                                {/* Goal reached callout */}
                                {isFirstReached && (
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
                                      position: 'absolute', bottom: totalBarH + 12,
                                      left: '50%', transform: 'translateX(-50%)', zIndex: 10,
                                    }}>
                                      <div className="relative rounded-xl px-2 py-2 text-center"
                                        style={{
                                          background: '#fff', boxShadow: '0 3px 14px rgba(0,0,0,0.12)',
                                          border: '1.5px solid rgba(29,181,132,0.30)',
                                          maxWidth: 80, minWidth: 52, whiteSpace: 'nowrap',
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
                        {results.chartData.map((d) => (
                          <div key={d.year} className="flex-1 flex justify-center items-center">
                            {results.goalReachedYear === d.year ? (
                              <span className="rounded-full"
                                style={{ background: '#1DB584', color: '#fff', fontSize: '8px', fontWeight: 700, lineHeight: 1, display: 'inline-block', padding: '3px 7px' }}>
                                Yr {d.year}
                              </span>
                            ) : (
                              <span style={{ fontSize: '8px', color: '#9BA8B5' }}>Yr {d.year}</span>
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

      {/* ══ Block D: AI Analysis ═════════════════════════════════════════════════ */}
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
              FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Savings Goal Analysis
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleDownloadPDF}
                disabled={!results || pdfGenerating}
                aria-disabled={!results || pdfGenerating}
                title={!results ? 'Enter a savings goal to generate a report' : 'Download PDF report'}
                className="inline-flex items-center gap-1.5"
                style={{
                  background: '#1DB584', color: '#ffffff', borderRadius: 9999,
                  padding: '7px 16px', fontSize: '13px', fontWeight: 700,
                  opacity: (!results || pdfGenerating) ? 0.65 : 1,
                  cursor: (!results || pdfGenerating) ? 'not-allowed' : 'pointer',
                }}>
                <Download className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {pdfGenerating ? 'Generating…' : 'Download PDF'}
              </button>
              {pdfError && (
                <span style={{ fontSize: '11px', color: '#fca5a5' }}>{pdfError}</span>
              )}
            </div>
            <button disabled aria-disabled="true" title="Coming soon"
              className="inline-flex items-center gap-1.5 cursor-not-allowed select-none"
              style={{ border: '1.5px solid rgba(255,255,255,0.30)', color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700 }}>
              <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Email Results · Soon
            </button>
          </div>
        </div>

        <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

          {!results && (
            <div className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#1DB584' }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                Enter your savings goal to see the analysis.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 340 }}>
                The analysis will show your Goal Readiness Score, required monthly contribution, and whether you are on track.
              </p>
            </div>
          )}

          {results && (
            <>
              {/* ── Row 1: Readiness gauge + Smart action ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Left — Goal Readiness Score */}
                <div className="rounded-2xl p-4 flex flex-col"
                  style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                      <span className="text-sm font-bold text-slate-800">{READINESS_TITLE[goalType]}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                      style={{ background: results.readinessBg, color: results.readinessColor }}>
                      {results.readinessStatus}
                    </span>
                  </div>

                  {(() => {
                    const GR = 60; const GC = 2 * Math.PI * GR;
                    const GARC = (240 / 360) * GC;
                    const GFIL = GARC * (Math.min(100, results.progressPct) / 100);
                    const isAhead = results.surplus > 0;
                    const thirdBox = isAhead
                      ? { label: 'Surplus', value: fmt(results.surplus), color: '#1DB584', bg: 'rgba(29,181,132,0.08)', border: 'rgba(29,181,132,0.22)' }
                      : { label: 'Remaining Gap', value: fmt(results.goalGap), color: '#D97706', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)' };
                    return (
                      <div className="flex flex-col items-center flex-1">
                        {/* Gauge */}
                        <div style={{ position: 'relative', width: 200, height: 200, flexShrink: 0 }}>
                          <svg viewBox="0 0 180 180" width="200" height="200" style={{ display: 'block' }} aria-hidden>
                            <circle cx="90" cy="90" r={GR} fill="none"
                              stroke="rgba(15,41,66,0.09)" strokeWidth="12" strokeLinecap="round"
                              strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`}
                              transform="rotate(150, 90, 90)" />
                            <circle cx="90" cy="90" r={GR} fill="none"
                              stroke={results.readinessColor} strokeWidth="12" strokeLinecap="round"
                              strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`}
                              transform="rotate(150, 90, 90)"
                              style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 20 }}>
                            <span style={{ fontSize: 'clamp(2.4rem, 6vw, 3.2rem)', fontWeight: 800, color: '#0D1B2A', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                              {results.readinessScore}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1.6 }}>/100</span>
                          </div>
                        </div>

                        {/* Summary line */}
                        <p className="text-center mt-1 mb-2" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(13,27,42,0.50)' }}>
                          {isAhead
                            ? <>You are <span style={{ color: results.readinessColor, fontWeight: 700 }}>ahead</span> of your {GOAL_TYPE_LABEL[goalType].toLowerCase()} goal</>
                            : <>You are <span style={{ color: results.readinessColor, fontWeight: 700 }}>{Math.round(results.progressPct)}%</span> of the way to your goal</>}
                        </p>

                        {/* 3 stat boxes */}
                        <div className="grid grid-cols-3 gap-2 w-full">
                          {[
                            { label: 'Projected', value: fmt(results.projectedSavings), color: '#1DB584', bg: 'rgba(29,181,132,0.08)', border: 'rgba(29,181,132,0.22)' },
                            { label: 'Goal Amount', value: fmt(results.savingsGoal), color: '#334155', bg: 'rgba(15,41,66,0.05)', border: 'rgba(15,41,66,0.11)' },
                            thirdBox,
                          ].map(({ label, value, color, bg, border }) => (
                            <div key={label} className="rounded-xl text-center"
                              style={{ background: bg, border: `1px solid ${border}`, padding: '10px 4px 10px' }}>
                              <p style={{ fontSize: '8.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 5 }}>
                                {label}
                              </p>
                              <p style={{ fontSize: '12px', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.2px' }}>
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>

                        <p className="text-slate-400 mt-3 text-center" style={{ fontSize: '11px', lineHeight: 1.55 }}>
                          {results.readinessStatus === 'On Track'
                            ? `Your projected ${fmt(results.projectedSavings)} meets your ${GOAL_TYPE_LABEL[goalType].toLowerCase()} goal of ${fmt(results.savingsGoal)}.`
                            : results.readinessStatus === 'Nearly There'
                            ? `A modest contribution increase may close the ${fmt(results.goalGap)} gap to your ${GOAL_TYPE_LABEL[goalType].toLowerCase()} goal.`
                            : `At current pace, your savings fall short of your ${GOAL_TYPE_LABEL[goalType].toLowerCase()} goal by ${fmt(results.goalGap)}.`}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Right — Smart action card */}
                <div className="rounded-2xl p-3 flex flex-col"
                  style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold" style={{ color: '#1DB584' }}>
                      {results.leverState === 'on-track' ? 'Goal Achieved' : 'Smart Action Found'}
                    </span>
                  </div>

                  {/* on-track */}
                  {results.leverState === 'on-track' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.6rem, 8vw, 2.2rem)', color: '#1DB584', letterSpacing: '-1px', lineHeight: 1 }}>
                            +{fmt(results.surplus)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">projected surplus above your {fmt(results.savingsGoal)} goal</p>
                          <p className="text-slate-400 text-xs mt-0.5">on track to reach your goal within {results.timeHorizon} {results.timeHorizon === 1 ? 'year' : 'years'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(results.projectedSavings)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Projected savings</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>+{fmt(results.estimatedGrowth)}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Est. growth</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1px', lineHeight: 1 }}>
                              +{fmt(results.surplus)}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(results.projectedSavings)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Projected savings</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>+{fmt(results.estimatedGrowth)}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Est. growth</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">projected surplus above your {fmt(results.savingsGoal)} goal</p>
                          <p className="text-slate-400 text-xs mt-0.5">on track to reach your goal within {results.timeHorizon} {results.timeHorizon === 1 ? 'year' : 'years'}</p>
                        </div>
                      </div>
                    </>
                  ))()}

                  {/* behind-saving */}
                  {results.leverState === 'behind-saving' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.6rem, 8vw, 2.2rem)', color: '#f59e0b', letterSpacing: '-1px', lineHeight: 1 }}>
                            +{fmt(Math.round(results.additionalMonthlyNeeded))}<span style={{ fontSize: '1rem' }}>/mo</span>
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">extra per month to reach your {fmt(results.savingsGoal)} goal on time</p>
                          <p className="text-slate-400 text-xs mt-0.5">required: {fmt(Math.round(results.requiredMonthly))}/mo · current: {fmt(results.monthlyContribution)}/mo</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(results.goalGap)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Goal gap</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(Math.round(results.requiredMonthly))}<span className="text-slate-400 font-normal text-xs">/mo</span></div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Required monthly</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', color: '#f59e0b', letterSpacing: '-1px', lineHeight: 1 }}>
                              +{fmt(Math.round(results.additionalMonthlyNeeded))}<span style={{ fontSize: '1rem' }}>/mo</span>
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(results.goalGap)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Goal gap</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(Math.round(results.requiredMonthly))}<span className="text-slate-400 font-normal text-sm">/mo</span></div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Required monthly</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">extra per month to reach your {fmt(results.savingsGoal)} goal on time</p>
                          <p className="text-slate-400 text-xs mt-0.5">required: {fmt(Math.round(results.requiredMonthly))}/mo · current: {fmt(results.monthlyContribution)}/mo</p>
                        </div>
                      </div>
                    </>
                  ))()}

                  {/* behind-no-saving */}
                  {results.leverState === 'behind-no-saving' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.6rem, 8vw, 2.2rem)', color: '#f59e0b', letterSpacing: '-1px', lineHeight: 1 }}>
                            {fmt(Math.round(results.requiredMonthly))}<span style={{ fontSize: '1rem' }}>/mo</span>
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">monthly contribution needed to reach your goal — none currently set</p>
                          <p className="text-slate-400 text-xs mt-0.5">goal gap: {fmt(results.goalGap)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(results.savingsGoal)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Goal amount</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(results.goalGap)}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Goal gap</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', color: '#f59e0b', letterSpacing: '-1px', lineHeight: 1 }}>
                              {fmt(Math.round(results.requiredMonthly))}<span style={{ fontSize: '1rem' }}>/mo</span>
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(results.savingsGoal)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Goal amount</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(results.goalGap)}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Goal gap</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">monthly contribution needed to reach your goal — none currently set</p>
                          <p className="text-slate-400 text-xs mt-0.5">goal gap: {fmt(results.goalGap)}</p>
                        </div>
                      </div>
                    </>
                  ))()}

                </div>

              </div>

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Card 1 — Contribution Pace */}
                <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Contribution Pace</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.leverState === 'on-track'
                      ? <>Your current contribution of <strong className="text-emerald-700">{fmt(results.monthlyContribution)}/mo</strong> is sufficient. Your projected {fmt(results.projectedSavings)} exceeds your {fmt(results.savingsGoal)} goal by <strong className="text-emerald-700">{fmt(results.surplus)}</strong>.</>
                      : results.monthlyContribution > 0
                      ? <>You are contributing <strong className="text-emerald-700">{fmt(results.monthlyContribution)}/mo</strong>, but need <strong className="text-emerald-700">{fmt(Math.round(results.requiredMonthly))}/mo</strong> to reach your goal on time. Adding <strong className="text-emerald-700">{fmt(Math.round(results.additionalMonthlyNeeded))}/mo</strong> would close the gap.</>
                      : <>No monthly contribution is set. To reach your {fmt(results.savingsGoal)} goal in {results.timeHorizon} {results.timeHorizon === 1 ? 'year' : 'years'}, you need approximately <strong className="text-emerald-700">{fmt(Math.round(results.requiredMonthly))}/mo</strong>.</>}
                  </p>
                </div>

                {/* Card 2 — Time Horizon Impact */}
                <div className="rounded-2xl p-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#fef3c7' }}>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Time Horizon Impact</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.alreadyReached
                      ? <>Your current savings of <strong className="text-amber-700">{fmt(results.currentSavings)}</strong> already meet your goal — no additional contributions are required.</>
                      : results.neverReached
                      ? <>At your current contribution and return, your savings may not reach your goal within a reasonable timeframe. Increasing your monthly contribution or extending your horizon would help close the gap.</>
                      : results.timeToGoalMonths !== null
                      ? <>At your current pace, you are projected to reach your goal in approximately <strong className="text-amber-700">{fmtMonths(results.timeToGoalMonths)}</strong>. {results.timeToGoalMonths / 12 <= results.timeHorizon ? `This falls within your ${results.timeHorizon}-year horizon.` : `This exceeds your ${results.timeHorizon}-year target — increasing contributions would help.`}</>
                      : <>Your savings are on track. Keep your current contribution to stay on schedule.</>}
                  </p>
                </div>

                {/* Card 3 — Growth vs Savings Mix */}
                <div className="rounded-2xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#f1f5f9' }}>
                      <Zap className="w-3.5 h-3.5 text-slate-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Growth vs Savings Mix</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.projectedSavings > 0 && results.annualReturn > 0
                      ? (() => {
                          const growthPct  = Math.round((results.estimatedGrowth / results.projectedSavings) * 100);
                          const contribPct = 100 - growthPct;
                          return (
                            <>Of your projected <strong className="text-slate-800">{fmt(results.projectedSavings)}</strong>, approximately <strong className="text-slate-800">{contribPct}%</strong> comes from contributions ({fmt(results.totalContributions)}) and <strong className="text-slate-800">{growthPct}%</strong> from estimated growth ({fmt(results.estimatedGrowth)}) at {results.annualReturn}% annual return.</>
                          );
                        })()
                      : <>Your projection is based entirely on contributions with no investment growth applied. Total contributions over {results.timeHorizon} {results.timeHorizon === 1 ? 'year' : 'years'}: <strong className="text-slate-800">{fmt(results.totalContributions)}</strong>.</>}
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
            Educational estimate only. Results depend on return assumptions, contribution consistency, timing, inflation, fees, taxes, and personal circumstances. This is not financial, investment, tax, or legal advice.
          </p>
        </div>

      </div>

      {/* ══ Block E: How It Works ════════════════════════════════════════════════ */}
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

      {/* ══ Block F: FAQ ════════════════════════════════════════════════════════ */}
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
        Educational estimate only. Results depend on return assumptions, contribution consistency, timing, inflation, fees, taxes, and personal circumstances. This is not financial, investment, tax, or legal advice.
      </p>

    </div>
  );
}
