import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmergencyFundAdapterInput {
  // Inputs
  monthlyExpenses:     number;
  currentSavings:      number;
  monthlyContribution: number;
  stability:           'stable' | 'moderate' | 'variable';
  targetMonths:        number;
  // Results
  targetAmount:        number;
  currentCoverageMonths: number;
  gap:                 number;
  surplus:             number;
  monthsToTarget:      number | null;
  suggestedMonthly:    number;
  readinessScore:      number;
  readinessLabel:      'Excellent' | 'Good' | 'Fair' | 'Poor';
  readinessStatus:     'Healthy' | 'Watch' | 'Caution';
  targetProgress:      number;  // %
  tpBadge:             'On Track' | 'Close' | 'Behind';
  leverState:          'below-saving' | 'at-target' | 'below-no-savings';
  recommendedLabel:    string;

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

const STABILITY_LABELS: Record<string, string> = {
  stable:   'Stable',
  moderate: 'Moderate',
  variable: 'Variable',
};

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildEmergencyFundReportData(
  input: EmergencyFundAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const { region } = input;
  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `EFD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  const readinessAccent: 'teal' | 'amber' | 'red' =
    input.readinessStatus === 'Healthy' ? 'teal' : input.readinessStatus === 'Watch' ? 'amber' : 'red';

  const progressAccent: 'teal' | 'amber' | 'red' =
    input.tpBadge === 'On Track' ? 'teal' : input.tpBadge === 'Close' ? 'amber' : 'red';

  const statusType: 'success' | 'warning' | 'danger' =
    input.leverState === 'at-target' ? 'success' :
    input.leverState === 'below-saving' ? 'warning' : 'danger';

  const statusLabel =
    input.leverState === 'at-target'     ? 'Goal Achieved' :
    input.tpBadge === 'Close'            ? 'Almost There'  : 'Building Fund';

  const fmtMonths = (m: number) => {
    if (!m || m <= 0) return '0 mo';
    const c = Math.max(1, Math.ceil(m));
    if (c < 12) return `${c} mo`;
    const yr = Math.floor(c / 12);
    const mo = c % 12;
    return mo === 0 ? `${yr} yr` : `${yr} yr ${mo} mo`;
  };

  // Composition bar: current savings vs remaining gap (total = target)
  const target   = Math.max(input.targetAmount, 1);
  const savedPct = Math.min(1, Math.max(0, input.currentSavings / target));
  const gapPct   = Math.max(0, 1 - savedPct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const atTarget = input.leverState === 'at-target';

  const p1 = atTarget
    ? `Your emergency fund of ${fmt(input.currentSavings)} meets or exceeds your ${input.targetMonths}-month target of ${fmt(input.targetAmount)}, based on ${fmt(input.monthlyExpenses)}/month in essential expenses. Current coverage: ${input.currentCoverageMonths.toFixed(1)} months. Emergency Readiness Score: ${input.readinessScore}/100 (${input.readinessLabel}).`
    : `Based on ${fmt(input.monthlyExpenses)}/month in essential expenses and a ${input.targetMonths}-month target, your emergency fund goal is ${fmt(input.targetAmount)}. Current savings of ${fmt(input.currentSavings)} covers ${input.currentCoverageMonths.toFixed(1)} months (${input.targetProgress.toFixed(0)}% of target). Gap remaining: ${fmt(input.gap)}. Emergency Readiness Score: ${input.readinessScore}/100 (${input.readinessLabel}).`;

  const timeContext = !atTarget && input.monthsToTarget != null && input.monthlyContribution > 0
    ? `At ${fmtx(input.monthlyContribution)}/month, you reach your target in approximately ${fmtMonths(input.monthsToTarget)}.`
    : !atTarget && input.monthlyContribution <= 0
    ? `No monthly contribution is set. To build the fund in 12 months, approximately ${fmtx(input.suggestedMonthly)}/month would be needed.`
    : '';

  const p2 = `${input.stability === 'variable' ? 'With variable income stability, a 9-12 month fund is generally recommended to cover gaps in irregular income streams.' : input.stability === 'stable' ? 'With stable income, a 3-4 month fund is a common minimum target.' : 'With moderate income stability, a 4-6 month fund provides a reasonable buffer.'} Recommended coverage for your income profile: ${input.recommendedLabel}. ${timeContext}`;

  const p3 = `Your emergency fund is the financial safety net that prevents debt accumulation during job loss, medical events, or major unexpected expenses. ${atTarget ? 'With your current fund meeting the target, focus on keeping it accessible in a liquid account and reviewing the target as your expenses change.' : 'Prioritize building this fund before increasing investment contributions, as emergency debt (typically at high rates) can erode long-term financial progress faster than the opportunity cost of lower investment returns.'} This calculator does not model interest earned on savings -- adding a high-yield savings account or HYSA to your fund can accelerate the timeline.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers = [
    `Monthly expenses of ${fmt(input.monthlyExpenses)} directly set the fund target (${input.targetMonths} months = ${fmt(input.targetAmount)}). Reducing essential expenses lowers the required fund and reduces the time to reach it.`,
    atTarget
      ? `Your fund already exceeds your ${fmt(input.targetAmount)} target by ${fmt(input.surplus)}. Maintaining your current contribution keeps your cushion ahead of rising expenses.`
      : input.monthlyContribution > 0
      ? `Monthly contribution of ${fmtx(input.monthlyContribution)}/month closes the ${fmt(input.gap)} gap in approximately ${fmtMonths(input.monthsToTarget ?? 0)}.`
      : `No monthly contribution entered. Setting even ${fmtx(200)}/month would close the ${fmt(input.gap)} gap in approximately ${fmtMonths(input.gap / 200)} months.`,
    `Target coverage of ${input.targetMonths} months (${input.recommendedLabel} recommended for ${STABILITY_LABELS[input.stability] ?? input.stability} income). Increasing the target to 9-12 months is prudent for variable income or single-income households.`,
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Emergency Fund Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/emergency-fund-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'Fund Target',         value: fmt(input.targetAmount) },
        { label: 'Current Savings',     value: fmt(input.currentSavings), accent: 'teal' },
        { label: 'Current Coverage',    value: `${input.currentCoverageMonths.toFixed(1)} mo`, accent: progressAccent },
        { label: atTarget ? 'Surplus' : 'Gap', value: fmt(atTarget ? input.surplus : input.gap), accent: atTarget ? 'teal' : 'amber' },
        { label: 'Readiness Score',     value: `${input.readinessScore}/100`, sub: input.readinessLabel, accent: readinessAccent },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Emergency Fund Progress',
      segments: [
        { label: 'Current Savings', valueFormatted: fmt(input.currentSavings), pct: savedPct, color: 'teal'  },
        { label: atTarget ? 'Surplus' : 'Remaining Gap', valueFormatted: fmt(atTarget ? input.surplus : input.gap), pct: gapPct, color: atTarget ? 'slate' : 'amber' },
      ],
      totalFormatted: fmt(input.targetAmount),
    },

    insightBlock: {
      title:      'AI-Assisted Emergency Fund Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Monthly Essential Expenses', value: fmt(input.monthlyExpenses) },
        { label: 'Current Emergency Savings',  value: fmt(input.currentSavings) },
        { label: 'Monthly Contribution',       value: fmtx(input.monthlyContribution) },
        { label: 'Income Stability',           value: STABILITY_LABELS[input.stability] ?? input.stability },
        { label: 'Target Coverage',            value: `${input.targetMonths} months` },
        { label: 'Region',                     value: regionLabel },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: 'Fund Target',           value: fmt(input.targetAmount) },
        { label: 'Current Coverage',      value: `${input.currentCoverageMonths.toFixed(1)} months`, accent: progressAccent },
        { label: 'Target Progress',       value: `${input.targetProgress.toFixed(0)}%`, accent: progressAccent },
        { label: atTarget ? 'Surplus' : 'Remaining Gap', value: fmt(atTarget ? input.surplus : input.gap), accent: atTarget ? 'teal' : 'amber' },
        { label: 'Months to Target',      value: input.monthsToTarget != null ? fmtMonths(input.monthsToTarget) : (input.leverState === 'at-target' ? 'Goal achieved' : 'No contribution set') },
        { label: 'Suggested Monthly',     value: input.monthlyContribution > 0 ? fmtx(input.monthlyContribution) : fmtx(input.suggestedMonthly) },
        { label: 'Recommended Coverage',  value: input.recommendedLabel },
        { label: 'Readiness Score',       value: `${input.readinessScore}/100 (${input.readinessLabel})`, accent: readinessAccent },
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        `Fund target = target months x monthly essential expenses. Current coverage months = current savings / monthly expenses.`,
        `Months to target = gap / monthly contribution (linear, no interest modeled). Suggested monthly = gap / 12 when contribution = 0.`,
        `Readiness Score (0-100) based on target progress percentage. Income stability drives the recommended coverage range (Stable: 3-4 mo; Moderate: 4-6 mo; Variable: 9-12 mo).`,
      ],
      notModeled: [
        'Interest earned on savings (a high-yield savings account reduces time to target).',
        'Variable or irregular contribution amounts.',
        'Inflation on expenses or target over time.',
        'Simultaneous debt repayment trade-off analysis.',
        'Insurance coverage that may reduce the required fund size.',
        'Joint vs individual household income considerations.',
      ],
    },

    disclaimer: 'This report is for educational and illustrative purposes only. The emergency fund target and timeline are estimates based on the inputs provided and do not account for interest earned, unexpected expense changes, or individual financial circumstances. This does not constitute financial, insurance, or debt counselling advice. Consult a qualified financial advisor to assess your specific emergency preparedness needs.',
  };

  const filename = `fincalc-smart-emergency-fund-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildEmergencyFundPDF(input: EmergencyFundAdapterInput): Promise<void> {
  const { data, filename } = buildEmergencyFundReportData(input);
  await generatePDF(data, filename);
}
