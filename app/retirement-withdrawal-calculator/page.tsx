import type { Metadata } from 'next';
import RetirementWithdrawalCalculator from './RetirementWithdrawalCalculator';

export const metadata: Metadata = {
  title: 'Retirement Withdrawal Calculator — How Long Will My Savings Last?',
  description:
    'Estimate how long your retirement savings will last based on withdrawals, investment return, and inflation. Free for Canada and USA.',
};

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'What does this calculator estimate?',
    answer:
      'This calculator simulates your retirement portfolio drawdown year by year. You enter your starting savings, the amount you plan to withdraw each year, your expected annual return, inflation rate, and withdrawal timing. The calculator projects how long your portfolio may last, your estimated depletion age, your first-year withdrawal rate, and how your inflation-adjusted withdrawals grow over time.',
  },
  {
    question: 'What is the difference between Beginning of Year and End of Year withdrawal timing?',
    answer:
      'Beginning of Year timing means each withdrawal is taken at the start of the year before investment returns are applied — this is slightly more conservative because your withdrawals reduce the balance before growth is applied. End of Year timing means growth is applied first, then the withdrawal is taken — this gives your portfolio slightly more growth each year. Over a long retirement, the difference can add or subtract several years of portfolio longevity.',
  },
  {
    question: 'What is the first-year withdrawal rate and why does it matter?',
    answer:
      'The first-year withdrawal rate is your initial annual withdrawal divided by your starting portfolio balance. It is one of the most commonly used benchmarks in retirement planning. A rate under 3.5% is generally considered conservative; 3.5–5% is in the moderate watch zone; above 5% places greater pressure on your portfolio, especially over long retirements. These are illustrative ranges — not guaranteed thresholds. Actual sustainability depends on returns, inflation, retirement length, and factors this calculator does not model.',
  },
  {
    question: 'Why does inflation affect my withdrawal amount over time?',
    answer:
      'Each year, your withdrawal amount is increased by the inflation rate to maintain the same real purchasing power. For example, a $30,000 withdrawal today at 2.5% inflation becomes approximately $38,200 after 10 years and $48,800 after 20 years. This inflation compounding is a major factor in portfolio longevity — portfolios with low return rates relative to inflation can deplete significantly faster than a simple nominal calculation would suggest.',
  },
  {
    question: 'What does the Sustainability Status mean?',
    answer:
      'Sustainable means your portfolio lasts 30 years or through the full 50-year horizon. Watch means it lasts 20–29 years — adequate for many retirement scenarios but worth monitoring. At Risk means 10–19 years — likely insufficient for a full retirement. Depleted means under 10 years. These thresholds are illustrative benchmarks only. Your personal sustainability depends on your health, spending flexibility, pension income, government benefits, and factors this calculator does not model.',
  },
  {
    question: 'What does this calculator not include?',
    answer:
      'This calculator does not include: RRIF minimum withdrawal rules (Canada), CPP, OAS, Social Security, or pension income; taxes on withdrawals; investment fees; sequence-of-returns risk (the impact of early poor returns); Monte Carlo simulation; account withdrawal order strategy; or provincial/state-specific rules. Adding income sources like CPP or Social Security would reduce your required portfolio withdrawal and can significantly extend portfolio longevity. Consult a qualified financial advisor for a complete retirement plan.',
  },
  {
    question: 'What is the Target Ending Balance?',
    answer:
      'The Target Ending Balance lets you set a minimum portfolio floor — a balance you want to preserve at the end of the simulation (for example, to leave an inheritance or maintain a safety buffer). The calculator stops the simulation when your balance reaches this target. The default is $0, meaning the simulation runs until the portfolio is fully depleted or the 50-year horizon is reached.',
  },
];

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Year-by-Year Simulation
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        Unlike a closed-form formula, this calculator simulates each year of retirement individually. This allows it to correctly model inflation-adjusted withdrawals and the different effects of beginning-of-year vs. end-of-year withdrawal timing.
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '12px', fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.8 }}>
          For each year (up to 50):<br />
          {'  '}withdrawal_n = annualWithdrawal × (1 + inflation)^n<br />
          {'  '}if timing = Beginning: balance = (balance − withdrawal_n) × (1 + return)<br />
          {'  '}if timing = End:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;balance = balance × (1 + return) − withdrawal_n<br />
          {'  '}stop if balance ≤ targetEndingBalance
        </div>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        First-Year Withdrawal Rate
      </h3>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          Withdrawal Rate = Annual Withdrawal ÷ Starting Portfolio
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        This rate is calculated using the nominal first-year withdrawal and the starting portfolio balance. It is one of the most widely used benchmarks for assessing retirement withdrawal sustainability, though it is a rule of thumb only.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Deferral Phase
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">
        If your Withdrawal Start Age is later than your Current Age, the calculator applies portfolio growth only (no withdrawals) during the deferral years. This models the scenario where you have savings but delay starting withdrawals — for example, if you plan to work part-time for several years before fully retiring.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Assumptions
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Constant return rate</strong> — investment return does not vary year to year.</li>
        <li><strong>Inflation-adjusted withdrawals</strong> — annual withdrawal grows by the inflation rate each year to maintain real purchasing power.</li>
        <li><strong>No taxes, fees, or government benefits</strong> — results are pre-tax and exclude CPP, OAS, Social Security, pensions, or other income.</li>
        <li><strong>No sequence-of-returns risk</strong> — poor early returns are not modeled; this is a constant-return simulation.</li>
        <li><strong>50-year maximum horizon</strong> — the simulation runs for a maximum of 50 years from today.</li>
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

export default function RetirementWithdrawalPage() {
  return (
    <>
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(249,115,22,0.07) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(29,181,132,0.05) 0%, transparent 100%)',
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(196,181,253,0.04) 0%, transparent 100%)',
            'linear-gradient(180deg, #f3f7fd 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
          ].join(', '),
        }}
      >
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            Retirement Withdrawal Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Estimate how long your retirement savings may last based on withdrawals, investment return, and inflation — for Canada and the USA.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Portfolio drawdown · Withdrawal sustainability · Canada &amp; USA · Illustrative estimate only
          </p>
        </div>

        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <RetirementWithdrawalCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
