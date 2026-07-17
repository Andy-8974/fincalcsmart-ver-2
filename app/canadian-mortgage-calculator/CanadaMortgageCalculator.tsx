'use client';

import { useState, useMemo, type ReactNode } from 'react';
import {
  monthlyRateCA, calcPayment, getCmhcRate, buildSchedule, parseN,
  fmtCAD, fmtCADx, freqPayment, freqLabel, CMHC_MAX_INSURABLE_PRICE,
  type Frequency, type ScheduleRow, type ScenarioData,
} from '../_mortgage-shared/math';
import {
  NumericInput, Tooltip, DonutChart, Disclaimer,
  type PieSlice,
} from '../_mortgage-shared/ui';
import {
  InsightPanel,
  type RateShockData, type RoundUpData, type InsuranceThresholdData, type RatioData,
} from '../_mortgage-shared/InsightPanel';
import { FormLabel, inputCls, type Faq } from '@/components/layout/CalculatorLayout';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import {
  Sparkles, Download, Mail, Zap, TrendingUp, ShieldCheck, AlertTriangle,
  Globe, BarChart2, Star, DollarSign, Calendar, Thermometer, ShieldAlert,
  Activity, Info, BookOpen, HelpCircle, XCircle,
} from 'lucide-react';

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
  homePrice: 'The total purchase price of the property. Homes priced at CA$1.5M or more require a minimum 20% down payment and are ineligible for CMHC mortgage-loan insurance (CMHC, effective Dec 15, 2024).',
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
  border: '1px solid rgba(15,41,66,0.09)',
  borderRadius: '20px',
  background: '#ffffff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.03)',
};

const sectionHeading = 'text-base font-bold';
const sectionHeadingColor = '#0D1B2A';

// Replace px-3 with pr-2 md:pr-3 pl-3 — keeps right-padding responsive without
// clobbering the pl-11 that NumericInput injects for CA$ prefix inputs via a responsive
// variant (md:px-3 would win over pl-7 in Tailwind's CSS cascade; pr-* does not).
const inputClsCompact = inputCls
  .replace('py-2.5', 'py-1 md:py-2')
  .replace('px-3', 'pr-2 md:pr-3 pl-3') + ' placeholder:text-brand-gray-400';
const navyLabelStyle: React.CSSProperties = { fontWeight: 700, color: '#0D1B2A', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 };
const navyLabelCls = 'text-[10px] md:text-xs';

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
  const [isAmortizationExpanded, setIsAmortizationExpanded] = useState(false);
  const [showAffordability, setShowAffordability] = useState(true);
  const [breakdownView, setBreakdownView] = useState<'monthly' | 'yearly'>('monthly');
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

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

    // CMHC mortgage-loan insurance is not available at or above this price — see
    // CMHC_MAX_INSURABLE_PRICE in _mortgage-shared/math.ts. Below 20% down at this
    // price point is not a valid conventional mortgage, so no result is computed.
    if (homePrice >= CMHC_MAX_INSURABLE_PRICE && downPct < 20) return null;

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

    const ROUND_UP_AMOUNT = 100;
    const roundSchedule = buildSchedule(loanAmount, mRate, months, extra + ROUND_UP_AMOUNT);
    const roundInterestTotal = roundSchedule.reduce((s, r) => s + r.interestPaid, 0);
    const roundUp: RoundUpData = {
      extra: ROUND_UP_AMOUNT,
      roundedPayment: baseMonthlyPI + ROUND_UP_AMOUNT,
      yearsSaved: Math.round((schedule.length - roundSchedule.length) / 12),
      interestSaved: Math.max(0, totalInterest - roundInterestTotal),
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
    const ASSUMED_ANNUAL_INCOME = 120000;
    const effectiveAnnualIncome = grossIncome > 0 ? grossIncome : ASSUMED_ANNUAL_INCOME;
    const monthlyIncome = effectiveAnnualIncome / 12;
    const HEAT_EST = 150;
    const gdsNum = baseMonthlyPI + monthlyTax + HEAT_EST + monthlyCondoFee * 0.5;
    const gds = (gdsNum / monthlyIncome) * 100;
    const tds = ((gdsNum + otherDebts) / monthlyIncome) * 100;
    const primaryRatio: RatioData = { ratio: gds, limit: 32, label: 'GDS', sublabel: 'Gross Debt Service' };
    const secondaryRatio: RatioData = { ratio: tds, limit: 44, label: 'TDS', sublabel: 'Total Debt Service' };

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

  async function handleDownloadPDF() {
    if (!results || pdfGenerating) return;
    setPdfGenerating(true);
    setPdfError(null);
    try {
      // Mirror health-score computation from the render block (pure function of results + form)
      const incomeEntered = parseN(form.grossIncome) > 0;
      const gdsVal  = results.primaryRatio?.ratio   ?? 0;
      const tdsVal  = results.secondaryRatio?.ratio ?? 0;
      const dp      = results.downPct;
      const rate    = parseN(form.interestRate);
      let hScore: number, hTitle: string, hCopy: string;
      if (incomeEntered) {
        const gdsScore = gdsVal <= 28 ? 40 : gdsVal <= 32 ? 32 : gdsVal <= 36 ? 22 : Math.max(5, Math.round(40 - (gdsVal - 28) * 1.5));
        const tdsScore = tdsVal <= 36 ? 40 : tdsVal <= 44 ? 30 : tdsVal <= 50 ? 15 : 5;
        const dpScore  = dp    >= 20  ? 20 : dp    >= 15  ? 15 : dp    >= 10  ? 10 : 5;
        hScore = Math.round(Math.min(100, Math.max(0, gdsScore + tdsScore + dpScore)));
        const mInc = parseN(form.grossIncome) / 12;
        if (gdsVal > 32) {
          const gdsCeiling = fmtCADx(Math.round(0.32 * mInc));
          hTitle = 'GDS ratio is the main pressure point.';
          hCopy  = `Your housing costs exceed the 32% GDS guideline (${gdsCeiling}/mo ceiling). Consider a lower purchase price, a larger down payment, or a lower rate.`;
        } else if (tdsVal > 44) {
          const tdsGap = fmtCADx(Math.ceil(((tdsVal - 44) / 100) * mInc));
          hTitle = 'Other debts are adding pressure.';
          hCopy  = `TDS ratio is ${tdsVal.toFixed(1)}%. Reducing monthly obligations by ~${tdsGap} would bring you within the 44% TDS guideline.`;
        } else if (dp < 10) {
          hTitle = 'Low down payment is the primary risk.';
          hCopy  = 'GDS/TDS ratios are within guideline, but your equity cushion is thin. CMHC insurance applies and a market correction could put you underwater. Reaching 10% down materially reduces exposure.';
        } else if (results.cmhcAmount > 0) {
          hTitle = 'Good profile — CMHC insurance is the remaining cost to watch.';
          hCopy  = `GDS/TDS ratios are healthy. Mortgage default insurance of ${fmtCADx(results.cmhcAmount)} is added to your loan. Reaching 20% down eliminates this cost entirely.`;
        } else {
          hTitle = 'Strong position across all signals.';
          hCopy  = 'GDS/TDS ratios, down payment, and CMHC insurance status are all within healthy ranges.';
        }
      } else {
        const dpScore   = dp >= 20 ? 40 : dp >= 15 ? 30 : dp >= 10 ? 20 : 10;
        const cmhcScore = results.cmhcAmount === 0 ? 35 : dp >= 15 ? 25 : 10;
        const rateScore = rate <= 4.5 ? 25 : rate <= 5.5 ? 18 : rate <= 6.5 ? 10 : 5;
        hScore = Math.round(Math.min(100, Math.max(0, dpScore + cmhcScore + rateScore)));
        if (dp < 10) {
          hTitle = 'Low down payment is the primary risk.';
          hCopy  = 'CMHC mortgage default insurance applies and your equity cushion is thin. Add your annual income above to include GDS/TDS analysis in this score.';
        } else if (results.cmhcAmount > 0) {
          hTitle = `Mortgage default insurance adds ${fmtCADx(results.cmhcAmount)} to your loan.`;
          hCopy  = 'Score based on down payment, CMHC insurance status, and rate. Add your annual income to include GDS/TDS analysis.';
        } else {
          hTitle = 'Score based on down payment, insurance status, and rate.';
          hCopy  = 'Add your annual income above to include full GDS/TDS analysis in this score.';
        }
      }
      const hLabel = (hScore >= 80 ? 'Excellent' : hScore >= 65 ? 'Good' : hScore >= 50 ? 'Fair' : 'Needs Attention') as
        'Excellent' | 'Good' | 'Fair' | 'Needs Attention';

      const { buildMortgagePDF } = await import('@/lib/pdf/adapters/mortgageAdapter');
      await buildMortgagePDF({
        homePrice:            parseN(form.homePrice),
        downPaymentAmount:    results.downPaymentAmount,
        downPct:              results.downPct,
        interestRate:         rate,
        amortizationYears:    parseInt(form.amortization) || 25,
        frequency:            form.frequency,
        extraPayment:         parseN(form.extraPayment),
        propertyTaxAnnual:    parseN(form.propertyTax),
        homeInsuranceAnnual:  parseN(form.homeInsurance),
        condoFeeMonthly:      parseN(form.condoFee),
        incomeEntered,
        grossIncome:          parseN(form.grossIncome),
        otherDebts:           parseN(form.otherDebts),
        loanAmount:           results.loanAmount,
        cmhcAmount:           results.cmhcAmount,
        baseMonthlyPI:        results.baseMonthlyPI,
        displayPayment:       results.displayPayment,
        totalMonthly:         results.totalMonthly,
        monthlyPropertyTax:   results.monthlyTax,
        monthlyHomeInsurance: results.monthlyInsurance,
        monthlyCondoFee:      results.monthlyCondoFee,
        totalInterest:        results.totalInterest,
        totalPayment:         results.totalPayment,
        healthScore:          hScore,
        healthLabel:          hLabel,
        healthTitle:          hTitle,
        healthCopy:           hCopy,
        gds:                  incomeEntered ? gdsVal : null,
        tds:                  incomeEntered ? tdsVal : null,
        rateShockNewRate:     results.rateShock.newRate,
        rateShockDifference:  results.rateShock.difference,
        roundUpYearsSaved:    results.roundUp.yearsSaved,
        roundUpInterestSaved: results.roundUp.interestSaved,
        schedule:             results.schedule.map((r) => ({ year: r.year, endBalance: r.endBalance })),
        insightText:          getInsight(),
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
      setPdfError('PDF generation failed. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  }

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

  // True when down payment >= home price — prevents "Enter your details" when user
  // has fully filled the form but owns the property outright (no loan needed).
  const noMortgageNeeded = (() => {
    const hp = parseN(form.homePrice);
    const dp = form.downPaymentMode === 'amount'
      ? parseN(form.downPayment)
      : hp * (parseN(form.downPayment) / 100);
    return hp > 0 && dp >= hp;
  })();

  // True when the price/down-payment combination is not eligible for CMHC
  // insurance (homePrice >= CMHC_MAX_INSURABLE_PRICE with <20% down) — mirrors
  // the gate inside the `results` memo, used here only to drive the UI message.
  const priceIneligible = (() => {
    const hp = parseN(form.homePrice);
    const dp = form.downPaymentMode === 'amount'
      ? parseN(form.downPayment)
      : hp * (parseN(form.downPayment) / 100);
    if (hp <= 0 || dp >= hp) return false;
    const downPct = (dp / hp) * 100;
    return hp >= CMHC_MAX_INSURABLE_PRICE && downPct < 20;
  })();

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ══ WORKSPACE: gradient behind nav/banner + Blocks A + B ════════════
          Sized by content — gradient is always exactly as tall as the workspace.
          Top color (#ecf5f2) connects to the banner gradient's bottom color.
          Fades to flat body (#F8FAFB) at the bottom, no visible seam below.   */}
      <div className="pb-0">
      <div className="flex flex-col gap-y-7 md:gap-y-8 min-w-0">

        {/* ── Block A: Top Row — Input Card (7) + Dark Navy Results Card (5) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

          {/* Input Card — col-span-7 */}
          <div className="lg:col-span-7" style={cardStyle}>
            <div className="p-5 md:p-6">

              {/* Card Header */}
              <div className="flex items-center gap-3 mb-4 md:mb-5">
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#1DB584 0%,#17a070 100%)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(29,181,132,0.30)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>Canadian Mortgage</p>
                  <p className={sectionHeading} style={{ color: sectionHeadingColor }}>Mortgage Details</p>
                </div>
              </div>

              {/* Internal 2-column grid — always 2 cols for mobile density */}
              <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

                {/* ── LEFT COLUMN: Basic Inputs ─────────────────────────── */}
                <div className="space-y-3 min-w-0">

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>Home Price <Tooltip text={TOOLTIPS.homePrice} /></label>
                    <NumericInput value={form.homePrice} onChange={(v) => set('homePrice', v)} prefix="CA$" inputClassName={inputClsCompact} />
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>Down Payment <Tooltip text={TOOLTIPS.downPayment} /></label>
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
                        className="shrink-0 px-1 md:px-2.5 rounded-brand-sm text-[10px] md:text-xs font-semibold transition-colors duration-150 hover:bg-brand-gray-100"
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
                    {priceIneligible && (
                      <div className="mt-2 rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)' }}>
                        <div className="flex gap-2 items-start">
                          <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#EF4444' }} aria-hidden="true" />
                          <p className="text-xs leading-relaxed" style={{ color: '#991B1B' }}>
                            CMHC mortgage insurance is unavailable at CA$1.5M or more (CMHC, effective Dec 15, 2024). Increase your down payment to at least 20% to continue with a conventional mortgage.{' '}
                            <a
                              href="https://www.canada.ca/en/department-finance/news/2024/12/boldest-mortgage-reforms-in-decades-come-into-force-today.html"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline decoration-dotted underline-offset-2 hover:opacity-80"
                              style={{ color: '#991B1B' }}
                            >
                              Source: Government of Canada
                            </a>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>Annual Interest Rate <Tooltip text={TOOLTIPS.interestRate} /></label>
                    <NumericInput value={form.interestRate} onChange={(v) => set('interestRate', v)} suffix="%" inputClassName={inputClsCompact} />
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>Amortization Period <Tooltip text={TOOLTIPS.amortization} /></label>
                    <select value={form.amortization} onChange={(e) => set('amortization', e.target.value)} className={inputClsCompact}>
                      {[5, 10, 15, 20, 25, 30].map((y) => (
                        <option key={y} value={String(y)}>{y} years{y === 25 ? ' (standard)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>Payment Frequency <Tooltip text={TOOLTIPS.frequency} /></label>
                    <select value={form.frequency} onChange={(e) => set('frequency', e.target.value as Frequency)} className={inputClsCompact}>
                      <option value="monthly">Monthly (12×/year)</option>
                      <option value="biweekly">Bi-Weekly (26×/year)</option>
                      <option value="accelerated-biweekly">Accelerated Bi-Weekly ⚡</option>
                    </select>
                  </div>

                </div>{/* end left column */}

                {/* ── RIGHT COLUMN: Advanced costs + Affordability checkbox ─ */}
                <div className="border-l pl-2 md:pl-5 space-y-3 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>Extra Monthly Payment <Tooltip text={TOOLTIPS.extraPayment} /></label>
                    <NumericInput value={form.extraPayment} onChange={(v) => set('extraPayment', v)} prefix="CA$" inputClassName={inputClsCompact} />
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>Annual Property Tax <Tooltip text={TOOLTIPS.propertyTax} /></label>
                    <NumericInput value={form.propertyTax} onChange={(v) => set('propertyTax', v)} prefix="CA$" inputClassName={inputClsCompact} />
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>Annual Home Insurance <Tooltip text={TOOLTIPS.homeInsurance} /></label>
                    <NumericInput value={form.homeInsurance} onChange={(v) => set('homeInsurance', v)} prefix="CA$" inputClassName={inputClsCompact} />
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>Monthly Condo / HOA Fee <Tooltip text={TOOLTIPS.condoFee} /></label>
                    <NumericInput value={form.condoFee} onChange={(v) => set('condoFee', v)} prefix="CA$" inputClassName={inputClsCompact} />
                  </div>

                  {/* Affordability Analysis — recommended panel */}
                  <div className="rounded-xl p-3" style={{ borderTop: '1px solid rgba(29,181,132,0.18)', background: 'rgba(29,181,132,0.045)' }}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAffordability}
                        onChange={(e) => setShowAffordability(e.target.checked)}
                        className="rounded shrink-0 mt-0.5"
                        style={{ accentColor: '#1DB584', width: 14, height: 14 }}
                      />
                      <div>
                        <span className="text-xs font-semibold block" style={{ color: '#1DB584' }}>
                          Affordability Analysis
                        </span>
                        <span className="text-xs block mt-0.5" style={{ color: 'rgba(13,27,42,0.45)' }}>
                          Recommended for smarter AI insights
                        </span>
                      </div>
                    </label>
                    {showAffordability && (
                      <div className="mt-2.5 space-y-2.5">
                        <div>
                          <label className={navyLabelCls} style={navyLabelStyle}>Gross Annual Household Income <Tooltip text={TOOLTIPS.grossIncome} /></label>
                          <NumericInput value={form.grossIncome} onChange={(v) => set('grossIncome', v)} prefix="CA$" inputClassName={inputClsCompact} placeholder="e.g. 120,000" />
                        </div>
                        <div>
                          <label className={navyLabelCls} style={navyLabelStyle}>Other Monthly Debts <Tooltip text={TOOLTIPS.otherDebts} /></label>
                          <NumericInput value={form.otherDebts} onChange={(v) => set('otherDebts', v)} prefix="CA$" inputClassName={inputClsCompact} placeholder="e.g. 500" />
                        </div>
                      </div>
                    )}
                  </div>

                </div>{/* end right column */}

              </div>{/* end internal 2-col grid */}

            </div>
          </div>{/* end Input Card */}

          {/* Mobile-only CTA — scroll to results */}
          <div className="lg:hidden">
            <MobileCalcCTA />
          </div>

          {/* Dark Navy Results Card — col-span-5 */}
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
              {results ? (
                <div className="flex flex-col flex-1 gap-4">

                  {/* Glassy box: ONLY the big number */}
                  <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                      Estimated {freqLabel(form.frequency)} payment
                    </p>
                    <p style={{ color: '#1DB584', fontSize: '46px', fontWeight: 800, letterSpacing: '-2.5px', lineHeight: 1, marginTop: 8 }}>
                      {fmtCADx(freqPayment(results.totalMonthly, form.frequency))}
                    </p>
                    {results.cmhcAmount > 0 && (
                      <p style={{ color: '#C9A84C', fontSize: '11.5px', fontWeight: 600, marginTop: 6 }}>
                        + {fmtCAD(results.cmhcAmount)} CMHC added to balance
                      </p>
                    )}
                  </div>

                  {/* Monthly payment breakdown — dot indicators matching chart colors */}
                  <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    {[
                      { label: 'Principal & Interest', value: freqPayment(results.baseMonthlyPI, form.frequency),   dot: '#1DB584' },
                      ...(results.monthlyTax > 0        ? [{ label: 'Property Tax',    value: freqPayment(results.monthlyTax, form.frequency),       dot: '#f59e0b' }] : []),
                      ...(results.monthlyInsurance > 0  ? [{ label: 'Home Insurance',  value: freqPayment(results.monthlyInsurance, form.frequency),  dot: '#8b5cf6' }] : []),
                      ...(results.monthlyCondoFee > 0   ? [{ label: 'Condo / HOA Fee', value: freqPayment(results.monthlyCondoFee, form.frequency),   dot: '#0ea5e9' }] : []),
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.dot }} />
                          <span className="text-[13px] text-slate-300">{item.label}</span>
                        </div>
                        <span className="text-[13px] font-semibold text-white">{fmtCADx(item.value)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Divider between monthly breakdown and loan summary */}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                  {/* Loan summary */}
                  <div className="px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[13px] text-slate-400">Loan Amount</span>
                      <span className="text-[13px] font-semibold text-white">{fmtCAD(results.loanAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[13px]" style={{ color: '#C9A84C' }}>Total Interest</span>
                      <span className="text-[13px] font-semibold" style={{ color: '#C9A84C' }}>{fmtCAD(results.totalInterest)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[13px] text-slate-300 font-medium">Total Cost</span>
                      <span className="text-[13px] font-bold text-white">{fmtCAD(results.totalPayment)}</span>
                    </div>
                  </div>

                  <div className="flex-1" />

                  {/* AI CTA — dual-text hover switcher */}
                  <style>{`
                    @keyframes teal-glow-pulse {
                      0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
                      50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
                    }
                    .btn-ai-cta {
                      animation: teal-glow-pulse 2.8s ease-in-out infinite;
                      transition: transform 180ms ease, box-shadow 180ms ease;
                    }
                    .btn-ai-cta:hover {
                      transform: translateY(-2px);
                      box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
                      animation: none;
                    }
                  `}</style>
                  <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                      Want to understand where your money goes?
                    </p>
                    {(() => {
                      // ── Swappable savings metric ──────────────────────────
                      // Bound to results.roundUp.interestSaved — the same value
                      // that drives the blue "Amortization Compression" insight
                      // card. Swap this expression for any other calculator's
                      // key benefit metric (e.g. TFSA growth delta, compound
                      // interest saved, etc.) to reuse this button pattern.
                      const savingsMetric = fmtCAD(results.roundUp.interestSaved);
                      return (
                        <button
                          onClick={() => document.getElementById('expert-analysis')?.scrollIntoView({ behavior: 'smooth' })}
                          onMouseEnter={() => setAiCtaHovered(true)}
                          onMouseLeave={() => setAiCtaHovered(false)}
                          className="btn-ai-cta w-full font-bold overflow-hidden"
                          style={{
                            position: 'relative',
                            background: '#060F1A',
                            color: '#ffffff',
                            borderRadius: 8,
                            height: 40,
                            fontSize: '13px',
                            border: '1px solid rgba(29,181,132,0.3)',
                          }}
                        >
                          {/* Default: savings amount */}
                          <span style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            whiteSpace: 'nowrap',
                            opacity: aiCtaHovered ? 0 : 1,
                            transition: 'opacity 200ms ease',
                            pointerEvents: 'none',
                          }}>
                            See How to Save {savingsMetric} ↓
                          </span>
                          {/* Hover: action phrase */}
                          <span style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            whiteSpace: 'nowrap',
                            opacity: aiCtaHovered ? 1 : 0,
                            transition: 'opacity 200ms ease',
                            pointerEvents: 'none',
                          }}>
                            Unlock AI Mortgage Analysis ↓
                          </span>
                        </button>
                      );
                    })()}
                  </div>

                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center py-12">
                  <p style={{ color: priceIneligible ? '#f87171' : 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                    {priceIneligible
                      ? <>CMHC insurance unavailable at this price.<br />20% minimum down payment required.</>
                      : noMortgageNeeded
                      ? <>No mortgage needed —<br />down payment covers full price.</>
                      : <>Enter your details<br />to see results.</>}
                  </p>
                </div>
              )}
            </div>
          </div>{/* end Dark Navy Results Card */}

        </div>{/* end Block A */}

        {/* ── Block B: Visuals Row — Payment Breakdown + Compare Scenarios ─── */}
        {results && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

            <div style={cardStyle} className="p-5 md:p-6 h-full flex flex-col">
              {/* Header row: title + Monthly/Yearly pill toggle */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>Monthly costs</p>
                  <h3 className={sectionHeading} style={{ color: sectionHeadingColor }}>Payment Breakdown</h3>
                </div>
                <div className="flex rounded-full p-0.5" style={{ background: '#EEF1F5' }}>
                  {(['monthly', 'yearly'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setBreakdownView(mode)}
                      className="px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-150"
                      style={breakdownView === mode
                        ? { background: '#1DB584', color: '#ffffff', boxShadow: '0 1px 4px rgba(29,181,132,0.30)' }
                        : { color: '#6B7A8D', background: 'transparent' }}
                    >
                      {mode === 'monthly' ? 'Monthly' : 'Yearly'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Chart left, legend right */}
              <div className="flex-1 flex flex-col justify-center">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="shrink-0">
                  <DonutChart
                    slices={pieSlices}
                    className="w-52 h-52"
                    centerValue={fmtCADx(results.totalMonthly * (breakdownView === 'yearly' ? 12 : 1))}
                    centerLabel={breakdownView === 'yearly' ? 'total/yr' : 'total/mo'}
                  />
                </div>
                <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                  {pieSlices.filter((s) => s.alwaysShow || s.value > 0).map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span style={{ color: '#4B5563', fontSize: '12.5px' }}>{s.label}</span>
                      </div>
                      <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>
                        {fmtCADx(s.value * (breakdownView === 'yearly' ? 12 : 1))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </div>

            <div style={cardStyle} className="p-5 md:p-6 h-full flex flex-col">
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>Side-by-side</p>
                <h3 className={sectionHeading} style={{ color: sectionHeadingColor }}>Compare Scenarios</h3>
              </div>
              <div className="space-y-5 flex-1">
                {scenarioPairs.map((sc) => {
                  const maxI = Math.max(...scenarioPairs.map((s) => s.totalInterest));
                  const pct = maxI > 0 ? (sc.totalInterest / maxI) * 100 : 0;
                  const selected = sc.years === parseInt(form.amortization);
                  return (
                    <div key={sc.years}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: selected ? '#1DB584' : '#374151' }}>
                            {sc.years}-Year
                          </span>
                          {selected && (
                            <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ background: 'rgba(29,181,132,0.10)', color: '#1DB584' }}>
                              current
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                          {fmtCADx(sc.monthlyPayment)}<span className="text-xs font-normal text-slate-400">/mo</span>
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#EEF1F5' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: selected ? '#1DB584' : '#C8D3DF' }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs" style={{ color: '#9BA8B5' }}>
                        Total interest:{' '}
                        <span className="font-semibold" style={{ color: '#6B7A8D' }}>{fmtCAD(sc.totalInterest)}</span>
                      </p>
                    </div>
                  );
                })}
                {parseInt(form.amortization) >= 15 && (
                  <p className="pt-3 text-xs leading-relaxed" style={{ borderTop: '1px solid rgba(15,41,66,0.07)', color: '#9BA8B5' }}>
                    15-year saves{' '}
                    <span className="font-semibold" style={{ color: '#1DB584' }}>
                      {fmtCAD(results.scenario30.totalInterest - results.scenario15.totalInterest)}
                    </span>{' '}
                    vs 30-year, but costs {fmtCADx(results.scenario15.monthlyPayment - results.scenario30.monthlyPayment)} more/month.
                  </p>
                )}
              </div>
            </div>

          </div>
        )}{/* end Block B */}

      </div>
      </div>{/* end workspace gradient */}

      {/* ── Lower sections: flat body background (Blocks C–G) ─────────────── */}
      <div className="pt-6 md:pt-8">
        <div className="flex flex-col gap-y-6 md:gap-y-8 min-w-0">

        {/* ── Block C: Expert Analysis Panel ───────────────────────────────── */}
        {results && (() => {
          /* ── Income detection ── */
          const incomeEntered = parseN(form.grossIncome) > 0;

          /* ── Health Score — two scoring modes ── */
          const gds  = results.primaryRatio?.ratio   ?? 0;
          const tds  = results.secondaryRatio?.ratio ?? 0;
          const dp   = results.downPct;
          const rate = parseN(form.interestRate);

          let hScore: number;
          let hTitle: string;
          let hCopy:  string;

          if (incomeEntered) {
            // Mode A: GDS/TDS-based scoring — score, label, color, and copy all derive from same ratios
            const gdsScore = gds <= 28 ? 40 : gds <= 32 ? 32 : gds <= 36 ? 22 : Math.max(5, Math.round(40 - (gds - 28) * 1.5));
            const tdsScore = tds <= 36 ? 40 : tds <= 44 ? 30 : tds <= 50 ? 15 : 5;
            const dpScore  = dp  >= 20 ? 20 : dp  >= 15 ? 15 : dp  >= 10 ? 10 : 5;
            hScore = Math.round(Math.min(100, Math.max(0, gdsScore + tdsScore + dpScore)));
            const mInc = parseN(form.grossIncome) / 12;
            if (gds > 32) {
              // GDS binding: housing cost wording only, no mention of other debts
              const gdsCeiling = fmtCADx(Math.round(0.32 * mInc));
              hTitle = 'GDS ratio is the main pressure point.';
              hCopy  = `Your housing costs exceed the 32% GDS guideline (${gdsCeiling}/mo ceiling). Consider a lower purchase price, a larger down payment, or a lower rate.`;
            } else if (tds > 44) {
              // TDS binding: other debts wording is appropriate
              const tdsGap = fmtCADx(Math.ceil(((tds - 44) / 100) * mInc));
              hTitle = 'Other debts are adding pressure.';
              hCopy  = `TDS ratio is ${tds.toFixed(1)}%. Reducing monthly obligations by ~${tdsGap} would bring you within the 44% TDS guideline.`;
            } else if (dp < 10) {
              hTitle = 'Low down payment is the primary risk.';
              hCopy  = 'GDS/TDS ratios are within guideline, but your equity cushion is thin. CMHC insurance applies and a market correction could put you underwater. Reaching 10% down materially reduces exposure.';
            } else if (results.cmhcAmount > 0) {
              hTitle = 'Good profile — CMHC insurance is the remaining cost to watch.';
              hCopy  = `GDS/TDS ratios are healthy. Mortgage default insurance of ${fmtCADx(results.cmhcAmount)} is added to your loan. Reaching 20% down eliminates this cost entirely.`;
            } else {
              hTitle = 'Strong position across all signals.';
              hCopy  = 'GDS/TDS ratios, down payment, and CMHC insurance status are all within healthy ranges.';
            }
          } else {
            // Mode B: no income — score on down payment, CMHC/insurance status, and rate only
            const dpScore   = dp >= 20 ? 40 : dp >= 15 ? 30 : dp >= 10 ? 20 : 10;
            const cmhcScore = results.cmhcAmount === 0 ? 35
              : dp >= 15 ? 25
              : 10;
            const rateScore = rate <= 4.5 ? 25 : rate <= 5.5 ? 18 : rate <= 6.5 ? 10 : 5;
            hScore = Math.round(Math.min(100, Math.max(0, dpScore + cmhcScore + rateScore)));
            if (dp < 10) {
              hTitle = 'Low down payment is the primary risk.';
              hCopy  = 'CMHC mortgage default insurance applies and your equity cushion is thin. Add your annual income above to include GDS/TDS analysis in this score.';
            } else if (results.cmhcAmount > 0) {
              hTitle = `Mortgage default insurance adds ${fmtCADx(results.cmhcAmount)} to your loan.`;
              hCopy  = 'Score based on down payment, CMHC insurance status, and rate. Add your annual income to include GDS/TDS analysis.';
            } else {
              hTitle = 'Score based on down payment, insurance status, and rate.';
              hCopy  = 'Add your annual income above to include full GDS/TDS analysis in this score.';
            }
          }

          const hLabel = hScore >= 80 ? 'Excellent' : hScore >= 65 ? 'Good' : hScore >= 50 ? 'Fair' : 'Needs Attention';
          const hColor = hScore >= 65 ? '#1DB584' : hScore >= 50 ? '#f59e0b' : '#ef4444';
          /* ─ SVG gauge constants (8 o'clock → 4 o'clock, 240° sweep, gap at bottom) ─ */
          const GR   = 52;
          const GC   = 2 * Math.PI * GR;        // ≈ 326.7 px
          const GARC = (240 / 360) * GC;         // 240° track ≈ 217.8 px
          const GFIL = (hScore / 100) * GARC;    // fill length
          /* ─ Ratio status helper ─ */
          const rStatus = (r: number, l: number) =>
            r > l           ? { label: 'Over Limit',  color: '#ef4444', bg: 'rgba(239,68,68,0.10)'  }
            : r > l * 0.875 ? { label: 'Manageable',  color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' }
            : r > l * 0.75  ? { label: 'Good',        color: '#1DB584', bg: 'rgba(29,181,132,0.10)' }
            :                  { label: 'Healthy',     color: '#1DB584', bg: 'rgba(29,181,132,0.10)' };

          /* ── Smart Optimization lever — input-aware priority selection ── */
          const dtiOver = incomeEntered && (gds > 32 || tds > 44);
          type LIcon = 'dollar' | 'activity' | 'calendar' | 'trending';
          const lever = (() => {
            // Lever 1: CMHC insurance threshold (18–20% down) — highest priority
            if (results.insuranceThreshold) {
              const th = results.insuranceThreshold;
              return {
                bigNum:      fmtCAD(th.amountNeeded),
                mainLabel:   'additional down payment needed',
                supportCopy: 'Reaching the 20% down payment threshold may remove CMHC mortgage default insurance.',
                kpi1Val:     fmtCADx(th.annualSavings / 12) + '/mo',
                kpi1Label:   'Monthly insurance saved',
                kpi1Icon:    'dollar'   as LIcon,
                kpi2Val:     th.instantReturn.toFixed(0) + '%',
                kpi2Label:   'Estimated return',
                kpi2Icon:    'trending' as LIcon,
              };
            }
            // Lever 2: High GDS/TDS — only when income is entered
            if (dtiOver) {
              const mInc      = parseN(form.grossIncome) / 12;
              const gdsOverPP = gds - 32;
              const tdsOverPP = tds - 44;
              if (gdsOverPP > tdsOverPP) {
                // GDS binding: housing cost wording only, no debt reduction
                const gap = Math.ceil(gds / 100 * mInc - 0.32 * mInc);
                return {
                  bigNum:      fmtCADx(gap) + '/mo',
                  mainLabel:   'payment reduction needed',
                  supportCopy: 'Your housing costs are above the recommended guideline. Lowering the home price, increasing your down payment, or finding a lower rate could help bring the payment closer to range.',
                  kpi1Val:     gds.toFixed(1) + '%',
                  kpi1Label:   'Current GDS',
                  kpi1Icon:    'activity' as LIcon,
                  kpi2Val:     '32%',
                  kpi2Label:   'Guideline',
                  kpi2Icon:    'activity' as LIcon,
                };
              } else {
                // TDS binding: debt reduction wording is appropriate
                const gap = Math.ceil(tds / 100 * mInc - 0.44 * mInc);
                return {
                  bigNum:      fmtCADx(gap) + '/mo',
                  mainLabel:   'monthly debt reduction needed',
                  supportCopy: 'Reducing monthly debt obligations could help bring your total debt ratio closer to the recommended guideline.',
                  kpi1Val:     tds.toFixed(1) + '%',
                  kpi1Label:   'Current TDS',
                  kpi1Icon:    'activity' as LIcon,
                  kpi2Val:     '44%',
                  kpi2Label:   'Guideline',
                  kpi2Icon:    'activity' as LIcon,
                };
              }
            }
            // Lever 3: Term compression — amort 25 or 30, no extra payment
            const amortYrs = parseInt(form.amortization);
            if ((amortYrs === 25 || amortYrs === 30) && parseN(form.extraPayment) === 0) {
              if (amortYrs === 30) {
                // 30yr → 25yr: use pre-computed scenario25
                const intSaved = results.scenario30.totalInterest - results.scenario25.totalInterest;
                return {
                  bigNum:      fmtCAD(Math.max(0, intSaved)),
                  mainLabel:   'total interest saved',
                  supportCopy: 'Shortening the mortgage term may reduce total interest, but increases the monthly payment.',
                  kpi1Val:     fmtCADx(results.scenario25.monthlyPayment - results.scenario30.monthlyPayment) + '/mo',
                  kpi1Label:   'Higher payment',
                  kpi1Icon:    'dollar'   as LIcon,
                  kpi2Val:     '5 yrs',
                  kpi2Label:   'Faster payoff',
                  kpi2Icon:    'calendar' as LIcon,
                };
              } else {
                // 25yr → 20yr: compute inline
                const m20      = calcPayment(results.loanAmount, monthlyRateCA(rate), 240);
                const int25    = results.totalInterest;
                const int20    = Math.max(0, m20 * 240 - results.loanAmount);
                const intSaved = Math.max(0, int25 - int20);
                return {
                  bigNum:      fmtCAD(intSaved),
                  mainLabel:   'total interest saved',
                  supportCopy: 'Shortening the mortgage term may reduce total interest, but increases the monthly payment.',
                  kpi1Val:     fmtCADx(m20 - results.baseMonthlyPI) + '/mo',
                  kpi1Label:   'Higher payment',
                  kpi1Icon:    'dollar'   as LIcon,
                  kpi2Val:     '5 yrs',
                  kpi2Label:   'Faster payoff',
                  kpi2Icon:    'calendar' as LIcon,
                };
              }
            }
            // Lever 4: Scaled extra payment fallback — 5% of P&I, rounded to nearest $50
            const smartExtra = Math.max(100, Math.round(results.baseMonthlyPI * 0.05 / 50) * 50);
            const smartSched = buildSchedule(results.loanAmount, monthlyRateCA(rate), parseInt(form.amortization) * 12, parseN(form.extraPayment) + smartExtra);
            const smartIntSaved = Math.max(0, results.totalInterest - smartSched.reduce((s, r) => s + r.interestPaid, 0));
            const smartYrsSaved = Math.max(0, results.schedule.length - smartSched.length);
            return {
              bigNum:      fmtCAD(smartIntSaved),
              mainLabel:   'potential interest savings',
              supportCopy: 'Adding an extra monthly payment may shorten your mortgage and reduce total interest.',
              kpi1Val:     fmtCADx(smartExtra) + '/mo',
              kpi1Label:   'Extra payment',
              kpi1Icon:    'dollar'   as LIcon,
              kpi2Val:     smartYrsSaved > 0 ? smartYrsSaved * 12 + ' mo' : '< 1 yr',
              kpi2Label:   'Earlier payoff',
              kpi2Icon:    'calendar' as LIcon,
            };
          })();

          return (
          <div id="expert-analysis" className="scroll-mt-[78px] md:scroll-mt-[88px] overflow-hidden" style={{ ...cardStyle, padding: 0 }}>

            {/* ── Header: dark navy, pill buttons ── */}
            <div
              className="px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)', paddingTop: 16, paddingBottom: 16, gap: 12 }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,181,132,0.18)' }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: '#1DB584' }} aria-hidden="true" />
                </span>
                <p className="text-white text-lg md:text-xl font-bold tracking-tight">FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Mortgage Analysis</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={!results || pdfGenerating}
                    aria-disabled={!results || pdfGenerating}
                    title={!results ? 'Enter mortgage details to generate a report' : 'Download PDF report'}
                    className="inline-flex items-center gap-1.5"
                    style={{
                      background: '#1DB584', color: '#ffffff', borderRadius: 9999,
                      padding: '7px 16px', fontSize: '13px', fontWeight: 700,
                      opacity: (!results || pdfGenerating) ? 0.65 : 1,
                      cursor: (!results || pdfGenerating) ? 'not-allowed' : 'pointer',
                    }}>
                    <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {pdfGenerating ? 'Generating…' : 'Download PDF'}
                  </button>
                  {pdfError && (
                    <span style={{ fontSize: '11px', color: '#fca5a5' }}>{pdfError}</span>
                  )}
                </div>
                <button disabled aria-disabled="true" title="Coming soon" className="inline-flex items-center gap-1.5 cursor-not-allowed select-none"
                  style={{ border: '1.5px solid rgba(255,255,255,0.30)', color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700 }}>
                  <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Email Results · Soon
                </button>
              </div>
            </div>

            {/* ── Dashboard body ── */}
            <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

              {/* ── Hero row: Health Score + Smart Optimization ── */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">

                {/* Health Score card */}
                <div className="md:col-span-5 rounded-2xl p-3 flex flex-col" style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
                    <span className="text-sm font-bold text-slate-800">Mortgage Health Score<Tooltip text={incomeEntered ? "Scored on GDS ratio (32% guideline), TDS ratio (44% guideline), and down payment. For guidance only." : "Add annual income to include GDS/TDS in your score. Currently scored on down payment, CMHC insurance status, and rate only."} /></span>

                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    {/* SVG gauge — responsive: 160px mobile, 220px desktop */}
                    <div className="ca-health-gauge relative shrink-0" style={{ width: 160, height: 160 }}>
                      <svg className="ca-health-gauge-svg" width="160" height="160" viewBox="0 0 140 140" style={{ display: 'block' }} aria-hidden="true">
                        <circle cx="70" cy="70" r={GR} fill="none"
                          stroke="rgba(15,41,66,0.09)" strokeWidth="11" strokeLinecap="round"
                          strokeDasharray={`${GARC} ${GC - GARC}`}
                          transform="rotate(150, 70, 70)"
                        />
                        <circle cx="70" cy="70" r={GR} fill="none"
                          stroke={hColor} strokeWidth="11" strokeLinecap="round"
                          strokeDasharray={`${GFIL} ${GC - GFIL}`}
                          transform="rotate(150, 70, 70)"
                          style={{ transition: 'stroke-dasharray 0.9s ease' }}
                        />
                      </svg>
                      {/* Score centered in arc */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 16 }}>
                        <span style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 800, color: '#0D1B2A', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{hScore}</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1.6 }}>/100</span>
                      </div>
                      {/* Label at bottom of arc gap */}
                      <div className="absolute bottom-0 left-0 right-0 flex justify-center" style={{ paddingBottom: 12 }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: hColor, letterSpacing: '0.02em' }}>{hLabel}</span>
                      </div>
                    </div>
                    {/* Copy */}
                    <div className="min-w-0">
                      <p className="text-slate-800 font-bold text-sm leading-snug mb-2">{hTitle}</p>
                      <p className="text-slate-500 text-xs leading-relaxed">{hCopy}</p>
                    </div>
                  </div>
                </div>

                {/* Smart Optimization dark card */}
                <div className="md:col-span-7 rounded-2xl p-3 flex flex-col"
                  style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                  {/* Plain teal header */}
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
                    <span className="text-sm font-bold" style={{ color: '#1DB584' }}>Smart Optimization Found</span>
                  </div>
                  {/* ── Mobile layout: vertical stack ── */}
                  <div className="ca-smart-opt-mobile gap-3 mt-1">
                    {/* Big number full width */}
                    <div className="rounded-xl flex items-center justify-center px-4 py-3"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                      <span className="font-extrabold tabular-nums"
                        style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                        {lever.bigNum}
                      </span>
                    </div>
                    {/* Labels below big number */}
                    <div>
                      <p className="text-white font-semibold text-sm">{lever.mainLabel}</p>
                      <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{lever.supportCopy}</p>
                    </div>
                    {/* KPI boxes: 2-column grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                          {lever.kpi1Val}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {lever.kpi1Icon === 'dollar' ? <DollarSign className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" /> : <Activity className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />}
                          <span className="text-slate-400 text-xs">{lever.kpi1Label}</span>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                          {lever.kpi2Val}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {lever.kpi2Icon === 'calendar' ? <Calendar className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" /> : lever.kpi2Icon === 'trending' ? <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" /> : <Activity className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />}
                          <span className="text-slate-400 text-xs">{lever.kpi2Label}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-500 text-xs">Estimate based on current inputs — actual lender results may vary.</p>
                  </div>

                  {/* ── Desktop layout: horizontal three-box row ── */}
                  <style>{`
                    .ca-smart-opt-mobile { display: flex; flex-direction: column; }
                    .ca-smart-opt-desktop { display: none; }
                    @media (min-width: 768px) {
                      .ca-smart-opt-mobile { display: none !important; }
                      .ca-smart-opt-desktop { display: flex !important; flex-direction: column; }
                      .ca-health-gauge { width: 220px !important; height: 220px !important; }
                      .ca-health-gauge-svg { width: 220px !important; height: 220px !important; }
                    }
                    @media (min-width: 768px) and (max-width: 1023px) {
                      .ca-smart-opt-row { flex-wrap: wrap; }
                      .ca-smart-opt-row > *:first-child { flex: 0 0 100%; min-width: 0; }
                      .ca-smart-opt-row > *:not(:first-child) { flex: 1 1 0; min-width: 0; }
                    }
                  `}</style>
                  <div className="ca-smart-opt-desktop flex-1 justify-center gap-3">
                    <div className="ca-smart-opt-row flex items-stretch gap-3">
                      {/* Big number box */}
                      <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <span className="font-extrabold tabular-nums"
                          style={{ fontSize: 'clamp(2.1rem, 4vw, 2.85rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                          {lever.bigNum}
                        </span>
                      </div>
                      {/* KPI 1 box */}
                      <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 116 }}>
                        <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                          {lever.kpi1Val}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {lever.kpi1Icon === 'dollar' ? <DollarSign className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" /> : <Activity className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />}
                          <span className="text-slate-400 text-xs">{lever.kpi1Label}</span>
                        </div>
                      </div>
                      {/* KPI 2 box */}
                      <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 116 }}>
                        <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.2rem', lineHeight: 1.2 }}>
                          {lever.kpi2Val}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {lever.kpi2Icon === 'calendar' ? <Calendar className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" /> : lever.kpi2Icon === 'trending' ? <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" /> : <Activity className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />}
                          <span className="text-slate-400 text-xs">{lever.kpi2Label}</span>
                        </div>
                      </div>
                    </div>
                    {/* Labels */}
                    <div>
                      <p className="text-white font-semibold text-sm">{lever.mainLabel}</p>
                      <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{lever.supportCopy}</p>
                      <p className="text-slate-500 text-xs mt-1">Estimate based on current inputs — actual lender results may vary.</p>
                    </div>
                  </div>
                </div>

              </div>{/* end hero row */}

              {/* ── Supporting section: light surface, two columns ── */}
              <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">

                  {/* Left: Market Context + Affordability Ratios */}
                  <div className="md:col-span-5 p-4 md:p-5 flex flex-col gap-5" style={{ background: '#fafbfc' }}>

                    {/* Market Context */}
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>Market Context</p>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{getInsight()}</p>
                    </div>

                    {/* Affordability Ratios */}
                    {results.primaryRatio && results.secondaryRatio && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
                          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>Affordability Ratios</p>
                          <Info className="w-3 h-3 shrink-0 text-slate-400" aria-hidden="true" />
                        </div>
                        {/* Each ratio: own white mini-panel */}
                        <div className="flex flex-col gap-2.5">
                          {[results.primaryRatio, results.secondaryRatio].map((data) => {
                            const fillPct = Math.min((data.ratio / data.limit) * 100, 100);
                            const st = rStatus(data.ratio, data.limit);
                            return (
                              <div key={data.label} className="rounded-xl p-3.5"
                                style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                <div className="flex items-center justify-between mb-2.5 gap-2 flex-wrap">
                                  <div className="shrink-0">
                                    <span className="text-sm font-bold text-slate-800">{data.label}</span>
                                    <span className="text-slate-400 text-xs font-normal ml-1.5">({data.sublabel})</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                      style={{ background: st.bg, color: st.color }}>{st.label}</span>
                                    <span className="text-sm font-bold tabular-nums" style={{ color: st.color }}>{data.ratio.toFixed(1)}%</span>
                                    <span className="text-slate-300 text-xs">/ {data.limit}%</span>
                                  </div>
                                </div>
                                <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(15,41,66,0.07)' }}>
                                  <div className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${fillPct}%`, background: st.color }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2.5 px-0.5">
                          <Thermometer className="w-3 h-3 shrink-0 text-slate-400" aria-hidden="true" />
                          <p className="text-slate-400 text-xs italic">Heating est. $150/mo for GDS.</p>
                        </div>
                        <p className="text-slate-400 text-xs italic mt-1 px-0.5">
                          Estimated using your entered mortgage rate. Formal lender qualification may use a higher stress-test rate.
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Right: Expert Insights */}
                  <div className="md:col-span-7 p-4 md:p-5 flex flex-col gap-3" style={{ background: '#fafbfc' }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Star className="w-3.5 h-3.5 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>Expert Insights</p>
                    </div>

                    {/* Rate Shock */}
                    <div className="rounded-xl p-4" style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center shrink-0"
                          style={{ width: 28, height: 28, borderRadius: 8, background: '#fee2e2' }}>
                          <Zap className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-widest text-red-500">Rate Shock Analysis</p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        A 200-basis-point rate increase at renewal would raise your payment by{' '}
                        <strong className="text-red-600">{fmtCADx(results.rateShock.difference)}</strong> to{' '}
                        <strong className="text-red-600">{fmtCADx(results.rateShock.shockedPayment)}</strong> at{' '}
                        {results.rateShock.newRate.toFixed(2)}%. Maintaining this buffer ensures flexibility through rate cycles.
                      </p>
                    </div>

                    {/* Amortization Compression */}
                    <div className="rounded-xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center shrink-0"
                          style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                          <TrendingUp className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Amortization Compression</p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        Increasing your P&amp;I payment by{' '}
                        <strong className="text-sky-600">{fmtCADx(results.roundUp.extra)}/month</strong> to{' '}
                        <strong className="text-sky-600">{fmtCADx(results.roundUp.roundedPayment)}</strong>{' '}
                        {results.roundUp.yearsSaved > 0 ? (
                          <>delivers <strong className="text-sky-600">{results.roundUp.yearsSaved}-year</strong> amortization compression and saves <strong className="text-sky-600">{fmtCAD(results.roundUp.interestSaved)}</strong> in total interest.</>
                        ) : (
                          <>delivers an estimated <strong className="text-sky-600">{fmtCAD(results.roundUp.interestSaved)}</strong> reduction in total interest — minimal lifestyle impact, measurable long-term benefit.</>
                        )}
                      </p>
                    </div>

                    {/* Insurance Threshold */}
                    {results.insuranceThreshold ? (
                      <div className="rounded-xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex items-center justify-center shrink-0"
                            style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          </span>
                          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Insurance Threshold Opportunity</p>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          At <strong>{results.insuranceThreshold.currentDownPct.toFixed(1)}%</strong> down, you are within 2% of the CMHC-free threshold. An additional{' '}
                          <strong className="text-emerald-600">{fmtCAD(results.insuranceThreshold.amountNeeded)}</strong> eliminates{' '}
                          <strong className="text-emerald-600">{fmtCADx(results.insuranceThreshold.annualSavings / 12)}/month</strong> in CMHC costs — an effective{' '}
                          <strong className="text-emerald-600">{results.insuranceThreshold.instantReturn.toFixed(0)}% instant return</strong> on that incremental capital.
                        </p>
                      </div>
                    ) : results.downPct >= 20 ? (
                      <div className="rounded-xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex items-center justify-center shrink-0"
                            style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          </span>
                          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Insurance Threshold</p>
                        </div>
                        <p className="text-sm text-slate-700">Not applicable — your {results.downPct.toFixed(1)}% down payment exceeds the 20% CMHC threshold.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl p-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex items-center justify-center shrink-0"
                            style={{ width: 28, height: 28, borderRadius: 8, background: '#fef3c7' }}>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                          </span>
                          <p className="text-xs font-bold uppercase tracking-widest text-amber-600">CMHC Insurance Required</p>
                        </div>
                        <p className="text-sm text-slate-700">
                          Your {results.downPct.toFixed(1)}% down payment is below the 20% threshold — mortgage default insurance applies.
                        </p>
                      </div>
                    )}

                  </div>
                </div>
              </div>{/* end supporting section */}

            </div>{/* end dashboard body */}

            {/* ── Footer Disclaimer ── */}
            <div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
              style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
              <p className="text-slate-400 text-xs leading-relaxed">
                <strong className="text-slate-500 font-semibold">Disclaimer:</strong> This analysis is for illustrative purposes only and does not constitute financial, tax, or mortgage advice. Individual results will vary based on lender terms, credit profile, and market conditions. Consult a licensed mortgage professional before making financial decisions.
              </p>
            </div>

          </div>
          );
        })()}{/* end Block C */}

        {/* ── Block D: Full Amortization Schedule ──────────────────────────── */}
        {results && (
          <div style={cardStyle} className="p-5 md:p-6">
            <button
              onClick={() => setIsAmortizationExpanded((v) => !v)}
              className="flex justify-between items-center w-full group pb-3"
              style={{ borderBottom: '1px solid rgba(29,181,132,0.18)' }}
              aria-expanded={isAmortizationExpanded}
            >
              <span className="flex items-center gap-2.5 font-bold text-slate-900"
                style={{ fontSize: 'clamp(1.05rem, 4.5vw, 1.5rem)' }}>
                <Calendar className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
                Full Amortization Schedule
              </span>
              <svg
                className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isAmortizationExpanded ? 'rotate-180' : ''}`}
                style={{ color: '#1DB584' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {!isAmortizationExpanded && (
              <p className="mt-3 text-sm text-slate-500">
                {results.schedule.length}-year schedule · {fmtCAD(results.totalInterest)} total interest
              </p>
            )}

            {isAmortizationExpanded && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200">
                      <th className="pl-4 pr-4 py-2 md:py-3 text-slate-500 uppercase text-xs font-semibold text-left">Year</th>
                      <th className="pl-4 pr-4 py-2 md:py-3 text-slate-500 uppercase text-xs font-semibold text-right">Principal</th>
                      <th className="pl-4 pr-4 py-2 md:py-3 text-slate-500 uppercase text-xs font-semibold text-right">Interest</th>
                      <th className="pl-4 pr-6 py-2 md:py-3 text-slate-500 uppercase text-xs font-semibold text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.schedule.map((row) => (
                      <tr key={row.year} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="pl-4 pr-4 py-2 md:py-3 text-sm font-medium text-slate-900 text-left">{row.year}</td>
                        <td className="pl-4 pr-4 py-2 md:py-3 text-sm text-slate-700 text-right">{fmtCAD(row.principalPaid)}</td>
                        <td className="pl-4 pr-4 py-2 md:py-3 text-sm text-rose-600 text-right">{fmtCAD(row.interestPaid)}</td>
                        <td className="pl-4 pr-6 py-2 md:py-3 text-sm text-slate-700 text-right">{fmtCAD(row.endBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}{/* end Block D */}

        {/* ── Block F: How It Works ─────────────────────────────────────────── */}
        {formulaContent && (
          <div style={cardStyle} className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
              How It Works
            </h2>
            <div className="space-y-4 text-sm md:text-base text-slate-600 leading-relaxed">
              {formulaContent}
            </div>
          </div>
        )}

        {/* ── Block G: FAQ ─────────────────────────────────────────────────── */}
        {faqItems.length > 0 && (
          <div style={cardStyle} className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
              Frequently Asked Questions
            </h2>
            <CalculatorFaqAccordion faqs={faqItems} />
          </div>
        )}

        {/* ── Footer Disclaimer ─────────────────────────────────────────────── */}
        <Disclaimer />

        </div>
      </div>{/* end lower sections */}
    </>
  );
}
