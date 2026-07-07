'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip, DonutChart, type PieSlice } from '../_mortgage-shared/ui';
import { fmtCAD, fmtUSD } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  Activity, BarChart3, BookOpen, Download,
  HelpCircle, Mail, ShieldAlert, Sparkles, TrendingUp, Zap,
} from 'lucide-react';
import type { ROIAdapterInput } from '@/lib/pdf/adapters/roiAdapter';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  initialCost: string;
  finalValue: string;
  additionalCosts: string;
  timePeriod: string;
  targetROI: string;
}

interface ROIResults {
  initialCost: number;
  finalValue: number;
  additionalCosts: number;
  totalCost: number;
  netProfit: number;
  roiPct: number;
  isProfit: boolean;
  isLoss: boolean;
  breakEvenStatus: 'profit' | 'break-even' | 'loss';
  hasYears: boolean;
  years: number;
  annualizedROI: number | null;
  hasTarget: boolean;
  targetROIPct: number;
  targetFinalValue: number;
  targetGap: number;
  targetProgress: number;
  healthScore: number;
  healthLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  healthStatus: 'Healthy' | 'Watch' | 'Caution';
  healthColor: string;
  healthBg: string;
  tpColor: string;
  tpBg: string;
  tpBadge: string;
  tpLabel: string;
  leverState: 'behind' | 'on-track' | 'no-target-profit' | 'no-target-loss';
  additionalValueNeeded: number;
  surplus: number;
  breakEvenGap: number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  initialCost: '10000',
  finalValue: '13000',
  additionalCosts: '500',
  timePeriod: '2',
  targetROI: '25',
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

function computeResults(form: FormState): ROIResults | null {
  const initialCost = Math.max(0, parseFloat(form.initialCost) || 0);
  const finalValue = Math.max(0, parseFloat(form.finalValue) || 0);
  const additionalCosts = Math.max(0, parseFloat(form.additionalCosts) || 0);
  const rawYears = parseFloat(form.timePeriod) || 0;
  const years = rawYears > 0 ? rawYears : 0;

  const rawTargetStr = form.targetROI.trim();
  const rawTargetNum = parseFloat(rawTargetStr);
  const targetEntered = rawTargetStr !== '' && !isNaN(rawTargetNum);
  const targetROIPct = targetEntered ? rawTargetNum : 0;
  const hasTarget = targetEntered && targetROIPct > -100;

  const totalCost = initialCost + additionalCosts;
  if (totalCost <= 0) return null;

  const netProfit = finalValue - totalCost;
  const roiPct = (netProfit / totalCost) * 100;
  const isProfit = netProfit > 0.005;
  const isLoss = netProfit < -0.005;
  const breakEvenStatus: 'profit' | 'break-even' | 'loss' =
    isProfit ? 'profit' : isLoss ? 'loss' : 'break-even';

  const hasYears = years > 0;
  let annualizedROI: number | null = null;
  if (hasYears && roiPct > -100 + 1e-6) {
    const ann = Math.pow(1 + roiPct / 100, 1 / years) - 1;
    annualizedROI = Number.isFinite(ann) ? ann * 100 : null;
  }

  const targetFinalValue = hasTarget ? totalCost * (1 + targetROIPct / 100) : 0;
  const targetGap = hasTarget ? finalValue - targetFinalValue : 0;
  const targetProgress =
    hasTarget && targetFinalValue > 0
      ? Math.min(200, (finalValue / targetFinalValue) * 100)
      : 0;

  const healthScore = Math.round(Math.min(100, Math.max(0, 50 + roiPct * 1.5)));
  const healthLabel: ROIResults['healthLabel'] =
    healthScore >= 80 ? 'Excellent' : healthScore >= 65 ? 'Good' : healthScore >= 45 ? 'Fair' : 'Poor';
  const healthStatus: ROIResults['healthStatus'] =
    healthLabel === 'Poor' ? 'Caution' : healthLabel === 'Fair' ? 'Watch' : 'Healthy';
  const healthColor =
    healthStatus === 'Healthy' ? '#1DB584' : healthStatus === 'Watch' ? '#f59e0b' : '#ef4444';
  const healthBg =
    healthStatus === 'Healthy'
      ? 'rgba(29,181,132,0.10)'
      : healthStatus === 'Watch'
      ? 'rgba(245,158,11,0.10)'
      : 'rgba(239,68,68,0.10)';

  const tpOnTrack = hasTarget && targetProgress >= 100;
  const tpClose = hasTarget && targetProgress >= 70 && targetProgress < 100;
  const tpColor = !hasTarget
    ? '#94a3b8'
    : tpOnTrack
    ? '#1DB584'
    : tpClose
    ? '#f59e0b'
    : '#ef4444';
  const tpBg = !hasTarget
    ? 'rgba(148,163,184,0.10)'
    : tpOnTrack
    ? 'rgba(29,181,132,0.10)'
    : tpClose
    ? 'rgba(245,158,11,0.10)'
    : 'rgba(239,68,68,0.10)';
  const tpBadge = !hasTarget ? 'No Target' : tpOnTrack ? 'On Track' : tpClose ? 'Close' : 'Behind';
  const tpLabel = !hasTarget ? '—' : tpOnTrack ? 'On Track' : tpClose ? 'Close' : 'Behind';

  let leverState: ROIResults['leverState'];
  let additionalValueNeeded = 0;
  let surplus = 0;
  if (hasTarget) {
    if (finalValue >= targetFinalValue) {
      leverState = 'on-track';
      surplus = finalValue - targetFinalValue;
    } else {
      leverState = 'behind';
      additionalValueNeeded = targetFinalValue - finalValue;
    }
  } else {
    leverState = isLoss ? 'no-target-loss' : 'no-target-profit';
  }

  const breakEvenGap = isLoss ? Math.abs(netProfit) : 0;

  return {
    initialCost, finalValue, additionalCosts, totalCost,
    netProfit, roiPct, isProfit, isLoss, breakEvenStatus,
    hasYears, years, annualizedROI,
    hasTarget, targetROIPct, targetFinalValue, targetGap, targetProgress,
    healthScore, healthLabel, healthStatus, healthColor, healthBg,
    tpColor, tpBg, tpBadge, tpLabel,
    leverState, additionalValueNeeded, surplus, breakEvenGap,
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

interface ROICalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ROICalculator({
  formulaContent,
  faqItems = [],
}: ROICalculatorProps) {
  const { region } = useRegion();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isCA = region === 'ca';
  const currencyPrefix = isCA ? 'CA$' : '$';
  const fmt = isCA ? fmtCAD : fmtUSD;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const results = useMemo(() => computeResults(form), [form]);

  const donutSlices = useMemo((): PieSlice[] | null => {
    if (!results) return null;
    if (results.isLoss) {
      // Loss state: show what came back vs what was lost — no positive green dominant slice
      return [
        { label: 'Recovered Value', value: safe(results.finalValue), color: '#64748b', alwaysShow: results.finalValue > 0 },
        { label: 'Net Loss', value: safe(Math.abs(results.netProfit)), color: '#f59e0b', alwaysShow: true },
      ];
    }
    const slices: PieSlice[] = [
      { label: 'Initial Cost', value: results.initialCost, color: '#1DB584', alwaysShow: true },
    ];
    if (results.additionalCosts > 0) {
      slices.push({ label: 'Additional Costs', value: results.additionalCosts, color: '#334155', alwaysShow: true });
    }
    if (results.isProfit) {
      slices.push({ label: 'Net Profit', value: results.netProfit, color: '#0D1B2A', alwaysShow: false });
    }
    return slices;
  }, [results]);

  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      const { buildROIPDF } = await import('@/lib/pdf/adapters/roiAdapter');
      const rawYears = parseFloat(form.timePeriod) || 0;
      const rawTarget = parseFloat(form.targetROI) || 0;
      const input: ROIAdapterInput = {
        initialCost:            results.initialCost,
        finalValue:             results.finalValue,
        additionalCosts:        results.additionalCosts,
        years:                  rawYears > 0 ? rawYears : 0,
        targetROIPct:           results.hasTarget ? results.targetROIPct : 0,
        totalCost:              results.totalCost,
        netProfit:              results.netProfit,
        roiPct:                 results.roiPct,
        isProfit:               results.isProfit,
        isLoss:                 results.isLoss,
        annualizedROI:          results.annualizedROI ?? null,
        hasTarget:              results.hasTarget,
        targetFinalValue:       results.targetFinalValue,
        targetGap:              results.targetGap,
        targetProgress:         results.targetProgress,
        surplus:                results.surplus,
        additionalValueNeeded:  results.additionalValueNeeded,
        breakEvenGap:           results.breakEvenGap,
        healthScore:            results.healthScore,
        healthLabel:            results.healthLabel,
        healthStatus:           results.healthStatus,
        region:                 isCA ? 'ca' : 'us',
      };
      void rawTarget; // present in form but not needed separately (already in results)
      await buildROIPDF(input);
    } finally {
      setPdfLoading(false);
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
        @keyframes teal-glow-roi {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-roi {
          animation: teal-glow-roi 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-roi:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
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
                <BarChart3 size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Return on Investment
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Investment Details</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

              {/* Left column */}
              <div className="space-y-3 min-w-0">

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Initial Investment / Cost
                    <Tooltip text="The total upfront cost — purchase price, capital deployed, or project cost." />
                  </label>
                  <NumericInput
                    value={form.initialCost}
                    onChange={(v) => set('initialCost', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Final Value / Revenue
                    <Tooltip text="The ending value or revenue received — sale price, current value, or total revenue generated." />
                  </label>
                  <NumericInput
                    value={form.finalValue}
                    onChange={(v) => set('finalValue', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Additional Costs
                    <Tooltip text="Any extra costs beyond the initial investment — maintenance, commissions, overhead, or operating expenses. Enter 0 if none." />
                  </label>
                  <NumericInput
                    value={form.additionalCosts}
                    onChange={(v) => set('additionalCosts', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

              </div>

              {/* Right column */}
              <div className="border-l pl-2 md:pl-5 space-y-3 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Holding Period
                    <Tooltip text="Optional. The number of years this investment was or will be held. When entered, the calculator shows an annualized ROI so you can compare returns across different time horizons." />
                  </label>
                  <NumericInput
                    value={form.timePeriod}
                    onChange={(v) => set('timePeriod', v)}
                    suffix="yr"
                    inputClassName={inputClsCompact}
                    placeholder="Optional"
                  />
                  <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>
                    Optional — enables annualized ROI
                  </p>
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Target ROI %
                    <Tooltip text="Optional. Your target return on investment. When entered, the AI Analysis shows your progress toward this goal and the additional value needed to reach it." />
                  </label>
                  <NumericInput
                    value={form.targetROI}
                    onChange={(v) => set('targetROI', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                    placeholder="Optional"
                  />
                  <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>
                    Optional — enables goal tracking
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
                  Enter an investment cost and final value to see your ROI.
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
                    Return on Investment
                  </p>
                  <p style={{
                    color: results.roiPct >= 0 ? '#1DB584' : '#f59e0b',
                    fontSize: '38px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 8,
                  }}>
                    {results.roiPct >= 0 ? '+' : ''}{results.roiPct.toFixed(1)}%
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: 6, fontWeight: 500 }}>
                    {results.breakEvenStatus === 'profit'
                      ? 'profitable return'
                      : results.breakEvenStatus === 'loss'
                      ? 'loss on investment'
                      : 'at break-even'}
                    {results.hasYears ? ` · ${results.years}yr hold` : ''}
                  </p>
                </div>

                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>
                      {results.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: results.netProfit >= 0 ? '#1DB584' : '#f59e0b' }}>
                      {results.netProfit >= 0 ? '+' : '−'}{fmt(Math.abs(results.netProfit))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Total Cost</span>
                    <span className="text-[13px] font-semibold text-white">{fmt(results.totalCost)}</span>
                  </div>

                  {results.hasYears && results.annualizedROI !== null && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Annualized ROI</span>
                      <span className="text-[13px] font-semibold" style={{ color: results.annualizedROI >= 0 ? '#1DB584' : '#f59e0b' }}>
                        {results.annualizedROI >= 0 ? '+' : ''}{results.annualizedROI.toFixed(1)}%
                        <span style={{ color: 'rgba(255,255,255,0.38)', fontWeight: 400, fontSize: '11px' }}>/yr</span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1.5">
                    {results.hasTarget ? (
                      <>
                        <span className="text-[13px]" style={{ color: '#CBD5E1' }}>
                          {results.targetGap >= 0 ? 'Target Surplus' : 'Target Gap'}
                        </span>
                        <span className="text-[13px] font-semibold" style={{ color: results.targetGap >= 0 ? '#1DB584' : '#f59e0b' }}>
                          {results.targetGap >= 0 ? '+' : '−'}{fmt(Math.abs(results.targetGap))}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Break-even Status</span>
                        <span
                          className="text-[13px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              results.breakEvenStatus === 'profit'
                                ? 'rgba(29,181,132,0.18)'
                                : results.breakEvenStatus === 'loss'
                                ? 'rgba(245,158,11,0.18)'
                                : 'rgba(255,255,255,0.10)',
                            color:
                              results.breakEvenStatus === 'profit'
                                ? '#1DB584'
                                : results.breakEvenStatus === 'loss'
                                ? '#f59e0b'
                                : 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {results.breakEvenStatus === 'profit'
                            ? 'Profit'
                            : results.breakEvenStatus === 'loss'
                            ? 'Loss'
                            : 'Break-even'}
                        </span>
                      </>
                    )}
                  </div>

                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See your break-even position, target progress, and actionable insights.
                  </p>
                  <button
                    className="btn-ai-cta-roi w-full font-bold overflow-hidden"
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
                      Review ROI Analysis ↓
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
                      See AI ROI Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* ══ Block C: ROI Breakdown + ROI Comparison ══════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Left: ROI Breakdown donut ──────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Cost &amp; return breakdown
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>ROI Breakdown</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter details to see the ROI breakdown.
                </p>
              </div>
            )}

            {results && donutSlices && (() => {
              const isLoss = results.isLoss;
              // Loss: circle = totalCost (recovered + lost). Profit: circle = finalValue (cost + profit).
              const denominator = isLoss ? results.totalCost : results.finalValue;
              const centerValue = isLoss ? fmt(results.totalCost) : fmt(safe(results.finalValue));
              const centerLabel = isLoss ? 'total cost' : 'final value';

              const rows = isLoss
                ? [
                    ...(results.finalValue > 0
                      ? [{ label: 'Recovered Value', value: results.finalValue, color: '#64748b', prefix: '' }]
                      : []),
                    { label: 'Net Loss', value: Math.abs(results.netProfit), color: '#f59e0b', prefix: '−' },
                  ]
                : [
                    { label: 'Initial Cost', value: results.initialCost, color: '#1DB584', prefix: '' },
                    ...(results.additionalCosts > 0
                      ? [{ label: 'Additional Costs', value: results.additionalCosts, color: '#334155', prefix: '' }]
                      : []),
                    { label: 'Net Profit', value: results.netProfit, color: '#0D1B2A', prefix: '' },
                  ];

              const summaryLabel = isLoss ? 'Total Cost' : 'Final Value';
              const summaryValue = isLoss ? results.totalCost : results.finalValue;

              return (
                <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                  <div className="shrink-0">
                    <DonutChart
                      slices={donutSlices}
                      className="w-52 h-52"
                      centerValue={centerValue}
                      centerLabel={centerLabel}
                    />
                  </div>
                  <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    {rows.map(({ label, value, color, prefix }) => {
                      const pct = denominator > 0 ? Math.round((safe(value) / denominator) * 100) : 0;
                      return (
                        <div key={label} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                            <span style={{ color: '#4B5563', fontSize: '12.5px' }}>{label}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-400">{pct}%</span>
                            <span className="font-semibold" style={{ color, fontSize: '12.5px' }}>
                              {prefix}{fmt(safe(value))}
                            </span>
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

        {/* ── Right: ROI Comparison chart ────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Value comparison
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>ROI Comparison</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter details to see the ROI comparison.
                </p>
              </div>
            )}

            {results && (() => {
              const CHART_H = 188;
              const XLABEL_H = 30;
              const YAXIS_W = 44;

              const chartBars: { key: string; label: string; value: number; isActual: boolean }[] = [
                { key: 'breakeven', label: 'Break-even', value: results.totalCost, isActual: false },
                { key: 'actual', label: 'Actual', value: results.finalValue, isActual: true },
                ...(results.hasTarget
                  ? [{ key: 'target', label: 'Target', value: results.targetFinalValue, isActual: false }]
                  : []),
              ];

              const yMax = niceMax(Math.max(...chartBars.map((b) => b.value), 1));

              const statRows = [
                { label: 'ROI', value: `${results.roiPct >= 0 ? '+' : ''}${results.roiPct.toFixed(1)}%`, color: results.roiPct >= 0 ? '#1DB584' : '#f59e0b' },
                {
                  label: results.netProfit >= 0 ? 'Net Profit' : 'Net Loss',
                  value: `${results.netProfit >= 0 ? '+' : '−'}${fmt(Math.abs(results.netProfit))}`,
                  color: results.netProfit >= 0 ? '#1DB584' : '#f59e0b',
                },
                { label: 'Total Cost', value: fmt(results.totalCost), color: '#0D1B2A' as const },
              ];

              const legendRows = [
                { label: 'Cost Base', color: '#334155' as const },
                results.isLoss
                  ? { label: 'Loss', color: '#f59e0b' as const }
                  : { label: 'Profit', color: '#1DB584' as const },
                ...(results.hasTarget ? [{ label: 'Target', color: '#1DB584' as const, dashed: true }] : []),
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
                      {legendRows.map(({ label, color, dashed }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          {dashed ? (
                            <div className="w-2.5 h-0 shrink-0" style={{ borderTop: '2px dashed rgba(29,181,132,0.6)', marginTop: 1 }} />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                          )}
                          <span style={{ fontSize: '10px', color: '#6B7A8D' }}>{label}</span>
                        </div>
                      ))}
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
                            borderTop: frac === 0
                              ? '1px solid rgba(15,41,66,0.12)'
                              : '1px dashed rgba(15,41,66,0.08)',
                          }}
                        />
                      ))}

                      {/* Bars */}
                      <div className="absolute left-0 right-0 flex gap-2" style={{ bottom: XLABEL_H, height: CHART_H }}>
                        {chartBars.map((bar) => {
                          const rawBarH = yMax > 0 ? (bar.value / yMax) * CHART_H : 0;
                          const barH = Math.max(bar.value > 0 ? 2 : 0, Math.round(rawBarH));

                          // Split actual bar into cost base + profit/loss portions
                          let topH = 0;
                          let bottomH = barH;
                          let topColor = '#1DB584';
                          let bottomColor = '#334155';

                          if (bar.isActual) {
                            if (results.isLoss) {
                              // Single amber bar (shorter than break-even bar)
                              topH = 0;
                              bottomH = barH;
                              bottomColor = '#f59e0b';
                            } else {
                              // Stacked: cost base (slate) + profit (teal)
                              const costH = Math.round((results.totalCost / yMax) * CHART_H);
                              topH = Math.max(0, barH - costH);
                              bottomH = costH;
                              topColor = '#1DB584';
                              bottomColor = '#334155';
                            }
                          }

                          return (
                            <div key={bar.key} className="flex-1 flex justify-center items-end">
                              <div style={{ position: 'relative', width: '52%', minWidth: 8 }}>

                                {/* Label above non-actual bars */}
                                {!bar.isActual && barH > 0 && (
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
                                    {fmtShort(bar.value)}
                                  </div>
                                )}

                                {/* Bar body */}
                                {bar.key === 'breakeven' && (
                                  <div style={{ height: barH, background: '#94a3b8', borderRadius: '4px 4px 0 0' }} />
                                )}

                                {bar.isActual && (
                                  <div className="flex flex-col overflow-hidden"
                                    style={{ height: barH, borderRadius: '4px 4px 0 0' }}>
                                    <div style={{ height: topH, background: topColor, flexShrink: 0 }} />
                                    <div style={{ height: bottomH, background: bottomColor, flexShrink: 0 }} />
                                  </div>
                                )}

                                {bar.key === 'target' && (
                                  <div style={{
                                    height: barH,
                                    background: 'rgba(29,181,132,0.15)',
                                    border: '2px dashed rgba(29,181,132,0.55)',
                                    borderRadius: '4px 4px 0 0',
                                  }} />
                                )}

                                {/* Actual bar: teal bracket + ROI bubble */}
                                {bar.isActual && (
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
                                        <p style={{ fontSize: '9px', fontWeight: 700, color: '#6B7A8D', marginBottom: 3 }}>ROI</p>
                                        <p style={{
                                          fontSize: '13px', fontWeight: 800, lineHeight: 1,
                                          color: results.roiPct >= 0 ? '#1DB584' : '#f59e0b',
                                        }}>
                                          {results.roiPct >= 0 ? '+' : ''}{results.roiPct.toFixed(1)}%
                                        </p>
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
                      <div className="absolute left-0 right-0 bottom-0 flex gap-2" style={{ height: XLABEL_H }}>
                        {chartBars.map((bar) => (
                          <div key={bar.key} className="flex-1 flex justify-center items-center">
                            {bar.isActual ? (
                              <span className="rounded-full"
                                style={{ background: '#1DB584', color: '#fff', fontSize: '8px', fontWeight: 700, lineHeight: 1, display: 'inline-block', padding: '3px 7px' }}>
                                {bar.label}
                              </span>
                            ) : (
                              <span style={{ fontSize: '8px', color: '#9BA8B5' }}>{bar.label}</span>
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
              FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI ROI Analysis
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={!results || pdfLoading}
              className="inline-flex items-center gap-1.5 select-none"
              style={{
                background: '#1DB584', color: '#ffffff', borderRadius: 9999,
                padding: '7px 16px', fontSize: '13px', fontWeight: 700,
                opacity: (!results || pdfLoading) ? 0.6 : 1,
                cursor: (!results || pdfLoading) ? 'not-allowed' : 'pointer',
              }}
            >
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

        <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

          {!results && (
            <div className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#1DB584' }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                Enter your details above to see the ROI analysis.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 340 }}>
                The analysis will show your ROI Health Score, target progress, and break-even position.
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
                    <span className="text-sm font-bold text-slate-800">ROI Analysis</span>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row">

                    {/* Gauge 1: ROI Health Score */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0 pb-3 sm:pb-0 sm:pr-3">
                      <div className="flex items-center w-full mb-2">
                        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>ROI Health Score</p>
                        <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                          style={{ fontSize: '10px', fontWeight: 700, background: results.healthBg, color: results.healthColor }}>
                          {results.healthStatus}
                        </span>
                      </div>
                      {(() => {
                        const GR = 48; const GC = 2 * Math.PI * GR;
                        const GARC = (240 / 360) * GC;
                        const GFIL = GARC * (results.healthScore / 100);
                        return (
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 66, 66)" />
                              <circle cx="66" cy="66" r={GR} fill="none" stroke={results.healthColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>{results.healthScore}</span>
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>/ 100</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: results.healthColor }}>{results.healthLabel}</span>
                            </div>
                          </div>
                        );
                      })()}
                      <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                        {results.roiPct >= 0
                          ? `${results.roiPct.toFixed(1)}% return on your total cost of ${fmt(results.totalCost)}.`
                          : `${Math.abs(results.roiPct).toFixed(1)}% loss relative to your total cost.`}
                        {results.healthStatus === 'Healthy'
                          ? ' Strong return on this investment.'
                          : results.healthStatus === 'Watch'
                          ? ' Modest return — consider whether it meets your goals.'
                          : results.isLoss
                          ? ' Review costs or final value to identify recovery opportunities.'
                          : ' Low return — review cost structure or revenue potential.'}
                      </p>
                    </div>

                    <div className="hidden sm:block self-stretch w-px mx-1" style={{ background: 'rgba(15,41,66,0.08)' }} />
                    <div className="block sm:hidden h-px w-full mb-3" style={{ background: 'rgba(15,41,66,0.08)' }} />

                    {/* Gauge 2: Target Progress */}
                    {(() => {
                      const fillPct = results.hasTarget ? Math.min(100, results.targetProgress) : 0;
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
                              {results.hasTarget ? (
                                <>
                                  <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>
                                    {Math.round(results.targetProgress)}<span style={{ fontSize: '1rem' }}>%</span>
                                  </span>
                                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>of target</span>
                                </>
                              ) : (
                                <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>—</span>
                              )}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: results.tpColor }}>{results.tpLabel}</span>
                            </div>
                          </div>
                          <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                            {!results.hasTarget
                              ? 'Add a Target ROI % above to see your progress toward a return goal.'
                              : results.leverState === 'on-track'
                                ? `ROI of ${results.roiPct.toFixed(1)}% exceeds your ${results.targetROIPct}% target by ${fmt(safe(results.surplus))}.`
                                : `Reaching ${Math.round(results.targetProgress)}% of your ${results.targetROIPct}% target ROI.`}
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
                  {results.leverState === 'behind' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(safe(results.additionalValueNeeded))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">additional value needed to reach your {results.targetROIPct}% target</p>
                          <p className="text-slate-400 text-xs mt-0.5">based on a total cost of {fmt(results.totalCost)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.targetFinalValue))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Target final value</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.additionalValueNeeded))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Current gap</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Estimate based on current inputs. Actual results depend on market conditions and cost structure.
                        </p>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmt(safe(results.additionalValueNeeded))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(safe(results.targetFinalValue))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Target final value</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(safe(results.additionalValueNeeded))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Current gap</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">additional value needed to reach your {results.targetROIPct}% target</p>
                          <p className="text-slate-400 text-xs mt-0.5">based on a total cost of {fmt(results.totalCost)}</p>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Estimate based on current inputs. Actual results depend on market conditions and cost structure.
                        </p>
                      </div>
                    </>
                  ))()}

                  {/* State B: on track */}
                  {results.leverState === 'on-track' && (() => (
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
                          <p className="text-white font-semibold text-sm">surplus above your {results.targetROIPct}% target</p>
                          <p className="text-slate-400 text-xs mt-0.5">final value of {fmt(results.finalValue)} exceeds target of {fmt(safe(results.targetFinalValue))}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{results.roiPct.toFixed(1)}%</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Actual ROI</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{results.targetROIPct}%</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Target ROI</span>
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
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{results.roiPct.toFixed(1)}%</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Actual ROI</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{results.targetROIPct}%</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Target ROI</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">surplus above your {results.targetROIPct}% target</p>
                          <p className="text-slate-400 text-xs mt-0.5">final value of {fmt(results.finalValue)} exceeds target of {fmt(safe(results.targetFinalValue))}</p>
                        </div>
                      </div>
                    </>
                  ))()}

                  {/* State C: no target, profit */}
                  {results.leverState === 'no-target-profit' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(safe(results.netProfit))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">profit above break-even</p>
                          <p className="text-slate-400 text-xs mt-0.5">add a Target ROI % to see how far above your goal you are</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(results.finalValue)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Final value</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{results.roiPct.toFixed(1)}%</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">ROI</span>
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
                              {fmt(safe(results.netProfit))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(results.finalValue)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Final value</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{results.roiPct.toFixed(1)}%</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">ROI</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">profit above break-even</p>
                          <p className="text-slate-400 text-xs mt-0.5">add a Target ROI % to see how far above your goal you are</p>
                        </div>
                      </div>
                    </>
                  ))()}

                  {/* State D: no target, loss */}
                  {results.leverState === 'no-target-loss' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#f59e0b', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(safe(results.breakEvenGap))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">break-even gap</p>
                          <p className="text-slate-400 text-xs mt-0.5">additional value needed to recover your total cost of {fmt(results.totalCost)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(results.totalCost)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Break-even</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>−{fmt(safe(results.breakEvenGap))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Current gap</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Add a Target ROI % above to unlock personalised goal analysis.
                        </p>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#f59e0b', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmt(safe(results.breakEvenGap))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(results.totalCost)}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Break-even</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>−{fmt(safe(results.breakEvenGap))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Current gap</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">break-even gap</p>
                          <p className="text-slate-400 text-xs mt-0.5">additional value needed to recover your total cost of {fmt(results.totalCost)}</p>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Add a Target ROI % above to unlock personalised goal analysis.
                        </p>
                      </div>
                    </>
                  ))()}

                </div>

              </div>

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Card 1 — Profitability Check */}
                <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Profitability Check</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.roiPct >= 30
                      ? <>Your ROI of <strong className="text-emerald-700">+{results.roiPct.toFixed(1)}%</strong> represents a strong return. Your final value of <strong className="text-emerald-700">{fmt(results.finalValue)}</strong> significantly exceeds your total cost of {fmt(results.totalCost)}.</>
                      : results.roiPct >= 10
                      ? <>Your ROI of <strong className="text-emerald-700">+{results.roiPct.toFixed(1)}%</strong> is a positive return. Your final value of <strong className="text-emerald-700">{fmt(results.finalValue)}</strong> exceeds your total cost of {fmt(results.totalCost)}.</>
                      : results.roiPct >= 0
                      ? <>Your ROI of <strong className="text-emerald-700">+{results.roiPct.toFixed(1)}%</strong> is a modest positive return. Final value {fmt(results.finalValue)} is slightly above total cost {fmt(results.totalCost)}.</>
                      : <>Your ROI of <strong className="text-emerald-700">{results.roiPct.toFixed(1)}%</strong> reflects a loss. Final value {fmt(results.finalValue)} is below total cost {fmt(results.totalCost)} by {fmt(safe(results.breakEvenGap))}.</>}
                  </p>
                </div>

                {/* Card 2 — Break-even Analysis */}
                <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                      <Activity className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Break-even Analysis</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.isLoss
                      ? <>Your break-even point is <strong className="text-sky-700">{fmt(results.totalCost)}</strong>. Current final value of {fmt(results.finalValue)} is <strong className="text-sky-700">{fmt(safe(results.breakEvenGap))}</strong> short of recovering all costs.</>
                      : results.breakEvenStatus === 'break-even'
                      ? <>Your final value of <strong className="text-sky-700">{fmt(results.finalValue)}</strong> exactly matches your total cost — you are at the break-even point with no profit or loss.</>
                      : <>Your break-even point is <strong className="text-sky-700">{fmt(results.totalCost)}</strong>. Current final value of {fmt(results.finalValue)} is <strong className="text-sky-700">{fmt(safe(results.netProfit))}</strong> above break-even — a margin of {results.roiPct.toFixed(1)}%.</>}
                  </p>
                </div>

                {/* Card 3 — Annualized Return / Time Impact */}
                <div className="rounded-2xl p-4" style={{ background: '#fdf4ff', border: '1px solid #e9d5ff' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#f3e8ff' }}>
                      <Zap className="w-3.5 h-3.5 text-purple-500" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Annualized Return</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.hasYears && results.annualizedROI !== null
                      ? <>Over your <strong className="text-purple-700">{results.years}yr</strong> holding period, your total ROI of {results.roiPct.toFixed(1)}% equates to an annualized return of <strong className="text-purple-700">{results.annualizedROI >= 0 ? '+' : ''}{results.annualizedROI.toFixed(1)}% per year</strong>. This lets you compare this return against other multi-year opportunities on an equal footing.</>
                      : results.hasYears && results.annualizedROI === null
                      ? <>A total loss of 100% or more means annualized return cannot be calculated — the full investment was not recovered.</>
                      : <>Enter a holding period above to see your annualized ROI. Annualizing a return lets you compare investments held for different lengths of time on an equal basis.</>}
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
            This analysis is for illustrative and informational purposes only. Results are estimates based on the values entered and may not reflect taxes, fees, financing costs, inflation, risk, or actual investment outcomes. This does not constitute financial, tax, legal, investment, or business advice. Consult a qualified professional before making financial or business decisions.
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
        This calculator is for illustrative and informational purposes only. Results are estimates based on the values entered and may not reflect taxes, fees, financing costs, inflation, risk, or actual outcomes. This does not constitute financial, tax, legal, investment, or business advice. Consult a qualified professional before making financial or business decisions.
      </p>

    </div>
  );
}
