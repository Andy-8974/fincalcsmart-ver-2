import type { Metadata } from 'next';
import LumpSumVsDCACalculator from './LumpSumVsDCACalculator';

export const metadata: Metadata = {
  title: 'Lump Sum vs Monthly Investment Calculator',
  description:
    'Compare investing a lump sum immediately versus spreading the same total into equal monthly investments over 3 to 36 months. See the compounding cost of delayed deployment. Free for Canada and USA.',
};

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'What is the difference between a lump sum and monthly investment strategy?',
    answer:
      'A lump sum strategy means investing your full available capital at once, on day one. The monthly investment strategy in this calculator spreads the same total amount into equal monthly contributions over a shorter spread period — 3, 6, 12, 24, or 36 months. After the spread period ends, all invested funds remain and continue compounding until the final investment horizon. Both scenarios use the same total capital and the same assumed return.',
  },
  {
    question: 'Why does lump sum investing typically show a higher projected value?',
    answer:
      'Under a fixed positive return assumption, lump sum investing gives more capital more time to compound. When all the money is deployed on day one, every dollar earns returns from the start. With monthly investing, contributions made in later months have less time to compound. The later a contribution is made, the fewer compounding periods it benefits from. This model assumes a constant return; real markets are volatile and this picture can change significantly in practice.',
  },
  {
    question: 'Does this mean I should always invest a lump sum?',
    answer:
      'Not necessarily. This calculator uses a fixed assumed return, which does not reflect real market volatility. In practice, a lump sum invested at a market peak may experience early losses that reduce long-term performance compared with spreading entry over time. Monthly investing may reduce the psychological discomfort of committing a large amount at once. The right approach depends on individual circumstances, risk tolerance, cash availability, and comfort with timing risk. This calculator is an educational illustration, not financial advice.',
  },
  {
    question: 'How is the monthly investment amount calculated?',
    answer:
      'The total amount you enter is divided equally across the selected spread period in months. For example, $10,000 spread over 12 months equals $833.33 per month. After the spread period ends, all contributions remain invested and continue compounding until the final horizon. Both scenarios always invest the same total capital.',
  },
  {
    question: 'What is the Monthly Spread Period?',
    answer:
      'The Monthly Spread Period is how many months the monthly strategy takes to fully deploy the total investment amount. Choose 3, 6, 12, 24, or 36 months. Once all contributions are made, the invested funds continue to grow at the assumed return rate until the end of the investment horizon. The spread period is separate from the investment horizon — a 12-month spread with a 10-year horizon means contributions are made in year 1, and the money grows for the remaining 9+ years.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'Five main assumptions: (1) the annual return rate is constant throughout the entire horizon — real returns fluctuate; (2) the monthly investment strategy makes equal contributions every month during the spread period without gaps; (3) all invested amounts compound at the assumed rate until the final horizon; (4) no taxes, fees, or inflation adjustments are applied; and (5) the effective monthly rate is derived from the nominal annual rate and the selected compound frequency. These are illustrative estimates, not projections of actual investment performance.',
  },
  {
    question: 'What is compound frequency and how does it affect results?',
    answer:
      'Compound frequency determines how often returns are calculated and added to the balance. Monthly and daily compounding produce a slightly higher effective return than annual compounding at the same nominal rate. The frequency setting is applied identically to both scenarios, so it does not change the relative gap between strategies — only the absolute projected values.',
  },
];

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Lump Sum Future Value
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        The full amount is invested at time zero and grows at the effective monthly rate for the entire horizon:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          FV_lump = P × (1 + r_m)^H
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        Where P = total amount invested, r_m = effective monthly rate, H = total horizon months.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Monthly Strategy Future Value (two-phase)
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        Equal monthly contributions of C = P ÷ S are invested over S spread months. At the end of the spread period, the accumulated annuity value grows for the remaining (H − S) months:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          annuityFV = C × [(1 + r_m)^S − 1] ÷ r_m
          <br />
          FV_monthly = annuityFV × (1 + r_m)^(H − S)
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        Where C = P ÷ S, S = spread months, H = horizon months, r_m = effective monthly rate.
        The first contribution compounds for H months; the last contribution compounds for H − S + 1 months.
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
        The same effective monthly rate is applied to both scenarios.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Assumptions
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Constant rate</strong> — the nominal annual return does not change over the full horizon.</li>
        <li><strong>Equal monthly contributions</strong> — the monthly strategy invests the same amount every month during the spread period, with no gaps.</li>
        <li><strong>Same total capital</strong> — both scenarios invest the identical total amount; only timing differs.</li>
        <li><strong>Full compounding to horizon</strong> — all invested amounts (lump sum and monthly contributions) compound at the assumed rate until the final horizon date.</li>
        <li><strong>No taxes, fees, or inflation</strong> — all values are shown before tax and before any management charges, in nominal dollars.</li>
        <li><strong>No market timing risk</strong> — real markets fluctuate; this model assumes a fixed return for illustration only.</li>
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

export default function LumpSumVsDCACalculatorPage() {
  return (
    <>
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.08) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(14,165,233,0.10) 0%, transparent 100%)',
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
            Lump Sum vs Monthly Investment Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Compare investing all at once versus spreading the same amount into equal monthly contributions.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Fixed-return comparison · Illustrative only · Canada &amp; USA
          </p>
        </div>

        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <LumpSumVsDCACalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
