import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoanAdapterInput {
  loanType: 'personal' | 'car';

  // Shared
  loanAmount:    number;
  annualRate:    number;
  monthlyPayment: number;
  totalInterest: number;
  totalCost:     number;
  interestRatio: number;       // % (0–100), interest as % of principal
  dtiPct:        number | null;
  loanScore:     number;       // 0–100
  scoreLabel:    'Excellent' | 'Good' | 'Fair' | 'Poor';
  statusLabel:   'Healthy' | 'Watch' | 'Caution';
  costPer1000:   number;
  region:        'ca' | 'us';

  // Personal loan fields
  loanTermYears?:           number;
  shorterTermYears?:        number | null;
  shorterTermInterestSaved?: number;
  shorterTermPaymentDiff?:   number; // payment increase for shorter term (shared: personal + car)

  // Car loan fields
  vehiclePrice?:          number;
  downPayment?:           number;
  downPaymentPct?:        number;
  loanTermMonths?:        number;
  isStrongEquity?:        boolean;
  downOptIncrease?:       number;
  downOptInterestSaved?:  number;
  downOptMonthlyDiff?:    number;
  shorterTermMonths?:     number | null;
  shorterTermSaved?:      number;
}

// ─── PDF currency formatters ──────────────────────────────────────────────────

function makePdfFmt(region: 'ca' | 'us'): (n: number) => string {
  const currency = region === 'ca' ? 'CAD' : 'USD';
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  return (n: number) => nf.format(n);
}

function makePdfFmtx(region: 'ca' | 'us'): (n: number) => string {
  const currency = region === 'ca' ? 'CAD' : 'USD';
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return (n: number) => nf.format(n);
}

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildLoanReportData(
  input: LoanAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {

  const { region, loanType } = input;
  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);

  const isPersonal = loanType === 'personal';
  const isCar      = loanType === 'car';

  const dateStr = now.toLocaleString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const dateFile   = now.toISOString().slice(0, 10);
  const prefix     = isPersonal ? 'PL' : 'CL';
  const rand       = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  const calculatorName = isPersonal ? 'Personal Loan Calculator' : 'Car Loan Calculator';
  const sourceUrl      = isPersonal
    ? 'fincalcsmart.com/personal-loan-calculator'
    : 'fincalcsmart.com/car-loan-calculator';
  const filenameSlug   = isPersonal ? 'personal-loan' : 'car-loan';

  const statusType =
    input.statusLabel === 'Healthy' ? 'success' :
    input.statusLabel === 'Watch'   ? 'warning' : 'danger';

  // ── Term label helpers ────────────────────────────────────────────────────
  const termLabel = isPersonal
    ? `${input.loanTermYears ?? 0} ${(input.loanTermYears ?? 0) === 1 ? 'year' : 'years'}`
    : (() => {
        const mo = input.loanTermMonths ?? 0;
        const yr = Math.round((mo / 12) * 10) / 10;
        return `${mo} months (${yr} yr)`;
      })();

  // ── Score accent ──────────────────────────────────────────────────────────
  const scoreAccent =
    input.scoreLabel === 'Excellent' ? 'teal' :
    input.scoreLabel === 'Good'      ? 'teal' :
    input.scoreLabel === 'Fair'      ? 'amber' : 'red';

  // ── Composition bar ───────────────────────────────────────────────────────
  const totalCost = Math.max(input.totalCost, 1);
  const principalPct = Math.min(1, Math.max(0, input.loanAmount / totalCost));
  const interestPct  = Math.max(0, 1 - principalPct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const loanLabel = isPersonal ? 'personal loan' : 'car loan';
  const termDisplay = isPersonal
    ? `${input.loanTermYears}-year term`
    : `${input.loanTermMonths}-month term`;

  const p1 = isPersonal
    ? `This personal loan of ${fmt(input.loanAmount)} at ${input.annualRate}% annual rate over a ${termDisplay} results in a monthly payment of ${fmtx(input.monthlyPayment)}. Over ${(input.loanTermYears ?? 0) * 12} payments, the total cost is ${fmt(input.totalCost)}, of which ${fmt(input.totalInterest)} (${input.interestRatio.toFixed(1)}% of principal) is interest. Borrowing Cost Score: ${input.loanScore}/100 (${input.scoreLabel}).`
    : `This car loan of ${fmt(input.loanAmount)} (vehicle price ${fmt(input.vehiclePrice ?? 0)} minus ${fmt(input.downPayment ?? 0)} down payment) at ${input.annualRate}% annual rate over a ${termDisplay} results in a monthly payment of ${fmtx(input.monthlyPayment)}. Over ${input.loanTermMonths} payments, the total cost is ${fmt(input.totalCost)}, of which ${fmt(input.totalInterest)} (${input.interestRatio.toFixed(1)}% of amount financed) is interest. Borrowing Cost Score: ${input.loanScore}/100 (${input.scoreLabel}).`;

  const rateContext = isPersonal
    ? (region === 'ca'
        ? 'Prime-based personal loans in Canada typically range 8–20% APR.'
        : 'Personal loan rates in the USA typically range 7–25% APR.')
    : (region === 'ca'
        ? 'New car loans in Canada typically range 5–12% APR; used car loans run higher, 8–18%.'
        : 'New car loans in the USA typically range 5–12% APR; used car loans run higher, 8–18%.');

  const rateVerdict =
    input.statusLabel === 'Healthy'
      ? `Your rate of ${input.annualRate}% is competitive — borrowing cost is manageable for a well-qualified borrower.`
      : input.statusLabel === 'Watch'
        ? `Your rate of ${input.annualRate}% is above the typical midpoint. Comparing 2–3 lenders before signing could meaningfully reduce total interest.`
        : `At ${input.annualRate}%, interest cost is elevated. Shopping lenders or improving your credit profile before applying is strongly recommended.`;

  const dtiLine = input.dtiPct !== null
    ? ` The monthly payment represents ${input.dtiPct.toFixed(1)}% of gross monthly income — ${input.dtiPct <= 15 ? 'well within the 15% comfort guideline.' : input.dtiPct <= 20 ? 'slightly above the 15% guideline but manageable.' : 'above the 20% comfort guideline; consider adjusting the loan amount or term.'}`
    : '';

  const p2 = `${rateContext} ${rateVerdict} Interest accounts for ${fmt(input.totalInterest)} (${input.interestRatio.toFixed(1)}% of the amount financed) over the full term, equivalent to ${fmtx(input.costPer1000)} per ${currency === 'CAD' ? 'CA$' : '$'}1,000 borrowed.${dtiLine}`;

  let p3: string;
  if (isPersonal) {
    const opt = (input.shorterTermYears ?? null) !== null && (input.shorterTermInterestSaved ?? 0) > 0;
    p3 = opt
      ? `Choosing a ${input.shorterTermYears}-year term instead of the current ${input.loanTermYears}-year term would save ${fmt(input.shorterTermInterestSaved ?? 0)} in total interest at a cost of ${fmtx(input.shorterTermPaymentDiff ?? 0)} more per month. If your budget allows the higher payment, shortening the term is the fastest path to reducing total borrowing cost.`
      : `You have selected the shortest available term — interest cost is already minimised for this loan amount and rate. The most effective lever at this point is to compare lenders for a lower rate.`;
  } else {
    if (input.isStrongEquity) {
      p3 = `Your down payment of ${fmt(input.downPayment ?? 0)} (${(input.downPaymentPct ?? 0).toFixed(1)}% of vehicle price) is a strong equity position. At 20%+ down, you reduce the amount financed, lender risk, and total interest paid. ${(input.shorterTermMonths ?? null) !== null ? `Choosing a ${input.shorterTermMonths}-month term instead of the current ${input.loanTermMonths}-month term would save an additional ${fmt(input.shorterTermSaved ?? 0)} in interest.` : 'You are already on the shortest available term.'}`;
    } else {
      p3 = `Increasing your down payment by ${fmt(input.downOptIncrease ?? 0)} would reduce total interest by approximately ${fmt(input.downOptInterestSaved ?? 0)} and lower your monthly payment by ${fmtx(input.downOptMonthlyDiff ?? 0)}. ${(input.shorterTermMonths ?? null) !== null ? `Alternatively, choosing a ${input.shorterTermMonths}-month term would save ${fmt(input.shorterTermSaved ?? 0)} in interest with a ${fmtx(input.shorterTermPaymentDiff ?? 0)}/month payment increase.` : 'You are already on the shortest available term, so increasing your down payment is the primary lever available.'}`;
    }
  }

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers: string[] = isPersonal
    ? [
        `Compare rates: your total interest of ${fmt(input.totalInterest)} is sensitive to rate — even a 1% reduction at ${fmt(input.loanAmount)} saves meaningful dollars over the full term.`,
        (input.shorterTermYears ?? null) !== null && (input.shorterTermInterestSaved ?? 0) > 0
          ? `Shorter term: moving to a ${input.shorterTermYears}-year term saves ${fmt(input.shorterTermInterestSaved ?? 0)} in interest — worth evaluating if ${fmtx(input.shorterTermPaymentDiff ?? 0)}/month more is affordable.`
          : 'You have selected the shortest available term — the primary lever is rate comparison across lenders.',
        input.dtiPct !== null
          ? `Affordability: at ${input.dtiPct.toFixed(1)}% of gross monthly income, this payment ${input.dtiPct <= 15 ? 'is within the 15% comfort guideline.' : 'exceeds the 15% guideline — factor this into your overall debt obligations.'}`
          : 'Add your annual income to the calculator to unlock affordability scoring against your gross monthly income.',
        `Prepayment: making extra principal payments early in the term reduces the balance that accrues interest and can meaningfully lower total cost — check your lender terms for prepayment penalties.`,
      ]
    : [
        isCar && (input.downPaymentPct ?? 0) < 20
          ? `Down payment: increasing to 20% of vehicle price (${fmt((input.vehiclePrice ?? 0) * 0.2)}) reduces the amount financed and improves your equity position from day one.`
          : `Strong equity: your ${(input.downPaymentPct ?? 0).toFixed(1)}% down payment minimises the amount financed and total interest paid over the term.`,
        (input.shorterTermMonths ?? null) !== null
          ? `Shorter term: choosing a ${input.shorterTermMonths}-month term saves ${fmt(input.shorterTermSaved ?? 0)} in interest at ${fmtx(input.shorterTermPaymentDiff ?? 0)} more per month — the fastest path to reducing total borrowing cost.`
          : 'You have selected the shortest available term — the primary lever is rate comparison across lenders.',
        `Rate check: ${input.annualRate}% annual rate ${input.statusLabel === 'Healthy' ? 'is competitive for a well-qualified borrower' : 'may benefit from shopping 2–3 lenders or improving your credit score before applying'}.`,
        input.dtiPct !== null
          ? `Affordability: the monthly payment is ${input.dtiPct.toFixed(1)}% of gross monthly income. ${input.dtiPct <= 15 ? 'Well within the recommended range.' : 'Factor in insurance, fuel, and maintenance alongside this payment.'}`
          : 'Add your annual income to the calculator to unlock affordability scoring against your gross monthly income.',
      ];

  // ── Inputs rows ───────────────────────────────────────────────────────────
  const inputRows = isPersonal
    ? [
        { label: 'Loan Amount',         value: fmt(input.loanAmount) },
        { label: 'Annual Interest Rate', value: `${input.annualRate}%` },
        { label: 'Loan Term',            value: termLabel },
        ...(input.dtiPct !== null
          ? [{ label: 'Annual Income (approx.)', value: fmt((input.monthlyPayment / (input.dtiPct / 100)) * 12) }]
          : []),
        { label: 'Compounding',          value: 'Monthly' },
      ]
    : [
        { label: 'Vehicle Price',        value: fmt(input.vehiclePrice ?? 0) },
        { label: 'Down Payment',         value: `${fmt(input.downPayment ?? 0)} (${(input.downPaymentPct ?? 0).toFixed(1)}%)` },
        { label: 'Amount Financed',      value: fmt(input.loanAmount) },
        { label: 'Annual Interest Rate', value: `${input.annualRate}%` },
        { label: 'Loan Term',            value: termLabel },
        ...(input.dtiPct !== null
          ? [{ label: 'Annual Income (approx.)', value: fmt((input.monthlyPayment / (input.dtiPct / 100)) * 12) }]
          : []),
        { label: 'Compounding',          value: 'Monthly' },
      ];

  // ── Result rows ───────────────────────────────────────────────────────────
  const resultRows = [
    { label: 'Monthly Payment',        value: fmtx(input.monthlyPayment), accent: 'teal' as const },
    { label: 'Total Interest',         value: fmt(input.totalInterest),   accent: 'amber' as const },
    { label: 'Total Cost of Loan',     value: fmt(input.totalCost) },
    { label: 'Interest / Principal',   value: `${input.interestRatio.toFixed(1)}%` },
    ...(isCar
      ? [
          { label: 'Down Payment',     value: fmt(input.downPayment ?? 0) },
          { label: 'Amount Financed',  value: fmt(input.loanAmount) },
        ]
      : []),
    {
      label:  'Borrowing Cost Score',
      value:  `${input.loanScore}/100 (${input.scoreLabel})`,
      accent: scoreAccent as 'teal' | 'amber' | 'red',
    },
    {
      label: `Cost per ${currency === 'CAD' ? 'CA$' : '$'}1,000 Borrowed`,
      value: fmtx(input.costPer1000),
    },
    ...(input.dtiPct !== null
      ? [{ label: 'Payment as % of Income', value: `${input.dtiPct.toFixed(1)}%` }]
      : []),
  ];

  // ── Methodology ───────────────────────────────────────────────────────────
  const whatItDoes = isPersonal
    ? [
        'Calculates the fixed monthly payment using standard amortization: P x r / (1 - (1+r)^-n), where r = annual rate / 12 / 100 and n = term months.',
        'Computes total interest as (monthly payment x n) - principal.',
        'Calculates interest/principal ratio as total interest divided by the loan amount.',
        'Derives Borrowing Cost Score from annual rate and interest ratio components (0–100 scale).',
        ...(input.dtiPct !== null ? ['Calculates DTI as monthly payment divided by gross monthly income (annual income / 12).'] : []),
      ]
    : [
        'Calculates the fixed monthly payment using standard amortization: P x r / (1 - (1+r)^-n), where r = annual rate / 12 / 100 and n = loan term months.',
        'Amount financed = vehicle price minus down payment.',
        'Computes total interest as (monthly payment x n) - amount financed.',
        'Models the down payment optimization by calculating interest savings from a reduced loan balance.',
        'Derives Borrowing Cost Score from annual rate and interest ratio components (0–100 scale).',
        ...(input.dtiPct !== null ? ['Calculates DTI as monthly payment divided by gross monthly income (annual income / 12).'] : []),
      ];

  const notModeled = isPersonal
    ? [
        'Origination fees, prepayment penalties, or other lender charges.',
        'Variable or promotional interest rates.',
        'Credit score impact on loan approval or rate.',
        'Taxes on loan proceeds (where applicable).',
        'Changes in income or financial circumstances over the loan term.',
      ]
    : [
        'Vehicle taxes, dealer fees, registration, or documentation charges.',
        'Automotive insurance or extended warranty costs.',
        'Vehicle depreciation — actual net vehicle value will differ from loan balance.',
        'Variable or promotional rates (e.g. 0% manufacturer financing).',
        'Trade-in value or negative equity rolled into the loan.',
        'Credit score impact on approval or rate.',
      ];

  const disclaimer = isPersonal
    ? 'This report is for illustrative and informational purposes only. Results assume a fixed interest rate and standard monthly amortization. Actual loan terms, approval, rate, and fees are determined by your lender and credit profile. This does not constitute financial, tax, or legal advice. Consult a licensed financial advisor before making borrowing decisions.'
    : 'This report is for illustrative and informational purposes only. Results assume a fixed interest rate and standard monthly amortization. Vehicle taxes, dealer fees, insurance, and other charges are not included. Actual loan terms depend on your lender and credit profile. This does not constitute financial, tax, or legal advice. Consult a licensed financial advisor before making borrowing decisions.';

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:       'FinCalc Smart',
      calculatorName,
      reportSubtitle:  'Personal Financial Scenario Report',
      generatedAt:     dateStr,
      scenarioId,
      region:          regionLabel,
      currency,
      sourceUrl,
    },

    executiveSummary: {
      metrics: [
        { label: 'Monthly Payment',    value: fmtx(input.monthlyPayment), accent: 'teal' },
        { label: 'Total Interest',     value: fmt(input.totalInterest),   accent: 'amber' },
        { label: 'Total Cost',         value: fmt(input.totalCost) },
        {
          label:  'Borrowing Cost Score',
          value:  `${input.loanScore}/100`,
          sub:    input.scoreLabel,
          accent: scoreAccent as 'teal' | 'amber' | 'red',
        },
      ],
      statusLabel: input.statusLabel,
      statusType:  statusType as 'success' | 'warning' | 'danger',
    },

    compositionBar: {
      title: 'Loan Cost Breakdown',
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
      totalFormatted: fmt(input.totalCost),
    },

    insightBlock: {
      title:      isPersonal ? 'AI-Assisted Personal Loan Summary' : 'AI-Assisted Car Loan Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows:  inputRows,
    },

    results: {
      title: 'Detailed Results',
      rows:  resultRows,
    },

    keyDrivers,

    methodology: {
      whatItDoes,
      notModeled,
    },

    disclaimer,
  };

  const filename = `fincalc-smart-${filenameSlug}-report-${region}-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry points ─────────────────────────────────────────────────────

export async function buildLoanPDF(input: LoanAdapterInput): Promise<void> {
  const { data, filename } = buildLoanReportData(input);
  await generatePDF(data, filename);
}
