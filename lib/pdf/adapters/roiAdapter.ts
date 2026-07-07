import type { ReportData, StatusType } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ROIAdapterInput {
  // Inputs
  initialCost: number;
  finalValue: number;
  additionalCosts: number;
  years: number;          // 0 if not entered
  targetROIPct: number;   // 0 if not entered

  // Computed results (passed through from live UI — do not recompute)
  totalCost: number;
  netProfit: number;      // may be negative (loss)
  roiPct: number;         // may be negative
  isProfit: boolean;
  isLoss: boolean;
  annualizedROI: number | null;

  // Target tracking
  hasTarget: boolean;
  targetFinalValue: number;
  targetGap: number;
  targetProgress: number; // 0–200
  surplus: number;
  additionalValueNeeded: number;
  breakEvenGap: number;   // > 0 when isLoss

  // Health Score
  healthScore: number;    // 0–100
  healthLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  healthStatus: 'Healthy' | 'Watch' | 'Caution';

  region: 'ca' | 'us';
}

// ─── Internal formatters ──────────────────────────────────────────────────────

function makePdfFmt(region: 'ca' | 'us'): (n: number) => string {
  const currency = region === 'ca' ? 'CAD' : 'USD';
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  return (n: number) => nf.format(n);
}

// ─── Core report data builder ─────────────────────────────────────────────────

export function buildROIReportData(
  input: ROIAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {

  const fmt = makePdfFmt(input.region);

  const regionLabel   = input.region === 'ca' ? 'Canada' : 'United States';
  const currencyLabel = input.region === 'ca' ? 'CAD (CA$)' : 'USD ($)';
  const dateFile      = now.toISOString().slice(0, 10);
  const dateDisplay   = now.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const regionSlug = input.region.toUpperCase();
  const scenarioId = `ROI-${regionSlug}-${dateFile.replace(/-/g, '')}`;

  const statusType: StatusType =
    input.healthStatus === 'Healthy' ? 'success'
    : input.healthStatus === 'Watch' ? 'warning'
    : 'danger';

  const holdLabel = input.years > 0
    ? `${input.years} ${input.years === 1 ? 'year' : 'years'}`
    : null;

  // Composition percentages (always relative to finalValue as denominator)
  // For profit: initial cost + additional costs + net profit = final value
  // For loss: recovered value + net loss = total cost
  const isLoss = input.isLoss;
  const denominator = isLoss ? input.totalCost : input.finalValue;

  const initPct    = denominator > 0 ? input.initialCost       / denominator : 0;
  const addPct     = denominator > 0 ? input.additionalCosts   / denominator : 0;
  const profitPct  = !isLoss && denominator > 0 ? Math.max(0, input.netProfit) / denominator : 0;
  const lossPct    = isLoss  && denominator > 0 ? Math.abs(input.netProfit)    / denominator : 0;

  // ── Insight paragraphs ────────────────────────────────────────────────────

  const roiSign = input.roiPct >= 0 ? '+' : '';
  const annLine = input.annualizedROI !== null && holdLabel
    ? ` Annualized over the ${holdLabel} holding period, this equates to ${input.annualizedROI >= 0 ? '+' : ''}${input.annualizedROI.toFixed(1)}% per year.`
    : '';

  const p1 = isLoss
    ? `This investment returned a final value of ${fmt(input.finalValue)} against a total cost of ${fmt(input.totalCost)}, resulting in a net loss of ${fmt(Math.abs(input.netProfit))} and an ROI of ${input.roiPct.toFixed(1)}%.${annLine} To recover all costs, the final value would need to increase by an additional ${fmt(input.breakEvenGap)}.`
    : `This investment returned a final value of ${fmt(input.finalValue)} against a total cost of ${fmt(input.totalCost)}, producing a net profit of ${fmt(input.netProfit)} and an ROI of ${roiSign}${input.roiPct.toFixed(1)}%.${annLine} The final value exceeds the break-even point of ${fmt(input.totalCost)} by ${fmt(input.netProfit)}.`;

  let p2: string;
  if (input.hasTarget) {
    if (!isLoss && input.targetGap >= 0) {
      p2 = `This investment exceeds the target ROI of ${input.targetROIPct}% by a surplus of ${fmt(input.surplus)}. The target final value was ${fmt(input.targetFinalValue)} and the actual final value of ${fmt(input.finalValue)} is ${Math.round(input.targetProgress)}% of the target.${input.additionalCosts > 0 ? ` Additional costs of ${fmt(input.additionalCosts)} are included in the total cost base of ${fmt(input.totalCost)}.` : ''}`;
    } else {
      p2 = `To reach the target ROI of ${input.targetROIPct}%, the final value would need to reach ${fmt(input.targetFinalValue)} — an additional ${fmt(Math.abs(input.targetGap))} above the current final value of ${fmt(input.finalValue)}. Target progress currently stands at ${Math.round(input.targetProgress)}% of goal.${input.additionalCosts > 0 ? ` Additional costs of ${fmt(input.additionalCosts)} are included in the total cost base.` : ''}`;
    }
  } else {
    p2 = isLoss
      ? `The break-even point is ${fmt(input.totalCost)} — the value at which total costs are exactly recovered. The current final value of ${fmt(input.finalValue)} is ${fmt(input.breakEvenGap)} short of this threshold.${input.additionalCosts > 0 ? ` Additional costs of ${fmt(input.additionalCosts)} are included in the cost base.` : ''} Adding a Target ROI % to the calculator enables personalized goal tracking.`
      : `The break-even point is ${fmt(input.totalCost)} — the value at which total costs are exactly recovered. The current final value of ${fmt(input.finalValue)} exceeds this by ${fmt(input.netProfit)}, representing a ${input.roiPct.toFixed(1)}% margin above cost.${input.additionalCosts > 0 ? ` Additional costs of ${fmt(input.additionalCosts)} are included in the cost base.` : ''}`;
  }

  const p3 = input.annualizedROI !== null && holdLabel
    ? `Over the ${holdLabel} holding period, the total ROI of ${roiSign}${input.roiPct.toFixed(1)}% equates to an annualized return of ${input.annualizedROI >= 0 ? '+' : ''}${input.annualizedROI.toFixed(1)}% per year. Annualizing enables comparison across investments with different holding periods on a consistent basis. These figures are pre-tax and do not account for opportunity cost, inflation, or risk.`
    : `Enter a holding period to see the annualized ROI — this enables direct comparison with other investments held for different periods. These figures are pre-tax and do not account for opportunity cost, inflation, or risk-adjusted returns.`;

  // ── Key drivers ───────────────────────────────────────────────────────────

  const drivers: string[] = [];

  if (isLoss) {
    drivers.push(
      `ROI Health Score: ${input.healthScore}/100 (${input.healthLabel}). This investment returned ${input.roiPct.toFixed(1)}% — a loss of ${fmt(Math.abs(input.netProfit))} relative to total cost. Break-even requires the final value to reach ${fmt(input.totalCost)}, a gap of ${fmt(input.breakEvenGap)}.`
    );
  } else if (input.roiPct >= 30) {
    drivers.push(
      `ROI Health Score: ${input.healthScore}/100 (${input.healthLabel}). A return of ${roiSign}${input.roiPct.toFixed(1)}% represents a strong result. The final value of ${fmt(input.finalValue)} is ${fmt(input.netProfit)} above the total cost base of ${fmt(input.totalCost)}.`
    );
  } else {
    drivers.push(
      `ROI Health Score: ${input.healthScore}/100 (${input.healthLabel}). A return of ${roiSign}${input.roiPct.toFixed(1)}% on a total cost of ${fmt(input.totalCost)} produces a net profit of ${fmt(input.netProfit)}. The break-even threshold is ${fmt(input.totalCost)}.`
    );
  }

  if (input.hasTarget) {
    if (input.targetGap >= 0) {
      drivers.push(
        `Target tracking: the investment exceeds the ${input.targetROIPct}% ROI target by a surplus of ${fmt(input.surplus)}. Target final value was ${fmt(input.targetFinalValue)}; actual final value is ${fmt(input.finalValue)} — ${Math.round(input.targetProgress)}% of the target milestone.`
      );
    } else {
      drivers.push(
        `Target tracking: current final value of ${fmt(input.finalValue)} is ${fmt(input.additionalValueNeeded)} short of the ${input.targetROIPct}% ROI target (${fmt(input.targetFinalValue)}). Target progress is ${Math.round(input.targetProgress)}%.`
      );
    }
  }

  if (input.annualizedROI !== null && holdLabel) {
    drivers.push(
      `Annualized return: the total ROI of ${roiSign}${input.roiPct.toFixed(1)}% over ${holdLabel} equates to ${input.annualizedROI >= 0 ? '+' : ''}${input.annualizedROI.toFixed(1)}% per year compounded. This enables direct comparison with other investments held for different periods.`
    );
  } else if (input.additionalCosts > 0) {
    drivers.push(
      `Cost structure: initial cost of ${fmt(input.initialCost)} plus additional costs of ${fmt(input.additionalCosts)} produce a total cost base of ${fmt(input.totalCost)}. Additional costs are often the most controllable variable in improving net ROI.`
    );
  }

  // ── Assemble ReportData ───────────────────────────────────────────────────

  // Build composition bar segments
  const compSegments: ReportData['compositionBar']['segments'] = [];
  if (!isLoss) {
    if (initPct > 0) {
      compSegments.push({ label: 'Initial Cost', valueFormatted: fmt(input.initialCost), pct: initPct, color: 'teal' });
    }
    if (input.additionalCosts > 0 && addPct > 0) {
      compSegments.push({ label: 'Additional Costs', valueFormatted: fmt(input.additionalCosts), pct: addPct, color: 'slate' });
    }
    if (profitPct > 0) {
      compSegments.push({ label: 'Net Profit', valueFormatted: fmt(input.netProfit), pct: profitPct, color: 'amber' });
    }
  } else {
    if (input.finalValue > 0) {
      compSegments.push({ label: 'Recovered Value', valueFormatted: fmt(input.finalValue), pct: 1 - lossPct, color: 'slate' });
    }
    compSegments.push({ label: 'Net Loss', valueFormatted: fmt(Math.abs(input.netProfit)), pct: lossPct, color: 'amber' });
  }

  // Ensure segments sum to 1 (floating-point guard)
  if (compSegments.length > 0) {
    const sumPct = compSegments.reduce((a, s) => a + s.pct, 0);
    if (sumPct > 0) {
      compSegments[compSegments.length - 1].pct += 1 - sumPct;
    }
  }

  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'ROI Calculator',
      reportSubtitle: 'Return on Investment Analysis',
      generatedAt:    dateDisplay,
      scenarioId,
      region:         regionLabel,
      currency:       currencyLabel,
      sourceUrl:      'fincalcsmart.com/roi-calculator',
    },

    executiveSummary: {
      metrics: [
        {
          label:  'Return on Investment',
          value:  `${roiSign}${input.roiPct.toFixed(1)}%`,
          accent: input.isLoss ? 'amber' : 'teal',
          sub:    isLoss ? 'net loss' : holdLabel ? `${holdLabel} hold` : 'total return',
        },
        {
          label:  isLoss ? 'Net Loss' : 'Net Profit',
          value:  (isLoss ? '-' : '+') + fmt(Math.abs(input.netProfit)),
          accent: isLoss ? 'amber' : 'teal',
          sub:    `vs. ${fmt(input.totalCost)} cost`,
        },
        {
          label: 'Total Cost',
          value: fmt(input.totalCost),
          sub:   input.additionalCosts > 0 ? `incl. ${fmt(input.additionalCosts)} extra` : 'initial cost',
        },
        {
          label: 'ROI Health Score',
          value: `${input.healthScore}/100`,
          sub:   input.healthLabel,
        },
      ],
      statusLabel: input.healthStatus,
      statusType,
    },

    compositionBar: {
      title: isLoss ? 'Cost Recovery vs. Net Loss' : 'Investment Cost vs. Net Profit',
      segments: compSegments.length > 0
        ? compSegments
        : [{ label: 'Total Cost', valueFormatted: fmt(input.totalCost), pct: 1, color: 'slate' }],
      totalFormatted: isLoss ? fmt(input.totalCost) : fmt(input.finalValue),
    },

    insightBlock: {
      title:      'AI-Assisted ROI Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Initial Investment / Cost', value: fmt(input.initialCost) },
        { label: 'Final Value / Revenue',     value: fmt(input.finalValue) },
        ...(input.additionalCosts > 0
          ? [{ label: 'Additional Costs', value: fmt(input.additionalCosts) }]
          : []),
        ...(holdLabel
          ? [{ label: 'Holding Period', value: holdLabel }]
          : []),
        ...(input.hasTarget
          ? [{ label: 'Target ROI', value: `${input.targetROIPct}%` }]
          : []),
      ],
    },

    results: {
      title: 'Scenario Breakdown',
      rows: [
        { label: 'Initial Cost',     value: fmt(input.initialCost) },
        ...(input.additionalCosts > 0
          ? [{ label: 'Additional Costs', value: fmt(input.additionalCosts) }]
          : []),
        { label: 'Total Cost',       value: fmt(input.totalCost) },
        { label: 'Final Value',      value: fmt(input.finalValue), accent: 'teal' },
        {
          label: isLoss ? 'Net Loss' : 'Net Profit',
          value: (isLoss ? '-' : '+') + fmt(Math.abs(input.netProfit)),
          accent: isLoss ? 'amber' : 'teal',
        },
        { label: 'ROI',              value: `${roiSign}${input.roiPct.toFixed(1)}%`, accent: isLoss ? 'amber' : 'teal' },
        ...(input.annualizedROI !== null
          ? [{ label: 'Annualized ROI', value: `${input.annualizedROI >= 0 ? '+' : ''}${input.annualizedROI.toFixed(1)}% / year` }]
          : []),
        ...(input.hasTarget
          ? [
              { label: 'Target ROI',          value: `${input.targetROIPct}%` },
              { label: 'Target Final Value',   value: fmt(input.targetFinalValue) },
              { label: 'Target Progress',      value: `${Math.round(input.targetProgress)}%` },
              input.targetGap >= 0
                ? { label: 'Target Surplus',  value: `+${fmt(input.surplus)}`, accent: 'teal' as const }
                : { label: 'Target Gap',      value: fmt(input.additionalValueNeeded), accent: 'amber' as const },
            ]
          : []),
        { label: 'ROI Health Score', value: `${input.healthScore}/100 (${input.healthLabel})` },
      ],
    },

    keyDrivers: drivers.slice(0, 3),

    methodology: {
      whatItDoes: [
        'Calculates ROI as (Net Profit / Total Cost) x 100, where Net Profit = Final Value minus Total Cost (initial cost plus any additional costs). A positive result indicates a gain; a negative result indicates a loss.',
        'Computes annualized ROI using the compound annual growth rate formula: (1 + ROI/100)^(1/years) - 1. This normalizes returns across investments held for different periods.',
        'Calculates the ROI Health Score from the raw ROI percentage using a linear scale centered at break-even (0% ROI = score 50); strong positive returns score toward 100, losses score toward 0.',
        'Target tracking: if a Target ROI % is entered, the calculator computes the target final value and the gap or surplus versus the actual final value, expressed as a percentage of progress toward the goal.',
      ],
      notModeled: [
        'Taxes on gains, capital gains tax rates, tax-loss harvesting, or jurisdiction-specific tax treatment.',
        'Risk-adjusted returns, volatility, or opportunity cost relative to alternative investments.',
        'Inflation — all values are nominal and not adjusted for changes in purchasing power.',
      ],
    },

    disclaimer:
      'This report is for illustrative and informational purposes only. Results are calculated from the values entered and represent a simplified return-on-investment analysis. Actual investment outcomes depend on taxes, fees, financing costs, inflation, market conditions, risk, and other factors not modeled here. The ROI Health Score is a relative indicator based on the entered figures and does not constitute a rating, guarantee, or prediction of investment performance. Target ROI projections are illustrative only. Results do not constitute financial, investment, tax, legal, or business advice. Consult a qualified professional before making financial or investment decisions.',
  };

  const regionPart = input.region === 'ca' ? 'ca' : 'us';
  const filename = `fincalc-smart-roi-report-${regionPart}-${dateFile}.pdf`;

  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildROIPDF(
  input: ROIAdapterInput,
): Promise<void> {
  const { data, filename } = buildROIReportData(input);
  await generatePDF(data, filename);
}
