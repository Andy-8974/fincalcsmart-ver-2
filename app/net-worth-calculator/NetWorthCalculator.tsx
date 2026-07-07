'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip, DonutChart, type PieSlice } from '../_mortgage-shared/ui';
import { fmtCAD, fmtUSD } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  Activity, BookOpen, Download,
  HelpCircle, Mail, Scale, ShieldAlert, Sparkles, TrendingUp, Zap,
} from 'lucide-react';
import { buildNetWorthPDF } from '@/lib/pdf/adapters/netWorthAdapter';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  cashSavings: string;
  investmentsRetirement: string;
  homeRealEstate: string;
  vehiclesOther: string;
  mortgageBalance: string;
  loansCreditCards: string;
  otherDebts: string;
}

interface NWResults {
  cashSavings: number;
  investmentsRetirement: number;
  homeRealEstate: number;
  vehiclesOther: number;
  mortgageBalance: number;
  loansCreditCards: number;
  otherDebts: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  debtToAssetRatio: number | null;
  liquidPct: number | null;
  isNegativeNetWorth: boolean;
  debtOnly: boolean;
  healthScore: number;
  healthLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  healthStatus: 'Healthy' | 'Watch' | 'Caution';
  healthColor: string;
  healthBg: string;
  liqScore: number;
  liqLabel: 'Strong' | 'Moderate' | 'Low' | 'Very Low';
  liqColor: string;
  liqBg: string;
  leverState: 'negative' | 'high-debt' | 'low-liquidity' | 'healthy';
  debtReductionNeeded: number;
  liquidityGap: number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  cashSavings: '25000',
  investmentsRetirement: '75000',
  homeRealEstate: '600000',
  vehiclesOther: '25000',
  mortgageBalance: '400000',
  loansCreditCards: '15000',
  otherDebts: '0',
};

// ─── Math helpers ─────────────────────────────────────────────────────────────

function safe(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function niceMax(v: number): number {
  if (v <= 0) return 100000;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / exp) * exp;
}

function fmtShort(n: number): string {
  const abs = Math.abs(n);
  const prefix = n < 0 ? '−$' : '$';
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${Math.round(abs / 1_000)}k`;
  return `${prefix}${Math.round(abs)}`;
}

function computeResults(form: FormState): NWResults | null {
  const cashSavings = Math.max(0, parseFloat(form.cashSavings) || 0);
  const investmentsRetirement = Math.max(0, parseFloat(form.investmentsRetirement) || 0);
  const homeRealEstate = Math.max(0, parseFloat(form.homeRealEstate) || 0);
  const vehiclesOther = Math.max(0, parseFloat(form.vehiclesOther) || 0);
  const mortgageBalance = Math.max(0, parseFloat(form.mortgageBalance) || 0);
  const loansCreditCards = Math.max(0, parseFloat(form.loansCreditCards) || 0);
  const otherDebts = Math.max(0, parseFloat(form.otherDebts) || 0);

  const totalAssets = cashSavings + investmentsRetirement + homeRealEstate + vehiclesOther;
  const totalLiabilities = mortgageBalance + loansCreditCards + otherDebts;

  if (totalAssets === 0 && totalLiabilities === 0) return null;

  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : null;
  const liquidPct = totalAssets > 0 ? (cashSavings / totalAssets) * 100 : null;
  const isNegativeNetWorth = netWorth < 0;
  const debtOnly = totalAssets === 0 && totalLiabilities > 0;

  // Net Worth Health Score (debt-to-asset based)
  let healthScore: number;
  if (debtOnly) {
    healthScore = 0;
  } else if (debtToAssetRatio === null) {
    healthScore = 100;
  } else {
    healthScore = Math.round(Math.max(0, 100 - debtToAssetRatio * 1.33));
  }
  const healthLabel: NWResults['healthLabel'] =
    healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 35 ? 'Fair' : 'Poor';
  const healthStatus: NWResults['healthStatus'] =
    healthLabel === 'Poor' ? 'Caution' : healthLabel === 'Fair' ? 'Watch' : 'Healthy';
  const healthColor =
    healthStatus === 'Healthy' ? '#1DB584' : healthStatus === 'Watch' ? '#f59e0b' : '#ef4444';
  const healthBg =
    healthStatus === 'Healthy'
      ? 'rgba(29,181,132,0.10)'
      : healthStatus === 'Watch'
      ? 'rgba(245,158,11,0.10)'
      : 'rgba(239,68,68,0.10)';

  // Liquidity Score
  const liqScore = liquidPct !== null ? Math.min(100, Math.round(liquidPct * 5)) : 0;
  const liqLabel: NWResults['liqLabel'] =
    liqScore >= 70 ? 'Strong' : liqScore >= 40 ? 'Moderate' : liqScore >= 15 ? 'Low' : 'Very Low';
  const liqColor = liqScore >= 70 ? '#1DB584' : liqScore >= 40 ? '#f59e0b' : '#ef4444';
  const liqBg =
    liqScore >= 70
      ? 'rgba(29,181,132,0.10)'
      : liqScore >= 40
      ? 'rgba(245,158,11,0.10)'
      : 'rgba(239,68,68,0.10)';

  // Lever state
  let leverState: NWResults['leverState'];
  if (isNegativeNetWorth || debtOnly) {
    leverState = 'negative';
  } else if (debtToAssetRatio !== null && debtToAssetRatio >= 50) {
    leverState = 'high-debt';
  } else if (liquidPct !== null && liquidPct < 10) {
    leverState = 'low-liquidity';
  } else {
    leverState = 'healthy';
  }

  // Debt reduction needed to bring D/A to 25%
  const debtReductionNeeded =
    debtToAssetRatio !== null && debtToAssetRatio >= 50
      ? Math.max(0, totalLiabilities - 0.25 * totalAssets)
      : 0;

  // Liquidity gap to reach 10% of total assets
  const liquidityGap =
    liquidPct !== null && liquidPct < 10
      ? Math.max(0, 0.1 * totalAssets - cashSavings)
      : 0;

  return {
    cashSavings, investmentsRetirement, homeRealEstate, vehiclesOther,
    mortgageBalance, loansCreditCards, otherDebts,
    totalAssets, totalLiabilities, netWorth,
    debtToAssetRatio, liquidPct, isNegativeNetWorth, debtOnly,
    healthScore, healthLabel, healthStatus, healthColor, healthBg,
    liqScore, liqLabel, liqColor, liqBg,
    leverState, debtReductionNeeded, liquidityGap,
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

interface NetWorthCalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NetWorthCalculator({
  formulaContent,
  faqItems = [],
}: NetWorthCalculatorProps) {
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
    if (!results || results.totalAssets === 0) return null;
    const slices: PieSlice[] = [
      { label: 'Cash & Savings', value: results.cashSavings, color: '#1DB584', alwaysShow: results.cashSavings > 0 },
      { label: 'Investments / Retirement', value: results.investmentsRetirement, color: '#0D1B2A', alwaysShow: results.investmentsRetirement > 0 },
      { label: 'Home / Real Estate', value: results.homeRealEstate, color: '#334155', alwaysShow: results.homeRealEstate > 0 },
      { label: 'Vehicles & Other', value: results.vehiclesOther, color: '#64748b', alwaysShow: results.vehiclesOther > 0 },
    ].filter((s) => s.value > 0);
    return slices.length > 0 ? slices : null;
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
      await buildNetWorthPDF({
        cashSavings:            results.cashSavings,
        investmentsRetirement:  results.investmentsRetirement,
        homeRealEstate:         results.homeRealEstate,
        vehiclesOther:          results.vehiclesOther,
        mortgageBalance:        results.mortgageBalance,
        loansCreditCards:       results.loansCreditCards,
        otherDebts:             results.otherDebts,
        totalAssets:            results.totalAssets,
        totalLiabilities:       results.totalLiabilities,
        netWorth:               results.netWorth,
        debtToAssetRatio:       results.debtToAssetRatio,
        liquidPct:              results.liquidPct,
        isNegativeNetWorth:     results.isNegativeNetWorth,
        debtOnly:               results.debtOnly,
        healthScore:            results.healthScore,
        healthLabel:            results.healthLabel,
        healthStatus:           results.healthStatus,
        liqScore:               results.liqScore,
        liqLabel:               results.liqLabel,
        leverState:             results.leverState,
        debtReductionNeeded:    results.debtReductionNeeded,
        liquidityGap:           results.liquidityGap,
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
        @keyframes teal-glow-nw {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-nw {
          animation: teal-glow-nw 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-nw:hover {
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
                <Scale size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Net Worth Calculator
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Assets &amp; Liabilities</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

              {/* Left column — Assets */}
              <div className="space-y-3 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: '#1DB584' }}>Assets</p>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Cash &amp; Savings
                    <Tooltip text="Cash in chequing/savings accounts, GICs, money-market funds, and any other liquid holdings." />
                  </label>
                  <NumericInput
                    value={form.cashSavings}
                    onChange={(v) => set('cashSavings', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Investments / Retirement
                    <Tooltip text="RRSP, TFSA, 401(k), pension, and non-registered investment account values at current market value." />
                  </label>
                  <NumericInput
                    value={form.investmentsRetirement}
                    onChange={(v) => set('investmentsRetirement', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Home / Real Estate Value
                    <Tooltip text="Estimated current market value of any real estate you own, including your primary residence." />
                  </label>
                  <NumericInput
                    value={form.homeRealEstate}
                    onChange={(v) => set('homeRealEstate', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Vehicles &amp; Other Assets
                    <Tooltip text="Estimated value of vehicles, jewellery, collectibles, or other tangible assets you own." />
                  </label>
                  <NumericInput
                    value={form.vehiclesOther}
                    onChange={(v) => set('vehiclesOther', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>
              </div>

              {/* Right column — Liabilities */}
              <div className="border-l pl-2 md:pl-5 space-y-3 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: '#f59e0b' }}>Liabilities</p>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Mortgage Balance
                    <Tooltip text="Outstanding balance remaining on your mortgage. Use 0 if your home is paid off or you don't own property." />
                  </label>
                  <NumericInput
                    value={form.mortgageBalance}
                    onChange={(v) => set('mortgageBalance', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Loans &amp; Credit Cards
                    <Tooltip text="Outstanding balances on personal loans, auto loans, student loans, lines of credit, and credit card balances." />
                  </label>
                  <NumericInput
                    value={form.loansCreditCards}
                    onChange={(v) => set('loansCreditCards', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Other Debts
                    <Tooltip text="Any other outstanding obligations — tax owed, medical debt, family loans, or other liabilities not listed above." />
                  </label>
                  <NumericInput
                    value={form.otherDebts}
                    onChange={(v) => set('otherDebts', v)}
                    prefix={currencyPrefix}
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
                  Enter your assets and liabilities to see your net worth.
                </p>
              </div>
            )}

            {results && (
              <div className="flex flex-col flex-1 gap-4">

                {/* Hero: Net Worth */}
                <div
                  className="rounded-xl p-5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <p style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
                  }}>
                    Net Worth
                  </p>
                  <p style={{
                    color: results.netWorth >= 0 ? '#1DB584' : '#f59e0b',
                    fontSize: '38px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 8,
                  }}>
                    {results.netWorth < 0 ? '−' : ''}{fmt(Math.abs(results.netWorth))}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: 6, fontWeight: 500 }}>
                    {results.debtOnly
                      ? 'debt with no assets on record'
                      : results.isNegativeNetWorth
                      ? 'liabilities exceed assets'
                      : 'positive net worth'}
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Total Assets</span>
                    <span className="text-[13px] font-semibold" style={{ color: '#1DB584' }}>
                      {fmt(results.totalAssets)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Total Liabilities</span>
                    <span className="text-[13px] font-semibold" style={{ color: results.totalLiabilities > 0 ? '#f59e0b' : 'rgba(255,255,255,0.6)' }}>
                      {fmt(results.totalLiabilities)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Debt-to-Asset Ratio</span>
                    <span className="text-[13px] font-semibold" style={{ color: results.debtToAssetRatio === null ? 'rgba(255,255,255,0.4)' : results.debtToAssetRatio >= 50 ? '#f59e0b' : '#1DB584' }}>
                      {results.debtToAssetRatio === null ? '—' : `${results.debtToAssetRatio.toFixed(1)}%`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Liquid Assets %</span>
                    <span className="text-[13px] font-semibold" style={{ color: results.liquidPct === null ? 'rgba(255,255,255,0.4)' : results.liquidPct < 10 ? '#f59e0b' : '#1DB584' }}>
                      {results.liquidPct === null ? '—' : `${results.liquidPct.toFixed(1)}%`}
                    </span>
                  </div>

                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See your balance sheet health, debt load, and liquidity analysis.
                  </p>
                  <button
                    className="btn-ai-cta-nw w-full font-bold overflow-hidden"
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
                      Review Balance Sheet Analysis ↓
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
                      See AI Net Worth Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* ══ Block C: Asset Composition + Net Worth Snapshot ═════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Left: Asset Composition donut ─────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Asset breakdown
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Asset Composition</h3>
            </div>

            {(!results || results.totalAssets === 0) && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter asset values to see the composition.
                </p>
              </div>
            )}

            {results && results.totalAssets > 0 && donutSlices && (() => {
              const assetRows = [
                { label: 'Cash & Savings', value: results.cashSavings, color: '#1DB584' },
                { label: 'Investments / Retirement', value: results.investmentsRetirement, color: '#0D1B2A' },
                { label: 'Home / Real Estate', value: results.homeRealEstate, color: '#334155' },
                { label: 'Vehicles & Other', value: results.vehiclesOther, color: '#64748b' },
              ].filter((r) => r.value > 0);

              return (
                <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                  <div className="shrink-0">
                    <DonutChart
                      slices={donutSlices}
                      className="w-52 h-52"
                      centerValue={fmt(results.totalAssets)}
                      centerLabel="total assets"
                    />
                  </div>
                  <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    {assetRows.map(({ label, value, color }) => {
                      const pct = results.totalAssets > 0 ? Math.round((value / results.totalAssets) * 100) : 0;
                      return (
                        <div key={label} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                            <span style={{ color: '#4B5563', fontSize: '12.5px' }}>{label}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-400">{pct}%</span>
                            <span className="font-semibold" style={{ color, fontSize: '12.5px' }}>{fmt(value)}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between py-2">
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>Total Assets</span>
                      <span className="font-bold" style={{ color: '#1DB584', fontSize: '12.5px' }}>{fmt(results.totalAssets)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>Total Liabilities</span>
                      <span className="font-bold" style={{ color: results.totalLiabilities > 0 ? '#f59e0b' : '#64748b', fontSize: '12.5px' }}>{fmt(results.totalLiabilities)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>Net Worth</span>
                      <span className="font-bold" style={{ color: results.netWorth >= 0 ? '#0D1B2A' : '#f59e0b', fontSize: '12.5px' }}>
                        {results.netWorth < 0 ? '−' : ''}{fmt(Math.abs(results.netWorth))}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        {/* ── Right: Net Worth Snapshot chart ───────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Balance sheet snapshot
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Net Worth Snapshot</h3>
            </div>

            {!results && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter details to see the snapshot.
                </p>
              </div>
            )}

            {results && (() => {
              const CHART_H = 188;
              const XLABEL_H = 30;
              const YAXIS_W = 52;

              const nwColor = results.netWorth >= 0 ? '#0D1B2A' : '#ef4444';

              const chartBars = [
                { key: 'assets', label: 'Total Assets', value: results.totalAssets, color: '#1DB584', isNW: false },
                { key: 'liabilities', label: 'Total Liabilities', value: results.totalLiabilities, color: '#f59e0b', isNW: false },
                { key: 'networth', label: 'Net Worth', value: Math.abs(results.netWorth), color: nwColor, isNW: true },
              ];

              const yMax = niceMax(Math.max(results.totalAssets, results.totalLiabilities, Math.abs(results.netWorth), 1));

              const statRows = [
                { label: 'Net Worth', value: `${results.netWorth < 0 ? '−' : ''}${fmt(Math.abs(results.netWorth))}`, color: results.netWorth >= 0 ? '#1DB584' : '#f59e0b' },
                { label: 'Total Assets', value: fmt(results.totalAssets), color: '#0D1B2A' as const },
                { label: 'Total Liabilities', value: fmt(results.totalLiabilities), color: results.totalLiabilities > 0 ? '#f59e0b' : '#64748b' },
              ];

              const legendRows = [
                { label: 'Total Assets', color: '#1DB584' as const },
                { label: 'Total Liabilities', color: '#f59e0b' as const },
                { label: results.netWorth >= 0 ? 'Net Worth' : 'Net Worth (−)', color: nwColor as string },
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

                  <div className="flex-1 relative" style={{ minHeight: CHART_H + XLABEL_H + 90 }}>

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

                          return (
                            <div key={bar.key} className="flex-1 flex justify-center items-end">
                              <div style={{ position: 'relative', width: '52%', minWidth: 8 }}>

                                {/* Plain label above non-NW bars */}
                                {!bar.isNW && barH > 0 && (
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

                                <div style={{
                                  height: barH,
                                  background: bar.color,
                                  borderRadius: '4px 4px 0 0',
                                  opacity: bar.key === 'networth' ? (results.netWorth === 0 ? 0.3 : 1) : 1,
                                }} />

                                {/* Net Worth bracket */}
                                {bar.isNW && barH > 0 && (
                                  <div style={{
                                    position: 'absolute', top: -7, left: -7, right: -7, bottom: 0,
                                    borderTop: `2px solid ${nwColor}`,
                                    borderLeft: `2px solid ${nwColor}`,
                                    borderRight: `2px solid ${nwColor}`,
                                    borderRadius: '11px 11px 0 0',
                                    boxShadow: `0 0 14px ${results.netWorth >= 0 ? 'rgba(13,27,42,0.14)' : 'rgba(239,68,68,0.20)'}`,
                                    pointerEvents: 'none',
                                  }} />
                                )}

                                {/* Net Worth bubble callout */}
                                {bar.isNW && (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: Math.max(barH, 2) + 22,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    zIndex: 10,
                                  }}>
                                    <div style={{
                                      background: '#fff',
                                      boxShadow: '0 3px 14px rgba(0,0,0,0.12)',
                                      border: `1.5px solid ${results.netWorth >= 0 ? 'rgba(13,27,42,0.20)' : 'rgba(239,68,68,0.30)'}`,
                                      borderRadius: 10,
                                      padding: '6px 10px',
                                      textAlign: 'center',
                                      whiteSpace: 'nowrap',
                                      minWidth: 52,
                                    }}>
                                      <p style={{ fontSize: '9px', fontWeight: 700, color: '#6B7A8D', marginBottom: 3 }}>Net Worth</p>
                                      <p style={{
                                        fontSize: '13px', fontWeight: 800, lineHeight: 1,
                                        color: results.netWorth >= 0 ? '#0D1B2A' : '#ef4444',
                                      }}>
                                        {results.netWorth < 0 ? '−' : ''}{fmtShort(Math.abs(results.netWorth))}
                                      </p>
                                    </div>
                                    {/* Caret */}
                                    <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${results.netWorth >= 0 ? 'rgba(13,27,42,0.18)' : 'rgba(239,68,68,0.28)'}` }} />
                                    <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #fff' }} />
                                  </div>
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
                            {bar.isNW ? (
                              <span className="rounded-full"
                                style={{ background: nwColor, color: '#fff', fontSize: '8px', fontWeight: 700, lineHeight: 1, display: 'inline-block', padding: '3px 7px', whiteSpace: 'nowrap' }}>
                                Net Worth
                              </span>
                            ) : (
                              <span style={{ fontSize: '8px', color: '#9BA8B5', textAlign: 'center', lineHeight: 1.2 }}>{bar.label}</span>
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
              FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Net Worth Analysis
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
                Enter your assets and liabilities above to see the analysis.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 340 }}>
                The analysis will show your Net Worth Health Score, liquidity position, and balance sheet insights.
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
                    <span className="text-sm font-bold text-slate-800">Balance Sheet Analysis</span>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row">

                    {/* Gauge 1: Net Worth Health Score */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0 pb-3 sm:pb-0 sm:pr-3">
                      <div className="flex items-center w-full mb-2">
                        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Net Worth Health</p>
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
                        {results.debtOnly
                          ? 'No assets recorded — debt exists with no asset base to measure against.'
                          : results.debtToAssetRatio === null
                          ? 'No debt and no liabilities — full ownership of all assets.'
                          : results.debtToAssetRatio < 25
                          ? `Debt-to-asset ratio of ${results.debtToAssetRatio.toFixed(1)}% — a lower debt load relative to your asset base.`
                          : results.debtToAssetRatio < 50
                          ? `Debt-to-asset ratio of ${results.debtToAssetRatio.toFixed(1)}% — moderate leverage, common for homeowners.`
                          : `Debt-to-asset ratio of ${results.debtToAssetRatio.toFixed(1)}% — more than half of assets are debt-financed.`}
                      </p>
                    </div>

                    <div className="hidden sm:block self-stretch w-px mx-1" style={{ background: 'rgba(15,41,66,0.08)' }} />
                    <div className="block sm:hidden h-px w-full mb-3" style={{ background: 'rgba(15,41,66,0.08)' }} />

                    {/* Gauge 2: Liquidity Strength */}
                    {(() => {
                      const fillPct = results.liqScore;
                      const GR = 48; const GC = 2 * Math.PI * GR;
                      const GARC = (240 / 360) * GC;
                      const GFIL = GARC * (fillPct / 100);
                      return (
                        <div className="flex-1 flex flex-col items-center text-center min-w-0 pt-0 sm:pl-3">
                          <div className="flex items-center w-full mb-2">
                            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Liquidity Strength</p>
                            <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                              style={{ fontSize: '10px', fontWeight: 700, background: results.liqBg, color: results.liqColor }}>
                              {results.liqLabel}
                            </span>
                          </div>
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 66, 66)" />
                              <circle cx="66" cy="66" r={GR} fill="none" stroke={results.liqColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              {results.liquidPct !== null ? (
                                <>
                                  <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>
                                    {Math.round(results.liquidPct)}<span style={{ fontSize: '1rem' }}>%</span>
                                  </span>
                                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>liquid</span>
                                </>
                              ) : (
                                <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>—</span>
                              )}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: results.liqColor }}>{results.liqLabel}</span>
                            </div>
                          </div>
                          <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                            {results.totalAssets === 0
                              ? 'No assets recorded — liquidity cannot be measured.'
                              : results.liquidPct === null
                              ? 'Liquidity cannot be calculated without an asset base.'
                              : results.liquidPct < 5
                              ? `Only ${results.liquidPct.toFixed(1)}% of assets are in liquid form — most wealth is in illiquid assets.`
                              : results.liquidPct < 10
                              ? `${results.liquidPct.toFixed(1)}% of assets are liquid. Below the 10% reference threshold.`
                              : results.liquidPct < 20
                              ? `${results.liquidPct.toFixed(1)}% of assets are liquid — a moderate accessible position.`
                              : `${results.liquidPct.toFixed(1)}% of assets are in liquid form — strong accessible position.`}
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
                      {results.leverState === 'healthy' ? 'Healthy Balance Sheet' : 'Smart Optimization Found'}
                    </span>
                  </div>

                  {/* State A: Negative net worth */}
                  {results.leverState === 'negative' && (() => {
                    const gap = Math.abs(results.netWorth);
                    return (
                      <>
                        <div className="flex flex-col gap-3 mt-1 lg:hidden">
                          <div className="rounded-xl flex items-center justify-center px-4 py-4"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#f59e0b', letterSpacing: '-1.5px', lineHeight: 1 }}>
                              {fmt(gap)}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">liabilities above total assets</p>
                            <p className="text-slate-400 text-xs mt-0.5">the gap between what you owe and what you own</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                              <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(results.totalAssets)}</div>
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Total Assets</span>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                              <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmt(results.totalLiabilities)}</div>
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Total Liabilities</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                            This is a point-in-time snapshot. Negative net worth is common at certain life stages.
                          </p>
                        </div>
                        <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                          <div className="flex items-stretch gap-3">
                            <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                              <span className="font-extrabold tabular-nums"
                                style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#f59e0b', letterSpacing: '-2px', lineHeight: 1 }}>
                                {fmt(gap)}
                              </span>
                            </div>
                            <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                              <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(results.totalAssets)}</div>
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Total Assets</span>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                              <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmt(results.totalLiabilities)}</div>
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                                <span className="text-slate-400 text-xs">Total Liabilities</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">liabilities above total assets</p>
                            <p className="text-slate-400 text-xs mt-0.5">the gap between what you owe and what you own</p>
                          </div>
                          <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                            This is a point-in-time snapshot. Negative net worth is common at certain life stages.
                          </p>
                        </div>
                      </>
                    );
                  })()}

                  {/* State B: High debt load */}
                  {results.leverState === 'high-debt' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#f59e0b', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(safe(results.debtReductionNeeded))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">debt reduction to reach 25% debt-to-asset ratio</p>
                          <p className="text-slate-400 text-xs mt-0.5">based on current total assets of {fmt(results.totalAssets)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{results.debtToAssetRatio!.toFixed(1)}%</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Current D/A %</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>25%</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Target D/A %</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Educational estimate only. Debt reduction depends on terms, rates, and individual circumstances.
                        </p>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#f59e0b', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmt(safe(results.debtReductionNeeded))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{results.debtToAssetRatio!.toFixed(1)}%</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Current D/A %</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>25%</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Target D/A %</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">debt reduction to reach 25% debt-to-asset ratio</p>
                          <p className="text-slate-400 text-xs mt-0.5">based on current total assets of {fmt(results.totalAssets)}</p>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Educational estimate only. Debt reduction depends on terms, rates, and individual circumstances.
                        </p>
                      </div>
                    </>
                  ))()}

                  {/* State C: Low liquidity */}
                  {results.leverState === 'low-liquidity' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#f59e0b', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(safe(results.liquidityGap))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">liquidity gap to reach 10% of total assets</p>
                          <p className="text-slate-400 text-xs mt-0.5">current liquid assets are {results.liquidPct!.toFixed(1)}% of total assets</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{results.liquidPct!.toFixed(1)}%</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Current liquid %</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>10%</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Reference threshold</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          10% is an educational reference point. Appropriate liquidity levels vary by individual situation.
                        </p>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#f59e0b', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmt(safe(results.liquidityGap))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{results.liquidPct!.toFixed(1)}%</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Current liquid %</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>10%</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Reference threshold</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">liquidity gap to reach 10% of total assets</p>
                          <p className="text-slate-400 text-xs mt-0.5">current liquid assets are {results.liquidPct!.toFixed(1)}% of total assets</p>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          10% is an educational reference point. Appropriate liquidity levels vary by individual situation.
                        </p>
                      </div>
                    </>
                  ))()}

                  {/* State D: Healthy */}
                  {results.leverState === 'healthy' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmt(safe(results.netWorth))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">positive net worth with manageable debt load</p>
                          <p className="text-slate-400 text-xs mt-0.5">assets significantly exceed liabilities</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                              {results.debtToAssetRatio !== null ? `${results.debtToAssetRatio.toFixed(1)}%` : '0%'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Debt-to-Asset %</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                              {results.liquidPct !== null ? `${results.liquidPct.toFixed(1)}%` : '—'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Liquid Assets %</span>
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
                              {fmt(safe(results.netWorth))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                              {results.debtToAssetRatio !== null ? `${results.debtToAssetRatio.toFixed(1)}%` : '0%'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Debt-to-Asset %</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                              {results.liquidPct !== null ? `${results.liquidPct.toFixed(1)}%` : '—'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Liquid Assets %</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">positive net worth with manageable debt load</p>
                          <p className="text-slate-400 text-xs mt-0.5">assets significantly exceed liabilities</p>
                        </div>
                      </div>
                    </>
                  ))()}

                </div>

              </div>

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Card 1 — Asset Mix Check */}
                <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                      <Scale className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Asset Mix Check</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.totalAssets === 0
                      ? 'No assets recorded. Enter asset values to see how your wealth is distributed across cash, investments, property, and other holdings.'
                      : (() => {
                          const cashPct = results.liquidPct ?? 0;
                          const investPct = results.totalAssets > 0 ? (results.investmentsRetirement / results.totalAssets) * 100 : 0;
                          const realEstatePct = results.totalAssets > 0 ? (results.homeRealEstate / results.totalAssets) * 100 : 0;
                          if (realEstatePct > 70) {
                            return <>Real estate makes up <strong className="text-emerald-700">{realEstatePct.toFixed(0)}%</strong> of your total assets. Property-heavy balance sheets can have lower liquidity since real estate cannot be quickly converted to cash.</>;
                          } else if (investPct > 60) {
                            return <>Investments and retirement accounts make up <strong className="text-emerald-700">{investPct.toFixed(0)}%</strong> of your total assets. A diversified mix across liquid and illiquid assets is common in a balanced balance sheet.</>;
                          } else if (cashPct > 40) {
                            return <>Cash and savings make up <strong className="text-emerald-700">{cashPct.toFixed(0)}%</strong> of total assets — a high liquid share. Your balance sheet has strong short-term flexibility.</>;
                          } else {
                            return <>Your assets are distributed across cash (<strong className="text-emerald-700">{cashPct.toFixed(0)}%</strong>), investments (<strong className="text-emerald-700">{investPct.toFixed(0)}%</strong>), and real estate (<strong className="text-emerald-700">{realEstatePct.toFixed(0)}%</strong>) — a diversified mix across asset types.</>;
                          }
                        })()
                    }
                  </p>
                </div>

                {/* Card 2 — Debt Load Check */}
                <div className="rounded-2xl p-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#fef3c7' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-amber-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Debt Load Check</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.debtToAssetRatio === null
                      ? 'No assets recorded — debt-to-asset ratio cannot be calculated. Enter asset values to see your leverage position.'
                      : results.debtToAssetRatio < 25
                      ? <>Your debt-to-asset ratio of <strong className="text-amber-700">{results.debtToAssetRatio.toFixed(1)}%</strong> is below the 25% reference threshold — a lower debt load relative to your assets. Total liabilities of {fmt(results.totalLiabilities)} represent a smaller share of your {fmt(results.totalAssets)} asset base.</>
                      : results.debtToAssetRatio < 50
                      ? <>Your debt-to-asset ratio of <strong className="text-amber-700">{results.debtToAssetRatio.toFixed(1)}%</strong> falls in the moderate range (25–50%). This is common for homeowners carrying a mortgage. Total liabilities are {fmt(results.totalLiabilities)} against {fmt(results.totalAssets)} in assets.</>
                      : <>Your debt-to-asset ratio of <strong className="text-amber-700">{results.debtToAssetRatio.toFixed(1)}%</strong> is above 50% — more than half of your assets are debt-financed. Total liabilities of {fmt(results.totalLiabilities)} represent a significant portion of your {fmt(results.totalAssets)} asset base.</>
                    }
                  </p>
                </div>

                {/* Card 3 — Liquidity Check */}
                <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                      <Activity className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Liquidity Check</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.totalAssets === 0
                      ? 'No assets recorded — liquidity cannot be assessed. Enter asset values to see what portion of your wealth is readily accessible.'
                      : results.liquidPct === null
                      ? 'Liquidity cannot be calculated without an asset base.'
                      : results.liquidPct < 5
                      ? <>Only <strong className="text-sky-700">{results.liquidPct.toFixed(1)}%</strong> of total assets are in liquid form ({fmt(results.cashSavings)}). Most of your wealth is in assets that cannot be quickly accessed. This may limit financial flexibility in the short term.</>
                      : results.liquidPct < 10
                      ? <>Liquid assets represent <strong className="text-sky-700">{results.liquidPct.toFixed(1)}%</strong> of total assets ({fmt(results.cashSavings)}). This is below the 10% educational reference threshold. Most net worth is held in property or investments rather than accessible cash.</>
                      : results.liquidPct < 25
                      ? <>Liquid assets are <strong className="text-sky-700">{results.liquidPct.toFixed(1)}%</strong> of total assets ({fmt(results.cashSavings)}) — a moderate accessible position above the 10% reference threshold.</>
                      : <>Liquid assets represent <strong className="text-sky-700">{results.liquidPct.toFixed(1)}%</strong> of total assets ({fmt(results.cashSavings)}) — a strong accessible position. A high liquid share provides flexibility for near-term needs.</>
                    }
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
            This calculator is for illustrative and informational purposes only. Results are estimates based on the values entered and may not reflect taxes, market changes, asset sale costs, debt terms, or personal circumstances. This does not constitute financial, tax, legal, investment, or professional advice. Consider speaking with a qualified financial professional before making major financial decisions.
          </p>
        </div>

      </div>

      {/* ══ Block F: How It Works ═════════════════════════════════════════════════ */}
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

      {/* ══ Block G: FAQ ══════════════════════════════════════════════════════════ */}
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
        This calculator is for illustrative and informational purposes only. Results are estimates based on the values entered and may not reflect taxes, market changes, asset sale costs, debt terms, or personal circumstances. This does not constitute financial, tax, legal, investment, or professional advice. Consider speaking with a qualified financial professional before making major financial decisions.
      </p>

    </div>
  );
}
