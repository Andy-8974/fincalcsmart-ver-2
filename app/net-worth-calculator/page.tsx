import type { Metadata } from 'next';
import NetWorthCalculator from './NetWorthCalculator';

export const metadata: Metadata = {
  title: 'Net Worth Calculator — Assets, Liabilities & Balance Sheet',
  description:
    'Calculate your total net worth, debt-to-asset ratio, and liquidity position. Understand your balance sheet and which area may need attention. Free for Canada and USA.',
};

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'What is net worth and how is it calculated?',
    answer:
      'Net worth is the difference between everything you own (assets) and everything you owe (liabilities). The formula is: Net Worth = Total Assets − Total Liabilities. A positive net worth means your assets exceed your debts. A negative net worth means you owe more than you own, which is common early in life or after large borrowing.',
  },
  {
    question: 'What should I include in assets?',
    answer:
      'Assets include anything of financial value you own: cash in bank accounts, savings, GICs, or money-market funds (Cash & Savings); RRSP, TFSA, 401(k), pension, or non-registered investment accounts (Investments / Retirement); the current estimated market value of any real property you own (Home / Real Estate Value); and vehicles, jewellery, collectibles, or other tangible items of value (Vehicles & Other Assets). Use current estimated values, not purchase prices.',
  },
  {
    question: 'What should I include in liabilities?',
    answer:
      'Liabilities include any outstanding debts: the remaining balance owed on your mortgage (Mortgage Balance); the outstanding balances on personal loans, lines of credit, student loans, and credit cards (Loans & Credit Cards); and any other debts such as tax owed, medical debt, or family loans (Other Debts). Use current outstanding balances, not original loan amounts.',
  },
  {
    question: 'What is the debt-to-asset ratio?',
    answer:
      'The debt-to-asset ratio measures what percentage of your total assets are financed by debt. It is calculated as: (Total Liabilities ÷ Total Assets) × 100. A ratio below 25% generally indicates a lower debt load. Between 25–50% is moderate. Above 50% means more than half your assets are debt-financed, which may warrant attention depending on your overall situation. This is an educational measure — context such as income, asset type, and life stage all matter.',
  },
  {
    question: 'What does liquid assets percentage mean?',
    answer:
      'Liquid assets are assets you can access quickly without significant loss of value — primarily cash and savings accounts. The liquid assets percentage shows what portion of your total assets are held in liquid form: (Cash & Savings ÷ Total Assets) × 100. A higher percentage means more financial flexibility for short-term needs. A very low percentage may indicate most of your wealth is tied up in illiquid assets like property.',
  },
  {
    question: 'Is a negative net worth bad?',
    answer:
      'Not necessarily. Many people carry a negative net worth at certain life stages — for example, a recent graduate with student loans and few assets, or someone who recently purchased a home with a large mortgage. What matters is the trend over time: is your net worth growing? Are your assets appreciating and your debts being paid down? This calculator is educational — it gives you a snapshot, not a verdict.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'This calculator uses point-in-time values you enter. It does not account for asset sale costs (commissions, taxes), market fluctuations, asset depreciation, debt interest accrual between snapshots, inflation, or currency differences. All values are in nominal terms. The results are estimates for educational purposes only and should not be used as the sole basis for financial decisions.',
  },
];

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Core Net Worth Formula
      </h3>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          Net Worth = Total Assets − Total Liabilities
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
              ['Total Assets', 'Cash & Savings + Investments / Retirement + Home / Real Estate + Vehicles & Other'],
              ['Total Liabilities', 'Mortgage Balance + Loans & Credit Cards + Other Debts'],
              ['Net Worth', 'Total Assets − Total Liabilities (can be negative)'],
              ['Debt-to-Asset Ratio', 'Total Liabilities ÷ Total Assets × 100 (when assets > 0)'],
              ['Liquid Assets %', 'Cash & Savings ÷ Total Assets × 100 (when assets > 0)'],
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
        Debt-to-Asset Ratio Benchmarks
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        The debt-to-asset ratio is an educational reference point. Lower ratios generally indicate less financial leverage.
      </p>
      <div className="mt-4 overflow-x-auto" style={{ borderRadius: '8px', border: '1px solid #E4E9EF' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(29,181,132,0.10)' }}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Ratio Range</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">General Interpretation</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid #E4E9EF' }}>
            {[
              ['Below 25%', 'Lower debt load — assets significantly exceed debts'],
              ['25% – 50%', 'Moderate — common for homeowners with mortgages'],
              ['50% – 75%', 'Higher leverage — more than half of assets are debt-financed'],
              ['Above 75%', 'Very high leverage — warrants close attention'],
              ['Assets = 0', 'Cannot be calculated — debt exists with no measurable asset base'],
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
        Assumptions
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Point-in-time snapshot</strong> — values entered reflect a single moment, not ongoing changes.</li>
        <li><strong>No asset depreciation or appreciation</strong> — vehicle and property values are as entered.</li>
        <li><strong>No tax or sale costs</strong> — selling an asset typically involves transaction costs not reflected here.</li>
        <li><strong>Educational only</strong> — results do not constitute financial, tax, legal, or investment advice.</li>
      </ul>
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

export default function NetWorthCalculatorPage() {
  return (
    <>
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(245,158,11,0.07) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(147,197,253,0.12) 0%, transparent 100%)',
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(196,181,253,0.06) 0%, transparent 100%)',
            'linear-gradient(180deg, #f3f7fd 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
          ].join(', '),
        }}
      >
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            Net Worth Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Calculate your total net worth, debt-to-asset ratio, and liquidity position.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Assets &amp; liabilities · Balance sheet · Canada &amp; USA
          </p>
        </div>

        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <NetWorthCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
