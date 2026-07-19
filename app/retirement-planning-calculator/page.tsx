import type { Metadata } from 'next';
import RetirementSavingsCalculator from './RetirementSavingsCalculator';

export const metadata: Metadata = {
  title: 'Retirement Savings Calculator',
  description:
    'Estimate your projected retirement savings, track progress toward your retirement goal, and find the monthly contribution needed to close any gap. Free for Canada and USA.',
};

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'What does this calculator estimate?',
    answer:
      'This calculator projects how your retirement savings may grow based on your current balance, monthly contributions, expected annual return, and years remaining until retirement. It compares your projection against a retirement goal you enter and shows the additional monthly contribution needed to close any gap. All projections are illustrative estimates — actual returns vary and are not guaranteed.',
  },
  {
    question: 'How is the required monthly contribution calculated?',
    answer:
      'If your projected savings fall short of your retirement goal, the calculator solves for the monthly contribution needed to reach your goal by retirement age. It uses the standard future value of an annuity formula reversed: required monthly = (goal − current savings × (1+r)^n) × r ÷ ((1+r)^n − 1), where r is the effective monthly rate and n is total months to retirement. This is an estimate based on a fixed return assumption.',
  },
  {
    question: 'What is the Retirement Readiness Score?',
    answer:
      'The Retirement Readiness Score (0–100) summarises your overall retirement trajectory based on your goal progress, years remaining until retirement, and whether your current contributions are sufficient. If no retirement goal is entered, the score is instead based on projected investment growth and time horizon. A score of 80+ is Excellent; 65–79 is Good; 45–64 is Fair; below 45 is Poor. The score is a directional indicator only — it does not account for inflation, taxes, fees, pension income, or spending needs in retirement.',
  },
  {
    question: 'Does this calculator include CPP, OAS, or Social Security?',
    answer:
      'No. This calculator models only your personal savings accumulation — it does not include CPP, OAS, Social Security, pension income, or any other retirement income source. Your actual retirement income picture will differ depending on your eligibility and entitlements. Consult a financial advisor or the relevant government authority for a complete retirement income estimate.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'Five main assumptions: (1) the annual return rate is constant throughout the entire investment horizon — real returns vary year to year; (2) monthly contributions are made consistently each month; (3) no taxes, investment fees, or inflation adjustments are applied; (4) future contribution increases are not modeled; and (5) the available room in tax-advantaged accounts (RRSP, 401(k), IRA, TFSA) is not checked. All projections are illustrative only.',
  },
  {
    question: 'Why does compound frequency matter for retirement savings?',
    answer:
      'Compound frequency determines how often your returns are calculated and added to your balance. Monthly or daily compounding produces a slightly higher effective annual return than annual compounding at the same nominal rate, because returns on returns accumulate faster. Over a 30-year retirement horizon, the difference can be meaningful. This calculator lets you select Annually, Semi-Annually, Monthly, or Daily compounding to see how frequency affects your projection.',
  },
  {
    question: 'How much should I save for retirement?',
    answer:
      'A common general guideline is to target a retirement nest egg of 10–25 times your estimated annual spending in retirement, depending on your expected retirement length, lifestyle, and other income sources. For example, if you plan to spend $50,000 per year and expect to be retired for 25 years, a rough target might be $1,000,000–$1,250,000. These are rough benchmarks only — your personal target depends on your specific circumstances, income sources, health, and planned retirement age. This calculator does not model withdrawal rates or spending in retirement. Consult a qualified financial advisor for personalized retirement planning.',
  },
];

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Growth Projection
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        The projected retirement savings combines the starting balance grown over the full horizon with the future value of ongoing monthly contributions:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          FV = P × (1 + r_m)^n + C × [(1 + r_m)^n − 1] ÷ r_m
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        Where P = current savings, C = monthly contribution, r_m = effective monthly rate, n = months to retirement.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Required Monthly Contribution
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        If your projection falls short of your retirement goal, the calculator solves for the monthly contribution needed to reach the goal:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          C_required = (Goal − P × (1 + r_m)^n) × r_m ÷ [(1 + r_m)^n − 1]
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        Additional monthly needed = max(0, C_required − current monthly contribution). At 0% return, this simplifies to (Goal − P) ÷ n.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Effective Monthly Rate
      </h3>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          EAR = (1 + r / n_freq)^n_freq − 1 &nbsp;&nbsp; r_m = (1 + EAR)^(1/12) − 1
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        Where r = nominal annual rate and n_freq = compounding periods per year (1 / 2 / 12 / 365).
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Assumptions
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Constant return rate</strong> — the nominal annual return does not change over the investment period.</li>
        <li><strong>Monthly contributions</strong> — contributions are made consistently each month regardless of compounding frequency.</li>
        <li><strong>No inflation adjustment</strong> — all values are shown in nominal dollars.</li>
        <li><strong>No taxes, fees, or spending</strong> — growth is shown before tax and before any management fees. Retirement spending is not modeled.</li>
        <li><strong>No government benefits</strong> — CPP, OAS, Social Security, and pension income are excluded.</li>
        <li><strong>No contribution increases</strong> — future increases to your monthly contribution are not modeled.</li>
        <li><strong>No account room checking</strong> — available contribution room in tax-advantaged accounts (RRSP, 401(k), IRA, TFSA) is not checked.</li>
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

export default function RetirementPlanningCalculatorPage() {
  return (
    <>
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.07) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(249,115,22,0.06) 0%, transparent 100%)',
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
            Retirement Savings Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Project your retirement savings growth and find the monthly contribution needed to reach your goal.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Growth projection · Goal tracking · Canada &amp; USA
          </p>
        </div>

        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <RetirementSavingsCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
