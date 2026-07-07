import type { Metadata } from 'next';
import ROICalculator from './ROICalculator';

export const metadata: Metadata = {
  title: 'ROI Calculator — Return on Investment',
  description:
    'Calculate your return on investment, break-even point, and annualized ROI. Set a target ROI and see exactly how much value you need to reach your goal. Free for Canada and USA.',
};

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'What is ROI and how is it calculated?',
    answer:
      'ROI stands for Return on Investment. It measures how much you gained or lost relative to what you put in. The formula is: ROI % = (Net Profit ÷ Total Cost) × 100, where Net Profit = Final Value − Total Cost and Total Cost = Initial Investment + Additional Costs. A positive ROI means you gained value; a negative ROI means a loss.',
  },
  {
    question: 'What is the break-even point?',
    answer:
      'The break-even point is where your final value equals your total cost — meaning you recovered everything you put in but made no profit. In this calculator, break-even = Initial Investment + Additional Costs. If your final value exceeds this, you are in profit. If it falls short, you have a loss.',
  },
  {
    question: 'What does annualized ROI mean?',
    answer:
      'Annualized ROI converts a total return over multiple years into a per-year equivalent. This lets you compare investments held for different lengths of time on a fair, equal basis. The formula is: Annualized ROI = (1 + ROI / 100)^(1 / years) − 1. For example, a 25% total return over 2 years equals approximately 11.8% per year — which can then be compared directly to a 1-year investment.',
  },
  {
    question: 'What should I enter in the Additional Costs field?',
    answer:
      'Additional Costs covers any expenses beyond your initial investment that are required for the investment or project — for example: maintenance fees, transaction or brokerage commissions, operating expenses, marketing spend, or overhead costs. If there are no extra costs, enter 0. These costs are added to your initial investment to form the total cost base used in the ROI calculation.',
  },
  {
    question: 'What does the Target ROI % feature do?',
    answer:
      'If you enter a Target ROI %, the calculator shows how close you are to that goal and — if you are below it — how much additional final value you need to reach it. The Target Final Value is calculated as: Total Cost × (1 + Target ROI / 100). The gap or surplus between your current final value and the target final value is shown in both the results card and the AI Analysis.',
  },
  {
    question: 'Can I use this for business, real estate, or marketing ROI?',
    answer:
      'Yes. The ROI formula works the same regardless of the context — investments, business projects, real estate, marketing campaigns, or any scenario where you put money in and measure what comes out. Enter your upfront cost as the Initial Investment, any extra expenses as Additional Costs, and the revenue or ending value as the Final Value. The calculator is neutral and educational — it does not provide advice on any specific investment type.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'This calculator makes four main assumptions: (1) All values are entered as point-in-time figures — there is no modelling of cash flows over time. (2) No taxes are applied to the gain or income. (3) No inflation adjustment is applied — all values are in nominal terms. (4) Annualized ROI assumes the same compounding rate each year. Actual results will vary based on taxes, fees, timing, risk, and market conditions.',
  },
];

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Core ROI Formula
      </h3>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          ROI % = (Final Value − Total Cost) ÷ Total Cost × 100
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
              ['Total Cost', 'Initial Investment + Additional Costs'],
              ['Net Profit / Loss', 'Final Value − Total Cost (negative = loss)'],
              ['ROI %', 'Net Profit ÷ Total Cost × 100'],
              ['Break-even', 'Total Cost — the minimum final value to recover all costs'],
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
        Annualized ROI
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        When a holding period is entered, the total ROI is converted to a per-year equivalent using the compound annual growth rate formula:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          Annualized ROI = (1 + ROI / 100)^(1 / years) − 1
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        This is only calculated when the total ROI is greater than −100% (i.e., not a complete loss). The result lets you compare investments held for different lengths of time on an equal annual basis.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Assumptions
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Point-in-time values</strong> — no modelling of interim cash flows or distributions.</li>
        <li><strong>No tax adjustment</strong> — gains are shown before any applicable tax.</li>
        <li><strong>No inflation adjustment</strong> — all values are in nominal terms.</li>
        <li><strong>Educational only</strong> — this calculator does not constitute investment, financial, or business advice.</li>
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

export default function ROICalculatorPage() {
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
            ROI Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Calculate your return on investment, break-even point, and annualized ROI.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Profit &amp; loss · Goal tracking · Canada &amp; USA
          </p>
        </div>

        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <ROICalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
