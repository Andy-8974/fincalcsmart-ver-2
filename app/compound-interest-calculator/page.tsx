import type { Metadata } from 'next';
import CompoundInterestCalculator from './CompoundInterestCalculator';

export const metadata: Metadata = {
  title: 'Compound Interest Calculator — Savings Growth',
  description:
    'See how your savings grow with compound interest over time. Set a savings goal and find the monthly contribution needed to reach it. Free for Canada and USA.',
};

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'What is compound interest?',
    answer:
      'Compound interest is interest calculated on both the initial principal and the accumulated interest from previous periods. Unlike simple interest — which is calculated only on the principal — compound interest causes your balance to grow at an accelerating rate over time. The longer the horizon and the more frequently interest compounds, the more powerful the effect becomes.',
  },
  {
    question: 'How does compound frequency affect my final balance?',
    answer:
      'Compound frequency determines how often interest is calculated and added to your balance. At the same nominal annual rate, daily or monthly compounding produces a slightly higher effective annual return than annual compounding. The difference is small at lower rates, but grows as both the rate and the time horizon increase. For example, at 6% annual rate, the effective annual return is 6.00% with annual compounding and 6.168% with daily compounding — a meaningful difference over 20 or 30 years.',
  },
  {
    question: 'What is the difference between nominal and effective interest rate?',
    answer:
      'The nominal annual rate is the stated rate before compounding is applied. The effective annual rate (EAR) is the actual return earned after compounding. For annual compounding, they are equal. For more frequent compounding, the EAR exceeds the nominal rate: EAR = (1 + nominal / n)^n − 1, where n is the number of compounding periods per year. This calculator uses the nominal rate you enter and converts it to an effective monthly rate based on your chosen compounding frequency.',
  },
  {
    question: 'Why does time horizon matter so much in compound growth?',
    answer:
      'Compounding is non-linear — your balance grows faster in later years because interest is being earned on a larger base. The first $1,000 of interest takes years to accumulate; later, a similar amount may be earned in months. This is why doubling your investment horizon often more than doubles your final balance. It is also why starting earlier — even with smaller contributions — tends to produce better outcomes than starting later with larger contributions.',
  },
  {
    question: 'What does the Target Amount feature do?',
    answer:
      'If you enter a target amount, the calculator shows your projected progress toward that goal and, if you are below target, the extra monthly contribution needed to reach it within your chosen time horizon. This uses the present value of a growing annuity formula to back-calculate the required contribution increase. It is an estimate — actual results depend on your realised return, contribution consistency, and compounding terms.',
  },
  {
    question: 'What does Starting Age do?',
    answer:
      'Starting Age is optional and purely informational. It does not change any calculation. When entered, the AI Analysis adds age-based context — for example, showing your projected balance "by age X" — which some users find easier to interpret than a year count alone. The math is identical whether or not you enter a starting age.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'Four main assumptions: (1) the nominal interest rate is constant throughout the entire investment horizon; (2) monthly contributions are made consistently on the same date each month; (3) no taxes, fees, or inflation adjustments are applied; and (4) the effective monthly rate is derived from the nominal annual rate and the chosen compounding frequency. This is an educational illustration only — actual savings and investment returns vary.',
  },
];

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Effective Monthly Rate
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        The nominal annual rate is converted to an effective monthly rate based on the compounding frequency you choose:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          EAR = (1 + r / n)^n − 1 &nbsp;&nbsp; r_monthly = (1 + EAR)^(1/12) − 1
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
              ['r', 'Nominal annual rate (e.g. 0.06 for 6%)'],
              ['n', 'Compounding periods per year (1 / 2 / 12 / 365)'],
              ['EAR', 'Effective annual rate after compounding'],
              ['r_monthly', 'Effective monthly rate applied to balance each month'],
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
        Future Value Formula
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        The final balance combines growth on the initial lump sum and growth on monthly contributions:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          FV = P × (1 + r_m)^n + C × [(1 + r_m)^n − 1] ÷ r_m
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        Where P = initial investment, C = monthly contribution, r_m = effective monthly rate, n = total months. Monthly contributions are always assumed to be paid monthly regardless of compound frequency.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Assumptions
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Constant rate</strong> — the nominal interest rate does not change over the investment period.</li>
        <li><strong>Monthly contributions</strong> — contributions are made consistently each month regardless of compounding frequency.</li>
        <li><strong>No taxes or fees</strong> — growth is shown before tax and before any management fees or charges.</li>
        <li><strong>No inflation adjustment</strong> — all values are shown in nominal (today&apos;s) dollars.</li>
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

export default function CompoundInterestCalculatorPage() {
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
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            Compound Interest Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            See how your savings grow over time and find out what it takes to reach your goal.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Monthly compounding · Goal tracking · Canada &amp; USA
          </p>
        </div>

        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <CompoundInterestCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
