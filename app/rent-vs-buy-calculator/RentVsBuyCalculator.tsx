'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import {
  monthlyRateCA, monthlyRateUS, calcPayment,
  fmtCAD, fmtCADx, fmtUSD, fmtUSDx, parseN,
} from '@/app/_mortgage-shared/math';
import { NumericInput, Tooltip, Disclaimer } from '@/app/_mortgage-shared/ui';
import { inputCls, type Faq } from '@/components/layout/CalculatorLayout';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import {
  Sparkles, Download, Mail, BookOpen, HelpCircle,
  Home, Building2, Scale, TrendingUp, ShieldAlert,
  Check, DollarSign,
} from 'lucide-react';
import { buildRentVsBuyPDF } from '@/lib/pdf/adapters/rentVsBuyAdapter';

// ── Types ──────────────────────────────────────────────────────────────────────

type Amortization = '25' | '30';
type Horizon     = '3' | '5' | '7' | '10';
type DPMode      = 'amount' | 'percent';
type Decision    = 'buy' | 'rent' | 'close';
type Driver      = 'appreciation' | 'rentGrowth' | 'interestRate' | 'ownershipCost';

interface FormState {
  monthlyRent: string;
  rentIncrease: string;
  purchasePrice: string;
  downPayment: string;
  downPaymentMode: DPMode;
  annualRate: string;
  amortization: Amortization;
  propertyTaxPct: string;
  monthlyInsuranceMaint: string;
  monthlyHOA: string;
  horizon: Horizon;
  homeGrowthPct: string;
  investReturnPct: string;
  closingCostPct: string;
}

interface YearData {
  year: number;
  cumRent: number;
  cumBuy: number;
  equity: number;
}

interface HorizonBar {
  years: number;
  rentCost: number;
  buyCost: number;
}

interface Results {
  monthlyOwnership: number;
  monthlyPI: number;
  downPaymentAmt: number;
  downPaymentPct: number;
  totalRentCost: number;
  totalBuyCost: number;
  equity: number;
  netDifference: number;
  breakEvenYear: number | null;
  opportunityCost: number;
  decision: Decision;
  topDriver: Driver;
  yearlyData: YearData[];
  horizonBars: HorizonBar[];
  initialBuyCost: number;
  horizonYears: number;
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
  monthlyRent: '2200',
  rentIncrease: '3.0',
  purchasePrice: '650000',
  downPayment: '130000',
  downPaymentMode: 'amount',
  annualRate: '5.25',
  amortization: '25',
  propertyTaxPct: '0.75',
  monthlyInsuranceMaint: '400',
  monthlyHOA: '0',
  horizon: '10',
  homeGrowthPct: '3.0',
  investReturnPct: '5.0',
  closingCostPct: '1.5',
};

const TOOLTIPS = {
  monthlyRent: 'Your current or expected monthly rent payment.',
  rentIncrease: 'Average annual percentage by which rent is expected to increase each year.',
  purchasePrice: 'The asking or expected purchase price of the home.',
  downPayment: 'Cash paid upfront toward the purchase. 20%+ avoids mortgage insurance in most cases.',
  annualRate: 'Annual mortgage interest rate. Canada uses semi-annual compounding; US uses monthly compounding.',
  amortization: 'Total length of the mortgage. Longer amortization means lower payments but more total interest.',
  propertyTaxPct: 'Annual property tax as a percentage of the purchase price. Typical range: 0.5%–2% depending on location.',
  monthlyInsuranceMaint: 'Combined monthly estimate for home insurance, routine maintenance, and repairs. A common rule of thumb is 1%–2% of home value per year.',
  monthlyHOA: 'Monthly condo, strata, or homeowners association fee. Enter 0 if not applicable.',
  horizon: 'How many years to compare renting versus buying. Break-even can shift significantly with the time horizon.',
  homeGrowthPct: 'Assumed annual home value appreciation. Historical Canadian and US averages have varied widely by city and period.',
  investReturnPct: 'Assumed annual return if the down payment were invested instead of used to buy. Used only as context for the Equity vs Flexibility tradeoff — not subtracted from rent cost.',
  closingCostPct: 'Estimated total closing costs as a percentage of the purchase price. Includes legal fees, land transfer tax, inspections, and title insurance. Varies by province/state.',
};

const HORIZON_OPTIONS: Horizon[] = ['3', '5', '7', '10'];

const VERDICT_CONFIG = {
  buy: {
    color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0',
    darkBg: 'rgba(16,185,129,0.18)', darkBorder: 'rgba(16,185,129,0.45)',
    label: 'Buying Appears Lower-Cost',
    sublabel: 'Net buy cost is lower over this horizon',
  },
  rent: {
    color: '#0EA5E9', bg: '#f0f9ff', border: '#bae6fd',
    darkBg: 'rgba(14,165,233,0.18)', darkBorder: 'rgba(14,165,233,0.45)',
    label: 'Renting Appears Lower-Cost',
    sublabel: 'Estimated rent cost is lower over this horizon',
  },
  close: {
    color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A',
    darkBg: 'rgba(245,158,11,0.18)', darkBorder: 'rgba(245,158,11,0.45)',
    label: 'Close Call — Inputs Are Decisive',
    sublabel: 'Costs are within 10% — assumptions matter most',
  },
} as const;

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RentVsBuyCalculator({
  formulaContent,
  faqItems = [],
}: {
  formulaContent?: ReactNode;
  faqItems?: Faq[];
}) {
  const { region } = useRegion();
  const isCA = region === 'ca';
  const fmt  = isCA ? fmtCAD  : fmtUSD;
  const fmtx = isCA ? fmtCADx : fmtUSDx;
  const moneyPrefix = isCA ? 'CA$' : '$';

  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(p => ({ ...p, [field]: value }));
  }

  function toggleDPMode() {
    const pp  = parseN(form.purchasePrice);
    const cur = parseN(form.downPayment);
    if (form.downPaymentMode === 'amount') {
      const pct = pp > 0 ? Math.min(100, +((cur / pp) * 100).toFixed(2)) : 0;
      setForm(p => ({ ...p, downPaymentMode: 'percent', downPayment: String(pct) }));
    } else {
      const amt = Math.round((Math.min(100, cur) / 100) * pp);
      setForm(p => ({ ...p, downPaymentMode: 'amount', downPayment: String(amt) }));
    }
  }

  // ── Math ─────────────────────────────────────────────────────────────────────

  const results = useMemo<Results | null>(() => {
    const pp = parseN(form.purchasePrice);
    if (pp <= 0) return null;

    const dpRaw = parseN(form.downPayment);
    const dpAmt = form.downPaymentMode === 'amount'
      ? dpRaw
      : pp * Math.min(100, dpRaw) / 100;
    if (dpAmt < 0 || dpAmt >= pp) return null;

    const rate = parseN(form.annualRate);
    if (rate <= 0 || rate > 30) return null;

    const rentStart = parseN(form.monthlyRent);
    if (rentStart <= 0) return null;

    const base   = pp - dpAmt;
    const n      = parseInt(form.amortization) * 12;
    const mRate  = isCA ? monthlyRateCA(rate) : monthlyRateUS(rate);
    const monthlyPI = calcPayment(base, mRate, n);

    const monthlyTax          = pp * parseN(form.propertyTaxPct) / 100 / 12;
    const monthlyInsurMaint   = parseN(form.monthlyInsuranceMaint);
    const monthlyHOA          = parseN(form.monthlyHOA);
    const monthlyOwnership    = monthlyPI + monthlyTax + monthlyInsurMaint + monthlyHOA;

    const rentGrowth    = parseN(form.rentIncrease) / 100;
    const homeGrowth    = parseN(form.homeGrowthPct) / 100;
    const investReturn  = parseN(form.investReturnPct) / 100;
    const closingCosts  = pp * parseN(form.closingCostPct) / 100;
    const horizonYears  = parseInt(form.horizon);

    // Year-by-year loop (up to 10 years)
    let cumRent   = 0;
    let cumCashOut = closingCosts + dpAmt;
    let mortBalance = base;
    let rentMonthly = rentStart;
    let breakEvenYear: number | null = null;
    const yearlyData: YearData[] = [];

    for (let y = 1; y <= 10; y++) {
      cumRent += rentMonthly * 12;
      rentMonthly = rentMonthly * (1 + rentGrowth);

      for (let m = 0; m < 12; m++) {
        if (mortBalance <= 0.01) break;
        const interest  = mortBalance * mRate;
        const principal = Math.min(monthlyPI - interest, mortBalance);
        mortBalance = Math.max(0, mortBalance - principal);
      }

      cumCashOut += monthlyOwnership * 12;

      const homeValue = pp * Math.pow(1 + homeGrowth, y);
      const equity    = Math.max(0, homeValue - mortBalance);
      const netBuyCost = cumCashOut - equity;

      yearlyData.push({ year: y, cumRent, cumBuy: netBuyCost, equity });

      if (breakEvenYear === null && netBuyCost < cumRent) {
        breakEvenYear = y;
      }
    }

    const hData = yearlyData[horizonYears - 1];
    if (!hData) return null;

    const totalRentCost = hData.cumRent;
    const totalBuyCost  = hData.cumBuy;
    const equity        = hData.equity;
    const netDifference = totalBuyCost - totalRentCost; // positive = rent cheaper
    const opportunityCost = dpAmt * (Math.pow(1 + investReturn, horizonYears) - 1);

    const larger = Math.max(Math.abs(totalRentCost), Math.abs(totalBuyCost), 1);
    let decision: Decision;
    if (Math.abs(netDifference) / larger < 0.10) {
      decision = 'close';
    } else if (netDifference < 0) {
      decision = 'buy';
    } else {
      decision = 'rent';
    }

    // Simple rule-based driver — no extra loops
    let topDriver: Driver;
    if (breakEvenYear === null) {
      if (homeGrowth * 100 < rentGrowth * 100) {
        topDriver = 'appreciation';
      } else if (rate > 5.5) {
        topDriver = 'interestRate';
      } else {
        topDriver = 'ownershipCost';
      }
    } else if (breakEvenYear <= horizonYears / 2) {
      topDriver = 'appreciation';
    } else {
      topDriver = 'rentGrowth';
    }

    const horizonBars: HorizonBar[] = [3, 5, 7, 10].map(y => {
      const d = yearlyData[y - 1];
      return { years: y, rentCost: d?.cumRent ?? 0, buyCost: d?.cumBuy ?? 0 };
    });

    return {
      monthlyOwnership, monthlyPI,
      downPaymentAmt: dpAmt,
      downPaymentPct: (dpAmt / pp) * 100,
      totalRentCost, totalBuyCost, equity,
      netDifference, breakEvenYear, opportunityCost,
      decision, topDriver,
      yearlyData, horizonBars,
      initialBuyCost: closingCosts + dpAmt,
      horizonYears,
    };
  }, [form, isCA]);

  const vc = results ? VERDICT_CONFIG[results.decision] : null;

  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      await buildRentVsBuyPDF({
        monthlyRent:           parseN(form.monthlyRent),
        rentIncrease:          parseN(form.rentIncrease),
        purchasePrice:         parseN(form.purchasePrice),
        downPaymentAmt:        results.downPaymentAmt,
        downPaymentPct:        results.downPaymentPct,
        annualRate:            parseN(form.annualRate),
        amortization:          parseInt(form.amortization),
        propertyTaxPct:        parseN(form.propertyTaxPct),
        monthlyInsuranceMaint: parseN(form.monthlyInsuranceMaint),
        monthlyHOA:            parseN(form.monthlyHOA),
        homeGrowthPct:         parseN(form.homeGrowthPct),
        investReturnPct:       parseN(form.investReturnPct),
        closingCostPct:        parseN(form.closingCostPct),
        horizonYears:          results.horizonYears,
        monthlyOwnership:      results.monthlyOwnership,
        monthlyPI:             results.monthlyPI,
        totalRentCost:         results.totalRentCost,
        totalBuyCost:          results.totalBuyCost,
        equity:                results.equity,
        netDifference:         results.netDifference,
        breakEvenYear:         results.breakEvenYear,
        opportunityCost:       results.opportunityCost,
        decision:              results.decision,
        topDriver:             results.topDriver,
        region,
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
                <Scale size={15} color="white" strokeWidth={2} aria-hidden />
              </div>
              <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Rent vs. Buy Details</p>
            </div>

            <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

              {/* Left: Renting + Assumptions */}
              <div className="space-y-2.5 min-w-0">

                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9BA8B5' }}>Renting</p>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Monthly Rent <Tooltip text={TOOLTIPS.monthlyRent} />
                  </label>
                  <NumericInput value={form.monthlyRent} onChange={v => set('monthlyRent', v)} prefix={moneyPrefix} inputClassName={inputClsCompact} placeholder="2,200" />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Annual Rent Increase % <Tooltip text={TOOLTIPS.rentIncrease} />
                  </label>
                  <NumericInput value={form.rentIncrease} onChange={v => set('rentIncrease', v)} suffix="%" inputClassName={inputClsCompact} placeholder="3.0" />
                </div>

                <div className="pt-1" style={{ borderTop: '1px solid #F1F4F7' }}>
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#9BA8B5' }}>
                    Assumptions
                  </p>
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Time Horizon <Tooltip text={TOOLTIPS.horizon} />
                  </label>
                  <div className="flex gap-1.5">
                    {HORIZON_OPTIONS.map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => set('horizon', h)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150"
                        style={
                          form.horizon === h
                            ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                            : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                        }
                      >
                        {h} yr
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Home Value Growth % <Tooltip text={TOOLTIPS.homeGrowthPct} />
                  </label>
                  <NumericInput value={form.homeGrowthPct} onChange={v => set('homeGrowthPct', v)} suffix="%" inputClassName={inputClsCompact} placeholder="3.0" />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Investment Return % <Tooltip text={TOOLTIPS.investReturnPct} />
                  </label>
                  <NumericInput value={form.investReturnPct} onChange={v => set('investReturnPct', v)} suffix="%" inputClassName={inputClsCompact} placeholder="5.0" />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Closing Costs % <Tooltip text={TOOLTIPS.closingCostPct} />
                  </label>
                  <NumericInput value={form.closingCostPct} onChange={v => set('closingCostPct', v)} suffix="%" inputClassName={inputClsCompact} placeholder="1.5" />
                </div>

              </div>{/* end left column */}

              {/* Right: Buying */}
              <div className="border-l pl-2 md:pl-5 space-y-2.5 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.09)' }}>

                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9BA8B5' }}>Buying</p>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Home Purchase Price <Tooltip text={TOOLTIPS.purchasePrice} />
                  </label>
                  <NumericInput value={form.purchasePrice} onChange={v => set('purchasePrice', v)} prefix={moneyPrefix} inputClassName={inputClsCompact} />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Down Payment <Tooltip text={TOOLTIPS.downPayment} />
                  </label>
                  <div className="flex gap-1.5">
                    <div className="flex-1 min-w-0">
                      <NumericInput
                        value={form.downPayment}
                        onChange={v => set('downPayment', v)}
                        prefix={form.downPaymentMode === 'amount' ? moneyPrefix : undefined}
                        suffix={form.downPaymentMode === 'percent' ? '%' : undefined}
                        inputClassName={inputClsCompact}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={toggleDPMode}
                      className="shrink-0 px-2 rounded-lg text-[11px] font-bold transition-colors duration-150"
                      style={{ border: '1.5px solid #E4E9EF', background: '#F8FAFB', color: '#6B7A8D', minWidth: 36 }}
                    >
                      {form.downPaymentMode === 'amount' ? '→ %' : '→ $'}
                    </button>
                  </div>
                  {results && (
                    <p className="mt-0.5 text-xs" style={{ color: '#9BA8B5' }}>
                      {form.downPaymentMode === 'amount'
                        ? `${results.downPaymentPct.toFixed(1)}% of purchase price`
                        : fmtx(results.downPaymentAmt)}
                    </p>
                  )}
                  {results && results.downPaymentPct < 20 && (
                    <p className="mt-0.5 text-[10px]" style={{ color: '#C9A84C' }}>
                      Under 20% — mortgage insurance may apply (not included)
                    </p>
                  )}
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Annual Interest Rate <Tooltip text={TOOLTIPS.annualRate} />
                  </label>
                  <NumericInput value={form.annualRate} onChange={v => set('annualRate', v)} suffix="%" inputClassName={inputClsCompact} placeholder="5.25" />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Amortization <Tooltip text={TOOLTIPS.amortization} />
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
                        {y} yrs
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Property Tax % <Tooltip text={TOOLTIPS.propertyTaxPct} />
                  </label>
                  <NumericInput value={form.propertyTaxPct} onChange={v => set('propertyTaxPct', v)} suffix="%" inputClassName={inputClsCompact} placeholder="0.75" />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Insurance + Maintenance <Tooltip text={TOOLTIPS.monthlyInsuranceMaint} />
                  </label>
                  <NumericInput value={form.monthlyInsuranceMaint} onChange={v => set('monthlyInsuranceMaint', v)} prefix={moneyPrefix} inputClassName={inputClsCompact} placeholder="400" />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Condo / HOA Fee <Tooltip text={TOOLTIPS.monthlyHOA} />
                  </label>
                  <NumericInput value={form.monthlyHOA} onChange={v => set('monthlyHOA', v)} prefix={moneyPrefix} inputClassName={inputClsCompact} placeholder="0" />
                </div>

              </div>{/* end right column */}
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
            {results && vc ? (
              <div className="flex flex-col flex-1 gap-4">

                {/* Verdict badge */}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                  style={{ background: vc.darkBg, border: `1px solid ${vc.darkBorder}` }}>
                  <span style={{ color: vc.color }}>
                    {results.decision === 'buy'  ? <Check size={16} />         : null}
                    {results.decision === 'rent' ? <Building2 size={16} />     : null}
                    {results.decision === 'close' ? <Scale size={16} />        : null}
                  </span>
                  <p className="text-sm font-bold leading-tight" style={{ color: vc.color }}>{vc.label}</p>
                </div>

                {/* Primary number */}
                <div className="rounded-lg p-4 border border-slate-700" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                    {results.decision === 'buy' ? 'Estimated Savings vs Renting' : results.decision === 'rent' ? 'Estimated Savings vs Buying' : 'Net Cost Difference'}
                  </p>
                  <p style={{ color: results.decision === 'buy' ? '#1DB584' : results.decision === 'rent' ? '#0EA5E9' : '#F59E0B', fontSize: '40px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 6 }}>
                    {fmt(Math.abs(results.netDifference))}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', marginTop: 4 }}>
                    over {results.horizonYears}-year horizon
                  </p>
                </div>

                {/* Result rows */}
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  {[
                    { label: 'Monthly Ownership Cost',  value: fmtx(results.monthlyOwnership),                              color: 'rgba(255,255,255,0.85)' },
                    { label: 'Total Rent Cost',         value: fmt(results.totalRentCost),                                  color: '#0EA5E9' },
                    { label: 'Total Buy Net Cost',      value: fmt(results.totalBuyCost),                                   color: '#1DB584' },
                    { label: 'Equity Built',            value: fmt(results.equity),                                         color: '#1DB584' },
                    { label: 'Break-even Year',         value: results.breakEvenYear ? `Year ${results.breakEvenYear}` : `> ${results.horizonYears} yrs`, color: results.breakEvenYear ? '#1DB584' : '#C9A84C' },
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
                  @keyframes teal-glow-rvb {
                    0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
                    50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
                  }
                  .btn-rvb-cta { animation: teal-glow-rvb 2.8s ease-in-out infinite; transition: transform 180ms ease, box-shadow 180ms ease; }
                  .btn-rvb-cta:hover { transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important; animation: none; }
                `}</style>
                <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    Understand what drives the decision.
                  </p>
                  <button
                    onClick={() => document.getElementById('expert-analysis')?.scrollIntoView({ behavior: 'smooth' })}
                    onMouseEnter={() => setAiCtaHovered(true)}
                    onMouseLeave={() => setAiCtaHovered(false)}
                    className="btn-rvb-cta w-full font-bold overflow-hidden"
                    style={{ position: 'relative', background: '#060F1A', color: '#ffffff', borderRadius: 8, height: 40, fontSize: '13px', border: '1px solid rgba(29,181,132,0.3)' }}
                  >
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: aiCtaHovered ? 0 : 1, transition: 'opacity 200ms ease', pointerEvents: 'none' }}>
                      View Rent vs Buy Analysis ↓
                    </span>
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: aiCtaHovered ? 1 : 0, transition: 'opacity 200ms ease', pointerEvents: 'none' }}>
                      Unlock AI Decision Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center py-12">
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                  Enter rent &amp; purchase details<br />to compare renting versus buying.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>{/* end Block A */}

      {/* ── Block B: Visual Cards ─────────────────────────────────────────────── */}
      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

          {/* Left: Rent vs Buy Cost Comparison — grouped bar chart */}
          {(() => {
            const CHART_H = 140, XLABEL_H = 28, YAXIS_W = 28;
            const allValues = results.horizonBars.flatMap(b => [b.rentCost, Math.max(0, b.buyCost)]);
            const yMax = Math.max(...allValues, 1) * 1.08;
            const horizYrs = results.horizonYears;

            function compact(n: number): string {
              if (Math.abs(n) >= 1_000_000) return moneyPrefix + (n / 1_000_000).toFixed(1) + 'M';
              if (Math.abs(n) >= 1000) return moneyPrefix + Math.round(n / 1000) + 'k';
              return moneyPrefix + Math.round(n);
            }

            return (
              <div style={cardStyle}>
                <div className="p-5 md:p-6 h-full flex flex-col">
                  <div className="mb-4 md:mb-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                      Cost comparison
                    </p>
                    <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Rent vs. Buy Cost</h3>
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#1DB584' }} />
                      <span style={{ fontSize: '10px', color: '#6B7A8D' }}>Rent cost</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#334155' }} />
                      <span style={{ fontSize: '10px', color: '#6B7A8D' }}>Buy net cost</span>
                    </div>
                  </div>

                  {/* Chart area */}
                  <div className="flex-1 relative" style={{ minHeight: CHART_H + XLABEL_H + 60 }}>

                    {/* Y-axis ticks */}
                    {[0, 0.25, 0.5, 0.75, 1].map(frac => (
                      <div key={frac} className="absolute" style={{ left: 0, width: YAXIS_W, bottom: XLABEL_H + Math.round(frac * CHART_H) - 5, fontSize: '8px', color: '#9BA8B5', textAlign: 'right', lineHeight: 1 }}>
                        {frac === 0 ? `${moneyPrefix}0` : `${moneyPrefix}${Math.round((yMax * frac) / 1000)}k`}
                      </div>
                    ))}

                    {/* Chart inner */}
                    <div className="absolute top-0 bottom-0" style={{ left: YAXIS_W + 4, right: 0 }}>

                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map(frac => (
                        <div key={frac} className="absolute left-0 right-0" style={{ bottom: XLABEL_H + Math.round(frac * CHART_H), borderTop: frac === 0 ? '1px solid rgba(15,41,66,0.12)' : '1px dashed rgba(15,41,66,0.08)' }} />
                      ))}

                      {/* Bars */}
                      <div className="absolute left-0 right-0 flex gap-1" style={{ bottom: XLABEL_H, height: CHART_H }}>
                        {results.horizonBars.map(bar => {
                          const isSel  = bar.years === horizYrs;
                          const rentH  = yMax > 0 ? Math.round((bar.rentCost / yMax) * CHART_H) : 0;
                          const buyH   = yMax > 0 ? Math.max(0, Math.round((Math.max(0, bar.buyCost) / yMax) * CHART_H)) : 0;
                          const tallerH = Math.max(rentH, buyH);
                          const savingsAmt = bar.rentCost - bar.buyCost; // positive = buy cheaper
                          return (
                            <div key={bar.years} className="flex-1 flex justify-center items-end">
                              <div style={{ position: 'relative', width: '86%', minWidth: 14 }}>
                                {/* Two sub-bars */}
                                <div className="flex items-end" style={{ gap: 2 }}>
                                  <div style={{ flex: 1, height: rentH, background: isSel ? '#1DB584' : 'rgba(29,181,132,0.30)', borderRadius: '3px 3px 0 0' }} />
                                  <div style={{ flex: 1, height: buyH, background: isSel ? '#334155' : 'rgba(51,65,85,0.22)', borderRadius: '3px 3px 0 0' }} />
                                </div>

                                {/* Selected outline */}
                                {isSel && (
                                  <>
                                    <div style={{ position: 'absolute', top: -7, left: -7, right: -7, bottom: 0, borderTop: '2px solid #1DB584', borderLeft: '2px solid #1DB584', borderRight: '2px solid #1DB584', borderRadius: '11px 11px 0 0', boxShadow: '0 0 14px rgba(29,181,132,0.20)', pointerEvents: 'none' }} />
                                    <div style={{ position: 'absolute', bottom: tallerH + 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                                      <div className="relative rounded-xl px-2.5 py-2 text-center" style={{ background: '#fff', boxShadow: '0 3px 14px rgba(0,0,0,0.12)', border: '1.5px solid rgba(29,181,132,0.30)', minWidth: 72, whiteSpace: 'nowrap' }}>
                                        <p style={{ fontSize: '9px', fontWeight: 700, color: '#6B7A8D', marginBottom: 2 }}>{bar.years}yr</p>
                                        <p style={{ fontSize: '13px', fontWeight: 800, color: savingsAmt >= 0 ? '#1DB584' : '#0EA5E9', lineHeight: 1 }}>
                                          {savingsAmt >= 0 ? 'Buy saves' : 'Rent saves'}
                                        </p>
                                        <p style={{ fontSize: '11px', fontWeight: 700, color: savingsAmt >= 0 ? '#1DB584' : '#0EA5E9', lineHeight: 1.1 }}>
                                          {compact(Math.abs(savingsAmt))}
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
                      <div className="absolute left-0 right-0 bottom-0 flex gap-1" style={{ height: XLABEL_H }}>
                        {results.horizonBars.map(bar => {
                          const isSel = bar.years === horizYrs;
                          return (
                            <div key={bar.years} className="flex-1 flex items-center justify-center">
                              {isSel ? (
                                <span className="rounded-full" style={{ background: '#1DB584', color: '#fff', fontSize: '9px', fontWeight: 700, lineHeight: 1, display: 'inline-block', padding: '4px 10px' }}>
                                  {bar.years} yr
                                </span>
                              ) : (
                                <span style={{ fontSize: '9px', color: '#9BA8B5' }}>{bar.years} yr</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  </div>

                  <p className="text-[10px] mt-3" style={{ color: '#9BA8B5' }}>
                    Buy net cost = total cash paid minus estimated equity. Select a horizon with the pills above.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Right: Break-even Timeline — line chart */}
          {(() => {
            const horizYrs = results.horizonYears;
            const lineData = [
              { year: 0, cumRent: 0, cumBuy: results.initialBuyCost },
              ...results.yearlyData.slice(0, horizYrs).map(d => ({ year: d.year, cumRent: d.cumRent, cumBuy: d.cumBuy })),
            ];

            const CW = 500, CH = 160, PAD_T = 20, PAD_L = 8, PAD_R = 8, PAD_B = 28;
            const plotW = CW - PAD_L - PAD_R;
            const plotH = CH - PAD_T - PAD_B;

            const maxVal = Math.max(
              ...lineData.map(d => d.cumRent),
              ...lineData.map(d => Math.max(0, d.cumBuy)),
              1,
            ) * 1.12;

            const xOf = (y: number) => PAD_L + (y / horizYrs) * plotW;
            const yOf = (v: number) => PAD_T + plotH * (1 - Math.min(1, Math.max(0, v) / maxVal));

            const rentPts  = lineData.map(d => `${xOf(d.year).toFixed(1)},${yOf(d.cumRent).toFixed(1)}`).join(' ');
            const buyPts   = lineData.map(d => `${xOf(d.year).toFixed(1)},${yOf(Math.max(0, d.cumBuy)).toFixed(1)}`).join(' ');

            const beY      = results.breakEvenYear;
            const beInView = beY !== null && beY <= horizYrs;
            const beCX     = beY !== null ? xOf(beY) : null;

            function fmtKLine(n: number): string {
              if (Math.abs(n) >= 1_000_000) return moneyPrefix + (n / 1_000_000).toFixed(1) + 'M';
              if (Math.abs(n) >= 1000) return moneyPrefix + Math.round(n / 1000) + 'k';
              return moneyPrefix + Math.round(n);
            }

            const yAxisMax = maxVal;
            const yAxisMid = maxVal / 2;

            return (
              <div style={cardStyle}>
                <div className="p-5 md:p-6 h-full flex flex-col">
                  <div className="mb-4 md:mb-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                      Timeline
                    </p>
                    <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Break-even Timeline</h3>
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-0.5 rounded-full" style={{ background: '#1DB584' }} />
                      <span style={{ fontSize: '10px', color: '#6B7A8D' }}>Cumulative rent</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-0.5 rounded-full" style={{ background: '#334155' }} />
                      <span style={{ fontSize: '10px', color: '#6B7A8D' }}>Buy net cost</span>
                    </div>
                  </div>

                  {/* SVG Chart */}
                  <div style={{ position: 'relative' }}>
                    <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden>

                      {/* Y-axis labels */}
                      {[0, 0.5, 1].map(frac => {
                        const val = frac === 0 ? 0 : frac === 0.5 ? yAxisMid : yAxisMax;
                        const y   = yOf(val);
                        return (
                          <text key={frac} x={PAD_L} y={(y + 4).toFixed(1)} textAnchor="start" fill="#9BA8B5" fontSize="8">
                            {fmtKLine(val)}
                          </text>
                        );
                      })}

                      {/* Grid lines */}
                      {[0, 0.5, 1].map(frac => {
                        const val = frac === 0 ? 0 : frac === 0.5 ? yAxisMid : yAxisMax;
                        const y   = yOf(val);
                        return (
                          <line key={frac} x1={PAD_L + 28} y1={y.toFixed(1)} x2={(CW - PAD_R).toFixed(1)} y2={y.toFixed(1)}
                            stroke={frac === 0 ? 'rgba(15,41,66,0.15)' : 'rgba(15,41,66,0.07)'}
                            strokeDasharray={frac === 0 ? undefined : '4 3'}
                            strokeWidth="1" />
                        );
                      })}

                      {/* Break-even vertical line */}
                      {beInView && beCX !== null && (
                        <>
                          <line x1={beCX.toFixed(1)} y1={PAD_T.toFixed(1)} x2={beCX.toFixed(1)} y2={(PAD_T + plotH).toFixed(1)}
                            stroke="#1DB584" strokeWidth="1.5" strokeDasharray="4 3" />
                          <rect x={(beCX - 24).toFixed(1)} y={(PAD_T - 14).toFixed(1)} width="48" height="14" rx="4" fill="#1DB584" />
                          <text x={beCX.toFixed(1)} y={(PAD_T - 3).toFixed(1)} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">
                            Yr {beY}
                          </text>
                        </>
                      )}

                      {/* Rent line */}
                      <polyline points={rentPts} fill="none" stroke="#1DB584" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

                      {/* Buy net cost line */}
                      <polyline points={buyPts} fill="none" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

                      {/* X-axis labels */}
                      {[0, horizYrs].map(y => (
                        <text key={y} x={xOf(y).toFixed(1)} y={(CH - 2).toFixed(1)}
                          textAnchor={y === 0 ? 'start' : 'end'}
                          fill="#9BA8B5" fontSize="9">
                          Yr {y}
                        </text>
                      ))}

                    </svg>
                  </div>

                  {/* Break-even callout */}
                  {beInView ? (
                    <div className="mt-3 rounded-xl px-3 py-2" style={{ background: 'rgba(29,181,132,0.08)', border: '1px solid rgba(29,181,132,0.20)' }}>
                      <p className="text-xs font-semibold" style={{ color: '#1DB584' }}>
                        Break-even at Year {beY} — based on these assumptions, buying becomes lower net-cost at this point.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl px-3 py-2" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.20)' }}>
                      <p className="text-xs font-semibold" style={{ color: '#C9A84C' }}>
                        Break-even not reached within {horizYrs} years at current assumptions.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        </div>
      )}{/* end Block B */}

      {/* ── Block C: AI Rent vs Buy Analysis ─────────────────────────────────── */}
      {results && vc && (
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
                FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Rent vs Buy Analysis
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

            {/* Row 1: Decision card + Smart lever */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

              {/* LEFT — Decision result */}
              <div className="rounded-2xl p-4 md:p-5 flex flex-col gap-3"
                style={{ background: '#ffffff', border: `1px solid ${vc.border}`, borderLeft: `4px solid ${vc.color}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>

                <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: vc.color }}>
                  Decision Result
                </p>

                <div className="flex items-center gap-3">
                  <div style={{ width: 84, height: 84, borderRadius: 22, background: vc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 62, height: 62, borderRadius: '50%', background: vc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${vc.color}55` }}>
                      {results.decision === 'buy'  && <Home        size={28} color="#fff" strokeWidth={2.2} />}
                      {results.decision === 'rent' && <Building2   size={28} color="#fff" strokeWidth={2.2} />}
                      {results.decision === 'close' && <Scale      size={28} color="#fff" strokeWidth={2.2} />}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 800, color: vc.color, lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                      {results.decision === 'buy'  ? 'Buying Wins'   : results.decision === 'rent' ? 'Renting Wins' : 'Close Call'}
                    </p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: '#6B7A8D' }}>{vc.sublabel}</p>
                  </div>
                </div>

                {/* Chips */}
                <div className="flex gap-2 flex-wrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: vc.bg, color: vc.color }}>
                    {fmt(Math.abs(results.netDifference))} difference
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: '#F1F4F7', color: '#6B7A8D' }}>
                    {results.breakEvenYear ? `Break-even Yr ${results.breakEvenYear}` : `No break-even <${results.horizonYears}yr`}
                  </span>
                </div>

                {/* Supporting text */}
                <div style={{ borderTop: '1px solid #F1F4F7', paddingTop: 10 }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                    {results.decision === 'buy'  && 'Based on these inputs, buying appears lower net-cost.'}
                    {results.decision === 'rent' && 'Based on these inputs, renting appears lower net-cost.'}
                    {results.decision === 'close' && 'The costs are close — assumptions drive the outcome.'}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#6B7A8D' }}>
                    {results.decision === 'buy' &&
                      `Over ${results.horizonYears} years, estimated net buy cost of ${fmt(results.totalBuyCost)} compares favourably to total rent of ${fmt(results.totalRentCost)}, accounting for ${fmt(results.equity)} in estimated equity. Results are sensitive to appreciation, rent growth, and ownership costs.`}
                    {results.decision === 'rent' &&
                      `Over ${results.horizonYears} years, estimated rent cost of ${fmt(results.totalRentCost)} is lower than net buy cost of ${fmt(results.totalBuyCost)} under these assumptions. A longer horizon, higher rent growth, or stronger appreciation could shift this result.`}
                    {results.decision === 'close' &&
                      `The estimated ${results.horizonYears}-year costs are within 10% of each other. Small changes in appreciation, rent growth, or interest rate significantly alter which option appears lower-cost.`}
                  </p>
                </div>
              </div>

              {/* RIGHT — Smart lever */}
              {(() => {
                const d = results.topDriver;
                const driverConfig = {
                  appreciation: {
                    title: 'Home Appreciation Is Key',
                    bigNum: parseN(form.homeGrowthPct).toFixed(1) + '%/yr',
                    bigLabel: 'assumed annual appreciation',
                    detail: `At ${form.homeGrowthPct}% annual appreciation, estimated equity reaches ${fmt(results.equity)} over ${results.horizonYears} years. Appreciation is the dominant lever on net ownership cost in this scenario.`,
                  },
                  rentGrowth: {
                    title: 'Rent Growth Favours Buying',
                    bigNum: parseN(form.rentIncrease).toFixed(1) + '%/yr',
                    bigLabel: 'assumed annual rent increase',
                    detail: `Rent growing at ${form.rentIncrease}% per year makes renting progressively more expensive.${results.breakEvenYear ? ` This contributes to the break-even at Year ${results.breakEvenYear}.` : ' At the current appreciation and interest rate, rent growth alone does not close the gap within this horizon.'}`,
                  },
                  interestRate: {
                    title: 'Interest Rate Is the Constraint',
                    bigNum: parseN(form.annualRate).toFixed(2) + '%',
                    bigLabel: 'mortgage rate',
                    detail: `At ${form.annualRate}%, monthly ownership cost is ${fmtx(results.monthlyOwnership)} versus current rent of ${fmtx(parseN(form.monthlyRent))}. A meaningfully lower rate would reduce the cost gap and could pull the break-even forward.`,
                  },
                  ownershipCost: {
                    title: 'Ongoing Costs Are the Constraint',
                    bigNum: fmtx(results.monthlyOwnership),
                    bigLabel: 'estimated monthly ownership cost',
                    detail: `Property tax, insurance, maintenance, and HOA add ${fmtx(results.monthlyOwnership - results.monthlyPI)}/mo beyond mortgage principal & interest. These costs are significant relative to the rent level under these assumptions.`,
                  },
                }[d];
                return (
                  <div className="rounded-2xl p-4 md:p-5 flex flex-col gap-3"
                    style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>

                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                      <span className="text-sm font-bold" style={{ color: '#1DB584' }}>Top Driver in This Scenario</span>
                    </div>

                    <div className="rounded-xl px-4 py-4" style={{ background: 'rgba(29,181,132,0.10)', border: '1px solid rgba(29,181,132,0.22)' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(29,181,132,0.7)', marginBottom: 6 }}>
                        {driverConfig.title}
                      </p>
                      <p className="font-extrabold tabular-nums" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                        {driverConfig.bigNum}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginTop: 6 }}>
                        {driverConfig.bigLabel}
                      </p>
                    </div>

                    <div className="rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{driverConfig.detail}</p>
                    </div>

                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      Estimate based on entered inputs. Actual results depend on market conditions.
                    </p>
                  </div>
                );
              })()}

            </div>{/* end Row 1 */}

            {/* Row 2: Three insight cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

              {/* Monthly Cost Check */}
              {(() => {
                const gap = results.monthlyOwnership - parseN(form.monthlyRent);
                const isOverRent = gap > 0;
                return (
                  <div className="rounded-xl p-4" style={{ background: isOverRent ? '#FFFBEB' : '#ECFDF5', border: `1px solid ${isOverRent ? '#FDE68A' : '#A7F3D0'}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.7)', border: `1px solid ${isOverRent ? '#FDE68A' : '#A7F3D0'}` }}>
                        <DollarSign className="w-3.5 h-3.5" style={{ color: isOverRent ? '#D97706' : '#059669' }} aria-hidden />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: isOverRent ? '#D97706' : '#059669' }}>Monthly Cost Check</p>
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                      {isOverRent
                        ? `Owning costs ${fmtx(gap)}/mo more initially`
                        : `Owning costs ${fmtx(Math.abs(gap))}/mo less initially`}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                      Monthly ownership of {fmtx(results.monthlyOwnership)} vs. rent of {fmtx(parseN(form.monthlyRent))}. The gap {isOverRent ? 'shrinks as rent increases' : 'may grow over time as rent rises'}.
                    </p>
                  </div>
                );
              })()}

              {/* Break-even Timeline */}
              <div className="rounded-xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center shrink-0"
                    style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                    <TrendingUp className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Break-even Timeline</p>
                </div>
                {results.breakEvenYear ? (
                  <>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                      Break-even at Year {results.breakEvenYear}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                      Based on these assumptions, buying becomes lower net-cost after approximately {results.breakEvenYear} year{results.breakEvenYear !== 1 ? 's' : ''}. Plans to sell or move before then shift the analysis toward renting.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                      No break-even within {results.horizonYears} years
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                      Renting remains lower net-cost across the full {results.horizonYears}-year horizon at these inputs. Increasing home value growth, reducing ownership costs, or a lower interest rate could change this.
                    </p>
                  </>
                )}
              </div>

              {/* Equity vs Flexibility */}
              <div className="rounded-xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center shrink-0"
                    style={{ width: 28, height: 28, borderRadius: 8, background: '#FEF3C7' }}>
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" aria-hidden />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Equity vs Flexibility</p>
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                  {fmt(results.equity)} estimated equity built
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                  Buying builds an estimated {fmt(results.equity)} in equity over {results.horizonYears} years. The {fmtx(results.downPaymentAmt)} down payment invested at {form.investReturnPct}% would grow by approximately {fmt(results.opportunityCost)} over the same period — not included in the cost comparison above.
                </p>
              </div>

            </div>{/* end Row 2 */}

            {/* Row 3: Stats grid */}
            <style>{`
              .rvb-stat-grid > div { border-right: 1px solid #F1F4F7; border-bottom: 1px solid #F1F4F7; }
              .rvb-stat-grid > div:nth-child(even) { border-right: none; }
              .rvb-stat-grid > div:nth-child(n+3) { border-bottom: none; }
              @media (min-width: 768px) {
                .rvb-stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
                .rvb-stat-grid > div { border-bottom: none; border-right: 1px solid #F1F4F7; }
                .rvb-stat-grid > div:last-child { border-right: none; }
              }
            `}</style>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div style={{ background: '#F8FAFB', borderBottom: '1px solid rgba(15,41,66,0.09)', padding: '9px 16px' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9BA8B5', letterSpacing: '0.12em' }}>
                  {results.horizonYears}-Year Summary
                </p>
              </div>
              <div className="rvb-stat-grid grid grid-cols-2">
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>Total Rent Cost</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#0EA5E9', letterSpacing: '-0.5px' }}>{fmt(results.totalRentCost)}</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>Total Buy Net Cost</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#1DB584', letterSpacing: '-0.5px' }}>{fmt(results.totalBuyCost)}</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>Equity Built</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#1DB584', letterSpacing: '-0.5px' }}>{fmt(results.equity)}</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>Break-even Year</p>
                  <p style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.5px', color: results.breakEvenYear ? '#1DB584' : '#C9A84C' }}>
                    {results.breakEvenYear ? `Year ${results.breakEvenYear}` : `> ${results.horizonYears} yrs`}
                  </p>
                </div>
              </div>
            </div>

          </div>{/* end body */}

          {/* Footer disclaimer */}
          <div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
            style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
            <p className="text-slate-400 text-xs leading-relaxed">
              <strong className="text-slate-500 font-semibold">Estimates only.</strong> Results depend on home appreciation, rent growth, interest rates, and ownership costs — all uncertain. Not included: mortgage insurance (CMHC/PMI), capital gains tax, realtor commissions, property transfer tax, or province/state closing-cost precision. Does not constitute financial, mortgage, real estate, tax, or legal advice.
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
