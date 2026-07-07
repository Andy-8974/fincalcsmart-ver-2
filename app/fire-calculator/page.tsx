import type { Metadata } from 'next';
import FIRECalculator from './FIRECalculator';

export const metadata: Metadata = {
  title: 'FIRE Calculator — Financial Independence & Early Retirement',
  description:
    'Estimate your FIRE number, projected path to financial independence, and how many years until you can retire early. Free for Canada and USA.',
};

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'What is FIRE and what does this calculator estimate?',
    answer:
      'FIRE stands for Financial Independence, Retire Early. It is a financial movement built around saving and investing aggressively to accumulate a portfolio large enough to cover your living expenses indefinitely — typically well before traditional retirement age. This calculator estimates your FIRE target (annual expenses × your chosen multiple), projects how long your current investments and monthly contributions will take to reach that target, and shows your estimated FIRE age based on a fixed assumed annual return.',
  },
  {
    question: 'How is the FIRE target calculated?',
    answer:
      'Your FIRE target is simply your estimated annual expenses multiplied by your chosen FIRE target multiple. For example, if your annual expenses are $48,000 and you choose the 25× multiple, your FIRE target is $1,200,000. The 25× multiple corresponds to the widely cited "4% rule" — the idea that withdrawing 4% of your portfolio annually is sustainable over a 30-year retirement. Higher multiples (30×, 33×) correspond to lower, more conservative withdrawal rates. These are rules of thumb — not guarantees of withdrawal sustainability.',
  },
  {
    question: 'How is the estimated time to FIRE calculated?',
    answer:
      'The calculator uses a binary search on the compound growth formula to find the earliest month at which your projected portfolio reaches or exceeds your FIRE target. Starting with your current invested assets and adding your monthly investment each month, it compounds at the effective monthly rate derived from your annual return assumption. If your portfolio never reaches the target within 100 years (1,200 months) at the current pace, the calculator shows a "Not Reachable" state and estimates the monthly contribution required to reach FIRE in 20 years.',
  },
  {
    question: 'What is the FIRE Readiness Score?',
    answer:
      'The FIRE Readiness Score (0–100) summarises your current trajectory toward financial independence based on your portfolio\'s current progress toward your FIRE target, your estimated years to FIRE, and your savings rate if income is entered. A score of 80+ is Excellent; 65–79 is Good; 45–64 is Fair; below 45 is Poor. The score is a directional indicator only — it does not account for inflation, taxes, fees, market volatility, or spending changes in retirement.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'Six main assumptions: (1) the annual return rate is constant throughout the entire investment horizon — real returns vary significantly year to year; (2) monthly investments are made consistently every month; (3) no taxes, investment fees, or inflation adjustments are applied; (4) expenses in financial independence are the same as those you enter today; (5) government benefits (CPP, OAS, Social Security) and pension income are not included; and (6) sequence-of-returns risk — the impact of poor returns early in retirement — is not modeled. All projections are illustrative estimates only.',
  },
  {
    question: 'Does the 4% rule guarantee financial independence?',
    answer:
      'No. The 4% rule (the basis of the 25× multiple) originated from the Trinity Study, which analysed historical US stock and bond portfolios over 30-year periods. It found that a 4% annual withdrawal had a high historical success rate over that horizon. However, it is a rule of thumb — not a guaranteed safe withdrawal rate. Actual sustainability depends on sequence of returns, asset allocation, actual expenses, retirement length, and factors this calculator does not model. Many FIRE practitioners use more conservative multiples (30× or 33×) to build in additional safety margin.',
  },
  {
    question: 'Does this calculator include CPP, OAS, or Social Security?',
    answer:
      'No. This calculator models only your personal investment portfolio accumulation. It does not include CPP, OAS, Social Security, pension income, or any other income source. If you plan to receive government benefits in retirement, your actual portfolio requirement may be lower than the FIRE target this calculator shows. Consult a qualified financial advisor for a complete financial independence plan that accounts for all income sources.',
  },
];

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        FIRE Target
      </h3>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#F97316', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          FIRE Target = Annual Expenses × Target Multiple
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        Where Target Multiple is 20 (5% rule), 25 (4% rule), 30 (3.3% rule), or 33 (3% rule). The 25× / 4% rule is the most commonly cited benchmark.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Portfolio Growth (same formula as compound interest)
      </h3>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          FV = P × (1 + r_m)^n + C × [(1 + r_m)^n − 1] ÷ r_m
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        Where P = current invested assets, C = monthly investment, r_m = effective monthly rate, n = total months.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Time to FIRE — Binary Search
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        Unlike a fixed-horizon calculator, this calculator solves for the time horizon itself. It uses a binary search to find the earliest month n at which FV(n) ≥ FIRE Target:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.6 }}>
          Find minimum n (months) such that: FV(n) ≥ FIRE Target
          <br />
          Search bounds: 1 → 1,200 months (100 years)
          <br />
          Not reachable: if FV(1,200) &lt; FIRE Target
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        At 0% return: n = max(0, (FIRE Target − current assets) ÷ monthly investment) &nbsp;[linear solve].
        If monthly investment = 0 and assets are below target, the target is not reachable unless growth alone closes the gap.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Required Monthly Investment for a Target Horizon
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        Used for the &ldquo;5 years sooner&rdquo; lever and the &ldquo;reach FIRE in 20 years&rdquo; not-reachable suggestion:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          C_required = (Target − P × (1 + r_m)^n) × r_m ÷ [(1 + r_m)^n − 1]
        </div>
      </div>
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
        <li><strong>Constant return rate</strong> — the nominal annual return does not change over the investment horizon.</li>
        <li><strong>Consistent monthly investment</strong> — contributions are made every month without gaps.</li>
        <li><strong>No inflation adjustment</strong> — all values are in nominal (today&apos;s) dollars.</li>
        <li><strong>No taxes or fees</strong> — growth is shown before tax and before management fees.</li>
        <li><strong>No government benefits</strong> — CPP, OAS, Social Security, and pension income are excluded.</li>
        <li><strong>No withdrawal modeling</strong> — this calculator does not model portfolio drawdown in financial independence.</li>
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

export default function FIRECalculatorPage() {
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
            FIRE Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Estimate your path to Financial Independence and Early Retirement — your FIRE number, projected timeline, and estimated FIRE age.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            FIRE timeline · FI progress · Canada &amp; USA · Illustrative estimate only
          </p>
        </div>

        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <FIRECalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
