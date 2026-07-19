import type { ReportData, StatusType } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CIFreq = 'annually' | 'semi' | 'monthly' | 'daily';

/**
 * Pre-computed inputs + outputs from the Compound Interest calculator UI.
 * No formula reproduction — all values passed through from live calculator state.
 * Reusable family interface for Investment Growth calculators.
 */
export interface InvestmentGrowthAdapterInput {
  // Calculator inputs (display only)
  initialInvestment: number;
  monthlyContribution: number;
  annualRate: number;           // nominal %
  freq: CIFreq;
  yearsInvested: number;
  hasTarget: boolean;
  targetAmount: number;         // 0 if not entered
  hasAge: boolean;
  startingAge: number;          // 0 if not entered

  // Computed results (from live calculator — do not recompute in adapter)
  finalBalance: number;
  totalContributions: number;
  totalInterest: number;        // investment growth = finalBalance − totalContributions
  interestPct: number;          // totalInterest / finalBalance × 100

  // Compounding Power Score (from UI)
  powerScore: number;           // 0–100
  powerLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  powerStatus: 'Healthy' | 'Watch' | 'Caution';

  // Target / smart lever state (from UI)
  leverState: 'behind' | 'on-track' | 'no-target';
  targetProgress: number;       // 0–200
  targetGap: number;            // > 0 when behind target
  surplus: number;
  extraMonthlyNeeded: number;

  // Contribution boost preview (+$100/mo)
  boost100: number;
  boost100FV: number;

  // Time horizon milestones (from UI insight data)
  balAt10: number;
  balAt20: number;
  balAt30: number;

  // Frequency comparison (from UI insight data)
  freqGainVsMonthly: number;    // > 0 when annually/semi — benefit from switching to monthly
  freqGainVsAnnual: number;     // > 0 when monthly/daily — advantage over annual compounding

  // Region
  region: 'ca' | 'us';
}

// ─── Internal formatters (en-US locale ensures CA$ not local $) ──────────────

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

// ─── Label helpers ────────────────────────────────────────────────────────────

function freqDisplayLabel(freq: CIFreq): string {
  if (freq === 'annually') return 'Annually (1×/year)';
  if (freq === 'semi')     return 'Semi-Annually (2×/year)';
  if (freq === 'daily')    return 'Daily (365×/year)';
  return 'Monthly (12×/year)';
}

function freqShortLabel(freq: CIFreq): string {
  if (freq === 'annually') return 'annual';
  if (freq === 'semi')     return 'semi-annual';
  if (freq === 'daily')    return 'daily';
  return 'monthly';
}

// ─── Core report data builder ─────────────────────────────────────────────────

export function buildInvestmentGrowthReportData(
  input: InvestmentGrowthAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {

  const fmt  = makePdfFmt(input.region);
  const fmtx = makePdfFmtx(input.region);

  const regionLabel    = input.region === 'ca' ? 'Canada' : 'United States';
  const currencyLabel  = input.region === 'ca' ? 'CAD (CA$)' : 'USD ($)';
  const dateFile       = now.toISOString().slice(0, 10);
  const dateDisplay    = now.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const regionSlug = input.region.toUpperCase();
  const scenarioId = `CI-${regionSlug}-${dateFile.replace(/-/g, '')}`;
  const timeLabel  = `${input.yearsInvested} ${input.yearsInvested === 1 ? 'year' : 'years'}`;
  const ageNote    = input.hasAge ? ` by age ${input.startingAge + input.yearsInvested}` : '';

  // Status mapping
  const statusType: StatusType = input.powerStatus === 'Healthy'
    ? 'success' : input.powerStatus === 'Watch' ? 'warning' : 'danger';

  const statusLabel = input.hasTarget && input.leverState === 'on-track'
    ? 'On Track'
    : input.hasTarget && input.leverState === 'behind'
      ? 'Behind Target'
      : input.powerLabel;

  // Composition percentages
  const contribPct = input.finalBalance > 0 ? input.totalContributions / input.finalBalance : 0;
  const growthPct  = input.finalBalance > 0 ? input.totalInterest / input.finalBalance : 0;
  const contribShareDisplay = Math.round(contribPct * 100);
  const growthShareDisplay  = 100 - contribShareDisplay;

  // ── Insight paragraphs ────────────────────────────────────────────────────

  const fLabel = freqShortLabel(input.freq);

  let p1: string;
  if (input.powerStatus === 'Healthy') {
    p1 = `Based on a ${input.annualRate}% assumed annual return with ${fLabel} compounding over ${timeLabel}, this scenario projects an estimated future value of ${fmt(input.finalBalance)}${ageNote}. Investment growth accounts for ${input.interestPct.toFixed(1)}% of the total, reflecting a meaningful compounding effect over the chosen time horizon.`;
  } else if (input.powerStatus === 'Watch') {
    p1 = `Based on a ${input.annualRate}% assumed annual return with ${fLabel} compounding over ${timeLabel}, this scenario projects an estimated future value of ${fmt(input.finalBalance)}${ageNote}. At this stage, contributions of ${fmt(input.totalContributions)} represent the majority of the balance, with investment growth contributing ${input.interestPct.toFixed(1)}%. Longer investment horizons allow compounding to increase its share significantly.`;
  } else {
    p1 = `Based on a ${input.annualRate}% assumed annual return with ${fLabel} compounding over ${timeLabel}, this scenario projects an estimated future value of ${fmt(input.finalBalance)}${ageNote}. The balance is primarily driven by contributions (${fmt(input.totalContributions)}), with investment growth at ${input.interestPct.toFixed(1)}% of the total. A longer horizon or higher contribution amount would increase the compounding effect.`;
  }

  const p2 = `Contributions of ${fmt(input.totalContributions)} represent ${contribShareDisplay}% of the projected balance. Estimated investment growth of ${fmt(input.totalInterest)} accounts for the remaining ${growthShareDisplay}% — assuming the ${input.annualRate}% rate remains constant for the full ${timeLabel}. These projections do not account for taxes, inflation, or investment fees.`;

  let p3: string;
  if (input.leverState === 'behind' && input.hasTarget) {
    const newMonthly = input.monthlyContribution + input.extraMonthlyNeeded;
    p3 = `To reach the ${fmt(input.targetAmount)} target within this time horizon, approximately ${fmtx(input.extraMonthlyNeeded)}/month in additional contributions would be needed, bringing total monthly contributions to ${fmtx(newMonthly)}/month. These estimates are based on the current assumed rate and do not reflect actual market performance.`;
  } else if (input.leverState === 'on-track' && input.hasTarget) {
    p3 = `The projected balance of ${fmt(input.finalBalance)} is on track to exceed the ${fmt(input.targetAmount)} target by ${fmt(input.surplus)}. These projections assume a constant ${input.annualRate}% return and do not reflect actual market performance. Maintaining current contributions supports reaching this goal.`;
  } else {
    p3 = `Adding ${fmt(100)}/month to regular contributions would increase the projected balance by approximately ${fmt(input.boost100)}, reaching ${fmt(input.boost100FV)} after ${timeLabel}. Consistent contributions amplified by compounding time are the primary drivers of long-term investment growth.`;
  }

  // ── Key drivers ───────────────────────────────────────────────────────────

  const drivers: string[] = [];

  // Driver 1: Compounding Power assessment
  if (input.powerStatus === 'Healthy') {
    drivers.push(
      `Compounding Power Score: ${input.powerScore}/100 (${input.powerLabel}). At ${input.interestPct.toFixed(1)}% of the final balance attributed to investment growth, compounding is working effectively over this ${input.yearsInvested}-year horizon. The effect accelerates non-linearly — the final years contribute disproportionately more than the first.`
    );
  } else if (input.powerStatus === 'Watch') {
    drivers.push(
      `Compounding Power Score: ${input.powerScore}/100 (${input.powerLabel}). Investment growth represents ${input.interestPct.toFixed(1)}% of the projected balance — compounding is building but contributions currently dominate. Extending the investment period to 25 or 30 years would significantly increase the compounding share.`
    );
  } else {
    drivers.push(
      `Compounding Power Score: ${input.powerScore}/100 (${input.powerLabel}). At ${input.yearsInvested} years and a ${input.annualRate}% assumed return, investment growth contributes ${input.interestPct.toFixed(1)}% of the projected balance. A 20-year or 30-year horizon at the same rate would produce a substantially higher compounding share.`
    );
  }

  // Driver 2: Time horizon milestones
  const horizonPoints: string[] = [];
  if (input.balAt10 > 0 && input.yearsInvested !== 10) horizonPoints.push(`${fmt(input.balAt10)} at 10 years`);
  if (input.balAt20 > 0 && input.yearsInvested !== 20) horizonPoints.push(`${fmt(input.balAt20)} at 20 years`);
  if (input.balAt30 > 0 && input.yearsInvested !== 30) horizonPoints.push(`${fmt(input.balAt30)} at 30 years`);
  if (horizonPoints.length >= 2) {
    const joined = horizonPoints.slice(0, 2).join(' and ');
    drivers.push(
      `Projected balance milestones at the current rate: ${joined}. The gap between each 10-year interval typically grows larger — a sign that compounding acceleration increases with time.`
    );
  }

  // Driver 3: Frequency or contribution boost
  if (drivers.length < 3 && input.freqGainVsMonthly > 0) {
    drivers.push(
      `Compounding frequency: switching from ${freqDisplayLabel(input.freq).split(' (')[0].toLowerCase()} to monthly compounding would add approximately ${fmt(input.freqGainVsMonthly)} to the projected balance without changing your contribution amount or assumed rate.`
    );
  } else if (drivers.length < 3 && input.boost100 > 0) {
    drivers.push(
      `Contribution potential: adding ${fmt(100)}/month to regular contributions would increase the projected balance by approximately ${fmt(input.boost100)}, reaching ${fmt(input.boost100FV)} after ${timeLabel}. This extra amount benefits from the full remaining compounding period.`
    );
  }

  // ── Assemble ReportData ───────────────────────────────────────────────────

  const data: ReportData = {
    header: {
      brandName:       'FinCalc Smart',
      calculatorName:  'Compound Interest Calculator',
      reportSubtitle:  'Personal Financial Scenario Report',
      generatedAt:     dateDisplay,
      scenarioId,
      region:          regionLabel,
      currency:        currencyLabel,
      sourceUrl:       'fincalcsmart.com/compound-interest-calculator',
    },

    executiveSummary: {
      metrics: [
        {
          label:  'Est. Future Value',
          value:  fmt(input.finalBalance),
          accent: 'teal',
          sub:    `${timeLabel} projection`,
        },
        {
          label: 'Total Contributions',
          value: fmt(input.totalContributions),
        },
        {
          label:  'Est. Investment Growth',
          value:  fmt(input.totalInterest),
          accent: 'teal',
          sub:    `${input.interestPct.toFixed(1)}% of balance`,
        },
        {
          label: 'Compounding Power',
          value: `${input.powerScore}/100`,
          sub:   input.powerLabel,
        },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Contributions vs. Estimated Investment Growth',
      segments: [
        {
          label:          'Contributions',
          valueFormatted: fmt(input.totalContributions),
          pct:            contribPct,
          color:          'slate',
        },
        {
          label:          'Estimated Investment Growth',
          valueFormatted: fmt(input.totalInterest),
          pct:            growthPct,
          color:          'teal',
        },
      ],
      totalFormatted: fmt(input.finalBalance),
    },

    insightBlock: {
      title:      'AI-Assisted Growth Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Initial Investment',        value: fmt(input.initialInvestment) },
        { label: 'Monthly Contribution',      value: fmtx(input.monthlyContribution) + '/month' },
        { label: 'Assumed Annual Return',     value: `${input.annualRate}%` },
        { label: 'Compound Frequency',        value: freqDisplayLabel(input.freq) },
        { label: 'Investment Horizon',        value: timeLabel },
        ...(input.hasTarget
          ? [{ label: 'Investment Target', value: fmt(input.targetAmount) }]
          : []),
        ...(input.hasAge
          ? [{ label: 'Starting Age', value: `${input.startingAge} (age at start)` }]
          : []),
        { label: 'Return Type',               value: 'Nominal (pre-inflation, before fees and taxes)' },
      ],
    },

    results: {
      title: 'Scenario Breakdown',
      rows: [
        { label: 'Initial Investment',            value: fmt(input.initialInvestment) },
        { label: 'Monthly Contribution',          value: fmtx(input.monthlyContribution) + '/month' },
        { label: 'Investment Horizon',            value: timeLabel },
        { label: 'Total Contributions',           value: fmt(input.totalContributions) },
        { label: 'Estimated Investment Growth',   value: fmt(input.totalInterest), accent: 'teal' },
        { label: 'Estimated Future Value',        value: fmt(input.finalBalance), accent: 'teal' },
        { label: 'Contribution Share',            value: `${contribShareDisplay}%` },
        { label: 'Growth Share',                  value: `${growthShareDisplay}%` },
        ...(input.hasTarget
          ? [
              { label: 'Investment Target',       value: fmt(input.targetAmount) },
              input.leverState === 'behind'
                ? { label: 'Target Gap',          value: fmt(input.targetGap), accent: 'amber' as const }
                : { label: 'Target Surplus',      value: `+${fmt(input.surplus)}`, accent: 'teal' as const },
            ]
          : []),
        { label: 'Compounding Power Score',       value: `${input.powerScore}/100 (${input.powerLabel})` },
      ],
    },

    keyDrivers: drivers.slice(0, 3),

    methodology: {
      whatItDoes: [
        'Converts the nominal annual return rate to an Effective Annual Rate (EAR) using the selected compounding frequency, then derives an Effective Monthly Rate (EMR) for consistent period-to-period calculations.',
        'Applies the standard future-value annuity formula to calculate the future value of the initial investment and ongoing monthly contributions at the derived effective monthly rate.',
        'Computes the Compounding Power Score from the percentage of the projected future value attributable to investment growth versus total contributions; a higher score indicates compounding is playing a larger role.',
        'Projects balance milestones at 10, 20, and 30 years using the same rate and contribution inputs to illustrate the non-linear acceleration of compounding over time.',
      ],
      notModeled: [
        'Taxes on investment gains, withholding taxes, or tax wrapper benefits (e.g. TFSA, RRSP, 401(k), ISA).',
        'Investment fees, management expense ratios (MER), fund charges, or advisory costs that would reduce net returns.',
        'Inflation — all projected values are nominal and are not adjusted for changes in purchasing power. A nominal return rate is not the same as a real (inflation-adjusted) return.',
      ],
    },

    disclaimer:
      'This report is for illustrative and educational purposes only. Projected future values are estimates based on a fixed nominal annual return rate, regular monthly contributions, and the selected compounding frequency. Actual investment returns vary and are not guaranteed — past performance does not predict future results. This model does not account for taxes, inflation, investment fees, market volatility, early withdrawals, or changes in contribution amounts over time. The Compounding Power Score reflects the proportion of the projected balance attributable to investment growth under the stated assumptions; it does not represent a guarantee or prediction of investment performance. Results do not constitute financial, investment, tax, or legal advice. Consult a qualified financial advisor before making any investment or savings decisions.',
  };

  const regionPart = input.region === 'ca' ? 'ca' : 'us';
  const filename = `fincalc-smart-compound-interest-report-${regionPart}-${dateFile}.pdf`;

  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildInvestmentGrowthPDF(
  input: InvestmentGrowthAdapterInput,
): Promise<void> {
  const { data, filename } = buildInvestmentGrowthReportData(input);
  await generatePDF(data, filename);
}
