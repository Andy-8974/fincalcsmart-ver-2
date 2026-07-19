import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DebtRepaymentAdapterInput {
  // Inputs
  balance:        number;
  annualRate:     number;   // %
  annualFees:     number;
  monthlyPayment: number;
  extraPayment:   number;
  // Results (status: 'ok')
  months:              number;
  debtFreeStr:         string;
  totalInterest:       number;
  totalPaid:           number;
  monthlyInterestCharge: number;
  principalPerPayment:   number;
  // Acceleration scenarios
  accel100InterestSaved: number;
  accel100MonthsSaved:   number;
  accel100DebtFreeStr:   string;
  // Extra payment scenario (null when extraPayment = 0)
  extraMonths:           number | null;
  extraDebtFreeStr:      string | null;
  extraInterestSaved:    number | null;

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

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildDebtRepaymentReportData(
  input: DebtRepaymentAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const { region } = input;
  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `DBT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  const interestRatioPct = input.balance > 0 ? (input.totalInterest / (input.balance + input.totalInterest)) * 100 : 0;

  const statusType: 'success' | 'warning' | 'danger' =
    interestRatioPct < 20 ? 'success' : interestRatioPct < 40 ? 'warning' : 'danger';

  const statusLabel =
    interestRatioPct < 20 ? 'Low Interest Burden' :
    interestRatioPct < 40 ? 'Moderate Interest Burden' : 'High Interest Burden';

  // Composition bar: principal vs total interest
  const total       = Math.max(input.totalPaid, 1);
  const principalPct = Math.min(1, Math.max(0, input.balance / total));
  const interestPct  = Math.max(0, 1 - principalPct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const yearsMonths = (m: number) => {
    const yr = Math.floor(m / 12);
    const mo = m % 12;
    if (yr === 0) return `${mo} month${mo !== 1 ? 's' : ''}`;
    if (mo === 0) return `${yr} year${yr !== 1 ? 's' : ''}`;
    return `${yr} yr ${mo} mo`;
  };

  const p1 = `With a ${fmt(input.balance)} balance at ${input.annualRate}% annual interest, your ${fmtx(input.monthlyPayment)}/month payment pays off the debt in ${yearsMonths(input.months)} (by ${input.debtFreeStr}). Total paid: ${fmt(input.totalPaid)}. Total interest: ${fmt(input.totalInterest)} (${interestRatioPct.toFixed(1)}% of total cost). Monthly interest charge in month 1: ${fmtx(input.monthlyInterestCharge)}.`;

  const extraP = input.extraPayment > 0 && input.extraMonths != null && input.extraInterestSaved != null
    ? `With your extra ${fmtx(input.extraPayment)}/month (total ${fmtx(input.monthlyPayment + input.extraPayment)}/month), you pay off in ${yearsMonths(input.extraMonths)} (by ${input.extraDebtFreeStr ?? '—'}), saving ${fmt(input.extraInterestSaved)} in interest.`
    : `Adding just ${fmtx(100)}/month to your payment would save ${fmt(input.accel100InterestSaved)} in interest and eliminate the debt ${yearsMonths(input.accel100MonthsSaved)} earlier (by ${input.accel100DebtFreeStr}).`;

  const p2 = `Acceleration opportunity: ${extraP} In month 1, ${fmtx(input.principalPerPayment)} of each payment reduces the principal and ${fmtx(input.monthlyInterestCharge)} covers interest. As the balance falls, more of each payment goes to principal.${input.annualFees > 0 ? ` Annual fees of ${fmt(input.annualFees)} are shown as an additional cost alongside the payoff and do not affect the payoff timeline.` : ''}`;

  const p3 = `Interest rate (${input.annualRate}%) is the key cost driver. Every point of rate reduction meaningfully lowers total interest. If you have multiple debts, prioritize higher-rate balances first (avalanche method) to minimize total interest. This calculator models a single debt with monthly compounding -- consolidation or balance transfer scenarios require separate modeling.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers = [
    `Interest rate of ${input.annualRate}% produces ${fmt(input.monthlyInterestCharge)}/month in interest on the opening balance. Reducing the rate by even 2 percentage points would meaningfully decrease total interest cost.`,
    `Extra payments have outsized impact early in the payoff period when the principal is highest. Adding ${fmtx(100)}/month saves ${fmt(input.accel100InterestSaved)} and accelerates payoff by ${yearsMonths(input.accel100MonthsSaved)}.`,
    `Total interest of ${fmt(input.totalInterest)} represents ${interestRatioPct.toFixed(1)}% of total repayment cost. ${interestRatioPct > 35 ? 'This is a high interest burden -- acceleration or refinancing could substantially reduce the cost of this debt.' : 'Maintaining payments and avoiding new charges will keep this burden under control.'}`,
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Debt Repayment Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/debt-repayment-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'Balance',          value: fmt(input.balance) },
        { label: 'Monthly Payment',  value: fmtx(input.monthlyPayment) },
        { label: 'Months to Payoff', value: `${input.months} mo (${yearsMonths(input.months)})`, accent: interestRatioPct < 30 ? 'teal' : 'amber' },
        { label: 'Total Interest',   value: fmt(input.totalInterest), accent: interestRatioPct < 20 ? 'teal' : interestRatioPct < 40 ? 'amber' : 'red' },
        { label: 'Debt Free Date',   value: input.debtFreeStr, accent: 'teal' },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Total Payment Breakdown',
      segments: [
        { label: 'Principal',     valueFormatted: fmt(input.balance),       pct: principalPct, color: 'teal'  },
        { label: 'Total Interest', valueFormatted: fmt(input.totalInterest), pct: interestPct,  color: 'amber' },
      ],
      totalFormatted: fmt(input.totalPaid),
    },

    insightBlock: {
      title:      'AI-Assisted Debt Payoff Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Current Balance',    value: fmt(input.balance) },
        { label: 'Annual Interest Rate', value: `${input.annualRate}%` },
        ...(input.annualFees > 0 ? [{ label: 'Annual Fees', value: fmt(input.annualFees) }] : []),
        { label: 'Monthly Payment',    value: fmtx(input.monthlyPayment) },
        ...(input.extraPayment > 0 ? [{ label: 'Extra Monthly Payment', value: fmtx(input.extraPayment) }] : []),
        { label: 'Region',             value: regionLabel },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: 'Months to Payoff',      value: `${input.months} months`, accent: 'teal' },
        { label: 'Debt-Free Date',        value: input.debtFreeStr, accent: 'teal' },
        { label: 'Total Paid',            value: fmt(input.totalPaid) },
        { label: 'Total Interest',        value: fmt(input.totalInterest), accent: interestRatioPct < 25 ? 'teal' : 'amber' },
        { label: 'Month-1 Interest',      value: fmtx(input.monthlyInterestCharge), accent: 'amber' },
        { label: 'Month-1 Principal',     value: fmtx(input.principalPerPayment),   accent: 'teal'  },
        { label: '+$100/mo Saves (Interest)', value: fmt(input.accel100InterestSaved), accent: 'teal' },
        { label: '+$100/mo Saves (Time)',  value: yearsMonths(input.accel100MonthsSaved), accent: 'teal' },
        { label: '+$100/mo Debt Free',    value: input.accel100DebtFreeStr },
        ...(input.extraPayment > 0 && input.extraInterestSaved != null ? [
          { label: `Extra ${fmtx(input.extraPayment)}/mo Saves`, value: fmt(input.extraInterestSaved), accent: 'teal' as const },
          { label: `Extra ${fmtx(input.extraPayment)}/mo Debt Free`, value: input.extraDebtFreeStr ?? '—', accent: 'teal' as const },
        ] : []),
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        `Simulates month-by-month debt repayment with monthly compounding: interest = (annualRate / 12) x balance. Each payment first covers accrued interest; the remainder reduces principal. Simulation continues until balance reaches $0.`,
        `Annual fees (if entered) are displayed as an additional cost total but do not affect the payoff simulation -- only the balance, rate, and payment amounts drive the payoff timeline.`,
        `Acceleration scenarios computed by adding $100/month (fixed comparison) or the user-entered extra payment to the base monthly payment and re-running the simulation.`,
      ],
      notModeled: [
        'Multiple debts or consolidated payoff strategies (avalanche or snowball).',
        'Balance transfers, promotional 0% rates, or refinancing to a lower rate.',
        'Minimum payment requirements that may increase as the balance falls.',
        'Late payment penalties, NSF fees, or credit score impact.',
        'Tax deductibility of interest (e.g., home equity debt in some jurisdictions).',
      ],
    },

    disclaimer: 'This report is for educational and illustrative purposes only. The payoff simulation uses monthly compounding and does not account for variable interest rates, minimum payment changes, or lender-specific terms. Actual payoff timeline depends on your lender agreement. This does not constitute financial or debt counselling advice. If you are experiencing financial hardship, consult a non-profit credit counsellor.',
  };

  const filename = `fincalc-smart-debt-repayment-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildDebtRepaymentPDF(input: DebtRepaymentAdapterInput): Promise<void> {
  const { data, filename } = buildDebtRepaymentReportData(input);
  await generatePDF(data, filename);
}
