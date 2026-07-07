import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RentVsBuyAdapterInput {
  // Inputs
  monthlyRent:    number;
  rentIncrease:   number;   // %
  purchasePrice:  number;
  downPaymentAmt: number;
  downPaymentPct: number;
  annualRate:     number;   // %
  amortization:   number;   // years
  propertyTaxPct: number;   // %
  monthlyInsuranceMaint: number;
  monthlyHOA:     number;
  homeGrowthPct:  number;   // %
  investReturnPct: number;  // %
  closingCostPct: number;   // %
  horizonYears:   number;
  // Results
  monthlyOwnership: number;
  monthlyPI:        number;
  totalRentCost:    number;
  totalBuyCost:     number;
  equity:           number;
  netDifference:    number;
  breakEvenYear:    number | null;
  opportunityCost:  number;
  decision:         'buy' | 'rent' | 'close';
  topDriver:        'appreciation' | 'rentGrowth' | 'interestRate' | 'ownershipCost';

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

export function buildRentVsBuyReportData(
  input: RentVsBuyAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const { region } = input;
  const fmt  = makePdfFmt(region);
  const fmtx = makePdfFmtx(region);

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `RVB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const currency    = region === 'ca' ? 'CAD' : 'USD';
  const regionLabel = region === 'ca' ? 'Canada' : 'United States';

  const decisionAccent: 'teal' | 'amber' | 'slate' =
    input.decision === 'buy' ? 'teal' : input.decision === 'rent' ? 'amber' : 'slate';

  const statusType: 'success' | 'warning' | 'danger' =
    input.decision === 'buy' ? 'success' : input.decision === 'rent' ? 'warning' : 'success';

  const statusLabel =
    input.decision === 'buy'  ? 'Buying Likely Advantageous' :
    input.decision === 'rent' ? 'Renting Likely Advantageous' : 'Too Close to Call';

  const decisionLabel =
    input.decision === 'buy'  ? 'Buy' :
    input.decision === 'rent' ? 'Rent' : 'Close';

  const topDriverLabel: Record<typeof input.topDriver, string> = {
    appreciation:    'Home Appreciation',
    rentGrowth:      'Rent Growth',
    interestRate:    'Interest Rate',
    ownershipCost:   'Ownership Costs',
  };

  // Composition bar: rent cost vs buy cost (relative)
  const totalCostSum = Math.max(input.totalRentCost + input.totalBuyCost, 1);
  const rentPct = Math.min(1, Math.max(0, input.totalRentCost / totalCostSum));
  const buyPct  = Math.max(0, 1 - rentPct);

  // Net difference framing: positive = buy cheaper, negative = rent cheaper
  const absDiff    = Math.abs(input.netDifference);
  const diffFavors = input.netDifference <= 0 ? 'buying' : 'renting';

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const compoundNote = region === 'ca'
    ? 'Canadian mortgage uses semi-annual compounding per the Interest Act.'
    : 'US mortgage uses monthly compounding.';

  const p1 = `Over a ${input.horizonYears}-year horizon, total estimated rent cost is ${fmt(input.totalRentCost)} and total net buy cost (including equity offset) is ${fmt(input.totalBuyCost)}. Net difference: ${fmt(absDiff)} favours ${diffFavors}. Decision: ${decisionLabel}. ${input.breakEvenYear != null ? `Break-even year: Year ${input.breakEvenYear}.` : 'No break-even within the horizon.'}`;

  const p2 = `Monthly ownership cost at closing: ${fmtx(input.monthlyOwnership)} (P+I: ${fmtx(input.monthlyPI)}, taxes/insurance/maint: ${fmtx(input.monthlyOwnership - input.monthlyPI)}). Down payment: ${fmt(input.downPaymentAmt)} (${input.downPaymentPct.toFixed(1)}% of purchase price). Opportunity cost of down payment at ${input.investReturnPct}% assumed return: ${fmt(input.opportunityCost)}. Projected equity at end of horizon: ${fmt(input.equity)}. Top cost driver: ${topDriverLabel[input.topDriver]}. ${compoundNote}`;

  const p3 = `This comparison is a simplified model. Home appreciation (${input.homeGrowthPct}%), rent growth (${input.rentIncrease}%), and investment return (${input.investReturnPct}%) are assumptions, not guarantees. Transaction costs, CMHC/PMI premiums, major repairs, and tax treatment (FHSA, First Home Buyer credits) are not modeled. The decision to buy or rent also involves lifestyle, job stability, and local market conditions not captured here.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers = [
    `Home appreciation of ${input.homeGrowthPct}%/yr builds equity over time -- projected equity of ${fmt(input.equity)} at year ${input.horizonYears} is a key offset against the higher upfront cost of buying.`,
    `Rent growth of ${input.rentIncrease}%/yr compounds over the horizon. At longer horizons, rising rent can make buying more attractive even if early monthly costs are higher.`,
    `Down payment opportunity cost of ${fmt(input.opportunityCost)} (${fmt(input.downPaymentAmt)} at ${input.investReturnPct}%/yr for ${input.horizonYears} yr) represents the foregone investment return by locking capital in a down payment.`,
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'Rent vs Buy Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         regionLabel,
      currency,
      sourceUrl:      'fincalcsmart.com/rent-vs-buy-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'Total Rent Cost',  value: fmt(input.totalRentCost),  accent: 'amber' },
        { label: 'Total Buy Cost',   value: fmt(input.totalBuyCost),   accent: 'teal'  },
        { label: 'Net Difference',   value: fmt(absDiff), sub: `Favours ${diffFavors}`, accent: decisionAccent },
        { label: 'Break-Even Year',  value: input.breakEvenYear != null ? `Year ${input.breakEvenYear}` : 'None in horizon', accent: input.breakEvenYear != null ? 'teal' : 'slate' },
        { label: 'Decision',         value: decisionLabel, accent: decisionAccent },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: {
      title: 'Total Cost Comparison (Rent vs Buy)',
      segments: [
        { label: 'Total Rent Cost', valueFormatted: fmt(input.totalRentCost), pct: rentPct, color: 'amber' },
        { label: 'Total Buy Cost',  valueFormatted: fmt(input.totalBuyCost),  pct: buyPct,  color: 'teal'  },
      ],
      totalFormatted: fmt(input.totalRentCost + input.totalBuyCost),
    },

    insightBlock: {
      title:      'AI-Assisted Rent vs Buy Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Monthly Rent',              value: fmtx(input.monthlyRent) },
        { label: 'Rent Annual Increase',      value: `${input.rentIncrease}%` },
        { label: 'Purchase Price',            value: fmt(input.purchasePrice) },
        { label: 'Down Payment',              value: `${fmt(input.downPaymentAmt)} (${input.downPaymentPct.toFixed(1)}%)` },
        { label: 'Mortgage Rate',             value: `${input.annualRate}%` },
        { label: 'Amortization',              value: `${input.amortization} years` },
        { label: 'Property Tax',              value: `${input.propertyTaxPct}%/yr` },
        { label: 'Insurance + Maintenance',   value: fmtx(input.monthlyInsuranceMaint) + '/mo' },
        { label: 'HOA/Condo Fees',            value: fmtx(input.monthlyHOA) + '/mo' },
        { label: 'Home Appreciation',         value: `${input.homeGrowthPct}%/yr` },
        { label: 'Investment Return (DP)',     value: `${input.investReturnPct}%/yr` },
        { label: 'Closing Costs',             value: `${input.closingCostPct}%` },
        { label: 'Horizon',                   value: `${input.horizonYears} years` },
        { label: 'Region',                    value: regionLabel },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: 'Monthly P+I Payment',    value: fmtx(input.monthlyPI) },
        { label: 'Monthly Ownership Cost', value: fmtx(input.monthlyOwnership), accent: 'amber' },
        { label: 'Total Rent Cost',        value: fmt(input.totalRentCost),  accent: 'amber' },
        { label: 'Total Buy Cost (Net)',   value: fmt(input.totalBuyCost),   accent: 'teal'  },
        { label: 'Net Difference',         value: fmt(absDiff), accent: decisionAccent },
        { label: 'Favours',               value: diffFavors.charAt(0).toUpperCase() + diffFavors.slice(1) },
        { label: 'Break-Even Year',        value: input.breakEvenYear != null ? `Year ${input.breakEvenYear}` : 'None in horizon' },
        { label: 'Projected Equity',       value: fmt(input.equity), accent: 'teal' },
        { label: 'Opportunity Cost (DP)',  value: fmt(input.opportunityCost), accent: 'amber' },
        { label: 'Top Cost Driver',        value: topDriverLabel[input.topDriver] },
        { label: 'Decision',               value: decisionLabel, accent: decisionAccent },
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        `Rent path: cumulative rent payments compounded with ${input.rentIncrease}%/yr annual rent growth over the horizon.`,
        `Buy path: mortgage P+I + property tax + insurance/maintenance + HOA, minus projected equity (based on home appreciation of ${input.homeGrowthPct}%/yr), plus closing costs and opportunity cost of down payment at ${input.investReturnPct}%/yr.`,
        `Break-even year: earliest year where cumulative buy net cost falls below cumulative rent cost. Decision threshold: >5% difference = clear winner; otherwise "Close".`,
        region === 'ca'
          ? 'Canadian mortgage: semi-annual compounding per Interest Act. Effective monthly rate derived from semi-annual equivalent.'
          : 'US mortgage: monthly compounding. Effective monthly rate = annualRate / 12.',
      ],
      notModeled: [
        'CMHC (CA) or PMI (US) mortgage insurance premiums for low down payments.',
        'Tax benefits: mortgage interest deduction (US), First Home Savings Account (CA), or First Home Buyer credits.',
        'Capital gains tax on home sale or principal residence exemption.',
        'Major repairs, renovations, or special assessments beyond the maintenance estimate.',
        'Strata/HOA special levies or reserve fund assessments.',
        'Variable rate resets, mortgage renewal rates, or refinancing scenarios.',
        'Rental income if part of the purchased property is rented.',
      ],
    },

    disclaimer: `This report is for educational and illustrative purposes only. Rent vs. buy projections are based on the assumptions entered and do not reflect actual market conditions, guaranteed appreciation rates, or tax obligations. The decision to rent or buy is highly personal and depends on local market dynamics, income stability, lifestyle goals, and individual financial circumstances not captured in this model. This does not constitute financial, mortgage, or real estate advice. Consult a licensed mortgage professional and a qualified financial advisor before making a purchase decision.`,
  };

  const filename = `fincalc-smart-rent-vs-buy-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildRentVsBuyPDF(input: RentVsBuyAdapterInput): Promise<void> {
  const { data, filename } = buildRentVsBuyReportData(input);
  await generatePDF(data, filename);
}
