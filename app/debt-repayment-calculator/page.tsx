import type { Metadata } from 'next';
import DebtRepaymentCalculator from './DebtRepaymentCalculator';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Debt Repayment Calculator — Pay Off Debt Faster',
  description:
    'See exactly when you\'ll be debt-free and how much interest you\'ll pay. Calculate how extra monthly payments accelerate your payoff — free for Canada and the USA.',
};

// ─── FAQ items ────────────────────────────────────────────────────────────────
// Typed inline — no import from CalculatorLayout.
// These are passed to DebtRepaymentCalculator as a prop and also used for
// the FAQPage JSON-LD schema below.

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'How is my debt payoff date calculated?',
    answer:
      'The calculator uses the standard loan amortisation formula solved for time: n = −ln(1 − r × P ÷ M) ÷ ln(1 + r), where P is your current balance, M is your monthly payment, and r is your monthly interest rate (annual rate ÷ 12). Each month, interest accrues on the outstanding balance first; the remainder of your payment reduces the principal. The simulation runs month by month — including a smaller final payment — to arrive at the exact number of months and total interest paid.',
  },
  {
    question: 'Why does so much of my payment go to interest at first?',
    answer:
      'Because interest is calculated on your outstanding balance each month. When your balance is high, the interest charge is high — leaving less of each payment to reduce the principal. As the balance falls, the interest charge shrinks and an increasing share of each payment goes to principal. This is called amortisation front-loading, and it is why the early months of repayment feel slow: you are paying down a smaller proportion of the balance with each payment.',
  },
  {
    question: 'How much does an extra monthly payment actually save?',
    answer:
      'The impact is larger than most people expect, because every extra dollar of principal reduces the balance on which future interest is calculated. For example, adding $100/month to a $5,000 credit card balance at 19.99% with a $150/month base payment cuts the payoff time roughly in half and saves over $1,200 in interest. The earlier in the repayment period you add the extra amount, the greater the compounding benefit.',
  },
  {
    question: 'What is a good interest rate on personal debt?',
    answer:
      'A common guideline is that consumer debt below 7% can coexist with investing; debt between 7–15% should generally be prioritised for repayment; and debt above 15% — typical of credit cards — is almost always the highest-return "investment" you can make by paying it down. Rates above 30% are associated with high-risk products and typically warrant exploring a balance transfer or consolidation option.',
  },
  {
    question: 'Does this calculator work for Canadian and US debt?',
    answer:
      'Yes — the core debt repayment formula is identical in both countries. Unlike Canadian mortgages (which must use semi-annual compounding under the Interest Act), personal loans, credit cards, and lines of credit in both Canada and the USA compound monthly. The calculator applies the correct monthly compounding formula regardless of your selected region, and swaps currency labels between CAD and USD automatically.',
  },
  {
    question: 'Should I pay off debt before saving or investing?',
    answer:
      'A widely used framework: always capture any employer RRSP or 401(k) match first — that is an immediate 50–100% return. Then pay off high-interest debt (above ~7%) before investing further, since paying down that debt is a guaranteed, tax-free return equal to the interest rate. Once high-interest debt is cleared, building an emergency fund (3–6 months of expenses) and then investing in a diversified portfolio is a common next step. This calculator is for illustrative purposes only; consult a licensed financial advisor for advice specific to your situation.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'Three main assumptions: (1) your interest rate is fixed for the life of the repayment — if your rate changes (e.g. a promotional period ends), your actual payoff date will differ; (2) no new charges are added to the balance after you start — the calculator models a static balance being paid down; and (3) payments are made on the same day each month with no missed payments. Missed payments, variable rates, or new charges will extend your payoff date beyond the estimate shown.',
  },
];

// ─── How It Works (formulaContent) ────────────────────────────────────────────
// Static JSX passed as a prop and rendered by DebtRepaymentCalculator inside
// its How It Works block. Style rules match the locked V2 template:
//   H3: text-sm font-bold text-slate-800 border-l-2 pl-3 #1DB584 border
//   Body: text-sm text-slate-600 leading-relaxed
//   Formula block: background #0A1628, color #1DB584, monospace

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3
        className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3"
        style={{ borderColor: '#1DB584' }}
      >
        The Payoff Formula
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        To find how many months it takes to pay off a balance, we invert the standard
        amortisation formula and solve for <em>n</em> (number of payments):
      </p>
      <div className="overflow-x-auto">
        <div
          className="my-4 p-4 text-center font-mono"
          style={{
            borderRadius: '8px',
            background: '#0A1628',
            color: '#1DB584',
            fontSize: '17px',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          n = −ln(1 − r × P ÷ M) ÷ ln(1 + r)
        </div>
      </div>
      <div
        className="mt-4 overflow-x-auto"
        style={{ borderRadius: '8px', border: '1px solid #E4E9EF' }}
      >
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(29,181,132,0.10)' }}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Variable</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Meaning</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid #E4E9EF' }}>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm font-mono text-slate-700">n</td>
              <td className="px-4 py-2.5 text-sm text-slate-600">Number of monthly payments until the balance reaches zero</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm font-mono text-slate-700">P</td>
              <td className="px-4 py-2.5 text-sm text-slate-600">Current outstanding balance</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm font-mono text-slate-700">M</td>
              <td className="px-4 py-2.5 text-sm text-slate-600">Monthly payment (must be greater than the monthly interest charge)</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-sm font-mono text-slate-700">r</td>
              <td className="px-4 py-2.5 text-sm text-slate-600">Monthly interest rate = annual rate ÷ 12 ÷ 100</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mt-4">
        The calculator runs this formula as a month-by-month simulation so the final (partial)
        payment is handled correctly and total interest is exact rather than approximated.
      </p>
    </section>

    <section>
      <h3
        className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3"
        style={{ borderColor: '#1DB584' }}
      >
        Why Interest Front-Loads
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        Each month, interest is calculated on the <em>current</em> outstanding balance — not the
        original balance. When the balance is large, the interest charge is large, leaving very
        little of each payment to reduce principal.
      </p>
      <p className="text-sm text-slate-600 leading-relaxed">
        For a $5,000 balance at 19.99%, the first payment of $150 includes approximately $83 in
        interest and only $67 toward the balance. As the balance falls, the interest charge shrinks
        and an increasing share of each payment reduces principal — but the process accelerates
        slowly unless payment size increases.
      </p>
    </section>

    <section>
      <h3
        className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3"
        style={{ borderColor: '#1DB584' }}
      >
        How Extra Payments Work
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        Any amount paid above the interest charge reduces the principal directly. A smaller principal
        means less interest next month — which means more of the <em>next</em> payment reduces
        principal, and so on. This compounding effect means even a modest extra payment has a
        disproportionately large impact on total interest and payoff time.
      </p>
      <p className="text-sm text-slate-600 leading-relaxed">
        The calculator always shows what adding $100/month would save compared to your current
        payment, regardless of whether you have entered an extra payment amount. You can also enter
        your own extra payment to see its precise effect.
      </p>
    </section>

    <section>
      <h3
        className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3"
        style={{ borderColor: '#1DB584' }}
      >
        Monthly Compounding — Canada and USA
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        Personal debt — credit cards, personal loans, lines of credit — compounds{' '}
        <strong>monthly</strong> in both Canada and the USA. The monthly rate is simply:
      </p>
      <div className="overflow-x-auto">
        <div
          className="my-3 p-3 text-center font-mono"
          style={{
            borderRadius: '8px',
            background: '#0A1628',
            color: '#1DB584',
            fontSize: '15px',
            fontWeight: 700,
          }}
        >
          r_monthly = annual_rate ÷ 1200
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mt-3">
        This differs from Canadian mortgages, which are required by the{' '}
        <strong>Interest Act (RSC 1985)</strong> to compound semi-annually. That rule does not apply
        to consumer credit products. The formula used in this calculator is correct for both
        countries.
      </p>
    </section>

    <section>
      <h3
        className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3"
        style={{ borderColor: '#1DB584' }}
      >
        Assumptions
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Fixed rate</strong> — the annual interest rate does not change over the repayment period. If your rate is variable or a promotional rate expires, your actual payoff date will differ.</li>
        <li><strong>Static balance</strong> — no new charges are added after repayment begins. The calculator models a closed balance being paid down.</li>
        <li><strong>Consistent monthly payments</strong> — payments are made on the same day each month with no missed or late payments.</li>
        <li><strong>Final partial payment</strong> — the last payment is the exact amount required to clear the remaining balance, which will be less than your regular payment amount.</li>
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

export default function DebtRepaymentCalculatorPage() {
  return (
    <>
      {/*
        ── Single top-shell gradient wrapper ────────────────────────────────────
        Matches the locked V2 page shell (Canadian Mortgage Calculator) exactly.
        ONE background covers: floating nav zone, banner, input+results workspace.
        Blocks below the workspace sit on the flat body colour (#F8FAFB).

        marginTop: '-80px' pulls the div behind the sticky nav (height 80px).
        paddingTop: '80px' compensates so banner text sits at the correct position.
        The nav is sticky z-[500]; the gradient shows through its backdrop-blur.
        ──────────────────────────────────────────────────────────────────────── */}
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

        {/* ── Banner ───────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            Debt Repayment Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Find your debt-free date, see the true cost of your balance, and discover how extra monthly payments can change everything.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Monthly compounding · Extra payment impact · Canada &amp; USA
          </p>
        </div>

        {/* ── Calculator workspace + lower sections ────────────────────────── */}
        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <DebtRepaymentCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>

      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
