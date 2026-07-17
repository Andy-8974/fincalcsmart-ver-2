'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { getCmhcRate, parseN, fmtCAD, fmtCADx } from '../_mortgage-shared/math';
import { NumericInput, Tooltip, DonutChart, Disclaimer, type PieSlice } from '../_mortgage-shared/ui';
import { inputCls, type Faq } from '@/components/layout/CalculatorLayout';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import {
  Sparkles, Download, Mail, BookOpen, HelpCircle,
  ShieldCheck, ShieldAlert, ShieldOff, AlertTriangle,
  CheckCircle2, XCircle, TrendingUp, Activity, Check, X,
} from 'lucide-react';
import { buildCmhcPDF } from '@/lib/pdf/adapters/cmhcAdapter';

// ── Types ──────────────────────────────────────────────────────────────────────

type EligibilityStatus =
  | 'ineligible_price'
  | 'no_premium'
  | 'below_minimum'
  | 'insured'
  | 'insured_30yr_warn';

type Amortization = '25' | '30';
type DPMode = 'amount' | 'percent';

interface FormState {
  purchasePrice: string;
  downPayment: string;
  downPaymentMode: DPMode;
  amortization: Amortization;
  firstTimeBuyer: boolean;
  newBuild: boolean;
}

interface Results {
  purchasePrice: number;
  downPaymentAmt: number;
  downPaymentPct: number;
  minDownPayment: number;
  baseMortgage: number;
  cmhcRate: number;
  cmhcPremium: number;
  totalMortgage: number;
  downPaymentGap: number;
  status: EligibilityStatus;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcMinDownPayment(price: number): number {
  if (price >= 1_500_000) return price * 0.20;
  if (price <= 500_000)   return price * 0.05;
  return 500_000 * 0.05 + (price - 500_000) * 0.10;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(15,41,66,0.09)',
  borderRadius: '20px',
  background: '#ffffff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.03)',
};

const inputClsCompact = inputCls
  .replace('py-2.5', 'py-1 md:py-2')
  .replace('px-3', 'pr-2 md:pr-3 pl-3');

const navyLabelStyle: React.CSSProperties = {
  fontWeight: 700, color: '#0D1B2A',
  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4,
};
const navyLabelCls = 'text-[10px] md:text-xs';

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  purchasePrice: '650000',
  downPayment: '50000',
  downPaymentMode: 'amount',
  amortization: '25',
  firstTimeBuyer: false,
  newBuild: false,
};

const TOOLTIPS = {
  purchasePrice: 'The total purchase price of the property. Homes priced at $1.5M or more are not eligible for CMHC mortgage insurance — a minimum 20% conventional down payment is required.',
  downPayment: 'Minimum 5% for homes under $500K. For $500K–$1,499,999: 5% on first $500K + 10% on the remainder. 20%+ avoids CMHC insurance entirely.',
  amortization: '30-year amortization is available for CMHC-insured mortgages only when the borrower is a first-time homebuyer or purchasing a new build, per CMHC guidelines.',
  firstTimeBuyer: "You have not owned and occupied a home as your principal residence in the last 4 years (or you recently experienced a marriage/common-law relationship breakdown). Required (with or without new build) to access 30-year insured amortization.",
  newBuild: 'A newly constructed home that has not previously been occupied for residential purposes (interim occupancy during condo construction does not disqualify it).',
};

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ineligible_price: {
    color: '#EF4444', bg: '#FEF2F2', border: '#FECACA',
    darkBg: 'rgba(239,68,68,0.18)', darkBorder: 'rgba(239,68,68,0.45)',
    label: 'CMHC Ineligible',
    sub: 'Price ≥ $1.5M — conventional financing required',
  },
  no_premium: {
    color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0',
    darkBg: 'rgba(16,185,129,0.18)', darkBorder: 'rgba(16,185,129,0.45)',
    label: 'No Insurance Required',
    sub: 'Down payment meets the 20% threshold',
  },
  below_minimum: {
    color: '#EF4444', bg: '#FEF2F2', border: '#FECACA',
    darkBg: 'rgba(239,68,68,0.18)', darkBorder: 'rgba(239,68,68,0.45)',
    label: 'Below Minimum Down Payment',
    sub: 'Increase down payment to qualify',
  },
  insured_30yr_warn: {
    color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A',
    darkBg: 'rgba(245,158,11,0.18)', darkBorder: 'rgba(245,158,11,0.45)',
    label: 'CMHC Insured — 30yr Warning',
    sub: 'First-time buyer or new build required for 30yr',
  },
  insured: {
    color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A',
    darkBg: 'rgba(245,158,11,0.18)', darkBorder: 'rgba(245,158,11,0.45)',
    label: 'CMHC Insured',
    sub: 'Mortgage default insurance applies',
  },
} as const;

// ── Threshold zones (for vertical bar chart) ───────────────────────────────────

const ZONES = [
  { from: 0,  to: 5,  label: 'Under 5%', color: '#EF4444', rateLabel: '< min' },
  { from: 5,  to: 10, label: '5%–10%',   color: '#E8933A', rateLabel: '4.00%' },
  { from: 10, to: 15, label: '10%–15%',  color: '#C9A84C', rateLabel: '3.10%' },
  { from: 15, to: 20, label: '15%–20%',  color: '#D4AC40', rateLabel: '2.80%' },
  { from: 20, to: 28, label: '20%+',     color: '#1DB584', rateLabel: 'None'  },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CMHCInsuranceCalculator({
  formulaContent,
  faqItems = [],
}: {
  formulaContent?: ReactNode;
  faqItems?: Faq[];
}) {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(p => ({ ...p, [field]: value }));
  }

  // Switch between $ and % mode, syncing the value
  function toggleDPMode() {
    const price = parseN(form.purchasePrice);
    const cur   = parseN(form.downPayment);
    if (form.downPaymentMode === 'amount') {
      const pct = price > 0 ? Math.min(100, +((cur / price) * 100).toFixed(2)) : 0;
      setForm(p => ({ ...p, downPaymentMode: 'percent', downPayment: String(pct) }));
    } else {
      const amt = Math.round((Math.min(100, cur) / 100) * price);
      setForm(p => ({ ...p, downPaymentMode: 'amount', downPayment: String(amt) }));
    }
  }

  // ── Math ─────────────────────────────────────────────────────────────────────

  const results = useMemo<Results | null>(() => {
    const purchasePrice = parseN(form.purchasePrice);
    if (purchasePrice <= 0) return null;

    const rawVal = parseN(form.downPayment);
    const downPaymentAmt = form.downPaymentMode === 'amount'
      ? rawVal
      : (Math.min(100, rawVal) / 100) * purchasePrice;

    const downPaymentPct = (downPaymentAmt / purchasePrice) * 100;
    const minDownPayment = calcMinDownPayment(purchasePrice);
    const baseMortgage   = Math.max(0, purchasePrice - downPaymentAmt);

    let status: EligibilityStatus;
    let cmhcRate    = 0;
    let cmhcPremium = 0;

    if (purchasePrice >= 1_500_000) {
      status = 'ineligible_price';
    } else if (downPaymentPct >= 20) {
      status = 'no_premium';
    } else if (downPaymentAmt < minDownPayment - 0.005) {
      status = 'below_minimum';
    } else if (form.amortization === '30' && !form.firstTimeBuyer && !form.newBuild) {
      status      = 'insured_30yr_warn';
      cmhcRate    = getCmhcRate(downPaymentPct);
      cmhcPremium = baseMortgage * cmhcRate;
    } else {
      status      = 'insured';
      cmhcRate    = getCmhcRate(downPaymentPct);
      cmhcPremium = baseMortgage * cmhcRate;
    }

    return {
      purchasePrice, downPaymentAmt, downPaymentPct,
      minDownPayment, baseMortgage, cmhcRate, cmhcPremium,
      totalMortgage: baseMortgage + cmhcPremium,
      downPaymentGap: minDownPayment - downPaymentAmt,
      status,
    };
  }, [form]);

  // ── Next threshold for smart lever ───────────────────────────────────────────

  const nextThresholds = useMemo(() => {
    if (!results) return [];
    const { purchasePrice, downPaymentAmt, downPaymentPct, minDownPayment, baseMortgage, cmhcRate, status } = results;
    if (status === 'ineligible_price' || status === 'no_premium') return [];

    const currentPremium = baseMortgage * cmhcRate;
    const targets: { label: string; pct: number; rate: number }[] = [];

    if (status === 'below_minimum') {
      const minPct = (minDownPayment / purchasePrice) * 100;
      targets.push({ label: 'Minimum qualifying down payment', pct: minPct, rate: getCmhcRate(minPct) });
    } else {
      if (downPaymentPct < 10) targets.push({ label: '10% down', pct: 10, rate: 0.031 });
      if (downPaymentPct < 15) targets.push({ label: '15% down', pct: 15, rate: 0.028 });
      targets.push({ label: '20% down (no premium)', pct: 20, rate: 0 });
    }

    return targets.map(t => {
      const targetDown   = purchasePrice * (t.pct / 100);
      const extraNeeded  = Math.max(0, targetDown - downPaymentAmt);
      const newBase      = purchasePrice - targetDown;
      const newPremium   = newBase * t.rate;
      const premiumSaved = Math.max(0, currentPremium - newPremium);
      return { ...t, extraNeeded, newPremium, premiumSaved };
    }).filter(t => t.extraNeeded > 0.5);
  }, [results]);

  const bestLever = nextThresholds[0] ?? null;

  // ── Derived display ───────────────────────────────────────────────────────────

  const sc = results ? STATUS_CONFIG[results.status] : null;

  function StatusIconEl({ status, size = 28 }: { status: EligibilityStatus; size?: number }) {
    const props = { size, color: '#ffffff', strokeWidth: 2.2 as number };
    switch (status) {
      case 'no_premium':        return <Check         {...props} strokeWidth={2.5} />;
      case 'ineligible_price':
      case 'below_minimum':     return <X             {...props} strokeWidth={2.5} />;
      case 'insured_30yr_warn': return <AlertTriangle {...props} />;
      case 'insured':           return <ShieldCheck   {...props} />;
    }
  }

  // Donut slices for CMHC Premium Impact card
  const donutSlices: PieSlice[] = results && results.totalMortgage > 0
    ? [
        { label: 'Base Mortgage',  value: results.baseMortgage,  color: '#1DB584', alwaysShow: true },
        { label: 'CMHC Premium',   value: results.cmhcPremium,   color: '#F59E0B', alwaysShow: results.cmhcPremium > 0 },
      ]
    : [];

  // Helper text shown under the down payment input
  const dpHelperText = (() => {
    if (!results) return null;
    if (form.downPaymentMode === 'amount') {
      return `${results.downPaymentPct.toFixed(1)}% of purchase price`;
    }
    return `${fmtCAD(results.downPaymentAmt)} down payment`;
  })();

  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      await buildCmhcPDF({
        purchasePrice:   results.purchasePrice,
        downPaymentAmt:  results.downPaymentAmt,
        downPaymentPct:  results.downPaymentPct,
        amortization:    parseN(form.amortization),
        firstTimeBuyer:  form.firstTimeBuyer,
        newBuild:        form.newBuild,
        minDownPayment:  results.minDownPayment,
        baseMortgage:    results.baseMortgage,
        cmhcRate:        results.cmhcRate,
        cmhcPremium:     results.cmhcPremium,
        totalMortgage:   results.totalMortgage,
        downPaymentGap:  results.downPaymentGap,
        status:          results.status,
      });
    } catch (e) {
      console.error('PDF generation failed', e);
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-y-6 md:gap-y-8">

      {/* ── Block A: Input (7) + Results (5) ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Input Card */}
        <div className="lg:col-span-7" style={cardStyle}>
          <div className="p-5 md:p-6">

            <div className="flex items-center gap-2.5 mb-4">
              <div style={{ width: 30, height: 30, borderRadius: 7, background: '#1DB584', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={15} color="white" strokeWidth={2} aria-hidden />
              </div>
              <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>CMHC Insurance Details</p>
            </div>

            <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

              {/* Left column */}
              <div className="space-y-2.5 min-w-0">

                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9BA8B5' }}>Property</p>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Home Purchase Price <Tooltip text={TOOLTIPS.purchasePrice} />
                  </label>
                  <NumericInput
                    value={form.purchasePrice}
                    onChange={v => set('purchasePrice', v)}
                    prefix="CA$"
                    inputClassName={inputClsCompact}
                  />
                </div>

                {/* Down Payment with $ / % toggle */}
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Down Payment <Tooltip text={TOOLTIPS.downPayment} />
                  </label>
                  <div className="flex gap-1.5">
                    <NumericInput
                      value={form.downPayment}
                      onChange={v => set('downPayment', v)}
                      prefix={form.downPaymentMode === 'amount' ? '$' : undefined}
                      suffix={form.downPaymentMode === 'percent' ? '%' : undefined}
                      inputClassName={`${inputClsCompact} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={toggleDPMode}
                      className="shrink-0 px-2 rounded-lg text-[11px] font-bold transition-colors duration-150"
                      style={{
                        border: '1.5px solid #E4E9EF',
                        background: '#F8FAFB',
                        color: '#6B7A8D',
                        minWidth: 36,
                      }}
                      title="Toggle between dollar amount and percentage"
                    >
                      {form.downPaymentMode === 'amount' ? '→ %' : '→ $'}
                    </button>
                  </div>
                  {dpHelperText && (
                    <p className="mt-0.5 text-xs" style={{ color: '#9BA8B5' }}>{dpHelperText}</p>
                  )}
                </div>

                <div className="pt-1" style={{ borderTop: '1px solid #F1F4F7' }}>
                  <label className={navyLabelCls} style={{ ...navyLabelStyle, marginBottom: 6 }}>
                    Amortization Period <Tooltip text={TOOLTIPS.amortization} />
                  </label>
                  <div className="flex gap-2">
                    {(['25', '30'] as Amortization[]).map(y => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => set('amortization', y)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150"
                        style={
                          form.amortization === y
                            ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                            : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                        }
                      >
                        {y} yrs{y === '25' ? ' (std)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right column */}
              <div className="border-l pl-2 md:pl-5 space-y-2.5 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.09)' }}>

                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9BA8B5' }}>Buyer Status</p>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    First-Time Home Buyer <Tooltip text={TOOLTIPS.firstTimeBuyer} />
                  </label>
                  <div className="flex gap-2">
                    {([true, false] as const).map(val => (
                      <button key={String(val)} type="button" onClick={() => set('firstTimeBuyer', val)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150"
                        style={
                          form.firstTimeBuyer === val
                            ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                            : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                        }>
                        {val ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    New Build <Tooltip text={TOOLTIPS.newBuild} />
                  </label>
                  <div className="flex gap-2">
                    {([true, false] as const).map(val => (
                      <button key={String(val)} type="button" onClick={() => set('newBuild', val)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150"
                        style={
                          form.newBuild === val
                            ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                            : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                        }>
                        {val ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

                {results?.status === 'insured_30yr_warn' && (
                  <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.30)' }}>
                    <div className="flex gap-2 items-start">
                      <AlertTriangle size={13} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
                        30-year insured amortization requires first-time buyer or new build status. Verify with your lender.
                      </p>
                    </div>
                  </div>
                )}

                {results?.status === 'ineligible_price' && (
                  <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)' }}>
                    <div className="flex gap-2 items-start">
                      <XCircle size={13} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p className="text-xs leading-relaxed" style={{ color: '#991B1B' }}>
                        Homes ≥ $1.5M are not eligible for CMHC insurance. A 20% conventional down payment is required.
                      </p>
                    </div>
                  </div>
                )}

                {results?.status === 'below_minimum' && (
                  <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)' }}>
                    <div className="flex gap-2 items-start">
                      <AlertTriangle size={13} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p className="text-xs leading-relaxed" style={{ color: '#991B1B' }}>
                        Down payment is below the required minimum of {results ? fmtCAD(results.minDownPayment) : '—'} for this price.
                      </p>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="lg:hidden">
          <MobileCalcCTA />
        </div>

        {/* Dark Navy Results Card */}
        <div id="calc-results" className="lg:col-span-5" style={{ scrollMarginTop: '80px' }}>
          <div
            className="flex flex-col h-full p-5 md:p-6 rounded-[16px]"
            style={{
              background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 55%, #0D1B2A 100%)',
              border: '1px solid rgba(29,181,132,0.15)',
              minHeight: 380,
            }}
          >
            {results && sc ? (
              <div className="flex flex-col flex-1 gap-4">

                {/* Status badge */}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                  style={{ background: sc.darkBg, border: `1px solid ${sc.darkBorder}` }}>
                  <span style={{ color: sc.color }}>
                    {results.status === 'no_premium'
                      ? <CheckCircle2 size={16} />
                      : results.status === 'ineligible_price' || results.status === 'below_minimum'
                      ? <XCircle size={16} />
                      : results.status === 'insured_30yr_warn'
                      ? <AlertTriangle size={16} />
                      : <ShieldCheck size={16} />}
                  </span>
                  <p className="text-sm font-bold leading-tight" style={{ color: sc.color }}>{sc.label}</p>
                </div>

                {/* Primary number */}
                <div className="rounded-lg p-4 border border-slate-700" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                    Total Mortgage with Premium
                  </p>
                  <p style={{ color: results.cmhcPremium > 0 ? '#C9A84C' : '#1DB584', fontSize: '40px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 6 }}>
                    {fmtCAD(results.totalMortgage)}
                  </p>
                  {results.cmhcPremium > 0 && (
                    <p style={{ color: 'rgba(201,168,76,0.80)', fontSize: '11px', marginTop: 4 }}>
                      + {fmtCAD(results.cmhcPremium)} CMHC premium added
                    </p>
                  )}
                  {results.status === 'no_premium' && (
                    <p style={{ color: 'rgba(29,181,132,0.80)', fontSize: '11px', marginTop: 4 }}>
                      No CMHC premium — conventional mortgage
                    </p>
                  )}
                </div>

                {/* Simplified result rows — 4 key rows only */}
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  {[
                    {
                      label: 'Down Payment',
                      value: `${fmtCAD(results.downPaymentAmt)} · ${results.downPaymentPct.toFixed(1)}%`,
                      color: 'rgba(255,255,255,0.85)',
                    },
                    {
                      label: 'Base Mortgage',
                      value: fmtCAD(results.baseMortgage),
                      color: 'rgba(255,255,255,0.85)',
                    },
                    {
                      label: 'CMHC Rate',
                      value: results.cmhcRate > 0 ? (results.cmhcRate * 100).toFixed(2) + '%' : 'None',
                      color: results.cmhcRate > 0 ? '#C9A84C' : '#1DB584',
                    },
                    {
                      label: 'CMHC Premium',
                      value: results.cmhcPremium > 0 ? fmtCAD(results.cmhcPremium) : '$0',
                      color: results.cmhcPremium > 0 ? '#C9A84C' : '#1DB584',
                    },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-1.5">
                      <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{row.label}</span>
                      <span className="text-[12px] font-semibold" style={{ color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex-1" />

                {/* AI CTA */}
                <style>{`
                  @keyframes teal-glow-pulse {
                    0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
                    50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
                  }
                  .btn-cmhc-cta { animation: teal-glow-pulse 2.8s ease-in-out infinite; transition: transform 180ms ease, box-shadow 180ms ease; }
                  .btn-cmhc-cta:hover { transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important; animation: none; }
                `}</style>
                <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    {results.status === 'insured'
                      ? 'See how to reduce your CMHC premium.'
                      : results.status === 'below_minimum'
                      ? 'See how much more you need to qualify.'
                      : 'Understand your CMHC insurance position.'}
                  </p>
                  <button
                    onClick={() => document.getElementById('expert-analysis')?.scrollIntoView({ behavior: 'smooth' })}
                    onMouseEnter={() => setAiCtaHovered(true)}
                    onMouseLeave={() => setAiCtaHovered(false)}
                    className="btn-cmhc-cta w-full font-bold overflow-hidden"
                    style={{ position: 'relative', background: '#060F1A', color: '#ffffff', borderRadius: 8, height: 40, fontSize: '13px', border: '1px solid rgba(29,181,132,0.3)' }}
                  >
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: aiCtaHovered ? 0 : 1, transition: 'opacity 200ms ease', pointerEvents: 'none' }}>
                      View AI Insurance Analysis ↓
                    </span>
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: aiCtaHovered ? 1 : 0, transition: 'opacity 200ms ease', pointerEvents: 'none' }}>
                      Unlock CMHC Insights ↓
                    </span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center py-12">
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                  Enter a purchase price &amp; down payment<br />to see your CMHC insurance estimate.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>{/* end Block A */}

      {/* ── Block B: Visual Cards (left = donut, right = vertical bar) ────────── */}
      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* LEFT: CMHC Premium Impact — donut chart */}
          <div style={cardStyle} className="p-5 md:p-6 flex flex-col gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5"
                style={{ color: results.cmhcPremium > 0 ? '#C9A84C' : '#1DB584' }}>
                Insurance Cost
              </p>
              <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>CMHC Premium Impact</p>
            </div>

            {results.status === 'ineligible_price' ? (
              <div className="flex flex-col items-center justify-center flex-1 py-8 gap-2 text-center">
                <ShieldOff size={36} color="rgba(239,68,68,0.30)" />
                <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>CMHC Not Available</p>
                <p className="text-xs" style={{ color: '#9BA8B5' }}>Homes priced at $1.5M or more are not eligible for CMHC insurance.</p>
              </div>
            ) : results.status === 'below_minimum' ? (
              <div className="flex flex-col items-center justify-center flex-1 py-8 gap-2 text-center">
                <AlertTriangle size={36} color="rgba(239,68,68,0.30)" />
                <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>Below Minimum Down Payment</p>
                <p className="text-xs" style={{ color: '#9BA8B5' }}>
                  Minimum required: {fmtCAD(results.minDownPayment)}<br />
                  Gap: {fmtCAD(Math.abs(results.downPaymentGap))}
                </p>
              </div>
            ) : (
              <>
                {/* Donut + legend — matches Investment Fees Calculator style */}
                <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                  <div className="shrink-0">
                    <DonutChart
                      slices={donutSlices}
                      className="w-52 h-52"
                      centerValue={fmtCAD(results.totalMortgage)}
                      centerLabel="total mortgage"
                    />
                  </div>
                  <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    {(() => {
                      const premiumColor = results.cmhcPremium > 0 ? '#F59E0B' : '#1DB584';
                      const total = results.totalMortgage || 1;
                      const rows = [
                        { label: 'Base Mortgage', value: results.baseMortgage, color: '#1DB584', valueColor: '#0D1B2A' },
                        { label: 'CMHC Premium',  value: results.cmhcPremium,  color: premiumColor, valueColor: premiumColor },
                      ];
                      return rows.map(({ label, value, color, valueColor }) => {
                        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                        return (
                          <div key={label} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                              <span style={{ color: '#4B5563', fontSize: '12.5px' }}>{label}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-slate-400">{pct}%</span>
                              <span className="font-semibold" style={{ color: valueColor, fontSize: '12.5px' }}>
                                {value > 0 ? fmtCAD(value) : '$0 — None'}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                    <div className="flex items-center justify-between py-2">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Premium Rate</span>
                      <span className="font-semibold" style={{ color: results.cmhcRate > 0 ? '#C9A84C' : '#1DB584', fontSize: '12.5px' }}>
                        {results.cmhcRate > 0 ? (results.cmhcRate * 100).toFixed(2) + '%' : 'None'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>Total Mortgage</span>
                      <span className="font-bold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>
                        {fmtCAD(results.totalMortgage)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT: CMHC Premiums by Down Payment — Term Comparison–style bar chart */}
          {(() => {
            const DP_SCENARIOS = [5, 7.5, 10, 12.5, 15, 17.5, 20];
            const price    = results.purchasePrice;
            const CHART_H  = 148;
            const XLABEL_H = 26;

            const scenarios = DP_SCENARIOS.map(pct => {
              const base    = Math.max(0, price - price * (pct / 100));
              const premium = base * getCmhcRate(pct);
              return { pct, premium };
            });

            const maxPremium = Math.max(...scenarios.map(s => s.premium), 1);

            const userPct = results.downPaymentPct;
            let closestIdx = 0;
            let minDiff = Infinity;
            scenarios.forEach((s, i) => {
              const d = Math.abs(s.pct - userPct);
              if (d < minDiff) { minDiff = d; closestIdx = i; }
            });

            function fmtCompact(n: number): string {
              if (n === 0) return '$0';
              if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
              return '$' + Math.round(n);
            }

            return (
              <div style={cardStyle} className="p-5 md:p-6 flex flex-col gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                    Premium comparison
                  </p>
                  <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>CMHC Premiums by Down Payment</p>
                </div>

                <p className="text-xs -mt-1" style={{ color: '#9BA8B5' }}>
                  Estimated CMHC premium on {fmtCAD(price)} at each down payment level
                </p>

                {/* Chart — absolute layout matching Personal Loan Term Comparison */}
                <div className="relative" style={{ height: CHART_H + XLABEL_H + 64 }} aria-label="CMHC premium comparison by down payment">

                  {/* Bars area */}
                  <div
                    className="absolute left-0 right-0 flex gap-1"
                    style={{ bottom: XLABEL_H, height: CHART_H }}
                  >
                    {scenarios.map((s, i) => {
                      const isSel = i === closestIdx;
                      const barH  = s.premium > 0
                        ? Math.max(4, Math.round((s.premium / maxPremium) * CHART_H))
                        : 4;
                      // Selected = amber; 20% no-premium = teal; others = faded amber
                      const fill  = isSel ? '#F59E0B' : s.premium === 0 ? '#1DB584' : 'rgba(245,158,11,0.22)';

                      return (
                        <div key={s.pct} className="flex-1 flex items-end justify-center">
                          <div style={{ position: 'relative', width: '58%', minWidth: 6 }}>
                            {/* Bar */}
                            <div style={{ height: barH, width: '100%', background: fill, borderRadius: '4px 4px 0 0' }} />

                            {/* Selected: teal outline + bubble */}
                            {isSel && (
                              <>
                                <div style={{
                                  position: 'absolute', top: -7, left: -7, right: -7, bottom: 0,
                                  borderTop: '2px solid #F59E0B', borderLeft: '2px solid #F59E0B', borderRight: '2px solid #F59E0B',
                                  borderRadius: '11px 11px 0 0',
                                  boxShadow: '0 0 14px rgba(245,158,11,0.25)',
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
                                    className="relative rounded-xl px-2.5 py-1.5 text-center"
                                    style={{
                                      background: '#fff',
                                      boxShadow: '0 3px 14px rgba(0,0,0,0.12)',
                                      border: '1.5px solid rgba(29,181,132,0.30)',
                                      minWidth: 60,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    <p style={{ fontSize: '9px', fontWeight: 700, color: '#6B7A8D', marginBottom: 2 }}>{s.pct}% down</p>
                                    <p style={{ fontSize: '15px', fontWeight: 800, color: s.premium > 0 ? '#F59E0B' : '#1DB584', lineHeight: 1 }}>
                                      {fmtCompact(s.premium)}
                                    </p>
                                    {/* Caret */}
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
                  <div
                    className="absolute left-0 right-0 bottom-0 flex gap-1"
                    style={{ height: XLABEL_H }}
                  >
                    {scenarios.map((s, i) => {
                      const isSel = i === closestIdx;
                      return (
                        <div key={s.pct} className="flex-1 flex items-center justify-center">
                          {isSel ? (
                            <span className="rounded-full" style={{ background: '#1DB584', color: '#fff', fontSize: '9px', fontWeight: 700, lineHeight: 1, display: 'inline-block', padding: '3px 6px', whiteSpace: 'nowrap' }}>
                              {s.pct}%
                            </span>
                          ) : (
                            <span style={{ fontSize: '9px', color: '#9BA8B5', whiteSpace: 'nowrap' }}>{s.pct}%</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Rate legend */}
                <div className="rounded-xl px-3 py-2.5 flex flex-wrap gap-x-3 gap-y-1.5" style={{ background: '#F8FAFB', border: '1px solid #F1F4F7' }}>
                  {[
                    { label: '5%–9.99%',   rate: '4.00%', color: '#F59E0B' },
                    { label: '10%–14.99%', rate: '3.10%', color: '#F59E0B' },
                    { label: '15%–19.99%', rate: '2.80%', color: '#F59E0B' },
                    { label: '20%+',       rate: 'None',  color: '#1DB584' },
                  ].map(t => (
                    <div key={t.label} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                      <span className="text-[10px] font-semibold" style={{ color: '#6B7A8D' }}>{t.label}</span>
                      <span className="text-[10px] font-bold" style={{ color: t.color }}>{t.rate}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        </div>
      )}{/* end Block B */}

      {/* ── Block C: AI CMHC Insurance Analysis ──────────────────────────────── */}
      {results && sc && (
        <div id="expert-analysis" className="rounded-2xl overflow-hidden shadow-sm scroll-mt-[78px] md:scroll-mt-[88px]">

          {/* Header */}
          <div
            className="px-4 md:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center"
            style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)', paddingTop: 16, paddingBottom: 16, gap: 12 }}
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center shrink-0"
                style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,181,132,0.18)' }}>
                <Sparkles className="w-4 h-4" style={{ color: '#1DB584' }} aria-hidden />
              </span>
              <p className="text-white text-lg md:text-xl font-bold tracking-tight">
                FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI CMHC Insurance Analysis
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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
              <button disabled aria-disabled title="Coming soon"
                className="inline-flex items-center gap-1.5 cursor-not-allowed select-none"
                style={{ border: '1.5px solid rgba(255,255,255,0.30)', color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700 }}>
                <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden />
                Email Results
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

            {/* Row 1: Status card + Smart lever */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

              {/* LEFT — CMHC Status */}
              <div className="rounded-2xl p-4 md:p-5 flex flex-col gap-3"
                style={{ background: '#ffffff', border: `1px solid ${sc.border}`, borderLeft: `4px solid ${sc.color}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>

                <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: sc.color }}>
                  CMHC Status
                </p>

                <div className="flex items-center gap-3">
                  <div style={{ width: 84, height: 84, borderRadius: 22, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 62, height: 62, borderRadius: '50%', background: sc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${sc.color}55` }}>
                      <StatusIconEl status={results.status} size={28} />
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 22, fontWeight: 800, color: sc.color, lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                      {results.status === 'no_premium'        ? 'No Premium'
                      : results.status === 'ineligible_price' ? 'Ineligible'
                      : results.status === 'below_minimum'    ? 'Below Min.'
                      : 'Insured'}
                    </p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: '#6B7A8D' }}>{sc.sub}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: sc.bg, color: sc.color }}>
                    {results.downPaymentPct.toFixed(1)}% down — {sc.label}
                  </span>
                  {results.cmhcRate > 0 && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}>
                      {(results.cmhcRate * 100).toFixed(2)}% premium rate
                    </span>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #F1F4F7', paddingTop: 10 }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                    {results.status === 'no_premium'        && 'No mortgage insurance required.'}
                    {results.status === 'ineligible_price'  && 'CMHC insurance is unavailable at this price.'}
                    {results.status === 'below_minimum'     && 'Down payment is below the required minimum.'}
                    {results.status === 'insured_30yr_warn' && 'CMHC insured — 30-year eligibility unconfirmed.'}
                    {results.status === 'insured'           && 'CMHC mortgage default insurance applies.'}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#6B7A8D' }}>
                    {results.status === 'no_premium' &&
                      `A down payment of ${results.downPaymentPct.toFixed(1)}% meets the 20% threshold. The mortgage of ${fmtCAD(results.baseMortgage)} is conventional — no CMHC insurance premium is added to the balance.`}
                    {results.status === 'ineligible_price' &&
                      `CMHC insurance is not available for homes priced at $1,500,000 or more. A minimum 20% conventional down payment is required by lenders — there is no CMHC-insured option at this price point.`}
                    {results.status === 'below_minimum' &&
                      `The minimum down payment for ${fmtCAD(results.purchasePrice)} is approximately ${fmtCAD(results.minDownPayment)}. The current down payment of ${fmtCAD(results.downPaymentAmt)} is ${fmtCAD(Math.abs(results.downPaymentGap))} short of the minimum required to qualify.`}
                    {results.status === 'insured_30yr_warn' &&
                      `CMHC insurance applies at ${(results.cmhcRate * 100).toFixed(2)}% on the ${fmtCAD(results.baseMortgage)} base mortgage. However, the 30-year insured amortization may not be eligible without first-time buyer or new build status — verify with your lender.`}
                    {results.status === 'insured' &&
                      `CMHC mortgage default insurance applies at ${(results.cmhcRate * 100).toFixed(2)}% on the ${fmtCAD(results.baseMortgage)} base mortgage. The ${fmtCAD(results.cmhcPremium)} premium is added to the mortgage balance and amortized over the full term.`}
                  </p>
                </div>
              </div>

              {/* RIGHT — Smart Lever */}
              <div className="rounded-2xl p-4 md:p-5 flex flex-col gap-3"
                style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>

                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                  <span className="text-sm font-bold" style={{ color: '#1DB584' }}>Next Down Payment Threshold</span>
                </div>

                {bestLever ? (
                  <>
                    <div className="rounded-xl px-4 py-4"
                      style={{ background: 'rgba(29,181,132,0.10)', border: '1px solid rgba(29,181,132,0.22)' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(29,181,132,0.7)', marginBottom: 6 }}>
                        {results.status === 'below_minimum' ? 'Gap to Qualify' : 'Extra Down Payment Needed'}
                      </p>
                      <p className="font-extrabold tabular-nums"
                        style={{ fontSize: 'clamp(1.6rem, 4vw, 2.1rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                        {fmtCAD(bestLever.extraNeeded)}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginTop: 6 }}>
                        {results.status === 'below_minimum'
                          ? 'to meet the minimum qualifying down payment'
                          : bestLever.rate === 0
                          ? 'to avoid CMHC premium entirely'
                          : `to reach ${bestLever.pct}% and reduce the premium`}
                      </p>
                    </div>

                    {bestLever.premiumSaved > 0 && (
                      <div className="rounded-xl px-3 py-3"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {bestLever.label}
                        </p>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {bestLever.rate === 0
                            ? `Reaching 20% in this scenario could avoid the CMHC premium entirely — a potential saving of ${fmtCAD(bestLever.premiumSaved)} that would otherwise be added to the mortgage balance.`
                            : `Reaching ${bestLever.pct}% in this scenario could reduce the estimated premium from ${fmtCAD(results.cmhcPremium)} to ${fmtCAD(bestLever.newPremium)} — a difference of ${fmtCAD(bestLever.premiumSaved)}.`}
                        </p>
                      </div>
                    )}

                    {nextThresholds.length > 1 && (
                      <div className="space-y-1.5">
                        {nextThresholds.slice(1).map((t, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#1DB584' }} />
                            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                              <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>{t.label}</span>
                              {' — '}{fmtCAD(t.extraNeeded)} more
                              {t.premiumSaved > 0 && ` · saves ${fmtCAD(t.premiumSaved)}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      Estimates based on entered inputs. Actual results may vary.
                    </p>
                  </>
                ) : results.status === 'no_premium' ? (
                  <div className="rounded-xl px-4 py-4"
                    style={{ background: 'rgba(29,181,132,0.10)', border: '1px solid rgba(29,181,132,0.22)' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(29,181,132,0.7)', marginBottom: 6 }}>Premium Avoided</p>
                    <p className="font-extrabold tabular-nums"
                      style={{ fontSize: 'clamp(1.6rem, 4vw, 2.1rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                      $0
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginTop: 6 }}>
                      No CMHC insurance required — conventional mortgage
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl px-4 py-4"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                      CMHC insurance is not available for homes priced at $1.5M or more. A minimum 20% conventional down payment is required.
                    </p>
                  </div>
                )}
              </div>

            </div>{/* end Row 1 */}

            {/* Row 2: Three Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

              {/* Card 1: Eligibility Check */}
              {(() => {
                const cardBg = sc.bg, cardBorder = sc.border, labelColor = sc.color;
                let title = '', body = '';
                if (results.status === 'no_premium') {
                  title = 'No insurance required';
                  body  = `Down payment of ${results.downPaymentPct.toFixed(1)}% meets the 20% conventional threshold — CMHC insurance does not apply.`;
                } else if (results.status === 'ineligible_price') {
                  title = 'CMHC unavailable at this price';
                  body  = 'Homes priced at $1.5M or more are not eligible for CMHC mortgage default insurance, regardless of down payment.';
                } else if (results.status === 'below_minimum') {
                  title = `Minimum gap: ${fmtCAD(Math.abs(results.downPaymentGap))}`;
                  body  = `The entered down payment is below the minimum of ${fmtCAD(results.minDownPayment)} required for this purchase price.`;
                } else {
                  title = `Insured at ${(results.cmhcRate * 100).toFixed(2)}%`;
                  body  = `A ${results.downPaymentPct.toFixed(1)}% down payment falls in the ${results.downPaymentPct < 10 ? '5%–9.99%' : results.downPaymentPct < 15 ? '10%–14.99%' : '15%–19.99%'} bracket. CMHC insurance applies at ${(results.cmhcRate * 100).toFixed(2)}%.`;
                }
                return (
                  <div className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.7)', border: `1px solid ${cardBorder}` }}>
                        <Activity className="w-3.5 h-3.5" style={{ color: labelColor }} aria-hidden />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: labelColor }}>Eligibility Check</p>
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>{title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>{body}</p>
                  </div>
                );
              })()}

              {/* Card 2: Premium Impact */}
              <div className="rounded-xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center shrink-0"
                    style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                    <TrendingUp className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Premium Impact</p>
                </div>
                {results.cmhcPremium > 0 ? (
                  <>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                      {fmtCAD(results.cmhcPremium)} added to mortgage balance
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                      The {(results.cmhcRate * 100).toFixed(2)}% premium on {fmtCAD(results.baseMortgage)} adds {fmtCAD(results.cmhcPremium)} to the balance, bringing the total financed amount to {fmtCAD(results.totalMortgage)}.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>No premium applies</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                      {results.status === 'ineligible_price' || results.status === 'below_minimum'
                        ? 'CMHC premium cannot be calculated — eligibility conditions are not met.'
                        : 'With 20%+ down, no CMHC premium is added. The total mortgage equals the base mortgage amount.'}
                    </p>
                  </>
                )}
              </div>

              {/* Card 3: Down Payment Thresholds */}
              <div className="rounded-xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center shrink-0"
                    style={{ width: 28, height: 28, borderRadius: 8, background: '#FEF3C7' }}>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" aria-hidden />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Down Payment Thresholds</p>
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                  {results.downPaymentPct < 5  ? 'Below the 5% floor'
                  : results.downPaymentPct < 10 ? '5%–9.99% bracket — 4.00% rate'
                  : results.downPaymentPct < 15 ? '10%–14.99% bracket — 3.10% rate'
                  : results.downPaymentPct < 20 ? '15%–19.99% bracket — 2.80% rate'
                  : '20%+ — no premium bracket'}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                  CMHC premium rates drop at the 10%, 15%, and 20% down payment thresholds. Reaching 20% eliminates the premium entirely.
                  {bestLever && bestLever.premiumSaved > 0 && ` Reaching the next threshold in this scenario could reduce the estimated premium by ${fmtCAD(bestLever.premiumSaved)}.`}
                </p>
              </div>

            </div>{/* end Row 2 */}

            {/* Row 3: Stats grid */}
            <style>{`
              .cmhc-stat-grid > div { border-right: 1px solid #F1F4F7; border-bottom: 1px solid #F1F4F7; }
              .cmhc-stat-grid > div:nth-child(even) { border-right: none; }
              .cmhc-stat-grid > div:nth-child(n+3) { border-bottom: none; }
              @media (min-width: 768px) {
                .cmhc-stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
                .cmhc-stat-grid > div { border-bottom: none; border-right: 1px solid #F1F4F7; }
                .cmhc-stat-grid > div:last-child { border-right: none; }
              }
            `}</style>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div style={{ background: '#F8FAFB', borderBottom: '1px solid rgba(15,41,66,0.09)', padding: '9px 16px' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9BA8B5', letterSpacing: '0.12em' }}>
                  Insurance Summary
                </p>
              </div>
              <div className="cmhc-stat-grid grid grid-cols-2">
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>Purchase Price</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#0D1B2A', letterSpacing: '-0.5px' }}>{fmtCAD(results.purchasePrice)}</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>Down Payment</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#0D1B2A', letterSpacing: '-0.5px' }}>
                    {fmtCAD(results.downPaymentAmt)}
                    <span className="text-xs font-normal ml-1" style={{ color: '#9BA8B5' }}>{results.downPaymentPct.toFixed(1)}%</span>
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>CMHC Premium</p>
                  <p style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.5px', color: results.cmhcPremium > 0 ? '#C9A84C' : '#10B981' }}>
                    {results.cmhcPremium > 0 ? fmtCAD(results.cmhcPremium) : 'None'}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>Total Mortgage</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#1DB584', letterSpacing: '-0.5px' }}>{fmtCAD(results.totalMortgage)}</p>
                </div>
              </div>
            </div>

          </div>{/* end body */}

          {/* Footer Disclaimer */}
          <div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
            style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
            <p className="text-slate-400 text-xs leading-relaxed">
              <strong className="text-slate-500 font-semibold">Canada only. Estimates only.</strong> Results are based on the purchase price and down payment entered, using current displayed CMHC premium rates. Not included: provincial sales tax that may apply to the CMHC premium (CMHC currently identifies Ontario, Quebec and Saskatchewan — confirm current treatment with your lender or insurer); lender underwriting; affordability qualification; interest rates; closing costs. Verify with your lender or CMHC before making financial decisions.
            </p>
          </div>

        </div>
      )}{/* end Block C */}

      {/* ── Block D: How It Works ─────────────────────────────────────────────── */}
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

      {/* ── Block E: FAQ ───────────────────────────────────────────────────────── */}
      {faqItems.length > 0 && (
        <div style={cardStyle} className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
            Frequently Asked Questions
          </h2>
          <CalculatorFaqAccordion faqs={faqItems} />
        </div>
      )}

      {/* ── Disclaimer ────────────────────────────────────────────────────────── */}
      <Disclaimer />

    </div>
  );
}
