import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WithdrawalAdapterInput {
  // Inputs
  currentSavings:      number;
  annualWithdrawal:    number;
  annualReturn:        number;   // % e.g. 6
  inflationRate:       number;   // % e.g. 2.5
  currentAge:          number;
  withdrawalStartAge:  number;
  targetEndingBalance: number;
  timing:              'beginning' | 'end';
  // Simulation outputs
  yearsLasting:        number;
  depletionAge:        number | null;
  depleted:            boolean;
  firstYearRate:       number;   // decimal e.g. 0.05
  withdrawalAtYear10:  number;
  withdrawalAtYear20:  number;
  withdrawalAtYear30:  number;
  totalWithdrawn:      number;
  remainingBalance:    number;
  // Sustainability
  sustainabilityStatus: 'Sustainable' | 'Watch' | 'At Risk' | 'Depleted';
  sustainabilityScore:  number;  // 0-100
  // Pressure
  pressureScore:  number;        // 0-100
  pressureStatus: 'Conservative' | 'Moderate' | 'Watch' | 'Elevated Pressure';

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

export function buildWithdrawalReportData(
  input: WithdrawalAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const { region } = input;
  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `WDR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  const firstYearRatePct = (input.firstYearRate * 100).toFixed(1);

  const sustainAccent: 'teal' | 'amber' | 'red' =
    input.sustainabilityStatus === 'Sustainable' ? 'teal' :
    input.sustainabilityStatus === 'Watch'       ? 'amber' : 'red';

  const pressureAccent: 'teal' | 'amber' | 'red' =
    input.pressureStatus === 'Conservative' || input.pressureStatus === 'Moderate' ? 'teal' :
    input.pressureStatus === 'Watch'  ? 'amber' : 'red';

  const statusType: 'success' | 'warning' | 'danger' =
    input.sustainabilityStatus === 'Sustainable' ? 'success' :
    input.sustainabilityStatus === 'Watch'       ? 'warning' : 'danger';

  // Composition bar: Total Withdrawn vs Remaining Balance (total = currentSavings as reference floor)
  const total         = Math.max(input.currentSavings, 1);
  const withdrawnPct  = Math.min(1, Math.max(0, input.totalWithdrawn  / total));
  const remainingPct  = Math.max(0, 1 - withdrawnPct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const depletionText = input.depleted
    ? `The portfolio is estimated to be depleted at age ${input.depletionAge ?? '—'} after ${input.yearsLasting} year${input.yearsLasting !== 1 ? 's' : ''} of withdrawals.`
    : `The portfolio is estimated to last the full ${input.yearsLasting}-year simulation horizon without depletion.`;

  const p1 = `Based on a starting portfolio of ${fmt(input.currentSavings)} with annual withdrawals of ${fmt(input.annualWithdrawal)} (${firstYearRatePct}% first-year withdrawal rate), the simulation projects ${input.yearsLasting} year${input.yearsLasting !== 1 ? 's' : ''} of sustainable withdrawals at ${input.annualReturn}% annual return and ${input.inflationRate}% inflation. ${depletionText} Sustainability Status: ${input.sustainabilityStatus} (Score: ${input.sustainabilityScore}/100).`;

  const rateContext =
    parseFloat(firstYearRatePct) < 3.5 ? `A first-year withdrawal rate of ${firstYearRatePct}% is considered conservative. Portfolios drawing less than 3.5% annually tend to last through long retirement horizons.` :
    parseFloat(firstYearRatePct) <= 5   ? `A first-year withdrawal rate of ${firstYearRatePct}% is in the moderate range. Rates between 3.5% and 5% carry some longevity risk, especially with higher inflation or lower returns than assumed.` :
                                          `A first-year withdrawal rate of ${firstYearRatePct}% is elevated. Rates above 5% significantly increase the risk of portfolio depletion, particularly over 25+ year horizons.`;

  const p2 = `${rateContext} With ${input.inflationRate}% annual inflation, your ${fmt(input.annualWithdrawal)} first-year withdrawal grows to approximately ${fmt(input.withdrawalAtYear10)} at year 10, ${fmt(input.withdrawalAtYear20)} at year 20, and ${fmt(input.withdrawalAtYear30)} at year 30. Withdrawal Pressure Score: ${input.pressureScore}/100 (${input.pressureStatus}).`;

  const notModeledItems = region === 'ca'
    ? ['CPP or OAS income offsets.', 'Taxes on RRSP/RRIF withdrawals.', 'RRIF minimum withdrawal rules (V2 scope).', 'Employer pension or defined-benefit income.', 'Sequence-of-returns risk or variable returns.', 'Fees or investment costs.']
    : ['Social Security or pension income offsets.', 'Federal or state taxes on withdrawals.', 'Required Minimum Distributions (RMDs).', 'Employer pension or defined-benefit income.', 'Sequence-of-returns risk or variable returns.', 'Fees or investment costs.'];

  const p3 = `This simulation uses a fixed annual return of ${input.annualReturn}% and does not account for ${region === 'ca' ? 'CPP, OAS, or pension income, taxes on withdrawals, or RRIF minimum rules' : 'Social Security, pension income, taxes on withdrawals, or RMD requirements'}. Actual portfolio longevity depends on market variability, tax treatment, and income from other sources not modeled here.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers = [
    `A first-year withdrawal rate of ${firstYearRatePct}% is the primary longevity driver. ${parseFloat(firstYearRatePct) > 5 ? 'Reducing withdrawals by even 0.5% per year can materially extend portfolio life.' : 'Maintaining this rate or reducing it as returns allow improves sustainability.'}`,
    `Your ${input.inflationRate}% inflation assumption means withdrawals nearly double every ${(72 / Math.max(input.inflationRate, 0.1)).toFixed(0)} years under the Rule of 72. Inflation is a significant long-term portfolio drain.`,
    input.depleted
      ? `The portfolio depletes at age ${input.depletionAge}. Consider part-time income, delaying withdrawals by ${input.withdrawalStartAge > input.currentAge ? 'more years' : 'a few years'}, or a lower withdrawal rate to extend longevity.`
      : `The portfolio survives the full ${input.yearsLasting}-year horizon, ending with approximately ${fmt(input.remainingBalance)} remaining. Maintaining your return assumption and inflation discipline preserves this outcome.`,
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Retirement Withdrawal Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/retirement-withdrawal-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'Starting Portfolio',       value: fmt(input.currentSavings) },
        { label: 'Annual Withdrawal',         value: fmt(input.annualWithdrawal) },
        { label: 'Years Lasting',             value: `${input.yearsLasting} yr${input.yearsLasting !== 1 ? 's' : ''}`, accent: sustainAccent },
        { label: 'Sustainability Score',      value: `${input.sustainabilityScore}/100`, sub: input.sustainabilityStatus, accent: sustainAccent },
        { label: 'Withdrawal Pressure Score', value: `${input.pressureScore}/100`,       sub: input.pressureStatus,       accent: pressureAccent },
      ],
      statusLabel: input.sustainabilityStatus,
      statusType,
    },

    compositionBar: {
      title: 'Estimated Withdrawal Breakdown (Projected)',
      segments: [
        { label: 'Est. Total Withdrawn', valueFormatted: fmt(input.totalWithdrawn),    pct: withdrawnPct,  color: 'amber' },
        { label: 'Remaining Balance',    valueFormatted: fmt(input.remainingBalance),  pct: remainingPct,  color: 'teal'  },
      ],
      totalFormatted: fmt(input.currentSavings),
    },

    insightBlock: {
      title:      'AI-Assisted Withdrawal Sustainability Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Starting Portfolio',        value: fmt(input.currentSavings) },
        { label: 'Annual Withdrawal',          value: fmt(input.annualWithdrawal) },
        { label: 'Assumed Annual Return',      value: `${input.annualReturn}%` },
        { label: 'Inflation Rate',             value: `${input.inflationRate}%` },
        { label: 'Current Age',                value: `${input.currentAge}` },
        { label: 'Withdrawal Start Age',       value: `${input.withdrawalStartAge}` },
        { label: 'Target Ending Balance',      value: input.targetEndingBalance > 0 ? fmt(input.targetEndingBalance) : '$0 (deplete fully)' },
        { label: 'Withdrawal Timing',          value: input.timing === 'beginning' ? 'Beginning of Year' : 'End of Year' },
        { label: 'Region',                     value: regionLabel },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: 'Years Lasting',              value: `${input.yearsLasting}`, accent: sustainAccent },
        { label: 'Depletion Age',              value: input.depletionAge != null ? `Age ${input.depletionAge}` : 'Not depleted', accent: input.depleted ? 'red' : 'teal' },
        { label: 'First-Year Withdrawal Rate', value: `${firstYearRatePct}%` },
        { label: 'Sustainability Status',      value: input.sustainabilityStatus, accent: sustainAccent },
        { label: 'Sustainability Score',       value: `${input.sustainabilityScore}/100`, accent: sustainAccent },
        { label: 'Withdrawal Pressure Score',  value: `${input.pressureScore}/100 (${input.pressureStatus})`, accent: pressureAccent },
        { label: 'Est. Total Withdrawn',       value: fmt(input.totalWithdrawn), accent: 'amber' },
        { label: 'Remaining Balance',          value: fmt(input.remainingBalance), accent: input.depleted ? 'red' : 'teal' },
        { label: 'Withdrawal at Year 10',      value: fmtx(input.withdrawalAtYear10) },
        { label: 'Withdrawal at Year 20',      value: fmtx(input.withdrawalAtYear20) },
        { label: 'Withdrawal at Year 30',      value: fmtx(input.withdrawalAtYear30) },
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        `Simulates year-by-year portfolio withdrawals starting at age ${input.withdrawalStartAge}, applying ${input.inflationRate}% annual inflation to increase withdrawal amounts each year. Withdrawal timing is ${input.timing}-of-year.`,
        `Applies ${input.annualReturn}% fixed annual return to the portfolio balance before or after withdrawals, depending on the selected timing. The simulation runs for up to 50 years or until the portfolio falls to the target ending balance.`,
        `Sustainability Score is based on years the portfolio lasts (0-100 scale). Withdrawal Pressure Score is based on the first-year withdrawal rate independent of the simulation outcome.`,
      ],
      notModeled: notModeledItems,
    },

    disclaimer: region === 'ca'
      ? 'This report is for educational and illustrative purposes only. Results are based on fixed assumed return and inflation rates and do not reflect CPP, OAS, pension income, RRIF minimum withdrawal rules, or taxes on withdrawals. Actual portfolio longevity will vary based on market returns, tax treatment, and personal circumstances. This does not constitute financial, tax, or retirement planning advice. Consult a qualified financial advisor before making withdrawal decisions.'
      : 'This report is for educational and illustrative purposes only. Results are based on fixed assumed return and inflation rates and do not reflect Social Security, pension income, Required Minimum Distributions (RMDs), or taxes on withdrawals. Actual portfolio longevity will vary based on market returns, tax treatment, and personal circumstances. This does not constitute financial, tax, or retirement planning advice. Consult a qualified financial advisor before making withdrawal decisions.',
  };

  const filename = `fincalc-smart-withdrawal-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildWithdrawalPDF(input: WithdrawalAdapterInput): Promise<void> {
  const { data, filename } = buildWithdrawalReportData(input);
  await generatePDF(data, filename);
}
