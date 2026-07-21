import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoalType = 'vehicle' | 'home' | 'vacation' | 'education' | 'other';

export interface SavingsGoalAdapterInput {
  savingsGoal: number;
  currentSavings: number;
  monthlyContribution: number;
  annualReturn: number;
  timeHorizon: number;
  projectedSavings: number;
  totalContributions: number;
  estimatedGrowth: number;
  goalGap: number;
  surplus: number;
  progressPct: number;
  requiredMonthly: number;
  additionalMonthlyNeeded: number;
  timeToGoalMonths: number | null;
  alreadyReached: boolean;
  neverReached: boolean;
  readinessScore: number;
  readinessLabel: string;
  readinessStatus: string;
  leverState: 'on-track' | 'behind-saving' | 'behind-no-saving';
}

// ─── PDF currency formatters (en-US + currency → CA$ or $) ───────────────────

function makePdfFmt(region: 'ca' | 'us'): (n: number) => string {
  const currency = region === 'ca' ? 'CAD' : 'USD';
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  return (n: number) => nf.format(n);
}

function makePdfFmtx(region: 'ca' | 'us'): (n: number) => string {
  const currency = region === 'ca' ? 'CAD' : 'USD';
  const nf = new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return (n: number) => nf.format(n);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  vehicle:   'Vehicle',
  home:      'Home Down Payment',
  vacation:  'Vacation',
  education: 'Education',
  other:     'Goal',
};

function fmtMonths(n: number): string {
  const c = Math.max(1, Math.ceil(n));
  if (c < 12) return `${c} mo`;
  const yr = Math.floor(c / 12);
  const mo = c % 12;
  return mo === 0 ? `${yr} yr` : `${yr} yr ${mo} mo`;
}

function timeToGoalDisplay(input: SavingsGoalAdapterInput): string {
  if (input.alreadyReached) return 'Already reached';
  if (input.neverReached)   return 'Increase contributions';
  if (input.timeToGoalMonths !== null) return fmtMonths(input.timeToGoalMonths);
  return '—';
}

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildSavingsGoalReportData(
  input: SavingsGoalAdapterInput,
  region: 'ca' | 'us',
  goalType: GoalType = 'other',
  now = new Date(),
): { data: ReportData; filename: string } {

  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);

  const dateStr = now.toLocaleString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const dateFile   = now.toISOString().slice(0, 10);
  const rand       = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `SG-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';
  const goalLabel   = GOAL_TYPE_LABEL[goalType];

  const isOnTrack = input.leverState === 'on-track';
  const isBehind  = !isOnTrack;

  const statusType =
    input.readinessStatus === 'On Track'    ? 'success' :
    input.readinessStatus === 'Nearly There' ? 'warning' :
    input.readinessStatus === 'Behind Target'? 'warning' : 'danger';

  // Composition proportions
  // On track: goal amount / surplus relative to projected savings
  // Behind:   projected / gap relative to savings goal
  const compTotal     = isOnTrack ? input.projectedSavings : input.savingsGoal;
  const compProjPct   = compTotal > 0 ? Math.min(1, Math.max(0, input.projectedSavings / compTotal)) : 0;
  const compGoalPct   = compTotal > 0 ? Math.min(1, Math.max(0, input.savingsGoal / compTotal)) : 0;
  const compSurplusPct = Math.max(0, 1 - compGoalPct);
  const compGapPct    = Math.max(0, 1 - compProjPct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const ttg = timeToGoalDisplay(input);

  const p1 = isOnTrack
    ? input.alreadyReached
      ? `Your ${goalLabel.toLowerCase()} goal of ${fmt(input.savingsGoal)} has already been reached by your current savings of ${fmt(input.currentSavings)}. No additional contributions are required. Your Goal Readiness Score is ${input.readinessScore}/100 (${input.readinessLabel}).`
      : `Your savings plan projects ${fmt(input.projectedSavings)} in ${input.timeHorizon} ${input.timeHorizon === 1 ? 'year' : 'years'} — a ${fmt(input.surplus)} surplus above your ${goalLabel.toLowerCase()} goal of ${fmt(input.savingsGoal)} (${Math.round(Math.min(input.progressPct, 200))}% of goal). At ${input.annualReturn}% assumed annual return, your current contribution of ${fmtx(input.monthlyContribution)}/month keeps you on pace. Your Goal Readiness Score is ${input.readinessScore}/100 (${input.readinessLabel}).`
    : `Your savings plan projects ${fmt(input.projectedSavings)} in ${input.timeHorizon} ${input.timeHorizon === 1 ? 'year' : 'years'} — ${fmt(input.goalGap)} short of your ${goalLabel.toLowerCase()} goal of ${fmt(input.savingsGoal)} (${Math.round(input.progressPct)}% of goal). ${input.leverState === 'behind-no-saving' ? `No monthly contribution is set — contributing ${fmtx(input.requiredMonthly)}/month would be needed to meet the goal.` : `To close this gap, approximately ${fmtx(input.requiredMonthly)}/month would be needed — an additional ${fmtx(input.additionalMonthlyNeeded)}/month above your current ${fmtx(input.monthlyContribution)}/month.`} Goal Readiness Score: ${input.readinessScore}/100 (${input.readinessLabel}).`;

  const total       = Math.max(input.projectedSavings, 1);
  const contribPct  = Math.min(1, Math.max(0, input.totalContributions / total));
  const growthShare = Math.max(0, 1 - contribPct);

  const p2 = input.annualReturn > 0
    ? `Your projected ${fmt(input.projectedSavings)} is composed of ${fmt(input.totalContributions)} in total contributions (${(contribPct * 100).toFixed(1)}%) and ${fmt(input.estimatedGrowth)} in estimated investment growth (${(growthShare * 100).toFixed(1)}%) at a ${input.annualReturn}% assumed annual return compounded monthly. Starting from ${fmt(input.currentSavings)}, your ${fmtx(input.monthlyContribution)}/month contribution illustrates how consistent savings build toward your ${goalLabel.toLowerCase()} goal.`
    : `Your projected ${fmt(input.projectedSavings)} is based entirely on contributions — ${fmt(input.currentSavings)} in existing savings plus ${fmtx(input.monthlyContribution)}/month over ${input.timeHorizon} ${input.timeHorizon === 1 ? 'year' : 'years'} with no assumed return. Total contributions: ${fmt(input.totalContributions)}.`;

  const p3 = isOnTrack
    ? input.alreadyReached
      ? `Your goal is already funded. Consider whether your target amount still reflects the current cost of your ${goalLabel.toLowerCase()}, accounting for any price changes or updated estimates.`
      : `Your plan is on track. Maintaining your contribution rate of ${fmtx(input.monthlyContribution)}/month and your assumed return will keep you ahead of your ${goalLabel.toLowerCase()} goal. Review this projection if your income, contributions, or timeline change.`
    : input.neverReached
      ? `At your current contribution and return assumption, the goal may not be reachable within the ${input.timeHorizon}-year horizon. Increasing your monthly contribution or extending your timeline would improve your progress toward your ${goalLabel.toLowerCase()} goal.`
      : `The highest-impact action is to increase your monthly contribution. Estimated time to goal at current pace: ${ttg}. Every additional contribution dollar benefits from the full compounding runway. Review your budget for opportunities to close the ${fmt(input.goalGap)} gap.`;

  // ── Build ReportData ──────────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Savings Goal Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/savings-goal-calculator',
    },

    executiveSummary: {
      metrics: [
        {
          label:  'Savings Goal',
          value:  fmt(input.savingsGoal),
          accent: 'slate',
        },
        {
          label:  'Current Savings',
          value:  fmt(input.currentSavings),
        },
        {
          label:  'Projected Savings',
          value:  fmt(input.projectedSavings),
          accent: 'teal',
        },
        {
          label:  isOnTrack ? 'Est. Surplus' : 'Remaining Gap',
          value:  isOnTrack ? fmt(input.surplus) : fmt(input.goalGap),
          accent: isOnTrack ? 'teal' : 'amber',
        },
        {
          label:  'Goal Progress',
          value:  `${Math.min(100, Math.round(input.progressPct))}%`,
          sub:    input.readinessLabel,
          accent: isOnTrack ? 'teal' : input.progressPct >= 70 ? 'amber' : 'red',
        },
      ],
      statusLabel: input.readinessStatus,
      statusType:  statusType as 'success' | 'warning' | 'danger' | 'neutral',
    },

    compositionBar: isOnTrack
      ? {
          title:    'Goal Achievement Breakdown',
          segments: [
            {
              label:          `${goalLabel} Goal`,
              valueFormatted: fmt(input.savingsGoal),
              pct:            compGoalPct,
              color:          'teal',
            },
            {
              label:          'Projected Surplus',
              valueFormatted: fmt(input.surplus),
              pct:            compSurplusPct,
              color:          'slate',
            },
          ],
          totalFormatted: fmt(input.projectedSavings),
        }
      : {
          title:    'Savings vs. Remaining Gap',
          segments: [
            {
              label:          'Projected Savings',
              valueFormatted: fmt(input.projectedSavings),
              pct:            compProjPct,
              color:          'amber',
            },
            {
              label:          'Remaining Gap',
              valueFormatted: fmt(input.goalGap),
              pct:            compGapPct,
              color:          'slate',
            },
          ],
          totalFormatted: fmt(input.savingsGoal),
        },

    insightBlock: {
      title:      'AI-Assisted Savings Goal Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: `${goalLabel} Goal Amount`,   value: fmt(input.savingsGoal) },
        { label: 'Current Savings',            value: fmt(input.currentSavings) },
        { label: 'Monthly Contribution',       value: `${fmtx(input.monthlyContribution)}/month` },
        { label: 'Assumed Annual Return',      value: `${input.annualReturn}%` },
        { label: 'Time Horizon',               value: `${input.timeHorizon} ${input.timeHorizon === 1 ? 'year' : 'years'}` },
        { label: 'Compound Frequency',         value: 'Monthly' },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        {
          label:  'Projected Savings',
          value:  fmt(input.projectedSavings),
          accent: 'teal',
        },
        {
          label: 'Total Contributions',
          value: fmt(input.totalContributions),
        },
        {
          label:  'Estimated Investment Growth',
          value:  `+${fmt(input.estimatedGrowth)}`,
          accent: 'teal',
        },
        {
          label:  isOnTrack ? 'Projected Surplus' : 'Remaining Gap',
          value:  (isOnTrack ? '+' : '-') + fmt(isOnTrack ? input.surplus : input.goalGap),
          accent: isOnTrack ? 'teal' : 'amber',
        },
        {
          label: 'Goal Progress',
          value: `${Math.min(100, Math.round(input.progressPct))}% of ${goalLabel.toLowerCase()} goal`,
        },
        ...(isBehind
          ? [
              {
                label:  'Required Monthly Contribution',
                value:  `${fmtx(input.requiredMonthly)}/month`,
                accent: 'amber' as const,
              },
              ...(input.additionalMonthlyNeeded > 0.5
                ? [{ label: 'Additional Monthly Needed', value: `+${fmtx(input.additionalMonthlyNeeded)}/month`, accent: 'amber' as const }]
                : []),
            ]
          : []),
        {
          label: 'Estimated Time to Goal',
          value: ttg,
        },
        {
          label: 'Goal Readiness Score',
          value: `${input.readinessScore}/100 (${input.readinessLabel})`,
        },
      ],
    },

    keyDrivers: isOnTrack
      ? [
          `Maintain your current ${fmtx(input.monthlyContribution)}/month contribution to stay on track toward your ${goalLabel.toLowerCase()} goal.`,
          `Review whether your ${goalLabel.toLowerCase()} goal amount still reflects the current expected cost, particularly if prices or timelines have changed.`,
          `Avoid reducing contributions or withdrawing saved amounts early — doing so reduces both principal and future compounding.`,
          `Revisit this projection if your income, contributions, or timeline change significantly.`,
        ]
      : [
          input.leverState === 'behind-no-saving'
            ? `Start contributing: approximately ${fmtx(input.requiredMonthly)}/month is needed to reach your ${goalLabel.toLowerCase()} goal of ${fmt(input.savingsGoal)} within ${input.timeHorizon} ${input.timeHorizon === 1 ? 'year' : 'years'}.`
            : `Increase contributions: an additional ${fmtx(input.additionalMonthlyNeeded)}/month (to ${fmtx(input.requiredMonthly)}/month total) would close the ${fmt(input.goalGap)} gap within your ${input.timeHorizon}-year horizon.`,
          `Consider one-time lump-sum contributions from windfalls, bonuses, or tax refunds — each reduces the remaining gap and benefits from the full remaining compounding runway.`,
          `Extending the timeline adds more contribution months and compounding time, which may close the gap without increasing your monthly amount.`,
          `Review whether your return assumption is appropriate for your savings vehicle — a higher assumed return reduces the required contribution, while a cash account would require the full gap to be covered by contributions.`,
        ],

    methodology: {
      whatItDoes: [
        'Projects savings growth using monthly compounding at the assumed annual return rate.',
        `Applies future value formulas: FV of current savings grown over ${input.timeHorizon * 12} months + FV of a monthly annuity over the same period.`,
        'Reverse-solves the required monthly contribution (PMT formula) to reach the savings goal within the selected time horizon.',
        'Calculates goal progress as projected savings divided by the savings goal, expressed as a percentage.',
        'Computes a Goal Readiness Score based on goal progress percentage (capped at 100).',
        'Estimates time to goal by simulating month-by-month balance accumulation (up to 600 months / 50 years).',
      ],
      notModeled: [
        'Inflation — all values are nominal (not inflation-adjusted).',
        'Investment fees, management expenses, or account fees.',
        'Taxes on contributions, growth, or withdrawals.',
        'Changes in contribution amounts over time.',
        'Irregular contributions or lump-sum additions.',
        'Account type rules (TFSA, RRSP, 401k, savings account interest, etc.).',
        'Market volatility, sequencing risk, or variable returns.',
      ],
    },

    disclaimer:
      'This report is for illustrative and educational purposes only. Projected savings are estimates based on fixed assumed annual return rates and monthly compounding. Results do not account for inflation, investment fees, taxes, withdrawal timing, account type rules, or changes in contribution amounts over time. Actual savings outcomes will vary based on investment returns, contribution consistency, and personal circumstances. This report does not constitute financial, investment, tax, or legal advice. Consult a qualified financial advisor before making savings or investment decisions.',
  };

  const filename = `fincalc-smart-savings-goal-report-${region}-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildSavingsGoalPDF(
  input: SavingsGoalAdapterInput,
  region: 'ca' | 'us',
  goalType: GoalType = 'other',
): Promise<void> {
  const { data, filename } = buildSavingsGoalReportData(input, region, goalType);
  await generatePDF(data, filename);
}
