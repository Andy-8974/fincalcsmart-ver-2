import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

type SalaryType = 'Annual' | 'Monthly' | 'Biweekly' | 'Weekly' | 'Hourly';
type PayFreq    = 'Monthly' | 'Semi-monthly' | 'Biweekly' | 'Weekly';

export interface SalaryAdapterInput {
  // Raw inputs (passed through for report fidelity)
  salaryAmount:   number;
  salaryType:     SalaryType;
  payFreq:        PayFreq;
  hoursPerWeek:   number;
  weeksPerYear:   number;
  deductionRate:  number;       // % (0–99), user-entered

  // Computed results — same values rendered in the UI
  annualGross:         number;
  monthlyGross:        number;
  biweeklyGross:       number;
  weeklyGross:         number;
  dailyGross:          number;
  hourlyEquivalent:    number;
  annualDeductions:    number;
  annualTakeHome:      number;
  takeHomePerPeriod:   number;
  effectiveHourlyRate: number;
  takeHomePct:         number;  // 100 - deductionRate
  periodsPerYear:      number;
  payFreqLabel:        string;

  // AI insight state — from the calculator's derived values
  payClarityScore: number;      // 0–100
  clarityLabel:    string;      // 'Low Deduction Load' | 'Moderate Deduction Load' | 'High Deduction Load'

  region: 'ca' | 'us';
}

// ─── PDF currency formatters ──────────────────────────────────────────────────

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

// Weekly periodsPerYear tracks the user-entered weeksPerYear (not a fixed 52) —
// display it as received rather than rounding, so the PDF matches the UI exactly.
function formatPeriods(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return String(Math.round(n * 100) / 100);
}

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildSalaryReportData(
  input: SalaryAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {

  const { region } = input;
  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);

  const dateStr = now.toLocaleString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const dateFile   = now.toISOString().slice(0, 10);
  const rand       = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `SAL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  // ── Status type from clarity label ───────────────────────────────────────
  const statusType =
    input.clarityLabel === 'Low Deduction Load'      ? 'success' :
    input.clarityLabel === 'Moderate Deduction Load'  ? 'warning' : 'danger';

  // ── Score accent ──────────────────────────────────────────────────────────
  const scoreAccent =
    input.payClarityScore >= 70 ? 'teal' :
    input.payClarityScore >= 55 ? 'amber' : 'red';

  // ── Composition bar ───────────────────────────────────────────────────────
  const gross = Math.max(input.annualGross, 1);
  const takeHomePct  = Math.min(1, Math.max(0, input.annualTakeHome  / gross));
  const deductPct    = Math.max(0, 1 - takeHomePct);

  // ── Pay frequency descriptors ─────────────────────────────────────────────
  const freqDesc: Record<string, string> = {
    'Monthly':      '12 paycheques per year.',
    'Semi-monthly': '24 paycheques per year (twice per month — differs from biweekly).',
    'Biweekly':     '26 paycheques per year (two months each year have 3 paycheques).',
    'Weekly':       `${formatPeriods(input.periodsPerYear)} paycheques per year.`,
  };

  // ── Deduction-rate context ─────────────────────────────────────────────────
  const rate = input.deductionRate;
  const rateContext =
    rate === 0
      ? 'No deduction rate was entered, so take-home equals gross pay in this scenario. Enter an estimated rate to model a realistic take-home.'
      : rate < 20
        ? `A rate of ${rate}% is below the 20–35% range many earners use as a rough guide. Verify this reflects your tax, benefits, and payroll situation.`
        : rate > 35
          ? `A rate of ${rate}% is above the 20–35% range commonly used as a rough estimate. This may reflect a higher tax bracket or additional deductions.`
          : `A rate of ${rate}% is within the 20–35% range many earners use as a rough estimate for combined taxes and deductions.`;

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const entryDesc =
    input.salaryType === 'Annual'   ? `${fmt(input.salaryAmount)} annual salary` :
    input.salaryType === 'Monthly'  ? `${fmt(input.salaryAmount)}/month salary` :
    input.salaryType === 'Biweekly' ? `${fmt(input.salaryAmount)}/biweekly salary` :
    input.salaryType === 'Weekly'   ? `${fmt(input.salaryAmount)}/week salary` :
                                      `${fmtx(input.salaryAmount)}/hr salary`;

  const p1 = `Based on a ${entryDesc}, your estimated annual gross pay is ${fmt(input.annualGross)}. After applying the ${rate}% estimated deduction rate, your estimated annual take-home is ${fmt(input.annualTakeHome)} — ${input.takeHomePct.toFixed(0)}% of gross. Your ${input.payFreqLabel} take-home is estimated at ${fmtx(input.takeHomePerPeriod)} per paycheque (${formatPeriods(input.periodsPerYear)} per year). Pay Clarity Score: ${input.payClarityScore}/100 (${input.clarityLabel}).`;

  const p2 = region === 'ca'
    ? `${rateContext} Your estimated annual deductions total ${fmt(input.annualDeductions)}. This estimate is user-defined and does not reflect federal or provincial tax brackets, CPP, EI, employer benefits, or province-specific payroll rules. Actual take-home pay depends on your province, filing status, and payroll setup.`
    : `${rateContext} Your estimated annual deductions total ${fmt(input.annualDeductions)}. This estimate is user-defined and does not reflect federal or state tax brackets, FICA, Medicare, employer benefits, or state-specific payroll rules. Actual take-home pay depends on your state, filing status, and payroll setup.`;

  const p3 = `Your gross salary is equivalent to ${fmtx(input.hourlyEquivalent)}/hr at ${input.hoursPerWeek} hrs/week across ${input.weeksPerYear} working weeks.${rate > 0 ? ` After ${rate}% estimated deductions, your effective take-home hourly rate is ${fmtx(input.effectiveHourlyRate)}/hr.` : ''} ${freqDesc[input.payFreqLabel] ?? ''}`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers = [
    rate === 0
      ? `Enter an estimated deduction rate to model realistic take-home pay. Many earners estimate 20–35% as a combined rate for income taxes and payroll deductions, but your actual rate depends on your specific situation.`
      : rate > 35
        ? `Your estimated deduction rate of ${rate}% is above the 20–35% range used by many earners. Review whether all intended deductions are included — or whether adjusting the rate would better reflect your actual payroll situation.`
        : `Your estimated deduction rate of ${rate}% results in ${fmt(input.annualDeductions)} deducted annually. Adjusting this estimate up or down by 5% changes your take-home by approximately ${fmt(input.annualGross * 0.05)} per year.`,
    `Pay frequency affects cash flow, not total take-home. Your ${input.payFreqLabel} schedule means ${formatPeriods(input.periodsPerYear)} paycheques per year of ${fmtx(input.takeHomePerPeriod)} each. ${freqDesc[input.payFreqLabel] ?? ''}`,
    `Your effective take-home hourly rate is ${rate > 0 ? `${fmtx(input.effectiveHourlyRate)}/hr after estimated deductions` : `${fmtx(input.hourlyEquivalent)}/hr gross (enter a deduction rate to see effective take-home)`}. Comparing offers: use annual gross and estimated take-home, not just pay frequency amounts.`,
  ];

  // ── Inputs rows ───────────────────────────────────────────────────────────
  const inputRows = [
    { label: 'Salary Amount',        value: input.salaryType === 'Hourly' ? `${fmtx(input.salaryAmount)}/hr` : fmt(input.salaryAmount) },
    { label: 'Salary Type',          value: input.salaryType },
    { label: 'Pay Frequency',        value: input.payFreqLabel },
    { label: 'Hours per Week',       value: `${input.hoursPerWeek} hr` },
    { label: 'Weeks per Year',       value: `${input.weeksPerYear} wk` },
    { label: 'Est. Deduction Rate',  value: `${rate}%` },
    { label: 'Region',               value: regionLabel },
  ];

  // ── Results rows ──────────────────────────────────────────────────────────
  const resultRows = [
    { label: 'Annual Gross Pay',                    value: fmt(input.annualGross) },
    { label: 'Monthly Gross Pay',                   value: fmt(input.monthlyGross) },
    { label: 'Biweekly Gross Pay',                  value: fmt(input.biweeklyGross) },
    { label: 'Weekly Gross Pay',                    value: fmt(input.weeklyGross) },
    { label: 'Est. Annual Deductions',              value: fmt(input.annualDeductions),    accent: 'amber' as const },
    { label: 'Est. Annual Take-Home',               value: fmt(input.annualTakeHome),      accent: 'teal'  as const },
    { label: `Est. Take-Home — ${input.payFreqLabel}`, value: fmtx(input.takeHomePerPeriod), accent: 'teal' as const },
    ...(rate > 0
      ? [{ label: 'Effective Hourly Rate (net)',   value: `${fmtx(input.effectiveHourlyRate)}/hr`, accent: 'teal' as const }]
      : [{ label: 'Gross Hourly Equivalent',       value: `${fmtx(input.hourlyEquivalent)}/hr` }]),
    { label: 'Estimated Deduction Rate',            value: `${rate}%` },
    { label: 'Take-Home Share',                     value: `${input.takeHomePct.toFixed(0)}%` },
    { label: 'Pay Clarity Score',                   value: `${input.payClarityScore}/100 (${input.clarityLabel})`, accent: scoreAccent as 'teal' | 'amber' | 'red' },
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Salary Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/salary-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'Annual Gross Pay',      value: fmt(input.annualGross) },
        { label: 'Est. Annual Take-Home', value: fmt(input.annualTakeHome),   accent: 'teal' },
        { label: 'Est. Deductions',       value: fmt(input.annualDeductions), accent: 'amber' },
        {
          label:  'Pay Clarity Score',
          value:  `${input.payClarityScore}/100`,
          sub:    input.clarityLabel,
          accent: scoreAccent as 'teal' | 'amber' | 'red',
        },
      ],
      statusLabel: input.clarityLabel,
      statusType:  statusType as 'success' | 'warning' | 'danger',
    },

    compositionBar: {
      title: 'Estimated Pay Breakdown',
      segments: [
        {
          label:          'Est. Take-Home',
          valueFormatted: fmt(input.annualTakeHome),
          pct:            takeHomePct,
          color:          'teal',
        },
        {
          label:          'Est. Deductions',
          valueFormatted: fmt(input.annualDeductions),
          pct:            deductPct,
          color:          'amber',
        },
      ],
      totalFormatted: fmt(input.annualGross),
    },

    insightBlock: {
      title:      'AI-Assisted Salary Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows:  inputRows,
    },

    results: {
      title: 'Detailed Results',
      rows:  resultRows,
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        `Converts the entered ${input.salaryType.toLowerCase()} salary to an annual gross figure using standard periods: Annual = as entered; Monthly x12; Biweekly x26; Weekly x${input.weeksPerYear}; Hourly x${input.hoursPerWeek * input.weeksPerYear} hours/year.`,
        `Applies the user-entered deduction rate to annual gross pay to estimate annual deductions and take-home pay.`,
        `Divides annual take-home by the selected pay frequency periods (Monthly: 12, Semi-monthly: 24, Biweekly: 26, Weekly: ${input.weeksPerYear}) to calculate estimated take-home per paycheque.`,
      ],
      notModeled: region === 'ca' ? [
        'Federal or provincial income tax brackets.',
        'CPP or EI deductions.',
        'Employer benefits, retirement contributions, or health insurance premiums.',
        'Tax credits, personal exemptions, or deduction-eligible expenses.',
        'Province-specific payroll rules, surtax, or withholding requirements.',
      ] : [
        'Federal or state income tax brackets.',
        'FICA or Medicare payroll deductions.',
        'Employer benefits, retirement contributions, or health insurance premiums.',
        'Tax credits, personal exemptions, or deduction-eligible expenses.',
        'State-specific payroll rules, surtax, or withholding requirements.',
      ],
    },

    disclaimer: region === 'ca'
      ? 'This report is for educational and illustrative purposes only. The deduction rate used is a user-entered estimate and does not reflect federal or provincial tax brackets, CPP, EI, employer contributions, or province-specific payroll rules. Actual take-home pay depends on your province, tax year, filing status, and payroll setup. This report does not constitute financial, tax, payroll, or legal advice. Consult a licensed tax professional or payroll advisor before making financial decisions.'
      : 'This report is for educational and illustrative purposes only. The deduction rate used is a user-entered estimate and does not reflect federal or state tax brackets, FICA, Medicare, employer contributions, or state-specific payroll rules. Actual take-home pay depends on your state, tax year, filing status, and payroll setup. This report does not constitute financial, tax, payroll, or legal advice. Consult a licensed tax professional or payroll advisor before making financial decisions.',
  };

  const filename = `fincalc-smart-salary-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildSalaryPDF(input: SalaryAdapterInput): Promise<void> {
  const { data, filename } = buildSalaryReportData(input);
  await generatePDF(data, filename);
}
