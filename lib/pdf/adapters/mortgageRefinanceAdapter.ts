import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

type Decision = 'saves' | 'no-break-even' | 'costs-more';

export interface MortgageRefinanceAdapterInput {
  // Inputs
  currentBalance:    number;
  currentRate:       number;   // %
  yearsRemaining:    number;
  newRate:           number;   // %
  newAmortization:   number;   // years
  refinanceCosts:    number;
  cashOut:           number;
  horizonYears:      number;
  // Results
  paymentCurr:       number;
  paymentNew:        number;
  monthlySavings:    number;
  newPrincipal:      number;
  breakEvenMonths:   number | null;
  totalInterestCurrH: number;
  totalInterestNewH:  number;
  totalInterestDiff:  number;
  netSavingsOverHorizon: number;
  decision:          Decision;
  termExtended:      boolean;

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

const DECISION_LABELS: Record<Decision, string> = {
  'saves':          'Refinancing May Reduce Cost',
  'no-break-even':  'Break-even Beyond Horizon',
  'costs-more':     'New Payment Would Be Higher',
};

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildMortgageRefinanceReportData(
  input: MortgageRefinanceAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const { region } = input;
  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `RFI-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  const decisionAccent: 'teal' | 'amber' | 'red' =
    input.decision === 'saves' ? 'teal' : input.decision === 'no-break-even' ? 'amber' : 'red';

  const statusType: 'success' | 'warning' | 'danger' =
    input.decision === 'saves' ? 'success' : input.decision === 'no-break-even' ? 'warning' : 'danger';

  const breakEvenText = input.breakEvenMonths == null
    ? 'No break-even within the comparison horizon.'
    : input.breakEvenMonths === 0
    ? 'Immediate break-even (no refinance costs).'
    : `Break-even estimated at month ${input.breakEvenMonths} (~${(input.breakEvenMonths / 12).toFixed(1)} years).`;

  const termWarning = input.termExtended
    ? ` Note: the new ${input.newAmortization}-year amortization extends your repayment period beyond the current ${input.yearsRemaining} years remaining, which may increase total lifetime interest cost despite lower monthly payments.`
    : '';

  // Composition bar: current payment vs new payment portion of a common reference
  const maxPayment = Math.max(input.paymentCurr, input.paymentNew, 1);
  const currPct = input.paymentCurr / maxPayment;
  const newPct  = input.paymentNew  / maxPayment;

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const p1 = input.decision === 'saves'
    ? `Refinancing from ${input.currentRate}% to ${input.newRate}% on a ${fmt(input.currentBalance)} balance reduces your estimated monthly payment from ${fmtx(input.paymentCurr)} to ${fmtx(input.paymentNew)} -- a saving of ${fmtx(input.monthlySavings)}/month. ${breakEvenText}${termWarning}`
    : input.decision === 'no-break-even'
    ? `Refinancing from ${input.currentRate}% to ${input.newRate}% reduces your estimated monthly payment by ${fmtx(input.monthlySavings)}/month, but with ${fmt(input.refinanceCosts)} in refinance costs, the break-even is beyond the ${input.horizonYears}-year comparison horizon. ${breakEvenText}${termWarning}`
    : `Refinancing from ${input.currentRate}% to ${input.newRate}% would result in a higher estimated monthly payment (${fmtx(input.paymentNew)} vs ${fmtx(input.paymentCurr)}). Refinancing is not projected to reduce monthly costs under these assumptions.${termWarning}`;

  const interestNote = input.totalInterestDiff > 0
    ? `Over the ${input.horizonYears}-year comparison horizon, the new mortgage saves approximately ${fmt(input.totalInterestDiff)} in interest compared to keeping the current mortgage.`
    : `Over the ${input.horizonYears}-year horizon, the new mortgage costs approximately ${fmt(Math.abs(input.totalInterestDiff))} more in interest than keeping the current mortgage.`;

  const p2 = `${interestNote} Total interest under the current mortgage over ${input.horizonYears} years: ${fmt(input.totalInterestCurrH)}. Under the new mortgage: ${fmt(input.totalInterestNewH)}. Net savings over the horizon (after refinance costs): ${fmt(input.netSavingsOverHorizon)}.${input.cashOut > 0 ? ` Cash-out amount: ${fmt(input.cashOut)} (added to the new principal of ${fmt(input.newPrincipal)}).` : ''}`;

  const p3 = `This comparison uses a ${input.horizonYears}-year horizon for interest and payment calculations. Extending the horizon or choosing a shorter amortization would change the total interest outcome. ${region === 'ca' ? 'Canadian mortgages use semi-annual compounding per the Interest Act.' : 'US mortgages use monthly compounding.'}  Actual costs depend on lender fees, prepayment penalties, appraisal, and title charges not fully modeled here.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers = [
    `Monthly savings of ${fmtx(input.monthlySavings)}/month (${input.monthlySavings > 0 ? 'reduction' : 'increase'} from ${fmtx(input.paymentCurr)} to ${fmtx(input.paymentNew)}). Over the ${input.horizonYears}-year horizon this represents ${fmt(Math.abs(input.monthlySavings) * 12 * input.horizonYears)} in cumulative payment change before interest adjustment.`,
    input.refinanceCosts > 0
      ? `Refinance costs of ${fmt(input.refinanceCosts)} are the primary break-even driver. ${breakEvenText} If you plan to move before break-even, refinancing may not be cost-effective.`
      : `No refinance costs entered -- break-even is immediate. If actual closing costs apply, re-run the scenario with the full cost estimate.`,
    input.termExtended
      ? `Your new amortization (${input.newAmortization} yr) is longer than your current remaining term (${input.yearsRemaining} yr). Lower monthly payments come at the cost of a longer repayment period, which may increase total lifetime interest.`
      : `Your amortization is not extended. Shorter repayment maintains or reduces total interest cost while lowering the rate.`,
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Mortgage Refinance Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/mortgage-refinance-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'Current Payment',     value: fmtx(input.paymentCurr) },
        { label: 'New Payment',         value: fmtx(input.paymentNew), accent: input.paymentNew < input.paymentCurr ? 'teal' : 'red' },
        { label: 'Monthly Savings',     value: fmtx(input.monthlySavings), accent: input.monthlySavings > 0 ? 'teal' : 'red' },
        { label: 'Net Savings (Horizon)', value: fmt(input.netSavingsOverHorizon), accent: input.netSavingsOverHorizon > 0 ? 'teal' : 'red' },
        { label: 'Decision',            value: DECISION_LABELS[input.decision], accent: decisionAccent },
      ],
      statusLabel: DECISION_LABELS[input.decision],
      statusType,
    },

    compositionBar: {
      title: 'Monthly Payment Comparison',
      segments: [
        { label: 'Current Payment', valueFormatted: fmtx(input.paymentCurr), pct: currPct, color: 'amber' },
        { label: 'New Payment',     valueFormatted: fmtx(input.paymentNew),  pct: newPct,  color: 'teal'  },
      ],
      totalFormatted: fmtx(maxPayment),
    },

    insightBlock: {
      title:      'AI-Assisted Refinance Decision Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Current Balance',       value: fmt(input.currentBalance) },
        { label: 'Current Rate',          value: `${input.currentRate}%` },
        { label: 'Years Remaining',       value: `${input.yearsRemaining} yr` },
        { label: 'New Rate',              value: `${input.newRate}%` },
        { label: 'New Amortization',      value: `${input.newAmortization} yr` },
        { label: 'Refinance Costs',       value: fmt(input.refinanceCosts) },
        ...(input.cashOut > 0 ? [{ label: 'Cash-Out Amount', value: fmt(input.cashOut) }] : []),
        { label: 'Comparison Horizon',    value: `${input.horizonYears} yr` },
        { label: 'Region',                value: regionLabel },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: 'Current Monthly Payment', value: fmtx(input.paymentCurr) },
        { label: 'New Monthly Payment',     value: fmtx(input.paymentNew), accent: input.paymentNew < input.paymentCurr ? 'teal' : 'red' },
        { label: 'Monthly Savings',         value: fmtx(input.monthlySavings), accent: input.monthlySavings > 0 ? 'teal' : 'red' },
        { label: 'New Principal',           value: fmt(input.newPrincipal) },
        { label: 'Break-Even',              value: input.breakEvenMonths == null ? 'Beyond horizon' : input.breakEvenMonths === 0 ? 'Immediate' : `Month ${input.breakEvenMonths}` },
        { label: 'Current Interest (Horizon)', value: fmt(input.totalInterestCurrH), accent: 'amber' },
        { label: 'New Interest (Horizon)',   value: fmt(input.totalInterestNewH), accent: input.totalInterestNewH < input.totalInterestCurrH ? 'teal' : 'red' },
        { label: 'Interest Saved (Horizon)', value: fmt(input.totalInterestDiff), accent: input.totalInterestDiff > 0 ? 'teal' : 'red' },
        { label: 'Net Savings (Horizon)',    value: fmt(input.netSavingsOverHorizon), accent: input.netSavingsOverHorizon > 0 ? 'teal' : 'red' },
        { label: 'Decision',                value: DECISION_LABELS[input.decision], accent: decisionAccent },
        { label: 'Term Extension Warning',  value: input.termExtended ? 'Yes' : 'No', accent: input.termExtended ? 'amber' : 'teal' },
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        `Current monthly payment calculated from the current balance, rate, and years remaining. New monthly payment calculated from the new principal (balance + cash-out), new rate, and new amortization.`,
        region === 'ca'
          ? 'Canadian mortgages: semi-annual compounding applied via the standard effective monthly rate conversion per the Interest Act. Rates entered as annual nominal rates.'
          : 'US mortgages: monthly compounding. Rates entered as annual nominal rates.',
        `Total interest over the comparison horizon calculated by simulating payments for ${input.horizonYears} years under each scenario. Break-even calculated as refinance costs divided by monthly savings (or 0 when costs are 0).`,
      ],
      notModeled: [
        'Prepayment penalties on the existing mortgage.',
        'Lender origination fees, appraisal, title insurance, or legal costs beyond the entered refinance cost.',
        'Escrow account changes (property tax and insurance).',
        'Investment return on monthly savings if reinvested.',
        region === 'ca' ? 'CMHC re-qualification if the refinanced mortgage becomes insured.' : 'PMI recalculation on cash-out refinances.',
        'Tax deductibility of mortgage interest.',
      ],
    },

    disclaimer: 'This report is for educational and illustrative purposes only. The refinance comparison uses assumed fixed rates and does not account for all lender fees, taxes, prepayment penalties, or investment alternatives. Actual savings depend on the final negotiated rate, lender-specific closing costs, and how long you retain the mortgage. This does not constitute financial, mortgage, or legal advice. Consult a licensed mortgage professional before refinancing.',
  };

  const filename = `fincalc-smart-refinance-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildMortgageRefinancePDF(input: MortgageRefinanceAdapterInput): Promise<void> {
  const { data, filename } = buildMortgageRefinanceReportData(input);
  await generatePDF(data, filename);
}
