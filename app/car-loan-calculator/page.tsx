import type { Metadata } from 'next';
import CarLoanCalculator from './CarLoanCalculator';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Car Loan Calculator — Monthly Payment & Total Cost',
  description:
    'Calculate your monthly car loan payment, total interest, and true cost of financing. Free for Canada and USA. No sign-up required.',
};

// ─── FAQ items ────────────────────────────────────────────────────────────────

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'How is my monthly car loan payment calculated?',
    answer:
      'The calculator uses the standard amortising loan formula: M = P × r ÷ (1 − (1 + r)^−n), where P is the amount financed (vehicle price minus down payment), r is the monthly interest rate (annual rate ÷ 12), and n is the number of monthly payments. Each payment covers that month\'s interest first; the remainder reduces your principal balance. Car loans in both Canada and the USA compound monthly — there is no special compounding rule for auto financing.',
  },
  {
    question: 'What is a good interest rate for a car loan?',
    answer:
      'As a general benchmark, new car loan rates below 7% APR are considered competitive for borrowers with good credit; 7–12% is average; rates above 15% typically reflect weaker credit or used-vehicle financing through a dealer. In Canada and the USA, new-vehicle financing through a manufacturer or bank typically ranges 5–12% APR. Used car loans from dealerships can run 8–18% or higher. The single most effective way to lower your rate is to improve your credit score before applying, or to get pre-approved through your own bank or credit union before visiting a dealer.',
  },
  {
    question: 'How much should I put down on a car?',
    answer:
      'A common guideline is 20% for a new car and 10% for a used car. A higher down payment reduces the loan amount, lowers your monthly payment, decreases total interest paid, and reduces the risk of being "underwater" (owing more than the car is worth). New cars depreciate roughly 15–20% in the first year; a meaningful down payment helps ensure your loan balance stays below the vehicle\'s resale value throughout the term.',
  },
  {
    question: 'What car loan term length should I choose?',
    answer:
      'Shorter terms (24–36 months) mean higher monthly payments but significantly less total interest — you pay off the vehicle faster and build equity quickly. Longer terms (60–84 months) reduce the monthly payment but dramatically increase total interest cost and the period during which you may owe more than the car is worth. A practical guideline: choose the shortest term whose monthly payment fits comfortably within your budget. Use the Term Comparison chart in this calculator to see the exact trade-off for your specific loan amount and rate.',
  },
  {
    question: 'Does this calculator include taxes, fees, or insurance?',
    answer:
      'No. This calculator computes the financing cost only — principal plus interest on the amount financed. It does not include sales tax (HST/GST/PST in Canada or state sales tax in the USA), dealer documentation fees, extended warranty costs, gap insurance, or mandatory vehicle insurance. Always ask the dealer for a full out-the-door price and factor those additional costs into your budget before signing.',
  },
  {
    question: 'What is the difference between the vehicle price and the amount financed?',
    answer:
      'The vehicle price is the full purchase price of the car. The amount financed is the portion you borrow: vehicle price minus your down payment. For example, a $35,000 vehicle with a $5,000 down payment results in a $30,000 loan. This calculator uses the amount financed as the loan principal — taxes and fees, if rolled into the loan, would increase this figure and should be added to the vehicle price field for an accurate estimate.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'Three main assumptions: (1) the interest rate is fixed for the entire loan term — if your loan has a promotional or variable rate, actual payments will differ; (2) no origination fees, dealer markups, or other charges are included; (3) payments are made monthly and on time throughout the full term. This calculator is for illustrative purposes only. Request a full payment schedule from your lender before finalising any auto financing agreement.',
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
        Car loans use the standard amortising payment formula. The monthly payment is fixed for the entire term:
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
              ['P', 'Amount financed (vehicle price − down payment)'],
              ['r', 'Monthly interest rate = annual rate ÷ 12 ÷ 100'],
              ['n', 'Total payments = loan term in months'],
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
        Car loans compound <strong>monthly</strong> in both Canada and the USA. The monthly rate is simply
        the annual rate divided by 12. Unlike Canadian mortgages — which must use semi-annual compounding
        under the <strong>Interest Act (RSC 1985, c. I-15)</strong> — auto loans are consumer credit products
        and are not subject to that rule.
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
        How the Borrowing Cost Score Works
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        The Borrowing Cost Score (0–100) reflects the efficiency of your car loan from a pure interest-cost perspective:
      </p>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Rate competitiveness (50 pts)</strong> — how your rate compares to the typical 5–12% APR range for car loans. Rates above 5% receive a graduated deduction.</li>
        <li><strong>Interest cost efficiency (50 pts)</strong> — total interest as a percentage of the amount financed. Lower ratios score higher; longer terms at higher rates score lower.</li>
      </ul>
      <p className="text-sm text-slate-600 leading-relaxed mt-3">
        The score is illustrative only and does not affect the payment calculation or any lending decision.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Assumptions
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Fixed rate</strong> — the interest rate does not change over the loan term.</li>
        <li><strong>No taxes or fees</strong> — sales tax, documentation fees, or dealer charges are not included.</li>
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

export default function CarLoanCalculatorPage() {
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
            Car Loan Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Calculate your monthly payment and true cost of auto financing in seconds.
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
          <CarLoanCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
