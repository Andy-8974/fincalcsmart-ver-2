import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

type FreqKey = 'annually' | 'semi' | 'monthly' | 'daily';

export interface LumpSumVsDcaAdapterInput {
  // Inputs
  totalAmount:    number;
  annualRate:     number;   // %
  freq:           FreqKey;
  yearsInvested:  number;
  spreadMonths:   number;
  // Results
  lumpFV:         number;
  lumpGain:       number;
  dcaMonthly:     number;
  dcaFV:          number;
  dcaGain:        number;
  gainDelta:      number;   // lumpFV - dcaFV
  deltaIsSignificant: boolean;
  comparisonState: 'lump-ahead' | 'similar';
  advantageScore:  number;
  advantageLabel:  'Strong' | 'Moderate' | 'Minimal';
  // Milestone values
  lumpAt10: number; dcaAt10: number;
  lumpAt20: number; dcaAt20: number;
  lumpAt30: number; dcaAt30: number;

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

const FREQ_LABELS: Record<FreqKey, string> = {
  annually: 'Annually',
  semi:     'Semi-Annually',
  monthly:  'Monthly',
  daily:    'Daily',
};

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildLumpSumVsDcaReportData(
  input: LumpSumVsDcaAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const { region } = input;
  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `DCA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  const advantageAccent: 'teal' | 'amber' =
    input.advantageLabel === 'Minimal' ? 'amber' : 'teal';

  const statusType: 'success' | 'warning' | 'danger' =
    input.comparisonState === 'similar' ? 'success' : 'warning';

  const statusLabel =
    input.comparisonState === 'similar' ? 'Similar Outcomes' : 'Lump Sum Leads';

  const lumpGainPct  = input.totalAmount > 0 ? (input.lumpGain  / input.totalAmount) * 100 : 0;
  const dcaGainPct   = input.totalAmount > 0 ? (input.dcaGain   / input.totalAmount) * 100 : 0;

  // Composition bar: lump sum FV vs DCA FV (relative)
  const totalFVSum = Math.max(input.lumpFV + input.dcaFV, 1);
  const lumpPct = Math.min(1, Math.max(0, input.lumpFV / totalFVSum));
  const dcaPct  = Math.max(0, 1 - lumpPct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const freqLabel = FREQ_LABELS[input.freq] ?? input.freq;

  const p1 = `Investing ${fmt(input.totalAmount)} at ${input.annualRate}% (${freqLabel} compounding) over ${input.yearsInvested} years: lump sum grows to ${fmt(input.lumpFV)} (gain: ${fmt(input.lumpGain)}, +${lumpGainPct.toFixed(0)}%). Monthly strategy (${fmt(input.dcaMonthly)}/mo over ${input.spreadMonths} months) reaches ${fmt(input.dcaFV)} (gain: ${fmt(input.dcaGain)}, +${dcaGainPct.toFixed(0)}%). Lump Sum Advantage Score: ${input.advantageScore}/100 (${input.advantageLabel}).`;

  const p2 = `Lump sum advantage: ${fmt(input.gainDelta)} more at year ${input.yearsInvested} (${input.deltaIsSignificant ? 'significant difference' : 'minimal difference'}). Milestone comparison -- at year 10: lump ${fmt(input.lumpAt10)} vs DCA ${fmt(input.dcaAt10)}; at year 20: ${fmt(input.lumpAt20)} vs ${fmt(input.dcaAt20)}; at year 30: ${fmt(input.lumpAt30)} vs ${fmt(input.dcaAt30)}.`;

  const p3 = `Lump sum investing tends to outperform gradual deployment in rising markets because the full principal compounds from day one. The monthly strategy (DCA) spreads market entry over ${input.spreadMonths} months, reducing timing risk but also reducing time-in-market for early tranches. Under this calculator's constant positive-return assumption, investing earlier produces a higher projected ending value because more capital remains invested for longer -- this is a direct result of the fixed-rate methodology, not a market forecast. However, DCA is often the psychologically easier approach for risk-averse investors or when capital is received gradually (e.g., payroll). This model does not account for market volatility -- the advantage of DCA in volatile or declining markets can be larger than this comparison suggests.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers = [
    `The ${input.annualRate}% return rate is the primary driver of the advantage gap. At higher return rates, lump sum benefits more from full compounding from day one -- the advantage widens with higher assumed returns.`,
    `Spread period of ${input.spreadMonths} months directly determines the DCA disadvantage. A 3-month spread leaves most capital at risk for almost the full horizon; a 36-month spread more meaningfully reduces market-timing risk.`,
    `Total investment horizon of ${input.yearsInvested} years amplifies any early-compounding advantage. At longer horizons, even a small initial advantage compounds into a larger absolute gap.`,
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Lump Sum vs DCA Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/lump-sum-vs-dca-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'Lump Sum FV',       value: fmt(input.lumpFV),  accent: 'teal'  },
        { label: 'Monthly DCA FV',    value: fmt(input.dcaFV),   accent: 'amber' },
        { label: 'Lump Sum Advantage', value: fmt(input.gainDelta), accent: advantageAccent },
        { label: 'Advantage Score',   value: `${input.advantageScore}/100`, sub: input.advantageLabel, accent: advantageAccent },
        { label: 'Comparison',        value: input.comparisonState === 'similar' ? 'Similar' : 'Lump Sum Leads' },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Final Value Comparison (Lump Sum vs DCA)',
      segments: [
        { label: 'Lump Sum FV',    valueFormatted: fmt(input.lumpFV), pct: lumpPct, color: 'teal'  },
        { label: 'Monthly DCA FV', valueFormatted: fmt(input.dcaFV),  pct: dcaPct,  color: 'amber' },
      ],
      totalFormatted: fmt(input.lumpFV + input.dcaFV),
    },

    insightBlock: {
      title:      'AI-Assisted Lump Sum vs DCA Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Total Investment',     value: fmt(input.totalAmount) },
        { label: 'Annual Return Rate',   value: `${input.annualRate}%` },
        { label: 'Compounding Frequency', value: freqLabel },
        { label: 'Investment Horizon',   value: `${input.yearsInvested} years` },
        { label: 'DCA Spread Period',    value: `${input.spreadMonths} months` },
        { label: 'Monthly DCA Amount',   value: fmtx(input.dcaMonthly) },
        { label: 'Region',               value: regionLabel },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: 'Lump Sum: Final Value',  value: fmt(input.lumpFV),  accent: 'teal'  },
        { label: 'Lump Sum: Gain',         value: fmt(input.lumpGain), accent: 'teal' },
        { label: 'DCA: Final Value',       value: fmt(input.dcaFV),   accent: 'amber' },
        { label: 'DCA: Gain',             value: fmt(input.dcaGain), accent: 'amber' },
        { label: 'Lump Sum Advantage',    value: fmt(input.gainDelta), accent: advantageAccent },
        { label: 'Difference Significant', value: input.deltaIsSignificant ? 'Yes' : 'No' },
        { label: 'Advantage Score',       value: `${input.advantageScore}/100 (${input.advantageLabel})` },
        { label: 'At Year 10: Lump Sum',  value: fmt(input.lumpAt10) },
        { label: 'At Year 10: DCA',       value: fmt(input.dcaAt10) },
        { label: 'At Year 20: Lump Sum',  value: fmt(input.lumpAt20) },
        { label: 'At Year 20: DCA',       value: fmt(input.dcaAt20) },
        { label: 'At Year 30: Lump Sum',  value: fmt(input.lumpAt30) },
        { label: 'At Year 30: DCA',       value: fmt(input.dcaAt30) },
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        `Lump sum: full principal P compounded for T months using the effective monthly rate derived from the selected compounding frequency: FV = P x (1 + r)^T.`,
        `Monthly strategy (DCA): equal monthly instalments of totalAmount / spreadMonths, each compounded from its contribution month to end of horizon. FV = sum of monthly x (1+r)^(T-k) for k = 1 to spreadMonths.`,
        `Advantage Score (0-100): derived from the percentage gain difference between strategies. Significant threshold: >0.5% absolute gain difference (as a share of total invested amount). ComparisonState "similar" when gainDelta is below the significance threshold.`,
      ],
      notModeled: [
        'Market volatility -- lump sum outperforms in rising markets; DCA reduces loss in declining markets.',
        'Transaction costs, fund management fees (MER), or tax on capital gains.',
        'Dividend reinvestment or yield on fixed-income components.',
        'Tax-sheltered account rules (TFSA/RRSP in CA, 401k/IRA in US) that affect net return.',
        'Behavioural factors -- DCA often leads to better investor behaviour during market downturns.',
        'Sequencing: this model assumes the full lump sum is available immediately.',
      ],
    },

    disclaimer: 'This report is for educational and illustrative purposes only. Investment return rates and compounding frequencies are assumptions entered by the user and do not represent guaranteed returns. Past market performance does not predict future results. This does not constitute investment advice. Consult a registered investment advisor before deploying capital.',
  };

  const filename = `fincalc-smart-lump-sum-dca-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildLumpSumVsDcaPDF(input: LumpSumVsDcaAdapterInput): Promise<void> {
  const { data, filename } = buildLumpSumVsDcaReportData(input);
  await generatePDF(data, filename);
}
