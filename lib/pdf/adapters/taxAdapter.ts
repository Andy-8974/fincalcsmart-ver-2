import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaxAdapterInput {
  // Inputs
  grossIncome:         number;
  region:              'ca' | 'us';
  // CA-specific
  province?:           string;   // e.g. 'Ontario (ON)'
  // US-specific
  filingStatus?:       'single' | 'mfj';
  stateRate?:          number;   // %
  stdDeductionApplied?: number;
  // Results
  federalTax:          number;
  provinceTax:         number;   // provincial (CA) or state+local (US)
  totalTax:            number;
  afterTaxIncome:      number;
  monthlyTakeHome:     number;
  effectiveRate:       number;   // %
  marginalFederalRate: number;   // %
  incomeBand:          string;
  bpaCredit?:          number;   // CA only
  taxYear:             number;   // e.g. 2025
  // Clarity score (computed in component)
  clarityScore:        number;   // 0-100
  clarityLabel:        string;
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

export function buildTaxReportData(
  input: TaxAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const { region } = input;
  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `TAX-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  const clarityAccent: 'teal' | 'amber' | 'red' =
    input.clarityScore >= 70 ? 'teal' : input.clarityScore >= 55 ? 'amber' : 'red';

  const statusType: 'success' | 'warning' | 'danger' =
    input.effectiveRate < 20 ? 'success' : input.effectiveRate < 30 ? 'warning' : 'danger';

  const statusLabel =
    input.effectiveRate < 15 ? 'Low Tax Rate' :
    input.effectiveRate < 25 ? 'Moderate Tax Rate' : 'High Tax Rate';

  // Composition bar: after-tax / federal / provincial
  const gross        = Math.max(input.grossIncome, 1);
  const afterTaxPct  = Math.min(1, Math.max(0, input.afterTaxIncome / gross));
  const fedPct       = Math.min(1 - afterTaxPct, Math.max(0, input.federalTax / gross));
  const provPct      = Math.max(0, 1 - afterTaxPct - fedPct);

  const provLabel = region === 'ca'
    ? (input.province ? `Provincial Tax (${input.province.replace(/ \(.+\)/, '')})` : 'Provincial Tax')
    : 'State/Local Tax';

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const stdDeductNote = region === 'us' && input.stdDeductionApplied != null && input.stdDeductionApplied > 0
    ? ` The ${input.filingStatus === 'mfj' ? 'Married Filing Jointly' : 'Single'} standard deduction of ${fmt(input.stdDeductionApplied)} reduces federal taxable income to ${fmt(Math.max(0, input.grossIncome - input.stdDeductionApplied))}.`
    : '';

  const bpaNote = region === 'ca' && input.bpaCredit != null && input.bpaCredit > 0
    ? ` A Basic Personal Amount (BPA) non-refundable tax credit of ${fmt(input.bpaCredit)} reduces federal tax payable.`
    : '';

  const p1 = `Based on ${input.taxYear} federal tax brackets${region === 'ca' ? ` and approximate ${input.province ?? 'provincial'} flat rate` : ''} for ${regionLabel}, your estimated income tax on ${fmt(input.grossIncome)} gross income is ${fmt(input.totalTax)} (${input.effectiveRate.toFixed(1)}% effective rate).${stdDeductNote}${bpaNote} Estimated after-tax income: ${fmt(input.afterTaxIncome)} (${fmtx(input.monthlyTakeHome)}/month). Take-Home Clarity Score: ${input.clarityScore}/100 (${input.clarityLabel}).`;

  const taxBreakdown = region === 'ca'
    ? `Federal income tax: ${fmt(input.federalTax)}. Estimated ${input.province ?? 'provincial'} tax: ${fmt(input.provinceTax)}. Total: ${fmt(input.totalTax)}.`
    : `Federal income tax: ${fmt(input.federalTax)}. Estimated state/local tax (${input.stateRate?.toFixed(1) ?? '0'}%): ${fmt(input.provinceTax)}. Total: ${fmt(input.totalTax)}.`;

  const p2 = `${taxBreakdown} Marginal federal rate at this income level: ${input.marginalFederalRate}% (${input.incomeBand}). The marginal rate applies only to income above the bracket threshold, not to all income.`;

  const p3 = region === 'ca'
    ? `This estimate uses ${input.taxYear} federal brackets and an approximate flat provincial rate for educational illustration. It does not account for CPP/EI premiums, RRSP deductions, other tax credits, surtax, or province-specific deductions. Actual tax owing depends on your full tax return. File your return with CRA or consult a tax professional.`
    : `This estimate uses ${input.taxYear} federal brackets and a manual state/local rate for educational illustration. It does not account for FICA/Medicare taxes, 401(k) deductions, itemized deductions, alternative minimum tax (AMT), or state-specific credits. Actual tax owing depends on your full return. Consult a tax professional for precise filing.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers = [
    `Your effective tax rate of ${input.effectiveRate.toFixed(1)}% reflects the blended average across all brackets -- not your marginal rate of ${input.marginalFederalRate}%. The effective rate is what matters for overall tax burden comparison.`,
    region === 'ca'
      ? `Provincial tax adds ${fmt(input.provinceTax)} (${((input.provinceTax / Math.max(input.grossIncome, 1)) * 100).toFixed(1)}% of gross income). Province selection significantly affects total tax -- this uses an approximate flat rate for education only.`
      : `State/local tax at ${input.stateRate?.toFixed(1) ?? '0'}% adds ${fmt(input.provinceTax)} to federal tax. State rates range from 0% to over 13% -- this is a major factor in comparing after-tax income across states.`,
    `Your after-tax monthly income of ${fmtx(input.monthlyTakeHome)}/month is the most actionable output for budgeting. Consider using this figure rather than gross income when planning fixed expenses or savings rates.`,
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Income Tax Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/income-tax-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'Gross Income',       value: fmt(input.grossIncome) },
        { label: 'Est. Total Tax',     value: fmt(input.totalTax),       accent: 'amber' },
        { label: 'Est. After-Tax Income', value: fmt(input.afterTaxIncome), accent: 'teal' },
        { label: 'Effective Tax Rate', value: `${input.effectiveRate.toFixed(1)}%`, accent: input.effectiveRate < 20 ? 'teal' : 'amber' },
        { label: 'Take-Home Clarity',  value: `${input.clarityScore}/100`, sub: input.clarityLabel, accent: clarityAccent },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Estimated Income Breakdown',
      segments: [
        { label: 'Est. After-Tax Income', valueFormatted: fmt(input.afterTaxIncome), pct: afterTaxPct, color: 'teal'  },
        { label: 'Federal Tax',           valueFormatted: fmt(input.federalTax),     pct: fedPct,      color: 'amber' },
        { label: provLabel,               valueFormatted: fmt(input.provinceTax),    pct: provPct,     color: 'slate' },
      ],
      totalFormatted: fmt(input.grossIncome),
    },

    insightBlock: {
      title:      'AI-Assisted Income Tax Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Gross Income',           value: fmt(input.grossIncome) },
        { label: 'Tax Year',               value: `${input.taxYear}` },
        ...(region === 'ca'
          ? [{ label: 'Province/Territory', value: input.province ?? 'Not selected' }]
          : [
              { label: 'Filing Status', value: input.filingStatus === 'mfj' ? 'Married Filing Jointly' : 'Single' },
              { label: 'State/Local Rate', value: `${input.stateRate?.toFixed(1) ?? '0'}%` },
              ...(input.stdDeductionApplied ? [{ label: 'Standard Deduction', value: fmt(input.stdDeductionApplied) }] : []),
            ]
        ),
        { label: 'Region',                 value: regionLabel },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: 'Gross Income',           value: fmt(input.grossIncome) },
        { label: 'Federal Income Tax',     value: fmt(input.federalTax),     accent: 'amber' },
        { label: provLabel,                value: fmt(input.provinceTax),    accent: 'amber' },
        ...(region === 'ca' && input.bpaCredit ? [{ label: 'BPA Tax Credit', value: `- ${fmt(input.bpaCredit)}`, accent: 'teal' as const }] : []),
        { label: 'Est. Total Tax',         value: fmt(input.totalTax),       accent: 'amber' },
        { label: 'Est. After-Tax Income',  value: fmt(input.afterTaxIncome), accent: 'teal'  },
        { label: 'Monthly Take-Home',      value: fmtx(input.monthlyTakeHome), accent: 'teal' },
        { label: 'Effective Tax Rate',     value: `${input.effectiveRate.toFixed(1)}%` },
        { label: 'Marginal Federal Rate',  value: `${input.marginalFederalRate}%` },
        { label: 'Income Band',            value: input.incomeBand },
        { label: 'Take-Home Clarity Score', value: `${input.clarityScore}/100 (${input.clarityLabel})`, accent: clarityAccent },
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        region === 'ca'
          ? `Applies ${input.taxYear} Canada federal progressive tax brackets. Basic Personal Amount (BPA) non-refundable credit applied: min(raw federal tax, BPA x 15%), cannot reduce below zero. Provincial estimate uses a flat approximate rate applied to gross income.`
          : `Applies ${input.taxYear} US federal progressive tax brackets. Standard deduction applied (Single: $15,000; MFJ: $30,000) to reduce taxable income before bracket calculation. State/local tax applied as a flat rate on gross income.`,
        'Effective tax rate = total tax / gross income. Marginal federal rate = federal rate bracket applying to the last dollar of gross income.',
        'Monthly take-home = (gross income - total tax) / 12. All estimates use the inputs entered and do not include payroll deductions beyond the tax amounts shown.',
      ],
      notModeled: region === 'ca' ? [
        'CPP and EI premiums (payroll deductions separate from income tax).',
        'RRSP deductions that reduce taxable income.',
        'Progressive provincial tax brackets (approximate flat rate used for all provinces).',
        'Ontario surtax, Quebec abatement, or other province-specific rules.',
        'Other federal or provincial tax credits beyond the BPA.',
        'Capital gains, self-employment, rental, or investment income.',
        'Alternative minimum tax (AMT).',
      ] : [
        'FICA (Social Security + Medicare) payroll taxes.',
        '401(k), IRA, or HSA deductions that reduce taxable income.',
        'Itemized deductions beyond the standard deduction.',
        'Alternative minimum tax (AMT).',
        'State-specific brackets, exemptions, or credits.',
        'Capital gains, self-employment, rental, or investment income treatment.',
      ],
    },

    disclaimer: region === 'ca'
      ? `This report is for educational and illustrative purposes only. Tax estimates use ${input.taxYear} approximate federal brackets and flat provincial rates. They do not constitute a tax return, tax filing advice, or CRA-approved calculations. Actual taxes depend on your full tax situation, deductions, and credits. File your T1 return with CRA or consult a qualified tax professional.`
      : `This report is for educational and illustrative purposes only. Tax estimates use ${input.taxYear} approximate federal brackets and a manual state rate. They do not constitute a tax return, IRS-approved calculations, or tax filing advice. Actual taxes depend on your full tax situation, deductions, and credits. File your Form 1040 or consult a qualified tax professional.`,
  };

  const filename = `fincalc-smart-income-tax-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildTaxPDF(input: TaxAdapterInput): Promise<void> {
  const { data, filename } = buildTaxReportData(input);
  await generatePDF(data, filename);
}
