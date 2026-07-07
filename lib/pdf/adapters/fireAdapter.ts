import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FIREAdapterInput {
  // Inputs
  currentAge:        number;
  currentAssets:     number;
  monthlyInvestment: number;
  annualExpenses:    number;
  annualRate:        number;   // % e.g. 7
  fireMultiple:      number;   // 20 | 25 | 30 | 33
  freq:              string;   // 'annually' | 'semi' | 'monthly' | 'daily'
  annualIncome:      number | null;
  // Results
  fireTarget:        number;
  rawProgressPct:    number;
  fireProgressPct:   number;
  gapToFIRE:         number;
  alreadyFI:         boolean;
  monthsToFIRE:      number | null;
  yearsToFIRE:       number | null;
  fireAge:           number | null;
  projectedAtFIRE:   number;
  totalContribs:     number;
  investGrowth:      number;
  savingsRate:       number | null;
  monthlyFor20yr:    number;
  readinessScore:    number;
  readinessLabel:    'Excellent' | 'Good' | 'Fair' | 'Poor';
  leverState:        'already-fi' | 'on-track' | 'building' | 'not-reachable';

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

const FREQ_LABELS: Record<string, string> = {
  annually: 'Annual', semi: 'Semi-Annual', monthly: 'Monthly', daily: 'Daily',
};

const MULTIPLE_RULES: Record<number, string> = {
  20: '5% rule', 25: '4% rule', 30: '3.3% rule', 33: '3% rule',
};

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildFIREReportData(
  input: FIREAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const { region } = input;
  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `FIR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  const readinessAccent: 'teal' | 'amber' | 'red' =
    input.readinessScore >= 70 ? 'teal' : input.readinessScore >= 45 ? 'amber' : 'red';

  const progressAccent: 'teal' | 'amber' | 'red' =
    input.rawProgressPct >= 100 ? 'teal' : input.rawProgressPct >= 50 ? 'amber' : 'red';

  const statusType: 'success' | 'warning' | 'danger' =
    input.alreadyFI || input.leverState === 'on-track' ? 'success' :
    input.leverState === 'building'                    ? 'warning' : 'danger';

  const statusLabel =
    input.alreadyFI        ? 'Already FI' :
    input.leverState === 'on-track'    ? 'On Track' :
    input.leverState === 'building'    ? 'Building' : 'Not Reachable';

  // Composition bar: Current Assets / Gap to FIRE (total = FIRE target)
  const total      = Math.max(input.fireTarget, 1);
  const assetsPct  = Math.min(1, Math.max(0, input.currentAssets / total));
  const contribPct = Math.min(1 - assetsPct, Math.max(0, (input.totalContribs) / total));
  const growthPct  = Math.max(0, 1 - assetsPct - contribPct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const ruleLabel = MULTIPLE_RULES[input.fireMultiple] ?? `${(100 / input.fireMultiple).toFixed(1)}% rule`;

  const p1 = input.alreadyFI
    ? `Congratulations -- based on your current assets of ${fmt(input.currentAssets)}, you have already reached your FIRE target of ${fmt(input.fireTarget)} (${input.fireMultiple}x annual expenses, ${ruleLabel}). Your Financial Independence Progress is ${Math.round(input.rawProgressPct)}% of target.`
    : input.leverState === 'not-reachable'
      ? `Based on a FIRE target of ${fmt(input.fireTarget)} (${input.fireMultiple}x annual expenses of ${fmt(input.annualExpenses)}, ${ruleLabel}), this scenario is not projected to reach FIRE within a 100-year horizon at current inputs. To reach FIRE in 20 years, a monthly investment of approximately ${fmtx(input.monthlyFor20yr)} would be needed. Current progress: ${Math.round(input.rawProgressPct)}% of target.`
      : `Based on a FIRE target of ${fmt(input.fireTarget)} (${input.fireMultiple}x annual expenses of ${fmt(input.annualExpenses)}, ${ruleLabel}), you are projected to reach Financial Independence at age ${input.fireAge} -- in approximately ${input.yearsToFIRE} year${input.yearsToFIRE !== 1 ? 's' : ''}. Current progress: ${Math.round(input.rawProgressPct)}% of target (${fmt(input.currentAssets)} of ${fmt(input.fireTarget)}).`;

  const p2 = `At ${input.annualRate}% assumed annual return (${FREQ_LABELS[input.freq] ?? input.freq} compounding), investing ${fmtx(input.monthlyInvestment)}/month from a starting base of ${fmt(input.currentAssets)} is projected to reach ${fmt(input.projectedAtFIRE)} at the FIRE date -- composed of ${fmt(input.currentAssets)} in initial assets, ${fmt(input.totalContribs)} in total contributions, and ${fmt(input.investGrowth)} in estimated investment growth. Financial Independence Readiness Score: ${input.readinessScore}/100 (${input.readinessLabel}).`;

  const gapContext = input.gapToFIRE > 0
    ? `You still need ${fmt(input.gapToFIRE)} to close the gap to your FIRE target. Increasing your monthly investment rate, reducing annual expenses, or accepting a higher withdrawal rate (lower FIRE multiple) will accelerate your timeline.`
    : `Your projected portfolio at the FIRE date exceeds your target. Maintaining your current savings rate and assumed return will keep you on this trajectory.`;

  const p3 = `${gapContext}${input.savingsRate != null ? ` Your current savings rate is estimated at ${input.savingsRate.toFixed(1)}% of annual income -- a key FIRE metric, as higher savings rates compress the time to financial independence.` : ''} This projection does not account for ${region === 'ca' ? 'CPP, OAS, or pension income' : 'Social Security, pension, or other income'} that may reduce the required portfolio size.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers = [
    `Annual expenses (${fmt(input.annualExpenses)}) are the single most powerful FIRE lever. Every $1 reduction in annual spending reduces your FIRE target by ${fmt(input.fireMultiple)} and increases your effective savings rate simultaneously.`,
    `Monthly investment of ${fmtx(input.monthlyInvestment)}/month compounds to ${fmt(input.totalContribs)} in contributions by the FIRE date. Increasing contributions by 10% meaningfully compresses the timeline.`,
    `The ${input.fireMultiple}x multiple (${ruleLabel}) determines the target portfolio size. Choosing a lower multiple (e.g., 20x vs 25x) reduces the target by ${fmt(input.annualExpenses * (input.fireMultiple - 20))} but implies a higher withdrawal rate in retirement, increasing longevity risk.`,
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'FIRE Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/fire-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'FIRE Target',          value: fmt(input.fireTarget) },
        { label: 'FI Progress',          value: `${Math.round(input.rawProgressPct)}%`, accent: progressAccent },
        { label: 'FIRE Age',             value: input.fireAge != null ? `Age ${input.fireAge}` : 'N/A', accent: input.fireAge != null ? 'teal' : 'red' },
        { label: 'Readiness Score',      value: `${input.readinessScore}/100`, sub: input.readinessLabel, accent: readinessAccent },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Projected Portfolio at FIRE Date',
      segments: [
        { label: 'Initial Assets',        valueFormatted: fmt(input.currentAssets), pct: assetsPct,  color: 'slate' },
        { label: 'Total Contributions',   valueFormatted: fmt(input.totalContribs), pct: contribPct, color: 'amber' },
        { label: 'Investment Growth',     valueFormatted: fmt(input.investGrowth),  pct: growthPct,  color: 'teal'  },
      ],
      totalFormatted: fmt(input.projectedAtFIRE),
    },

    insightBlock: {
      title:      'AI-Assisted FIRE Readiness Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Current Age',            value: `${input.currentAge}` },
        { label: 'Current Invested Assets', value: fmt(input.currentAssets) },
        { label: 'Monthly Investment',      value: `${fmtx(input.monthlyInvestment)}/month` },
        { label: 'Annual Expenses',         value: fmt(input.annualExpenses) },
        { label: 'Expected Annual Return',  value: `${input.annualRate}%` },
        { label: 'Compound Frequency',      value: FREQ_LABELS[input.freq] ?? input.freq },
        { label: 'FIRE Multiple',           value: `${input.fireMultiple}x (${ruleLabel})` },
        ...(input.annualIncome != null ? [{ label: 'Annual Income', value: fmt(input.annualIncome) }] : []),
        { label: 'Region',                  value: regionLabel },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: 'FIRE Target',             value: fmt(input.fireTarget) },
        { label: 'FI Progress',             value: `${Math.round(input.rawProgressPct)}%`, accent: progressAccent },
        { label: 'Gap to FIRE',             value: input.gapToFIRE > 0 ? fmt(input.gapToFIRE) : fmt(0), accent: input.gapToFIRE > 0 ? 'amber' : 'teal' },
        { label: 'Years to FIRE',           value: input.yearsToFIRE != null ? `${input.yearsToFIRE} yr${input.yearsToFIRE !== 1 ? 's' : ''}` : 'N/A' },
        { label: 'FIRE Age',                value: input.fireAge != null ? `Age ${input.fireAge}` : 'Not reachable', accent: input.fireAge != null ? 'teal' : 'red' },
        { label: 'Projected at FIRE Date',  value: fmt(input.projectedAtFIRE), accent: 'teal' },
        { label: 'Total Contributions',     value: fmt(input.totalContribs) },
        { label: 'Est. Investment Growth',  value: fmt(input.investGrowth), accent: 'teal' },
        ...(input.savingsRate != null ? [{ label: 'Savings Rate', value: `${input.savingsRate.toFixed(1)}%` }] : []),
        { label: 'Readiness Score',         value: `${input.readinessScore}/100 (${input.readinessLabel})`, accent: readinessAccent },
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        `Calculates the FIRE target as annual expenses multiplied by the selected FIRE multiple (${input.fireMultiple}x). Uses a binary-search solver to find the exact month when the projected portfolio reaches the FIRE target.`,
        `Applies ${FREQ_LABELS[input.freq] ?? input.freq} compounding at ${input.annualRate}% annual return using an effective monthly rate conversion. Portfolio grows from initial assets plus monthly contributions.`,
        `Readiness Score (0-100) reflects current progress percentage and time-to-FIRE efficiency. Not a guaranteed outcome indicator.`,
      ],
      notModeled: [
        region === 'ca' ? 'CPP, OAS, or pension income offsets to annual expenses.' : 'Social Security, pension, or other income offsets.',
        'Inflation adjustment on expenses or FIRE target.',
        'Taxes on investment withdrawals or capital gains.',
        'Sequence-of-returns risk or variable market returns.',
        'Withdrawal phase (decumulation) portfolio modeling.',
        'Fees or investment costs on growth returns.',
      ],
    },

    disclaimer: 'This report is for educational and illustrative purposes only. The FIRE projection uses a fixed assumed return and does not account for market volatility, taxes, inflation, CPP/OAS or Social Security income, or sequence-of-returns risk. The widely-cited 4% rule (25x multiple) is an educational guideline, not a guarantee. Actual financial independence depends on personal circumstances, spending, and market conditions. This does not constitute financial, tax, or investment advice. Consult a qualified financial advisor.',
  };

  const filename = `fincalc-smart-fire-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildFIREPDF(input: FIREAdapterInput): Promise<void> {
  const { data, filename } = buildFIREReportData(input);
  await generatePDF(data, filename);
}
