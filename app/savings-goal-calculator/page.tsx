import type { Metadata } from 'next';
import SavingsGoalCalculator from './SavingsGoalCalculator';

export const metadata: Metadata = {
  title: 'Savings Goal Calculator — Am I On Track?',
  description:
    'Find out how much you need to save each month to reach your savings goal. Calculate projected savings, required monthly contribution, goal gap, and estimated time to goal. Free for Canada and USA.',
};

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'How does the Savings Goal Calculator work?',
    answer:
      'The calculator projects your savings to your target date using monthly compounding. It combines the future value of your current savings and the future value of your monthly contributions at the expected annual return rate. It then compares your projected savings to your goal and calculates how much more you may need to save each month to close any gap.',
  },
  {
    question: 'What is the Required Monthly Contribution?',
    answer:
      'Required Monthly Contribution is the amount you would need to save each month — starting today — to exactly reach your savings goal by the target date, given your current savings balance and expected annual return. If your current monthly contribution is already above this number, you are on track. If it is below, the calculator shows you the additional monthly amount needed.',
  },
  {
    question: 'What annual return should I use?',
    answer:
      'Use 0% for a cash savings account, high-yield savings account, or GIC/CD where returns are not expected to vary. For investment accounts, commonly used planning estimates range from 4% to 7% for a balanced portfolio, but past performance does not guarantee future results. This calculator does not model specific products, account types, or taxes — the return is a planning estimate only.',
  },
  {
    question: 'Why does the time horizon matter so much?',
    answer:
      'Time horizon determines how many months your contributions and current savings have to grow through compounding. A longer timeline means more compounding, lower required monthly contributions, and a higher share of your projected savings coming from growth rather than contributions. A shorter timeline means less time to compound and a higher required monthly contribution.',
  },
  {
    question: 'Does the calculator account for inflation or taxes?',
    answer:
      "No. This calculator does not model inflation, taxes, account type rules, contribution limits, or investment fees. Results are pre-tax estimates in today’s dollars. Actual results will vary based on product type, tax treatment, fees, and personal circumstances. This is an educational planning tool only.",
  },
  {
    question: 'What does "Time to Goal at current pace" mean?',
    answer:
      'This is the estimated number of months until your projected savings balance reaches your goal, based on your current monthly contribution and expected annual return. If your current savings already meet or exceed your goal, it shows "Already reached." If your contribution is $0 and your savings growth alone cannot reach the goal, the calculator prompts you to increase contributions.',
  },
  {
    question: 'What does the Goal Type pill do?',
    answer:
      'Goal Type is a reference label only — it helps you identify what you are saving toward (Emergency Fund, Home Down Payment, Vacation, Education, or Other). It does not change any calculation, assumption, or recommendation. All math is driven entirely by your numeric inputs.',
  },
];

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Core Projection Formulas
      </h3>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 font-mono space-y-2"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em' }}>
          <div>r = Annual Return % ÷ 100 ÷ 12</div>
          <div>n = Time Horizon (years) × 12</div>
          <div>FV_current = Current Savings × (1 + r)^n</div>
          <div>FV_contributions = Monthly Contribution × ((1 + r)^n − 1) ÷ r</div>
          <div>Projected Savings = FV_current + FV_contributions</div>
        </div>
      </div>
      <p className="text-sm text-slate-600 mt-2">
        If Annual Return is 0%, the contribution formula simplifies to: Monthly Contribution × n (linear accumulation, no compounding).
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Required Monthly Contribution (Reverse PMT)
      </h3>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 font-mono space-y-2"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em' }}>
          <div>FV_needed = Savings Goal − FV_current</div>
          <div>Required Monthly = FV_needed × r ÷ ((1 + r)^n − 1)</div>
          <div>Additional Monthly = max(0, Required Monthly − Current Monthly)</div>
        </div>
      </div>
      <p className="text-sm text-slate-600 mt-2">
        This reverse-solves the monthly contribution (PMT) needed to accumulate the remaining balance by the target date. If Annual Return is 0%, it simplifies to FV_needed ÷ n.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Output Reference
      </h3>
      <div className="overflow-x-auto" style={{ borderRadius: '8px', border: '1px solid #E4E9EF' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(29,181,132,0.10)' }}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Output</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">How it is calculated</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid #E4E9EF' }}>
            {[
              ['Projected Savings',          'FV of current savings + FV of monthly contributions at target date'],
              ['Total Contributions',        'Current savings + (monthly contribution × months)'],
              ['Estimated Growth',           'Projected savings − total contributions'],
              ['Goal Gap',                   'max(0, savings goal − projected savings)'],
              ['Progress %',                 'Projected savings ÷ savings goal × 100'],
              ['Required Monthly',           'Reverse PMT — monthly contribution needed to reach goal by target date'],
              ['Additional Monthly Needed',  'max(0, required monthly − current monthly contribution)'],
              ['Time to Goal',               'Month-by-month solve until projected balance reaches goal (cap 600 mo)'],
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
        <li><strong>Monthly compounding</strong> — growth is applied each month at r = annual rate ÷ 12.</li>
        <li><strong>Consistent contributions</strong> — the same amount is contributed at the end of each month throughout the horizon.</li>
        <li><strong>No taxes or fees</strong> — results are pre-tax estimates and exclude account fees, MERs, or withholding taxes.</li>
        <li><strong>No inflation adjustment</strong> — the goal amount and contributions are expressed in today's dollars.</li>
        <li><strong>Educational only</strong> — this is an illustrative estimate and does not constitute financial, investment, tax, or legal advice.</li>
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

export default function SavingsGoalCalculatorPage() {
  return (
    <>
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.06) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(253,230,138,0.10) 0%, transparent 100%)',
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(196,181,253,0.05) 0%, transparent 100%)',
            'linear-gradient(180deg, #f3f7fd 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
          ].join(', '),
        }}
      >
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            Savings Goal Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Find out if you are on track to reach your savings goal — and how much you may need to save each month to get there.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Goal projection · Required monthly · Canada &amp; USA
          </p>
        </div>

        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <SavingsGoalCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
