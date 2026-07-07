import type { Metadata } from 'next';
import { type Faq } from '@/components/layout/CalculatorLayout';
import RentVsBuyCalculator from './RentVsBuyCalculator';

export const metadata: Metadata = {
  title: 'Rent vs Buy Calculator 2025 | Break-even Analysis',
  description:
    'Compare the true long-term cost of renting versus buying a home. See estimated break-even year, equity built, and what drives the decision — Canada and USA.',
};

const faqs: Faq[] = [
  {
    question: 'How does this rent vs buy calculator work?',
    answer:
      'The calculator runs a year-by-year comparison. Rent costs grow by your assumed annual rent increase. Buy costs include mortgage principal & interest, property tax, insurance, maintenance, and HOA fees — offset by estimated equity built through home appreciation and mortgage paydown. The "net buy cost" equals total cash paid out minus estimated equity. The year when net buy cost dips below cumulative rent is the break-even point.',
  },
  {
    question: 'What is "net buy cost" and why is equity subtracted?',
    answer:
      'Net buy cost = total cash paid (closing costs + down payment + all ownership costs) minus estimated equity accumulated (home appreciation + mortgage principal paid). Equity is subtracted because it represents real wealth built — unlike rent, which leaves no residual asset. This approach allows a fair cost comparison between the two paths.',
  },
  {
    question: 'Does this calculator include CMHC insurance or PMI?',
    answer:
      'No. For V1 simplicity, mortgage default insurance (CMHC in Canada) and private mortgage insurance (PMI in the US) are not included in the buy cost estimate. If your down payment is under 20%, a note appears to remind you that insurance may apply. Use the CMHC Insurance Calculator for a Canadian premium estimate.',
  },
  {
    question: 'What closing costs should I enter?',
    answer:
      'Closing costs vary significantly by province and state. A typical range in Canada is 1.5%–4% of the purchase price (land transfer tax, legal fees, title insurance, inspections). In the US, 2%–5% is common. The calculator defaults to 1.5% as a conservative estimate — enter a more accurate figure for your location for better results.',
  },
  {
    question: 'What home value growth rate should I use?',
    answer:
      'Home appreciation varies widely by city, period, and property type. National Canadian averages have ranged from roughly 3%–7% annually over long periods, with significant volatility. US markets show similar variation. The default of 3% is conservative. The calculator is highly sensitive to this assumption — try different values to see how much the break-even shifts.',
  },
  {
    question: 'Why is the investment return % included but not subtracted from rent cost?',
    answer:
      'The investment return assumption represents what a renter could earn by investing the down payment instead of using it to buy. It appears in the Equity vs Flexibility insight card as context — not as a deduction from rent cost. Subtracting it from rent would require assuming the renter actually invests the full amount at a guaranteed return, which is speculative. Showing it separately is more transparent.',
  },
];

const formulaSection = (
  <div className="space-y-6">
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        How Net Buy Cost Is Calculated
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        The calculator computes a net buy cost by summing all cash paid out and subtracting estimated equity:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono" style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.8 }}>
          Net Buy Cost = Closing Costs + Down Payment<br />
          + (Monthly Ownership × Months) − Equity Built
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        Equity Built = Home Value at Horizon − Remaining Mortgage Balance. Home value grows annually at the assumed appreciation rate. The remaining balance decreases as monthly mortgage payments chip away at principal.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Monthly Ownership Cost
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">
        Monthly ownership = Principal & Interest + Property Tax + Insurance & Maintenance + Condo/HOA Fee. Principal & Interest is calculated using the standard amortization formula with Canadian semi-annual compounding or US monthly compounding depending on the active region.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Rent Cost Over Time
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">
        Cumulative rent is computed year-by-year, growing at the annual rent increase rate entered. This models the compounding effect of rent inflation on total housing cost over the selected horizon.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Break-even Year
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">
        The break-even year is the first year in which cumulative net buy cost falls below cumulative rent cost. Before break-even, renting is lower net-cost. After break-even, buying is lower net-cost (at these assumptions). If break-even is not reached within the selected horizon, renting remains cheaper throughout under the entered assumptions.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Key Assumptions and Limitations
      </h3>
      <ul className="space-y-2 text-sm text-slate-600">
        <li className="flex gap-2"><span className="shrink-0 font-semibold text-slate-700">Appreciation:</span> Home value grows at a constant annual rate. Actual markets are volatile and path-dependent.</li>
        <li className="flex gap-2"><span className="shrink-0 font-semibold text-slate-700">Maintenance:</span> Insurance and maintenance are entered as a flat monthly estimate. Real costs vary and tend to increase with home age.</li>
        <li className="flex gap-2"><span className="shrink-0 font-semibold text-slate-700">Mortgage insurance:</span> CMHC (Canada) or PMI (US) for down payments under 20% is not included. This understates buy cost for low-down-payment scenarios.</li>
        <li className="flex gap-2"><span className="shrink-0 font-semibold text-slate-700">Taxes:</span> Capital gains tax on sale, income tax on investment returns, and property transfer tax are not modelled.</li>
        <li className="flex gap-2"><span className="shrink-0 font-semibold text-slate-700">Sale costs:</span> Realtor commissions (typically 3%–5%) on a future home sale are not included in the buy cost calculation.</li>
      </ul>
    </section>
  </div>
);

export default function RentVsBuyCalculatorPage() {
  return (
    <>
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.13) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(147,197,253,0.17) 0%, transparent 100%)',
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(196,181,253,0.09) 0%, transparent 100%)',
            'linear-gradient(180deg, #f3faf8 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
          ].join(', '),
        }}
      >
        {/* Banner */}
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            Rent vs. Buy Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Compare the estimated long-term cost of renting versus buying, see your break-even year, and understand what drives the decision.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Canada &amp; USA · Break-even analysis · Equity vs. flexibility
          </p>
        </div>

        {/* Calculator */}
        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <RentVsBuyCalculator formulaContent={formulaSection} faqItems={faqs} />
        </div>
      </div>
    </>
  );
}
