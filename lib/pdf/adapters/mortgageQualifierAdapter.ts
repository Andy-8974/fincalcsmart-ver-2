import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MortgageQualifierAdapterInput {
  // Raw inputs
  annualIncome:        number;
  coApplicantIncome:   number;
  annualRate:          number;   // %
  amortization:        number;   // years
  propertyTax:         number;   // annual
  heatingCosts:        number;   // monthly
  downPayment:         number;
  carPayment:          number;   // monthly
  creditCardMin:       number;   // monthly
  otherDebts:          number;   // monthly
  // Results
  gdsRatio:            number;   // %
  tdsRatio:            number;   // %
  gdsLimit:            number;   // % (CA: 39; US: 28)
  tdsLimit:            number;   // % (CA: 44; US: 36)
  gdsPass:             boolean;
  tdsPass:             boolean;
  maxMortgage:         number;
  maxHomePrice:        number;
  monthlyIncome:       number;
  totalMonthlyDebts:   number;
  monthlyPI:           number;
  monthlyHousing:      number;
  verdict:             'approved' | 'borderline' | 'declined';
  verdictReason:       string;

  region: 'ca' | 'us';
}

// ─── PDF currency formatters ──────────────────────────────────────────────────

function makePdfFmt(region: 'ca' | 'us'): (n: number) => string {
  const currency = region === 'ca' ? 'CAD' : 'USD';
  const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (n: number) => nf.format(n);
}

function makePdfFmtx(region: 'ca' | 'us'): (n: number) => string {
  const currency = region === 'ca' ? 'CAD' : 'USD';
  const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n: number) => nf.format(n);
}

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildMortgageQualifierReportData(
  input: MortgageQualifierAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const { region } = input;
  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `MQR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  const verdictAccent: 'teal' | 'amber' | 'red' =
    input.verdict === 'approved' ? 'teal' : input.verdict === 'borderline' ? 'amber' : 'red';

  const statusType: 'success' | 'warning' | 'danger' =
    input.verdict === 'approved' ? 'success' : input.verdict === 'borderline' ? 'warning' : 'danger';

  const statusLabel =
    input.verdict === 'approved'   ? (region === 'ca' ? 'GDS & TDS Pass' : '28/36 Rule Pass') :
    input.verdict === 'borderline' ? 'Borderline' : 'Does Not Qualify';

  const stressNote = region === 'ca'
    ? ` Under Canada's B-20 stress test, qualification is assessed at the higher of your rate plus 2% or 5.25%.`
    : '';

  const ratioLabel = region === 'ca' ? 'GDS / TDS' : 'Front-End / Back-End DTI';

  // Composition bar: Monthly housing vs other monthly debts vs remaining income
  const monthlyIncome = Math.max(input.monthlyIncome, 1);
  const housingPct = Math.min(1, Math.max(0, input.monthlyHousing / monthlyIncome));
  const debtPct    = Math.min(1 - housingPct, Math.max(0, input.totalMonthlyDebts / monthlyIncome));
  const freePct    = Math.max(0, 1 - housingPct - debtPct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const p1 = input.verdict === 'approved'
    ? `Based on combined gross annual income of ${fmt(input.annualIncome + input.coApplicantIncome)} and a ${input.annualRate}% mortgage rate over ${input.amortization} years, this scenario qualifies under standard ${region === 'ca' ? 'B-20 GDS/TDS' : 'conventional 28/36 DTI'} guidelines. Your ${ratioLabel} ratios are ${input.gdsRatio.toFixed(1)}% / ${input.tdsRatio.toFixed(1)}% against limits of ${input.gdsLimit}% / ${input.tdsLimit}%.${stressNote}`
    : input.verdict === 'borderline'
    ? `Based on combined gross annual income of ${fmt(input.annualIncome + input.coApplicantIncome)}, this scenario is borderline -- close to the ${region === 'ca' ? 'B-20 GDS/TDS' : 'conventional 28/36 DTI'} limits. Your ${ratioLabel} ratios are ${input.gdsRatio.toFixed(1)}% / ${input.tdsRatio.toFixed(1)}% against limits of ${input.gdsLimit}% / ${input.tdsLimit}%.${stressNote} A lender may approve with compensating factors such as a larger down payment or lower existing debts.`
    : `Based on combined gross annual income of ${fmt(input.annualIncome + input.coApplicantIncome)}, this scenario does not qualify under standard ${region === 'ca' ? 'B-20 GDS/TDS' : 'conventional 28/36 DTI'} guidelines. Your ${ratioLabel} ratios are ${input.gdsRatio.toFixed(1)}% / ${input.tdsRatio.toFixed(1)}% against limits of ${input.gdsLimit}% / ${input.tdsLimit}%.${stressNote}`;

  const p2 = `Your maximum estimated mortgage qualifying amount is ${fmt(input.maxMortgage)}, resulting in a maximum estimated home price of ${fmt(input.maxHomePrice)} with a ${fmt(input.downPayment)} down payment. Estimated monthly principal and interest: ${fmtx(input.monthlyPI)}/month. Total monthly housing costs (P&I + tax + heating): ${fmtx(input.monthlyHousing)}/month.`;

  const improvePath = input.verdict !== 'approved'
    ? `To improve qualification: consider increasing your down payment, reducing existing monthly debt obligations (${fmt(input.totalMonthlyDebts)}/month currently), or increasing income. Reducing debts by ${fmt(input.totalMonthlyDebts * 0.25)}/month could meaningfully improve your TDS ratio.`
    : `Your debt profile is within guideline limits. Maintaining your current income-to-debt ratio and building a larger down payment can improve approval terms and reduce lender risk assessments.`;

  const p3 = `${improvePath} This is an estimated qualifying capacity based on the inputs provided. Actual mortgage qualification depends on your credit score, employment history, property type, and lender-specific underwriting criteria not modeled here.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const downPct = (input.downPayment / (input.maxHomePrice || 1)) * 100;
  const keyDrivers = [
    `GDS ratio (${input.gdsRatio.toFixed(1)}% vs ${input.gdsLimit}% limit): Driven by your monthly housing costs of ${fmtx(input.monthlyHousing)}. Reducing property tax assumptions or interest rate reduces GDS.`,
    `TDS ratio (${input.tdsRatio.toFixed(1)}% vs ${input.tdsLimit}% limit): Driven by monthly housing costs plus ${fmt(input.totalMonthlyDebts)} in other monthly debts. Paying off a car loan or credit card before applying materially improves TDS.`,
    `Down payment of ${fmt(input.downPayment)} (${downPct.toFixed(1)}% of max home price) ${region === 'ca' ? (downPct < 20 ? 'is below 20% -- CMHC mortgage insurance applies; the 39% GDS / 44% TDS limits used here match CMHC’s published qualification ratios.' : 'is at or above 20% -- CMHC insurance is not required; the same 39% GDS / 44% TDS limits are applied here as a conservative planning estimate, since actual uninsured-lender underwriting may differ.') : 'is at or above 20% -- conventional (uninsured) mortgage limits apply.'}`
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Mortgage Qualifier Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/mortgage-qualifier-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'Max Est. Mortgage',     value: fmt(input.maxMortgage), accent: 'teal' },
        { label: 'Max Est. Home Price',   value: fmt(input.maxHomePrice) },
        { label: `${region === 'ca' ? 'GDS' : 'Front-End'} Ratio`, value: `${input.gdsRatio.toFixed(1)}%`, accent: input.gdsPass ? 'teal' : 'red' },
        { label: `${region === 'ca' ? 'TDS' : 'Back-End DTI'} Ratio`, value: `${input.tdsRatio.toFixed(1)}%`, accent: input.tdsPass ? 'teal' : 'red' },
        { label: 'Qualification',         value: input.verdict === 'approved' ? 'Qualifies' : input.verdict === 'borderline' ? 'Borderline' : 'Does Not Qualify', accent: verdictAccent },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Monthly Income Allocation (Estimated)',
      segments: [
        { label: 'Monthly Housing',   valueFormatted: fmtx(input.monthlyHousing),       pct: housingPct, color: 'amber' },
        { label: 'Other Debts',       valueFormatted: fmtx(input.totalMonthlyDebts),     pct: debtPct,    color: 'slate' },
        { label: 'Remaining Income',  valueFormatted: fmtx(Math.max(0, (monthlyIncome - input.monthlyHousing - input.totalMonthlyDebts))), pct: freePct, color: 'teal' },
      ],
      totalFormatted: fmtx(monthlyIncome),
    },

    insightBlock: {
      title:      'AI-Assisted Mortgage Qualification Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Annual Income (Primary)',   value: fmt(input.annualIncome) },
        ...(input.coApplicantIncome > 0 ? [{ label: 'Co-Applicant Income', value: fmt(input.coApplicantIncome) }] : []),
        { label: 'Mortgage Rate',             value: `${input.annualRate}%` },
        { label: 'Amortization',              value: `${input.amortization} years` },
        { label: 'Down Payment',              value: fmt(input.downPayment) },
        { label: 'Annual Property Tax',       value: fmt(input.propertyTax) },
        { label: 'Monthly Heating Costs',     value: fmtx(input.heatingCosts) },
        ...(input.carPayment > 0        ? [{ label: 'Monthly Car Payment',   value: fmtx(input.carPayment) }] : []),
        ...(input.creditCardMin > 0     ? [{ label: 'Credit Card Minimums',  value: fmtx(input.creditCardMin) }] : []),
        ...(input.otherDebts > 0        ? [{ label: 'Other Monthly Debts',   value: fmtx(input.otherDebts) }] : []),
        { label: 'Region',                    value: regionLabel },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: 'Max Estimated Mortgage',    value: fmt(input.maxMortgage), accent: 'teal' },
        { label: 'Max Estimated Home Price',  value: fmt(input.maxHomePrice) },
        { label: 'Monthly P&I Payment',       value: fmtx(input.monthlyPI) },
        { label: 'Monthly Housing Total',     value: fmtx(input.monthlyHousing), accent: 'amber' },
        { label: 'Monthly Income',            value: fmtx(input.monthlyIncome) },
        { label: 'Total Monthly Debts',       value: input.totalMonthlyDebts > 0 ? fmtx(input.totalMonthlyDebts) : '$0', accent: input.totalMonthlyDebts > 0 ? 'amber' : undefined },
        { label: `${region === 'ca' ? 'GDS' : 'Front-End'} Ratio`, value: `${input.gdsRatio.toFixed(1)}% (limit ${input.gdsLimit}%)`, accent: input.gdsPass ? 'teal' : 'red' },
        { label: `${region === 'ca' ? 'TDS' : 'Back-End DTI'} Ratio`, value: `${input.tdsRatio.toFixed(1)}% (limit ${input.tdsLimit}%)`, accent: input.tdsPass ? 'teal' : 'red' },
        { label: 'GDS Pass',                  value: input.gdsPass ? 'Yes' : 'No', accent: input.gdsPass ? 'teal' : 'red' },
        { label: 'TDS Pass',                  value: input.tdsPass ? 'Yes' : 'No', accent: input.tdsPass ? 'teal' : 'red' },
        { label: 'Qualification Verdict',     value: input.verdict === 'approved' ? 'Qualifies' : input.verdict === 'borderline' ? 'Borderline' : 'Does Not Qualify', accent: verdictAccent },
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        region === 'ca'
          ? 'Applies OSFI B-20 GDS/TDS guidelines. Canada: qualifying rate is the higher of contract rate +2% or 5.25% (stress test). Uses a 39% GDS / 44% TDS planning limit for all scenarios -- for insured mortgages (down payment below 20%), these match CMHC’s published qualification ratios; for uninsured mortgages, actual lender underwriting may differ, so the same limits are applied as a conservative estimate.'
          : 'Applies conventional mortgage industry 28/36 front-end/back-end DTI guidelines (28% front-end is a common industry rule of thumb; 36% back-end matches Fannie Mae/Freddie Mac Selling Guide manual-underwriting limits). Front-end (housing ratio) limit: 28%. Back-end (total debt) limit: 36%. No stress test applied for the US.',
        'Solves for the maximum mortgage principal whose stress-test (CA) or contract-rate (US) P&I payment satisfies both ratio limits simultaneously.',
        'Maximum home price equals maximum mortgage plus down payment. Monthly P&I shown at contract rate for payment planning purposes.',
      ],
      notModeled: [
        'Credit score, employment history, or lender-specific underwriting overlays.',
        region === 'ca' ? 'CMHC or Sagen mortgage insurance premiums (adds to mortgage balance when down < 20%).' : 'Private mortgage insurance (PMI).',
        'Property condition, appraisal, or title issues.',
        'Variable-rate mortgage qualifying rules or fixed vs variable payment differences.',
        'Strata/condo fees (may be included by lenders in housing costs).',
        'Seasonal or irregular income treatment.',
      ],
    },

    disclaimer: region === 'ca'
      ? 'This report is for educational and illustrative purposes only and applies OSFI B-20 stress-test guidelines as documented at the time of this calculator build. Actual mortgage qualification depends on your lender, credit score, property type, and current regulatory requirements. This does not constitute mortgage, financial, or legal advice. Verify qualification with a licensed mortgage professional or your financial institution.'
      : 'This report is for educational and illustrative purposes only and applies conventional mortgage industry 28/36 qualification guidelines. Actual mortgage qualification depends on your lender, credit score, loan type, and current regulatory requirements. This does not constitute mortgage, financial, or legal advice. Verify qualification with a licensed mortgage professional or your financial institution.',
  };

  const filename = `fincalc-smart-mortgage-qualifier-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildMortgageQualifierPDF(input: MortgageQualifierAdapterInput): Promise<void> {
  const { data, filename } = buildMortgageQualifierReportData(input);
  await generatePDF(data, filename);
}
