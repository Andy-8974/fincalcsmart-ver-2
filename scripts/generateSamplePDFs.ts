/**
 * Generates two sample retirement PDF reports (CA and US) and writes them to
 * _docs/sample-pdfs/. Run with:
 *   npx tsx scripts/generateSamplePDFs.ts
 */

import * as fs   from 'fs';
import * as path from 'path';

// Node-safe dynamic import for jsPDF (ESM/CJS compat)
async function loadJsPDF() {
  const mod = await import('jspdf');
  return (mod as any).jsPDF ?? (mod as any).default;
}

// Patch global so pdfEngine's `import('jspdf')` resolves from Node
(global as any).__jspdf_module_override = loadJsPDF;

import { buildRetirementReportData, RetirementAdapterInput }         from '../lib/pdf/adapters/retirementAdapter';
import { buildSavingsGoalReportData, SavingsGoalAdapterInput }        from '../lib/pdf/adapters/savingsGoalAdapter';
import { buildMortgageReportData, MortgageAdapterInput, buildUSMortgageReportData, USMortgageAdapterInput } from '../lib/pdf/adapters/mortgageAdapter';
import { buildInvestmentGrowthReportData, InvestmentGrowthAdapterInput, CIFreq } from '../lib/pdf/adapters/investmentGrowthAdapter';
import { buildInvestmentFeesReportData, InvestmentFeesAdapterInput }  from '../lib/pdf/adapters/investmentFeesAdapter';
import { buildROIReportData, ROIAdapterInput }                         from '../lib/pdf/adapters/roiAdapter';
import { buildLoanReportData, LoanAdapterInput }                       from '../lib/pdf/adapters/loanAdapter';
import { buildSalaryReportData, SalaryAdapterInput }                   from '../lib/pdf/adapters/taxIncomeAdapter';
import { buildReportDocument }                                        from '../lib/pdf/pdfEngine';
import { buildWithdrawalReportData }        from '../lib/pdf/adapters/withdrawalAdapter';
import type { WithdrawalAdapterInput }      from '../lib/pdf/adapters/withdrawalAdapter';
import { buildFIREReportData }              from '../lib/pdf/adapters/fireAdapter';
import type { FIREAdapterInput }            from '../lib/pdf/adapters/fireAdapter';
import { buildCanadaRegisteredReportData }  from '../lib/pdf/adapters/canadaRegisteredAdapter';
import type { CanadaRegisteredAdapterInput } from '../lib/pdf/adapters/canadaRegisteredAdapter';
import { buildMortgageQualifierReportData } from '../lib/pdf/adapters/mortgageQualifierAdapter';
import type { MortgageQualifierAdapterInput } from '../lib/pdf/adapters/mortgageQualifierAdapter';
import { buildMortgageRefinanceReportData } from '../lib/pdf/adapters/mortgageRefinanceAdapter';
import type { MortgageRefinanceAdapterInput } from '../lib/pdf/adapters/mortgageRefinanceAdapter';
import { buildDebtRepaymentReportData }     from '../lib/pdf/adapters/debtRepaymentAdapter';
import type { DebtRepaymentAdapterInput }   from '../lib/pdf/adapters/debtRepaymentAdapter';
import { buildTaxReportData }               from '../lib/pdf/adapters/taxAdapter';
import type { TaxAdapterInput }             from '../lib/pdf/adapters/taxAdapter';
import { buildSalesTaxReportData }          from '../lib/pdf/adapters/salesTaxAdapter';
import type { SalesTaxAdapterInput }        from '../lib/pdf/adapters/salesTaxAdapter';
import { buildEmergencyFundReportData }     from '../lib/pdf/adapters/emergencyFundAdapter';
import type { EmergencyFundAdapterInput }   from '../lib/pdf/adapters/emergencyFundAdapter';
import { buildNetWorthReportData }          from '../lib/pdf/adapters/netWorthAdapter';
import type { NetWorthAdapterInput }        from '../lib/pdf/adapters/netWorthAdapter';
import { buildRentVsBuyReportData }         from '../lib/pdf/adapters/rentVsBuyAdapter';
import type { RentVsBuyAdapterInput }       from '../lib/pdf/adapters/rentVsBuyAdapter';
import { buildLumpSumVsDcaReportData }      from '../lib/pdf/adapters/lumpSumVsDcaAdapter';
import type { LumpSumVsDcaAdapterInput }    from '../lib/pdf/adapters/lumpSumVsDcaAdapter';
import { buildCmhcReportData }              from '../lib/pdf/adapters/cmhcAdapter';
import type { CmhcAdapterInput }            from '../lib/pdf/adapters/cmhcAdapter';
import {
  monthlyRateCA, monthlyRateUS, calcPayment, getCmhcRate, buildSchedule, freqPayment,
  fmtCADx,
} from '../app/_mortgage-shared/math';

// ─── Formatters ───────────────────────────────────────────────────────────────

function makeFmt(locale: string, currency: string) {
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency', currency, maximumFractionDigits: 0,
  });
  return (n: number) => fmt.format(n);
}

function makeFmtx(locale: string, currency: string) {
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2,
  });
  return (n: number) => fmt.format(n);
}

// ─── Sample data sets ────────────────────────────────────────────────────────

const CANADA_INPUT: RetirementAdapterInput = {
  currentSavings:          45000,
  monthlyContribution:     800,
  annualRate:              6.5,
  currentAge:              35,
  retirementAge:           65,
  retirementGoal:          1200000,
  freq:                    'monthly',
  yearsToRetirement:       30,
  projectedSavings:        870432,
  totalContributions:      333000,
  investmentGrowth:        537432,
  hasGoal:                 true,
  goalProgressPct:         72.5,
  gapOrSurplus:            329568,    // positive = behind target
  requiredMonthly:         1340,
  additionalMonthlyNeeded: 540,
  statusLabel:             'Behind Target',
  readinessScore:          58,
  readinessLabel:          'Developing',
};

const USA_INPUT: RetirementAdapterInput = {
  currentSavings:          120000,
  monthlyContribution:     1500,
  annualRate:              7.0,
  currentAge:              42,
  retirementAge:           67,
  retirementGoal:          2000000,
  freq:                    'monthly',
  yearsToRetirement:       25,
  projectedSavings:        2143780,
  totalContributions:      570000,
  investmentGrowth:        1573780,
  hasGoal:                 true,
  goalProgressPct:         107.2,
  gapOrSurplus:            -143780,   // negative = surplus
  requiredMonthly:         1500,
  additionalMonthlyNeeded: 0,
  statusLabel:             'On Track',
  readinessScore:          84,
  readinessLabel:          'Strong',
};

// On Track / large surplus — for Key Drivers status-awareness verification
const CANADA_ONTRACK_INPUT: RetirementAdapterInput = {
  currentSavings:          120000,
  monthlyContribution:     1200,
  annualRate:              6.5,
  currentAge:              38,
  retirementAge:           65,
  retirementGoal:          1200000,
  freq:                    'monthly',
  yearsToRetirement:       27,
  projectedSavings:        1736885,
  totalContributions:      505200,
  investmentGrowth:        1231685,
  hasGoal:                 true,
  goalProgressPct:         144.7,
  gapOrSurplus:            -536885,   // negative = surplus
  requiredMonthly:         0,
  additionalMonthlyNeeded: 0,
  statusLabel:             'On Track',
  readinessScore:          91,
  readinessLabel:          'Excellent',
};

// Behind Target — for US regression verification
const USA_BEHIND_INPUT: RetirementAdapterInput = {
  currentSavings:          45000,
  monthlyContribution:     800,
  annualRate:              7.0,
  currentAge:              40,
  retirementAge:           67,
  retirementGoal:          2000000,
  freq:                    'monthly',
  yearsToRetirement:       27,
  projectedSavings:        1143000,
  totalContributions:      304800,
  investmentGrowth:        838200,
  hasGoal:                 true,
  goalProgressPct:         57.2,
  gapOrSurplus:            857000,    // positive = gap
  requiredMonthly:         2180,
  additionalMonthlyNeeded: 1380,
  statusLabel:             'Behind Target',
  readinessScore:          44,
  readinessLabel:          'Developing',
};

// ─── Savings Goal samples ─────────────────────────────────────────────────────

// Canada — below goal (vehicle, Behind Target)
const SG_CA_BEHIND: SavingsGoalAdapterInput = {
  savingsGoal:              35000,
  currentSavings:           8000,
  monthlyContribution:      300,
  annualReturn:             4.5,
  timeHorizon:              5,
  projectedSavings:         26154,
  totalContributions:       26000,
  estimatedGrowth:          154,
  goalGap:                  8846,
  surplus:                  0,
  progressPct:              74.7,
  requiredMonthly:          484,
  additionalMonthlyNeeded:  184,
  timeToGoalMonths:         null,   // won't reach in horizon
  alreadyReached:           false,
  neverReached:             false,
  readinessScore:           62,
  readinessLabel:           'Fair',
  readinessStatus:          'Behind Target',
  leverState:               'behind-saving',
};

// USA — on track (home down payment, On Track / surplus)
const SG_US_ONTRACK: SavingsGoalAdapterInput = {
  savingsGoal:              80000,
  currentSavings:           25000,
  monthlyContribution:      1000,
  annualReturn:             6.0,
  timeHorizon:              4,
  projectedSavings:         88412,
  totalContributions:       73000,
  estimatedGrowth:          15412,
  goalGap:                  0,
  surplus:                  8412,
  progressPct:              110.5,
  requiredMonthly:          1000,
  additionalMonthlyNeeded:  0,
  timeToGoalMonths:         43,
  alreadyReached:           false,
  neverReached:             false,
  readinessScore:           88,
  readinessLabel:           'Excellent',
  readinessStatus:          'On Track',
  leverState:               'on-track',
};

// ─── Mortgage helpers ─────────────────────────────────────────────────────────

type MortgageFrequency = 'monthly' | 'biweekly' | 'accelerated-biweekly';

function buildMortgageInput(p: {
  homePrice: number; downPayment: number; interestRate: number;
  amortizationYears: number; frequency: MortgageFrequency;
  extraPayment?: number; propertyTaxAnnual?: number; homeInsuranceAnnual?: number;
  condoFeeMonthly?: number; grossIncome?: number; otherDebts?: number;
}): MortgageAdapterInput {
  const extra    = p.extraPayment       ?? 0;
  const propTax  = p.propertyTaxAnnual  ?? 0;
  const homeIns  = p.homeInsuranceAnnual ?? 0;
  const condo    = p.condoFeeMonthly    ?? 0;
  const income   = p.grossIncome        ?? 0;
  const debts    = p.otherDebts         ?? 0;

  const downPct  = (p.downPayment / p.homePrice) * 100;
  let loanAmount = p.homePrice - p.downPayment;
  let cmhcAmount = 0;
  if (downPct < 20) {
    cmhcAmount = loanAmount * getCmhcRate(downPct);
    loanAmount += cmhcAmount;
  }

  const mRate        = monthlyRateCA(p.interestRate);
  const months       = p.amortizationYears * 12;
  const baseMonthlyPI = calcPayment(loanAmount, mRate, months);
  const displayPayment = freqPayment(baseMonthlyPI, p.frequency);
  const mTax         = propTax / 12;
  const mIns         = homeIns / 12;
  const totalMonthly = baseMonthlyPI + mTax + mIns + condo;

  const schedule     = buildSchedule(loanAmount, mRate, months, extra);
  const totalInterest = schedule.reduce((s, r) => s + r.interestPaid, 0);
  const totalPayment  = loanAmount + totalInterest;

  // Rate shock (+2%)
  const shockedMRate  = monthlyRateCA(p.interestRate + 2);
  const shockedPayment = calcPayment(loanAmount, shockedMRate, months);

  // Round-up savings
  const roundSched    = buildSchedule(loanAmount, mRate, months, extra + 100);
  const roundInterest = roundSched.reduce((s, r) => s + r.interestPaid, 0);
  const roundYearsSaved = Math.round((schedule.length - roundSched.length) / 12);
  const roundIntSaved   = Math.max(0, totalInterest - roundInterest);

  // Health score (no-income Mode B)
  const dp        = downPct;
  const rate      = p.interestRate;
  const dpScore   = dp >= 20 ? 40 : dp >= 15 ? 30 : dp >= 10 ? 20 : 10;
  const cmhcScore = cmhcAmount === 0 ? 35 : dp >= 15 ? 25 : 10;
  const rateScore = rate <= 4.5 ? 25 : rate <= 5.5 ? 18 : rate <= 6.5 ? 10 : 5;
  const hScore    = Math.round(Math.min(100, Math.max(0, dpScore + cmhcScore + rateScore)));
  const hLabel    = (hScore >= 80 ? 'Excellent' : hScore >= 65 ? 'Good' : hScore >= 50 ? 'Fair' : 'Needs Attention') as
    'Excellent' | 'Good' | 'Fair' | 'Needs Attention';

  let hTitle: string, hCopy: string;
  if (dp < 10) {
    hTitle = 'Low down payment is the primary risk.';
    hCopy  = 'CMHC mortgage default insurance applies and your equity cushion is thin. Add your annual income above to include GDS/TDS analysis in this score.';
  } else if (cmhcAmount > 0) {
    hTitle = `Mortgage default insurance adds ${fmtCADx(cmhcAmount)} to your loan.`;
    hCopy  = 'Score based on down payment, CMHC insurance status, and rate. Add your annual income to include GDS/TDS analysis.';
  } else {
    hTitle = 'Score based on down payment, insurance status, and rate.';
    hCopy  = 'Add your annual income above to include full GDS/TDS analysis in this score.';
  }

  // Insight text
  const ratio = ((totalInterest / loanAmount) * 100).toFixed(0);
  const insightText = rate > 5.5
    ? `At ${rate}%, total interest of CA$${Math.round(totalInterest).toLocaleString()} represents ${ratio}% of your loan principal — above the 50% threshold.`
    : `Your ${rate}% rate ${downPct >= 20 ? 'avoids CMHC insurance' : 'triggers CMHC insurance'}. Total interest of CA$${Math.round(totalInterest).toLocaleString()} represents ${ratio}% of loan principal across your ${p.amortizationYears}-year amortization.`;

  return {
    homePrice: p.homePrice, downPaymentAmount: p.downPayment, downPct,
    interestRate: p.interestRate, amortizationYears: p.amortizationYears,
    frequency: p.frequency, extraPayment: extra,
    propertyTaxAnnual: propTax, homeInsuranceAnnual: homeIns, condoFeeMonthly: condo,
    incomeEntered: income > 0, grossIncome: income, otherDebts: debts,
    loanAmount, cmhcAmount, baseMonthlyPI, displayPayment, totalMonthly,
    monthlyPropertyTax: mTax, monthlyHomeInsurance: mIns, monthlyCondoFee: condo,
    totalInterest, totalPayment,
    healthScore: hScore, healthLabel: hLabel, healthTitle: hTitle, healthCopy: hCopy,
    gds: null, tds: null,
    rateShockNewRate: p.interestRate + 2, rateShockDifference: shockedPayment - baseMonthlyPI,
    roundUpYearsSaved: roundYearsSaved, roundUpInterestSaved: roundIntSaved,
    schedule: schedule.map((r) => ({ year: r.year, endBalance: r.endBalance })),
    insightText,
  };
}

// ─── US Mortgage helpers ──────────────────────────────────────────────────────
// Mirrors USAMortgageCalculator.tsx logic for sample generation only.

function buildUSMortgageInput(p: {
  homePrice: number; downPayment: number; interestRate: number;
  loanTermYears: number; frequency: MortgageFrequency;
  extraPayment?: number; propertyTaxAnnual?: number; homeInsuranceAnnual?: number;
  hoaFeeMonthly?: number; pmiRateAnnual?: number;
  grossIncome?: number; otherDebts?: number;
}): USMortgageAdapterInput {
  const extra    = p.extraPayment        ?? 0;
  const propTax  = p.propertyTaxAnnual   ?? 0;
  const homeIns  = p.homeInsuranceAnnual ?? 0;
  const hoa      = p.hoaFeeMonthly       ?? 0;
  const pmiRate  = p.pmiRateAnnual       ?? 0.5;
  const income   = p.grossIncome         ?? 0;
  const debts    = p.otherDebts          ?? 0;

  const downPct    = (p.downPayment / p.homePrice) * 100;
  const loanAmount = p.homePrice - p.downPayment;
  const mRate      = monthlyRateUS(p.interestRate);
  const months     = p.loanTermYears * 12;

  const baseMonthlyPI  = calcPayment(loanAmount, mRate, months);
  const displayPayment = freqPayment(baseMonthlyPI, p.frequency);
  const mTax           = propTax / 12;
  const mIns           = homeIns / 12;
  const monthlyPmi     = downPct < 20 ? (loanAmount * pmiRate / 100) / 12 : 0;
  const totalMonthly   = baseMonthlyPI + mTax + mIns + hoa + monthlyPmi;

  const schedule      = buildSchedule(loanAmount, mRate, months, extra);
  const totalInterest = schedule.reduce((s, r) => s + r.interestPaid, 0);
  const totalPayment  = loanAmount + totalInterest;

  // PMI removal year
  let pmiRequiredUntilYear: number | null = null;
  if (downPct < 20) {
    const threshold80 = p.homePrice * 0.8;
    for (const row of schedule) {
      if (row.endBalance <= threshold80) { pmiRequiredUntilYear = row.year; break; }
    }
  }

  // Rate shock (+2%)
  const shockedMRate   = monthlyRateUS(p.interestRate + 2);
  const shockedPayment = calcPayment(loanAmount, shockedMRate, months);

  // Round-up savings ($100 extra)
  const roundSched     = buildSchedule(loanAmount, mRate, months, extra + 100);
  const roundInterest  = roundSched.reduce((s, r) => s + r.interestPaid, 0);
  const roundYearsSaved = Math.max(0, schedule.length - roundSched.length);
  const roundIntSaved   = Math.max(0, totalInterest - roundInterest);

  // PMI threshold (18–20% down)
  let pmiThresholdAmountNeeded: number | null = null;
  let pmiThresholdAnnualSavings: number | null = null;
  if (downPct >= 18 && downPct < 20) {
    const needed = p.homePrice * 0.2 - p.downPayment;
    const annSav = monthlyPmi * 12;
    if (needed > 0 && annSav > 0) {
      pmiThresholdAmountNeeded  = needed;
      pmiThresholdAnnualSavings = annSav;
    }
  }

  // Health score — Mode B (no income; mirrors calculator Mode B exactly)
  const dpScore   = downPct >= 20 ? 40 : downPct >= 15 ? 30 : downPct >= 10 ? 20 : 10;
  const pmiScore  = monthlyPmi === 0 ? 35
    : (pmiRequiredUntilYear !== null && pmiRequiredUntilYear <= 5) ? 25 : 10;
  const rateScore = p.interestRate <= 6 ? 25 : p.interestRate <= 7 ? 18 : p.interestRate <= 8 ? 10 : 5;
  const hScore    = Math.round(Math.min(100, Math.max(0, dpScore + pmiScore + rateScore)));
  const hLabel    = (hScore >= 80 ? 'Excellent' : hScore >= 65 ? 'Good' : hScore >= 50 ? 'Fair' : hScore >= 35 ? 'Manageable' : 'Needs Attention') as
    'Excellent' | 'Good' | 'Fair' | 'Manageable' | 'Needs Attention';

  let hTitle: string, hCopy: string;
  if (downPct < 10) {
    hTitle = 'Low down payment is the primary risk.';
    hCopy  = 'PMI applies and your equity cushion is thin. Add annual income above to include DTI analysis in this score.';
  } else if (monthlyPmi > 0) {
    const usFmtx = makeFmtx('en-US', 'USD');
    hTitle = `PMI adds ${usFmtx(monthlyPmi)}/mo to your payment.`;
    hCopy  = 'Score based on down payment, PMI, and rate. Add your annual income to include DTI analysis.';
  } else {
    hTitle = 'Score based on down payment, PMI, and rate.';
    hCopy  = 'Add your annual income above to include full DTI analysis in this score.';
  }

  // Insight text (mirrors getInsight())
  const ratio = ((totalInterest / loanAmount) * 100).toFixed(0);
  const insightText = p.interestRate > 7
    ? `At ${p.interestRate}%, you'll pay $${Math.round(totalInterest).toLocaleString()} in total interest (${ratio}% of your loan). Consider refinancing if rates drop 0.75%+ — that break-even typically arrives in 18–24 months for most borrowers.`
    : `Your ${p.interestRate}% rate means $${Math.round(totalInterest).toLocaleString()} in total interest over ${p.loanTermYears} years. One extra payment per year reduces a 30-year mortgage to roughly 25 years and saves approximately $${Math.round(totalInterest * 0.15).toLocaleString()}.`;

  return {
    homePrice: p.homePrice, downPaymentAmount: p.downPayment, downPct,
    interestRate: p.interestRate, loanTermYears: p.loanTermYears,
    frequency: p.frequency, extraPayment: extra,
    propertyTaxAnnual: propTax, homeInsuranceAnnual: homeIns,
    hoaFeeMonthly: hoa, pmiRateAnnual: pmiRate,
    incomeEntered: income > 0, grossIncome: income, otherDebts: debts,
    loanAmount, baseMonthlyPI, displayPayment,
    monthlyTax: mTax, monthlyInsurance: mIns, monthlyHoa: hoa, monthlyPmi,
    totalMonthly, totalInterest, totalPayment, pmiRequiredUntilYear,
    healthScore: hScore, healthLabel: hLabel, healthTitle: hTitle, healthCopy: hCopy,
    frontEndDTI: null, backEndDTI: null,
    rateShockNewRate: p.interestRate + 2, rateShockDifference: shockedPayment - baseMonthlyPI,
    roundUpYearsSaved: roundYearsSaved, roundUpInterestSaved: roundIntSaved,
    pmiThresholdAmountNeeded, pmiThresholdAnnualSavings,
    schedule: schedule.map((r) => ({ year: r.year, endBalance: r.endBalance })),
    insightText,
  };
}

// ─── Investment Growth (CI) helpers ──────────────────────────────────────────
// Mirrors CompoundInterestCalculator.tsx logic for sample generation only.

function ciEMR(annualRatePct: number, periods: number): number {
  if (Math.abs(annualRatePct) < 1e-10) return 0;
  const eAR = Math.pow(1 + annualRatePct / 100 / periods, periods) - 1;
  const eMR = Math.pow(1 + eAR, 1 / 12) - 1;
  return Number.isFinite(eMR) ? eMR : 0;
}

function ciFV(r: number, months: number, principal: number, monthly: number): number {
  if (months <= 0) return Math.max(0, principal);
  if (Math.abs(r) < 1e-10) return Math.max(0, principal + monthly * months);
  const growth = Math.pow(1 + r, months);
  if (!Number.isFinite(growth)) return Math.max(0, principal + monthly * months);
  return Math.max(0, principal * growth + monthly * (growth - 1) / r);
}

const FREQ_PERIODS: Record<CIFreq, number> = {
  annually: 1, semi: 2, monthly: 12, daily: 365,
};

function buildCIInput(p: {
  initialInvestment: number; monthlyContribution: number; annualRate: number;
  freq: CIFreq; yearsInvested: number;
  targetAmount?: number; startingAge?: number;
  region: 'ca' | 'us';
}): InvestmentGrowthAdapterInput {
  const periods = FREQ_PERIODS[p.freq];
  const r       = ciEMR(p.annualRate, periods);
  const months  = p.yearsInvested * 12;

  const totalContributions = p.initialInvestment + p.monthlyContribution * months;
  const finalBalance       = ciFV(r, months, p.initialInvestment, p.monthlyContribution);
  const totalInterest      = Math.max(0, finalBalance - totalContributions);
  const interestPct        = finalBalance > 0 ? (totalInterest / finalBalance) * 100 : 0;

  const powerScore  = Math.round(Math.min(100, interestPct * 1.5));
  const powerLabel  = (powerScore >= 80 ? 'Excellent' : powerScore >= 65 ? 'Good' : powerScore >= 45 ? 'Fair' : 'Poor') as 'Excellent'|'Good'|'Fair'|'Poor';
  const powerStatus = (powerLabel === 'Poor' ? 'Caution' : powerLabel === 'Fair' ? 'Watch' : 'Healthy') as 'Healthy'|'Watch'|'Caution';

  const hasTarget   = (p.targetAmount ?? 0) > 0;
  const targetAmt   = p.targetAmount ?? 0;
  const targetGap   = hasTarget ? targetAmt - finalBalance : 0;
  const targetProgress = hasTarget && targetAmt > 0 ? Math.min(200, (finalBalance / targetAmt) * 100) : 0;
  let leverState: 'behind'|'on-track'|'no-target' = 'no-target';
  let surplus = 0, extraMonthlyNeeded = 0;
  if (hasTarget) {
    if (finalBalance >= targetAmt) {
      leverState = 'on-track'; surplus = finalBalance - targetAmt;
    } else {
      leverState = 'behind';
      const af = Math.abs(r) > 1e-10 ? (Math.pow(1 + r, months) - 1) / r : months;
      extraMonthlyNeeded = af > 0 ? Math.max(0, targetGap / af) : 0;
    }
  }

  const boost100FV = ciFV(r, months, p.initialInvestment, p.monthlyContribution + 100);
  const boost100   = Math.max(0, boost100FV - finalBalance);

  const balAt10 = ciFV(r, 120, p.initialInvestment, p.monthlyContribution);
  const balAt20 = ciFV(r, 240, p.initialInvestment, p.monthlyContribution);
  const balAt30 = ciFV(r, 360, p.initialInvestment, p.monthlyContribution);

  const rMonthly = ciEMR(p.annualRate, 12);
  const rAnnual  = ciEMR(p.annualRate, 1);
  const fvMonthly = ciFV(rMonthly, months, p.initialInvestment, p.monthlyContribution);
  const fvAnnual  = ciFV(rAnnual,  months, p.initialInvestment, p.monthlyContribution);
  const freqGainVsMonthly = (p.freq === 'annually' || p.freq === 'semi')
    ? Math.max(0, fvMonthly - finalBalance) : 0;
  const freqGainVsAnnual  = (p.freq === 'monthly'  || p.freq === 'daily')
    ? Math.max(0, finalBalance - fvAnnual)  : 0;

  return {
    initialInvestment: p.initialInvestment, monthlyContribution: p.monthlyContribution,
    annualRate: p.annualRate, freq: p.freq, yearsInvested: p.yearsInvested,
    hasTarget, targetAmount: targetAmt,
    hasAge: (p.startingAge ?? 0) >= 10, startingAge: p.startingAge ?? 0,
    finalBalance, totalContributions, totalInterest, interestPct,
    powerScore, powerLabel, powerStatus,
    leverState, targetProgress, targetGap, surplus, extraMonthlyNeeded,
    boost100, boost100FV, balAt10, balAt20, balAt30,
    freqGainVsMonthly, freqGainVsAnnual, region: p.region,
  };
}

// ─── Investment Fees helpers ──────────────────────────────────────────────────
// Mirrors InvestmentFeesCalculator.tsx math for sample generation only.

function calcFeesFV(annualRatePct: number, years: number, principal: number, monthly: number): number {
  if (years <= 0) return Math.max(0, principal);
  const n = years * 12;
  if (Math.abs(annualRatePct) < 1e-10) return Math.max(0, principal + monthly * n);
  const r = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  if (Math.abs(r) < 1e-10) return Math.max(0, principal + monthly * n);
  const growth = Math.pow(1 + r, n);
  return Math.max(0, principal * growth + monthly * (growth - 1) / r);
}

function buildFeesInput(p: {
  initialInvestment: number; monthlyContribution: number;
  annualReturn: number; currentFee: number; compFee: number;
  yearsInvested: number; region: 'ca' | 'us';
}): InvestmentFeesAdapterInput {
  const n               = p.yearsInvested * 12;
  const netAnnual       = p.annualReturn - p.currentFee;
  const cmpAnnual       = p.annualReturn - p.compFee;
  const totalContribs   = p.initialInvestment + p.monthlyContribution * n;
  const grossFV         = calcFeesFV(p.annualReturn, p.yearsInvested, p.initialInvestment, p.monthlyContribution);
  const netFV           = calcFeesFV(netAnnual,       p.yearsInvested, p.initialInvestment, p.monthlyContribution);
  const cmpFV           = calcFeesFV(cmpAnnual,       p.yearsInvested, p.initialInvestment, p.monthlyContribution);
  const lostToFees      = Math.max(0, grossFV - netFV);
  const netReturns      = Math.max(0, netFV - totalContribs);
  const feeSavings      = Math.max(0, cmpFV - netFV);
  const monthlyEquiv    = n > 0 ? feeSavings / n : 0;
  const growthEff       = grossFV > 0 ? Math.min(100, (netFV / grossFV) * 100) : 100;
  const lostPct         = grossFV > 0 ? (lostToFees / grossFV) * 100 : 0;
  const feeDragScore    = Math.round(Math.max(0, Math.min(100, 100 - lostPct * 2.8)));
  const scoreLabel      = (feeDragScore >= 80 ? 'Excellent' : feeDragScore >= 65 ? 'Good' : feeDragScore >= 45 ? 'Fair' : 'Poor') as 'Excellent'|'Good'|'Fair'|'Poor';
  const statusLabel     = (scoreLabel === 'Poor' ? 'Caution' : scoreLabel === 'Fair' ? 'Watch' : 'Healthy') as 'Healthy'|'Watch'|'Caution';

  const lostAt10 = Math.max(0, calcFeesFV(p.annualReturn, 10, p.initialInvestment, p.monthlyContribution) - calcFeesFV(netAnnual, 10, p.initialInvestment, p.monthlyContribution));
  const lostAt20 = Math.max(0, calcFeesFV(p.annualReturn, 20, p.initialInvestment, p.monthlyContribution) - calcFeesFV(netAnnual, 20, p.initialInvestment, p.monthlyContribution));
  const lostAt30 = Math.max(0, calcFeesFV(p.annualReturn, 30, p.initialInvestment, p.monthlyContribution) - calcFeesFV(netAnnual, 30, p.initialInvestment, p.monthlyContribution));

  let extraMonthly = 0;
  if (lostToFees > 0 && n > 0) {
    const safeNet = Math.max(0.001, netAnnual);
    const rNet = Math.pow(1 + safeNet / 100, 1 / 12) - 1;
    const gn   = Math.pow(1 + rNet, n);
    const af   = rNet > 1e-10 ? (gn - 1) / rNet : n;
    extraMonthly = af > 0 ? lostToFees / af : 0;
  }

  return {
    initialInvestment: p.initialInvestment, monthlyContribution: p.monthlyContribution,
    annualReturn: p.annualReturn, currentFee: p.currentFee, compFee: p.compFee,
    yearsInvested: p.yearsInvested,
    grossFV, netFV, cmpFV, totalContributions: totalContribs,
    lostToFees, netReturns, feeSavings, monthlyEquivSaving: monthlyEquiv,
    growthEfficiency: growthEff,
    feeDragScore, scoreLabel, statusLabel,
    isLowCost: p.currentFee <= p.compFee,
    feeExceedsReturn: p.currentFee >= p.annualReturn && p.annualReturn > 0,
    lostAt10, lostAt20, lostAt30,
    extraMonthlyToMatchGross: extraMonthly,
    region: p.region,
  };
}

// ─── ROI helpers ──────────────────────────────────────────────────────────────
// Mirrors ROICalculator.tsx math for sample generation only.

function buildROIInput(p: {
  initialCost: number; finalValue: number; additionalCosts?: number;
  years?: number; targetROIPct?: number; region: 'ca' | 'us';
}): ROIAdapterInput {
  const additionalCosts = p.additionalCosts ?? 0;
  const years           = p.years ?? 0;
  const targetROIPct    = p.targetROIPct ?? 0;
  const hasTargetStr    = p.targetROIPct !== undefined && p.targetROIPct > -100;

  const totalCost       = p.initialCost + additionalCosts;
  const netProfit       = p.finalValue - totalCost;
  const roiPct          = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const isProfit        = netProfit > 0.005;
  const isLoss          = netProfit < -0.005;

  let annualizedROI: number | null = null;
  if (years > 0 && roiPct > -100 + 1e-6) {
    const ann = Math.pow(1 + roiPct / 100, 1 / years) - 1;
    annualizedROI = Number.isFinite(ann) ? ann * 100 : null;
  }

  const hasTarget        = hasTargetStr && targetROIPct > -100;
  const targetFinalValue = hasTarget ? totalCost * (1 + targetROIPct / 100) : 0;
  const targetGap        = hasTarget ? p.finalValue - targetFinalValue : 0;
  const targetProgress   = hasTarget && targetFinalValue > 0
    ? Math.min(200, (p.finalValue / targetFinalValue) * 100) : 0;
  const surplus          = hasTarget && targetGap >= 0 ? targetGap : 0;
  const additionalValueNeeded = hasTarget && targetGap < 0 ? Math.abs(targetGap) : 0;
  const breakEvenGap     = isLoss ? Math.abs(netProfit) : 0;

  const healthScore = Math.round(Math.min(100, Math.max(0, 50 + roiPct * 1.5)));
  const healthLabel = (healthScore >= 80 ? 'Excellent' : healthScore >= 65 ? 'Good' : healthScore >= 45 ? 'Fair' : 'Poor') as 'Excellent'|'Good'|'Fair'|'Poor';
  const healthStatus = (healthLabel === 'Poor' ? 'Caution' : healthLabel === 'Fair' ? 'Watch' : 'Healthy') as 'Healthy'|'Watch'|'Caution';

  return {
    initialCost: p.initialCost, finalValue: p.finalValue, additionalCosts,
    years, targetROIPct,
    totalCost, netProfit, roiPct, isProfit, isLoss, annualizedROI,
    hasTarget, targetFinalValue, targetGap, targetProgress, surplus,
    additionalValueNeeded, breakEvenGap,
    healthScore, healthLabel, healthStatus,
    region: p.region,
  };
}

// ─── Salary helper ───────────────────────────────────────────────────────────

type SalaryType = 'Annual' | 'Monthly' | 'Biweekly' | 'Weekly' | 'Hourly';
type PayFreq    = 'Monthly' | 'Semi-monthly' | 'Biweekly' | 'Weekly';

function buildSalaryInput(opts: {
  salaryAmount: number; salaryType: SalaryType; payFreq: PayFreq;
  hoursPerWeek: number; weeksPerYear: number; deductionRate: number;
  region: 'ca' | 'us';
}): SalaryAdapterInput {
  const { salaryAmount, salaryType, payFreq, hoursPerWeek, weeksPerYear, deductionRate, region } = opts;
  const hoursPerYear = hoursPerWeek * weeksPerYear;

  let annualGross: number;
  switch (salaryType) {
    case 'Annual':    annualGross = salaryAmount; break;
    case 'Monthly':   annualGross = salaryAmount * 12; break;
    case 'Biweekly':  annualGross = salaryAmount * 26; break;
    case 'Weekly':    annualGross = salaryAmount * weeksPerYear; break;
    case 'Hourly':    annualGross = salaryAmount * hoursPerYear; break;
  }

  const monthlyGross     = annualGross / 12;
  const semiMonthlyGross = annualGross / 24;
  const biweeklyGross    = annualGross / 26;
  const weeklyGross      = annualGross / weeksPerYear;
  const dailyGross       = annualGross / (weeksPerYear * 5);
  const hourlyEquivalent = hoursPerYear > 0 ? annualGross / hoursPerYear : 0;

  const rate = Math.min(99, Math.max(0, deductionRate));
  const annualDeductions = annualGross * (rate / 100);
  const annualTakeHome   = annualGross - annualDeductions;
  const takeHomePct      = 100 - rate;

  const periodsMap: Record<PayFreq, number> = {
    'Monthly': 12, 'Semi-monthly': 24, 'Biweekly': 26, 'Weekly': weeksPerYear,
  };
  const periodsPerYear    = periodsMap[payFreq];
  const takeHomePerPeriod = periodsPerYear > 0 ? annualTakeHome / periodsPerYear : 0;
  const effectiveHourlyRate = hoursPerYear > 0 ? annualTakeHome / hoursPerYear : 0;

  const pcs =
    takeHomePct >= 70 ? Math.round(70 + (takeHomePct - 70) * 1.0)
    : takeHomePct >= 60 ? Math.round(55 + (takeHomePct - 60) * 1.5)
    : takeHomePct >= 50 ? Math.round(40 + (takeHomePct - 50) * 1.5)
    : Math.round(Math.max(0, takeHomePct * 0.8));

  const clarityLabel =
    pcs >= 70 ? 'Low Deduction Load' :
    pcs >= 55 ? 'Moderate Deduction Load' : 'High Deduction Load';

  return {
    salaryAmount, salaryType, payFreq, hoursPerWeek, weeksPerYear, deductionRate: rate,
    annualGross, monthlyGross, biweeklyGross, weeklyGross, dailyGross,
    hourlyEquivalent, annualDeductions, annualTakeHome, takeHomePerPeriod,
    effectiveHourlyRate, takeHomePct, periodsPerYear, payFreqLabel: payFreq,
    payClarityScore: pcs, clarityLabel, region,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const outDir = path.join(__dirname, '..', '_docs', 'sample-pdfs');
  fs.mkdirSync(outDir, { recursive: true });

  const now = new Date('2026-06-16T12:00:00');

  // ── Canada report ──────────────────────────────────────────────────────────
  {
    // en-US + CAD → "CA$" prefix (en-CA + CAD gives local "$", ambiguous in PDF)
    const caFmt  = makeFmt('en-US', 'CAD');
    const caFmtx = makeFmtx('en-US', 'CAD');
    const { data, filename } = buildRetirementReportData(CANADA_INPUT, 'ca', caFmt, caFmtx, now);
    const doc   = await buildReportDocument(data);
    const bytes = (doc as any).output('arraybuffer') as ArrayBuffer;
    const dest  = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from(bytes));
    console.log(`✓ CA report → ${dest}`);
  }

  // ── USA report (On Track) ──────────────────────────────────────────────────
  {
    const usFmt  = makeFmt('en-US', 'USD');
    const usFmtx = makeFmtx('en-US', 'USD');
    const { data, filename } = buildRetirementReportData(USA_INPUT, 'us', usFmt, usFmtx, now);
    const doc   = await buildReportDocument(data);
    const bytes = (doc as any).output('arraybuffer') as ArrayBuffer;
    const dest  = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from(bytes));
    console.log(`✓ US (On Track) report → ${dest}`);
  }

  // ── Canada On Track — Key Drivers status-awareness verification ───────────
  {
    const caFmt  = makeFmt('en-US', 'CAD');
    const caFmtx = makeFmtx('en-US', 'CAD');
    const { data, filename: fn } = buildRetirementReportData(CANADA_ONTRACK_INPUT, 'ca', caFmt, caFmtx, now);
    const dest = path.join(outDir, fn.replace('.pdf', '-ontrack.pdf'));
    console.log(`  CA On Track driver[3]: "${data.keyDrivers[3]}"`);
    const doc   = await buildReportDocument(data);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ CA (On Track) report → ${dest}`);
  }

  // ── USA Behind Target — regression verification ────────────────────────────
  {
    const usFmt  = makeFmt('en-US', 'USD');
    const usFmtx = makeFmtx('en-US', 'USD');
    const { data, filename: fn } = buildRetirementReportData(USA_BEHIND_INPUT, 'us', usFmt, usFmtx, now);
    const dest = path.join(outDir, fn.replace('.pdf', '-behind.pdf'));
    console.log(`  US Behind driver[3]:   "${data.keyDrivers[3]}"`);
    const doc   = await buildReportDocument(data);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ US (Behind Target) report → ${dest}`);
  }

  // ── Savings Goal CA — Below Goal (vehicle, Behind Target) ─────────────────
  {
    const { data, filename } = buildSavingsGoalReportData(SG_CA_BEHIND, 'ca', 'vehicle', now);
    console.log(`  SG CA status: ${data.executiveSummary.statusLabel} | driver[0]: "${data.keyDrivers[0].slice(0, 60)}..."`);
    const doc   = await buildReportDocument(data);
    const dest  = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ SG CA (Behind Target / vehicle) → ${dest}`);
  }

  // ── Savings Goal US — On Track (home down payment, surplus) ───────────────
  {
    const { data, filename } = buildSavingsGoalReportData(SG_US_ONTRACK, 'us', 'home', now);
    console.log(`  SG US status: ${data.executiveSummary.statusLabel} | driver[0]: "${data.keyDrivers[0].slice(0, 60)}..."`);
    const doc   = await buildReportDocument(data);
    const dest  = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ SG US (On Track / home) → ${dest}`);
  }

  // ── Mortgage CA — Standard (20% down, no CMHC, monthly) ──────────────────
  {
    const mtgInput = buildMortgageInput({
      homePrice: 650000, downPayment: 130000,
      interestRate: 5.25, amortizationYears: 25, frequency: 'monthly',
      propertyTaxAnnual: 4800, homeInsuranceAnnual: 1400,
    });
    console.log(`  MTG Standard: loan ${mtgInput.loanAmount.toFixed(0)}, totalInterest ${mtgInput.totalInterest.toFixed(0)}, health: ${mtgInput.healthScore} (${mtgInput.healthLabel})`);
    const { data, filename } = buildMortgageReportData(mtgInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ CA Mortgage Standard → ${dest}`);
  }

  // ── Mortgage CA — CMHC + high rate (5% down, 5.99%, accel bi-weekly) ─────
  {
    const mtgInput = buildMortgageInput({
      homePrice: 520000, downPayment: 26000,
      interestRate: 5.99, amortizationYears: 25, frequency: 'accelerated-biweekly',
    });
    console.log(`  MTG CMHC: loan ${mtgInput.loanAmount.toFixed(0)}, cmhc ${mtgInput.cmhcAmount.toFixed(0)}, health: ${mtgInput.healthScore} (${mtgInput.healthLabel})`);
    const { data, filename: fn } = buildMortgageReportData(mtgInput, now);
    const dest = path.join(outDir, fn.replace('.pdf', '-cmhc.pdf'));
    const doc  = await buildReportDocument(data);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ CA Mortgage CMHC (Needs Attention) → ${dest}`);
  }

  // ── US Mortgage — Standard (20% down, no PMI, monthly) ───────────────────
  {
    const usMtgInput = buildUSMortgageInput({
      homePrice: 450000, downPayment: 90000,
      interestRate: 6.75, loanTermYears: 30, frequency: 'monthly',
      propertyTaxAnnual: 5400, homeInsuranceAnnual: 1800,
    });
    console.log(`  US MTG Standard: loan ${usMtgInput.loanAmount.toFixed(0)}, totalInterest ${usMtgInput.totalInterest.toFixed(0)}, PMI: ${usMtgInput.monthlyPmi.toFixed(2)}/mo, health: ${usMtgInput.healthScore} (${usMtgInput.healthLabel})`);
    const { data, filename } = buildUSMortgageReportData(usMtgInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ US Mortgage Standard (no PMI) → ${dest}`);
  }

  // ── US Mortgage — PMI scenario (10% down, PMI applies) ───────────────────
  {
    const usMtgInput = buildUSMortgageInput({
      homePrice: 380000, downPayment: 38000,
      interestRate: 6.75, loanTermYears: 30, frequency: 'monthly',
      propertyTaxAnnual: 4200, homeInsuranceAnnual: 1500, pmiRateAnnual: 0.5,
    });
    console.log(`  US MTG PMI: loan ${usMtgInput.loanAmount.toFixed(0)}, PMI: ${usMtgInput.monthlyPmi.toFixed(2)}/mo (~yr ${usMtgInput.pmiRequiredUntilYear}), health: ${usMtgInput.healthScore} (${usMtgInput.healthLabel})`);
    const { data, filename: fn } = buildUSMortgageReportData(usMtgInput, now);
    const dest = path.join(outDir, fn.replace('.pdf', '-pmi.pdf'));
    const doc  = await buildReportDocument(data);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ US Mortgage PMI (10% down) → ${dest}`);
  }

  // ── CI CA — Standard long-term (Monthly, 6%, 20yr, $5K initial, $200/mo) ──
  {
    const ciInput = buildCIInput({
      initialInvestment: 5000, monthlyContribution: 200,
      annualRate: 6, freq: 'monthly', yearsInvested: 20,
      region: 'ca',
    });
    console.log(`  CI CA: finalBalance ${ciInput.finalBalance.toFixed(0)}, growth ${ciInput.totalInterest.toFixed(0)}, powerScore: ${ciInput.powerScore} (${ciInput.powerLabel})`);
    const { data, filename } = buildInvestmentGrowthReportData(ciInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ CI CA (Monthly/20yr/Healthy) → ${dest}`);
  }

  // ── CI US — Shorter horizon (Annually, 4.5%, 10yr, $10K initial, $500/mo) ─
  {
    const ciInput = buildCIInput({
      initialInvestment: 10000, monthlyContribution: 500,
      annualRate: 4.5, freq: 'annually', yearsInvested: 10,
      region: 'us',
    });
    console.log(`  CI US: finalBalance ${ciInput.finalBalance.toFixed(0)}, growth ${ciInput.totalInterest.toFixed(0)}, powerScore: ${ciInput.powerScore} (${ciInput.powerLabel}), freqGainVsMonthly: ${ciInput.freqGainVsMonthly.toFixed(0)}`);
    const { data, filename } = buildInvestmentGrowthReportData(ciInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ CI US (Annually/10yr/Caution) → ${dest}`);
  }

  // ── Investment Fees CA — high fee scenario (1.50%, 20yr) ─────────────────
  {
    const feeInput = buildFeesInput({
      initialInvestment: 10000, monthlyContribution: 500,
      annualReturn: 7, currentFee: 1.50, compFee: 0.20,
      yearsInvested: 20, region: 'ca',
    });
    console.log(`  FEE CA: netFV ${feeInput.netFV.toFixed(0)}, lostToFees ${feeInput.lostToFees.toFixed(0)}, feeDragScore: ${feeInput.feeDragScore} (${feeInput.scoreLabel})`);
    const { data, filename } = buildInvestmentFeesReportData(feeInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Investment Fees CA (1.50% fee / 20yr) → ${dest}`);
  }

  // ── Investment Fees US — low fee scenario (0.20%, 30yr) ──────────────────
  {
    const feeInput = buildFeesInput({
      initialInvestment: 25000, monthlyContribution: 800,
      annualReturn: 7, currentFee: 0.20, compFee: 0.05,
      yearsInvested: 30, region: 'us',
    });
    console.log(`  FEE US: netFV ${feeInput.netFV.toFixed(0)}, lostToFees ${feeInput.lostToFees.toFixed(0)}, feeDragScore: ${feeInput.feeDragScore} (${feeInput.scoreLabel}), isLowCost: ${feeInput.isLowCost}`);
    const { data, filename } = buildInvestmentFeesReportData(feeInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Investment Fees US (0.20% fee / 30yr / low-cost) → ${dest}`);
  }

  // ── ROI CA — profitable with target on track ──────────────────────────────
  {
    const roiInput = buildROIInput({
      initialCost: 10000, finalValue: 13500, additionalCosts: 500,
      years: 2, targetROIPct: 25, region: 'ca',
    });
    console.log(`  ROI CA: roi ${roiInput.roiPct.toFixed(1)}%, healthScore: ${roiInput.healthScore} (${roiInput.healthLabel}), targetProgress: ${roiInput.targetProgress.toFixed(0)}%`);
    const { data, filename } = buildROIReportData(roiInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ ROI CA (on target / profitable) → ${dest}`);
  }

  // ── ROI US — loss scenario ────────────────────────────────────────────────
  {
    const roiInput = buildROIInput({
      initialCost: 20000, finalValue: 16000,
      years: 3, region: 'us',
    });
    console.log(`  ROI US: roi ${roiInput.roiPct.toFixed(1)}%, healthScore: ${roiInput.healthScore} (${roiInput.healthLabel}), breakEvenGap: ${roiInput.breakEvenGap.toFixed(0)}`);
    const { data, filename } = buildROIReportData(roiInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-loss.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ ROI US (loss scenario) → ${dest}`);
  }

  // ── Personal Loan CA — $15k / 8.5% / 3yr / with income ──────────────────
  {
    const loanInput = buildPersonalLoanInput({
      loanAmount: 15000, annualRate: 8.5, loanTermYears: 3,
      annualIncome: 65000, region: 'ca',
    });
    console.log(`  Personal Loan CA: payment ${loanInput.monthlyPayment.toFixed(2)}, totalInterest ${loanInput.totalInterest.toFixed(0)}, loanScore: ${loanInput.loanScore} (${loanInput.scoreLabel}), dtiPct: ${loanInput.dtiPct?.toFixed(1)}%`);
    const { data, filename } = buildLoanReportData(loanInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Personal Loan CA → ${dest}`);
  }

  // ── Personal Loan US — $25k / 12% / 5yr / no income ─────────────────────
  {
    const loanInput = buildPersonalLoanInput({
      loanAmount: 25000, annualRate: 12, loanTermYears: 5, region: 'us',
    });
    console.log(`  Personal Loan US: payment ${loanInput.monthlyPayment.toFixed(2)}, totalInterest ${loanInput.totalInterest.toFixed(0)}, loanScore: ${loanInput.loanScore} (${loanInput.scoreLabel})`);
    const { data, filename } = buildLoanReportData(loanInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-high-rate.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Personal Loan US (high rate) → ${dest}`);
  }

  // ── Car Loan CA — $42k / 15% down / 7.5% / 60mo / with income ───────────
  {
    const loanInput = buildCarLoanInput({
      vehiclePrice: 42000, downPayment: 6300, annualRate: 7.5,
      loanTermMonths: 60, annualIncome: 80000, region: 'ca',
    });
    console.log(`  Car Loan CA: loanAmount ${loanInput.loanAmount.toFixed(0)}, payment ${loanInput.monthlyPayment.toFixed(2)}, totalInterest ${loanInput.totalInterest.toFixed(0)}, loanScore: ${loanInput.loanScore} (${loanInput.scoreLabel}), isStrongEquity: ${loanInput.isStrongEquity}`);
    const { data, filename } = buildLoanReportData(loanInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Car Loan CA → ${dest}`);
  }

  // ── Car Loan US — $55k / 20%+ down / 5.9% / 48mo / strong equity ────────
  {
    const loanInput = buildCarLoanInput({
      vehiclePrice: 55000, downPayment: 12000, annualRate: 5.9,
      loanTermMonths: 48, region: 'us',
    });
    console.log(`  Car Loan US: loanAmount ${loanInput.loanAmount.toFixed(0)}, payment ${loanInput.monthlyPayment.toFixed(2)}, totalInterest ${loanInput.totalInterest.toFixed(0)}, loanScore: ${loanInput.loanScore} (${loanInput.scoreLabel}), isStrongEquity: ${loanInput.isStrongEquity}`);
    const { data, filename } = buildLoanReportData(loanInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-strong-equity.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Car Loan US (strong equity) → ${dest}`);
  }

  // ── Salary CA — $75k annual / 25% deductions / biweekly pay ─────────────
  {
    const salaryInput = buildSalaryInput({
      salaryAmount: 75000, salaryType: 'Annual', payFreq: 'Biweekly',
      hoursPerWeek: 40, weeksPerYear: 52, deductionRate: 25, region: 'ca',
    });
    console.log(`  Salary CA: annualGross ${salaryInput.annualGross.toFixed(0)}, annualTakeHome ${salaryInput.annualTakeHome.toFixed(0)}, takeHomePct: ${salaryInput.takeHomePct.toFixed(0)}%, payClarityScore: ${salaryInput.payClarityScore} (${salaryInput.clarityLabel})`);
    const { data, filename } = buildSalaryReportData(salaryInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-ca.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Salary CA → ${dest}`);
  }

  // ── Salary US — $95k annual / 28% deductions / semi-monthly pay ──────────
  {
    const salaryInput = buildSalaryInput({
      salaryAmount: 95000, salaryType: 'Annual', payFreq: 'Semi-monthly',
      hoursPerWeek: 40, weeksPerYear: 52, deductionRate: 28, region: 'us',
    });
    console.log(`  Salary US: annualGross ${salaryInput.annualGross.toFixed(0)}, annualTakeHome ${salaryInput.annualTakeHome.toFixed(0)}, takeHomePct: ${salaryInput.takeHomePct.toFixed(0)}%, payClarityScore: ${salaryInput.payClarityScore} (${salaryInput.clarityLabel})`);
    const { data, filename } = buildSalaryReportData(salaryInput, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-us.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Salary US → ${dest}`);
  }

  // ── Retirement Withdrawal CA — Watch (6% return, 5% WR, 30yr no depletion) ─
  {
    const inflRate = 2.5;
    const w: WithdrawalAdapterInput = {
      currentSavings: 800000, annualWithdrawal: 40000, annualReturn: 6,
      inflationRate: inflRate, currentAge: 62, withdrawalStartAge: 65,
      targetEndingBalance: 0, timing: 'end',
      yearsLasting: 30, depletionAge: null, depleted: false,
      firstYearRate: 40000 / 800000,
      withdrawalAtYear10: Math.round(40000 * Math.pow(1 + inflRate / 100, 9)),
      withdrawalAtYear20: Math.round(40000 * Math.pow(1 + inflRate / 100, 19)),
      withdrawalAtYear30: Math.round(40000 * Math.pow(1 + inflRate / 100, 29)),
      totalWithdrawn: 40000 * 30 * 1.35,   // approx inflation-adjusted total
      remainingBalance: 185000,
      sustainabilityStatus: 'Watch', sustainabilityScore: 68,
      pressureScore: 72, pressureStatus: 'Moderate',
      region: 'ca',
    };
    console.log(`  Withdrawal CA: WR ${(w.firstYearRate * 100).toFixed(1)}%, status: ${w.sustainabilityStatus}`);
    const { data, filename } = buildWithdrawalReportData(w, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-ca.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Withdrawal CA (Watch / 5% WR / 30yr) → ${dest}`);
  }

  // ── Retirement Withdrawal US — At Risk (5% return, 9% WR, depletes at 79) ──
  {
    const inflRate = 3.0;
    const w: WithdrawalAdapterInput = {
      currentSavings: 500000, annualWithdrawal: 45000, annualReturn: 5,
      inflationRate: inflRate, currentAge: 62, withdrawalStartAge: 65,
      targetEndingBalance: 0, timing: 'end',
      yearsLasting: 17, depletionAge: 79, depleted: true,
      firstYearRate: 45000 / 500000,
      withdrawalAtYear10: Math.round(45000 * Math.pow(1 + inflRate / 100, 9)),
      withdrawalAtYear20: Math.round(45000 * Math.pow(1 + inflRate / 100, 19)),
      withdrawalAtYear30: Math.round(45000 * Math.pow(1 + inflRate / 100, 29)),
      totalWithdrawn: 45000 * 17 * 1.25,
      remainingBalance: 0,
      sustainabilityStatus: 'At Risk', sustainabilityScore: 34,
      pressureScore: 32, pressureStatus: 'Elevated Pressure',
      region: 'us',
    };
    console.log(`  Withdrawal US: WR ${(w.firstYearRate * 100).toFixed(1)}%, depletes age ${w.depletionAge}`);
    const { data, filename } = buildWithdrawalReportData(w, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-us-at-risk.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Withdrawal US (At Risk / 9% WR / depletes 79) → ${dest}`);
  }

  // ── FIRE CA — Building (32yo, 7%, 17yr to FI at 49) ─────────────────────
  {
    const fireTarget = 42000 * 25;  // 1,050,000
    const contribs   = 2000 * 17 * 12;
    const projAtFIRE = compoundFV(7, 17 * 12, 80000, 2000);
    const investGrowth = Math.max(0, projAtFIRE - 80000 - contribs);
    const f: FIREAdapterInput = {
      currentAge: 32, currentAssets: 80000, monthlyInvestment: 2000,
      annualExpenses: 42000, annualRate: 7, fireMultiple: 25,
      freq: 'monthly', annualIncome: 95000,
      fireTarget, rawProgressPct: (80000 / fireTarget) * 100,
      fireProgressPct: Math.min(100, (80000 / fireTarget) * 100),
      gapToFIRE: fireTarget - 80000,
      alreadyFI: false, monthsToFIRE: 17 * 12, yearsToFIRE: 17, fireAge: 49,
      projectedAtFIRE: Math.round(projAtFIRE),
      totalContribs: contribs,
      investGrowth: Math.round(investGrowth),
      savingsRate: (2000 * 12 / 95000) * 100,
      monthlyFor20yr: 1394,
      readinessScore: 55, readinessLabel: 'Fair',
      leverState: 'building', region: 'ca',
    };
    console.log(`  FIRE CA: target ${f.fireTarget}, progress ${f.rawProgressPct.toFixed(1)}%, fireAge ${f.fireAge}`);
    const { data, filename } = buildFIREReportData(f, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-ca.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ FIRE CA (Building / FI at 49) → ${dest}`);
  }

  // ── FIRE US — Already FI (52yo, $1.8M assets vs $1.5M target) ───────────
  {
    const fireTarget = 60000 * 25;  // 1,500,000
    const f: FIREAdapterInput = {
      currentAge: 52, currentAssets: 1800000, monthlyInvestment: 3000,
      annualExpenses: 60000, annualRate: 6, fireMultiple: 25,
      freq: 'monthly', annualIncome: null,
      fireTarget, rawProgressPct: (1800000 / fireTarget) * 100,
      fireProgressPct: 100, gapToFIRE: 0,
      alreadyFI: true, monthsToFIRE: 0, yearsToFIRE: 0, fireAge: 52,
      projectedAtFIRE: 1800000,
      totalContribs: 0, investGrowth: 0,
      savingsRate: null,
      monthlyFor20yr: 0,
      readinessScore: 96, readinessLabel: 'Excellent',
      leverState: 'already-fi', region: 'us',
    };
    console.log(`  FIRE US: alreadyFI ${f.alreadyFI}, progress ${f.rawProgressPct.toFixed(0)}%`);
    const { data, filename } = buildFIREReportData(f, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-us-fi.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ FIRE US (Already FI / $1.8M) → ${dest}`);
  }

  // ── TFSA CA — 6% monthly / 20yr / $35K base + $500/mo ───────────────────
  {
    const r = 0.005; // 6%/12
    const n = 240;
    const g = Math.pow(1 + r, n);
    const projTFSA = Math.round(35000 * g + 6000 * g + 500 * (g - 1) / r);
    const contribTFSA = 35000 + 6000 + 500 * 240;
    const growthTFSA  = projTFSA - contribTFSA;
    const t: CanadaRegisteredAdapterInput = {
      accountType: 'tfsa',
      currentBalance: 35000, availableRoom: 48000,
      plannedOneTime: 6000, monthlyContribution: 500,
      annualRate: 6, freq: 'monthly', yearsInvested: 20,
      projectedValue: projTFSA,
      totalContributions: contribTFSA,
      taxFreeGrowth: growthTFSA,
      growthPct: (growthTFSA / projTFSA) * 100,
      plannedFirstYear: 6000 + 500 * 12,
      roomUsedPct: ((6000 + 500 * 12) / 48000) * 100,
      overRoom: false, overRoomBy: 0,
      growthScore: 62, growthLabel: 'Fair',
      valAt10: Math.round(compoundFV(6, 120, 35000 + 6000, 500)),
      valAt20: projTFSA,
      valAt30: Math.round(compoundFV(6, 360, 35000 + 6000, 500)),
    };
    console.log(`  TFSA CA: projected ${t.projectedValue}, growth ${t.taxFreeGrowth}, growthScore ${t.growthScore}`);
    const { data, filename } = buildCanadaRegisteredReportData(t, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ TFSA CA (6% / 20yr / Fair growth) → ${dest}`);
  }

  // ── RRSP CA — 7% monthly / 25yr / $45K base + $800/mo ────────────────────
  {
    const projRRSP = Math.round(compoundFV(7, 300, 45000 + 10000, 800));
    const contribRRSP = 45000 + 10000 + 800 * 300;
    const growthRRSP  = projRRSP - contribRRSP;
    const marginalRate = 33.5;
    const taxRefund    = Math.min(10000, 25000) * marginalRate / 100;
    const rr: CanadaRegisteredAdapterInput = {
      accountType: 'rrsp',
      currentBalance: 45000, availableRoom: 25000,
      plannedOneTime: 10000, monthlyContribution: 800,
      annualRate: 7, freq: 'monthly', yearsInvested: 25,
      projectedValue: projRRSP,
      totalContributions: contribRRSP,
      taxFreeGrowth: growthRRSP,
      growthPct: (growthRRSP / projRRSP) * 100,
      plannedFirstYear: 10000 + 800 * 12,
      roomUsedPct: ((10000 + 800 * 12) / 25000) * 100,
      overRoom: false, overRoomBy: 0,
      growthScore: 82, growthLabel: 'Excellent',
      marginalTaxRate: marginalRate,
      estimatedTaxRefund: Math.round(taxRefund),
      valAt10: Math.round(compoundFV(7, 120, 55000, 800)),
      valAt20: Math.round(compoundFV(7, 240, 55000, 800)),
      valAt30: projRRSP,
    };
    console.log(`  RRSP CA: projected ${rr.projectedValue}, taxRefund ${rr.estimatedTaxRefund}, growthScore ${rr.growthScore}`);
    const { data, filename } = buildCanadaRegisteredReportData(rr, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename);
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ RRSP CA (7% / 25yr / Excellent growth) → ${dest}`);
  }

  // ── Mortgage Qualifier CA — Approved (5.25% / $140K income / 20% down) ───
  {
    const mq_ca_pi = Math.round(refPaymentCA(535000, 5.25, 25));
    const mq_ca_housing = mq_ca_pi + Math.round(6000 / 12) + 200;
    const mq_ca_income = Math.round(140000 / 12);
    const mq_ca: MortgageQualifierAdapterInput = {
      annualIncome: 140000, coApplicantIncome: 0,
      annualRate: 5.25, amortization: 25,
      propertyTax: 6000, heatingCosts: 200, downPayment: 100000,
      carPayment: 0, creditCardMin: 0, otherDebts: 0,
      gdsRatio: parseFloat(((mq_ca_housing / mq_ca_income) * 100).toFixed(1)),
      tdsRatio: parseFloat(((mq_ca_housing / mq_ca_income) * 100).toFixed(1)),
      gdsLimit: 39, tdsLimit: 44,
      gdsPass: true, tdsPass: true,
      maxMortgage: 535000, maxHomePrice: 635000,
      monthlyIncome: mq_ca_income,
      totalMonthlyDebts: 0,
      monthlyPI: mq_ca_pi, monthlyHousing: mq_ca_housing,
      verdict: 'approved',
      verdictReason: 'Both GDS and TDS ratios within limits.',
      region: 'ca',
    };
    console.log(`  MQ CA: GDS ${mq_ca.gdsRatio}% / TDS ${mq_ca.tdsRatio}% (limits ${mq_ca.gdsLimit}/${mq_ca.tdsLimit}) → ${mq_ca.verdict}`);
    const { data, filename } = buildMortgageQualifierReportData(mq_ca, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-ca.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Mortgage Qualifier CA (Approved / $535K max) → ${dest}`);
  }

  // ── Mortgage Qualifier US — Declined (6.75% / $75K income / over DTI) ────
  {
    const mq_us_pi = Math.round(refPaymentUS(200000, 6.75, 30));
    const mq_us_housing = mq_us_pi + Math.round(5000 / 12);
    const mq_us_income  = Math.round(75000 / 12);
    const mq_us_debts   = 600 + 200;
    const mq_us: MortgageQualifierAdapterInput = {
      annualIncome: 75000, coApplicantIncome: 0,
      annualRate: 6.75, amortization: 30,
      propertyTax: 5000, heatingCosts: 0, downPayment: 40000,
      carPayment: 600, creditCardMin: 200, otherDebts: 0,
      gdsRatio: parseFloat(((mq_us_housing / mq_us_income) * 100).toFixed(1)),
      tdsRatio: parseFloat((((mq_us_housing + mq_us_debts) / mq_us_income) * 100).toFixed(1)),
      gdsLimit: 28, tdsLimit: 36,
      gdsPass: false, tdsPass: false,
      maxMortgage: 182000, maxHomePrice: 222000,
      monthlyIncome: mq_us_income,
      totalMonthlyDebts: mq_us_debts,
      monthlyPI: mq_us_pi, monthlyHousing: mq_us_housing,
      verdict: 'declined',
      verdictReason: 'Front-end and back-end DTI ratios exceed CFPB 28/36 limits.',
      region: 'us',
    };
    console.log(`  MQ US: GDS ${mq_us.gdsRatio}% / TDS ${mq_us.tdsRatio}% (limits 28/36) → ${mq_us.verdict}`);
    const { data, filename } = buildMortgageQualifierReportData(mq_us, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-us.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Mortgage Qualifier US (Declined / over DTI) → ${dest}`);
  }

  // ── Mortgage Refinance CA — Saves (5.99% → 4.99%, break-even ~16 mo) ────
  {
    const rfBalance = 380000;
    const pCurr = Math.round(refPaymentCA(rfBalance, 5.99, 20) * 100) / 100;
    const pNew  = Math.round(refPaymentCA(rfBalance, 4.99, 20) * 100) / 100;
    const monthlySavings = Math.round((pCurr - pNew) * 100) / 100;
    const refinanceCosts = 3500;
    const breakEven      = monthlySavings > 0 ? Math.ceil(refinanceCosts / monthlySavings) : null;
    const horizonYears   = 5;
    const interestCurrH  = Math.round((pCurr * 12 * horizonYears - rfBalance * (1 - Math.pow(monthlyRateCA(5.99) / (1 - Math.pow(1 + monthlyRateCA(5.99), -240)), 0))) / 10) * 10;
    const interestNewH   = Math.round(interestCurrH * (4.99 / 5.99));
    const rf_ca: MortgageRefinanceAdapterInput = {
      currentBalance: rfBalance, currentRate: 5.99, yearsRemaining: 20,
      newRate: 4.99, newAmortization: 20,
      refinanceCosts, cashOut: 0, horizonYears,
      paymentCurr: pCurr, paymentNew: pNew, monthlySavings,
      newPrincipal: rfBalance,
      breakEvenMonths: breakEven,
      totalInterestCurrH: interestCurrH,
      totalInterestNewH: interestNewH,
      totalInterestDiff: Math.max(0, interestCurrH - interestNewH),
      netSavingsOverHorizon: Math.round(monthlySavings * 12 * horizonYears - refinanceCosts),
      decision: 'saves', termExtended: false,
      region: 'ca',
    };
    console.log(`  Refi CA: ${pCurr.toFixed(2)} → ${pNew.toFixed(2)}, saving ${monthlySavings.toFixed(2)}/mo, breakEven mo ${breakEven}`);
    const { data, filename } = buildMortgageRefinanceReportData(rf_ca, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-ca.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Mortgage Refinance CA (Saves / 5.99→4.99%) → ${dest}`);
  }

  // ── Mortgage Refinance US — Saves with term extension warning ────────────
  {
    const rfBalance2 = 320000;
    const pCurr2 = Math.round(refPaymentUS(rfBalance2, 7.5, 27) * 100) / 100;
    const pNew2  = Math.round(refPaymentUS(rfBalance2, 6.75, 30) * 100) / 100;
    const monthlySavings2 = Math.round((pCurr2 - pNew2) * 100) / 100;
    const refinanceCosts2 = 6000;
    const breakEven2 = monthlySavings2 > 0 ? Math.ceil(refinanceCosts2 / monthlySavings2) : null;
    const horizonYears2 = 7;
    const rf_us: MortgageRefinanceAdapterInput = {
      currentBalance: rfBalance2, currentRate: 7.5, yearsRemaining: 27,
      newRate: 6.75, newAmortization: 30,
      refinanceCosts: refinanceCosts2, cashOut: 0, horizonYears: horizonYears2,
      paymentCurr: pCurr2, paymentNew: pNew2, monthlySavings: monthlySavings2,
      newPrincipal: rfBalance2,
      breakEvenMonths: breakEven2,
      totalInterestCurrH: Math.round(pCurr2 * 12 * horizonYears2 * 0.65),
      totalInterestNewH:  Math.round(pNew2  * 12 * horizonYears2 * 0.67),
      totalInterestDiff: Math.round((pCurr2 - pNew2) * 12 * horizonYears2 * 0.66),
      netSavingsOverHorizon: Math.round(monthlySavings2 * 12 * horizonYears2 - refinanceCosts2),
      decision: 'saves', termExtended: true,
      region: 'us',
    };
    console.log(`  Refi US: ${pCurr2.toFixed(2)} → ${pNew2.toFixed(2)}, saving ${monthlySavings2.toFixed(2)}/mo, breakEven mo ${breakEven2}, termExtended: true`);
    const { data, filename } = buildMortgageRefinanceReportData(rf_us, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-us.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Mortgage Refinance US (Saves / term extension warning) → ${dest}`);
  }

  // ── Debt Repayment CA — Credit card 19.99% / $18K / $500/mo ─────────────
  {
    const dp_ca = debtPayoffInfo(18000, 19.99, 500);
    const a100_ca = accel100Info(18000, 19.99, 500, dp_ca.months);
    const debt_ca: DebtRepaymentAdapterInput = {
      balance: 18000, annualRate: 19.99, annualFees: 0,
      monthlyPayment: 500, extraPayment: 0,
      months: dp_ca.months,
      debtFreeStr: addMonths(now, dp_ca.months),
      totalInterest: Math.round(dp_ca.totalInterest),
      totalPaid: Math.round(dp_ca.totalPaid),
      monthlyInterestCharge: parseFloat(dp_ca.monthlyInterest.toFixed(2)),
      principalPerPayment: parseFloat(dp_ca.principalFirst.toFixed(2)),
      accel100InterestSaved: Math.round(a100_ca.interestSaved),
      accel100MonthsSaved: a100_ca.monthsSaved,
      accel100DebtFreeStr: addMonths(now, dp_ca.months - a100_ca.monthsSaved),
      extraMonths: null, extraDebtFreeStr: null, extraInterestSaved: null,
      region: 'ca',
    };
    console.log(`  Debt CA: ${dp_ca.months} mo, interest ${Math.round(dp_ca.totalInterest)}, +$100 saves ${Math.round(a100_ca.interestSaved)} / ${a100_ca.monthsSaved} mo`);
    const { data, filename } = buildDebtRepaymentReportData(debt_ca, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-ca.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Debt Repayment CA (19.99% / $18K / $500/mo) → ${dest}`);
  }

  // ── Debt Repayment US — Credit card 22.99% / $8.5K / $350/mo + extra $100
  {
    const dp_us = debtPayoffInfo(8500, 22.99, 350);
    const dp_us_extra = debtPayoffInfo(8500, 22.99, 450);
    const a100_us = accel100Info(8500, 22.99, 350, dp_us.months);
    const debt_us: DebtRepaymentAdapterInput = {
      balance: 8500, annualRate: 22.99, annualFees: 0,
      monthlyPayment: 350, extraPayment: 100,
      months: dp_us.months,
      debtFreeStr: addMonths(now, dp_us.months),
      totalInterest: Math.round(dp_us.totalInterest),
      totalPaid: Math.round(dp_us.totalPaid),
      monthlyInterestCharge: parseFloat(dp_us.monthlyInterest.toFixed(2)),
      principalPerPayment: parseFloat(dp_us.principalFirst.toFixed(2)),
      accel100InterestSaved: Math.round(a100_us.interestSaved),
      accel100MonthsSaved: a100_us.monthsSaved,
      accel100DebtFreeStr: addMonths(now, dp_us.months - a100_us.monthsSaved),
      extraMonths: dp_us_extra.months,
      extraDebtFreeStr: addMonths(now, dp_us_extra.months),
      extraInterestSaved: Math.round(dp_us.totalInterest - dp_us_extra.totalInterest),
      region: 'us',
    };
    console.log(`  Debt US: ${dp_us.months} mo, interest ${Math.round(dp_us.totalInterest)}, extra $100 → ${dp_us_extra.months} mo, saves ${Math.round(dp_us.totalInterest - dp_us_extra.totalInterest)}`);
    const { data, filename } = buildDebtRepaymentReportData(debt_us, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-us.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Debt Repayment US (22.99% / $8.5K / $350+$100/mo) → ${dest}`);
  }

  // ── Income Tax CA — Ontario $85K (2025) ──────────────────────────────────
  {
    const grossCA = 85000;
    const fedRaw  = Math.min(57375, grossCA) * 0.15 + Math.max(0, grossCA - 57375) * 0.205;
    const bpa     = Math.round(16129 * 0.15);
    const fedTax  = Math.max(0, Math.round(fedRaw - bpa));
    const provTax = Math.round(grossCA * 0.0915);
    const totalTax = fedTax + provTax;
    const afterTax = grossCA - totalTax;
    const effRate = (totalTax / grossCA) * 100;
    const clarityScore = Math.round(60 + (afterTax / grossCA) * 40);
    const tax_ca: TaxAdapterInput = {
      grossIncome: grossCA, region: 'ca',
      province: 'Ontario (ON)',
      federalTax: fedTax, provinceTax: provTax,
      totalTax, afterTaxIncome: afterTax,
      monthlyTakeHome: afterTax / 12,
      effectiveRate: parseFloat(effRate.toFixed(1)),
      marginalFederalRate: 20.5,
      incomeBand: '$57,375 - $114,750',
      bpaCredit: bpa, taxYear: 2025,
      clarityScore: Math.min(100, clarityScore),
      clarityLabel: clarityScore >= 70 ? 'Low Deduction Load' : 'Moderate Deduction Load',
    };
    console.log(`  Tax CA: gross ${grossCA}, total ${totalTax}, eff ${effRate.toFixed(1)}%, takeHome ${afterTax}`);
    const { data, filename } = buildTaxReportData(tax_ca, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-ca.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Income Tax CA (Ontario / $85K / 2025) → ${dest}`);
  }

  // ── Income Tax US — Single $95K, 5% state (2025) ─────────────────────────
  {
    const grossUS = 95000;
    const stdDed  = 15000;
    const taxable = Math.max(0, grossUS - stdDed); // 80000
    const fedTaxUS = Math.round(
      Math.min(11925, taxable) * 0.10 +
      Math.max(0, Math.min(48475, taxable) - 11925) * 0.12 +
      Math.max(0, taxable - 48475) * 0.22
    );
    const stateTax = Math.round(grossUS * 0.05);
    const totalTaxUS = fedTaxUS + stateTax;
    const afterTaxUS = grossUS - totalTaxUS;
    const effRateUS  = (totalTaxUS / grossUS) * 100;
    const clarityUS  = Math.round(60 + (afterTaxUS / grossUS) * 40);
    const tax_us: TaxAdapterInput = {
      grossIncome: grossUS, region: 'us',
      filingStatus: 'single', stateRate: 5.0, stdDeductionApplied: stdDed,
      federalTax: fedTaxUS, provinceTax: stateTax,
      totalTax: totalTaxUS, afterTaxIncome: afterTaxUS,
      monthlyTakeHome: afterTaxUS / 12,
      effectiveRate: parseFloat(effRateUS.toFixed(1)),
      marginalFederalRate: 22,
      incomeBand: '$48,475 - $103,350',
      taxYear: 2025,
      clarityScore: Math.min(100, clarityUS),
      clarityLabel: clarityUS >= 70 ? 'Low Deduction Load' : 'Moderate Deduction Load',
    };
    console.log(`  Tax US: gross ${grossUS}, fed ${fedTaxUS}, state ${stateTax}, total ${totalTaxUS}, eff ${effRateUS.toFixed(1)}%`);
    const { data, filename } = buildTaxReportData(tax_us, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-us.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Income Tax US (Single / $95K / 5% state / 2025) → ${dest}`);
  }

  // ── Sales Tax CA — Ontario HST 13% Add-Tax on $500 ──────────────────────
  {
    const st_ca: SalesTaxAdapterInput = {
      mode: 'add', amount: 500, taxRatePct: 13, region: 'ca',
      province: 'Ontario (ON)', provinceNote: 'HST 13%',
      components: [{ label: 'HST', rate: 13, amount: 65 }],
      preTax: 500, taxAmount: 65, total: 565,
      taxShare: parseFloat(((65 / 565) * 100).toFixed(1)),
    };
    console.log(`  Sales Tax CA: ${st_ca.preTax} + ${st_ca.taxAmount} = ${st_ca.total} (${st_ca.taxShare}%)`);
    const { data, filename } = buildSalesTaxReportData(st_ca, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-ca.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Sales Tax CA (Ontario HST 13% / $500) → ${dest}`);
  }

  // ── Sales Tax US — 8.25% Reverse (remove tax from $108.25) ──────────────
  {
    const totalUS   = 108.25;
    const preTaxUS  = parseFloat((totalUS / 1.0825).toFixed(2));
    const taxAmtUS  = parseFloat((totalUS - preTaxUS).toFixed(2));
    const st_us: SalesTaxAdapterInput = {
      mode: 'remove', amount: totalUS, taxRatePct: 8.25, region: 'us',
      preTax: preTaxUS, taxAmount: taxAmtUS, total: totalUS,
      taxShare: parseFloat(((taxAmtUS / totalUS) * 100).toFixed(1)),
    };
    console.log(`  Sales Tax US: ${totalUS} → preTax ${preTaxUS}, tax ${taxAmtUS} (${st_us.taxShare}%)`);
    const { data, filename } = buildSalesTaxReportData(st_us, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-us.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Sales Tax US (8.25% Reverse / $108.25) → ${dest}`);
  }

  // ── Emergency Fund CA — Building (stable, $3.5K/mo, 3-mo target) ─────────
  {
    const ef_ca: EmergencyFundAdapterInput = {
      monthlyExpenses: 3500, currentSavings: 5000, monthlyContribution: 400,
      stability: 'stable', targetMonths: 3,
      targetAmount: 10500, currentCoverageMonths: parseFloat((5000 / 3500).toFixed(1)),
      gap: 5500, surplus: 0,
      monthsToTarget: Math.ceil(5500 / 400),
      suggestedMonthly: Math.round(5500 / 12),
      readinessScore: 43, readinessLabel: 'Poor', readinessStatus: 'Caution',
      targetProgress: parseFloat(((5000 / 10500) * 100).toFixed(0)),
      tpBadge: 'Behind', leverState: 'below-saving',
      recommendedLabel: '3-4 months',
      region: 'ca',
    };
    console.log(`  EF CA: target ${ef_ca.targetAmount}, saved ${ef_ca.currentSavings}, gap ${ef_ca.gap}, months ${ef_ca.monthsToTarget}`);
    const { data, filename } = buildEmergencyFundReportData(ef_ca, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-ca.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Emergency Fund CA (Building / stable / 14 mo to target) → ${dest}`);
  }

  // ── Emergency Fund US — At Target (stable, $4.2K/mo, 5-mo target) ────────
  {
    const ef_us: EmergencyFundAdapterInput = {
      monthlyExpenses: 4200, currentSavings: 22500, monthlyContribution: 200,
      stability: 'stable', targetMonths: 5,
      targetAmount: 21000, currentCoverageMonths: parseFloat((22500 / 4200).toFixed(1)),
      gap: 0, surplus: 1500,
      monthsToTarget: null,
      suggestedMonthly: 0,
      readinessScore: 96, readinessLabel: 'Excellent', readinessStatus: 'Healthy',
      targetProgress: 100,
      tpBadge: 'On Track', leverState: 'at-target',
      recommendedLabel: '3-4 months',
      region: 'us',
    };
    console.log(`  EF US: target ${ef_us.targetAmount}, saved ${ef_us.currentSavings}, surplus ${ef_us.surplus}, status at-target`);
    const { data, filename } = buildEmergencyFundReportData(ef_us, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-us.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Emergency Fund US (At Target / $1.5K surplus) → ${dest}`);
  }

  // ── Net Worth CA — Low Liquidity (healthy D/A, low liquid %) ─────────────
  {
    const nw_assets = 35000 + 95000 + 520000 + 18000;  // 668,000
    const nw_liab   = 155000 + 4000 + 0;               // 159,000
    const nw_ca: NetWorthAdapterInput = {
      cashSavings: 35000, investmentsRetirement: 95000,
      homeRealEstate: 520000, vehiclesOther: 18000,
      mortgageBalance: 155000, loansCreditCards: 4000, otherDebts: 0,
      totalAssets: nw_assets, totalLiabilities: nw_liab,
      netWorth: nw_assets - nw_liab,
      debtToAssetRatio: parseFloat(((nw_liab / nw_assets) * 100).toFixed(1)),
      liquidPct: parseFloat(((35000 / nw_assets) * 100).toFixed(1)),
      isNegativeNetWorth: false, debtOnly: false,
      healthScore: Math.round(Math.max(0, 100 - (nw_liab / nw_assets) * 100 * 1.33)),
      healthLabel: 'Good', healthStatus: 'Watch',
      liqScore: Math.round((35000 / nw_assets) * 100 * 5),
      liqLabel: 'Low', leverState: 'low-liquidity',
      debtReductionNeeded: 0,
      liquidityGap: Math.max(0, nw_assets * 0.10 - 35000),
      region: 'ca',
    };
    console.log(`  NW CA: assets ${nw_ca.totalAssets}, liab ${nw_ca.totalLiabilities}, NW ${nw_ca.netWorth}, D/A ${nw_ca.debtToAssetRatio}%, liq ${nw_ca.liquidPct}%`);
    const { data, filename } = buildNetWorthReportData(nw_ca, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-ca.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Net Worth CA (Good / Low Liquidity) → ${dest}`);
  }

  // ── Net Worth US — High Debt ──────────────────────────────────────────────
  {
    const nw_assets_us = 45000 + 180000 + 420000 + 25000;  // 670,000
    const nw_liab_us   = 220000 + 15000 + 5000;             // 240,000
    const nw_dta       = parseFloat(((nw_liab_us / nw_assets_us) * 100).toFixed(1));
    const nw_us: NetWorthAdapterInput = {
      cashSavings: 45000, investmentsRetirement: 180000,
      homeRealEstate: 420000, vehiclesOther: 25000,
      mortgageBalance: 220000, loansCreditCards: 15000, otherDebts: 5000,
      totalAssets: nw_assets_us, totalLiabilities: nw_liab_us,
      netWorth: nw_assets_us - nw_liab_us,
      debtToAssetRatio: nw_dta,
      liquidPct: parseFloat(((45000 / nw_assets_us) * 100).toFixed(1)),
      isNegativeNetWorth: false, debtOnly: false,
      healthScore: Math.round(Math.max(0, 100 - nw_dta * 1.33)),
      healthLabel: 'Fair', healthStatus: 'Watch',
      liqScore: Math.round((45000 / nw_assets_us) * 100 * 5),
      liqLabel: 'Moderate', leverState: 'high-debt',
      debtReductionNeeded: Math.max(0, nw_liab_us - nw_assets_us * 0.25),
      liquidityGap: 0,
      region: 'us',
    };
    console.log(`  NW US: assets ${nw_us.totalAssets}, liab ${nw_us.totalLiabilities}, NW ${nw_us.netWorth}, D/A ${nw_us.debtToAssetRatio}%`);
    const { data, filename } = buildNetWorthReportData(nw_us, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-us.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Net Worth US (Fair / High Debt) → ${dest}`);
  }

  // ── Rent vs Buy CA — Buy favoured (10yr horizon, 4% appreciation) ────────
  {
    const rvb_loan_ca = 520000;
    const rvb_pi_ca   = Math.round(calcPayment(rvb_loan_ca, monthlyRateCA(5.25), 300));
    const rvb_tax_mo  = Math.round(650000 * 0.007 / 12);
    const rvb_monthly_ca = rvb_pi_ca + rvb_tax_mo + 400;
    const rvb_ca: RentVsBuyAdapterInput = {
      monthlyRent: 2800, rentIncrease: 3,
      purchasePrice: 650000, downPaymentAmt: 130000,
      downPaymentPct: 20, annualRate: 5.25, amortization: 25,
      propertyTaxPct: 0.7, monthlyInsuranceMaint: 400, monthlyHOA: 0,
      homeGrowthPct: 4, investReturnPct: 7, closingCostPct: 1.5,
      horizonYears: 10,
      monthlyOwnership: rvb_monthly_ca, monthlyPI: rvb_pi_ca,
      totalRentCost: 385000, totalBuyCost: 285000,
      equity: 572000, netDifference: -100000,
      breakEvenYear: 7, opportunityCost: 125700,
      decision: 'buy', topDriver: 'appreciation',
      region: 'ca',
    };
    console.log(`  RvB CA: rent ${rvb_ca.totalRentCost}, buy ${rvb_ca.totalBuyCost}, equity ${rvb_ca.equity}, decision ${rvb_ca.decision}`);
    const { data, filename } = buildRentVsBuyReportData(rvb_ca, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-ca.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Rent vs Buy CA (Buy favoured / 10yr / breakEven yr 7) → ${dest}`);
  }

  // ── Rent vs Buy US — Rent favoured (7yr / high ownership cost / low appreciation) ──
  {
    const rvb_loan_us = 560000;
    const rvb_pi_us   = Math.round(calcPayment(rvb_loan_us, monthlyRateUS(7.5), 360));
    const rvb_tax_us  = Math.round(700000 * 0.011 / 12);
    const rvb_monthly_us = rvb_pi_us + rvb_tax_us + 450;
    const rvb_us: RentVsBuyAdapterInput = {
      monthlyRent: 2600, rentIncrease: 3,
      purchasePrice: 700000, downPaymentAmt: 140000,
      downPaymentPct: 20, annualRate: 7.5, amortization: 30,
      propertyTaxPct: 1.1, monthlyInsuranceMaint: 450, monthlyHOA: 0,
      homeGrowthPct: 1, investReturnPct: 7, closingCostPct: 2,
      horizonYears: 7,
      monthlyOwnership: rvb_monthly_us, monthlyPI: rvb_pi_us,
      totalRentCost: 228000, totalBuyCost: 365000,
      equity: 175000, netDifference: 137000,
      breakEvenYear: null, opportunityCost: 91700,
      decision: 'rent', topDriver: 'ownershipCost',
      region: 'us',
    };
    console.log(`  RvB US: rent ${rvb_us.totalRentCost}, buy ${rvb_us.totalBuyCost}, decision ${rvb_us.decision}`);
    const { data, filename } = buildRentVsBuyReportData(rvb_us, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-us.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Rent vs Buy US (Rent favoured / 7yr / high cost) → ${dest}`);
  }

  // ── Lump Sum vs DCA CA — Lump Ahead (20yr, 7%, 12-mo spread) ────────────
  {
    const lump_r  = Math.pow(1 + 0.07, 1 / 12) - 1;
    const lump_n  = 240;
    const lumpFV_ca  = Math.round(50000 * Math.pow(1 + lump_r, lump_n));
    const lumpGain_ca = lumpFV_ca - 50000;
    const dca_monthly = 50000 / 12;
    let dcaFV_ca = 0;
    for (let k = 1; k <= 12; k++) {
      dcaFV_ca += dca_monthly * Math.pow(1 + lump_r, lump_n - k);
    }
    dcaFV_ca = Math.round(dcaFV_ca);
    const dcaGain_ca = dcaFV_ca - 50000;
    const gainDelta_ca = lumpFV_ca - dcaFV_ca;
    const lump_ca: LumpSumVsDcaAdapterInput = {
      totalAmount: 50000, annualRate: 7, freq: 'monthly',
      yearsInvested: 20, spreadMonths: 12,
      lumpFV: lumpFV_ca, lumpGain: lumpGain_ca,
      dcaMonthly: Math.round(dca_monthly * 100) / 100,
      dcaFV: dcaFV_ca, dcaGain: dcaGain_ca,
      gainDelta: gainDelta_ca,
      deltaIsSignificant: (gainDelta_ca / 50000) > 0.05,
      comparisonState: 'lump-ahead',
      advantageScore: 62, advantageLabel: 'Moderate',
      lumpAt10: Math.round(50000 * Math.pow(1 + lump_r, 120)),
      dcaAt10: Math.round(dca_monthly * Array.from({length: 12}, (_, k) => Math.pow(1 + lump_r, 120 - k - 1)).reduce((a, b) => a + b, 0)),
      lumpAt20: lumpFV_ca,
      dcaAt20: dcaFV_ca,
      lumpAt30: Math.round(50000 * Math.pow(1 + lump_r, 360)),
      dcaAt30: Math.round(dca_monthly * Array.from({length: 12}, (_, k) => Math.pow(1 + lump_r, 360 - k - 1)).reduce((a, b) => a + b, 0)),
      region: 'ca',
    };
    console.log(`  DCA CA: lump ${lumpFV_ca}, dca ${dcaFV_ca}, delta ${gainDelta_ca} (${((gainDelta_ca/50000)*100).toFixed(1)}%), significant: ${lump_ca.deltaIsSignificant}`);
    const { data, filename } = buildLumpSumVsDcaReportData(lump_ca, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-ca.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Lump Sum vs DCA CA (Lump Ahead / 20yr / Moderate) → ${dest}`);
  }

  // ── Lump Sum vs DCA US — Similar (15yr, 6%, 6-mo spread) ────────────────
  {
    const lump_r2 = Math.pow(1 + 0.06, 1 / 12) - 1;
    const lump_n2 = 180;
    const lumpFV_us   = Math.round(25000 * Math.pow(1 + lump_r2, lump_n2));
    const lumpGain_us = lumpFV_us - 25000;
    const dca2_mo = 25000 / 6;
    let dcaFV_us = 0;
    for (let k = 1; k <= 6; k++) {
      dcaFV_us += dca2_mo * Math.pow(1 + lump_r2, lump_n2 - k);
    }
    dcaFV_us = Math.round(dcaFV_us);
    const dcaGain_us = dcaFV_us - 25000;
    const gainDelta_us = lumpFV_us - dcaFV_us;
    const lump_us: LumpSumVsDcaAdapterInput = {
      totalAmount: 25000, annualRate: 6, freq: 'monthly',
      yearsInvested: 15, spreadMonths: 6,
      lumpFV: lumpFV_us, lumpGain: lumpGain_us,
      dcaMonthly: Math.round(dca2_mo * 100) / 100,
      dcaFV: dcaFV_us, dcaGain: dcaGain_us,
      gainDelta: gainDelta_us,
      deltaIsSignificant: (gainDelta_us / 25000) > 0.05,
      comparisonState: 'similar',
      advantageScore: 28, advantageLabel: 'Minimal',
      lumpAt10: Math.round(25000 * Math.pow(1 + lump_r2, 120)),
      dcaAt10: Math.round(dca2_mo * Array.from({length: 6}, (_, k) => Math.pow(1 + lump_r2, 120 - k - 1)).reduce((a, b) => a + b, 0)),
      lumpAt20: Math.round(25000 * Math.pow(1 + lump_r2, 240)),
      dcaAt20: Math.round(dca2_mo * Array.from({length: 6}, (_, k) => Math.pow(1 + lump_r2, 240 - k - 1)).reduce((a, b) => a + b, 0)),
      lumpAt30: Math.round(25000 * Math.pow(1 + lump_r2, 360)),
      dcaAt30: Math.round(dca2_mo * Array.from({length: 6}, (_, k) => Math.pow(1 + lump_r2, 360 - k - 1)).reduce((a, b) => a + b, 0)),
      region: 'us',
    };
    console.log(`  DCA US: lump ${lumpFV_us}, dca ${dcaFV_us}, delta ${gainDelta_us} (${((gainDelta_us/25000)*100).toFixed(1)}%), similar: ${lump_us.comparisonState === 'similar'}`);
    const { data, filename } = buildLumpSumVsDcaReportData(lump_us, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-us.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ Lump Sum vs DCA US (Similar / 15yr / Minimal) → ${dest}`);
  }

  // ── CMHC CA — Insured (5% down / $500K / standard 25yr) ──────────────────
  {
    const cmhc_price = 500000;
    const cmhc_down  = 25000;   // exactly 5%
    const cmhc_base  = cmhc_price - cmhc_down;  // 475,000
    const cmhc_rate  = 0.04;
    const cmhc_prem  = Math.round(cmhc_base * cmhc_rate);
    const cmhc_ca_i: CmhcAdapterInput = {
      purchasePrice: cmhc_price, downPaymentAmt: cmhc_down,
      downPaymentPct: 5, amortization: 25,
      firstTimeBuyer: true, newBuild: false,
      minDownPayment: 25000, baseMortgage: cmhc_base,
      cmhcRate: cmhc_rate, cmhcPremium: cmhc_prem,
      totalMortgage: cmhc_base + cmhc_prem,
      downPaymentGap: 0,
      status: 'insured',
    };
    console.log(`  CMHC CA Insured: price ${cmhc_price}, down ${cmhc_down} (5%), premium ${cmhc_prem}, total ${cmhc_ca_i.totalMortgage}`);
    const { data, filename } = buildCmhcReportData(cmhc_ca_i, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-insured.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ CMHC CA (Insured / 5% down / $500K) → ${dest}`);
  }

  // ── CMHC CA — No Premium (20%+ down / $650K conventional) ───────────────
  {
    const cmhc_ca_np: CmhcAdapterInput = {
      purchasePrice: 650000, downPaymentAmt: 130000,
      downPaymentPct: 20, amortization: 25,
      firstTimeBuyer: false, newBuild: false,
      minDownPayment: 27500, baseMortgage: 520000,
      cmhcRate: 0, cmhcPremium: 0, totalMortgage: 520000,
      downPaymentGap: 0,
      status: 'no_premium',
    };
    console.log(`  CMHC CA No Premium: price ${cmhc_ca_np.purchasePrice}, down 20%, status ${cmhc_ca_np.status}`);
    const { data, filename } = buildCmhcReportData(cmhc_ca_np, now);
    const doc  = await buildReportDocument(data);
    const dest = path.join(outDir, filename.replace('.pdf', '-no-premium.pdf'));
    fs.writeFileSync(dest, Buffer.from((doc as any).output('arraybuffer') as ArrayBuffer));
    console.log(`✓ CMHC CA (No Premium / 20% down / $650K) → ${dest}`);
  }
}

// ─── Loan helper ─────────────────────────────────────────────────────────────

function calcLoanPayment(principal: number, annualRate: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRate === 0) return principal / termMonths;
  const r = annualRate / 12 / 100;
  return principal * r / (1 - Math.pow(1 + r, -termMonths));
}

function buildPersonalLoanInput(opts: {
  loanAmount: number; annualRate: number; loanTermYears: number;
  annualIncome?: number; region: 'ca' | 'us';
}): LoanAdapterInput {
  const { loanAmount, annualRate, loanTermYears, annualIncome, region } = opts;
  const n = loanTermYears * 12;
  const monthlyPayment = calcLoanPayment(loanAmount, annualRate, n);
  const totalCost = monthlyPayment * n;
  const totalInterest = Math.max(0, totalCost - loanAmount);
  const interestRatio = loanAmount > 0 ? (totalInterest / loanAmount) * 100 : 0;
  const dtiPct = annualIncome && annualIncome > 0 ? (monthlyPayment / (annualIncome / 12)) * 100 : null;
  const rateScore = Math.max(0, 50 - Math.max(0, annualRate - 5) * 3.5);
  const ratioScore = Math.max(0, 50 - interestRatio * 1.5);
  const loanScore = Math.round(rateScore + ratioScore);
  const scoreLabel = loanScore >= 80 ? 'Excellent' : loanScore >= 65 ? 'Good' : loanScore >= 45 ? 'Fair' : 'Poor';
  const statusLabel = scoreLabel === 'Poor' ? 'Caution' : scoreLabel === 'Fair' ? 'Watch' : (annualRate > 12 || interestRatio > 20) ? 'Watch' : 'Healthy';
  const costPer1000 = loanAmount > 0 ? (totalInterest / loanAmount) * 1000 : 0;
  const shorterYear = loanTermYears > 1 ? loanTermYears - 1 : null;
  let shorterTermYears: number | null = null;
  let shorterTermInterestSaved = 0;
  let shorterTermPaymentDiff = 0;
  if (shorterYear !== null) {
    const sp = calcLoanPayment(loanAmount, annualRate, shorterYear * 12);
    const sti = Math.max(0, sp * shorterYear * 12 - loanAmount);
    shorterTermYears = shorterYear;
    shorterTermInterestSaved = Math.max(0, totalInterest - sti);
    shorterTermPaymentDiff = Math.max(0, sp - monthlyPayment);
  }
  return {
    loanType: 'personal', loanAmount, annualRate, monthlyPayment, totalInterest,
    totalCost, interestRatio, dtiPct, loanScore, scoreLabel: scoreLabel as LoanAdapterInput['scoreLabel'],
    statusLabel: statusLabel as LoanAdapterInput['statusLabel'], costPer1000, region,
    loanTermYears, shorterTermYears, shorterTermInterestSaved, shorterTermPaymentDiff,
  };
}

function buildCarLoanInput(opts: {
  vehiclePrice: number; downPayment: number; annualRate: number;
  loanTermMonths: number; annualIncome?: number; region: 'ca' | 'us';
}): LoanAdapterInput {
  const { vehiclePrice, downPayment, annualRate, loanTermMonths, annualIncome, region } = opts;
  const loanAmount = Math.max(0, vehiclePrice - downPayment);
  const downPaymentPct = (downPayment / vehiclePrice) * 100;
  const monthlyPayment = calcLoanPayment(loanAmount, annualRate, loanTermMonths);
  const totalCost = monthlyPayment * loanTermMonths;
  const totalInterest = Math.max(0, totalCost - loanAmount);
  const interestRatio = loanAmount > 0 ? (totalInterest / loanAmount) * 100 : 0;
  const dtiPct = annualIncome && annualIncome > 0 ? (monthlyPayment / (annualIncome / 12)) * 100 : null;
  const rateScore = Math.max(0, 50 - Math.max(0, annualRate - 5) * 4);
  const ratioScore = Math.max(0, 50 - interestRatio * 1.8);
  const loanScore = Math.round(rateScore + ratioScore);
  const scoreLabel = loanScore >= 80 ? 'Excellent' : loanScore >= 65 ? 'Good' : loanScore >= 45 ? 'Fair' : 'Poor';
  const statusLabel = scoreLabel === 'Poor' ? 'Caution' : scoreLabel === 'Fair' ? 'Watch' : (annualRate > 12 || interestRatio > 25) ? 'Watch' : 'Healthy';
  const costPer1000 = loanAmount > 0 ? (totalInterest / loanAmount) * 1000 : 0;
  const isStrongEquity = downPaymentPct >= 20;
  const downOptIncrease = Math.max(1000, vehiclePrice * 0.05);
  const optNewLoan = Math.max(0, loanAmount - downOptIncrease);
  const optNewPayment = calcLoanPayment(optNewLoan, annualRate, loanTermMonths);
  const optNewInterest = Math.max(0, optNewPayment * loanTermMonths - optNewLoan);
  const downOptInterestSaved = Math.max(0, totalInterest - optNewInterest);
  const downOptMonthlyDiff = Math.max(0, monthlyPayment - optNewPayment);
  const TERM_OPTIONS = [24, 36, 48, 60, 72, 84];
  const currentIdx = TERM_OPTIONS.indexOf(loanTermMonths);
  const shorterTermMonths = currentIdx > 0 ? TERM_OPTIONS[currentIdx - 1] : null;
  let shorterTermSaved = 0;
  let shorterTermPaymentDiff = 0;
  if (shorterTermMonths !== null) {
    const sp = calcLoanPayment(loanAmount, annualRate, shorterTermMonths);
    const sti = Math.max(0, sp * shorterTermMonths - loanAmount);
    shorterTermSaved = Math.max(0, totalInterest - sti);
    shorterTermPaymentDiff = Math.max(0, sp - monthlyPayment);
  }
  return {
    loanType: 'car', vehiclePrice, downPayment, downPaymentPct, loanAmount, annualRate,
    monthlyPayment, totalInterest, totalCost, interestRatio, dtiPct,
    loanScore, scoreLabel: scoreLabel as LoanAdapterInput['scoreLabel'],
    statusLabel: statusLabel as LoanAdapterInput['statusLabel'], costPer1000, region,
    loanTermMonths, isStrongEquity, downOptIncrease, downOptInterestSaved, downOptMonthlyDiff,
    shorterTermMonths, shorterTermSaved, shorterTermPaymentDiff,
  };
}

// ─── New-adapter helpers ──────────────────────────────────────────────────────

function refPaymentCA(balance: number, ratePct: number, termYears: number): number {
  return calcPayment(balance, monthlyRateCA(ratePct), termYears * 12);
}
function refPaymentUS(balance: number, ratePct: number, termYears: number): number {
  return calcPayment(balance, monthlyRateUS(ratePct), termYears * 12);
}
function debtPayoffInfo(balance: number, annualRatePct: number, monthlyPayment: number): {
  months: number; totalInterest: number; totalPaid: number;
  monthlyInterest: number; principalFirst: number;
} {
  const r = annualRatePct / 12 / 100;
  if (r <= 0 || monthlyPayment <= balance * r) {
    return { months: 0, totalInterest: 0, totalPaid: balance, monthlyInterest: 0, principalFirst: monthlyPayment };
  }
  const months = Math.ceil(-Math.log(1 - balance * r / monthlyPayment) / Math.log(1 + r));
  const totalPaid = monthlyPayment * months;
  const totalInterest = Math.max(0, totalPaid - balance);
  const monthlyInterest = balance * r;
  const principalFirst = monthlyPayment - monthlyInterest;
  return { months, totalInterest, totalPaid, monthlyInterest, principalFirst };
}
function accel100Info(balance: number, annualRatePct: number, monthlyPayment: number, baseMo: number): {
  interestSaved: number; monthsSaved: number;
} {
  const r = annualRatePct / 12 / 100;
  if (r <= 0) return { interestSaved: 0, monthsSaved: 0 };
  const newMo = Math.ceil(-Math.log(1 - balance * r / (monthlyPayment + 100)) / Math.log(1 + r));
  const baseInterest = monthlyPayment * baseMo - balance;
  const newInterest  = (monthlyPayment + 100) * newMo - balance;
  return {
    interestSaved: Math.max(0, baseInterest - newInterest),
    monthsSaved:   Math.max(0, baseMo - newMo),
  };
}
function addMonths(now: Date, months: number): string {
  const d = new Date(now);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function compoundFV(annualRatePct: number, months: number, principal: number, monthly: number): number {
  if (months <= 0) return Math.max(0, principal);
  const r = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  if (Math.abs(r) < 1e-10) return Math.max(0, principal + monthly * months);
  const g = Math.pow(1 + r, months);
  return Math.max(0, principal * g + monthly * (g - 1) / r);
}

main().catch(err => {
  console.error('generateSamplePDFs failed:', err);
  process.exit(1);
});
