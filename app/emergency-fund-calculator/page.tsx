import type { Metadata } from 'next';
import EmergencyFundCalculator from './EmergencyFundCalculator';

export const metadata: Metadata = {
  title: 'Emergency Fund Calculator — How Much Do You Need?',
  description:
    'Calculate your emergency fund target based on your expenses and income stability. See your current coverage, savings gap, and how long it will take to reach your goal. Free for Canada and USA.',
};

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'How much should I have in an emergency fund?',
    answer:
      'A common guideline is 3–6 months of essential expenses, but the right amount depends on your income stability. Salaried employees with stable income typically need 3–4 months. Those with variable pay, hourly work, or moderate income variability typically need 4–6 months. Freelancers, self-employed individuals, and commission earners typically need 9–12 months due to income gaps and irregular cash flow. This calculator lets you select your target and flags whether it aligns with your income type.',
  },
  {
    question: 'What counts as a monthly essential expense?',
    answer:
      'Essential expenses are the costs you must pay regardless of circumstances — housing (rent or mortgage), utilities, groceries, minimum debt payments, and core insurance premiums. Exclude discretionary spending like dining out, entertainment, subscriptions, and travel. The goal is to calculate the minimum amount needed to cover your obligations if your income stopped unexpectedly.',
  },
  {
    question: 'Where should I keep my emergency fund?',
    answer:
      'Emergency funds should be kept in a liquid, accessible account where the balance is stable and you can withdraw quickly without penalty. Common choices include high-yield savings accounts, regular savings accounts, or money market accounts. This calculator does not model investment returns or account types — it focuses on the savings target and timeline based on your contributions. Consult a financial professional for guidance on account selection.',
  },
  {
    question: 'Why does Income Stability affect the recommended target?',
    answer:
      'Income stability determines how quickly you could replace lost income and how long you might need your emergency fund to last. A salaried employee can typically find new employment faster and has more predictable income gaps, so 3–4 months is often sufficient. A freelancer or commission earner may go weeks or months between contracts or sales, making 9–12 months a more appropriate cushion. The calculator uses your selected Income Stability to flag whether your Target Coverage aligns with your risk profile — but your selected target always takes priority.',
  },
  {
    question: 'What is the Months to Target figure?',
    answer:
      'Months to Target is the estimated time to fill your savings gap at your current monthly contribution rate. It is calculated as: Gap ÷ Monthly Savings Contribution. For example, if your gap is $8,000 and you save $500 per month, your estimated months to target is 16 months (approximately 1 year and 4 months). This estimate assumes a consistent contribution and does not account for interest earned on savings.',
  },
  {
    question: 'What if my monthly contribution is zero?',
    answer:
      'If you are not currently contributing to your emergency fund, the calculator shows the savings gap and a suggested monthly amount to reach your target in 12 months (Gap ÷ 12). This is a planning reference only — you can set any contribution amount you are comfortable with. The Savings Timeline chart will show a flat line at your current savings level to illustrate the impact of not contributing.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'Three main assumptions: (1) Monthly savings contributions are consistent each month. (2) No interest is earned on the emergency fund balance — the timeline is based on linear contributions only. (3) Monthly essential expenses do not change over time. Actual results will vary based on changes in income, expenses, interest earned, emergencies, and personal circumstances. This is an educational estimate, not financial advice.',
  },
];

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Core Emergency Fund Formulas
      </h3>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 font-mono space-y-2"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em' }}>
          <div>Fund Target = Target Months × Monthly Essential Expenses</div>
          <div>Current Coverage = Current Savings ÷ Monthly Expenses</div>
          <div>Savings Gap = max(0, Fund Target − Current Savings)</div>
          <div>Months to Target = Savings Gap ÷ Monthly Contribution</div>
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
              ['Fund Target',           'Monthly expenses × selected coverage months'],
              ['Current Coverage',      'Current savings expressed as months of expenses covered'],
              ['Savings Gap',           'Amount still needed to reach the target (0 if already at or above target)'],
              ['Months to Target',      'Estimated time to fill the gap at current monthly contribution'],
              ['Suggested Monthly',     'Gap ÷ 12 — monthly contribution needed to reach target in one year'],
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
        Income Stability Guidelines
      </h3>
      <div className="overflow-x-auto" style={{ borderRadius: '8px', border: '1px solid #E4E9EF' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(29,181,132,0.10)' }}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Stability</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Recommended Coverage</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Typical Profile</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid #E4E9EF' }}>
            {[
              ['Stable',   '3–4 months', 'Salaried employment, consistent pay schedule'],
              ['Moderate', '4–6 months', 'Variable pay, hourly, or moderate income variability'],
              ['Variable', '9–12 months', 'Freelance, self-employed, commission, or contract work'],
            ].map(([s, r, p]) => (
              <tr key={s} style={{ borderBottom: '1px solid #F1F4F7' }}>
                <td className="px-4 py-2.5 text-sm font-semibold text-slate-700">{s}</td>
                <td className="px-4 py-2.5 text-sm text-slate-700">{r}</td>
                <td className="px-4 py-2.5 text-sm text-slate-500">{p}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        These are general guidelines, not universal rules. Your circumstances, risk tolerance, industry, and financial obligations all affect the right target for you. The calculator flags if your selected target diverges from the guideline for your income type — but your selection always takes priority.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Assumptions
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>No interest modelled</strong> — savings growth is linear (contributions only). Interest earned on savings is not included.</li>
        <li><strong>Consistent contributions</strong> — monthly savings amounts are assumed to be made consistently each month.</li>
        <li><strong>Stable expenses</strong> — monthly essential expenses are assumed not to change over time.</li>
        <li><strong>Educational only</strong> — this calculator is an illustrative estimate and does not constitute financial advice.</li>
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

export default function EmergencyFundCalculatorPage() {
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
            Emergency Fund Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Find out how much you need, how covered you are today, and how long it takes to get there.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Coverage check · Savings timeline · Canada &amp; USA
          </p>
        </div>

        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <EmergencyFundCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
