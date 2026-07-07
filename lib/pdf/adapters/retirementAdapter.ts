import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

export interface RetirementAdapterInput {
  currentSavings: number;
  monthlyContribution: number;
  annualRate: number;
  currentAge: number;
  retirementAge: number;
  retirementGoal: number;
  freq: string;
  yearsToRetirement: number;
  projectedSavings: number;
  totalContributions: number;
  investmentGrowth: number;
  hasGoal: boolean;
  goalProgressPct: number;
  gapOrSurplus: number;       // positive = gap (behind), negative = surplus
  requiredMonthly: number;
  additionalMonthlyNeeded: number;
  statusLabel: string;
  readinessScore: number;
  readinessLabel: string;
}

const FREQ_LABELS: Record<string, string> = {
  annually: 'Annual',
  semi:     'Semi-Annual',
  monthly:  'Monthly',
  daily:    'Daily',
};

// ─── PDF currency formatters ─────────────────────────────────────────────────
// For CA reports, force en-US locale with CAD so Intl outputs "CA$" not "$".
// en-CA + CAD yields the local "$" symbol which is ambiguous in a multi-region PDF.

function makePdfFmt(region: 'ca' | 'us'): (n: number) => string {
  const locale   = region === 'ca' ? 'en-US' : 'en-US';
  const currency = region === 'ca' ? 'CAD'   : 'USD';
  const nf = new Intl.NumberFormat(locale, {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  return (n: number) => nf.format(n);
}

function makePdfFmtx(region: 'ca' | 'us'): (n: number) => string {
  const locale   = region === 'ca' ? 'en-US' : 'en-US';
  const currency = region === 'ca' ? 'CAD'   : 'USD';
  const nf = new Intl.NumberFormat(locale, {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return (n: number) => nf.format(n);
}

// ─── Pure data mapper — no PDF I/O ───────────────────────────────────────────

export function buildRetirementReportData(
  input: RetirementAdapterInput,
  region: 'ca' | 'us',
  _fmt: (n: number) => string,
  _fmtx: (n: number) => string,
  now = new Date(),
): { data: ReportData; filename: string } {
  // Use PDF-specific formatters to guarantee correct currency symbol in reports.
  // CA: "CA$1,736,885"  US: "$1,736,885"
  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);
  const dateStr  = now.toLocaleString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `RET-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';
  const sourceUrl   = 'fincalcsmart.com/retirement-planning-calculator';

  const isOnTrack = input.hasGoal && input.gapOrSurplus <= 0;
  const isBehind  = input.hasGoal && input.gapOrSurplus > 0;

  const statusType =
    !input.hasGoal                                             ? 'neutral'  :
    input.statusLabel === 'On Track' ||
    input.statusLabel === 'Nearly There'                       ? 'success'  :
    input.statusLabel === 'Behind Target'                      ? 'warning'  : 'danger';

  // Composition proportions
  const total      = Math.max(input.projectedSavings, 1);
  const contribPct = Math.min(1, Math.max(0, input.totalContributions / total));
  const growthPct  = Math.max(0, 1 - contribPct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const p1 = input.hasGoal
    ? isOnTrack
      ? `Your retirement plan projects ${fmt(input.projectedSavings)} by age ${input.retirementAge} — a ${fmt(-input.gapOrSurplus)} surplus above your ${fmt(input.retirementGoal)} goal. At ${input.annualRate}% assumed annual return over ${input.yearsToRetirement} years, your current contribution of ${fmtx(input.monthlyContribution)}/month keeps you on pace. Your Retirement Readiness Score of ${input.readinessScore}/100 reflects ${/^[aeiou]/i.test(input.readinessLabel) ? 'an' : 'a'} ${input.readinessLabel.toLowerCase()} trajectory.`
      : `Your retirement plan projects ${fmt(input.projectedSavings)} by age ${input.retirementAge} — ${fmt(input.gapOrSurplus)} short of your ${fmt(input.retirementGoal)} goal (${Math.round(input.goalProgressPct)}% of goal reached). To close this gap, total monthly contributions of approximately ${fmtx(input.requiredMonthly)}/month would be needed — an additional ${fmtx(input.additionalMonthlyNeeded)}/month above your current rate. Retirement Readiness Score: ${input.readinessScore}/100 (${input.readinessLabel}).`
    : `Your retirement plan projects ${fmt(input.projectedSavings)} by age ${input.retirementAge} at a ${input.annualRate}% assumed annual return over ${input.yearsToRetirement} years. No retirement goal has been set. Enter a target nest egg in the calculator to see goal progress and the required monthly contribution.`;

  const p2 = `Your ${fmt(input.projectedSavings)} projected balance is composed of ${fmt(input.totalContributions)} in total contributions (${(contribPct * 100).toFixed(1)}%) and ${fmt(input.investmentGrowth)} in estimated investment growth (${(growthPct * 100).toFixed(1)}%). Starting from ${fmt(input.currentSavings)} and contributing ${fmtx(input.monthlyContribution)}/month, the ${input.annualRate}% assumed annual return illustrates how consistent contributions build wealth significantly over time.`;

  const p3 = isBehind
    ? `The highest-impact action is to increase contributions now. Each additional dollar benefits from the full ${input.yearsToRetirement}-year compounding runway. Review your budget for monthly savings opportunities and revisit this calculator periodically to track progress.`
    : isOnTrack
      ? `Your plan is on track. Maintaining your contribution rate and avoiding early withdrawals will help preserve this trajectory. Revisit this projection annually or after any significant life change that may affect your savings rate or retirement timeline.`
      : `Set a retirement goal to see whether your current savings pace is sufficient and what monthly contribution would be required to meet it.`;

  // ── Build ReportData ──────────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Retirement Savings Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl,
    },

    executiveSummary: {
      metrics: [
        {
          label:  'Projected Savings',
          value:  fmt(input.projectedSavings),
          accent: 'teal',
        },
        {
          label: 'Retirement Goal',
          value: input.hasGoal ? fmt(input.retirementGoal) : 'Not set',
        },
        {
          label:  input.gapOrSurplus > 0 ? 'Estimated Gap' : 'Est. Surplus',
          value:  input.hasGoal ? fmt(Math.abs(input.gapOrSurplus)) : '—',
          accent: !input.hasGoal ? 'slate' : input.gapOrSurplus > 0 ? 'amber' : 'teal',
        },
        {
          label:  'Goal Progress',
          value:  input.hasGoal ? `${Math.min(200, Math.round(input.goalProgressPct))}%` : '—',
          accent: !input.hasGoal ? 'slate' : isOnTrack ? 'teal' : 'amber',
        },
        {
          label:  'Readiness Score',
          value:  `${input.readinessScore}/100`,
          sub:    input.readinessLabel,
          accent: input.readinessScore >= 80 ? 'teal' : input.readinessScore >= 45 ? 'amber' : 'red',
        },
      ],
      statusLabel: input.hasGoal ? input.statusLabel : 'No Goal Set',
      statusType:  statusType as 'success' | 'warning' | 'danger' | 'neutral',
    },

    compositionBar: {
      title: 'Contribution vs. Investment Growth Breakdown',
      segments: [
        {
          label:          'Total Contributions',
          valueFormatted: fmt(input.totalContributions),
          pct:            contribPct,
          color:          'slate',
        },
        {
          label:          'Investment Growth',
          valueFormatted: fmt(input.investmentGrowth),
          pct:            growthPct,
          color:          'teal',
        },
      ],
      totalFormatted: fmt(input.projectedSavings),
    },

    insightBlock: {
      title:      'AI-Assisted Retirement Readiness Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Current Retirement Savings',  value: fmt(input.currentSavings) },
        { label: 'Monthly Contribution',         value: `${fmtx(input.monthlyContribution)}/month` },
        { label: 'Assumed Annual Return',        value: `${input.annualRate}%` },
        { label: 'Compound Frequency',           value: FREQ_LABELS[input.freq] ?? input.freq },
        { label: 'Current Age',                  value: `${input.currentAge}` },
        { label: 'Retirement Age',               value: `${input.retirementAge}` },
        { label: 'Years to Retirement',          value: `${input.yearsToRetirement}` },
        { label: 'Retirement Goal',              value: input.hasGoal ? fmt(input.retirementGoal) : 'Not set' },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        {
          label:  'Projected Retirement Savings',
          value:  fmt(input.projectedSavings),
          accent: 'teal',
        },
        { label: 'Total Contributions',        value: fmt(input.totalContributions) },
        {
          label:  'Estimated Investment Growth',
          value:  fmt(input.investmentGrowth),
          accent: 'teal',
        },
        ...(input.hasGoal
          ? [
              {
                label:  input.gapOrSurplus > 0 ? 'Goal Gap' : 'Goal Surplus',
                value:  (input.gapOrSurplus > 0 ? '-' : '+') + fmt(Math.abs(input.gapOrSurplus)),
                accent: (input.gapOrSurplus > 0 ? 'amber' : 'teal') as 'amber' | 'teal',
              },
              {
                label: 'Goal Progress',
                value: `${Math.min(200, Math.round(input.goalProgressPct))}% of goal`,
              },
            ]
          : []),
        ...(isBehind
          ? [
              {
                label:  'Required Monthly Contribution',
                value:  `${fmtx(input.requiredMonthly)}/month`,
                accent: 'amber' as const,
              },
              {
                label:  'Additional Monthly Needed',
                value:  `+${fmtx(input.additionalMonthlyNeeded)}/month`,
                accent: 'amber' as const,
              },
            ]
          : []),
        {
          label: 'Retirement Readiness Score',
          value: `${input.readinessScore}/100 (${input.readinessLabel})`,
        },
      ],
    },

    keyDrivers: isBehind
      ? [
          `Increase monthly contributions: an additional ${fmtx(input.additionalMonthlyNeeded)}/month closes the ${fmt(input.gapOrSurplus)} gap by age ${input.retirementAge}.`,
          `Start earlier: beginning contributions sooner maximises the ${input.yearsToRetirement}-year compounding runway.`,
          `Revisit the return assumption: a higher assumed return rate (if supported by your allocation) reduces the required contribution.`,
          `Extend the retirement age: additional saving and compounding years can reduce the projected gap, although they may not fully close it.`,
        ]
      : [
          `Maintain your current ${fmtx(input.monthlyContribution)}/month contribution rate to stay on track.`,
          `Avoid early withdrawals that would reduce the compounding base.`,
          `Review this projection annually or after any significant income or expense change.`,
          `Review whether your retirement goal still reflects your expected spending, inflation, and retirement timeline.`,
        ],

    methodology: {
      whatItDoes: [
        'Projects savings growth using a fixed assumed annual return rate.',
        `Applies compounding at the selected frequency (${FREQ_LABELS[input.freq] ?? input.freq}).`,
        'Reverse-solves the required monthly contribution (PMT formula) to reach the stated retirement goal.',
        'Calculates goal progress as projected savings versus the stated retirement goal.',
        'Computes a Retirement Readiness Score based on goal progress, time horizon, and gap size.',
      ],
      notModeled: [
        'Inflation — all values are nominal (not inflation-adjusted).',
        'Investment fees, management expenses, or trading costs.',
        'Taxes on contributions, growth, or withdrawals.',
        'CPP / OAS (Canada) or Social Security (USA) income.',
        'Pension income or other retirement income sources.',
        'Changes in contribution amounts over time.',
        'Sequence-of-returns risk or market volatility.',
        'Withdrawal strategy or retirement spending needs.',
      ],
    },

    disclaimer:
      'This report is for illustrative and informational purposes only. Projected retirement savings are estimates based on fixed assumed annual return rates and do not account for inflation, investment fees, taxes, government benefits, pension income, withdrawal rates, retirement spending requirements, or changes in contribution amounts over time. Actual retirement outcomes will differ materially from these projections. This report does not constitute financial, investment, tax, or legal advice. Consult a qualified financial advisor before making retirement planning decisions.',
  };

  const filename = `fincalc-smart-retirement-report-${region}-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildRetirementPDF(
  input: RetirementAdapterInput,
  region: 'ca' | 'us',
  fmt: (n: number) => string,
  fmtx: (n: number) => string,
): Promise<void> {
  const { data, filename } = buildRetirementReportData(input, region, fmt, fmtx);
  await generatePDF(data, filename);
}
