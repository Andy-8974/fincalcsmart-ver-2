import type { Metadata } from 'next';
import SalesTaxCalculator from './SalesTaxCalculator';

export const metadata: Metadata = {
  title: 'Sales Tax Calculator — Add or Remove Tax',
  description:
    'Calculate sales tax on any purchase. Add tax to a pre-tax price or remove tax from a tax-included total. Canada province presets (GST, HST, PST, QST) and manual rate for USA. Free with AI insights.',
};

const faqItems = [
  {
    question: 'What is the difference between Add Tax and Remove Tax mode?',
    answer:
      'Add Tax mode starts with a pre-tax price and calculates the tax and total you will pay at checkout. Remove Tax mode (also called "tax-back" or "reverse tax") starts with a tax-included total and extracts the original pre-tax price and tax amount. Use Remove Tax when you have a receipt total and want to know how much of it was tax.',
  },
  {
    question: 'Why is the "tax share of total" lower than the tax rate?',
    answer:
      'When you remove tax from a tax-included price, the tax is calculated on the pre-tax base — not on the total. For example, at a 13% rate: a $113 total includes $13 of tax, but $13 ÷ $113 = 11.5%, not 13%. The 13% statutory rate applies to the $100 pre-tax base. This is normal and expected — the displayed "tax share of total" reflects the correct math.',
  },
  {
    question: 'How are Canada province rates calculated?',
    answer:
      'Canada preset rates combine all applicable federal and provincial sales taxes into a single percentage. Provinces with HST (Harmonized Sales Tax) use one combined rate (e.g., Ontario 13%, Nova Scotia 14%). Provinces with separate GST and PST/QST show the combined total (e.g., BC: 5% GST + 7% PST = 12%). These are general illustrative rates — always verify for your product type, province, and current tax rules.',
  },
  {
    question: 'Why is there no US state tax database?',
    answer:
      'US sales tax is uniquely complex — rates vary not just by state, but by county, city, and special district. Many states also have product-specific rules: groceries, clothing, medicine, and digital goods may be taxed at different rates or fully exempt. A single-rate database would be inaccurate for most situations. Enter your combined local rate manually for the most accurate result.',
  },
  {
    question: 'Are food, medicine, or digital products taxed differently?',
    answer:
      'Yes — sales tax exemptions and reduced rates vary widely by province and state. Groceries are exempt in some jurisdictions but taxed in others. Prescription medicine is commonly exempt. Digital goods and software have inconsistent treatment across North America. This calculator uses a single rate and does not model product-specific exemptions. Verify with your tax authority for your specific product.',
  },
  {
    question: 'What is GST, HST, PST, and QST?',
    answer:
      'GST (Goods and Services Tax) is the federal Canadian tax, currently 5%. HST (Harmonized Sales Tax) is a combined federal + provincial tax used in Ontario, New Brunswick, Newfoundland & Labrador, Nova Scotia, and Prince Edward Island — ranging from 13% to 15%. PST (Provincial Sales Tax) is a separate provincial tax in BC, Saskatchewan, and Manitoba. QST (Québec Sales Tax) is Québec\'s provincial tax at 9.975%. Alberta, the territories, and Yukon have no provincial sales tax and only charge the 5% GST.',
  },
  {
    question: 'Can I use this calculator for business GST/HST remittance?',
    answer:
      'No. This calculator is for consumer purchase estimates only. Business tax registration, remittance, input tax credits (ITCs), quick method elections, and filing requirements are governed by the Canada Revenue Agency (CRA) and vary based on your business type, revenue, and registration status. Consult the CRA website or a qualified accountant for business tax obligations.',
  },
];

const formulaContent = (
  <div className="space-y-6">
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Add Tax Formula
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        When adding tax to a pre-tax amount, multiply the amount by the tax rate and add the result:
      </p>
      <div className="rounded-xl p-4 font-mono text-sm"
        style={{ background: 'rgba(29,181,132,0.06)', border: '1px solid rgba(29,181,132,0.18)' }}>
        <p style={{ color: '#0D1B2A' }}>Tax = Amount × Rate</p>
        <p style={{ color: '#0D1B2A' }}>Total = Amount + Tax</p>
      </div>
      <p className="text-sm text-slate-500 mt-2">
        Example: $100 at 13% → Tax = $13.00 → Total = $113.00
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Remove Tax Formula
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        When removing tax from a tax-included total, divide by (1 + rate) to recover the pre-tax base:
      </p>
      <div className="rounded-xl p-4 font-mono text-sm"
        style={{ background: 'rgba(29,181,132,0.06)', border: '1px solid rgba(29,181,132,0.18)' }}>
        <p style={{ color: '#0D1B2A' }}>Pre-tax = Total ÷ (1 + Rate)</p>
        <p style={{ color: '#0D1B2A' }}>Tax = Total − Pre-tax</p>
      </div>
      <p className="text-sm text-slate-500 mt-2">
        Example: $113 total at 13% → Pre-tax = $113 ÷ 1.13 = $100.00 → Tax = $13.00
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Tax Share vs Statutory Rate
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">
        In Remove Tax mode, the &quot;tax share of total&quot; is always lower than the statutory rate. This is mathematically correct: the statutory rate (e.g., 13%) applies to the pre-tax base, but the tax share is measured against the total. At 13%, tax is 11.50% of the total — not 13%.
      </p>
    </section>
  </div>
);

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};

export default function SalesTaxCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.09) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(14,165,233,0.07) 0%, transparent 100%)',
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(29,181,132,0.04) 0%, transparent 100%)',
            'linear-gradient(180deg, #f3f7fd 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
          ].join(', '),
        }}
      >
        {/* Banner */}
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            Sales Tax Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Add sales tax to a price or remove tax from a tax-included total. Canada province presets included.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            GST · HST · PST · QST · USA Manual Rate · Canada &amp; USA
          </p>
        </div>

        {/* Calculator */}
        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <SalesTaxCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>
    </>
  );
}
