import type { Metadata } from 'next';
import MortgageRefinanceCalculator from './MortgageRefinanceCalculator';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Mortgage Refinance Calculator — Break-even & Savings',
  description:
    'Find out if refinancing your mortgage makes financial sense. Calculate monthly savings, break-even timeline, and total interest impact for USA and Canada.',
};

// ─── FAQ items ────────────────────────────────────────────────────────────────

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'How does the mortgage refinance calculator work?',
    answer:
      'Enter your current mortgage balance, interest rate, and years remaining. Then enter the new interest rate and amortization you are considering. The calculator computes the estimated monthly payment for both scenarios and shows you the monthly savings (or increase), how many months until you break even on the refinance costs, and total interest impact over your chosen comparison horizon.',
  },
  {
    question: 'What is a break-even point and why does it matter?',
    answer:
      'The break-even point is the number of months it takes for your cumulative monthly savings to fully recover the upfront cost of refinancing (legal fees, prepayment penalty, appraisal, etc.). If you plan to move, sell, or refinance again before that point, the costs may exceed the savings. The longer you stay in the home after break-even, the more you benefit.',
  },
  {
    question: 'Does extending my amortization always save money?',
    answer:
      'Not necessarily. Extending the amortization (e.g., resetting to 25 years when 15 remain) lowers the monthly payment, but you make mortgage payments for a longer period. This can increase the total lifetime interest paid even if the rate is lower. The calculator flags this as a Term Extension Warning and shows the interest impact over your comparison horizon.',
  },
  {
    question: 'What is cash-out refinancing?',
    answer:
      'Cash-out refinancing means borrowing more than your current mortgage balance — drawing on your home equity. The extra funds are added to the new mortgage principal, which increases your monthly payment and total interest. Enter the cash-out amount in the calculator to see how it affects your break-even and net savings.',
  },
  {
    question: 'What refinance costs should I include?',
    answer:
      'In Canada, common costs include a prepayment penalty (often 3 months\' interest or Interest Rate Differential — whichever is greater for fixed-rate mortgages), legal or notary fees ($1,000–$2,500), mortgage discharge fees, and possibly a new appraisal ($300–$600). In the US, closing costs typically include origination fees, appraisal, title search, and recording fees — often 2–5% of the loan amount. Enter your total estimated cost as a single figure.',
  },
  {
    question: 'Are interest rate compounding rules different in Canada?',
    answer:
      'Yes. Canadian mortgages are compounded semi-annually (twice per year) by law under the Interest Act, while US mortgages compound monthly. The calculator automatically applies semi-annual compounding for Canadian scenarios and monthly compounding for US scenarios when you switch the region toggle.',
  },
  {
    question: 'Does this calculator include CMHC insurance or PMI?',
    answer:
      'No. Mortgage default insurance premiums are not included. If your refinanced loan exceeds 80% loan-to-value in Canada, CMHC (or Sagen/Canada Guaranty) premiums may apply. In the US, PMI requirements depend on lender terms. Use the CMHC Mortgage Insurance Calculator on this site to estimate Canadian premiums separately.',
  },
  {
    question: 'How accurate are the payment estimates?',
    answer:
      'The payment figures are mathematical estimates based on principal, interest rate, and amortization period. Actual lender quotes may differ due to payment frequency adjustments, rounding conventions, property tax or insurance escrow, or lender-specific fee structures. Use this calculator to guide your decision, then confirm exact figures with your lender or mortgage broker.',
  },
];

// ─── How It Works ─────────────────────────────────────────────────────────────

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        The Payment Formula
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        The calculator uses the standard fixed-rate amortization formula to compute estimated monthly payments for both the current and new mortgage:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '17px', fontWeight: 700, letterSpacing: '0.02em' }}>
          P = principal × [r(1+r)ⁿ] ÷ [(1+r)ⁿ − 1]
        </div>
      </div>
      <div className="mt-4 overflow-x-auto" style={{ borderRadius: '8px', border: '1px solid #E4E9EF' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(29,181,132,0.10)' }}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Variable</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Meaning</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid #E4E9EF' }}>
            {[
              ['P', 'Monthly payment'],
              ['principal', 'Loan balance (current balance + cash-out)'],
              ['r', 'Monthly interest rate (see compounding rules below)'],
              ['n', 'Total payments = amortization years × 12'],
            ].map(([v, d]) => (
              <tr key={v} style={{ borderBottom: '1px solid #F1F4F7' }}>
                <td className="px-4 py-2.5 text-sm font-mono text-slate-700">{v}</td>
                <td className="px-4 py-2.5 text-sm text-slate-600">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Canadian vs. US Compounding
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        Canadian mortgages must use semi-annual compounding under the{' '}
        <strong>Interest Act (RSC 1985, c. I-15)</strong>. The effective monthly rate is derived from the
        semi-annual equivalent:
      </p>
      <div className="overflow-x-auto">
        <div className="my-3 p-3 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700 }}>
          r_CA = (1 + annualRate / 200)^(1/6) − 1
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mt-3">
        US mortgages compound monthly, so the monthly rate is simply{' '}
        <span className="font-mono">annualRate / 1200</span>. The calculator switches between the two
        automatically based on the region toggle.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Break-even &amp; Net Savings
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        <strong>Break-even months</strong> = Refinance costs ÷ Monthly savings. If savings ≤ 0, there is no break-even. If refinance costs are zero, break-even is immediate.
      </p>
      <p className="text-sm text-slate-600 leading-relaxed">
        <strong>Net savings over horizon</strong> = (Monthly savings × horizon months) − Refinance costs. Total interest over the horizon is calculated month-by-month for both loans, so the comparison remains accurate even if one loan would be fully paid off before the horizon ends.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Assumptions
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Fixed interest rate</strong> — the rate does not change over the loan term.</li>
        <li><strong>Monthly payments</strong> — payments made on the same date each month.</li>
        <li><strong>No CMHC/PMI</strong> — mortgage default insurance is not included.</li>
        <li><strong>No tax deduction</strong> — mortgage interest deductibility is not modelled.</li>
        <li><strong>Refinance costs are lump-sum</strong> — entered as a single upfront figure.</li>
      </ul>
    </section>

  </div>
);

// ─── FAQ JSON-LD ──────────────────────────────────────────────────────────────

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MortgageRefinanceCalculatorPage() {
  return (
    <>
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.08) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(59,130,246,0.07) 0%, transparent 100%)',
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(196,181,253,0.05) 0%, transparent 100%)',
            'linear-gradient(180deg, #f3f7fd 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
          ].join(', '),
        }}
      >
        {/* ── Banner ── */}
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            Mortgage Refinance Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Estimate monthly savings, break-even timeline, and total interest impact before refinancing.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Semi-annual compounding for Canada · Monthly compounding for USA · Break-even analysis
          </p>
        </div>

        {/* ── Calculator ── */}
        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <MortgageRefinanceCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
