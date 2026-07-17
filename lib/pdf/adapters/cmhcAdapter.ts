import type { ReportData } from '../pdfTypes';
import { generatePDF } from '../pdfEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

type EligibilityStatus =
  | 'ineligible_price'
  | 'no_premium'
  | 'below_minimum'
  | 'insured'
  | 'insured_30yr_warn';

export interface CmhcAdapterInput {
  // Inputs
  purchasePrice:   number;
  downPaymentAmt:  number;
  downPaymentPct:  number;
  amortization:    number;   // 25 or 30
  firstTimeBuyer:  boolean;
  newBuild:        boolean;
  // Results
  minDownPayment:  number;
  baseMortgage:    number;
  cmhcRate:        number;   // e.g. 0.04 = 4%
  cmhcPremium:     number;
  totalMortgage:   number;
  downPaymentGap:  number;
  status:          EligibilityStatus;
}

// ─── PDF currency formatters (CA-only) ───────────────────────────────────────

function makePdfFmt(): (n: number) => string {
  const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (n: number) => nf.format(n);
}

function makePdfFmtx(): (n: number) => string {
  const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n: number) => nf.format(n);
}

// ─── Pure data mapper ─────────────────────────────────────────────────────────

export function buildCmhcReportData(
  input: CmhcAdapterInput,
  now = new Date(),
): { data: ReportData; filename: string } {
  const fmt  = makePdfFmt();
  const fmtx = makePdfFmtx();

  const dateStr  = now.toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateFile = now.toISOString().slice(0, 10);
  const rand     = Math.floor(Math.random() * 9000 + 1000);
  const scenarioId = `CMH-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;

  const eligible   = input.status === 'insured' || input.status === 'insured_30yr_warn';
  const ineligible = input.status === 'ineligible_price' || input.status === 'below_minimum';
  const noPremium  = input.status === 'no_premium';

  const statusType: 'success' | 'warning' | 'danger' =
    noPremium                           ? 'success' :
    input.status === 'insured'          ? 'success' :
    input.status === 'insured_30yr_warn' ? 'warning' : 'danger';

  const statusLabel =
    input.status === 'ineligible_price'  ? 'CMHC Ineligible (Price >= $1.5M)' :
    input.status === 'no_premium'        ? 'No Insurance Required (20%+ Down)' :
    input.status === 'below_minimum'     ? 'Below Minimum Down Payment' :
    input.status === 'insured_30yr_warn' ? 'Insured - 30yr Warning' : 'CMHC Insured';

  const cmhcRatePct = (input.cmhcRate * 100).toFixed(2);

  // Composition bar: base mortgage vs CMHC premium (if insured); or down payment vs mortgage
  const totalFinanced = Math.max(input.totalMortgage, 1);
  const basePct   = Math.min(1, Math.max(0, input.baseMortgage  / totalFinanced));
  const premPct   = Math.max(0, 1 - basePct);

  // ── Insight paragraphs ────────────────────────────────────────────────────
  const thirtyYrNote = input.amortization === 30
    ? (input.status === 'insured_30yr_warn'
      ? ' Note: 30-year amortization requires first-time buyer status or new build purchase -- this scenario may not qualify.'
      : ' 30-year amortization applies (first-time buyer or new build confirmed).')
    : '';

  const p1 = eligible
    ? `CMHC mortgage insurance applies: purchase price ${fmt(input.purchasePrice)}, down payment ${fmt(input.downPaymentAmt)} (${input.downPaymentPct.toFixed(1)}%), base mortgage ${fmt(input.baseMortgage)}. CMHC premium rate: ${cmhcRatePct}% = ${fmt(input.cmhcPremium)}. Total insured mortgage: ${fmt(input.totalMortgage)}.${thirtyYrNote}`
    : noPremium
    ? `No CMHC mortgage insurance required. Down payment of ${fmt(input.downPaymentAmt)} (${input.downPaymentPct.toFixed(1)}%) meets or exceeds the 20% threshold on a ${fmt(input.purchasePrice)} purchase. Conventional financing applies.`
    : input.status === 'ineligible_price'
    ? `CMHC mortgage insurance is not available for properties priced at $1,500,000 or more. A minimum 20% down payment (${fmt(input.purchasePrice * 0.20)}) is required as a conventional mortgage. Purchase price: ${fmt(input.purchasePrice)}.`
    : `Down payment of ${fmt(input.downPaymentAmt)} is below the minimum required of ${fmt(input.minDownPayment)} for a ${fmt(input.purchasePrice)} purchase. An additional ${fmt(input.downPaymentGap)} is needed to meet the minimum.`;

  const rateBreakdown = eligible
    ? `CMHC premium rate tiers: 5-9.99% down = 4.00%; 10-14.99% down = 3.10%; 15-19.99% down = 2.80%. Applied rate at ${input.downPaymentPct.toFixed(1)}% down: ${cmhcRatePct}%. The premium is added to the insured mortgage and amortized over the loan term.`
    : noPremium
    ? `At 20%+ down payment, no CMHC premium applies. Savings vs a 5% down scenario: CMHC premium that would have applied = approximately ${fmt(input.baseMortgage * 0.04)} (4% on a 5% down mortgage).`
    : `Minimum down payment rules: 5% on the first $500,000 + 10% on the portion above $500,000 (up to $1,499,999). Properties at or above $1,500,000 require 20% conventional financing and are CMHC ineligible.`;

  const p2 = rateBreakdown;

  const p3 = `CMHC mortgage insurance protects the lender (not the borrower) against default risk. It enables borrowers to purchase with as little as 5% down, with the premium financed into the mortgage. The premium does not reduce your purchase protection or legal rights. First-time buyers may access the 30-year amortization option (confirmed first-time buyer or new build required). PST on the premium applies in some provinces and is paid separately at closing. This calculation covers only the CMHC premium -- land transfer tax, legal fees, home inspection, and title insurance are additional closing costs not modeled here.`;

  // ── Key drivers ───────────────────────────────────────────────────────────
  const keyDrivers = eligible ? [
    `Down payment of ${input.downPaymentPct.toFixed(1)}% places this mortgage in the ${cmhcRatePct}% CMHC rate tier. Increasing the down payment to the next tier threshold could reduce the premium.`,
    `CMHC premium of ${fmt(input.cmhcPremium)} is added to the mortgage balance and amortized. At a typical mortgage rate, the total interest cost on the premium itself can be significant over the full amortization.`,
    `Total insured mortgage of ${fmt(input.totalMortgage)} is the base for all future monthly payment calculations. Use the mortgage calculator to determine monthly P+I based on this insured amount.`,
  ] : noPremium ? [
    `With 20%+ down, no CMHC premium applies -- saving the premium (typically 2.80-4.00% of the base mortgage) reduces total mortgage cost.`,
    `Conventional financing (20%+ down) may qualify for slightly different lender rates and does not require CMHC approval for the lender's underwriting process.`,
    `A larger down payment also reduces the total interest paid over the amortization by starting with a lower principal balance.`,
  ] : [
    `Minimum down payment for ${fmt(input.purchasePrice)}: ${fmt(input.minDownPayment)} (${((input.minDownPayment / input.purchasePrice) * 100).toFixed(1)}% of purchase price). Current shortfall: ${fmt(input.downPaymentGap)}.`,
    `For homes priced above $500,000, the blended minimum is above 5% because the portion above $500K requires 10% down. Saving the additional ${fmt(input.downPaymentGap)} is the required action to qualify.`,
    `Government programs such as the First Home Savings Account (FHSA) or Home Buyers' Plan (RRSP) may help accelerate down payment accumulation.`,
  ];

  // ── Assemble ReportData ───────────────────────────────────────────────────
  const data: ReportData = {
    header: {
      brandName:      'FinCalc Smart',
      calculatorName: 'CMHC Mortgage Insurance Calculator',
      reportSubtitle: 'Personal Financial Scenario Report',
      generatedAt:    dateStr,
      scenarioId,
      region:         'Canada',
      currency:       'CAD',
      sourceUrl:      'fincalcsmart.com/cmhc-mortgage-insurance-calculator',
    },

    executiveSummary: {
      metrics: [
        { label: 'Purchase Price',   value: fmt(input.purchasePrice) },
        { label: 'Down Payment',     value: `${fmt(input.downPaymentAmt)} (${input.downPaymentPct.toFixed(1)}%)` },
        { label: 'CMHC Premium',     value: eligible ? fmt(input.cmhcPremium) : 'N/A', accent: eligible ? 'amber' : 'slate' },
        { label: 'Total Mortgage',   value: eligible ? fmt(input.totalMortgage) : fmt(input.baseMortgage), accent: 'teal' },
        { label: 'Status',           value: statusLabel, accent: ineligible ? 'red' : noPremium ? 'teal' : eligible ? 'teal' : 'amber' },
      ],
      statusLabel,
      statusType,
    },

    compositionBar: eligible ? {
      title: 'Insured Mortgage Breakdown',
      segments: [
        { label: 'Base Mortgage',  valueFormatted: fmt(input.baseMortgage),  pct: basePct, color: 'teal'  },
        { label: 'CMHC Premium',   valueFormatted: fmt(input.cmhcPremium),   pct: premPct, color: 'amber' },
      ],
      totalFormatted: fmt(input.totalMortgage),
    } : {
      title: 'Down Payment vs Purchase Price',
      segments: [
        { label: 'Down Payment', valueFormatted: fmt(input.downPaymentAmt),                       pct: Math.min(1, input.downPaymentPct / 100), color: 'teal'  },
        { label: 'Financed',     valueFormatted: fmt(input.purchasePrice - input.downPaymentAmt), pct: Math.max(0, 1 - input.downPaymentPct / 100), color: 'slate' },
      ],
      totalFormatted: fmt(input.purchasePrice),
    },

    insightBlock: {
      title:      'CMHC Mortgage Insurance Summary',
      paragraphs: [p1, p2, p3],
    },

    inputs: {
      title: 'Inputs & Assumptions',
      rows: [
        { label: 'Purchase Price',      value: fmt(input.purchasePrice) },
        { label: 'Down Payment',        value: `${fmt(input.downPaymentAmt)} (${input.downPaymentPct.toFixed(1)}%)` },
        { label: 'Amortization',        value: `${input.amortization} years` },
        { label: 'First-Time Buyer',    value: input.firstTimeBuyer ? 'Yes' : 'No' },
        { label: 'New Build',           value: input.newBuild ? 'Yes' : 'No' },
        { label: 'Region',              value: 'Canada' },
      ],
    },

    results: {
      title: 'Detailed Results',
      rows: [
        { label: 'Eligibility Status',   value: statusLabel, accent: ineligible ? 'red' : 'teal' },
        { label: 'Minimum Down Payment', value: fmt(input.minDownPayment) },
        { label: 'Down Payment Gap',     value: input.downPaymentGap > 0 ? fmt(input.downPaymentGap) : 'None', accent: input.downPaymentGap > 0 ? 'red' : 'teal' },
        { label: 'Base Mortgage',        value: fmt(input.baseMortgage) },
        ...(eligible ? [
          { label: 'CMHC Rate',          value: `${cmhcRatePct}%`, accent: 'amber' as const },
          { label: 'CMHC Premium',       value: fmt(input.cmhcPremium), accent: 'amber' as const },
          { label: 'Total Insured Mortgage', value: fmt(input.totalMortgage), accent: 'teal' as const },
        ] : []),
      ],
    },

    keyDrivers,

    methodology: {
      whatItDoes: [
        'CMHC eligibility: purchase price must be below $1,500,000 and down payment must meet the sliding minimum (5% on first $500K + 10% on remainder up to $1.5M).',
        'CMHC premium rate tiers (applied to base mortgage = purchase price - down payment): 5-9.99% down = 4.00%; 10-14.99% down = 3.10%; 15-19.99% down = 2.80%. 20%+ down = no premium.',
        '30-year amortization is available for CMHC-insured mortgages only when the borrower is a first-time homebuyer or purchasing a new build, per CMHC guidelines.',
        'Total insured mortgage = base mortgage + CMHC premium. The premium is added to the principal and amortized over the loan term.',
      ],
      notModeled: [
        'Provincial sales tax that may apply to the CMHC premium (CMHC currently identifies Ontario, Quebec and Saskatchewan; confirm current treatment with your lender or insurer) -- paid separately at closing, not financed.',
        'Monthly mortgage payment (P+I) -- use the mortgage calculator with the total insured mortgage as the principal.',
        'CMHC First Home Buyer Incentive or any government shared-equity programs.',
        'Lender-specific rate differences between insured and conventional mortgages.',
        'Land transfer tax, legal fees, home inspection, title insurance, or other closing costs.',
        'Mortgage insurance from Sagen or Canada Guaranty (alternative CMHC-equivalent insurers).',
      ],
    },

    disclaimer: 'This report is for educational and illustrative purposes only. CMHC premium rates, eligibility rules, and amortization limits are based on guidelines in effect at the time this calculator was built and may be subject to change. This does not constitute mortgage advice, CMHC approval, or lender pre-approval. Consult a licensed mortgage professional or broker for a formal mortgage assessment and current CMHC premium rates.',
  };

  const filename = `fincalc-smart-cmhc-report-${dateFile}.pdf`;
  return { data, filename };
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function buildCmhcPDF(input: CmhcAdapterInput): Promise<void> {
  const { data, filename } = buildCmhcReportData(input);
  await generatePDF(data, filename);
}
