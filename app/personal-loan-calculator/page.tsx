import type { Metadata } from 'next';
import PersonalLoanCalculator from './PersonalLoanCalculator';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Personal Loan Calculator — Monthly Payment',
  description:
    'Calculate your monthly personal loan payment and total interest cost. Free for Canada and USA. No sign-up required.',
};

// ─── FAQ items ────────────────────────────────────────────────────────────────

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'How is my monthly loan payment calculated?',
    answer:
      'The calculator uses the standard amortising loan formula: M = P × r ÷ (1 − (1 + r)^−n), where P is the loan amount, r is the monthly interest rate (annual rate ÷ 12), and n is the total number of monthly payments. Each month, interest accrues on the outstanding balance first; the remainder of your payment reduces the principal. Because the balance falls each month, the interest portion of each payment shrinks over time while the principal portion grows — this is called amortisation.',
  },
  {
    question: 'What is a good interest rate for a personal loan?',
    answer:
      'A commonly cited benchmark: rates below 10% are considered competitive for borrowers with strong credit; 10–15% is average for good-to-fair credit; rates above 20% are typically associated with weaker credit profiles or higher-risk lenders. In Canada, prime-based personal loans currently range from roughly 8–20% APR. In the USA, rates typically range 7–25% APR depending on the lender and creditworthiness. The best way to evaluate your rate is to compare at least two or three lenders before signing.',
  },
  {
    question: 'Is a shorter or longer loan term better?',
    answer:
      'It depends on your priority. A shorter term means higher monthly payments but significantly less total interest paid — your cost of borrowing is lower. A longer term reduces the monthly payment but you pay more interest over the life of the loan. As a general guideline, choose the shortest term whose monthly payment fits comfortably within your budget. Use the Term Comparison card in this calculator to see the exact trade-off for your specific loan amount and rate.',
  },
  {
    question: 'What is the difference between APR and the interest rate on a personal loan?',
    answer:
      'The stated interest rate is the annual cost of the borrowed principal alone. APR (Annual Percentage Rate) includes the interest rate plus any fees charged by the lender — origination fees, processing fees, mandatory insurance premiums — expressed as a single annual figure. APR is always equal to or higher than the stated rate. This calculator uses the stated interest rate; if your lender charges origination or other fees, your true cost will be slightly higher than shown. Always ask your lender for the APR to compare offers fairly.',
  },
  {
    question: 'Can I pay off a personal loan early without penalty?',
    answer:
      'Many lenders allow early repayment with no penalty, but some charge a prepayment fee — typically 1–3% of the remaining balance or a fixed number of months\' interest. Always check your loan agreement before making a lump-sum payoff. If no penalty applies, paying off early saves exactly the remaining interest that would have accrued. Use the Debt Repayment Calculator to model the impact of extra payments on your payoff timeline.',
  },
  {
    question: 'How does a personal loan affect my debt-to-income ratio?',
    answer:
      'Debt-to-income ratio (DTI) compares your total monthly debt obligations to your gross monthly income. Adding a personal loan increases your monthly debt obligations by the loan\'s monthly payment. A DTI above 36% is considered elevated by many lenders; above 43% may affect your ability to qualify for future credit such as a mortgage. A common guideline is to keep any single consumer loan payment below 15% of gross monthly income. Enter your annual income in this calculator to see how this loan fits within your budget.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'Three main assumptions: (1) the interest rate is fixed for the entire loan term — if your loan has a variable rate, your actual payments will differ; (2) no origination fees, insurance premiums, or other lender charges are included in the payment calculation — these would increase your total cost; and (3) payments are made monthly and on time throughout the term. This calculator is for illustrative purposes only. Consult your lender for exact payment figures and a full cost disclosure.',
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
        Personal loans use the standard amortising payment formula. The monthly payment is fixed for the entire term:
      </p>
      <div className="overflow-x-auto">
        <div
          className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '17px', fontWeight: 700, letterSpacing: '0.02em' }}
        >
          M = P × r ÷ (1 − (1 + r)^−n)
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
              ['M', 'Monthly payment'],
              ['P', 'Loan amount (principal)'],
              ['r', 'Monthly interest rate = annual rate ÷ 12 ÷ 100'],
              ['n', 'Total payments = loan term in years × 12'],
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
        Monthly Compounding — Canada and USA
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        Personal loans compound <strong>monthly</strong> in both Canada and the USA — the monthly rate is simply the
        annual rate divided by 12. This differs from Canadian mortgages, which must use semi-annual compounding under
        the <strong>Interest Act (RSC 1985, c. I-15)</strong>. That rule does not apply to consumer credit products such
        as personal loans, lines of credit, or credit cards.
      </p>
      <div className="overflow-x-auto">
        <div
          className="my-3 p-3 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '15px', fontWeight: 700 }}
        >
          r_monthly = annual_rate ÷ 1200
        </div>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        How the Loan Cost Score Works
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        The Loan Cost Score (0–100) is a composite indicator that reflects two dimensions of borrowing cost:
      </p>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Rate competitiveness (50 pts)</strong> — how your rate compares to typical market ranges for good-credit borrowers.</li>
        <li><strong>Interest cost efficiency (50 pts)</strong> — total interest as a percentage of the amount borrowed. A lower ratio means less is lost to interest charges.</li>
      </ul>
      <p className="text-sm text-slate-600 leading-relaxed mt-3">
        Payment-to-income fit is scored separately in the Affordability card once you enter your annual income — it does not affect the Loan Cost Score above.
        The score is illustrative only — it does not affect the payment calculation and is not used in any lending decision.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Assumptions
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Fixed rate</strong> — the interest rate does not change over the loan term.</li>
        <li><strong>No origination fees</strong> — lender fees, insurance, or other charges are not included in the payment calculation.</li>
        <li><strong>Monthly payments</strong> — payments are made on the same date each month with no missed payments.</li>
        <li><strong>No prepayment penalties</strong> — this calculator does not model early repayment fees.</li>
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

export default function PersonalLoanCalculatorPage() {
  return (
    <>
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(59,130,246,0.10) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(147,197,253,0.14) 0%, transparent 100%)',
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(196,181,253,0.07) 0%, transparent 100%)',
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
            Personal Loan Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Calculate your monthly payment and true cost of borrowing in seconds.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Monthly compounding · Term comparison · Canada &amp; USA
          </p>
        </div>

        {/* ── Calculator ── */}
        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <PersonalLoanCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
