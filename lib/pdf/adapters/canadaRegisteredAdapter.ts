import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccountType = 'tfsa' | 'rrsp';

export interface CanadaRegisteredAdapterInput {
  accountType:         AccountType;
  // Inputs (shared)
  currentBalance:      number;
  availableRoom:       number;
  plannedOneTime:      number;
  monthlyContribution: number;
  annualRate:          number;   // %
  freq:                string;   // 'annually' | 'semi' | 'monthly' | 'daily'
  yearsInvested:       number;
  // Growth results (shared)
  projectedValue:      number;
  totalContributions:  number;
  taxFreeGrowth:       number;   // TFSA calls it taxFreeGrowth; RRSP calls it investmentGrowth
  growthPct:           number;
  // Room check (shared)
  plannedFirstYear:    number;
  roomUsedPct:         number;
  overRoom:            boolean;
  overRoomBy:          number;
  growthScore:         number;
  growthLabel:         'Excellent' | 'Good' | 'Fair' | 'Poor';
  // RRSP-only fields (ignored for TFSA)
  marginalTaxRate?:    number;   // %
  estimatedTaxRefund?: number;
  // Milestone projections (shared)
  valAt10: number;
  valAt20: number;
  valAt30: number;
}

// ─── PDF currency formatters (CA-only) ────────────────────────────────────────

function makePdfFmt(): (n: number) => string {
  const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (n: number) => nf.format(n);
}

function makePdfFmtx(): (n: number) => string {
  const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n: number) => nf.format(n);
}

const FREQ_LABELS: Record<string, string> = {
  annually: 'Annual', semi: 'Semi-Annual', monthly: 'Monthly', daily: 'Daily',
};

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildCanadaRegisteredReportData(
  input: CanadaRegisteredAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const fmt  = makePdfFmt();
  const fmtx = makePdfFmtx();

  const isTFSA = input.accountType === 'tfsa';
  const accountName = isTFSA ? 'TFSA' : 'RRSP';

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const prefix   = isTFSA ? 'TFS' : 'RRS';
  const scenarioId = `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const growthAccent: 'teal' | 'amber' | 'red' =
    input.growthScore >= 70 ? 'teal' : input.growthScore >= 45 ? 'amber' : 'red';

  const roomAccent: 'teal' | 'amber' | 'red' =
    input.overRoom ? 'red' : input.roomUsedPct >= 90 ? 'amber' : 'teal';

  const statusType: 'success' | 'warning' | 'danger' =
    input.overRoom ? 'danger' : input.growthScore >= 60 ? 'success' : 'warning';

  const statusLabel = input.overRoom
    ? `Over ${accountName} Room`
    : input.growthScore >= 70 ? 'Healthy Growth' : 'Moderate Growth';

  // Composition bar: Current Balance / Total Contributions / Tax-Free Growth
  const total      = Math.max(input.projectedValue, 1);
  const balPct     = Math.min(1, Math.max(0, input.currentBalance / total));
  const contribPct = Math.min(1 - balPct, Math.max(0, (input.totalContributions - input.plannedOneTime - input.monthlyContribution * 12 * input.yearsInvested) / total));
  const growthPct  = Math.max(0, 1 - balPct - contribPct);

  // Simpler composition: contributions vs growth
  const contribTotal    = Math.max(0, input.totalContributions);
  const contribFinalPct = Math.min(1, Math.max(0, contribTotal / total));
  const growthFinalPct  = Math.max(0, 1 - contribFinalPct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const roomContext = input.overRoom
    ? `Your planned first-year contribution of ${fmt(input.plannedOneTime + input.monthlyContribution * 12)} exceeds your available ${accountName} room of ${fmt(input.availableRoom)} by ${fmt(input.overRoomBy)}. An over-contribution may attract CRA penalties. Verify your available room via CRA My Account before contributing.`
    : `Your planned first-year contribution of ${fmt(input.plannedFirstYear)} uses ${input.roomUsedPct.toFixed(1)}% of your entered available ${accountName} room of ${fmt(input.availableRoom)}.`;

  const p1 = isTFSA
    ? `Based on a starting ${accountName} balance of ${fmt(input.currentBalance)}, a one-time contribution of ${fmt(input.plannedOneTime)}, and ${fmtx(input.monthlyContribution)}/month over ${input.yearsInvested} years at ${input.annualRate}% assumed return, your projected ${accountName} value is ${fmt(input.projectedValue)}. All growth is estimated to be tax-free on withdrawal. ${accountName} Growth Score: ${input.growthScore}/100 (${input.growthLabel}).`
    : `Based on a starting ${accountName} balance of ${fmt(input.currentBalance)}, a one-time contribution of ${fmt(input.plannedOneTime)}, and ${fmtx(input.monthlyContribution)}/month over ${input.yearsInvested} years at ${input.annualRate}% assumed return, your projected ${accountName} value is ${fmt(input.projectedValue)}. Estimated tax reduction on the first-year contribution: ${fmt(input.estimatedTaxRefund ?? 0)} (simplified estimate at ${input.marginalTaxRate ?? 0}% marginal rate). ${accountName} Growth Score: ${input.growthScore}/100 (${input.growthLabel}).`;

  const p2 = `Your projected ${fmt(input.projectedValue)} consists of approximately ${fmt(contribTotal)} in contributions and ${fmt(input.taxFreeGrowth)} in estimated ${isTFSA ? 'tax-free' : 'tax-deferred'} growth. Milestone projections at ${input.annualRate}% return: ${fmt(input.valAt10)} at year 10, ${fmt(input.valAt20)} at year 20, ${fmt(input.valAt30)} at year 30. ${roomContext}`;

  const p3 = isTFSA
    ? `${accountName} contribution room accumulates each year regardless of income. Withdrawals are re-added to your available room the following January 1. This projection does not model future room accumulation, withdrawals and recontributions, or investment fees. Actual CRA ${accountName} room may differ from the amount entered here -- verify via CRA My Account.`
    : `${accountName} contributions reduce your taxable income in the year of contribution, and growth is tax-deferred until withdrawal. This projection does not model RRSP-to-RRIF conversion requirements, withdrawal taxes, spousal RRSP rules, or the Home Buyers' Plan / Lifelong Learning Plan. Verify your available deduction room via your CRA Notice of Assessment or CRA My Account.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  // Rule of 72 is only meaningful at rates where the resulting doubling period
  // is a sensible number of years; at 0% or near-0% it produces no claim or an
  // extreme, misleading figure, so those cases fall back to neutral wording.
  const rule72Years = 72 / Math.max(input.annualRate, 0.0001);
  const growthDriverText = input.annualRate <= 0 || rule72Years > 100
    ? `Compounding over ${input.yearsInvested} years is the primary growth driver. At the selected return rate, meaningful investment growth is limited. Starting earlier or extending the horizon compounds this effect once a positive return is assumed.`
    : `Compounding over ${input.yearsInvested} years is the primary growth driver. At ${input.annualRate}%, funds approximately double every ${rule72Years.toFixed(0)} years (Rule of 72). Starting earlier or extending the horizon compounds this effect.`;

  const keyDrivers = [
    growthDriverText,
    `Monthly contributions of ${fmtx(input.monthlyContribution)}/month accumulate to ${fmt(input.monthlyContribution * 12 * input.yearsInvested)} over ${input.yearsInvested} years before growth. Increasing contributions by ${fmtx(100)}/month adds approximately ${fmt(100 * 12 * input.yearsInvested)} in additional invested capital.`,
    input.overRoom
      ? `Your planned contributions exceed your available ${accountName} room by ${fmt(input.overRoomBy)}. Reduce your contribution plan or verify your actual room with CRA before proceeding.`
      : `Your room usage of ${input.roomUsedPct.toFixed(1)}% leaves ${fmt(Math.max(0, input.availableRoom - input.plannedFirstYear))} in unused ${accountName} room this year. Unused room does not expire${isTFSA ? ' and accumulates annually' : ' but using it defers more tax-advantaged growth'}.`,
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: `${accountName} ${isTFSA ? 'Contribution & Growth' : 'Savings'} Calculator`,
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         'Canada',
      currency:       'CAD',
      sourceUrl:      `fincalcsmart.com/${isTFSA ? 'tfsa' : 'rrsp-savings'}-calculator`,
    },

    executiveSummary: {
      metrics: [
        { label: `Projected ${accountName} Value`, value: fmt(input.projectedValue), accent: 'teal' },
        { label: 'Total Contributions',            value: fmt(contribTotal) },
        { label: `Est. ${isTFSA ? 'Tax-Free' : 'Tax-Deferred'} Growth`, value: fmt(input.taxFreeGrowth), accent: 'teal' },
        ...(isTFSA ? [] : [{ label: 'Est. Tax Reduction', value: fmt(input.estimatedTaxRefund ?? 0), accent: 'teal' as const }]),
        { label: `${accountName} Growth Score`, value: `${input.growthScore}/100`, sub: input.growthLabel, accent: growthAccent },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: `Estimated ${accountName} Breakdown`,
      segments: [
        { label: 'Total Contributions', valueFormatted: fmt(contribTotal),        pct: contribFinalPct, color: 'slate' },
        { label: `${isTFSA ? 'Tax-Free' : 'Tax-Deferred'} Growth`, valueFormatted: fmt(input.taxFreeGrowth), pct: growthFinalPct, color: 'teal' },
      ],
      totalFormatted: fmt(input.projectedValue),
    },

    insightBlock: {
      title:      `AI-Assisted ${accountName} Growth Summary`,
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Current Balance',         value: fmt(input.currentBalance) },
        { label: `Available ${accountName} Room`, value: fmt(input.availableRoom) },
        { label: 'One-Time Contribution',   value: fmt(input.plannedOneTime) },
        { label: 'Monthly Contribution',    value: `${fmtx(input.monthlyContribution)}/month` },
        { label: 'Assumed Annual Return',   value: `${input.annualRate}%` },
        { label: 'Compound Frequency',      value: FREQ_LABELS[input.freq] ?? input.freq },
        { label: 'Investment Horizon',      value: `${input.yearsInvested} years` },
        ...(input.accountType === 'rrsp' && input.marginalTaxRate != null
          ? [{ label: 'Marginal Tax Rate', value: `${input.marginalTaxRate}%` }]
          : []),
        { label: 'Region',                  value: 'Canada' },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: `Projected ${accountName} Value`, value: fmt(input.projectedValue), accent: 'teal' },
        { label: 'Total Contributions',            value: fmt(contribTotal) },
        { label: `Est. ${isTFSA ? 'Tax-Free' : 'Tax-Deferred'} Growth`, value: fmt(input.taxFreeGrowth), accent: 'teal' },
        { label: 'Planned First-Year Contributions', value: fmt(input.plannedFirstYear) },
        { label: `${accountName} Room Used`, value: `${input.roomUsedPct.toFixed(1)}%`, accent: roomAccent },
        { label: 'Over Room?', value: input.overRoom ? `Yes -- over by ${fmt(input.overRoomBy)}` : 'No', accent: input.overRoom ? 'red' : 'teal' },
        ...(input.accountType === 'rrsp' ? [{ label: 'Est. Tax Reduction', value: fmt(input.estimatedTaxRefund ?? 0), accent: 'teal' as const }] : []),
        { label: 'Value at Year 10',   value: fmt(input.valAt10) },
        { label: 'Value at Year 20',   value: fmt(input.valAt20) },
        { label: 'Value at Year 30',   value: fmt(input.valAt30) },
        { label: `${accountName} Growth Score`, value: `${input.growthScore}/100 (${input.growthLabel})`, accent: growthAccent },
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        `Calculates projected ${accountName} value using compound interest with an effective monthly rate derived from the selected compound frequency and annual rate. Starting balance plus a one-time contribution plus monthly contributions compounds over the selected horizon.`,
        `First-year room check: compares planned one-time plus 12 months of contributions against entered available room. Over-contribution warning fires when planned exceeds available room. This is an estimate -- actual CRA room may differ.`,
        ...(input.accountType === 'rrsp'
          ? [`Estimated tax reduction: first-year contribution (capped at available room) multiplied by the entered marginal tax rate. This is a simplified estimate and does not account for marginal rate changes, RRSP carry-forward, or other tax credits.`]
          : []),
      ],
      notModeled: isTFSA ? [
        'CRA exact contribution room (enter manually from CRA My Account).',
        'Future room accumulation from annual limit increases.',
        'Withdrawals and recontribution to room the following year.',
        'Investment fees, MERs, or tax drag on growth.',
        'Spousal TFSA accounts.',
        'US persons subject to FBAR or IRS TFSA reporting requirements.',
      ] : [
        'CRA exact deduction room (enter manually from Notice of Assessment).',
        'RRSP-to-RRIF conversion at age 71 and RRIF minimum withdrawals.',
        'Taxes owing on RRSP/RRIF withdrawals in retirement.',
        'Spousal RRSP accounts.',
        "Home Buyers' Plan (HBP) or Lifelong Learning Plan (LLP) withdrawals.",
        'Investment fees or MERs on growth returns.',
        'Provincial tax rates or provincial tax credits.',
      ],
    },

    disclaimer: isTFSA
      ? 'This report is for educational and illustrative purposes only. The TFSA projection uses a fixed assumed return and does not reflect actual CRA contribution room, future annual limits, or taxes on over-contributions. Verify your available TFSA room via CRA My Account before contributing. This does not constitute financial, tax, or legal advice. Consult a qualified tax professional regarding your TFSA eligibility and room.'
      : 'This report is for educational and illustrative purposes only. The RRSP projection uses a fixed assumed return and does not reflect actual CRA deduction room, taxes on withdrawals, RRIF conversion rules, or spousal RRSP considerations. The estimated tax reduction is a simplified estimate and not a guarantee. Verify your available deduction room via your CRA Notice of Assessment. This does not constitute financial, tax, or legal advice. Consult a qualified tax professional.',
  };

  const filePrefix = isTFSA ? 'tfsa' : 'rrsp';
  const filename = `fincalc-smart-${filePrefix}-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildCanadaRegisteredPDF(input: CanadaRegisteredAdapterInput): Promise<void> {
  const { data, filename } = buildCanadaRegisteredReportData(input);
  await generatePDF(data, filename);
}
