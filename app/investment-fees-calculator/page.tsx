import type { Metadata } from 'next';
import InvestmentFeesCalculator from './InvestmentFeesCalculator';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Investment Fees Calculator — Fee Impact on Portfolio Growth',
  description:
    'See how management fees and MERs compound over time to erode your investment returns. Compare your current fee against a lower-cost alternative. Free for Canada and USA.',
};

// ─── FAQ items ────────────────────────────────────────────────────────────────

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'Why do investment fees matter so much over the long term?',
    answer:
      'Investment fees reduce your portfolio balance every year, and that reduction compounds over time. A 1.5% annual fee does not just cost you 1.5% of your starting balance — it reduces your portfolio each year, which means future returns are calculated on a smaller base. Over 20 or 30 years, this compounding effect means you may end up with significantly less than you would have with a lower-cost option, even if the underlying return assumptions are identical. This calculator shows the total impact of fees across your full investment horizon.',
  },
  {
    question: 'What is a MER and how is it different from an annual fee?',
    answer:
      'MER stands for Management Expense Ratio. In Canada, MERs are the standard way mutual fund fees are expressed. In the USA, the equivalent is the expense ratio. Both represent the annual percentage of your investment that is charged to cover the fund\'s operating costs, management fees, and other expenses. The fee is not charged as a direct bill — it is deducted from the fund\'s assets continuously, which reduces the fund\'s reported return by that percentage each year. This calculator uses annual fee % to represent whichever fee structure applies to your investment.',
  },
  {
    question: 'What is the difference between gross and net portfolio value?',
    answer:
      'Gross portfolio value is what your investment would be worth if no fees were deducted at all — it represents the full compound growth of your contributions at the stated return rate. Net portfolio value is what you actually keep after fees are deducted each year. The difference between gross and net is not just the sum of annual fee percentages applied to your contributions — it is larger, because the fees also reduce the base on which future returns compound. This "lost growth" effect is why the total impact of fees is greater than the raw fee percentage suggests.',
  },
  {
    question: 'How is the expected annual return used in this calculator?',
    answer:
      'The expected annual return is treated as the gross return before fees — the return the underlying investments generate before any costs are deducted. The net return applied to your portfolio is this gross return minus the annual fee percentage. For example, if you enter 7% return and 1.5% fee, the calculator assumes your portfolio compounds at approximately 5.5% per year. This is a simplification: in practice, fees are deducted continuously from the fund\'s NAV, and actual market returns vary year to year. The calculator is designed to illustrate the structural impact of fees, not to predict future performance.',
  },
  {
    question: 'What should I use as the Comparison Fee?',
    answer:
      'The comparison fee is a lower-cost alternative to benchmark against — it does not represent a specific fund or product recommendation. A common reference point is 0.20% as a proxy for the fee range of broad-market passive index funds in Canada and the USA, which typically run from 0.03% to 0.25% depending on the provider and asset class. You can enter any fee you are evaluating — for example, if you are comparing a 1.5% active fund with a 0.5% balanced ETF, set the comparison fee to 0.5%.',
  },
  {
    question: 'Does this calculator account for taxes or inflation?',
    answer:
      'No. This calculator shows nominal portfolio growth before tax and before inflation adjustment. Taxes on investment income, capital gains distributions, and withdrawal taxation will vary significantly depending on your account type (RRSP, TFSA, 401(k), taxable brokerage), your tax residency, and your withdrawal strategy. Inflation will reduce the real purchasing power of the figures shown. These factors are intentionally excluded to keep the fee comparison clear and focused. For a full financial plan that accounts for taxes and inflation, consult a qualified financial advisor.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'Four main assumptions: (1) the annual return and fee are constant throughout the investment horizon — actual market returns and fee structures may change over time; (2) monthly contributions are made consistently on the same date each month with no interruptions; (3) no taxes are deducted on growth during the accumulation period; and (4) fees reduce the effective annual return on a continuous basis, modeled here as a net annual compounding rate. Results are estimates intended for educational illustration only.',
  },
];

// ─── How It Works ─────────────────────────────────────────────────────────────

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        The Future Value Formula
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        Both gross and net portfolio values are calculated using the standard future value of a lump sum plus a regular annuity:
      </p>
      <div className="overflow-x-auto">
        <div
          className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '15px', fontWeight: 700, letterSpacing: '0.02em' }}
        >
          FV = P × (1 + r)ⁿ + C × [(1 + r)ⁿ − 1] ÷ r
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
              ['FV', 'Future portfolio value'],
              ['P', 'Initial investment (lump sum)'],
              ['C', 'Monthly contribution'],
              ['r', 'Monthly rate = (1 + net annual rate / 100)^(1/12) − 1'],
              ['n', 'Total months = years invested × 12'],
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
        How Fees Reduce Net Return
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        The net annual return used to calculate your actual portfolio value is the gross return minus the annual fee:
      </p>
      <div className="overflow-x-auto">
        <div
          className="my-3 p-3 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '15px', fontWeight: 700 }}
        >
          net annual rate = gross return % − annual fee %
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mt-3">
        This is applied using monthly compounding. The gross portfolio value uses the full return with no fee deducted.
        The difference between gross and net — <strong>Lost to Fees</strong> — includes not only the direct fees paid
        but also the compound growth that would have been earned on those fee amounts had they remained invested.
        This is why the total fee impact grows disproportionately with both the fee rate and the time horizon.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        How the Fee Drag Score Works
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        The Fee Drag Score (0–100) measures how much fees reduce your long-term portfolio relative to its gross potential:
      </p>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Lost percentage of gross value</strong> — what proportion of the gross portfolio is lost to fees.</li>
        <li>A higher score means lower fee drag. Scores of 80+ reflect very low-cost portfolios; scores below 45 indicate fees are absorbing a significant share of long-term growth.</li>
        <li>The score reflects both the fee rate and the compound effect of the time horizon — a longer investment period amplifies the impact of any given fee.</li>
      </ul>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Assumptions
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Constant return</strong> — the gross annual return does not change over the investment period.</li>
        <li><strong>Constant fee</strong> — the annual fee does not change over the investment period.</li>
        <li><strong>No taxes</strong> — growth is shown before any tax on income or capital gains.</li>
        <li><strong>No inflation adjustment</strong> — values are shown in nominal (today&apos;s) dollars.</li>
        <li><strong>Monthly contributions</strong> — contributions are made consistently each month.</li>
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

export default function InvestmentFeesCalculatorPage() {
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
            Investment Fees Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            See how management fees compound over time to reduce your long-term portfolio value.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Monthly compounding · Fee comparison · Canada &amp; USA
          </p>
        </div>

        {/* ── Calculator ── */}
        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <InvestmentFeesCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
