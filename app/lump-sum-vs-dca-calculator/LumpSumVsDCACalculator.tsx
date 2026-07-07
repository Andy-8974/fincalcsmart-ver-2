'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip, DonutChart, type PieSlice } from '../_mortgage-shared/ui';
import { fmtCAD, fmtCADx, fmtUSD, fmtUSDx } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  Activity, AlertTriangle, BookOpen, Download,
  GitCompare, HelpCircle, Mail, ShieldAlert, Sparkles, TrendingUp, Zap,
} from 'lucide-react';
import { buildLumpSumVsDcaPDF } from '@/lib/pdf/adapters/lumpSumVsDcaAdapter';

// ─── Types ────────────────────────────────────────────────────────────────────

type FreqKey = 'annually' | 'semi' | 'monthly' | 'daily';

interface FormState {
  totalAmount: string;
  annualRate: string;
}

interface LSDCAResults {
  totalAmount: number;
  annualRate: number;
  freq: FreqKey;
  yearsInvested: number;
  spreadMonths: number;
  effectiveMonthlyRate: number;
  // Lump sum scenario
  lumpFV: number;
  lumpGain: number;
  // Monthly strategy scenario
  dcaMonthly: number;
  dcaFV: number;
  dcaGain: number;
  // Comparison
  gainDelta: number;           // lumpFV - dcaFV (always >= 0 for positive rates)
  deltaIsSignificant: boolean;
  comparisonState: 'lump-ahead' | 'similar';
  // Advantage score 0–100
  advantageScore: number;
  advantageLabel: 'Strong' | 'Moderate' | 'Minimal';
  advantageColor: string;
  advantageBg: string;
  // Milestone gaps (lump - dca at fixed horizons, using current spreadMonths)
  lumpAt10: number;
  dcaAt10: number;
  lumpAt20: number;
  dcaAt20: number;
  lumpAt30: number;
  dcaAt30: number;
}

// ─── Defaults & constants ─────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  totalAmount: '10000',
  annualRate: '7',
};

const DEFAULT_YEARS = 10;
const YEAR_OPTIONS = [5, 10, 15, 20, 30] as const;
const CHART_YEARS = [5, 10, 15, 20, 30] as const;
const DEFAULT_FREQ: FreqKey = 'monthly';

const DEFAULT_SPREAD = 24;
const SPREAD_OPTIONS = [3, 6, 12, 24, 36] as const;

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

/** Lump sum: P compounded for `months` months */
function calcFVLump(r: number, months: number, principal: number): number {
  if (months <= 0) return Math.max(0, principal);
  if (Math.abs(r) < 1e-10) return Math.max(0, principal);
  const growth = Math.pow(1 + r, months);
  if (!Number.isFinite(growth)) return Math.max(0, principal);
  return Math.max(0, principal * growth);
}

/**
 * Monthly strategy FV.
 * Equal monthly contributions of `monthly` for `spreadMonths` months.
 * Each contribution then compounds for the remaining (horizonMonths - contributionMonth) months.
 * horizonMonths = total investment horizon in months.
 * spreadMonths  = number of months over which contributions are made (≤ horizonMonths).
 *
 * FV = Σ_{k=1}^{spreadMonths}  monthly × (1+r)^(horizonMonths - k)
 *    = monthly × (1+r)^(horizonMonths-1) × [(1 - (1+r)^(-spreadMonths)) / (1 - (1+r)^(-1))]
 *
 * Simpler closed form (annuity-due variant grown to horizon):
 *   annuityFV  = monthly × [(1+r)^spreadMonths - 1] / r   (value at end of spread period)
 *   finalFV    = annuityFV × (1+r)^(horizonMonths - spreadMonths)
 */
function calcFVMonthlyStrategy(
  r: number,
  spreadMonths: number,
  horizonMonths: number,
  monthly: number,
): number {
  if (spreadMonths <= 0 || horizonMonths <= 0) return 0;
  const clampedSpread = Math.min(spreadMonths, horizonMonths);
  if (Math.abs(r) < 1e-10) {
    // 0% rate: contributions don't grow — total = monthly × clampedSpread
    return Math.max(0, monthly * clampedSpread);
  }
  const spreadGrowth = Math.pow(1 + r, clampedSpread);
  if (!Number.isFinite(spreadGrowth)) return Math.max(0, monthly * clampedSpread);
  const annuityFV = monthly * (spreadGrowth - 1) / r;
  const remainingMonths = horizonMonths - clampedSpread;
  if (remainingMonths <= 0) return Math.max(0, annuityFV);
  const tailGrowth = Math.pow(1 + r, remainingMonths);
  if (!Number.isFinite(tailGrowth)) return Math.max(0, annuityFV);
  return Math.max(0, annuityFV * tailGrowth);
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

function computeResults(
  form: FormState,
  freq: FreqKey,
  yearsInvested: number,
  spreadMonths: number,
): LSDCAResults | null {
  const totalAmount = Math.max(0, parseFloat(form.totalAmount) || 0);
  const annualRate  = Math.max(0, Math.min(49.9, parseFloat(form.annualRate) || 0));

  if (totalAmount <= 0) return null;

  const periods = FREQ_OPTIONS.find(f => f.key === freq)!.periods;
  const r = getEffectiveMonthlyRate(annualRate, periods);
  const horizonMonths = yearsInvested * 12;
  const clampedSpread = Math.min(spreadMonths, horizonMonths);

  // ── Lump sum ──
  const lumpFV   = calcFVLump(r, horizonMonths, totalAmount);
  const lumpGain = Math.max(0, lumpFV - totalAmount);

  // ── Monthly strategy ──
  const dcaMonthly = clampedSpread > 0 ? totalAmount / clampedSpread : totalAmount;
  const dcaFV      = calcFVMonthlyStrategy(r, clampedSpread, horizonMonths, dcaMonthly);
  const dcaGain    = Math.max(0, dcaFV - totalAmount);

  // ── Comparison ──
  const gainDelta         = Math.max(0, lumpFV - dcaFV);
  const deltaIsSignificant = totalAmount > 0 && gainDelta / totalAmount > 0.005;
  const comparisonState: LSDCAResults['comparisonState'] =
    deltaIsSignificant ? 'lump-ahead' : 'similar';

  // ── Advantage score ──
  const advantagePct   = totalAmount > 0 ? gainDelta / totalAmount * 100 : 0;
  const advantageScore = Math.round(Math.min(100, advantagePct * 2.5));
  const advantageLabel: LSDCAResults['advantageLabel'] =
    advantageScore >= 60 ? 'Strong' : advantageScore >= 25 ? 'Moderate' : 'Minimal';
  const advantageColor = advantageLabel !== 'Minimal' ? '#1DB584' : '#f59e0b';
  const advantageBg    = advantageLabel !== 'Minimal' ? 'rgba(29,181,132,0.10)' : 'rgba(245,158,11,0.10)';

  // ── Fixed-horizon milestones (use same spreadMonths for each) ──
  function milestonePair(yr: number) {
    const hm = yr * 12;
    const cs = Math.min(clampedSpread, hm);
    const lp = calcFVLump(r, hm, totalAmount);
    const mo = cs > 0 ? totalAmount / cs : totalAmount;
    const dp = calcFVMonthlyStrategy(r, cs, hm, mo);
    return [lp, dp] as const;
  }
  const [lumpAt10, dcaAt10] = milestonePair(10);
  const [lumpAt20, dcaAt20] = milestonePair(20);
  const [lumpAt30, dcaAt30] = milestonePair(30);

  return {
    totalAmount, annualRate, freq, yearsInvested, spreadMonths: clampedSpread,
    effectiveMonthlyRate: r,
    lumpFV, lumpGain,
    dcaMonthly, dcaFV, dcaGain,
    gainDelta, deltaIsSignificant, comparisonState,
    advantageScore, advantageLabel, advantageColor, advantageBg,
    lumpAt10, dcaAt10, lumpAt20, dcaAt20, lumpAt30, dcaAt30,
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

interface LumpSumVsDCACalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LumpSumVsDCACalculator({
  formulaContent,
  faqItems = [],
}: LumpSumVsDCACalculatorProps) {
  const { region } = useRegion();
  const [form, setForm]               = useState<FormState>(DEFAULTS);
  const [freq, setFreq]               = useState<FreqKey>(DEFAULT_FREQ);
  const [yearsInvested, setYears]     = useState<number>(DEFAULT_YEARS);
  const [spreadMonths, setSpread]     = useState<number>(DEFAULT_SPREAD);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isCA = region === 'ca';
  const currencyPrefix = isCA ? 'CA$' : '$';
  const fmt  = isCA ? fmtCAD  : fmtUSD;
  const fmtx = isCA ? fmtCADx : fmtUSDx;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const results = useMemo(
    () => computeResults(form, freq, yearsInvested, spreadMonths),
    [form, freq, yearsInvested, spreadMonths],
  );

  const donutSlices = useMemo((): PieSlice[] | null => {
    if (!results) return null;
    return [
      { label: 'Lump Sum Final Value',    value: safe(results.lumpFV), color: '#1DB584', alwaysShow: true },
      { label: 'Monthly Strategy Value',  value: safe(results.dcaFV),  color: '#0EA5E9', alwaysShow: true },
    ];
  }, [results]);

  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      await buildLumpSumVsDcaPDF({
        totalAmount:        results.totalAmount,
        annualRate:         results.annualRate,
        freq:               results.freq,
        yearsInvested:      results.yearsInvested,
        spreadMonths:       results.spreadMonths,
        lumpFV:             results.lumpFV,
        lumpGain:           results.lumpGain,
        dcaMonthly:         results.dcaMonthly,
        dcaFV:              results.dcaFV,
        dcaGain:            results.dcaGain,
        gainDelta:          results.gainDelta,
        deltaIsSignificant: results.deltaIsSignificant,
        comparisonState:    results.comparisonState,
        advantageScore:     results.advantageScore,
        advantageLabel:     results.advantageLabel,
        lumpAt10:           results.lumpAt10,
        dcaAt10:            results.dcaAt10,
        lumpAt20:           results.lumpAt20,
        dcaAt20:            results.dcaAt20,
        lumpAt30:           results.lumpAt30,
        dcaAt30:            results.dcaAt30,
        region,
      });
    } catch (e) {
      console.error('PDF generation failed', e);
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
        @keyframes teal-glow-lsdca {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-lsdca {
          animation: teal-glow-lsdca 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-lsdca:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
        .lsdca-pill, .lsdca-year-pill, .lsdca-sp-pill { flex: 1; min-width: 0; text-align: center; }
        .lsdca-pills { display: flex; flex-wrap: wrap; gap: 6px; }
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
                <GitCompare size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Lump Sum vs Monthly
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Investment Details</p>
              </div>
            </div>

            {/* ── Numeric inputs: always 2-col ── */}
            <div className="grid grid-cols-2 gap-x-3 md:gap-x-5 mb-4">

              <div className="min-w-0">
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Total Amount to Invest
                  <Tooltip text="The total capital available. Scenario A invests the full amount immediately as a lump sum. Scenario B spreads the same total equally over your chosen monthly investment period." />
                </label>
                <NumericInput
                  value={form.totalAmount}
                  onChange={(v) => set('totalAmount', v)}
                  prefix={currencyPrefix}
                  inputClassName={inputClsCompact}
                />
              </div>

              <div className="min-w-0">
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Annual Return Rate
                  <Tooltip text="Assumed annual growth rate applied to both scenarios. Illustrative — actual investment returns vary and are not guaranteed." />
                </label>
                <NumericInput
                  value={form.annualRate}
                  onChange={(v) => set('annualRate', v)}
                  suffix="%"
                  inputClassName={inputClsCompact}
                />
                <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>Applied equally to both</p>
              </div>

            </div>

            {/* ── Pill groups: full-width on mobile, 3-col on md+ ── */}
            <div
              className="pt-3 md:pt-0 space-y-3"
              style={{ borderTop: '1px solid rgba(15,41,66,0.07)' }}
            >

              {/* Compound Frequency */}
              <div>
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Compound Frequency
                  <Tooltip text="How often returns compound. Applied identically to both scenarios." />
                </label>
                <div className="lsdca-pills">
                  {FREQ_OPTIONS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className="lsdca-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
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

              {/* Investment Horizon + Monthly Spread: side by side on md+, stacked on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-x-5">

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Investment Horizon
                    <Tooltip text="How long the money stays invested. Both the lump sum and all monthly contributions compound until this point." />
                  </label>
                  <div className="lsdca-pills">
                    {YEAR_OPTIONS.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        className="lsdca-year-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
                        onClick={() => setYears(yr)}
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

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Monthly Spread Period
                    <Tooltip text="How many months the monthly strategy takes to fully invest the total amount. After this period all contributions remain invested until the final horizon." />
                  </label>
                  <div className="lsdca-pills">
                    {SPREAD_OPTIONS.map((mo) => (
                      <button
                        key={mo}
                        type="button"
                        className="lsdca-sp-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
                        onClick={() => setSpread(mo)}
                        style={
                          spreadMonths === mo
                            ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                            : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                        }
                      >
                        {mo} mo
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
                  Enter a total investment amount to compare both strategies.
                </p>
              </div>
            )}

            {results && (
              <div className="flex flex-col flex-1 gap-4">

                {/* Comparison badge */}
                {results.comparisonState === 'lump-ahead' ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl py-2 px-3"
                    style={{ background: 'rgba(29,181,132,0.12)', border: '1px solid rgba(29,181,132,0.25)' }}>
                    <TrendingUp size={13} style={{ color: '#1DB584' }} aria-hidden />
                    <span style={{ color: '#1DB584', fontSize: '12px', fontWeight: 700 }}>
                      Lump Sum +{fmt(safe(results.gainDelta))} ahead at {results.annualRate}% return
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-xl py-2 px-3"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 600 }}>
                      Outcomes are similar at this return rate
                    </span>
                  </div>
                )}

                {/* Lump sum hero */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(29,181,132,0.18)' }}
                >
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(29,181,132,0.7)' }}>
                    Lump Sum Final Value
                  </p>
                  <p style={{ color: '#1DB584', fontSize: '34px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 6 }}>
                    {fmt(safe(results.lumpFV))}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', marginTop: 4, fontWeight: 500 }}>
                    full {fmt(safe(results.totalAmount))} invested at start · {results.yearsInvested}yr horizon
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#0EA5E9' }} />
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Monthly Strategy Final Value</span>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: '#0EA5E9' }}>
                      {fmt(safe(results.dcaFV))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">Monthly Amount</span>
                    <span className="text-[13px] font-bold text-white">
                      {fmtx(safe(results.dcaMonthly))}<span className="text-slate-400 font-normal text-xs">/mo</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">Spread Period</span>
                    <span className="text-[13px] font-bold text-white">{results.spreadMonths} months</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Growth Difference</span>
                    <span className="text-[13px] font-semibold" style={{ color: '#1DB584' }}>
                      +{fmt(safe(results.gainDelta))}
                    </span>
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See how timing and compounding shape the difference between strategies.
                  </p>
                  <button
                    className="btn-ai-cta-lsdca w-full font-bold overflow-hidden"
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
                      Review Strategy Insights ↓
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
                      See AI Strategy Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* ══ Block C: Final Value Comparison + Growth Over Time ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Left: Final Value Comparison donut ────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Strategy comparison
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Final Value Comparison</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter details to compare both strategies.
                </p>
              </div>
            )}

            {results && donutSlices && (() => {
              const totalShown = safe(results.lumpFV) + safe(results.dcaFV);
              const rows = [
                { label: 'Lump Sum', value: results.lumpFV, color: '#1DB584' },
                { label: 'Monthly Strategy', value: results.dcaFV, color: '#0EA5E9' },
              ];
              return (
                <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                  <div className="shrink-0">
                    <DonutChart
                      slices={donutSlices}
                      className="w-52 h-52"
                      centerValue={fmt(safe(results.lumpFV))}
                      centerLabel="lump sum"
                    />
                  </div>
                  <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    {rows.map(({ label, value, color }) => {
                      const pct = totalShown > 0 ? Math.round((safe(value) / totalShown) * 100) : 0;
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
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>Difference</span>
                      <span className="font-bold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>
                        +{fmt(safe(results.gainDelta))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>Total Invested</span>
                      <span className="font-bold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmt(safe(results.totalAmount))}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Right: Growth Over Time dual-bar chart ─────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Compare over time
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
              const sp = results.spreadMonths;
              const allYears = CHART_YEARS.map((yr) => {
                const hm  = yr * 12;
                const cs  = Math.min(sp, hm);
                const lump = calcFVLump(r, hm, results.totalAmount);
                const mo   = cs > 0 ? results.totalAmount / cs : results.totalAmount;
                const dca  = calcFVMonthlyStrategy(r, cs, hm, mo);
                const gap  = Math.max(0, lump - dca);
                return { yr, lump, dca, gap, isCurrent: yr === results.yearsInvested };
              });

              const cur  = allYears.find((d) => d.isCurrent) ?? allYears[1];
              const yMax = niceMax(Math.max(...allYears.map((d) => d.lump)));
              const CHART_H  = 188;
              const XLABEL_H = 30;
              const YAXIS_W  = 36;

              const statRows = [
                { label: 'Lump Sum',    value: fmt(safe(cur.lump)), color: '#1DB584' as const },
                { label: 'Monthly Str.', value: fmt(safe(cur.dca)),  color: '#0EA5E9' as const },
                { label: 'Difference',  value: `+${fmt(safe(cur.gap))}`, color: '#0D1B2A' as const },
              ];
              const legendRows = [
                { label: 'Lump Sum', color: '#1DB584' as const },
                { label: 'Monthly',  color: '#0EA5E9' as const },
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

                      {/* Dual bars per milestone year */}
                      <div className="absolute left-0 right-0 flex" style={{ bottom: XLABEL_H, height: CHART_H }}>
                        {allYears.map((d) => {
                          const lumpH = yMax > 0 ? Math.round((d.lump / yMax) * CHART_H) : 0;
                          const dcaH  = yMax > 0 ? Math.round((d.dca  / yMax) * CHART_H) : 0;
                          const gapLabel = `+${fmtShort(d.gap)}`;
                          return (
                            <div key={d.yr} className="flex-1 flex justify-center items-end gap-[3px]">
                              {/* Lump sum bar */}
                              <div style={{ position: 'relative', width: '36%', minWidth: 5 }}>
                                {!d.isCurrent && lumpH > 0 && (
                                  <div style={{
                                    position: 'absolute', bottom: lumpH + 3, left: '50%',
                                    transform: 'translateX(-50%)', fontSize: '6.5px', color: '#9BA8B5',
                                    fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none', lineHeight: 1,
                                  }}>
                                    {fmtShort(d.lump)}
                                  </div>
                                )}
                                <div style={{ height: lumpH, width: '100%', borderRadius: '4px 4px 0 0', background: '#1DB584' }} />
                                {d.isCurrent && (
                                  <div style={{
                                    position: 'absolute', top: -6, left: -5, right: -5, bottom: 0,
                                    borderTop: '2px solid #1DB584', borderLeft: '2px solid #1DB584',
                                    borderRight: '2px solid rgba(29,181,132,0.4)',
                                    borderRadius: '10px 10px 0 0',
                                    boxShadow: '0 0 12px rgba(29,181,132,0.18)',
                                    pointerEvents: 'none',
                                  }} />
                                )}
                              </div>
                              {/* Monthly strategy bar */}
                              <div style={{ position: 'relative', width: '36%', minWidth: 5 }}>
                                <div style={{ height: dcaH, width: '100%', borderRadius: '4px 4px 0 0', background: '#0EA5E9' }} />
                                {d.isCurrent && (
                                  <>
                                    <div style={{
                                      position: 'absolute', top: -6, left: -5, right: -5, bottom: 0,
                                      borderTop: '2px solid #0EA5E9',
                                      borderLeft: '2px solid rgba(14,165,233,0.4)',
                                      borderRight: '2px solid #0EA5E9',
                                      borderRadius: '10px 10px 0 0',
                                      boxShadow: '0 0 12px rgba(14,165,233,0.15)',
                                      pointerEvents: 'none',
                                    }} />
                                    {/* Gap bubble above taller bar */}
                                    <div style={{
                                      position: 'absolute',
                                      bottom: Math.max(lumpH, dcaH) + 12,
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
                                        <p style={{ fontSize: '9px', fontWeight: 700, color: '#6B7A8D', marginBottom: 3 }}>Gap</p>
                                        <p style={{ fontSize: '13px', fontWeight: 800, color: '#1DB584', lineHeight: 1 }}>{gapLabel}</p>
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
                      <div className="absolute left-0 right-0 bottom-0 flex" style={{ height: XLABEL_H }}>
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
              FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Strategy Analysis
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
                Enter your details above to see the strategy analysis.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 360 }}>
                The analysis will show the compounding cost of spreading your capital over time versus investing it all immediately.
              </p>
            </div>
          )}

          {results && (
            <>
              {/* ── Row 1: white gauge card + dark smart lever ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Left — Timing Analysis */}
                <div className="rounded-2xl p-4 flex flex-col"
                  style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold text-slate-800">Timing Analysis</span>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row">

                    {/* Gauge: Timing Advantage Score */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0 pb-3 sm:pb-0 sm:pr-3">
                      <div className="flex items-center w-full mb-2">
                        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Timing Advantage</p>
                        <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                          style={{ fontSize: '10px', fontWeight: 700, background: results.advantageBg, color: results.advantageColor }}>
                          {results.advantageLabel}
                        </span>
                      </div>
                      {(() => {
                        const GR = 48; const GC = 2 * Math.PI * GR;
                        const GARC = (240 / 360) * GC;
                        const GFIL = GARC * (results.advantageScore / 100);
                        return (
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 66, 66)" />
                              <circle cx="66" cy="66" r={GR} fill="none" stroke={results.advantageColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>{results.advantageScore}</span>
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>/ 100</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: results.advantageColor }}>{results.advantageLabel}</span>
                            </div>
                          </div>
                        );
                      })()}
                      <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                        {results.annualRate === 0
                          ? 'At 0% return, both strategies produce identical results — timing does not affect outcome when there is no growth.'
                          : results.advantageLabel === 'Strong'
                            ? `At ${results.annualRate}%, deploying the full ${fmt(results.totalAmount)} immediately gives significantly more time in the market than spreading over ${results.spreadMonths} months.`
                            : results.advantageLabel === 'Moderate'
                              ? `Over ${results.yearsInvested} years at ${results.annualRate}%, a ${results.spreadMonths}-month spread creates a measurable compounding cost compared with immediate deployment.`
                              : `The timing cost is small at this return rate and spread period. Both strategies produce similar projected outcomes over ${results.yearsInvested} years.`
                        }
                      </p>
                    </div>

                    <div className="hidden sm:block self-stretch w-px mx-1" style={{ background: 'rgba(15,41,66,0.08)' }} />
                    <div className="block sm:hidden h-px w-full mb-3" style={{ background: 'rgba(15,41,66,0.08)' }} />

                    {/* Right: Monthly amount callout */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0 sm:pl-3">
                      <div className="flex items-center w-full mb-2">
                        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Monthly Strategy</p>
                        <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                          style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(14,165,233,0.10)', color: '#0EA5E9' }}>
                          {results.spreadMonths} mo spread
                        </span>
                      </div>
                      <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                          width: 108, height: 108, borderRadius: '50%',
                          border: '10px solid rgba(14,165,233,0.15)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(14,165,233,0.04)',
                        }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1, letterSpacing: '-1px' }}>
                            {fmtx(safe(results.dcaMonthly))}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600, marginTop: 3 }}>/month</span>
                        </div>
                      </div>
                      <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                        {fmtx(safe(results.dcaMonthly))}/month for {results.spreadMonths} months,
                        then all invested funds continue compounding until the {results.yearsInvested}-year horizon.
                      </p>
                    </div>

                  </div>
                </div>

                {/* Right — Smart Lever */}
                <div className="rounded-2xl p-3 flex flex-col"
                  style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold" style={{ color: '#1DB584' }}>
                      {results.comparisonState === 'similar' ? 'Outcomes Are Similar' : 'Lump Sum Growth Advantage'}
                    </span>
                  </div>

                  {/* State A: lump ahead */}
                  {results.comparisonState === 'lump-ahead' && (() => (
                    <>
                      {/* Mobile */}
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(safe(results.gainDelta))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">
                            spreading over {results.spreadMonths} months gives up this much in projected growth
                          </p>
                          <p className="text-slate-400 text-xs mt-0.5">
                            compared with investing the full {fmt(results.totalAmount)} immediately at {results.annualRate}% over {results.yearsInvested} years
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.lumpFV))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Lump sum</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.dcaFV))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#0EA5E9' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Monthly strategy</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.32)' }}>
                          This does not mean lump sum is always the right personal choice. Monthly investing may reduce entry-point stress, but this fixed-return model shows the cost of waiting to be fully invested.
                        </p>
                      </div>
                      {/* Desktop */}
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmt(safe(results.gainDelta))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(safe(results.lumpFV))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Lump sum</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(safe(results.dcaFV))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#0EA5E9' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Monthly strategy</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">
                            spreading over {results.spreadMonths} months gives up {fmt(safe(results.gainDelta))} in projected growth
                          </p>
                          <p className="text-slate-400 text-xs mt-0.5">
                            compared with investing the full {fmt(results.totalAmount)} immediately at {results.annualRate}% over {results.yearsInvested} years
                          </p>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.32)' }}>
                          This does not mean lump sum is always the right personal choice. Monthly investing may reduce entry-point stress, but this fixed-return model shows the cost of waiting to be fully invested.
                        </p>
                      </div>
                    </>
                  ))()}

                  {/* State B: similar */}
                  {results.comparisonState === 'similar' && (() => (
                    <>
                      {/* Mobile */}
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex flex-col items-center justify-center px-4 py-4 gap-1"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Both strategies produce</span>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.6rem, 8vw, 2.0rem)', color: '#1DB584', letterSpacing: '-1px', lineHeight: 1 }}>
                            ~{fmt(safe((results.lumpFV + results.dcaFV) / 2))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">similar projected outcome</p>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {results.annualRate === 0
                              ? 'At 0% return, timing has no effect — both strategies result in the same total as the amount invested.'
                              : `The projected gap is very small over ${results.yearsInvested} years with a ${results.spreadMonths}-month spread at ${results.annualRate}%.`
                            }
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.lumpFV))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Lump sum</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(safe(results.dcaFV))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#0EA5E9' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Monthly strategy</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Desktop */}
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginBottom: 4 }}>Both produce</span>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(1.7rem, 4vw, 2.2rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                              ~{fmt(safe((results.lumpFV + results.dcaFV) / 2))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(safe(results.lumpFV))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Lump sum</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(safe(results.dcaFV))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#0EA5E9' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Monthly strategy</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">similar projected outcome</p>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {results.annualRate === 0
                              ? 'At 0% return, timing has no effect — both strategies result in the same total as the amount invested.'
                              : `The projected gap is very small over ${results.yearsInvested} years with a ${results.spreadMonths}-month spread at ${results.annualRate}%.`
                            }
                          </p>
                        </div>
                      </div>
                    </>
                  ))()}

                </div>

              </div>

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Card 1 — Time in Market Impact */}
                <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Time in Market Impact</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Under a fixed {results.annualRate}% return, the lump sum has the full capital working from day one.
                    The monthly strategy spreads entry over {results.spreadMonths} months — each contribution starts compounding when it is invested and runs to the end of the {results.yearsInvested}-year horizon.{' '}
                    The projected gap at year 10 is <strong className="text-sky-700">{fmt(safe(results.lumpAt10 - results.dcaAt10))}</strong>,{' '}
                    growing to <strong className="text-sky-700">{fmt(safe(results.lumpAt20 - results.dcaAt20))}</strong> by year 20.
                  </p>
                </div>

                {/* Card 2 — Return Rate Sensitivity */}
                <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                      <Zap className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Return Rate Sensitivity</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.annualRate === 0
                      ? 'At 0% return, both strategies produce identical results — timing has no effect when capital does not grow.'
                      : results.annualRate <= 3
                        ? `At ${results.annualRate}%, the compounding cost of a ${results.spreadMonths}-month spread is modest. Lower return rates narrow the gap between the two strategies considerably.`
                        : `At ${results.annualRate}%, spreading entry over ${results.spreadMonths} months creates a meaningful compounding cost. Higher assumed returns amplify the advantage of having capital deployed sooner. Reduce the rate and the gap narrows.`
                    }
                  </p>
                </div>

                {/* Card 3 — Strategy Tradeoff */}
                <div className="rounded-2xl p-4" style={{ background: '#fdf4ff', border: '1px solid #e9d5ff' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#f3e8ff' }}>
                      <AlertTriangle className="w-3.5 h-3.5 text-purple-500" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Strategy Tradeoff</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    This calculator assumes a fixed, constant annual return — real markets fluctuate. In practice, a lump sum invested at a market peak may underperform a gradual approach during a subsequent drawdown. Monthly investing spreads entry timing and may reduce psychological discomfort around timing the market. Neither approach is universally superior — the right choice depends on individual circumstances, cash availability, and comfort with timing risk. This is an educational illustration, not a recommendation.
                  </p>
                </div>

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
            This analysis is for illustrative and informational purposes only. Results are estimates based on a fixed assumed annual return applied equally to both scenarios. The monthly investment strategy assumes equal contributions each month over the selected spread period only — not the full investment horizon. All invested amounts continue to compound at the assumed rate until the final horizon. Results do not account for taxes, inflation, transaction costs, market volatility, or market timing risk. Actual investment returns vary and cannot be predicted. This does not constitute financial, investment, tax, or legal advice. Consult a qualified financial advisor before making financial decisions.
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
        This calculator is for illustrative and informational purposes only. Results are estimates based on a fixed assumed annual return applied equally to both scenarios. The monthly investment strategy assumes equal monthly contributions over the selected spread period only — all invested amounts then compound at the assumed rate until the final horizon. Actual investment returns, fees, taxes, inflation, and market conditions will vary. This does not constitute financial, investment, tax, or legal advice. Consult a qualified financial advisor before making financial decisions.
      </p>

    </div>
  );
}
