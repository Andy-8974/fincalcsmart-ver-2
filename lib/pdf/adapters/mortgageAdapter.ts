import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MortgageFrequency = 'monthly' | 'biweekly' | 'accelerated-biweekly';

export interface MortgageScheduleRow {
  year: number;
  endBalance: number;
}

export interface MortgageAdapterInput {
  // Calculator inputs (for display only — no formula reproduction)
  homePrice: number;
  downPaymentAmount: number;
  downPct: number;
  interestRate: number;           // annual %
  amortizationYears: number;
  frequency: MortgageFrequency;
  extraPayment: number;
  propertyTaxAnnual: number;
  homeInsuranceAnnual: number;
  condoFeeMonthly: number;
  incomeEntered: boolean;
  grossIncome: number;            // 0 if not entered
  otherDebts: number;             // 0 if not entered

  // Core results (from live calculator)
  loanAmount: number;             // mortgage amount (including CMHC if applicable)
  cmhcAmount: number;             // 0 if not applicable
  baseMonthlyPI: number;          // base P&I at monthly frequency
  displayPayment: number;         // P&I at selected frequency
  totalMonthly: number;           // base P&I + property costs, monthly basis
  monthlyPropertyTax: number;
  monthlyHomeInsurance: number;
  monthlyCondoFee: number;
  totalInterest: number;
  totalPayment: number;           // loanAmount + totalInterest

  // Health score (pre-computed by UI — do not recompute)
  healthScore: number;
  healthLabel: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  healthTitle: string;
  healthCopy: string;

  // GDS/TDS ratios — null when income not entered
  gds: number | null;
  tds: number | null;

  // Rate shock data (from UI)
  rateShockNewRate: number;
  rateShockDifference: number;    // shocked payment − current payment

  // Round-up savings (from UI)
  roundUpYearsSaved: number;
  roundUpInterestSaved: number;

  // Amortization schedule for milestone extraction (array slice is safe — no formula reproduction)
  schedule: MortgageScheduleRow[];

  // Pre-computed insight text from getInsight()
  insightText: string;
}

// ─── PDF currency formatters (en-US + CAD → CA$) ─────────────────────────────

function makePdfFmt(): (n: number) => string {
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  return (n: number) => nf.format(n);
}

function makePdfFmtx(): (n: number) => string {
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return (n: number) => nf.format(n);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function freqDisplayLabel(freq: MortgageFrequency): string {
  if (freq === 'biweekly')             return 'Bi-Weekly (26×/year)';
  if (freq === 'accelerated-biweekly') return 'Accelerated Bi-Weekly';
  return 'Monthly (12×/year)';
}

function freqPaymentLabel(freq: MortgageFrequency): string {
  if (freq === 'biweekly')             return 'Bi-Weekly Payment';
  if (freq === 'accelerated-biweekly') return 'Accel. Bi-Weekly Payment';
  return 'Monthly Payment';
}

// Extract balance from schedule at a given year index (0-based search by year number)
function scheduleBalance(
  schedule: MortgageScheduleRow[],
  yearNum: number,
): number | null {
  const row = schedule.find((r) => r.year === yearNum);
  return row ? row.endBalance : null;
}

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildMortgageReportData(
  input: MortgageAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {

  const fmt  = makePdfFmt();
  const fmtx = makePdfFmtx();

  const dateStr = now.toLocaleString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const dateFile   = now.toISOString().slice(0, 10);
  const rand       = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `CA-MTG-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  // ── Status derivation ──────────────────────────────────────────────────────
  const statusType =
    input.healthLabel === 'Excellent'       ? 'success' :
    input.healthLabel === 'Good'            ? 'success' :
    input.healthLabel === 'Fair'            ? 'warning' : 'danger';

  const statusLabel =
    input.healthLabel === 'Excellent' ? 'Excellent Score' :
    input.healthLabel === 'Good'      ? 'Good Score'      :
    input.healthLabel === 'Fair'      ? 'Fair Score'      : 'Needs Attention';

  // ── Composition bar: Principal vs Total Interest ───────────────────────────
  const compTotal      = input.totalPayment;
  const principalPct   = compTotal > 0 ? input.loanAmount      / compTotal : 0;
  const interestPct    = compTotal > 0 ? input.totalInterest   / compTotal : 0;

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const interestRatio = input.loanAmount > 0
    ? ((input.totalInterest / input.loanAmount) * 100).toFixed(0)
    : '0';

  const p1 = `Your ${input.amortizationYears}-year mortgage on a ${fmt(input.homePrice)} property carries a loan of ${fmt(input.loanAmount)}${input.cmhcAmount > 0 ? ` (including ${fmt(input.cmhcAmount)} CMHC mortgage default insurance)` : ''}. At ${input.interestRate}%, total interest over the amortization period is ${fmt(input.totalInterest)} — ${interestRatio}% of the mortgage principal. Mortgage Health Score: ${input.healthScore}/100 (${input.healthLabel}).`;

  const p2Parts: string[] = [
    `Your ${freqDisplayLabel(input.frequency)} payment of ${fmtx(input.displayPayment)} covers principal and interest.`,
  ];
  if (input.totalMonthly > input.baseMonthlyPI) {
    const costItems: string[] = [];
    if (input.monthlyPropertyTax > 0)   costItems.push(`${fmtx(input.monthlyPropertyTax)}/mo property tax`);
    if (input.monthlyHomeInsurance > 0) costItems.push(`${fmtx(input.monthlyHomeInsurance)}/mo home insurance`);
    if (input.monthlyCondoFee > 0)      costItems.push(`${fmtx(input.monthlyCondoFee)}/mo condo fee`);
    if (costItems.length > 0) {
      p2Parts.push(`Including ${costItems.join(', ')}, total estimated monthly housing costs are ${fmtx(input.totalMonthly)}.`);
    }
  }
  const p2 = p2Parts.join(' ');

  // Status-aware p3
  const p3 = (() => {
    // Rate shock context
    const shockLine = `A ${input.rateShockNewRate.toFixed(2)}% rate at renewal would increase your ${freqPaymentLabel(input.frequency).toLowerCase()} by ${fmtx(input.rateShockDifference)}.`;

    if (input.healthLabel === 'Needs Attention') {
      return `${input.healthTitle} ${input.healthCopy} ${shockLine}`;
    }
    if (input.roundUpInterestSaved > 1000 && input.roundUpYearsSaved > 0) {
      return `Adding an extra CA$100/month toward principal could save ${fmt(input.roundUpInterestSaved)} in interest and shorten your amortization by approximately ${input.roundUpYearsSaved} ${input.roundUpYearsSaved === 1 ? 'year' : 'years'}. ${shockLine}`;
    }
    return `${input.healthTitle} ${shockLine}`;
  })();

  // ── Milestone rows from schedule (lookup only — no formula) ───────────────
  const midpointYear = Math.ceil(input.amortizationYears / 2);
  const balY1   = scheduleBalance(input.schedule, 1);
  const balY5   = input.amortizationYears > 5 ? scheduleBalance(input.schedule, 5)  : null;
  const balMid  = scheduleBalance(input.schedule, midpointYear);

  // ── GDS/TDS rows ──────────────────────────────────────────────────────────
  const ratioRows =
    input.incomeEntered && input.gds !== null && input.tds !== null
      ? [
          { label: 'GDS Ratio (guideline: ≤ 32%)', value: `${input.gds.toFixed(1)}%`,  accent: (input.gds  > 32 ? 'amber' : 'teal')  as 'amber' | 'teal' },
          { label: 'TDS Ratio (guideline: ≤ 44%)', value: `${input.tds.toFixed(1)}%`,  accent: (input.tds  > 44 ? 'amber' : 'teal')  as 'amber' | 'teal' },
        ]
      : [];

  // ─── Build ReportData ─────────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Canadian Mortgage Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         'Canada',
      currency:       'CAD',
      sourceUrl:      'fincalcsmart.com/canadian-mortgage-calculator',
    },

    executiveSummary: {
      metrics: [
        {
          label:  'Mortgage Amount',
          value:  fmt(input.loanAmount),
          accent: 'teal',
        },
        {
          label:  freqPaymentLabel(input.frequency),
          value:  fmtx(input.displayPayment),
          accent: 'teal',
          sub:    `${input.amortizationYears}-yr amort.`,
        },
        {
          label:  'Total Interest',
          value:  fmt(input.totalInterest),
          accent: 'amber',
          sub:    `${interestRatio}% of principal`,
        },
        {
          label:  'Total Cost',
          value:  fmt(input.totalPayment),
        },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Principal vs. Total Interest (of total mortgage cost)',
      segments: [
        {
          label:          'Principal',
          valueFormatted: fmt(input.loanAmount),
          pct:            principalPct,
          color:          'teal',
        },
        {
          label:          'Total Interest',
          valueFormatted: fmt(input.totalInterest),
          pct:            interestPct,
          color:          'amber',
        },
      ],
      totalFormatted: fmt(input.totalPayment),
    },

    insightBlock: {
      title:      'AI-Assisted Mortgage Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Property Price',            value: fmt(input.homePrice) },
        { label: 'Down Payment',              value: `${fmt(input.downPaymentAmount)} (${input.downPct.toFixed(1)}%)` },
        { label: 'Annual Interest Rate',      value: `${input.interestRate}%` },
        { label: 'Amortization Period',       value: `${input.amortizationYears} years` },
        { label: 'Payment Frequency',         value: freqDisplayLabel(input.frequency) },
        ...(input.extraPayment > 0
          ? [{ label: 'Extra Monthly Payment', value: fmtx(input.extraPayment) + '/month' }]
          : []),
        ...(input.propertyTaxAnnual > 0
          ? [{ label: 'Annual Property Tax',  value: fmt(input.propertyTaxAnnual) }]
          : []),
        ...(input.homeInsuranceAnnual > 0
          ? [{ label: 'Annual Home Insurance', value: fmt(input.homeInsuranceAnnual) }]
          : []),
        ...(input.condoFeeMonthly > 0
          ? [{ label: 'Monthly Condo / HOA Fee', value: fmtx(input.condoFeeMonthly) + '/month' }]
          : []),
        ...(input.incomeEntered
          ? [
              { label: 'Gross Annual Household Income', value: fmt(input.grossIncome) },
              ...(input.otherDebts > 0
                ? [{ label: 'Other Monthly Debts', value: fmtx(input.otherDebts) + '/month' }]
                : []),
            ]
          : []),
        { label: 'Interest Compounding',      value: 'Semi-annual (Canadian Interest Act)' },
      ],
    },

    results: {
      title: 'Mortgage Breakdown',
      rows: [
        ...(input.cmhcAmount > 0
          ? [
              { label: 'Base Mortgage (before CMHC)',     value: fmt(input.homePrice - input.downPaymentAmount) },
              { label: 'CMHC Mortgage Default Insurance', value: fmt(input.cmhcAmount), accent: 'amber' as const },
            ]
          : []),
        { label: 'Total Mortgage Amount',           value: fmt(input.loanAmount), accent: 'teal' },
        { label: 'Base Monthly P&I Payment',        value: fmtx(input.baseMonthlyPI) + '/month' },
        { label: freqPaymentLabel(input.frequency), value: fmtx(input.displayPayment) },
        ...(input.totalMonthly > input.baseMonthlyPI
          ? [{ label: 'Total Monthly Housing Cost',  value: fmtx(input.totalMonthly) + '/month' }]
          : []),
        { label: 'Total Interest Paid',             value: fmt(input.totalInterest), accent: 'amber' },
        { label: 'Total Mortgage Cost',             value: fmt(input.totalPayment) },
        ...ratioRows,
        // Amortization milestones (Y5 + midpoint — Y1 omitted for space)
        ...(balY5 !== null
          ? [{ label: 'Balance After Year 5',       value: fmt(balY5) }]
          : []),
        ...(balMid !== null && midpointYear !== 1 && midpointYear !== 5
          ? [{ label: `Balance at Midpoint (Year ${midpointYear})`, value: fmt(balMid) }]
          : []),
        { label: 'Mortgage Health Score',           value: `${input.healthScore}/100 (${input.healthLabel})` },
      ],
    },

    keyDrivers: (() => {
      const drivers: string[] = [];

      if (input.healthLabel === 'Needs Attention' || input.healthLabel === 'Fair') {
        drivers.push(input.healthTitle + ' ' + input.healthCopy);
      }

      if (input.roundUpInterestSaved > 1000 && input.roundUpYearsSaved > 0) {
        drivers.push(
          `Prepayment opportunity: adding CA$100/month toward principal saves an estimated ${fmt(input.roundUpInterestSaved)} in interest and may shorten amortization by approximately ${input.roundUpYearsSaved} ${input.roundUpYearsSaved === 1 ? 'year' : 'years'}.`
        );
      }

      if (input.cmhcAmount > 0 && input.downPct >= 18 && input.downPct < 20) {
        drivers.push(
          `You are close to the 20% down payment threshold. Reaching it would eliminate CMHC mortgage default insurance, which currently adds ${fmt(input.cmhcAmount)} to your loan.`
        );
      } else if (input.cmhcAmount > 0) {
        drivers.push(
          `CMHC mortgage default insurance of ${fmt(input.cmhcAmount)} is added to your mortgage. Saving to a 20% down payment would eliminate this cost on a future purchase or refinance.`
        );
      }

      if (input.rateShockDifference > 50) {
        drivers.push(
          `Rate renewal exposure: if your rate increases to ${input.rateShockNewRate.toFixed(2)}% at renewal, your ${freqPaymentLabel(input.frequency).toLowerCase()} would rise by approximately ${fmtx(input.rateShockDifference)}. Building a payment buffer or locking into a longer term may reduce this risk.`
        );
      }

      if (drivers.length < 3) {
        drivers.push(
          `Consider payment frequency: switching from monthly to accelerated bi-weekly payments effectively adds one extra monthly payment per year, reducing interest and shortening amortization without changing your budget significantly.`
        );
      }

      if (drivers.length < 3 && (input.healthLabel === 'Good' || input.healthLabel === 'Excellent')) {
        drivers.push(
          `Review your amortization period at renewal. A shorter term increases payments but reduces total interest cost — compare the 15, 20, and 25-year scenarios side by side to see the trade-off.`
        );
      }

      return drivers.slice(0, 3);
    })(),

    methodology: {
      whatItDoes: [
        'Converts the quoted annual mortgage rate to an equivalent payment-period rate using Canadian semi-annual compounding.',
        'Calculates the regular mortgage payment using the standard present-value annuity formula, then converts to bi-weekly or accelerated bi-weekly using the approved frequency multipliers.',
        'Computes CMHC mortgage default insurance premiums at the applicable tier (4.00% at <10% down, 3.10% at 10–14.99%, 2.80% at 15–19.99%) and adds the premium to the mortgage balance.',
        'Builds a year-by-year amortization schedule with extra monthly payments applied directly to principal, reporting annual interest, principal, and remaining balance.',
        'Computes the Mortgage Health Score from GDS/TDS ratios and down payment percentage (when income is entered) or from down payment, CMHC insurance status, and rate (when income is not entered).',
      ],
      notModeled: [
        'Property Transfer Tax, Land Transfer Tax, legal fees, or other closing costs.',
        'Mortgage term length — this report models the full amortization at the quoted rate, not a specific 2-or-5-year term.',
        'Rate changes at renewal — the rate is held constant for the full amortization period.',
      ],
    },

    disclaimer:
      'This report is for illustrative and educational purposes only. Mortgage payment, interest, CMHC insurance, GDS/TDS ratio, and Mortgage Health Score calculations are estimates and may differ from amounts quoted by a lender. Canadian mortgage interest compounds semi-annually per the Interest Act; actual payment amounts depend on your lender\'s specific calculation methods. CMHC premium rates are current at time of calculation and subject to change. GDS and TDS ratios use an estimated heating cost and may not reflect your actual expenses. Results do not constitute financial, mortgage, lending, tax, or legal advice. Consult a licensed mortgage professional or financial advisor before making any mortgage or property purchase decisions.',
  };

  const filename = `fincalc-smart-canadian-mortgage-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildMortgagePDF(
  input: MortgageAdapterInput,
): Promise<void> {
  const { data, filename } = buildMortgageReportData(input);
  await generatePDF(data, filename);
}

// ══════════════════════════════════════════════════════════════════════════════
// U.S. MORTGAGE — Regional reuse of the locked Mortgage family adapter
// Same engine, same report structure, US-specific fields and terminology.
// ══════════════════════════════════════════════════════════════════════════════

// ─── US Types ─────────────────────────────────────────────────────────────────

export interface USMortgageAdapterInput {
  // Calculator inputs (display only — no formula reproduction)
  homePrice: number;
  downPaymentAmount: number;
  downPct: number;
  interestRate: number;           // annual %
  loanTermYears: number;
  frequency: MortgageFrequency;
  extraPayment: number;
  propertyTaxAnnual: number;
  homeInsuranceAnnual: number;
  hoaFeeMonthly: number;
  pmiRateAnnual: number;          // 0 when PMI does not apply
  incomeEntered: boolean;
  grossIncome: number;            // 0 if not entered
  otherDebts: number;             // 0 if not entered

  // Core results (from live calculator — do not recompute in adapter)
  loanAmount: number;
  baseMonthlyPI: number;
  displayPayment: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  monthlyPmi: number;             // 0 when down payment ≥ 20%
  totalMonthly: number;
  totalInterest: number;
  totalPayment: number;
  pmiRequiredUntilYear: number | null;

  // Health score (pre-computed by UI — do not recompute)
  healthScore: number;
  healthLabel: 'Excellent' | 'Good' | 'Fair' | 'Manageable' | 'Needs Attention';
  healthTitle: string;
  healthCopy: string;

  // DTI ratios — null when income not entered
  frontEndDTI: number | null;
  backEndDTI: number | null;

  // Rate shock (+200bp stress test, from UI)
  rateShockNewRate: number;
  rateShockDifference: number;

  // Prepayment savings (from UI)
  roundUpYearsSaved: number;
  roundUpInterestSaved: number;

  // PMI threshold opportunity (null when not within 2% of 20% threshold)
  pmiThresholdAmountNeeded: number | null;
  pmiThresholdAnnualSavings: number | null;

  // Amortization schedule for milestone extraction (array slice — no formula reproduction)
  schedule: MortgageScheduleRow[];

  // Pre-computed insight text from getInsight()
  insightText: string;
}

// ─── US currency formatters (en-US + USD → $) ────────────────────────────────

function makePdfFmtUS(): (n: number) => string {
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  return (n: number) => nf.format(n);
}

function makePdfFmtUSx(): (n: number) => string {
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return (n: number) => nf.format(n);
}

// ─── US pure data mapper ──────────────────────────────────────────────────────

export function buildUSMortgageReportData(
  input: USMortgageAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {

  const fmt  = makePdfFmtUS();
  const fmtx = makePdfFmtUSx();

  const dateStr = now.toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const dateFile   = now.toISOString().slice(0, 10);
  const rand       = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `US-MTG-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  // ── Status derivation ──────────────────────────────────────────────────────
  const statusType =
    input.healthLabel === 'Excellent'       ? 'success' :
    input.healthLabel === 'Good'            ? 'success' :
    input.healthLabel === 'Fair'            ? 'warning' :
    input.healthLabel === 'Manageable'      ? 'warning' : 'danger';

  const statusLabel =
    input.healthLabel === 'Excellent'   ? 'Excellent Score'    :
    input.healthLabel === 'Good'        ? 'Good Score'         :
    input.healthLabel === 'Fair'        ? 'Fair Score'         :
    input.healthLabel === 'Manageable'  ? 'Manageable Score'   : 'Needs Attention';

  // ── Composition bar: Principal vs Total Interest ───────────────────────────
  const compTotal    = input.totalPayment;
  const principalPct = compTotal > 0 ? input.loanAmount    / compTotal : 0;
  const interestPct  = compTotal > 0 ? input.totalInterest / compTotal : 0;

  // ── Insight paragraphs ─────────────────────────────────────────────────────
  const interestRatio = input.loanAmount > 0
    ? ((input.totalInterest / input.loanAmount) * 100).toFixed(0)
    : '0';

  const p1 = `Your ${input.loanTermYears}-year mortgage on a ${fmt(input.homePrice)} property carries a loan of ${fmt(input.loanAmount)}. At ${input.interestRate}%, total interest over the loan term is ${fmt(input.totalInterest)} — ${interestRatio}% of the mortgage principal. Mortgage Health Score: ${input.healthScore}/100 (${input.healthLabel}).`;

  const p2Parts: string[] = [
    `Your ${freqDisplayLabel(input.frequency)} payment of ${fmtx(input.displayPayment)} covers principal and interest.`,
  ];
  if (input.totalMonthly > input.baseMonthlyPI) {
    const costLabels: string[] = [];
    if (input.monthlyTax       > 0) costLabels.push('property tax');
    if (input.monthlyInsurance > 0) costLabels.push('home insurance');
    if (input.monthlyHoa       > 0) costLabels.push('HOA');
    if (input.monthlyPmi       > 0) costLabels.push('PMI');
    if (costLabels.length > 0) {
      p2Parts.push(`Total estimated monthly housing costs are ${fmtx(input.totalMonthly)} (incl. ${costLabels.join(', ')}).`);
    }
  }
  const p2 = p2Parts.join(' ');

  const shockLine = `A 200-basis-point rate increase to ${input.rateShockNewRate.toFixed(2)}% would raise your ${freqPaymentLabel(input.frequency).toLowerCase()} by ${fmtx(input.rateShockDifference)}.`;

  const p3 = (() => {
    if (input.healthLabel === 'Needs Attention' || input.healthLabel === 'Manageable') {
      return `${input.healthTitle} ${input.healthCopy} ${shockLine}`;
    }
    if (input.roundUpInterestSaved > 1000 && input.roundUpYearsSaved > 0) {
      return `Adding an extra $100/month toward principal could save ${fmt(input.roundUpInterestSaved)} in interest and shorten your loan by approximately ${input.roundUpYearsSaved} ${input.roundUpYearsSaved === 1 ? 'year' : 'years'}. ${shockLine}`;
    }
    return `${input.healthTitle} ${shockLine}`;
  })();

  // ── Milestone rows from schedule (lookup only — no formula) ───────────────
  const midpointYear = Math.ceil(input.loanTermYears / 2);
  const balY5  = input.loanTermYears > 5 ? scheduleBalance(input.schedule, 5)  : null;
  const balMid = scheduleBalance(input.schedule, midpointYear);

  // ── DTI ratio rows ─────────────────────────────────────────────────────────
  const ratioRows =
    input.incomeEntered && input.frontEndDTI !== null && input.backEndDTI !== null
      ? [
          { label: 'Front-End DTI guideline: 28% or lower', value: `${input.frontEndDTI.toFixed(1)}%`,  accent: (input.frontEndDTI > 28 ? 'amber' : 'teal') as 'amber' | 'teal' },
          { label: 'Back-End DTI guideline: 36% or lower',  value: `${input.backEndDTI.toFixed(1)}%`,   accent: (input.backEndDTI  > 36 ? 'amber' : 'teal') as 'amber' | 'teal' },
        ]
      : [];

  // ─── Build ReportData ──────────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'U.S. Mortgage Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         'United States',
      currency:       'USD',
      sourceUrl:      'fincalcsmart.com/us-mortgage-calculator',
    },

    executiveSummary: {
      metrics: [
        {
          label:  'Mortgage Amount',
          value:  fmt(input.loanAmount),
          accent: 'teal',
        },
        {
          label:  freqPaymentLabel(input.frequency),
          value:  fmtx(input.displayPayment),
          accent: 'teal',
          sub:    `${input.loanTermYears}-yr term`,
        },
        {
          label:  'Total Interest',
          value:  fmt(input.totalInterest),
          accent: 'amber',
          sub:    `${interestRatio}% of principal`,
        },
        {
          label:  'Total Cost',
          value:  fmt(input.totalPayment),
        },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Principal vs. Total Interest (of total mortgage cost)',
      segments: [
        {
          label:          'Principal',
          valueFormatted: fmt(input.loanAmount),
          pct:            principalPct,
          color:          'teal',
        },
        {
          label:          'Total Interest',
          valueFormatted: fmt(input.totalInterest),
          pct:            interestPct,
          color:          'amber',
        },
      ],
      totalFormatted: fmt(input.totalPayment),
    },

    insightBlock: {
      title:      'AI-Assisted Mortgage Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Home Price',                value: fmt(input.homePrice) },
        { label: 'Down Payment',              value: `${fmt(input.downPaymentAmount)} (${input.downPct.toFixed(1)}%)` },
        { label: 'Annual Interest Rate',      value: `${input.interestRate}%` },
        { label: 'Loan Term',                 value: `${input.loanTermYears} years` },
        { label: 'Payment Frequency',         value: freqDisplayLabel(input.frequency) },
        ...(input.extraPayment > 0
          ? [{ label: 'Extra Monthly Payment',    value: fmtx(input.extraPayment) + '/month' }]
          : []),
        ...(input.propertyTaxAnnual > 0
          ? [{ label: 'Annual Property Tax',      value: fmt(input.propertyTaxAnnual) }]
          : []),
        ...(input.homeInsuranceAnnual > 0
          ? [{ label: 'Annual Home Insurance',    value: fmt(input.homeInsuranceAnnual) }]
          : []),
        ...(input.hoaFeeMonthly > 0
          ? [{ label: 'Monthly HOA Fee',          value: fmtx(input.hoaFeeMonthly) + '/month' }]
          : []),
        ...(input.incomeEntered
          ? [{ label: 'Gross Annual Household Income', value: fmt(input.grossIncome) }]
          : []),
      ],
    },

    results: {
      title: 'Mortgage Breakdown',
      rows: [
        { label: 'Mortgage Amount',                 value: fmt(input.loanAmount), accent: 'teal' },
        ...(input.monthlyPmi > 0
          ? [{ label: 'PMI',                        value: `${fmtx(input.monthlyPmi)}/month${input.pmiRequiredUntilYear !== null ? ` · drops at 78% LTV (~yr ${input.pmiRequiredUntilYear})` : ''}`, accent: 'amber' as const }]
          : []),
        { label: 'Base Monthly P&I Payment',        value: fmtx(input.baseMonthlyPI) + '/month' },
        { label: freqPaymentLabel(input.frequency), value: fmtx(input.displayPayment) },
        ...(input.totalMonthly > input.baseMonthlyPI
          ? [{ label: 'Total Monthly Housing Cost', value: fmtx(input.totalMonthly) + '/month' }]
          : []),
        { label: 'Total Interest Paid',             value: fmt(input.totalInterest), accent: 'amber' },
        { label: 'Total Mortgage Cost',             value: fmt(input.totalPayment) },
        ...ratioRows,
        ...(balY5 !== null
          ? [{ label: 'Balance After Year 5',       value: fmt(balY5) }]
          : []),
        ...(balMid !== null && midpointYear !== 1 && midpointYear !== 5
          ? [{ label: `Balance at Midpoint (Year ${midpointYear})`, value: fmt(balMid) }]
          : []),
        { label: 'Mortgage Health Score',           value: `${input.healthScore}/100 (${input.healthLabel})` },
      ],
    },

    keyDrivers: (() => {
      const drivers: string[] = [];

      if (input.healthLabel === 'Needs Attention' || input.healthLabel === 'Manageable') {
        drivers.push(input.healthTitle + ' ' + input.healthCopy);
      }

      if (input.pmiThresholdAmountNeeded !== null && input.pmiThresholdAnnualSavings !== null) {
        drivers.push(
          `PMI threshold opportunity: an additional ${fmt(input.pmiThresholdAmountNeeded)} brings your down payment to 20%, eliminating PMI and saving approximately ${fmtx(input.pmiThresholdAnnualSavings / 12)}/month from day one.`
        );
      } else if (input.monthlyPmi > 0) {
        drivers.push(
          `PMI of ${fmtx(input.monthlyPmi)}/month applies because your down payment is below 20%. PMI cancels automatically when your balance reaches 78% LTV${input.pmiRequiredUntilYear !== null ? ` (~year ${input.pmiRequiredUntilYear})` : ''}. Reaching 20% equity sooner allows a cancellation request under the Homeowners Protection Act.`
        );
      }

      if (input.roundUpInterestSaved > 1000 && input.roundUpYearsSaved > 0) {
        drivers.push(
          `Prepayment opportunity: adding $100/month toward principal saves an estimated ${fmt(input.roundUpInterestSaved)} in interest and may shorten your loan by approximately ${input.roundUpYearsSaved} ${input.roundUpYearsSaved === 1 ? 'year' : 'years'}.`
        );
      }

      if (input.rateShockDifference > 50) {
        drivers.push(
          `Rate sensitivity: a 200-basis-point increase to ${input.rateShockNewRate.toFixed(2)}% would raise your ${freqPaymentLabel(input.frequency).toLowerCase()} by approximately ${fmtx(input.rateShockDifference)}. Building a payment buffer or locking into a longer fixed term may reduce this exposure.`
        );
      }

      if (drivers.length < 3) {
        drivers.push(
          `Payment frequency: switching from monthly to accelerated bi-weekly payments effectively adds one extra monthly payment per year, reducing total interest and shortening your loan without a budget increase.`
        );
      }

      if (drivers.length < 3 && (input.healthLabel === 'Good' || input.healthLabel === 'Excellent')) {
        drivers.push(
          `Consider a 15-year term: higher monthly payments but significantly lower total interest. Compare the 15, 20, and 30-year scenarios side by side to weigh the monthly cost against total interest savings.`
        );
      }

      return drivers.slice(0, 3);
    })(),

    methodology: {
      whatItDoes: [
        'Uses standard US monthly compounding — divides the quoted annual rate by 12 to derive the monthly rate.',
        'Calculates the regular mortgage payment using the standard present-value annuity formula, then converts to bi-weekly or accelerated bi-weekly using the approved frequency multipliers.',
        'Applies PMI when down payment is below 20%, calculated monthly as (loan amount × annual rate) ÷ 12, and cancelled automatically when the outstanding balance reaches 78% LTV per the Homeowners Protection Act.',
        'Builds a year-by-year amortization schedule with extra monthly payments applied directly to principal.',
      ],
      notModeled: [
        'Closing costs, origination fees, discount points, title insurance, or other transaction costs.',
        'Adjustable-rate mortgages (ARMs) — this report models the full loan term at the quoted fixed rate.',
      ],
    },

    disclaimer:
      'This report is for illustrative and educational purposes only. Mortgage payment, interest, PMI, and Mortgage Health Score calculations are estimates and may differ from amounts quoted by a lender. US mortgage interest uses standard monthly compounding; actual payment amounts depend on your lender\'s specific calculation methods. PMI rates and cancellation timelines are estimates — actual removal is subject to lender verification of equity per the Homeowners Protection Act. DTI ratio guidelines (28% front-end, 36% back-end) are based on conventional Fannie Mae standards and may differ by loan program, lender, and credit profile. Results do not constitute financial, mortgage, lending, tax, or legal advice. Consult a licensed mortgage professional or financial advisor before making any mortgage or property purchase decisions.',
  };

  const filename = `fincalc-smart-us-mortgage-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── US Browser entry point ───────────────────────────────────────────────────

export async function buildUSMortgagePDF(
  input: USMortgageAdapterInput,
): Promise<void> {
  const { data, filename } = buildUSMortgageReportData(input);
  await generatePDF(data, filename);
}
