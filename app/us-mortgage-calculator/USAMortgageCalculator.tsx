'use client';

import { useState, useMemo, type ReactNode } from 'react';
import {
  monthlyRateUS, calcPayment, buildSchedule, parseN,
  fmtUSD, fmtUSDx, freqPayment, freqLabel,
  type Frequency, type ScheduleRow, type ScenarioData,
} from '../_mortgage-shared/math';
import {
  NumericInput, Tooltip, DonutChart, Disclaimer,
  type PieSlice,
} from '../_mortgage-shared/ui';
import {
  type RateShockData, type RoundUpData,
  type InsuranceThresholdData, type RatioData,
} from '../_mortgage-shared/InsightPanel';
import { inputCls, type Faq } from '@/components/layout/CalculatorLayout';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import {
  Calendar, Sparkles, Download, Mail,
  Activity, DollarSign,
  Globe, BarChart2, Info, Star,
  Zap, TrendingUp, ShieldCheck, AlertTriangle, ShieldAlert,
  BookOpen, HelpCircle,
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
  hoaFee: string;
  pmiRate: string;
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
  monthlyHoa: number;
  monthlyPmi: number;
  totalMonthly: number;
  totalInterest: number;
  totalPayment: number;
  schedule: ScheduleRow[];
  scenario15: ScenarioData;
  scenario20: ScenarioData;
  scenario30: ScenarioData;
  pmiRequiredUntilYear: number | null;
  rateShock: RateShockData;
  roundUp: RoundUpData;
  insuranceThreshold: InsuranceThresholdData | null;
  primaryRatio: RatioData;
  secondaryRatio: RatioData;
}

// ─── Tooltips ─────────────────────────────────────────────────────────────────

const TOOLTIPS = {
  homePrice: 'The total purchase price of the property. Conforming loan limits for 2026 are $832,750 for most US counties; higher-cost areas may qualify for up to $1,249,125 (per FHFA).',
  downPayment: 'Conventional loans: minimum 3% (with PMI) or 20% (no PMI). FHA loans: 3.5% minimum. VA/USDA loans: 0% down for eligible borrowers. Putting 20%+ down eliminates PMI entirely.',
  interestRate: 'The annual percentage rate (APR) from your lender. US mortgages use standard monthly compounding. The 30-year fixed rate is the most common product in the US market.',
  amortization: 'The 30-year fixed-rate mortgage is the US standard. 15-year mortgages have higher payments but much lower total interest. 20-year is a solid middle ground.',
  frequency: 'Bi-weekly payments (26×/year) can shave years off your loan. Accelerated bi-weekly = monthly payment ÷ 2 paid every two weeks, equivalent to one extra payment per year.',
  extraPayment: 'Conventional loans have no prepayment penalty. Extra payments applied to principal directly reduce your interest and shorten your loan term.',
  propertyTax: 'US property tax rates vary widely by state. Texas and Illinois average ~1.6–1.9%; Hawaii and Alabama average ~0.3–0.4%. Your county assessor sets the actual rate.',
  homeInsurance: 'Required by all US mortgage lenders (homeowners insurance / hazard insurance). National average: $1,200–$2,400/year. Higher in hurricane/flood zones.',
  hoaFee: 'Homeowners Association fee for condos, townhomes, and planned communities. Typically $200–$600/month; luxury buildings may exceed $1,000/month.',
  pmiRate: "Private Mortgage Insurance (PMI) is required on conventional loans with less than 20% down. Typical rates: 0.2%–1.5% of loan amount per year, depending on credit score and LTV. PMI can be removed when your equity reaches 20%.",
  grossIncome: 'Annual gross household income before taxes. Used to calculate your Front-End and Back-End DTI ratios per the 28/36 rule. Leave blank to skip affordability gauges.',
  otherDebts: 'Total monthly payments on all non-housing debts: car loans, student loans, credit cards (minimum payment), personal loans. Used for Back-End DTI calculation.',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(15,41,66,0.09)',
  borderRadius: '20px',
  background: '#ffffff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.03)',
};

const sectionHeading = 'text-base font-bold';
const sectionHeadingColor = '#0D1B2A';

const inputClsCompact = inputCls
  .replace('py-2.5', 'py-1 md:py-2')
  .replace('px-3', 'pr-2 md:pr-3 pl-3') + ' placeholder:text-brand-gray-400';
const navyLabelStyle: React.CSSProperties = {
  fontWeight: 700, color: '#0D1B2A',
  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4,
};
const navyLabelCls = 'text-[10px] md:text-xs';

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  homePrice: '450000',
  downPayment: '90000',
  downPaymentMode: 'amount',
  interestRate: '6.75',
  amortization: '30',
  frequency: 'monthly',
  extraPayment: '0',
  propertyTax: '5400',
  homeInsurance: '1800',
  hoaFee: '0',
  pmiRate: '0.5',
  grossIncome: '',
  otherDebts: '0',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function USAMortgageCalculator({
  formulaContent,
  faqItems = [],
}: {
  formulaContent?: ReactNode;
  faqItems?: Faq[];
}) {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [isAmortizationExpanded, setIsAmortizationExpanded] = useState(false);
  const [breakdownView, setBreakdownView] = useState<'monthly' | 'yearly'>('monthly');
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [showAffordability, setShowAffordability] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  // ── Results (all US math logic preserved exactly) ─────────────────────────
  const results = useMemo<Results | null>(() => {
    const homePrice = parseN(form.homePrice);
    const dpAmt = form.downPaymentMode === 'amount'
      ? parseN(form.downPayment)
      : homePrice * (parseN(form.downPayment) / 100);
    const rate = parseN(form.interestRate);
    const years = parseInt(form.amortization) || 30;
    const months = years * 12;
    const extra = parseN(form.extraPayment);

    if (homePrice <= 0 || dpAmt < 0 || rate <= 0 || dpAmt >= homePrice) return null;

    const downPct = (dpAmt / homePrice) * 100;
    const loanAmount = homePrice - dpAmt;
    const mRate = monthlyRateUS(rate);
    const baseMonthlyPI = calcPayment(loanAmount, mRate, months);
    const displayPayment = freqPayment(baseMonthlyPI, form.frequency);

    const monthlyTax = parseN(form.propertyTax) / 12;
    const monthlyInsurance = parseN(form.homeInsurance) / 12;
    const monthlyHoa = parseN(form.hoaFee);
    const pmiRateVal = parseN(form.pmiRate);
    const monthlyPmi = downPct < 20 ? (loanAmount * pmiRateVal / 100) / 12 : 0;
    const totalMonthly = baseMonthlyPI + monthlyTax + monthlyInsurance + monthlyHoa + monthlyPmi;

    const schedule = buildSchedule(loanAmount, mRate, months, extra);
    const totalInterest = schedule.reduce((s, r) => s + r.interestPaid, 0);

    let pmiRequiredUntilYear: number | null = null;
    if (downPct < 20) {
      const threshold80 = homePrice * 0.8;
      for (const row of schedule) {
        if (row.endBalance <= threshold80) {
          pmiRequiredUntilYear = row.year;
          break;
        }
      }
    }

    const m15 = calcPayment(loanAmount, mRate, 180);
    const m20 = calcPayment(loanAmount, mRate, 240);
    const m30 = calcPayment(loanAmount, mRate, 360);

    const shockedMRate = monthlyRateUS(rate + 2);
    const shockedPayment = calcPayment(loanAmount, shockedMRate, months);
    const rateShock: RateShockData = {
      currentPayment: baseMonthlyPI,
      shockedPayment,
      difference: shockedPayment - baseMonthlyPI,
      newRate: rate + 2,
    };

    const fixedExtra = 100;
    const roundSchedule = buildSchedule(loanAmount, mRate, months, extra + fixedExtra);
    const roundInterest = roundSchedule.reduce((s, r) => s + r.interestPaid, 0);
    const roundUp: RoundUpData = {
      extra: fixedExtra,
      roundedPayment: baseMonthlyPI + fixedExtra,
      yearsSaved: Math.max(0, schedule.length - roundSchedule.length),
      interestSaved: Math.max(0, totalInterest - roundInterest),
    };

    let insuranceThreshold: InsuranceThresholdData | null = null;
    if (downPct >= 18 && downPct < 20) {
      const amountNeeded = homePrice * 0.2 - dpAmt;
      const annualSavings = monthlyPmi * 12;
      if (amountNeeded > 0 && annualSavings > 0) {
        const instantReturn = (annualSavings / amountNeeded) * 100;
        insuranceThreshold = {
          type: 'PMI',
          amountNeeded,
          annualSavings,
          instantReturn,
          currentDownPct: downPct,
        };
      }
    }

    const grossIncome = parseN(form.grossIncome);
    const otherDebts = parseN(form.otherDebts);
    const ASSUMED_ANNUAL_INCOME = 120_000;
    const effectiveAnnualIncome = grossIncome > 0 ? grossIncome : ASSUMED_ANNUAL_INCOME;
    const monthlyIncome = effectiveAnnualIncome / 12;
    const frontEndTotal = baseMonthlyPI + monthlyTax + monthlyInsurance + monthlyPmi + monthlyHoa;
    const frontEndDTI = (frontEndTotal / monthlyIncome) * 100;
    const backEndDTI = ((frontEndTotal + otherDebts) / monthlyIncome) * 100;
    const primaryRatio: RatioData = { ratio: frontEndDTI, limit: 28, label: 'Front-End DTI', sublabel: 'Housing costs / income' };
    const secondaryRatio: RatioData = { ratio: backEndDTI, limit: 36, label: 'Back-End DTI', sublabel: 'All debts / income' };

    return {
      loanAmount, downPaymentAmount: dpAmt, downPct,
      baseMonthlyPI, displayPayment,
      monthlyTax, monthlyInsurance, monthlyHoa, monthlyPmi,
      totalMonthly, totalInterest,
      totalPayment: loanAmount + totalInterest,
      schedule, pmiRequiredUntilYear,
      scenario15: { years: 15, monthlyPayment: m15, totalInterest: m15 * 180 - loanAmount },
      scenario20: { years: 20, monthlyPayment: m20, totalInterest: m20 * 240 - loanAmount },
      scenario30: { years: 30, monthlyPayment: m30, totalInterest: m30 * 360 - loanAmount },
      rateShock, roundUp, insuranceThreshold, primaryRatio, secondaryRatio,
    };
  }, [form]);

  const pieSlices: PieSlice[] = results ? [
    { label: 'Principal & Interest', value: results.baseMonthlyPI,    color: '#1DB584', alwaysShow: true },
    { label: 'Property Tax',         value: results.monthlyTax,        color: '#f59e0b' },
    { label: 'Home Insurance',       value: results.monthlyInsurance,  color: '#8b5cf6' },
    { label: 'HOA Fee',              value: results.monthlyHoa,        color: '#0ea5e9' },
    { label: 'PMI',                  value: results.monthlyPmi,        color: '#f43f5e' },
  ] : [];

  function getInsight(): string {
    if (!results) return '';
    const { downPct, totalInterest, loanAmount, monthlyPmi, pmiRequiredUntilYear } = results;
    if (downPct < 20 && monthlyPmi > 0) {
      const toReach20 = parseN(form.homePrice) * 0.2 - results.downPaymentAmount;
      const pmiYears = pmiRequiredUntilYear ?? parseInt(form.amortization);
      return `PMI adds ${fmtUSDx(monthlyPmi)}/month to your payment and drops automatically around year ${pmiYears} when your balance reaches 80% LTV. Adding ${fmtUSD(Math.ceil(toReach20))} to your down payment eliminates PMI entirely from day one.`;
    }
    const ratio = (totalInterest / loanAmount) * 100;
    if (parseN(form.interestRate) > 7) {
      return `At ${form.interestRate}%, you'll pay ${fmtUSD(totalInterest)} in total interest (${ratio.toFixed(0)}% of your loan). Consider refinancing if rates drop 0.75%+ — that break-even typically arrives in 18–24 months for most borrowers.`;
    }
    return `Your ${form.interestRate}% rate means ${fmtUSD(totalInterest)} in total interest over ${form.amortization} years. One extra payment per year reduces a 30-year mortgage to roughly 25 years and saves approximately ${fmtUSD(Math.round(totalInterest * 0.15))}.`;
  }

  async function handleDownloadPDF() {
    if (!results || pdfGenerating) return;
    setPdfGenerating(true);
    setPdfError(null);
    try {
      const { buildUSMortgagePDF } = await import('@/lib/pdf/adapters/mortgageAdapter');

      // Replicate health score computation (mirrors the render IIFE exactly)
      const incomeEntered = parseN(form.grossIncome) > 0;
      const fe   = results.primaryRatio?.ratio   ?? 0;
      const be   = results.secondaryRatio?.ratio ?? 0;
      const dp   = results.downPct;
      const rate = parseN(form.interestRate);

      let hScore: number;
      let hTitle: string;
      let hCopy: string;

      if (incomeEntered) {
        const feScore = fe <= 28 ? 40 : fe <= 32 ? 32 : fe <= 36 ? 22 : Math.max(5, Math.round(40 - (fe - 28) * 1.5));
        const beScore = be <= 36 ? 40 : be <= 43 ? 30 : be <= 50 ? 15 : 5;
        const dpScore = dp >= 20 ? 20 : dp >= 15 ? 15 : dp >= 10 ? 10 : 5;
        hScore = Math.round(Math.min(100, Math.max(0, feScore + beScore + dpScore)));
        const mInc = parseN(form.grossIncome) / 12;
        if (fe > 28) {
          const feCeiling = fmtUSDx(Math.round(0.28 * mInc));
          hTitle = 'Front-end DTI is the main pressure point.';
          hCopy  = `Your housing costs exceed the 28% front-end guideline (${feCeiling}/mo ceiling). Consider a lower purchase price, a larger down payment, or a lower rate.`;
        } else if (be > 36) {
          const beGap = fmtUSDx(Math.ceil(((results.secondaryRatio.ratio - 36) / 100) * mInc));
          hTitle = 'Other debts are adding pressure.';
          hCopy  = `Back-end DTI is ${results.secondaryRatio.ratio.toFixed(1)}%. Reducing monthly obligations by ~${beGap} would bring you within the 36% back-end guideline.`;
        } else if (dp < 10) {
          hTitle = 'Low down payment is the primary risk.';
          hCopy  = 'DTI ratios are within guideline, but your equity cushion is thin. PMI applies and a market dip could put you underwater. Reaching 10% down materially reduces exposure.';
        } else if (results.monthlyPmi > 0) {
          hTitle = 'Good profile — PMI is the remaining cost to watch.';
          hCopy  = `DTI ratios are healthy. PMI of ${fmtUSDx(results.monthlyPmi)}/mo drops automatically around year ${results.pmiRequiredUntilYear ?? parseInt(form.amortization)}.`;
        } else {
          hTitle = 'Strong position across all signals.';
          hCopy  = 'DTI ratios, down payment, and PMI status are all within healthy ranges.';
        }
      } else {
        const dpScore  = dp >= 20 ? 40 : dp >= 15 ? 30 : dp >= 10 ? 20 : 10;
        const pmiScore = results.monthlyPmi === 0 ? 35
          : (results.pmiRequiredUntilYear !== null && results.pmiRequiredUntilYear <= 5) ? 25
          : 10;
        const rateScore = rate <= 6 ? 25 : rate <= 7 ? 18 : rate <= 8 ? 10 : 5;
        hScore = Math.round(Math.min(100, Math.max(0, dpScore + pmiScore + rateScore)));
        if (dp < 10) {
          hTitle = 'Low down payment is the primary risk.';
          hCopy  = 'PMI applies and your equity cushion is thin. Add annual income above to include DTI analysis in this score.';
        } else if (results.monthlyPmi > 0) {
          hTitle = `PMI adds ${fmtUSDx(results.monthlyPmi)}/mo to your payment.`;
          hCopy  = 'Score based on down payment, PMI, and rate. Add your annual income to include DTI analysis.';
        } else {
          hTitle = 'Score based on down payment, PMI, and rate.';
          hCopy  = 'Add your annual income above to include full DTI analysis in this score.';
        }
      }

      const hLabel = (hScore >= 80 ? 'Excellent' : hScore >= 65 ? 'Good' : hScore >= 50 ? 'Fair' : hScore >= 35 ? 'Manageable' : 'Needs Attention') as
        'Excellent' | 'Good' | 'Fair' | 'Manageable' | 'Needs Attention';

      await buildUSMortgagePDF({
        homePrice:            parseN(form.homePrice),
        downPaymentAmount:    results.downPaymentAmount,
        downPct:              results.downPct,
        interestRate:         rate,
        loanTermYears:        parseInt(form.amortization) || 30,
        frequency:            form.frequency,
        extraPayment:         parseN(form.extraPayment),
        propertyTaxAnnual:    parseN(form.propertyTax),
        homeInsuranceAnnual:  parseN(form.homeInsurance),
        hoaFeeMonthly:        parseN(form.hoaFee),
        pmiRateAnnual:        results.monthlyPmi > 0 ? parseN(form.pmiRate) : 0,
        incomeEntered,
        grossIncome:          parseN(form.grossIncome),
        otherDebts:           parseN(form.otherDebts),
        loanAmount:           results.loanAmount,
        baseMonthlyPI:        results.baseMonthlyPI,
        displayPayment:       results.displayPayment,
        monthlyTax:           results.monthlyTax,
        monthlyInsurance:     results.monthlyInsurance,
        monthlyHoa:           results.monthlyHoa,
        monthlyPmi:           results.monthlyPmi,
        totalMonthly:         results.totalMonthly,
        totalInterest:        results.totalInterest,
        totalPayment:         results.totalPayment,
        pmiRequiredUntilYear: results.pmiRequiredUntilYear,
        healthScore:          hScore,
        healthLabel:          hLabel,
        healthTitle:          hTitle,
        healthCopy:           hCopy,
        frontEndDTI:          incomeEntered ? results.primaryRatio.ratio   : null,
        backEndDTI:           incomeEntered ? results.secondaryRatio.ratio  : null,
        rateShockNewRate:     results.rateShock.newRate,
        rateShockDifference:  results.rateShock.difference,
        roundUpYearsSaved:    results.roundUp.yearsSaved,
        roundUpInterestSaved: results.roundUp.interestSaved,
        pmiThresholdAmountNeeded:   results.insuranceThreshold?.amountNeeded  ?? null,
        pmiThresholdAnnualSavings:  results.insuranceThreshold?.annualSavings ?? null,
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

  const scenarioPairs = results
    ? [results.scenario15, results.scenario20, results.scenario30]
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ══ WORKSPACE: gradient zone — Blocks A + B ══════════════════════════ */}
      <div className="pb-0">
        <div className="flex flex-col gap-y-7 md:gap-y-8 min-w-0">

          {/* ── Block A: Input Card (7) + Dark Navy Results Card (5) ─────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

            {/* ── Input Card ─────────────────────────────────────────────────── */}
            <div className="lg:col-span-7" style={cardStyle}>
              <div className="p-5 md:p-6">

                {/* Card header */}
                <div className="flex items-center gap-3 mb-4 md:mb-5">
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: 'linear-gradient(135deg,#1DB584 0%,#17a070 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(29,181,132,0.30)',
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden="true">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                      US Mortgage
                    </p>
                    <p className={sectionHeading} style={{ color: sectionHeadingColor }}>Mortgage Details</p>
                  </div>
                </div>

                {/* Internal 2-col grid */}
                <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

                  {/* ── LEFT: Core inputs ────────────────────────────────────── */}
                  <div className="space-y-3 min-w-0">

                    <div>
                      <label className={navyLabelCls} style={navyLabelStyle}>
                        Home Price <Tooltip text={TOOLTIPS.homePrice} />
                      </label>
                      <NumericInput
                        value={form.homePrice}
                        onChange={(v) => set('homePrice', v)}
                        prefix="$"
                        inputClassName={inputClsCompact}
                      />
                    </div>

                    <div>
                      <label className={navyLabelCls} style={navyLabelStyle}>
                        Down Payment <Tooltip text={TOOLTIPS.downPayment} />
                      </label>
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
                            : fmtUSD(results.downPaymentAmount)}
                          {results.downPct < 20 && (
                            <span className="ml-2 font-medium" style={{ color: '#C9A84C' }}>· PMI required</span>
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={navyLabelCls} style={navyLabelStyle}>
                        Annual Interest Rate <Tooltip text={TOOLTIPS.interestRate} />
                      </label>
                      <NumericInput
                        value={form.interestRate}
                        onChange={(v) => set('interestRate', v)}
                        suffix="%"
                        inputClassName={inputClsCompact}
                      />
                    </div>

                    <div>
                      <label className={navyLabelCls} style={navyLabelStyle}>
                        Loan Term <Tooltip text={TOOLTIPS.amortization} />
                      </label>
                      <select
                        value={form.amortization}
                        onChange={(e) => set('amortization', e.target.value)}
                        className={inputClsCompact}
                      >
                        {[10, 15, 20, 25, 30].map((y) => (
                          <option key={y} value={String(y)}>
                            {y} years{y === 30 ? ' (standard)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={navyLabelCls} style={navyLabelStyle}>
                        Payment Frequency <Tooltip text={TOOLTIPS.frequency} />
                      </label>
                      <select
                        value={form.frequency}
                        onChange={(e) => set('frequency', e.target.value as Frequency)}
                        className={inputClsCompact}
                      >
                        <option value="monthly">Monthly (12×/year)</option>
                        <option value="biweekly">Bi-Weekly (26×/year)</option>
                        <option value="accelerated-biweekly">Accelerated Bi-Weekly ⚡</option>
                      </select>
                    </div>

                  </div>{/* end left column */}

                  {/* ── RIGHT: Advanced costs + Affordability ────────────────── */}
                  <div
                    className="border-l pl-2 md:pl-5 space-y-3 min-w-0"
                    style={{ borderColor: 'rgba(15,41,66,0.08)' }}
                  >

                    <div>
                      <label className={navyLabelCls} style={navyLabelStyle}>
                        Extra Monthly Payment <Tooltip text={TOOLTIPS.extraPayment} />
                      </label>
                      <NumericInput
                        value={form.extraPayment}
                        onChange={(v) => set('extraPayment', v)}
                        prefix="$"
                        inputClassName={inputClsCompact}
                      />
                    </div>

                    <div>
                      <label className={navyLabelCls} style={navyLabelStyle}>
                        Annual Property Tax <Tooltip text={TOOLTIPS.propertyTax} />
                      </label>
                      <NumericInput
                        value={form.propertyTax}
                        onChange={(v) => set('propertyTax', v)}
                        prefix="$"
                        inputClassName={inputClsCompact}
                      />
                    </div>

                    <div>
                      <label className={navyLabelCls} style={navyLabelStyle}>
                        Annual Home Insurance <Tooltip text={TOOLTIPS.homeInsurance} />
                      </label>
                      <NumericInput
                        value={form.homeInsurance}
                        onChange={(v) => set('homeInsurance', v)}
                        prefix="$"
                        inputClassName={inputClsCompact}
                      />
                    </div>

                    <div>
                      <label className={navyLabelCls} style={navyLabelStyle}>
                        Monthly HOA Fee <Tooltip text={TOOLTIPS.hoaFee} />
                      </label>
                      <NumericInput
                        value={form.hoaFee}
                        onChange={(v) => set('hoaFee', v)}
                        prefix="$"
                        inputClassName={inputClsCompact}
                      />
                    </div>

                    {/* PMI — visible only when downPct < 20% */}
                    {results && results.downPct < 20 && (
                      <div className="rounded-xl p-2.5" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)' }}>
                        <label className={navyLabelCls} style={{ ...navyLabelStyle, color: '#92400e' }}>
                          PMI Rate (Annual) <Tooltip text={TOOLTIPS.pmiRate} />
                        </label>
                        <NumericInput
                          value={form.pmiRate}
                          onChange={(v) => set('pmiRate', v)}
                          suffix="%"
                          inputClassName={inputClsCompact}
                        />
                        <p className="mt-1 text-[10px]" style={{ color: '#b45309' }}>
                          ≈ {fmtUSDx(results.monthlyPmi)}/mo · request cancellation at 80% LTV
                          {results.pmiRequiredUntilYear ? ` (~yr ${results.pmiRequiredUntilYear})` : ''}
                        </p>
                      </div>
                    )}

                    {/* Affordability analysis panel */}
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
                            Enables 28/36 DTI gauge in AI insights
                          </span>
                        </div>
                      </label>
                      {showAffordability && (
                        <div className="mt-2.5 space-y-2.5">
                          <div>
                            <label className={navyLabelCls} style={navyLabelStyle}>
                              Annual Gross Household Income <Tooltip text={TOOLTIPS.grossIncome} />
                            </label>
                            <NumericInput
                              value={form.grossIncome}
                              onChange={(v) => set('grossIncome', v)}
                              prefix="$"
                              inputClassName={inputClsCompact}
                              placeholder="e.g. 120,000"
                            />
                          </div>
                          <div>
                            <label className={navyLabelCls} style={navyLabelStyle}>
                              Other Monthly Debt Payments <Tooltip text={TOOLTIPS.otherDebts} />
                            </label>
                            <NumericInput
                              value={form.otherDebts}
                              onChange={(v) => set('otherDebts', v)}
                              prefix="$"
                              inputClassName={inputClsCompact}
                              placeholder="e.g. 500"
                            />
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

            {/* ── Dark Navy Results Card ──────────────────────────────────────── */}
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

                    {/* Glassy box: big payment number */}
                    <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                        Estimated {freqLabel(form.frequency)} payment
                      </p>
                      <p style={{ color: '#1DB584', fontSize: '46px', fontWeight: 800, letterSpacing: '-2.5px', lineHeight: 1, marginTop: 8 }}>
                        {fmtUSDx(freqPayment(results.totalMonthly, form.frequency))}
                      </p>
                      {results.monthlyPmi > 0 && (
                        <p style={{ color: '#C9A84C', fontSize: '11.5px', fontWeight: 600, marginTop: 6 }}>
                          Incl. {fmtUSDx(results.monthlyPmi)}/mo PMI · request cancellation at 80% LTV
                          {results.pmiRequiredUntilYear ? ` (~yr ${results.pmiRequiredUntilYear})` : ''}
                        </p>
                      )}
                    </div>

                    {/* Monthly breakdown dot list */}
                    <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                      {[
                        { label: 'Principal & Interest', value: freqPayment(results.baseMonthlyPI,   form.frequency), dot: '#1DB584' },
                        ...(results.monthlyTax       > 0 ? [{ label: 'Property Tax',   value: freqPayment(results.monthlyTax,       form.frequency), dot: '#f59e0b' }] : []),
                        ...(results.monthlyInsurance > 0 ? [{ label: 'Home Insurance', value: freqPayment(results.monthlyInsurance, form.frequency), dot: '#8b5cf6' }] : []),
                        ...(results.monthlyHoa       > 0 ? [{ label: 'HOA Fee',        value: freqPayment(results.monthlyHoa,       form.frequency), dot: '#0ea5e9' }] : []),
                        ...(results.monthlyPmi       > 0 ? [{ label: 'PMI',            value: freqPayment(results.monthlyPmi,       form.frequency), dot: '#f43f5e' }] : []),
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-1.5"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div className="flex items-center gap-2.5"
                            style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.dot, width: 8, height: 8, borderRadius: 9999, flexShrink: 0 }} />
                            <span className="text-[13px] text-slate-300">{item.label}</span>
                          </div>
                          <span className="text-[13px] font-semibold text-white">{fmtUSDx(item.value)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Divider */}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                    {/* Loan summary */}
                    <div className="px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                      <div className="flex items-center justify-between py-1.5"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="text-[13px] text-slate-400">Loan Amount</span>
                        <span className="text-[13px] font-semibold text-white">{fmtUSD(results.loanAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="text-[13px]" style={{ color: '#C9A84C' }}>Total Interest</span>
                        <span className="text-[13px] font-semibold" style={{ color: '#C9A84C' }}>{fmtUSD(results.totalInterest)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="text-[13px] text-slate-300 font-medium">Total Cost</span>
                        <span className="text-[13px] font-bold text-white">{fmtUSD(results.totalPayment)}</span>
                      </div>
                    </div>

                    <div className="flex-1" />

                    {/* AI CTA button */}
                    <style>{`
                      @keyframes teal-glow-pulse {
                        0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
                        50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
                      }
                      .btn-ai-cta-us {
                        animation: teal-glow-pulse 2.8s ease-in-out infinite;
                        transition: transform 180ms ease, box-shadow 180ms ease;
                      }
                      .btn-ai-cta-us:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
                        animation: none;
                      }
                    `}</style>
                    <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                        Want to understand where your money goes?
                      </p>
                      <button
                        onClick={() => document.getElementById('expert-analysis')?.scrollIntoView({ behavior: 'smooth' })}
                        onMouseEnter={() => setAiCtaHovered(true)}
                        onMouseLeave={() => setAiCtaHovered(false)}
                        className="btn-ai-cta-us w-full font-bold overflow-hidden"
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
                        <span style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          whiteSpace: 'nowrap',
                          opacity: aiCtaHovered ? 0 : 1,
                          transition: 'opacity 200ms ease',
                          pointerEvents: 'none',
                        }}>
                          See How to Save {fmtUSD(results.roundUp.interestSaved)} ↓
                        </span>
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
                    </div>

                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center py-12">
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                      {noMortgageNeeded
                        ? <>No mortgage needed —<br />down payment covers full price.</>
                        : <>Enter your details<br />to see results.</>}
                    </p>
                  </div>
                )}
              </div>
            </div>{/* end Dark Navy Results Card */}

          </div>{/* end Block A */}

          {/* ── Block B: Visuals Row ──────────────────────────────────────────── */}
          {results && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

              {/* Payment Breakdown */}
              <div style={cardStyle} className="p-5 md:p-6 h-full flex flex-col">
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
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div style={{ flexShrink: 0, width: 208, height: 208 }}>
                      <DonutChart
                        slices={pieSlices}
                        className="w-full h-full"
                        centerValue={fmtUSDx(results.totalMonthly * (breakdownView === 'yearly' ? 12 : 1))}
                        centerLabel={breakdownView === 'yearly' ? 'total/yr' : 'total/mo'}
                      />
                    </div>
                    <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                      {pieSlices.filter((s) => s.alwaysShow || s.value > 0).map((s, i) => (
                        <div key={i} className="flex items-center justify-between py-2"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div className="flex items-center gap-2.5"
                            style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color, width: 10, height: 10, borderRadius: 9999, flexShrink: 0 }} />
                            <span style={{ color: '#4B5563', fontSize: '12.5px' }}>{s.label}</span>
                          </div>
                          <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>
                            {fmtUSDx(s.value * (breakdownView === 'yearly' ? 12 : 1))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Compare Scenarios */}
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
                        <div className="flex items-center justify-between mb-2"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div className="flex items-center gap-2"
                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                            {fmtUSDx(sc.monthlyPayment)}<span className="text-xs font-normal text-slate-400">/mo</span>
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden"
                          style={{ background: '#EEF1F5', height: 10, borderRadius: 9999, overflow: 'hidden' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: selected ? '#1DB584' : '#C8D3DF', height: '100%', borderRadius: 9999 }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs" style={{ color: '#9BA8B5' }}>
                          Total interest:{' '}
                          <span className="font-semibold" style={{ color: '#6B7A8D' }}>{fmtUSD(sc.totalInterest)}</span>
                        </p>
                      </div>
                    );
                  })}
                  <p className="pt-3 text-xs leading-relaxed" style={{ borderTop: '1px solid rgba(15,41,66,0.07)', color: '#9BA8B5' }}>
                    15-year saves{' '}
                    <span className="font-semibold" style={{ color: '#1DB584' }}>
                      {fmtUSD(results.scenario30.totalInterest - results.scenario15.totalInterest)}
                    </span>{' '}
                    vs 30-year, but costs {fmtUSDx(results.scenario15.monthlyPayment - results.scenario30.monthlyPayment)} more/month.
                  </p>
                </div>
              </div>

            </div>
          )}{/* end Block B */}

        </div>
      </div>{/* end workspace */}

      {/* ── Lower sections: flat body (InsightPanel + Amortization) ─────────── */}
      <div className="pt-6 md:pt-8">
        <div className="flex flex-col gap-y-6 md:gap-y-8 min-w-0">

          {/* ── Block C: AI Mortgage Analysis ────────────────────────────────── */}
          {results && (() => {
            /* ── Income detection ── */
            const incomeEntered = parseN(form.grossIncome) > 0;

            /* ── Health Score — two scoring modes ── */
            const fe  = results.primaryRatio?.ratio   ?? 0;
            const be  = results.secondaryRatio?.ratio ?? 0;
            const dp  = results.downPct;
            const rate = parseN(form.interestRate);

            let hScore: number;
            let hTitle: string;
            let hCopy: string;

            if (incomeEntered) {
              // Mode A: DTI-based scoring — score, label, and copy derive from same number, no separate guardrail cap
              const feScore = fe <= 28 ? 40 : fe <= 32 ? 32 : fe <= 36 ? 22 : Math.max(5, Math.round(40 - (fe - 28) * 1.5));
              const beScore = be <= 36 ? 40 : be <= 43 ? 30 : be <= 50 ? 15 : 5;
              const dpScore = dp >= 20 ? 20 : dp >= 15 ? 15 : dp >= 10 ? 10 : 5;
              hScore = Math.round(Math.min(100, Math.max(0, feScore + beScore + dpScore)));
              const mInc = parseN(form.grossIncome) / 12;
              if (fe > 28) {
                // Front-end pressure — housing cost wording only, no debt reduction mention
                const feCeiling = fmtUSDx(Math.round(0.28 * mInc));
                hTitle = 'Front-end DTI is the main pressure point.';
                hCopy  = `Your housing costs exceed the 28% front-end guideline (${feCeiling}/mo ceiling). Consider a lower purchase price, a larger down payment, or a lower rate.`;
              } else if (be > 36) {
                // Back-end pressure — debt reduction wording is appropriate
                const beGap = fmtUSDx(Math.ceil(((results.secondaryRatio.ratio - 36) / 100) * mInc));
                hTitle = 'Other debts are adding pressure.';
                hCopy  = `Back-end DTI is ${results.secondaryRatio.ratio.toFixed(1)}%. Reducing monthly obligations by ~${beGap} would bring you within the 36% back-end guideline.`;
              } else if (dp < 10) {
                hTitle = 'Low down payment is the primary risk.';
                hCopy  = 'DTI ratios are within guideline, but your equity cushion is thin. PMI applies and a market dip could put you underwater. Reaching 10% down materially reduces exposure.';
              } else if (results.monthlyPmi > 0) {
                hTitle = 'Good profile — PMI is the remaining cost to watch.';
                hCopy  = `DTI ratios are healthy. PMI of ${fmtUSDx(results.monthlyPmi)}/mo drops automatically around year ${results.pmiRequiredUntilYear ?? parseInt(form.amortization)}.`;
              } else {
                hTitle = 'Strong position across all signals.';
                hCopy  = 'DTI ratios, down payment, and PMI status are all within healthy ranges.';
              }
            } else {
              // Mode B: no income — score on down payment, PMI status, and rate only
              // Do not score against assumed income as if it were real
              const dpScore  = dp >= 20 ? 40 : dp >= 15 ? 30 : dp >= 10 ? 20 : 10;
              const pmiScore = results.monthlyPmi === 0 ? 35
                : (results.pmiRequiredUntilYear !== null && results.pmiRequiredUntilYear <= 5) ? 25
                : 10;
              const rateScore = rate <= 6 ? 25 : rate <= 7 ? 18 : rate <= 8 ? 10 : 5;
              hScore = Math.round(Math.min(100, Math.max(0, dpScore + pmiScore + rateScore)));
              if (dp < 10) {
                hTitle = 'Low down payment is the primary risk.';
                hCopy  = 'PMI applies and your equity cushion is thin. Add annual income above to include DTI analysis in this score.';
              } else if (results.monthlyPmi > 0) {
                hTitle = `PMI adds ${fmtUSDx(results.monthlyPmi)}/mo to your payment.`;
                hCopy  = 'Score based on down payment, PMI, and rate. Add your annual income to include DTI analysis.';
              } else {
                hTitle = 'Score based on down payment, PMI, and rate.';
                hCopy  = 'Add your annual income above to include full DTI analysis in this score.';
              }
            }

            const hLabel = hScore >= 80 ? 'Excellent' : hScore >= 65 ? 'Good' : hScore >= 50 ? 'Fair' : hScore >= 35 ? 'Manageable' : 'Needs Attention';
            const hColor = hLabel === 'Excellent' || hLabel === 'Good' ? '#1DB584' : hLabel === 'Fair' ? '#f59e0b' : '#ef4444';

            /* ── SVG gauge constants (240° arc, gap at bottom) ── */
            const GR   = 52;
            const GC   = 2 * Math.PI * GR;
            const GARC = (240 / 360) * GC;
            const GFIL = (hScore / 100) * GARC;

            /* ── Ratio status helper ── */
            const rStatus = (r: number, l: number) =>
              r > l           ? { label: 'Over Limit',  color: '#ef4444', bg: 'rgba(239,68,68,0.10)'  }
              : r > l * 0.875 ? { label: 'Manageable',  color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' }
              : r > l * 0.75  ? { label: 'Good',        color: '#1DB584', bg: 'rgba(29,181,132,0.10)' }
              :                  { label: 'Healthy',     color: '#1DB584', bg: 'rgba(29,181,132,0.10)' };

            /* ── Smart Optimization lever — input-aware priority selection ── */
            const dtiOver = incomeEntered && (results.primaryRatio.ratio > 28 || results.secondaryRatio.ratio > 36);
            type LIcon = 'dollar' | 'activity' | 'calendar' | 'trending';
            const lever = (() => {
              // Lever 1: PMI threshold (18–20% down) — highest priority
              if (results.insuranceThreshold) {
                const th = results.insuranceThreshold;
                return {
                  bigNum:      fmtUSD(th.amountNeeded),
                  mainLabel:   'additional down payment needed',
                  supportCopy: 'Reaching the 20% down payment threshold may remove PMI.',
                  kpi1Val:     fmtUSDx(th.annualSavings / 12) + '/mo',
                  kpi1Label:   'Monthly PMI saved',
                  kpi1Icon:    'dollar'   as LIcon,
                  kpi2Val:     th.instantReturn.toFixed(0) + '%',
                  kpi2Label:   'Estimated return',
                  kpi2Icon:    'trending' as LIcon,
                };
              }
              // Lever 2: High DTI — only when income is entered
              if (dtiOver) {
                const mInc     = parseN(form.grossIncome) / 12;
                const feOverPP = results.primaryRatio.ratio - 28;
                const beOverPP = results.secondaryRatio.ratio - 36;
                if (feOverPP > beOverPP) {
                  // Front-end binding: housing cost wording, no debt reduction
                  const gap = Math.ceil(results.primaryRatio.ratio / 100 * mInc - 0.28 * mInc);
                  return {
                    bigNum:      fmtUSDx(gap) + '/mo',
                    mainLabel:   'payment reduction needed',
                    supportCopy: 'Your housing costs are above the recommended guideline. Lowering the home price, increasing your down payment, or finding a lower rate could help bring the payment closer to range.',
                    kpi1Val:     results.primaryRatio.ratio.toFixed(1) + '%',
                    kpi1Label:   'Current front-end DTI',
                    kpi1Icon:    'activity' as LIcon,
                    kpi2Val:     '28%',
                    kpi2Label:   'Guideline',
                    kpi2Icon:    'activity' as LIcon,
                  };
                } else {
                  // Back-end binding: debt reduction wording is appropriate
                  const gap = Math.ceil(results.secondaryRatio.ratio / 100 * mInc - 0.36 * mInc);
                  return {
                    bigNum:      fmtUSDx(gap) + '/mo',
                    mainLabel:   'monthly debt reduction needed',
                    supportCopy: 'Reducing monthly debt obligations could help bring your total debt ratio closer to the recommended guideline.',
                    kpi1Val:     results.secondaryRatio.ratio.toFixed(1) + '%',
                    kpi1Label:   'Current back-end DTI',
                    kpi1Icon:    'activity' as LIcon,
                    kpi2Val:     '36%',
                    kpi2Label:   'Guideline',
                    kpi2Icon:    'activity' as LIcon,
                  };
                }
              }
              // Lever 3 (term compression 30yr→20yr) removed — too aggressive as default.
              // Scaled extra payment fallback — 5% of P&I, rounded to nearest $50
              const smartExtra = Math.max(100, Math.round(results.baseMonthlyPI * 0.05 / 50) * 50);
              const smartSched = buildSchedule(results.loanAmount, monthlyRateUS(parseN(form.interestRate)), parseInt(form.amortization) * 12, parseN(form.extraPayment) + smartExtra);
              const smartIntSaved = Math.max(0, results.totalInterest - smartSched.reduce((s, r) => s + r.interestPaid, 0));
              const smartYrsSaved = Math.max(0, results.schedule.length - smartSched.length);
              return {
                bigNum:      fmtUSD(smartIntSaved),
                mainLabel:   'potential interest savings',
                supportCopy: 'Adding an extra monthly payment may shorten your mortgage and reduce total interest.',
                kpi1Val:     fmtUSDx(smartExtra) + '/mo',
                kpi1Label:   'Extra payment',
                kpi1Icon:    'dollar'   as LIcon,
                kpi2Val:     smartYrsSaved > 0 ? smartYrsSaved * 12 + ' mo' : '< 1 yr',
                kpi2Label:   'Faster payoff',
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
                    <p className="text-white text-lg md:text-xl font-bold tracking-tight">
                      FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Mortgage Analysis
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-col items-start gap-1">
                      <button
                        onClick={handleDownloadPDF}
                        disabled={!results || pdfGenerating}
                        className="inline-flex items-center gap-1.5"
                        style={{
                          background: '#1DB584', color: '#ffffff', borderRadius: 9999,
                          padding: '7px 16px', fontSize: '13px', fontWeight: 700,
                          opacity: (!results || pdfGenerating) ? 0.65 : 1,
                          cursor: (!results || pdfGenerating) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        {pdfGenerating ? 'Generating…' : 'Download PDF'}
                      </button>
                      {pdfError && (
                        <p style={{ fontSize: '11px', color: '#f87171', marginLeft: 4 }}>{pdfError}</p>
                      )}
                    </div>
                    <button disabled aria-disabled="true" title="Coming soon"
                      className="inline-flex items-center gap-1.5 cursor-not-allowed select-none"
                      style={{ border: '1.5px solid rgba(255,255,255,0.30)', color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700 }}>
                      <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      Email Results
                    </button>
                  </div>
                </div>

                {/* ── Dashboard body ── */}
                <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

                  {/* ── Hero row: Health Score + Smart Optimization ── */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">

                    {/* Health Score card */}
                    <div className="md:col-span-5 rounded-2xl p-3 flex flex-col"
                      style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
                        <span className="text-sm font-bold text-slate-800">
                          Mortgage Health Score
                          <Tooltip text={incomeEntered ? "Scored on Front-End DTI (28% target), Back-End DTI (36% target), and down payment. For guidance only." : "Add annual income to include DTI in your score. Currently scored on down payment, PMI status, and rate only."} />
                        </span>
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        {/* SVG gauge — responsive */}
                        <div className="us-health-gauge relative shrink-0" style={{ width: 160, height: 160 }}>
                          <svg className="us-health-gauge-svg" width="160" height="160" viewBox="0 0 140 140" aria-hidden="true">
                            <circle cx="70" cy="70" r={GR} fill="none"
                              stroke="rgba(15,41,66,0.09)" strokeWidth="11" strokeLinecap="round"
                              strokeDasharray={`${GARC} ${GC - GARC}`}
                              transform="rotate(150, 70, 70)" />
                            <circle cx="70" cy="70" r={GR} fill="none"
                              stroke={hColor} strokeWidth="11" strokeLinecap="round"
                              strokeDasharray={`${GFIL} ${GC - GFIL}`}
                              transform="rotate(150, 70, 70)"
                              style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 16 }}>
                            <span style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 800, color: '#0D1B2A', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                              {hScore}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1.6 }}>/100</span>
                          </div>
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

                    {/* Smart Optimization Found dark card */}
                    <div className="md:col-span-7 rounded-2xl p-3 flex flex-col"
                      style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
                        <span className="text-sm font-bold" style={{ color: '#1DB584' }}>Smart Optimization Found</span>
                      </div>

                      <style>{`
                        .us-smart-opt-mobile { display: flex; flex-direction: column; }
                        .us-smart-opt-desktop { display: none; }
                        @media (min-width: 768px) {
                          .us-smart-opt-mobile { display: none !important; }
                          .us-smart-opt-desktop { display: flex !important; flex-direction: column; }
                          .us-health-gauge { width: 220px !important; height: 220px !important; }
                          .us-health-gauge-svg { width: 220px !important; height: 220px !important; }
                        }
                        @media (min-width: 768px) and (max-width: 1023px) {
                          .us-smart-opt-row { flex-wrap: wrap; }
                          .us-smart-opt-row > *:first-child { flex: 0 0 100%; min-width: 0; }
                          .us-smart-opt-row > *:not(:first-child) { flex: 1 1 0; min-width: 0; }
                        }
                      `}</style>
                      {/* Mobile: vertical stack */}
                      <div className="us-smart-opt-mobile gap-3 mt-1">
                        <div className="rounded-xl flex items-center justify-center px-4 py-3"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {lever.bigNum}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{lever.mainLabel}</p>
                          <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{lever.supportCopy}</p>
                        </div>
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

                      {/* Desktop: horizontal three-box row */}
                      <div className="us-smart-opt-desktop flex-1 justify-center gap-3">
                        <div className="us-smart-opt-row flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.1rem, 4vw, 2.85rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                              {lever.bigNum}
                            </span>
                          </div>
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
                        <div>
                          <p className="text-white font-semibold text-sm">{lever.mainLabel}</p>
                          <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{lever.supportCopy}</p>
                          <p className="text-slate-500 text-xs mt-1">Estimate based on current inputs — actual lender results may vary.</p>
                        </div>
                      </div>
                    </div>

                  </div>{/* end hero row */}

                  {/* ── Supporting section: light surface, two columns ── */}
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
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

                        {/* Affordability Ratios — DTI (only when income entered) */}
                        {results.primaryRatio && results.secondaryRatio && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <BarChart2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
                              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>Affordability Ratios</p>
                              <Info className="w-3 h-3 shrink-0 text-slate-400" aria-hidden="true" />
                            </div>
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
                                        <span className="text-slate-400 text-xs font-normal ml-1.5" style={{ marginLeft: 6 }}>({data.sublabel})</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0"
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
                              <Info className="w-3 h-3 shrink-0 text-slate-400" aria-hidden="true" />
                              <p className="text-slate-400 text-xs italic">
                                {parseN(form.grossIncome) > 0
                                  ? '28% front-end · 36% back-end per Fannie Mae guidelines.'
                                  : 'Based on assumed $120K income · Enter your income above for accurate DTI.'}
                              </p>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Right: Expert Insights */}
                      <div className="md:col-span-7 p-4 md:p-5 flex flex-col gap-3" style={{ background: '#fafbfc' }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Star className="w-3.5 h-3.5 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
                          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>Expert Insights</p>
                        </div>

                        {/* Rate Shock Analysis */}
                        <div className="rounded-xl p-4" style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="flex items-center justify-center shrink-0"
                              style={{ width: 28, height: 28, borderRadius: 8, background: '#fee2e2' }}>
                              <Zap className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />
                            </span>
                            <p className="text-xs font-bold uppercase tracking-widest text-red-500">Rate Shock Analysis</p>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            A 200-basis-point rate increase would raise your payment by{' '}
                            <strong className="text-red-600">{fmtUSDx(results.rateShock.difference)}</strong> to{' '}
                            <strong className="text-red-600">{fmtUSDx(results.rateShock.shockedPayment)}</strong> at{' '}
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
                            <strong className="text-sky-600">{fmtUSDx(results.roundUp.extra)}/month</strong> to{' '}
                            <strong className="text-sky-600">{fmtUSDx(results.roundUp.roundedPayment)}</strong>{' '}
                            {results.roundUp.yearsSaved > 0 ? (
                              <>delivers <strong className="text-sky-600">{results.roundUp.yearsSaved}-year</strong> amortization compression and saves <strong className="text-sky-600">{fmtUSD(results.roundUp.interestSaved)}</strong> in total interest.</>
                            ) : (
                              <>delivers an estimated <strong className="text-sky-600">{fmtUSD(results.roundUp.interestSaved)}</strong> reduction in total interest — minimal lifestyle impact, measurable long-term benefit.</>
                            )}
                          </p>
                        </div>

                        {/* PMI / Insurance Threshold — three states */}
                        {results.insuranceThreshold ? (
                          /* 18–19.99% down: close to PMI threshold */
                          <div className="rounded-xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="flex items-center justify-center shrink-0"
                                style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                              </span>
                              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">PMI Threshold Opportunity</p>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              At <strong>{results.insuranceThreshold.currentDownPct.toFixed(1)}%</strong> down, you are within 2% of the PMI-free threshold. An additional{' '}
                              <strong className="text-emerald-600">{fmtUSD(results.insuranceThreshold.amountNeeded)}</strong> eliminates{' '}
                              <strong className="text-emerald-600">{fmtUSDx(results.insuranceThreshold.annualSavings / 12)}/month</strong> in PMI — an effective{' '}
                              <strong className="text-emerald-600">{results.insuranceThreshold.instantReturn.toFixed(0)}% instant return</strong> on that incremental capital.
                            </p>
                          </div>
                        ) : results.downPct >= 20 ? (
                          /* 20%+ down: no PMI */
                          <div className="rounded-xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="flex items-center justify-center shrink-0"
                                style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                              </span>
                              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">No PMI Required</p>
                            </div>
                            <p className="text-sm text-slate-700">
                              Your {results.downPct.toFixed(1)}% down payment exceeds the 20% threshold. Private Mortgage Insurance does not apply to this loan.
                            </p>
                          </div>
                        ) : (
                          /* Under 18% down: PMI required */
                          <div className="rounded-xl p-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="flex items-center justify-center shrink-0"
                                style={{ width: 28, height: 28, borderRadius: 8, background: '#fef3c7' }}>
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                              </span>
                              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">PMI Required</p>
                            </div>
                            <p className="text-sm text-slate-700">
                              Your {results.downPct.toFixed(1)}% down payment triggers PMI of{' '}
                              <strong className="text-amber-600">{fmtUSDx(results.monthlyPmi)}/month</strong>. You may request
                              cancellation once your balance reaches 80% of the original purchase price
                              {results.pmiRequiredUntilYear ? ` (~year ${results.pmiRequiredUntilYear})` : ''}; by law, PMI
                              must automatically terminate at 78% LTV under the Homeowners Protection Act.
                            </p>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>{/* end supporting section */}

                </div>{/* end dashboard body */}

                {/* ── Block C Footer Disclaimer ── */}
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

          {/* ── Block D: Amortization Schedule (V2 accordion style) ──────────── */}
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
                  style={{ color: '#1DB584', width: 20, height: 20, flexShrink: 0 }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  width="20" height="20"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {!isAmortizationExpanded && (
                <p className="mt-3 text-sm text-slate-500">
                  {results.schedule.length}-year schedule · {fmtUSD(results.totalInterest)} total interest
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
                          <td className="pl-4 pr-4 py-2 md:py-3 text-sm text-slate-700 text-right">{fmtUSD(row.principalPaid)}</td>
                          <td className="pl-4 pr-4 py-2 md:py-3 text-sm text-rose-600 text-right">{fmtUSD(row.interestPaid)}</td>
                          <td className="pl-4 pr-6 py-2 md:py-3 text-sm text-slate-700 text-right">{fmtUSD(row.endBalance)}</td>
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

          {/* Footer disclaimer */}
          <Disclaimer />

        </div>
      </div>{/* end lower sections */}
    </>
  );
}
