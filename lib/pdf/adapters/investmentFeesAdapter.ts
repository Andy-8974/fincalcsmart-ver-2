import type { ReportData, StatusType } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvestmentFeesAdapterInput {
  // Inputs
  initialInvestment: number;
  monthlyContribution: number;
  annualReturn: number;    // gross %
  currentFee: number;      // annual % fee
  compFee: number;         // comparison fee %
  yearsInvested: number;

  // Computed results (passed through from live UI — do not recompute)
  grossFV: number;
  netFV: number;
  cmpFV: number;
  totalContributions: number;
  lostToFees: number;
  netReturns: number;
  feeSavings: number;
  monthlyEquivSaving: number;
  growthEfficiency: number;  // %

  // Fee Drag Score
  feeDragScore: number;      // 0–100
  scoreLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  statusLabel: 'Healthy' | 'Watch' | 'Caution';
  isLowCost: boolean;        // currentFee <= compFee
  feeExceedsReturn: boolean;

  // Time horizon impact
  lostAt10: number;
  lostAt20: number;
  lostAt30: number;

  // Contribution equivalent
  extraMonthlyToMatchGross: number;

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

function makePdfFmtx(region: 'ca' | 'us'): (n: number) => string {
  const currency = region === 'ca' ? 'CAD' : 'USD';
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return (n: number) => nf.format(n);
}

// ─── Core report data builder ─────────────────────────────────────────────────

export function buildInvestmentFeesReportData(
  input: InvestmentFeesAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {

  const fmt  = makePdfFmt(input.region);
  const fmtx = makePdfFmtx(input.region);

  const regionLabel   = input.region === 'ca' ? 'Canada' : 'United States';
  const currencyLabel = input.region === 'ca' ? 'CAD (CA$)' : 'USD ($)';
  const dateFile      = now.toISOString().slice(0, 10);
  const dateDisplay   = now.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const regionSlug = input.region.toUpperCase();
  const scenarioId = `FEE-${regionSlug}-${dateFile.replace(/-/g, '')}`;
  const timeLabel  = `${input.yearsInvested} ${input.yearsInvested === 1 ? 'year' : 'years'}`;

  const statusType: StatusType =
    input.statusLabel === 'Healthy' ? 'success'
    : input.statusLabel === 'Watch' ? 'warning'
    : 'danger';

  // Composition percentages
  const contribPct  = input.grossFV > 0 ? input.totalContributions / input.grossFV : 0;
  const netRetPct   = input.grossFV > 0 ? input.netReturns         / input.grossFV : 0;
  const lostPct     = input.grossFV > 0 ? input.lostToFees         / input.grossFV : 0;

  const contribShare = Math.round(contribPct * 100);
  const netRetShare  = Math.round(netRetPct  * 100);
  const lostShare    = 100 - contribShare - netRetShare;

  // ── Insight paragraphs ────────────────────────────────────────────────────

  const p1 = input.feeExceedsReturn
    ? `This scenario shows a ${input.currentFee}% annual fee applied to a portfolio with an assumed gross return of ${input.annualReturn}%, resulting in a net annual return below zero. After ${timeLabel}, the portfolio after fees is estimated at ${fmt(input.netFV)}, while the gross portfolio (before fees) would have been ${fmt(input.grossFV)}. Fee drag in this scenario is extreme — the annual fee exceeds the assumed gross return.`
    : `This scenario applies a ${input.currentFee}% annual fee to a portfolio with an assumed gross return of ${input.annualReturn}% over ${timeLabel}. The estimated portfolio value after fees is ${fmt(input.netFV)}, compared to ${fmt(input.grossFV)} before any fees. Total fees consumed over this period amount to ${fmt(input.lostToFees)} — ${lostShare}% of the gross portfolio value.`;

  const p2 = input.isLowCost
    ? `Your current fee of ${input.currentFee}% is at or below the comparison rate of ${input.compFee}%, placing this portfolio in a low-cost position. Growth efficiency stands at ${input.growthEfficiency.toFixed(1)}% — meaning ${input.growthEfficiency.toFixed(1)}% of potential gross returns are retained after fees. Contributions of ${fmt(input.totalContributions)} make up ${contribShare}% of the gross portfolio value.`
    : `Switching from the current ${input.currentFee}% fee to the comparison rate of ${input.compFee}% would add an estimated ${fmt(input.feeSavings)} to the portfolio over ${timeLabel}, equivalent to ${fmtx(input.monthlyEquivSaving)}/month in additional contribution value. Growth efficiency at the current fee is ${input.growthEfficiency.toFixed(1)}%, meaning ${100 - Math.round(input.growthEfficiency)}% of potential gross returns are lost to fees.`;

  const p3 = input.extraMonthlyToMatchGross > 0.5
    ? `To offset the full fee drag of the ${input.currentFee}% annual fee over ${timeLabel}, an estimated additional ${fmtx(input.extraMonthlyToMatchGross)}/month in contributions would be needed to match the gross (no-fee) portfolio value. Fee drag compounds with time — at 10 years, fees consume ${fmt(input.lostAt10)}; at 20 years, ${fmt(input.lostAt20)}; at 30 years, ${fmt(input.lostAt30)}.`
    : `At this fee level and time horizon, fee drag is relatively contained. For reference, at ${input.currentFee}%: fees consume ${fmt(input.lostAt10)} by year 10, ${fmt(input.lostAt20)} by year 20, and ${fmt(input.lostAt30)} by year 30. The longer the investment horizon, the larger the total fee impact due to compounding.`;

  // ── Key drivers ───────────────────────────────────────────────────────────

  const drivers: string[] = [];

  const feeBenchmark =
    input.currentFee < 0.20 ? 'very low — in the range of passive index ETFs'
    : input.currentFee < 0.75 ? 'below average — lower than most actively managed funds'
    : input.currentFee < 1.50 ? 'in the typical range for actively managed mutual funds'
    : 'high by market standards';

  drivers.push(
    `Fee Drag Score: ${input.feeDragScore}/100 (${input.scoreLabel}). A ${input.currentFee}% annual fee is ${feeBenchmark}. Over ${timeLabel}, fee drag reduces the portfolio by ${fmt(input.lostToFees)} relative to a zero-fee scenario. The Compounding Effect of fees accelerates with time — each additional year amplifies the total cost.`
  );

  if (input.lostAt10 > 0 || input.lostAt20 > 0 || input.lostAt30 > 0) {
    const parts: string[] = [];
    if (input.lostAt10 > 0) parts.push(`${fmt(input.lostAt10)} by year 10`);
    if (input.lostAt20 > 0) parts.push(`${fmt(input.lostAt20)} by year 20`);
    if (input.lostAt30 > 0) parts.push(`${fmt(input.lostAt30)} by year 30`);
    drivers.push(
      `Time horizon impact at the current ${input.currentFee}% fee: fees consume ${parts.join(', ')}. Fee drag compounds — the longer the horizon, the larger the share of returns absorbed by fees.`
    );
  }

  if (!input.isLowCost && input.feeSavings > 0) {
    drivers.push(
      `Comparison opportunity: switching to the ${input.compFee}% comparison fee would add an estimated ${fmt(input.feeSavings)} to the portfolio after ${timeLabel}. Growth efficiency would improve from ${input.growthEfficiency.toFixed(1)}% to ${Math.min(100, (input.cmpFV / input.grossFV * 100)).toFixed(1)}%.`
    );
  } else if (input.extraMonthlyToMatchGross > 0.5) {
    drivers.push(
      `Contribution equivalent: to fully offset fee drag at the ${input.currentFee}% level over ${timeLabel}, an estimated ${fmtx(input.extraMonthlyToMatchGross)}/month in additional contributions would be required. Reducing fees achieves the same result with no additional out-of-pocket cost.`
    );
  }

  // ── Assemble ReportData ───────────────────────────────────────────────────

  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Investment Fees Calculator',
      reportSubtitle: 'Portfolio Fee Impact Analysis',
      generatedAt:    dateDisplay,
      scenarioId,
      region:         regionLabel,
      currency:       currencyLabel,
      sourceUrl:      'fincalcsmart.com/investment-fees-calculator',
    },

    executiveSummary: {
      metrics: [
        {
          label:  'Portfolio After Fees',
          value:  fmt(input.netFV),
          accent: 'teal',
          sub:    `${timeLabel} · ${input.currentFee}% fee`,
        },
        {
          label:  'Total Lost to Fees',
          value:  fmt(input.lostToFees),
          accent: 'amber',
          sub:    `${lostShare}% of gross value`,
        },
        {
          label: `Value at ${input.compFee}% Fee`,
          value: fmt(input.cmpFV),
          sub:   input.isLowCost ? 'at or above current' : 'comparison scenario',
        },
        {
          label: 'Fee Drag Score',
          value: `${input.feeDragScore}/100`,
          sub:   input.scoreLabel,
        },
      ],
      statusLabel: input.statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Contributions vs. Net Returns vs. Lost to Fees (of gross portfolio)',
      segments: [
        {
          label:          'Contributions',
          valueFormatted: fmt(input.totalContributions),
          pct:            contribPct,
          color:          'teal',
        },
        {
          label:          'Net Returns',
          valueFormatted: fmt(input.netReturns),
          pct:            netRetPct,
          color:          'slate',
        },
        {
          label:          'Lost to Fees',
          valueFormatted: fmt(input.lostToFees),
          pct:            lostPct,
          color:          'amber',
        },
      ],
      totalFormatted: fmt(input.grossFV),
    },

    insightBlock: {
      title:      'AI-Assisted Fee Impact Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Initial Investment',      value: fmt(input.initialInvestment) },
        { label: 'Monthly Contribution',    value: fmtx(input.monthlyContribution) + '/month' },
        { label: 'Expected Annual Return',  value: `${input.annualReturn}% (gross, before fees)` },
        { label: 'Annual Fee (Current)',    value: `${input.currentFee}%` },
        { label: 'Annual Fee (Comparison)', value: `${input.compFee}%` },
        { label: 'Investment Horizon',      value: timeLabel },
      ],
    },

    results: {
      title: 'Scenario Breakdown',
      rows: [
        { label: 'Total Contributions',          value: fmt(input.totalContributions) },
        { label: 'Gross Portfolio Value',        value: fmt(input.grossFV) },
        { label: 'Portfolio After Fees',         value: fmt(input.netFV), accent: 'teal' },
        { label: 'Net Returns (after fees)',     value: fmt(input.netReturns) },
        { label: 'Total Lost to Fees',           value: fmt(input.lostToFees), accent: 'amber' },
        { label: `Value at ${input.compFee}% Fee`, value: fmt(input.cmpFV) },
        ...(input.isLowCost ? [] : [
          { label: 'Potential Fee Savings',      value: fmt(input.feeSavings) },
          { label: 'Monthly Equiv. Saving',      value: fmtx(input.monthlyEquivSaving) + '/month' },
        ]),
        { label: 'Growth Efficiency',            value: `${input.growthEfficiency.toFixed(1)}%` },
        { label: 'Fee Drag Score',               value: `${input.feeDragScore}/100 (${input.scoreLabel})` },
      ],
    },

    keyDrivers: drivers.slice(0, 3),

    methodology: {
      whatItDoes: [
        'Calculates gross future value using the standard future-value annuity formula with the full annual return rate applied to the initial investment and monthly contributions.',
        'Derives the net (after-fee) future value by subtracting the annual fee from the gross return rate, then applying the same annuity formula. The difference between gross and net future value is the total fee drag.',
        'Computes the Fee Drag Score from the percentage of gross future value consumed by fees — a score of 100 means zero fee impact; lower scores reflect higher fee drag relative to gross growth.',
        'Calculates time-horizon milestones at 10, 20, and 30 years to illustrate how fee drag compounds non-linearly — the share of returns lost to fees increases with each additional year.',
      ],
      notModeled: [
        'Taxes on investment gains or distributions.',
        'Inflation — all projected values are nominal and not adjusted for purchasing power changes.',
        'Variable fees, performance-based fees, redemption charges, or other transaction costs beyond the stated annual percentage.',
      ],
    },

    disclaimer:
      'This report is for illustrative and educational purposes only. Projected future values are estimates based on a fixed gross annual return rate and a constant annual fee applied over the stated investment horizon. Actual investment returns and fees vary — past performance does not predict future results. This model does not account for taxes, inflation, market volatility, changes in contribution amounts, or fund-specific fee structures. The Fee Drag Score reflects the share of gross future value consumed by fees under the stated assumptions and does not constitute a guarantee or prediction of investment performance. Results do not constitute financial, investment, tax, or legal advice. Consult a qualified financial advisor before making any investment decisions.',
  };

  const regionPart = input.region === 'ca' ? 'ca' : 'us';
  const filename = `fincalc-smart-investment-fees-report-${regionPart}-${dateFile}.pdf`;

  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildInvestmentFeesPDF(
  input: InvestmentFeesAdapterInput,
): Promise<void> {
  const { data, filename } = buildInvestmentFeesReportData(input);
  await generatePDF(data, filename);
}
