'use client';

import { useState, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import {
  monthlyRateCA, calcPayment, getCmhcRate, buildSchedule, parseN,
  fmtCAD, fmtCADx, freqPayment, freqLabel,
  type Frequency, type ScheduleRow, type ScenarioData,
} from '../_mortgage-shared/math';
import {
  NumericInput, Tooltip, DonutChart,
  Disclaimer, type PieSlice,
} from '../_mortgage-shared/ui';
import {
  InsightPanel,
  type RateShockData, type RoundUpData, type InsuranceThresholdData, type RatioData,
} from '../_mortgage-shared/InsightPanel';
import { FormLabel, inputCls, type Faq } from '@/components/layout/CalculatorLayout';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  homePrice: string;
  downPayment: string;
  downPaymentMode: 'amount' | 'percent';
  interestRate: string;
  amortization: string;
  frequency: Frequency;
  extraPayment: string;
  propertyTax: string;
  homeInsurance: string;
  condoFee: string;
  grossIncome: string;
  otherDebts: string;
}

interface Results {
  loanAmount: number;
  downPaymentAmount: number;
  downPct: number;
  baseMonthlyPI: number;
  displayPayment: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyCondoFee: number;
  totalMonthly: number;
  totalInterest: number;
  totalPayment: number;
  cmhcAmount: number;
  schedule: ScheduleRow[];
  scenario15: ScenarioData;
  scenario25: ScenarioData;
  scenario30: ScenarioData;
  rateShock: RateShockData;
  roundUp: RoundUpData;
  insuranceThreshold: InsuranceThresholdData | null;
  primaryRatio?: RatioData;
  secondaryRatio?: RatioData;
}

// ─── Tooltips ─────────────────────────────────────────────────────────────────

const TOOLTIPS = {
  homePrice: 'The total purchase price of the property. Homes over $1M require a minimum 20% down payment and are ineligible for CMHC insurance.',
  downPayment: 'Minimum 5% for homes under $500K. For $500K–$999,999: 5% on first $500K + 10% on remainder. 20%+ avoids CMHC insurance entirely.',
  interestRate: "Your lender's quoted annual rate. Canadian mortgages compound semi-annually by law (the Interest Act), not monthly — this calculator applies the correct conversion.",
  amortization: 'Maximum 25 years for CMHC-insured mortgages (under 20% down). Up to 30 years for uninsured mortgages (20%+ down) as of 2024 rule changes.',
  frequency: "Accelerated bi-weekly = monthly payment ÷ 2, paid 26 times/year. This squeezes in the equivalent of one extra monthly payment per year, saving years of interest.",
  extraPayment: 'Most lenders allow 10–20% of the original mortgage as penalty-free prepayments annually. Extra monthly payments apply directly to principal.',
  propertyTax: 'Annual property tax varies by municipality. Toronto ≈ 0.63%, Vancouver ≈ 0.28%, Calgary ≈ 0.77%, Ottawa ≈ 1.07% of assessed value.',
  homeInsurance: "Required by all Canadian lenders. Typical annual premiums: $800–$2,500 for a detached home. Condo owners also need a separate unit owner policy.",
  condoFee: 'Monthly condo or strata fees cover maintenance, building insurance, and shared amenities. Typically $300–$800/month in major cities.',
  grossIncome: 'Combined annual gross income of all applicants before tax. Used to calculate your GDS and TDS debt service ratios — the primary affordability metrics Canadian lenders use.',
  otherDebts: 'Sum of all monthly debt obligations: car loans, student loans, minimum credit card payments, personal loans, and any spousal/child support. Used for your TDS ratio.',
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border: '1.5px solid #E4E9EF',
  borderRadius: '16px',
  background: '#ffffff',
};

const sectionHeading = 'text-base font-bold';
const sectionHeadingColor = '#0D1B2A';

const inputClsCompact = inputCls.replace('py-2.5', 'py-2');
const navyLabelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: '#0D1B2A', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 };

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  homePrice: '650000',
  downPayment: '130000',
  downPaymentMode: 'amount',
  interestRate: '5.25',
  amortization: '25',
  frequency: 'monthly',
  extraPayment: '0',
  propertyTax: '4800',
  homeInsurance: '1400',
  condoFee: '0',
  grossIncome: '',
  otherDebts: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CanadaMortgageCalculator({
  formulaContent,
  faqItems = [],
}: {
  formulaContent?: ReactNode;
  faqItems?: Faq[];
}) {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAffordability, setShowAffordability] = useState(false);
  const [breakdownView, setBreakdownView] = useState<'monthly' | 'yearly'>('monthly');

  function set(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  const results = useMemo<Results | null>(() => {
    const homePrice = parseN(form.homePrice);
    const dpAmt = form.downPaymentMode === 'amount'
      ? parseN(form.downPayment)
      : homePrice * (parseN(form.downPayment) / 100);
    const rate = parseN(form.interestRate);
    const years = parseInt(form.amortization) || 25;
    const months = years * 12;
    const extra = parseN(form.extraPayment);

    if (homePrice <= 0 || dpAmt < 0 || rate <= 0 || dpAmt >= homePrice) return null;

    const downPct = (dpAmt / homePrice) * 100;
    let loanAmount = homePrice - dpAmt;
    let cmhcAmount = 0;

    if (downPct < 20) {
      cmhcAmount = loanAmount * getCmhcRate(downPct);
      loanAmount += cmhcAmount;
    }

    const mRate = monthlyRateCA(rate);
    const baseMonthlyPI = calcPayment(loanAmount, mRate, months);
    const displayPayment = freqPayment(baseMonthlyPI, form.frequency);
    const monthlyTax = parseN(form.propertyTax) / 12;
    const monthlyInsurance = parseN(form.homeInsurance) / 12;
    const monthlyCondoFee = parseN(form.condoFee);
    const totalMonthly = baseMonthlyPI + monthlyTax + monthlyInsurance + monthlyCondoFee;

    const schedule = buildSchedule(loanAmount, mRate, months, extra);
    const totalInterest = schedule.reduce((s, r) => s + r.interestPaid, 0);

    const shockedMRate = monthlyRateCA(rate + 2);
    const shockedPayment = calcPayment(loanAmount, shockedMRate, months);
    const rateShock: RateShockData = {
      currentPayment: baseMonthlyPI,
      shockedPayment,
      difference: shockedPayment - baseMonthlyPI,
      newRate: rate + 2,
    };

    const nextHundred = Math.ceil((baseMonthlyPI + 1) / 100) * 100;
    const roundExtra = nextHundred - baseMonthlyPI;
    const roundSchedule = buildSchedule(loanAmount, mRate, months, extra + roundExtra);
    const roundInterestTotal = roundSchedule.reduce((s, r) => s + r.interestPaid, 0);
    const roundUp: RoundUpData = {
      extra: roundExtra,
      roundedPayment: nextHundred,
      yearsSaved: schedule.length - roundSchedule.length,
      interestSaved: totalInterest - roundInterestTotal,
    };

    let insuranceThreshold: InsuranceThresholdData | null = null;
    if (downPct >= 18 && downPct < 20) {
      const amountNeeded = homePrice * 0.2 - dpAmt;
      const loanWithoutCmhc = homePrice - dpAmt;
      const paymentWithoutCmhc = calcPayment(loanWithoutCmhc, mRate, months);
      const annualSavings = (baseMonthlyPI - paymentWithoutCmhc) * 12;
      const instantReturn = amountNeeded > 0 ? (annualSavings / amountNeeded) * 100 : 0;
      insuranceThreshold = { type: 'CMHC', amountNeeded, annualSavings, instantReturn, currentDownPct: downPct };
    }

    const grossIncome = parseN(form.grossIncome);
    const otherDebts = parseN(form.otherDebts);
    let primaryRatio: RatioData | undefined;
    let secondaryRatio: RatioData | undefined;
    if (grossIncome > 0) {
      const monthlyIncome = grossIncome / 12;
      const HEAT_EST = 150;
      const gdsNum = baseMonthlyPI + monthlyTax + HEAT_EST + monthlyCondoFee * 0.5;
      const gds = (gdsNum / monthlyIncome) * 100;
      const tds = ((gdsNum + otherDebts) / monthlyIncome) * 100;
      primaryRatio = { ratio: gds, limit: 32, label: 'GDS', sublabel: 'Gross Debt Service' };
      secondaryRatio = { ratio: tds, limit: 44, label: 'TDS', sublabel: 'Total Debt Service' };
    }

    const m15 = calcPayment(loanAmount, mRate, 180);
    const m25 = calcPayment(loanAmount, mRate, 300);
    const m30 = calcPayment(loanAmount, mRate, 360);

    return {
      loanAmount, downPaymentAmount: dpAmt, downPct,
      baseMonthlyPI, displayPayment,
      monthlyTax, monthlyInsurance, monthlyCondoFee,
      totalMonthly, totalInterest,
      totalPayment: loanAmount + totalInterest,
      cmhcAmount, schedule,
      scenario15: { years: 15, monthlyPayment: m15, totalInterest: m15 * 180 - loanAmount },
      scenario25: { years: 25, monthlyPayment: m25, totalInterest: m25 * 300 - loanAmount },
      scenario30: { years: 30, monthlyPayment: m30, totalInterest: m30 * 360 - loanAmount },
      rateShock, roundUp, insuranceThreshold, primaryRatio, secondaryRatio,
    };
  }, [form]);

  const pieSlices: PieSlice[] = results ? [
    { label: 'Principal & Interest', value: results.baseMonthlyPI, color: '#1DB584', alwaysShow: true },
    { label: 'Property Tax',         value: results.monthlyTax,       color: '#f59e0b' },
    { label: 'Home Insurance',       value: results.monthlyInsurance, color: '#8b5cf6' },
    { label: 'Condo Fee',            value: results.monthlyCondoFee,  color: '#0ea5e9' },
  ] : [];

  function getInsight(): string {
    if (!results) return '';
    const { totalInterest, loanAmount, downPct } = results;
    const ratio = (totalInterest / loanAmount) * 100;
    const rateNum = parseN(form.interestRate);
    if (rateNum > 5.5) {
      return `At ${form.interestRate}%, total interest of ${fmtCAD(totalInterest)} represents ${ratio.toFixed(0)}% of your loan principal — above the 50% threshold. The Bank of Canada rate cycle and your renewal date are key variables to monitor for refinancing opportunity.`;
    }
    return `Your ${form.interestRate}% rate ${downPct >= 20 ? 'avoids CMHC insurance' : 'triggers CMHC insurance'}. Total interest of ${fmtCAD(totalInterest)} represents ${ratio.toFixed(0)}% of loan principal across your ${form.amortization}-year amortization. The expert insights below identify your highest-leverage optimization opportunities.`;
  }

  const scenarioPairs = results
    ? [results.scenario15, results.scenario25, results.scenario30]
    : [];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    // ── Parent Page Grid: 12-col, main=9, sidebar=3 ──────────────────────────
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

      {/* ══ MAIN CONTENT: col-span-9 ════════════════════════════════════════ */}
      <div className="lg:col-span-9 flex flex-col gap-4">

        {/* ── Block A: Top Row — Input Card (7) + Dark Navy Results Card (5) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Input Card — col-span-7 */}
          <div className="lg:col-span-7" style={cardStyle}>
            <div className="p-3 md:p-5">

              {/* Card Header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div style={{ width: 30, height: 30, borderRadius: 7, background: '#1DB584', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <p className={sectionHeading} style={{ color: sectionHeadingColor }}>Mortgage Details</p>
              </div>

              {/* Internal 2-column grid — always 2 cols for mobile density */}
              <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

                {/* ── LEFT COLUMN: Basic Inputs ─────────────────────────── */}
                <div className="space-y-2.5">

                  <div>
                    <label style={navyLabelStyle}>Home Price <Tooltip text={TOOLTIPS.homePrice} /></label>
                    <NumericInput value={form.homePrice} onChange={(v) => set('homePrice', v)} prefix="$" inputClassName={inputClsCompact} />
                  </div>

                  <div>
                    <label style={navyLabelStyle}>Down Payment <Tooltip text={TOOLTIPS.downPayment} /></label>
                    <div className="flex gap-2">
                      <NumericInput
                        value={form.downPayment}
                        onChange={(v) => set('downPayment', v)}
                        prefix={form.downPaymentMode === 'amount' ? '$' : undefined}
                        suffix={form.downPaymentMode === 'percent' ? '%' : undefined}
                        inputClassName={`${inputClsCompact} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const hp = parseN(form.homePrice);
                          const cur = parseN(form.downPayment);
                          if (form.downPaymentMode === 'amount') {
                            const pct = hp > 0 ? +((cur / hp) * 100).toFixed(2) : 0;
                            setForm((p) => ({ ...p, downPaymentMode: 'percent', downPayment: String(pct) }));
                          } else {
                            const amt = Math.round((cur / 100) * hp);
                            setForm((p) => ({ ...p, downPaymentMode: 'amount', downPayment: String(amt) }));
                          }
                        }}
                        className="shrink-0 px-2.5 rounded-brand-sm text-xs font-semibold transition-colors duration-150 hover:bg-brand-gray-100"
                        style={{ border: '1.5px solid #E4E9EF', color: '#6B7A8D', background: '#F8FAFB' }}
                      >
                        {form.downPaymentMode === 'amount' ? '→ %' : '→ $'}
                      </button>
                    </div>
                    {results && (
                      <p className="mt-0.5 text-xs" style={{ color: '#9BA8B5' }}>
                        {form.downPaymentMode === 'amount'
                          ? `${results.downPct.toFixed(1)}% of purchase price`
                          : fmtCAD(results.downPaymentAmount)}
                        {results.downPct < 20 && (
                          <span className="ml-2 font-medium" style={{ color: '#C9A84C' }}>· CMHC required</span>
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={navyLabelStyle}>Annual Interest Rate <Tooltip text={TOOLTIPS.interestRate} /></label>
                    <NumericInput value={form.interestRate} onChange={(v) => set('interestRate', v)} suffix="%" inputClassName={inputClsCompact} />
                  </div>

                  <div>
                    <label style={navyLabelStyle}>Amortization Period <Tooltip text={TOOLTIPS.amortization} /></label>
                    <select value={form.amortization} onChange={(e) => set('amortization', e.target.value)} className={inputClsCompact}>
                      {[5, 10, 15, 20, 25, 30].map((y) => (
                        <option key={y} value={String(y)}>{y} years{y === 25 ? ' (standard)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={navyLabelStyle}>Payment Frequency <Tooltip text={TOOLTIPS.frequency} /></label>
                    <select value={form.frequency} onChange={(e) => set('frequency', e.target.value as Frequency)} className={inputClsCompact}>
                      <option value="monthly">Monthly (12×/year)</option>
                      <option value="biweekly">Bi-Weekly (26×/year)</option>
                      <option value="accelerated-biweekly">Accelerated Bi-Weekly ⚡</option>
                    </select>
                  </div>

                </div>{/* end left column */}

                {/* ── RIGHT COLUMN: Advanced costs + Affordability checkbox ─ */}
                <div className="border-l pl-2 md:pl-5 space-y-2.5" style={{ borderColor: '#E4E9EF' }}>

                  <div>
                    <label style={navyLabelStyle}>Extra Monthly Payment <Tooltip text={TOOLTIPS.extraPayment} /></label>
                    <NumericInput value={form.extraPayment} onChange={(v) => set('extraPayment', v)} prefix="$" inputClassName={inputClsCompact} />
                  </div>

                  <div>
                    <label style={navyLabelStyle}>Annual Property Tax <Tooltip text={TOOLTIPS.propertyTax} /></label>
                    <NumericInput value={form.propertyTax} onChange={(v) => set('propertyTax', v)} prefix="$" inputClassName={inputClsCompact} />
                  </div>

                  <div>
                    <label style={navyLabelStyle}>Annual Home Insurance <Tooltip text={TOOLTIPS.homeInsurance} /></label>
                    <NumericInput value={form.homeInsurance} onChange={(v) => set('homeInsurance', v)} prefix="$" inputClassName={inputClsCompact} />
                  </div>

                  <div>
                    <label style={navyLabelStyle}>Monthly Condo / HOA Fee <Tooltip text={TOOLTIPS.condoFee} /></label>
                    <NumericInput value={form.condoFee} onChange={(v) => set('condoFee', v)} prefix="$" inputClassName={inputClsCompact} />
                  </div>

                  {/* Affordability Analysis — moved to bottom of right column */}
                  <div className="pt-2.5" style={{ borderTop: '1px solid #E4E9EF' }}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAffordability}
                        onChange={(e) => setShowAffordability(e.target.checked)}
                        className="rounded shrink-0"
                        style={{ accentColor: '#1DB584', width: 14, height: 14 }}
                      />
                      <span className="text-xs font-semibold" style={{ color: '#1DB584' }}>
                        Affordability Analysis <span style={{ fontWeight: 400, color: '#9BA8B5' }}>(optional)</span>
                      </span>
                    </label>
                    {showAffordability && (
                      <div className="mt-2.5 space-y-2.5">
                        <div>
                          <label style={navyLabelStyle}>Gross Annual Household Income <Tooltip text={TOOLTIPS.grossIncome} /></label>
                          <NumericInput value={form.grossIncome} onChange={(v) => set('grossIncome', v)} prefix="$" inputClassName={inputClsCompact} placeholder="e.g. 120,000" />
                        </div>
                        <div>
                          <label style={navyLabelStyle}>Other Monthly Debts <Tooltip text={TOOLTIPS.otherDebts} /></label>
                          <NumericInput value={form.otherDebts} onChange={(v) => set('otherDebts', v)} prefix="$" inputClassName={inputClsCompact} placeholder="e.g. 500" />
                        </div>
                      </div>
                    )}
                  </div>

                </div>{/* end right column */}

              </div>{/* end internal 2-col grid */}

            </div>
          </div>{/* end Input Card */}

          {/* Dark Navy Results Card — col-span-5 */}
          <div className="lg:col-span-5">
            <div
              className="flex flex-col h-full p-3 md:p-5 rounded-[16px]"
              style={{
                background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 55%, #0D1B2A 100%)',
                border: '1px solid rgba(29,181,132,0.15)',
                minHeight: 340,
              }}
            >
              {results ? (
                <div className="flex flex-col flex-1 gap-4">

                  {/* Glassy box: ONLY the big number */}
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                      Estimated {freqLabel(form.frequency)} payment
                    </p>
                    <p style={{ color: '#1DB584', fontSize: '40px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 6 }}>
                      {fmtCADx(freqPayment(results.totalMonthly, form.frequency))}
                    </p>
                    {results.cmhcAmount > 0 && (
                      <p style={{ color: '#C9A84C', fontSize: '12px', fontWeight: 500, marginTop: 4 }}>
                        + {fmtCAD(results.cmhcAmount)} CMHC added to balance
                      </p>
                    )}
                  </div>

                  {/* Monthly payment breakdown — no box, dot indicators matching chart colors */}
                  <div className="space-y-2 px-1">
                    {[
                      { label: 'Principal & Interest', value: freqPayment(results.baseMonthlyPI, form.frequency),   dot: '#1DB584' },
                      ...(results.monthlyTax > 0        ? [{ label: 'Property Tax',    value: freqPayment(results.monthlyTax, form.frequency),       dot: '#f59e0b' }] : []),
                      ...(results.monthlyInsurance > 0  ? [{ label: 'Home Insurance',  value: freqPayment(results.monthlyInsurance, form.frequency),  dot: '#8b5cf6' }] : []),
                      ...(results.monthlyCondoFee > 0   ? [{ label: 'Condo / HOA Fee', value: freqPayment(results.monthlyCondoFee, form.frequency),   dot: '#0ea5e9' }] : []),
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.dot }} />
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>{item.label}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{fmtCADx(item.value)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Divider between monthly breakdown and yearly totals */}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }} />

                  {/* Yearly loan summary */}
                  <div className="space-y-2.5 px-1">
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Loan Amount</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{fmtCAD(results.loanAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '12px', color: '#f87171' }}>Total Interest</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#f87171' }}>{fmtCAD(results.totalInterest)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Total Cost</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{fmtCAD(results.totalPayment)}</span>
                    </div>
                  </div>

                  <div className="flex-1" />

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      disabled
                      title="Coming soon"
                      className="inline-flex items-center gap-1.5 flex-1 justify-center cursor-not-allowed select-none"
                      style={{ background: '#1DB584', border: '1.5px solid #1DB584', color: '#ffffff', borderRadius: 8, padding: '9px 8px', fontSize: '12px', fontWeight: 700 }}
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </button>
                    <button
                      disabled
                      title="Coming soon"
                      className="inline-flex items-center gap-1.5 flex-1 justify-center cursor-not-allowed select-none"
                      style={{ border: '1.5px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '9px 8px', fontSize: '12px', fontWeight: 700 }}
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email Results
                    </button>
                  </div>

                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center py-12">
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                    Enter your details<br />to see results.
                  </p>
                </div>
              )}
            </div>
          </div>{/* end Dark Navy Results Card */}

        </div>{/* end Block A */}

        {/* ── Block B: Visuals Row — Payment Breakdown + Compare Scenarios ─── */}
        {results && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <div style={cardStyle} className="p-3 md:p-5">
              {/* Header row: title + Monthly/Yearly pill toggle */}
              <div className="flex items-center justify-between mb-4">
                <h3 className={sectionHeading} style={{ color: sectionHeadingColor }}>Payment Breakdown</h3>
                <div className="flex rounded-full overflow-hidden" style={{ border: '1.5px solid #E4E9EF', background: '#F8FAFB' }}>
                  {(['monthly', 'yearly'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setBreakdownView(mode)}
                      className="px-3 py-1 text-xs font-semibold capitalize transition-colors duration-150"
                      style={breakdownView === mode
                        ? { background: '#1DB584', color: '#ffffff' }
                        : { color: '#6B7A8D', background: 'transparent' }}
                    >
                      {mode === 'monthly' ? 'Monthly' : 'Yearly'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Chart left, legend right */}
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <DonutChart
                    slices={pieSlices}
                    className="w-44 h-44"
                    centerValue={fmtCADx(results.totalMonthly * (breakdownView === 'yearly' ? 12 : 1))}
                    centerLabel={breakdownView === 'yearly' ? 'total/yr' : 'total/mo'}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  {pieSlices.filter((s) => s.alwaysShow || s.value > 0).map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span style={{ color: '#374151', fontSize: '12px' }}>{s.label}</span>
                      </div>
                      <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12px' }}>
                        {fmtCADx(s.value * (breakdownView === 'yearly' ? 12 : 1))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={cardStyle} className="p-3 md:p-5">
              <h3 className={`${sectionHeading} mb-4`} style={{ color: sectionHeadingColor }}>Compare Scenarios</h3>
              <div className="space-y-4">
                {scenarioPairs.map((sc) => {
                  const maxI = Math.max(...scenarioPairs.map((s) => s.totalInterest));
                  const pct = maxI > 0 ? (sc.totalInterest / maxI) * 100 : 0;
                  const selected = sc.years === parseInt(form.amortization);
                  return (
                    <div key={sc.years}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium" style={{ color: selected ? '#1DB584' : '#374151' }}>
                          {sc.years}-Year {selected ? '← current' : ''}
                        </span>
                        <span style={{ color: '#6B7A8D' }}>{fmtCADx(sc.monthlyPayment)}/mo</span>
                      </div>
                      <div className="h-4 rounded-full overflow-hidden" style={{ background: '#F1F4F7' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: selected ? '#1DB584' : '#E4E9EF' }}
                        />
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: '#9BA8B5' }}>
                        Total interest:{' '}
                        <span className="font-medium" style={{ color: '#6B7A8D' }}>{fmtCAD(sc.totalInterest)}</span>
                      </p>
                    </div>
                  );
                })}
                <p className="pt-2 text-xs" style={{ borderTop: '1px solid #E4E9EF', color: '#9BA8B5' }}>
                  15-year saves{' '}
                  <span className="font-semibold text-emerald-600">
                    {fmtCAD(results.scenario30.totalInterest - results.scenario15.totalInterest)}
                  </span>{' '}
                  vs 30-year, but costs {fmtCADx(results.scenario15.monthlyPayment - results.scenario30.monthlyPayment)} more/month.
                </p>
              </div>
            </div>

          </div>
        )}{/* end Block B */}

        {/* ── Block C: Expert Analysis Panel ───────────────────────────────── */}
        {results && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '3px solid #0F6B4A' }}
          >
            {/* Solid dark green header with lightbulb icon */}
            <div className="flex items-center gap-3 px-5 py-3" style={{ background: '#0F6B4A' }}>
              <svg className="w-5 h-5 shrink-0 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zm4.657 2.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 5.05A1 1 0 003.636 6.464l.707.707A1 1 0 005.757 5.757l-.707-.707zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zm11 4a1 1 0 10-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zM8 15a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zm-1-5a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              <p className="text-sm font-bold uppercase tracking-widest text-white">
                FinCalcSmart Expert Analysis
              </p>
            </div>

            {/* White content area */}
            <div className="bg-white p-5 space-y-4">

              {/* Affordability Ratios */}
              {results.primaryRatio && results.secondaryRatio && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9BA8B5' }}>
                    Affordability Assessment
                  </p>
                  {[results.primaryRatio, results.secondaryRatio].map((data) => {
                    const fillPct = Math.min((data.ratio / data.limit) * 100, 105);
                    const over = data.ratio > data.limit;
                    const near = data.ratio > data.limit * 0.85;
                    const barColor = over ? '#ef4444' : near ? '#f59e0b' : '#10b981';
                    const valColor = over ? '#b91c1c' : near ? '#92400e' : '#065f46';
                    const statusText = over ? 'Exceeds limit' : near ? 'Near limit' : 'Within range';
                    return (
                      <div key={data.label} className="space-y-1">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-xs font-bold" style={{ color: '#374151' }}>{data.label}</span>
                            <span className="ml-1.5 text-xs" style={{ color: '#9BA8B5' }}>{data.sublabel}</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-bold tabular-nums" style={{ color: valColor }}>{data.ratio.toFixed(1)}%</span>
                            <span className="text-xs" style={{ color: '#9BA8B5' }}>/ {data.limit}%</span>
                          </div>
                        </div>
                        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: '#E4E9EF' }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(fillPct, 100)}%`, background: barColor }} />
                        </div>
                        <p className="text-xs font-medium" style={{ color: valColor }}>{statusText}</p>
                      </div>
                    );
                  })}
                  <p className="text-xs italic" style={{ color: '#9BA8B5' }}>Heating estimated at $150/mo for GDS calculation.</p>
                </div>
              )}

              {/* Market Context */}
              <div>
                <p className="text-base font-bold mb-1.5" style={{ color: sectionHeadingColor }}>Market Context</p>
                <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{getInsight()}</p>
              </div>

              {/* Expert Insight Triggers */}
              <div className="space-y-2.5">
                <p className="text-base font-bold" style={{ color: sectionHeadingColor }}>Expert Insights</p>

                {/* Rate Shock — red accent */}
                <div className="rounded-xl px-4 py-3" style={{ borderLeft: '3px solid #ef4444', background: '#fff5f5' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#ef4444' }}>
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9BA8B5' }}>Rate Shock Analysis</p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                    A 200-basis-point rate increase at renewal would raise your monthly payment by{' '}
                    <strong style={{ color: '#b91c1c' }}>{fmtCADx(results.rateShock.difference)}</strong> to{' '}
                    <strong>{fmtCADx(results.rateShock.shockedPayment)}</strong> at{' '}
                    {results.rateShock.newRate.toFixed(2)}%. Maintaining a payment buffer of this magnitude ensures financial flexibility through rate cycles.
                  </p>
                </div>

                {/* Amortization Compression — blue accent */}
                <div className="rounded-xl px-4 py-3" style={{ borderLeft: '3px solid #0ea5e9', background: '#f0f9ff' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#0ea5e9' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9BA8B5' }}>Amortization Compression</p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                    Increasing your P&amp;I payment by{' '}
                    <strong style={{ color: '#0369a1' }}>{fmtCADx(results.roundUp.extra)}/month</strong> to{' '}
                    <strong>{fmtCADx(results.roundUp.roundedPayment)}</strong>{' '}
                    {results.roundUp.yearsSaved > 0 ? (
                      <>delivers <strong style={{ color: '#0369a1' }}>{results.roundUp.yearsSaved}-year</strong> amortization compression and reduces total interest paid by <strong>{fmtCAD(results.roundUp.interestSaved)}</strong>.</>
                    ) : (
                      <>delivers an estimated <strong>{fmtCAD(results.roundUp.interestSaved)}</strong> reduction in total interest paid — minimal lifestyle impact, measurable long-term benefit.</>
                    )}
                  </p>
                </div>

                {/* Insurance Threshold */}
                {results.insuranceThreshold ? (
                  <div className="rounded-xl px-4 py-3" style={{ borderLeft: '3px solid #10b981', background: '#f0fdf4' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#10b981' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9BA8B5' }}>Insurance Threshold Opportunity</p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                      At <strong>{results.insuranceThreshold.currentDownPct.toFixed(1)}%</strong> down, you are within 2% of the CMHC-free threshold. Contributing an additional{' '}
                      <strong style={{ color: '#065f46' }}>{fmtCAD(results.insuranceThreshold.amountNeeded)}</strong> eliminates{' '}
                      <strong>{fmtCADx(results.insuranceThreshold.annualSavings / 12)}/month</strong> in CMHC-inflated payments — an effective instant return of{' '}
                      <strong style={{ color: '#065f46' }}>{results.insuranceThreshold.instantReturn.toFixed(0)}%</strong> annually on that incremental capital.
                    </p>
                  </div>
                ) : results.downPct >= 20 ? (
                  <div className="rounded-xl px-4 py-2.5 text-xs" style={{ borderLeft: '3px solid #10b981', background: '#f0fdf4', color: '#065f46' }}>
                    <span className="font-semibold">Insurance Threshold:</span> Not applicable — your down payment exceeds 20%.
                  </div>
                ) : (
                  <div className="rounded-xl px-4 py-2.5 text-xs font-medium" style={{ borderLeft: '3px solid #f59e0b', background: '#fffbeb', color: '#92400e' }}>
                    CMHC Insurance Required — your {results.downPct.toFixed(1)}% down payment is below the 20% threshold.
                  </div>
                )}
              </div>

              {/* Mini Disclaimer */}
              <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed" style={{ border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e' }}>
                <strong className="font-semibold">Important:</strong> The above analysis is for illustrative purposes only and does not constitute financial, tax, or mortgage advice. Individual results will vary based on lender terms, credit profile, and market conditions. Consult a licensed mortgage professional before making financial decisions.
              </div>

            </div>
          </div>
        )}{/* end Block C */}

        {/* ── Block D: Full Amortization Schedule ──────────────────────────── */}
        {results && (
          <div style={cardStyle} className="p-3 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className={sectionHeading} style={{ color: sectionHeadingColor }}>Full Amortization Schedule</h3>
              <button
                onClick={() => setShowSchedule((v) => !v)}
                className="text-sm font-medium transition-colors duration-150 hover:opacity-75"
                style={{ color: '#1DB584' }}
              >
                {showSchedule ? 'Hide' : 'Show'} schedule
              </button>
            </div>
            {!showSchedule && (
              <p className="text-sm" style={{ color: '#6B7A8D' }}>
                {results.schedule.length}-year schedule · {fmtCAD(results.totalInterest)} total interest
              </p>
            )}
            {showSchedule && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left" style={{ borderBottom: '1px solid #E4E9EF' }}>
                      {['Year', 'Begin Balance', 'Principal', 'Interest', 'End Balance'].map((h) => (
                        <th key={h} className="pb-2.5 pr-4 last:pr-0 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9BA8B5' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.schedule.map((row) => (
                      <tr key={row.year} className="hover:bg-brand-gray-50 transition-colors" style={{ borderBottom: '1px solid #F1F4F7' }}>
                        <td className="py-2 pr-4 font-medium" style={{ color: '#0D1B2A' }}>{row.year}</td>
                        <td className="py-2 pr-4" style={{ color: '#374151' }}>{fmtCAD(row.beginBalance)}</td>
                        <td className="py-2 pr-4 font-medium" style={{ color: '#1DB584' }}>{fmtCAD(row.principalPaid)}</td>
                        <td className="py-2 pr-4 text-rose-600">{fmtCAD(row.interestPaid)}</td>
                        <td className="py-2" style={{ color: '#374151' }}>{fmtCAD(row.endBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}{/* end Block D */}

        {/* ── Block E: Yellow Disclaimer Box ───────────────────────────────── */}
        {results && <Disclaimer />}

        {/* ── Block F: How It Works ─────────────────────────────────────────── */}
        {formulaContent && (
          <div style={cardStyle} className="p-3 md:p-5 lg:p-6">
            <h2
              className="font-extrabold text-brand-navy"
              style={{ fontSize: '20px', letterSpacing: '-0.3px', marginBottom: 12 }}
            >
              How It Works
            </h2>
            <div className="space-y-4" style={{ fontSize: '15px', color: '#374151', lineHeight: '1.7' }}>
              {formulaContent}
            </div>
          </div>
        )}

        {/* ── Block G: FAQ (inside col-span-9, matches content width) ─────── */}
        {faqItems.length > 0 && (
          <div style={cardStyle} className="p-3 md:p-5 lg:p-6">
            <h2
              className="font-extrabold text-brand-navy"
              style={{ fontSize: '20px', letterSpacing: '-0.3px', marginBottom: 4 }}
            >
              Frequently Asked Questions
            </h2>
            <CalculatorFaqAccordion faqs={faqItems} />
          </div>
        )}

      </div>{/* end MAIN CONTENT col-span-9 */}

      {/* ══ FAR-RIGHT SIDEBAR: col-span-3 ═══════════════════════════════════ */}
      <div className="lg:col-span-3">
        <div className="lg:sticky lg:top-6 space-y-4">

          {/* Related Articles */}
          <div style={cardStyle} className="p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6B7A8D', letterSpacing: '0.08em' }}>
              Related Articles
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Canadian Mortgage Calculator Guide',  href: '#' },
                { label: 'CMHC Insurance Explained',           href: '#' },
                { label: 'How to Choose Amortization Period',  href: '#' },
                { label: 'Mortgage Renewal Strategy',          href: '#' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="transition-opacity hover:opacity-70" style={{ fontSize: '13px', color: '#374151', fontWeight: 500, lineHeight: '1.4', display: 'block' }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Related Calculators */}
          <div style={cardStyle} className="p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6B7A8D', letterSpacing: '0.08em' }}>
              Related Calculators
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'US Mortgage Calculator',        href: '/us-mortgage-calculator' },
                { label: 'Compound Interest Calculator',  href: '/compound-interest-calculator' },
                { label: 'FIRE Calculator',               href: '/fire-calculator' },
                { label: 'Income Tax Calculator',         href: '/income-tax-calculator' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="transition-opacity hover:opacity-70" style={{ fontSize: '13px', color: '#1DB584', fontWeight: 500 }}>
                    {label} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>{/* end FAR-RIGHT SIDEBAR col-span-3 */}

    </div>
  );
}
