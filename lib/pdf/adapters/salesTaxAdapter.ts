import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalesTaxAdapterInput {
  // Inputs
  mode:           'add' | 'remove';
  amount:         number;
  taxRatePct:     number;
  region:         'ca' | 'us';
  // CA-specific
  province?:      string;
  provinceNote?:  string;
  components?:    Array<{ label: string; rate: number; amount: number }>;
  // Results
  preTax:         number;
  taxAmount:      number;
  total:          number;
  taxShare:       number;   // %
}

// ─── PDF currency formatters ──────────────────────────────────────────────────

function makePdfFmt(region: 'ca' | 'us'): (n: number) => string {
  const currency = region === 'ca' ? 'CAD' : 'USD';
  const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n: number) => nf.format(n);
}

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildSalesTaxReportData(
  input: SalesTaxAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const { region } = input;
  const fmt = makePdfFmt(region);

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `STX-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  const modeLabel   = input.mode === 'add' ? 'Add Tax' : 'Remove Tax (Reverse)';
  const provinceLabel = input.province && input.province !== 'manual' ? input.province : undefined;

  const statusType: 'success' | 'warning' | 'danger' =
    input.taxRatePct < 10 ? 'success' : input.taxRatePct < 15 ? 'warning' : 'danger';

  const statusLabel =
    input.taxRatePct < 8  ? 'Low Tax Rate' :
    input.taxRatePct < 13 ? 'Standard Rate' : 'Higher Rate';

  // Composition bar
  const total     = Math.max(input.total, 1);
  const preTaxPct = Math.min(1, Math.max(0, input.preTax  / total));
  const taxPct    = Math.max(0, 1 - preTaxPct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const provinceContext = region === 'ca' && provinceLabel
    ? ` for ${provinceLabel} (${input.provinceNote ?? `${input.taxRatePct}% combined rate`})`
    : '';

  const p1 = input.mode === 'add'
    ? `Adding ${input.taxRatePct}% sales tax${provinceContext} to ${fmt(input.amount)} yields a total of ${fmt(input.total)}. Tax amount: ${fmt(input.taxAmount)} (${input.taxShare.toFixed(1)}% of total price).`
    : `Removing ${input.taxRatePct}% sales tax${provinceContext} from ${fmt(input.amount)} reveals a pre-tax price of ${fmt(input.preTax)}. Tax amount embedded in the price: ${fmt(input.taxAmount)} (${input.taxShare.toFixed(1)}% of total).`;

  const componentLines = input.components && input.components.length > 1
    ? `Tax components: ${input.components.map(c => `${c.label} ${c.rate}% = ${fmt(c.amount)}`).join('; ')}.`
    : '';

  const p2 = `${componentLines ? componentLines + ' ' : ''}${region === 'ca' ? 'Canada sales tax varies by province and commodity type. GST (5%) applies federally; provinces add PST, HST, or QST on top.' : 'US sales tax rates vary by state and locality. This calculator uses a single combined rate as entered.'} Sales tax share of total price: ${input.taxShare.toFixed(1)}%.`;

  const p3 = `This calculation applies a single combined rate and does not account for tax-exempt goods, reduced rates, municipal surtaxes, or commodity-specific rules. For business remittance, input tax credits, or formal compliance purposes, consult a tax professional or the relevant tax authority.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers = [
    `Tax rate of ${input.taxRatePct}% adds ${fmt(input.taxAmount)} to a ${fmt(input.preTax)} pre-tax price. Rate changes have a proportional and immediate effect on the tax amount.`,
    `Tax share is ${input.taxShare.toFixed(1)}% of the total price -- useful for understanding the consumer burden. ${region === 'ca' && input.taxRatePct >= 15 ? 'At 15%+, tax is a significant portion of every purchase in this province.' : ''}`,
    input.mode === 'remove' ? `The reverse calculation extracts tax from a tax-included price: pre-tax = total / (1 + rate). This is useful for expense reimbursement, ITC claims, or price analysis when the displayed price already includes tax.` : `When comparing prices across provinces or states, use the "Remove Tax" mode to determine the pre-tax base and then apply the rate for your jurisdiction.`,
  ];

  // ── Component rows for results ────────────────────────────────────────────
  const componentResultRows = (input.components && input.components.length > 1)
    ? input.components.map(c => ({ label: `${c.label} (${c.rate}%)`, value: fmt(c.amount), accent: 'amber' as const }))
    : [];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Sales Tax Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/sales-tax-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'Pre-Tax Amount', value: fmt(input.preTax) },
        { label: 'Tax Amount',     value: fmt(input.taxAmount), accent: 'amber' },
        { label: 'Total (w/ Tax)', value: fmt(input.total),     accent: 'teal'  },
        { label: 'Tax Rate',       value: `${input.taxRatePct}%` },
        { label: 'Tax Share',      value: `${input.taxShare.toFixed(1)}% of total`, accent: 'amber' },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Price Breakdown',
      segments: [
        { label: 'Pre-Tax Amount', valueFormatted: fmt(input.preTax),    pct: preTaxPct, color: 'teal'  },
        { label: 'Tax Amount',     valueFormatted: fmt(input.taxAmount), pct: taxPct,    color: 'amber' },
      ],
      totalFormatted: fmt(input.total),
    },

    insightBlock: {
      title:      'Sales Tax Calculation Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Calculation Mode',  value: modeLabel },
        { label: 'Amount Entered',    value: fmt(input.amount) },
        { label: 'Tax Rate',          value: `${input.taxRatePct}%` },
        ...(provinceLabel ? [{ label: 'Province/Territory', value: provinceLabel }] : []),
        { label: 'Region',            value: regionLabel },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: 'Pre-Tax Amount',  value: fmt(input.preTax) },
        ...componentResultRows,
        { label: 'Total Tax',       value: fmt(input.taxAmount), accent: 'amber' },
        { label: 'Total with Tax',  value: fmt(input.total),     accent: 'teal'  },
        { label: 'Tax Share',       value: `${input.taxShare.toFixed(1)}% of total` },
        { label: 'Combined Rate',   value: `${input.taxRatePct}%` },
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        'Add Tax mode: tax = pre-tax amount x (rate / 100). Total = pre-tax + tax.',
        'Remove Tax (Reverse) mode: pre-tax = total amount / (1 + rate / 100). Tax = total - pre-tax.',
        region === 'ca'
          ? 'Canada province presets use combined GST/HST/PST/QST rates. Components shown separately when a province has multiple tax types. Last-component remainder pattern prevents floating-point drift.'
          : 'US mode applies a single combined rate as entered. No state/ZIP preset database is used.',
      ],
      notModeled: [
        'Tax-exempt or zero-rated goods (groceries, prescription drugs, medical devices in most jurisdictions).',
        'Municipal or county surtaxes beyond the entered rate.',
        'Small supplier thresholds or GST/HST registration requirements.',
        region === 'ca' ? 'Quebec QST input tax refunds (ITRs) for businesses.' : 'Origin vs destination-based sourcing rules for remote sellers.',
        'Alcohol, tobacco, cannabis, or luxury tax surcharges.',
        'Business sales tax compliance or remittance requirements.',
      ],
    },

    disclaimer: 'This report is for educational and illustrative purposes only. Sales tax rates and rules change frequently. This calculator uses a single combined rate and does not reflect all exemptions, special categories, or local surcharges. For business remittance, compliance, or formal tax advice, consult a qualified tax professional or the relevant tax authority.',
  };

  const filename = `fincalc-smart-sales-tax-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildSalesTaxPDF(input: SalesTaxAdapterInput): Promise<void> {
  const { data, filename } = buildSalesTaxReportData(input);
  await generatePDF(data, filename);
}
