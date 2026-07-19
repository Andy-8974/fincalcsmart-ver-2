'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip, DonutChart, type PieSlice } from '../_mortgage-shared/ui';
import { fmtCAD, fmtCADx, fmtUSD, fmtUSDx } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  Activity, AlertTriangle, BookOpen, Download,
  HelpCircle, Layers, Mail, ShieldAlert, Sparkles, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';
import type { InvestmentFeesAdapterInput } from '@/lib/pdf/adapters/investmentFeesAdapter';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  initialInvestment: string;
  monthlyContribution: string;
  annualReturn: string;
  currentFee: string;
  compFee: string;
}

interface FeeResults {
  initialInvestment: number;
  monthlyContribution: number;
  annualReturn: number;
  currentFee: number;
  compFee: number;
  yearsInvested: number;
  totalContributions: number;
  grossFV: number;
  netFV: number;
  cmpFV: number;
  lostToFees: number;
  netReturns: number;
  feeSavings: number;
  monthlyEquivSaving: number;
  growthEfficiency: number;
  feeDragScore: number;
  scoreLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  statusLabel: 'Healthy' | 'Watch' | 'Caution';
  statusColor: string;
  statusBg: string;
  isLowCost: boolean;
  feeExceedsReturn: boolean;
  extraMonthlyToMatchGross: number;
  lostAt10: number;
  lostAt20: number;
  lostAt30: number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  initialInvestment: '10000',
  monthlyContribution: '500',
  annualReturn: '7',
  currentFee: '1.50',
  compFee: '0.20',
};

const DEFAULT_YEARS = 20;
const YEAR_OPTIONS = [10, 15, 20, 25, 30] as const;
const CHART_YEARS = [5, 10, 15, 20, 25, 30] as const;

// ─── Math helpers ─────────────────────────────────────────────────────────────

function safe(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function calcFV(annualRatePct: number, years: number, principal: number, monthly: number): number {
  if (years <= 0) return Math.max(0, principal);
  const n = years * 12;
  if (Math.abs(annualRatePct) < 1e-10) return Math.max(0, principal + monthly * n);
  const r = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  if (Math.abs(r) < 1e-10) return Math.max(0, principal + monthly * n);
  const growth = Math.pow(1 + r, n);
  return Math.max(0, principal * growth + monthly * (growth - 1) / r);
}

function niceMax(v: number): number {
  if (v <= 0) return 10000;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / exp) * exp;
}

function computeResults(form: FormState, yearsInvested: number): FeeResults | null {
  const initialInvestment = Math.max(0, parseFloat(form.initialInvestment) || 0);
  const monthlyContribution = Math.max(0, parseFloat(form.monthlyContribution) || 0);
  const annualReturn = Math.max(0, Math.min(49.9, parseFloat(form.annualReturn) || 0));
  const currentFee = Math.max(0, Math.min(49.9, parseFloat(form.currentFee) || 0));
  const compFee = Math.max(0, Math.min(49.9, parseFloat(form.compFee) || 0));

  if (initialInvestment <= 0 && monthlyContribution <= 0) return null;

  const n = yearsInvested * 12;
  const totalContributions = Math.max(0, initialInvestment + monthlyContribution * n);

  const netAnnual = annualReturn - currentFee;
  const cmpAnnual = annualReturn - compFee;

  const grossFV = calcFV(annualReturn, yearsInvested, initialInvestment, monthlyContribution);
  const netFV = calcFV(netAnnual, yearsInvested, initialInvestment, monthlyContribution);
  const cmpFV = calcFV(cmpAnnual, yearsInvested, initialInvestment, monthlyContribution);

  const lostToFees = Math.max(0, grossFV - netFV);
  const netReturns = Math.max(0, netFV - totalContributions);
  const feeSavings = Math.max(0, cmpFV - netFV);
  const monthlyEquivSaving = n > 0 ? feeSavings / n : 0;

  const growthEfficiency = grossFV > 0 ? Math.min(100, (netFV / grossFV) * 100) : 100;
  const lostPct = grossFV > 0 ? (lostToFees / grossFV) * 100 : 0;
  const feeDragScore = Math.round(Math.max(0, Math.min(100, 100 - lostPct * 2.8)));

  const scoreLabel: FeeResults['scoreLabel'] =
    feeDragScore >= 80 ? 'Excellent' : feeDragScore >= 65 ? 'Good' : feeDragScore >= 45 ? 'Fair' : 'Poor';
  const statusLabel: FeeResults['statusLabel'] =
    scoreLabel === 'Poor' ? 'Caution' : scoreLabel === 'Fair' ? 'Watch' : 'Healthy';
  const statusColor = statusLabel === 'Healthy' ? '#1DB584' : statusLabel === 'Watch' ? '#f59e0b' : '#ef4444';
  const statusBg = statusLabel === 'Healthy' ? 'rgba(29,181,132,0.10)' : statusLabel === 'Watch' ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

  const isLowCost = currentFee <= compFee;
  const feeExceedsReturn = currentFee >= annualReturn && annualReturn > 0;

  // Extra monthly contribution needed to match gross FV (offset fee drag)
  let extraMonthlyToMatchGross = 0;
  if (lostToFees > 0 && n > 0) {
    const safeNet = Math.max(0.001, netAnnual);
    const r_net = Math.pow(1 + safeNet / 100, 1 / 12) - 1;
    const growth_n = Math.pow(1 + r_net, n);
    const annuityFactor = r_net > 1e-10 ? (growth_n - 1) / r_net : n;
    extraMonthlyToMatchGross = annuityFactor > 0 ? lostToFees / annuityFactor : 0;
  }

  const lostAt10 = Math.max(0, calcFV(annualReturn, 10, initialInvestment, monthlyContribution) - calcFV(netAnnual, 10, initialInvestment, monthlyContribution));
  const lostAt20 = Math.max(0, calcFV(annualReturn, 20, initialInvestment, monthlyContribution) - calcFV(netAnnual, 20, initialInvestment, monthlyContribution));
  const lostAt30 = Math.max(0, calcFV(annualReturn, 30, initialInvestment, monthlyContribution) - calcFV(netAnnual, 30, initialInvestment, monthlyContribution));

  return {
    initialInvestment, monthlyContribution, annualReturn, currentFee, compFee, yearsInvested,
    totalContributions, grossFV, netFV, cmpFV,
    lostToFees, netReturns, feeSavings, monthlyEquivSaving, growthEfficiency,
    feeDragScore, scoreLabel, statusLabel, statusColor, statusBg,
    isLowCost, feeExceedsReturn,
    extraMonthlyToMatchGross,
    lostAt10, lostAt20, lostAt30,
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

interface InvestmentFeesCalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InvestmentFeesCalculator({
  formulaContent,
  faqItems = [],
}: InvestmentFeesCalculatorProps) {
  const { region } = useRegion();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [yearsInvested, setYearsInvested] = useState<number>(DEFAULT_YEARS);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isCA = region === 'ca';
  const currencyPrefix = isCA ? 'CA$' : '$';
  const fmt = isCA ? fmtCAD : fmtUSD;
  const fmtx = isCA ? fmtCADx : fmtUSDx;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const results = useMemo(() => computeResults(form, yearsInvested), [form, yearsInvested]);

  const donutSlices = useMemo((): PieSlice[] | null => {
    if (!results) return null;
    return [
      { label: 'Contributions', value: safe(results.totalContributions), color: '#1DB584', alwaysShow: true },
      { label: 'Net Returns', value: safe(results.netReturns), color: '#334155', alwaysShow: false },
      { label: 'Lost to Fees', value: safe(results.lostToFees), color: '#F59E0B', alwaysShow: true },
    ];
  }, [results]);


  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      const { buildInvestmentFeesPDF } = await import('@/lib/pdf/adapters/investmentFeesAdapter');
      const input: InvestmentFeesAdapterInput = {
        initialInvestment:      results.initialInvestment,
        monthlyContribution:    results.monthlyContribution,
        annualReturn:           results.annualReturn,
        currentFee:             results.currentFee,
        compFee:                results.compFee,
        yearsInvested:          results.yearsInvested,
        grossFV:                results.grossFV,
        netFV:                  results.netFV,
        cmpFV:                  results.cmpFV,
        totalContributions:     results.totalContributions,
        lostToFees:             results.lostToFees,
        netReturns:             results.netReturns,
        feeSavings:             results.feeSavings,
        monthlyEquivSaving:     results.monthlyEquivSaving,
        growthEfficiency:       results.growthEfficiency,
        feeDragScore:           results.feeDragScore,
        scoreLabel:             results.scoreLabel,
        statusLabel:            results.statusLabel,
        isLowCost:              results.isLowCost,
        feeExceedsReturn:       results.feeExceedsReturn,
        lostAt10:               results.lostAt10,
        lostAt20:               results.lostAt20,
        lostAt30:               results.lostAt30,
        extraMonthlyToMatchGross: results.extraMonthlyToMatchGross,
        region:                 isCA ? 'ca' : 'us',
      };
      await buildInvestmentFeesPDF(input);
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
        @keyframes teal-glow-fees {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-fees {
          animation: teal-glow-fees 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-fees:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
        .fees-year-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .fees-year-pill  { flex: 1; min-width: calc(33.33% - 5px); text-align: center; }
        @media (min-width: 480px) { .fees-year-pill { min-width: 0; } }
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
                <Layers size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Investment Fees
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Portfolio Details</p>
              </div>
            </div>

            {/* Fee exceeds return warning */}
            {results?.feeExceedsReturn && (
              <div
                className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#ef4444' }}
              >
                <AlertTriangle size={13} aria-hidden />
                Annual fee exceeds expected return — portfolio value may decline over time.
              </div>
            )}

            {/* Fields — 2-col grid */}
            <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

              {/* Left column */}
              <div className="space-y-3 min-w-0">

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Initial Investment
                    <Tooltip text="The lump sum you are starting with. Even a modest initial amount compounds meaningfully over a long horizon." />
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
                    <Tooltip text="The amount you add to the portfolio each month. Regular contributions amplify the impact of fees over time." />
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
                    Expected Annual Return
                    <Tooltip text="Your assumed gross annual return before any fees are deducted. This is an estimate — actual market returns vary and are not guaranteed." />
                  </label>
                  <NumericInput
                    value={form.annualReturn}
                    onChange={(v) => set('annualReturn', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                  {(() => {
                    const raw = parseFloat(form.annualReturn);
                    return !isNaN(raw) && (raw < 0 || raw > 49.9) ? (
                      <p className="mt-0.5 text-[10px]" style={{ color: '#f59e0b' }}>
                        Return must be 0–49.9%. Using {Math.max(0, Math.min(49.9, raw))}%.
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>Before fees</p>
                    );
                  })()}
                </div>

              </div>

              {/* Right column */}
              <div className="border-l pl-2 md:pl-5 space-y-3 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Annual Fee %
                    <Tooltip text="The annual management fee or MER on your investment. Typical index ETFs range 0.03–0.25%. Active mutual funds typically range 0.75–2.50%." />
                  </label>
                  <NumericInput
                    value={form.currentFee}
                    onChange={(v) => set('currentFee', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                  {(() => {
                    const raw = parseFloat(form.currentFee);
                    return !isNaN(raw) && (raw < 0 || raw > 49.9) ? (
                      <p className="mt-0.5 text-[10px]" style={{ color: '#f59e0b' }}>
                        Fee must be 0–49.9%. Using {Math.max(0, Math.min(49.9, raw))}%.
                      </p>
                    ) : null;
                  })()}
                </div>

                {/* Year pills */}
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Years Invested
                  </label>
                  <div className="fees-year-pills">
                    {YEAR_OPTIONS.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        className="fees-year-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
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

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Comparison Fee %
                    <Tooltip text="A lower-fee alternative to compare against. Use 0.20% as a proxy for a low-cost index fund, or enter the fee of a specific fund you are considering." />
                  </label>
                  <NumericInput
                    value={form.compFee}
                    onChange={(v) => set('compFee', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                  {(() => {
                    const raw = parseFloat(form.compFee);
                    return !isNaN(raw) && (raw < 0 || raw > 49.9) ? (
                      <p className="mt-0.5 text-[10px]" style={{ color: '#f59e0b' }}>
                        Fee must be 0–49.9%. Using {Math.max(0, Math.min(49.9, raw))}%.
                      </p>
                    ) : null;
                  })()}
                  {/* Fee difference badge */}
                  {(() => {
                    const cur = Math.max(0, Math.min(49.9, parseFloat(form.currentFee) || 0));
                    const cmp = Math.max(0, Math.min(49.9, parseFloat(form.compFee) || 0));
                    const diff = cur - cmp;
                    if (Math.abs(diff) < 0.001) return null;
                    const color = diff > 0 ? '#f59e0b' : '#1DB584';
                    const label = diff > 0
                      ? `Comparison is ${diff.toFixed(2)}% lower than current fee`
                      : `Comparison is ${Math.abs(diff).toFixed(2)}% higher than current fee`;
                    return (
                      <p className="mt-0.5 text-[10px] font-semibold" style={{ color }}>
                        {label}
                      </p>
                    );
                  })()}
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

                {/* Primary result */}
                <div
                  className="rounded-xl p-5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <p style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
                  }}>
                    Portfolio Value After Fees
                  </p>
                  <p style={{ color: '#1DB584', fontSize: '38px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 8 }}>
                    {fmt(safe(results.netFV))}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: 6, fontWeight: 500 }}>
                    after {results.yearsInvested} years · {results.currentFee}% annual fee
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#F59E0B' }} />
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Lost to Fees</span>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: '#F59E0B' }}>
                      {fmt(safe(results.lostToFees))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300 font-medium">Value at {results.compFee}% Fee</span>
                    <span className="text-[13px] font-bold text-white">{fmt(safe(results.cmpFV))}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Total Contributions</span>
                    <span className="text-[13px] font-semibold text-white">{fmt(safe(results.totalContributions))}</span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                {/* CTA */}
                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See how lower fees could change your long-term portfolio value.
                  </p>
                  <button
                    className="btn-ai-cta-fees w-full font-bold overflow-hidden"
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
                      Review Fee Impact Insights ↓
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
                      See AI Fee Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* ══ Block C: Portfolio Breakdown + Fee Impact Over Time ══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Left: Portfolio Breakdown donut ───────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Cost breakdown
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Portfolio Breakdown</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter portfolio details to see the breakdown.
                </p>
              </div>
            )}

            {results && donutSlices && (() => {
              const rows = [
                { label: 'Contributions', value: results.totalContributions, color: '#1DB584' },
                { label: 'Net Returns', value: results.netReturns, color: '#334155' },
                { label: 'Lost to Fees', value: results.lostToFees, color: '#F59E0B' },
              ];
              const totalShown = safe(results.netFV);
              const rowsSum = rows.reduce((sum, r) => sum + safe(r.value), 0);
              return (
                <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                  <div className="shrink-0">
                    <DonutChart
                      slices={donutSlices}
                      className="w-52 h-52"
                      centerValue={fmt(totalShown)}
                      centerLabel="after fees"
                    />
                  </div>
                  <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    {rows.map(({ label, value, color }) => {
                      const pct = rowsSum > 0 ? Math.round((safe(value) / rowsSum) * 100) : 0;
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
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>Gross Portfolio Value</span>
                      <span className="font-bold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmt(safe(results.grossFV))}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        {/* ── Right: Fee Impact Over Time ───────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Compare over time
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Fee Impact Over Time</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter portfolio details to compare over time.
                </p>
              </div>
            )}

            {results && (() => {
              const netAnnual = results.annualReturn - results.currentFee;
              const allYears = CHART_YEARS.map((yr) => {
                const gross = calcFV(results.annualReturn, yr, results.initialInvestment, results.monthlyContribution);
                const net = calcFV(netAnnual, yr, results.initialInvestment, results.monthlyContribution);
                const contribs = Math.min(Math.max(0, results.initialInvestment + results.monthlyContribution * yr * 12), net);
                const netRet = Math.max(0, net - contribs);
                const lostFees = Math.max(0, gross - net);
                return { yr, gross, net, contributions: contribs, netReturns: netRet, lostFees, isCurrent: yr === results.yearsInvested };
              });

              const cur = allYears.find((d) => d.isCurrent) ?? allYears[3];
              const yMax = niceMax(Math.max(...allYears.map((d) => d.net)));
              const CHART_H = 188;
              const XLABEL_H = 30;
              const YAXIS_W = 36;

              const statRows = [
                { label: 'Portfolio', value: fmt(safe(cur.net)), color: '#1DB584' as const },
                { label: 'Gross Value', value: fmt(safe(cur.gross)), color: '#0D1B2A' as const },
                { label: 'Fees Lost', value: fmt(safe(cur.lostFees)), color: '#F59E0B' as const },
              ];
              const legendRows = [
                { label: 'Contributions', color: '#1DB584' as const },
                { label: 'Net Returns', color: '#334155' as const },
              ];

              return (
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 flex-1 min-h-0">

                  {/* Left: summary + legend */}
                  <div className="flex flex-col gap-4 sm:gap-4 sm:w-[108px] shrink-0 sm:justify-center">
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

                  {/* Right: chart */}
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
                        {frac === 0 ? '$0' : `$${Math.round((yMax * frac) / 1000)}k`}
                      </div>
                    ))}

                    {/* Chart inner */}
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

                      {/* Bars + bar-anchored bubble */}
                      <div className="absolute left-0 right-0 flex gap-0.5" style={{ bottom: XLABEL_H, height: CHART_H }}>
                        {allYears.map((d) => {
                          const barH = yMax > 0 ? Math.round((d.net / yMax) * CHART_H) : 0;
                          const contribH = d.net > 0 ? Math.round((safe(d.contributions) / d.net) * barH) : barH;
                          const retH = barH - contribH;
                          return (
                            <div key={d.yr} className="flex-1 flex justify-center items-end">
                              <div style={{ position: 'relative', width: '48%', minWidth: 6 }}>
                                <div className="flex flex-col overflow-hidden"
                                  style={{ height: barH, width: '100%', borderRadius: '4px 4px 0 0' }}>
                                  <div style={{ height: Math.max(0, retH), background: '#334155', flexShrink: 0 }} />
                                  <div style={{ height: Math.max(0, contribH), background: '#1DB584', flexShrink: 0 }} />
                                </div>
                                {d.isCurrent && (
                                  <>
                                    {/* Highlight border */}
                                    <div style={{
                                      position: 'absolute', top: -7, left: -7, right: -7, bottom: 0,
                                      borderTop: '2px solid #1DB584', borderLeft: '2px solid #1DB584', borderRight: '2px solid #1DB584',
                                      borderRadius: '11px 11px 0 0',
                                      boxShadow: '0 0 14px rgba(29,181,132,0.20)',
                                      pointerEvents: 'none',
                                    }} />
                                    {/* Bubble anchored 12px above bar top */}
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
                                        <p style={{ fontSize: '9px', fontWeight: 700, color: '#6B7A8D', marginBottom: 3 }}>Fees Lost</p>
                                        <p style={{ fontSize: '13px', fontWeight: 800, color: '#F59E0B', lineHeight: 1 }}>{fmt(safe(d.lostFees))}</p>
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

        {/* Dark header */}
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
              FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Fee Analysis
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

        {/* Dashboard body */}
        <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

          {!results && (
            <div className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#1DB584' }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                Enter your portfolio details above to see the fee impact analysis.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 340 }}>
                The analysis will show your Fee Drag Score, growth efficiency, and how much lower fees could improve your long-term portfolio.
              </p>
            </div>
          )}

          {results && (
            <>
              {/* ── Row 1: white gauge card + navy smart lever ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Left — Loan Analysis (two gauges) */}
                <div className="rounded-2xl p-4 flex flex-col"
                  style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold text-slate-800">Fee Analysis</span>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row">

                    {/* Fee Drag Score */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0 pb-3 sm:pb-0 sm:pr-3">
                      <div className="flex items-center w-full mb-2">
                        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Fee Drag Score</p>
                        <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                          style={{ fontSize: '10px', fontWeight: 700, background: results.statusBg, color: results.statusColor }}>
                          {results.statusLabel}
                        </span>
                      </div>
                      {(() => {
                        const GR = 48; const GC = 2 * Math.PI * GR;
                        const GARC = (240 / 360) * GC;
                        const GFIL = GARC * (results.feeDragScore / 100);
                        return (
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 66, 66)" />
                              <circle cx="66" cy="66" r={GR} fill="none" stroke={results.statusColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>{results.feeDragScore}</span>
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
                          ? `A ${results.currentFee}% fee has low drag on long-term growth. Fee impact is manageable.`
                          : results.statusLabel === 'Watch'
                            ? `A ${results.currentFee}% fee creates meaningful drag. Fees are reducing a notable share of potential returns.`
                            : `A ${results.currentFee}% fee significantly erodes long-term growth. The compound effect of fees is substantial.`
                        }
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="hidden sm:block self-stretch w-px mx-1" style={{ background: 'rgba(15,41,66,0.08)' }} />
                    <div className="block sm:hidden h-px w-full mb-3" style={{ background: 'rgba(15,41,66,0.08)' }} />

                    {/* Growth Efficiency gauge */}
                    {(() => {
                      const eff = results.growthEfficiency;
                      const effColor = eff >= 95 ? '#1DB584' : eff >= 85 ? '#1DB584' : eff >= 70 ? '#f59e0b' : '#ef4444';
                      const effBg = eff >= 85 ? 'rgba(29,181,132,0.10)' : eff >= 70 ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';
                      const effLabel = eff >= 95 ? 'Excellent' : eff >= 85 ? 'Good' : eff >= 70 ? 'Fair' : 'Poor';
                      const effBadge = eff >= 95 ? 'Excellent' : eff >= 85 ? 'Good' : eff >= 70 ? 'Watch' : 'High Drag';
                      const effPct = Math.min(100, eff);
                      const GR = 48; const GC = 2 * Math.PI * GR;
                      const GARC = (240 / 360) * GC;
                      const GFIL = GARC * (effPct / 100);
                      return (
                        <div className="flex-1 flex flex-col items-center text-center min-w-0 pt-0 sm:pl-3">
                          <div className="flex items-center w-full mb-2">
                            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Growth Efficiency</p>
                            <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                              style={{ fontSize: '10px', fontWeight: 700, background: effBg, color: effColor }}>
                              {effBadge}
                            </span>
                          </div>
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 66, 66)" />
                              <circle cx="66" cy="66" r={GR} fill="none" stroke={effColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>
                                {eff.toFixed(0)}<span style={{ fontSize: '1rem' }}>%</span>
                              </span>
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>kept</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: effColor }}>{effLabel}</span>
                            </div>
                          </div>
                          <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                            You keep {eff.toFixed(1)}% of what your portfolio would have earned without any fees. {eff >= 90 ? 'Fee impact is minimal at this level.' : eff >= 80 ? 'A meaningful share of returns is absorbed by fees.' : 'A significant portion of potential growth is lost to fees.'}
                          </p>
                        </div>
                      );
                    })()}

                  </div>
                </div>

                {/* Right — Lower Fee Smart Lever */}
                <div className="rounded-2xl p-3 flex flex-col"
                  style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold" style={{ color: '#1DB584' }}>
                      {results.isLowCost ? 'Low-Cost Position' : 'Smart Optimization Found'}
                    </span>
                  </div>

                  {results.isLowCost ? (
                    /* Low-cost position state */
                    <>
                      {/* Mobile */}
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {results.growthEfficiency.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">growth efficiency</p>
                          <p className="text-slate-400 text-xs mt-0.5">your fee is already at or below the comparison rate</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                              {results.currentFee}%
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Annual fee</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                              {fmt(safe(results.lostToFees))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingDown className="w-3 h-3 shrink-0" style={{ color: '#F59E0B' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Lost to fees</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Desktop */}
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                              {results.growthEfficiency.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                              {results.currentFee}%
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Annual fee</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                              {fmt(safe(results.lostToFees))}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingDown className="w-3 h-3 shrink-0" style={{ color: '#F59E0B' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Lost to fees</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">growth efficiency — low-cost position</p>
                          <p className="text-slate-400 text-xs mt-0.5">your annual fee is already at or below the comparison rate</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Fee savings optimization */
                    <>
                      {/* Mobile */}
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(safe(results.feeSavings))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">estimated additional value</p>
                          <p className="text-slate-400 text-xs mt-0.5">by using the {results.compFee}% comparison fee instead</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                              {results.currentFee}% → {results.compFee}%
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Fee change</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                              {fmt(safe(results.monthlyEquivSaving))}<span className="text-slate-400 font-normal text-xs">/mo equiv</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Monthly equivalent</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Estimate based on assumed return and contribution inputs. Actual results depend on market conditions and fund terms.
                        </p>
                      </div>
                      {/* Desktop */}
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmt(safe(results.feeSavings))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                              {results.currentFee}% → {results.compFee}%
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Fee change</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                              {fmt(safe(results.monthlyEquivSaving))}<span className="text-slate-400 font-normal text-sm">/mo</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Monthly equivalent</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">estimated additional portfolio value</p>
                          <p className="text-slate-400 text-xs mt-0.5">by using the {results.compFee}% comparison fee instead of {results.currentFee}%</p>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Estimate based on assumed return and contribution inputs. Actual results depend on market conditions and fund terms.
                        </p>
                      </div>
                    </>
                  )}

                </div>

              </div>

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Card 1 — Fee Benchmark */}
                {(() => {
                  const f = results.currentFee;
                  const isLow = f < 0.20;
                  const isBelowAvg = f >= 0.20 && f < 0.75;
                  const isTypical = f >= 0.75 && f < 1.50;
                  const isHigh = f >= 1.50;
                  const borderColor = isLow ? '#bbf7d0' : isBelowAvg ? '#bbf7d0' : isTypical ? '#fde68a' : '#fecaca';
                  const bgColor = isLow ? '#f0fdf4' : isBelowAvg ? '#f0fdf4' : isTypical ? '#fffbeb' : '#fff5f5';
                  const labelColor = isLow || isBelowAvg ? 'text-emerald-600' : isTypical ? 'text-amber-600' : 'text-red-500';
                  const iconBg = isLow || isBelowAvg ? '#dcfce7' : isTypical ? '#fef3c7' : '#fee2e2';
                  const iconColor = isLow || isBelowAvg ? 'text-emerald-600' : isTypical ? 'text-amber-500' : 'text-red-500';
                  const benchmarkText = isLow
                    ? `A ${f}% annual fee is very low — in the range of passive index funds and ETFs. Fee drag on long-term growth is minimal.`
                    : isBelowAvg
                      ? `A ${f}% annual fee is below average — lower than most actively managed funds. Fee impact over the long term is relatively contained.`
                      : isTypical
                        ? `A ${f}% annual fee is in the typical range for actively managed mutual funds. Over a long horizon, this level of fee meaningfully reduces the ending portfolio value.`
                        : `A ${f}% annual fee is high by market standards. At this level, fees absorb a substantial share of long-term returns through compounding. Fee drag accelerates significantly over longer horizons.`;
                  return (
                    <div className="rounded-2xl p-4" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center justify-center shrink-0"
                          style={{ width: 28, height: 28, borderRadius: 8, background: iconBg }}>
                          <Zap className={`w-3.5 h-3.5 ${iconColor}`} aria-hidden />
                        </span>
                        <p className={`text-xs font-bold uppercase tracking-widest ${labelColor}`}>Fee Benchmark</p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{benchmarkText}</p>
                    </div>
                  );
                })()}

                {/* Card 2 — Time Horizon Impact */}
                <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Time Horizon Impact</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    At a {results.currentFee}% annual fee, fees consume{' '}
                    <strong className="text-sky-700">{fmt(safe(results.lostAt10))}</strong> by year 10,{' '}
                    <strong className="text-sky-700">{fmt(safe(results.lostAt20))}</strong> by year 20, and{' '}
                    <strong className="text-sky-700">{fmt(safe(results.lostAt30))}</strong> by year 30. Fee drag compounds — the longer the horizon, the larger the impact.
                  </p>
                </div>

                {/* Card 3 — Contribution Equivalent */}
                {(() => {
                  const extra = results.extraMonthlyToMatchGross;
                  const hasExtra = extra > 0.5;
                  return (
                    <div className="rounded-2xl p-4" style={{ background: '#fdf4ff', border: '1px solid #e9d5ff' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center justify-center shrink-0"
                          style={{ width: 28, height: 28, borderRadius: 8, background: '#f3e8ff' }}>
                          <AlertTriangle className="w-3.5 h-3.5 text-purple-500" aria-hidden />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-widest text-purple-600">Contribution Equivalent</p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {hasExtra
                          ? <>To offset the full impact of a {results.currentFee}% fee over {results.yearsInvested} years, you would need to contribute an estimated extra{' '}<strong className="text-purple-700">{fmtx(safe(extra))}/month</strong> — on top of your current contributions — to reach the same gross portfolio value.</>
                          : <>At this fee level and time horizon, the contribution needed to offset fee drag is minimal. The fee impact on your portfolio is relatively small.</>
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
            This analysis is for illustrative purposes only and does not constitute financial, investment, tax, or legal advice.
            Results assume a fixed annual return and do not account for taxes, inflation, market volatility, or changes in contribution amounts.
            Consult a qualified financial advisor before making investment decisions.
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

      {/* ══ Disclaimer ───────────────────────────────────────────────────── */}
      <p className="text-xs text-slate-400 text-center mt-4 pb-12 px-4 leading-relaxed max-w-4xl mx-auto">
        This calculator is for illustrative and informational purposes only. Results are estimates and depend on assumed
        returns, contribution amounts, fees, and time horizon. Actual investment performance, fees, taxes, inflation,
        and market conditions will vary. This does not constitute financial, tax, legal, or investment advice. Consult
        a qualified financial advisor before making investment decisions.
      </p>

    </div>
  );
}
