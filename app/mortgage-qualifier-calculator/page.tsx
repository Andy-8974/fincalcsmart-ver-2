import type { Metadata } from 'next';
import { type Faq } from '@/components/layout/CalculatorLayout';
import MortgageQualifierCalculator from './MortgageQualifierCalculator';

export const metadata: Metadata = {
  title: 'Mortgage Qualifier Calculator 2025 — Canada & USA',
  description:
    'Find out how much mortgage you qualify for in Canada or the USA. Instant GDS/TDS and 28/36 ratio analysis with B-20 stress test. No sign-up.',
  alternates: {
    canonical: 'https://fincalcsmart.com/mortgage-qualifier-calculator',
  },
  openGraph: {
    title: 'Mortgage Qualifier Calculator 2025 — Canada & USA',
    description:
      'Find out how much mortgage you qualify for in Canada or the USA. Instant GDS/TDS and 28/36 ratio analysis with B-20 stress test.',
    url: 'https://fincalcsmart.com/mortgage-qualifier-calculator',
    siteName: 'FinCalcSmart Pro',
    type: 'website',
  },
};

const faqs: Faq[] = [
  {
    question: 'What is a GDS ratio?',
    answer:
      'The Gross Debt Service (GDS) ratio is the percentage of your gross monthly income required to cover housing costs — principal and interest, property tax, heating costs, and 50% of condo fees if applicable. Canadian lenders cap GDS at 32% for insured mortgages (less than 20% down) and up to 39% for conventional mortgages. Staying below 28% is generally considered financially comfortable.',
  },
  {
    question: 'What is a TDS ratio?',
    answer:
      'The Total Debt Service (TDS) ratio includes all housing costs from the GDS calculation plus every other monthly debt obligation — car loans, student loans, credit card minimum payments, and lines of credit. Canadian lenders limit TDS to 44% of gross monthly income. A TDS below 36% signals a healthy debt load. Reducing non-mortgage debts before applying is one of the most effective ways to increase your qualifying mortgage amount.',
  },
  {
    question: 'What is the 28/36 rule in the USA?',
    answer:
      'US lenders use the 28/36 qualifying rule: your total housing costs (principal, interest, property taxes, and insurance — called PITI) should not exceed 28% of gross monthly income, known as the front-end ratio. All debt payments combined, including housing, should not exceed 36%, known as the back-end ratio. Exceeding either threshold can result in a loan denial, though FHA and VA loans allow higher ratios with compensating factors like strong credit or larger down payments.',
  },
  {
    question: 'What is the Canadian B-20 stress test?',
    answer:
      "The OSFI B-20 guideline requires all mortgage applicants at federally regulated lenders to qualify at the higher of their contract rate plus 2%, or 5.25%. If a lender offers you 5.50%, you must demonstrate you can afford payments at 7.50%. This ensures borrowers can handle rate increases at renewal. The stress test applies regardless of down payment size and cannot be avoided by choosing a shorter term. This calculator applies the stress test automatically for Canadian qualification calculations.",
  },
  {
    question: 'How is the maximum mortgage calculated?',
    answer:
      'This calculator works backwards from your income and debts using an inverse amortization formula. First, it determines your maximum allowable monthly payment by multiplying gross monthly income by the applicable ratio limit (32% GDS or 44% TDS for Canada; 28% or 36% for the USA), then subtracting taxes, heating, and other debts. In Canada, the stress-tested rate is used for this reverse calculation, then the contract rate is applied to find the actual mortgage principal you can carry.',
  },
  {
    question: 'How does qualifying differ between Canada and the USA?',
    answer:
      "Canada uses GDS and TDS ratios with the OSFI B-20 stress test, semi-annual compounding under the Interest Act, and CMHC mortgage default insurance for down payments under 20%. The USA uses front-end and back-end ratios under the 28/36 rule with monthly compounding and no mandatory stress test — though lenders do evaluate debt-to-income ratios carefully. Canadian qualification tends to be more conservative due to the stress test, which can reduce the qualifying amount by 15–20% compared to the contract rate alone.",
  },
  {
    question: 'What counts as income for mortgage qualification?',
    answer:
      'Lenders count gross employment income, self-employment income (typically a 2-year average), rental income (usually 50–80% of gross rents), pension and CPP/OAS income, and certain investment income. Commission and bonus income may be averaged over 2 years. Overtime is often discounted unless it is guaranteed. For this calculator, enter your total provable gross annual household income from all qualifying sources.',
  },
  {
    question: 'What can I do if I do not qualify for the mortgage I want?',
    answer:
      "Several strategies can improve qualification: paying down revolving debts (credit cards, lines of credit) reduces your TDS ratio the fastest since these have high minimum payments relative to their balances. Adding a co-borrower increases qualifying income. Increasing your down payment to 20% removes CMHC insurance, lowering the loan amount. Extending your amortization period to 30 years (for conventional mortgages) reduces the required monthly payment. Shopping for a slightly lower rate also meaningfully increases your qualifying mortgage amount.",
  },
];

const formulaSection = (
  <div className="space-y-6">
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Canada — GDS &amp; TDS Ratios with B-20 Stress Test
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        Canadian lenders use two debt-service ratios to qualify borrowers. The stress test requires qualifying at the higher of your contract rate + 2% or 5.25% — this calculator applies it automatically.
      </p>
      <div className="overflow-x-auto">
        <div
          className="my-4 p-4 font-mono text-sm leading-loose"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584' }}
        >
          {'GDS = (P&I + Property Tax + Heating) / Gross Monthly Income × 100'}{'\n\n'}
          {'TDS = (GDS components + All Other Debts) / Gross Monthly Income × 100'}{'\n\n'}
          {'Stress Rate = max(Contract Rate + 2%, 5.25%)'}
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        GDS limit: 32% (insured, &lt;20% down) · 39% (conventional). TDS limit: 44% for all borrowers.
        Semi-annual compounding applies per the Canadian <em>Interest Act</em>.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        USA — 28/36 Rule (Front-End / Back-End)
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        US lenders evaluate two ratios using the contract rate directly — there is no mandatory stress test.
        Monthly compounding applies.
      </p>
      <div className="overflow-x-auto">
        <div
          className="my-4 p-4 font-mono text-sm leading-loose"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584' }}
        >
          {'Front-End = (P&I + Tax + Insurance) / Gross Monthly Income × 100   ≤ 28%'}{'\n\n'}
          {'Back-End  = (Housing + All Other Debts) / Gross Monthly Income × 100   ≤ 36%'}
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        Where P&amp;I is the principal and interest payment at the contract rate with monthly compounding.
        FHA loans allow up to 31% / 43%; VA loans can exceed 41% back-end with residual income.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Inverse Mortgage Formula — How Maximum Mortgage Is Derived
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        To find the maximum mortgage, the calculator first determines the largest monthly P&amp;I payment
        your income and debts allow, then reverses the amortization formula to solve for principal:
      </p>
      <div className="overflow-x-auto">
        <div
          className="my-4 p-4 font-mono text-sm leading-loose"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584' }}
        >
          {'Max Monthly P&I = (Income × Ratio Limit) − Tax − Heating − Other Debts'}{'\n\n'}
          {'Max Mortgage = Max P&I × [(1 − (1 + r)^−n) / r]'}{'\n\n'}
          {'r = monthly rate  ·  n = amortization months'}
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        In Canada, the stress-test rate is used to compute Max P&amp;I (conservative qualification), then the
        actual contract rate is applied in the final formula to determine the mortgage principal you can carry.
        This mirrors what federally regulated lenders do in practice.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Canada vs USA — Quick Comparison
      </h3>
      <div
        className="mt-4 overflow-x-auto"
        style={{ borderRadius: '8px', border: '1px solid #E4E9EF' }}
      >
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(29,181,132,0.10)' }}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Feature</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Canada</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">USA</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid #E4E9EF' }}>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">Housing ratio</td>
              <td className="px-4 py-2.5 text-sm text-slate-700">GDS ≤ 32% / 39%</td>
              <td className="px-4 py-2.5 text-sm text-slate-700">Front-end ≤ 28%</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">Total debt ratio</td>
              <td className="px-4 py-2.5 text-sm text-slate-700">TDS ≤ 44%</td>
              <td className="px-4 py-2.5 text-sm text-slate-700">Back-end ≤ 36%</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">Stress test</td>
              <td className="px-4 py-2.5 text-sm text-slate-700">Yes — rate + 2% or 5.25%</td>
              <td className="px-4 py-2.5 text-sm text-slate-700">No mandatory test</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">Compounding</td>
              <td className="px-4 py-2.5 text-sm text-slate-700">Semi-annual (Interest Act)</td>
              <td className="px-4 py-2.5 text-sm text-slate-700">Monthly</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-sm text-slate-600">Mortgage insurance</td>
              <td className="px-4 py-2.5 text-sm text-slate-700">CMHC required &lt;20% down</td>
              <td className="px-4 py-2.5 text-sm text-slate-700">PMI required &lt;20% down</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
);

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};

export default function MortgageQualifierPage() {
  return (
    <>
      {/*
        ── Single top-shell gradient wrapper ────────────────────────────────────
        Matches Canadian/US Mortgage Calculator V2 page shell exactly.
        ONE background covers: floating nav zone, banner, workspace (Blocks A+B).
        Blocks C–G sit on the flat body colour (#F8FAFB).
        ──────────────────────────────────────────────────────────────────────── */}
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.10) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(147,197,253,0.14) 0%, transparent 100%)',
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(196,181,253,0.07) 0%, transparent 100%)',
            'linear-gradient(180deg, #f3faf8 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
          ].join(', '),
        }}
      >
        {/* ── Banner ── */}
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            Mortgage Qualifier Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Find out exactly how much home you qualify for — Canada (GDS/TDS + B-20) or USA (28/36 rule).
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            GDS/TDS · B-20 stress test · 28/36 DTI rule · Canada &amp; USA
          </p>
        </div>

        {/* ── Calculator workspace + lower sections ── */}
        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <MortgageQualifierCalculator formulaContent={formulaSection} faqItems={faqs} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
