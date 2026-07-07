import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NetWorthAdapterInput {
  // Inputs
  cashSavings:           number;
  investmentsRetirement: number;
  homeRealEstate:        number;
  vehiclesOther:         number;
  mortgageBalance:       number;
  loansCreditCards:      number;
  otherDebts:            number;
  // Results
  totalAssets:      number;
  totalLiabilities: number;
  netWorth:         number;
  debtToAssetRatio: number | null;
  liquidPct:        number | null;
  isNegativeNetWorth: boolean;
  debtOnly:         boolean;
  healthScore:      number;
  healthLabel:      'Excellent' | 'Good' | 'Fair' | 'Poor';
  healthStatus:     'Healthy' | 'Watch' | 'Caution';
  liqScore:         number;
  liqLabel:         'Strong' | 'Moderate' | 'Low' | 'Very Low';
  leverState:       'negative' | 'high-debt' | 'low-liquidity' | 'healthy';
  debtReductionNeeded: number;
  liquidityGap:     number;

  region: 'ca' | 'us';
}

// ─── PDF currency formatters ──────────────────────────────────────────────────

function makePdfFmt(region: 'ca' | 'us'): (n: number) => string {
  const currency = region === 'ca' ? 'CAD' : 'USD';
  const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (n: number) => nf.format(n);
}

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildNetWorthReportData(
  input: NetWorthAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const { region } = input;
  const fmt = makePdfFmt(region);

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `NWR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  const healthAccent: 'teal' | 'amber' | 'red' =
    input.healthScore >= 70 ? 'teal' : input.healthScore >= 45 ? 'amber' : 'red';

  const liqAccent: 'teal' | 'amber' | 'red' =
    input.liqLabel === 'Strong' ? 'teal' : input.liqLabel === 'Moderate' ? 'amber' : 'red';

  const statusType: 'success' | 'warning' | 'danger' =
    input.leverState === 'healthy' ? 'success' :
    input.leverState === 'low-liquidity' || input.leverState === 'high-debt' ? 'warning' : 'danger';

  const statusLabel =
    input.leverState === 'healthy'      ? 'Healthy Balance Sheet' :
    input.leverState === 'high-debt'    ? 'High Debt Load' :
    input.leverState === 'low-liquidity' ? 'Low Liquidity' : 'Negative Net Worth';

  // Composition bar: assets vs liabilities (relative)
  const grossTotal  = Math.max(input.totalAssets + input.totalLiabilities, 1);
  const assetsPct   = Math.min(1, Math.max(0, input.totalAssets      / grossTotal));
  const liabPct     = Math.max(0, 1 - assetsPct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const dARpct = input.debtToAssetRatio != null ? `${input.debtToAssetRatio.toFixed(1)}%` : '—';
  const liquidPctStr = input.liquidPct != null ? `${input.liquidPct.toFixed(1)}%` : '—';

  const p1 = input.isNegativeNetWorth
    ? `Your balance sheet shows total assets of ${fmt(input.totalAssets)} and total liabilities of ${fmt(input.totalLiabilities)}, resulting in a negative net worth of ${fmt(input.netWorth)}. Liabilities exceed assets by ${fmt(Math.abs(input.netWorth))}. Debt-to-asset ratio: ${dARpct}. Net Worth Health Score: ${input.healthScore}/100 (${input.healthLabel}).`
    : `Your balance sheet shows total assets of ${fmt(input.totalAssets)} and total liabilities of ${fmt(input.totalLiabilities)}, resulting in a net worth of ${fmt(input.netWorth)}. Debt-to-asset ratio: ${dARpct}. Liquid assets represent ${liquidPctStr} of total assets. Net Worth Health Score: ${input.healthScore}/100 (${input.healthLabel}).`;

  const p2 = `Asset breakdown: Cash & Savings ${fmt(input.cashSavings)} + Investments/Retirement ${fmt(input.investmentsRetirement)} + Home/Real Estate ${fmt(input.homeRealEstate)} + Vehicles/Other ${fmt(input.vehiclesOther)} = ${fmt(input.totalAssets)}. Liabilities: Mortgage ${fmt(input.mortgageBalance)} + Loans/Credit Cards ${fmt(input.loansCreditCards)} + Other Debts ${fmt(input.otherDebts)} = ${fmt(input.totalLiabilities)}. Liquidity Strength: ${input.liqLabel} (${liquidPctStr} liquid assets of total).`;

  const actionText =
    input.leverState === 'negative'
      ? `With liabilities exceeding assets, the priority is stabilising income, reducing high-rate debt, and building savings. Focus on any high-interest debt first.`
      : input.leverState === 'high-debt'
      ? `Your debt-to-asset ratio of ${dARpct} exceeds the 25% reference threshold. Reducing liabilities by ${fmt(input.debtReductionNeeded)} would bring the ratio to 25%. Focus on your highest-rate debts first.`
      : input.leverState === 'low-liquidity'
      ? `Liquid assets are ${liquidPctStr} of total assets, below the 10% reference threshold. Building ${fmt(input.liquidityGap)} in additional liquid savings (cash, savings account) would reach 10% liquid.`
      : `Your balance sheet is healthy: positive net worth, manageable debt, and adequate liquidity. Periodic review ensures this position improves as assets grow and debts are paid down.`;

  const p3 = `${actionText} These thresholds (25% D/A, 10% liquid) are educational reference points only -- not financial advice or regulatory standards. Actual balance sheet health depends on income, cash flow, asset type, and personal goals.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers = [
    `Net worth of ${fmt(input.netWorth)} = total assets ${fmt(input.totalAssets)} - total liabilities ${fmt(input.totalLiabilities)}. Consistent debt repayment and asset accumulation are the two primary levers.`,
    `Debt-to-asset ratio of ${dARpct} (reference: 25% or lower for a healthy balance sheet). The largest single improvement action is paying down high-rate non-mortgage debt.`,
    `Liquid assets (Cash + Savings: ${fmt(input.cashSavings)}) represent ${liquidPctStr} of total assets. Liquidity enables financial resilience -- low liquidity means being asset-rich but cash-poor.`,
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Net Worth Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/net-worth-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'Net Worth',         value: fmt(input.netWorth),         accent: input.isNegativeNetWorth ? 'red' : 'teal' },
        { label: 'Total Assets',      value: fmt(input.totalAssets),      accent: 'teal' },
        { label: 'Total Liabilities', value: fmt(input.totalLiabilities), accent: 'amber' },
        { label: 'Health Score',      value: `${input.healthScore}/100`,  sub: input.healthLabel, accent: healthAccent },
        { label: 'Liquidity',         value: input.liquidPct != null ? `${input.liquidPct.toFixed(1)}% liquid` : '—', sub: input.liqLabel, accent: liqAccent },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Assets vs Liabilities',
      segments: [
        { label: 'Total Assets',      valueFormatted: fmt(input.totalAssets),      pct: assetsPct, color: 'teal'  },
        { label: 'Total Liabilities', valueFormatted: fmt(input.totalLiabilities), pct: liabPct,   color: 'amber' },
      ],
      totalFormatted: fmt(input.totalAssets + input.totalLiabilities),
    },

    insightBlock: {
      title:      'AI-Assisted Net Worth Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Assets & Liabilities Entered',
      rows: [
        { label: 'Cash & Savings',            value: fmt(input.cashSavings) },
        { label: 'Investments / Retirement',  value: fmt(input.investmentsRetirement) },
        { label: 'Home / Real Estate',        value: fmt(input.homeRealEstate) },
        { label: 'Vehicles & Other Assets',   value: fmt(input.vehiclesOther) },
        { label: 'Mortgage Balance',          value: fmt(input.mortgageBalance) },
        { label: 'Loans & Credit Cards',      value: fmt(input.loansCreditCards) },
        { label: 'Other Debts',               value: fmt(input.otherDebts) },
        { label: 'Region',                    value: regionLabel },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: 'Total Assets',           value: fmt(input.totalAssets), accent: 'teal'  },
        { label: 'Total Liabilities',      value: fmt(input.totalLiabilities), accent: 'amber' },
        { label: 'Net Worth',              value: fmt(input.netWorth), accent: input.isNegativeNetWorth ? 'red' : 'teal' },
        { label: 'Debt-to-Asset Ratio',    value: dARpct, accent: input.debtToAssetRatio != null && input.debtToAssetRatio > 50 ? 'red' : input.debtToAssetRatio != null && input.debtToAssetRatio > 25 ? 'amber' : 'teal' },
        { label: 'Liquid Assets',          value: fmt(input.cashSavings) },
        { label: 'Liquid Assets %',        value: liquidPctStr, accent: liqAccent },
        { label: 'Net Worth Health Score', value: `${input.healthScore}/100 (${input.healthLabel})`, accent: healthAccent },
        { label: 'Liquidity Score',        value: `${input.liqScore}/100 (${input.liqLabel})`, accent: liqAccent },
        ...(input.debtReductionNeeded > 0 ? [{ label: 'Debt Reduction to 25% D/A', value: fmt(input.debtReductionNeeded), accent: 'amber' as const }] : []),
        ...(input.liquidityGap > 0 ? [{ label: 'Gap to 10% Liquid', value: fmt(input.liquidityGap), accent: 'amber' as const }] : []),
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        'Net worth = total assets - total liabilities. Liquid assets = Cash & Savings only.',
        'Debt-to-asset ratio = total liabilities / total assets x 100%. Liquidity % = Cash & Savings / total assets x 100%.',
        'Net Worth Health Score (0-100) based on debt-to-asset ratio: score = clamp(0, 100, 100 - D/A x 1.33). Liquidity Score based on liquid % of assets.',
      ],
      notModeled: [
        'Asset sale costs or transaction fees (real estate commissions, capital gains tax).',
        'Fair market value fluctuations -- assets are entered at user-estimated values.',
        'Debt repayment terms, interest rates, or minimum payments.',
        'Income or cash flow (net worth is a balance-sheet snapshot only).',
        'Pension or defined-benefit plan values not entered as assets.',
        'Insurance policy cash values.',
      ],
    },

    disclaimer: 'This report is for educational and illustrative purposes only. Net worth is a balance-sheet estimate based on the values you entered and does not reflect market appraisals, tax obligations on asset sale, or all personal assets and liabilities. The 25% debt-to-asset and 10% liquidity thresholds are illustrative reference points only, not financial planning standards or regulatory requirements. This does not constitute financial, legal, or investment advice. Consult a qualified financial advisor for a comprehensive balance-sheet review.',
  };

  const filename = `fincalc-smart-net-worth-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildNetWorthPDF(input: NetWorthAdapterInput): Promise<void> {
  const { data, filename } = buildNetWorthReportData(input);
  await generatePDF(data, filename);
}
