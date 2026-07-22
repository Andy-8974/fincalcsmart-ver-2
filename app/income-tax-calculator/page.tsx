import type { Metadata } from 'next';
import IncomeTaxCalculator from './IncomeTaxCalculator';

export const metadata: Metadata = {
  title: 'Income Tax Calculator — 2025 Estimate',
  description:
    'Estimate your federal and provincial or state income tax for 2025. See after-tax income, effective tax rate, and marginal rate for Canada and the USA. Educational estimate only — not a tax filing tool.',
};

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'How does this income tax calculator work?',
    answer:
      'The calculator applies 2025 federal tax brackets progressively to your gross income. For Canada, it applies the Basic Personal Amount as a non-refundable federal credit. For the USA, it subtracts the standard deduction before applying brackets. Provincial tax (Canada) is estimated as a flat approximate rate. State/local tax (USA) is calculated as a flat percentage on gross income that you enter manually. All results are educational estimates.',
  },
  {
    question: 'What is the difference between effective tax rate and marginal tax rate?',
    answer:
      'Your effective tax rate is the percentage of your total gross income that goes to income taxes — it is what you actually pay overall. Your marginal tax rate is the rate that applies to the next dollar you earn — the rate of the highest bracket your income reaches. Because progressive tax systems apply lower rates to earlier income, your effective rate is always lower than your marginal rate.',
  },
  {
    question: 'What is the Basic Personal Amount (Canada)?',
    answer:
      'The Basic Personal Amount (BPA) is a non-refundable federal tax credit that reduces how much federal income tax you owe. For 2025, the BPA is $16,129 for taxpayers with net income up to $177,882 (it is gradually reduced above that threshold, down to $14,538 above $253,414 — this phase-out is not modeled in this simplified calculator). The credit is calculated at the 2025 blended lowest federal bracket rate (14.5%), so it reduces federal tax by approximately $2,339. The BPA is indexed annually.',
  },
  {
    question: 'What is the standard deduction (USA)?',
    answer:
      'The standard deduction is a flat amount subtracted from your gross income before federal tax brackets are applied, reducing your taxable income. For 2025, the standard deduction is $15,750 for Single filers and $31,500 for Married Filing Jointly. You may itemize instead if your deductible expenses exceed the standard deduction, but this calculator applies the standard deduction only.',
  },
  {
    question: 'Why is the provincial tax only an approximation?',
    answer:
      'Each Canadian province and territory has its own progressive tax bracket system with unique rates and thresholds. Implementing all 13 provincial bracket tables accurately, including surtaxes (Ontario, PEI), abatements (Quebec), and annual indexing, is complex and changes frequently. To keep this V1 educational tool simple and transparent, provincial tax is estimated as a flat approximate rate per province. Use your provincial tax authority website or official CRA tools for accurate provincial calculations.',
  },
  {
    question: 'What is not included in this estimate?',
    answer:
      'This calculator does not include: CPP or EI premiums (Canada); FICA or Medicare taxes (USA); personal deductions or tax credits beyond BPA/standard deduction; RRSP, TFSA, or 401(k)/IRA contribution deductions; capital gains or investment income; self-employment or business income; provincial surtaxes or credits; AMT (Alternative Minimum Tax); or city/local taxes beyond the manual state/local rate. Results are pre-deduction, pre-credit estimates for employment income only.',
  },
  {
    question: 'Does filing status matter for Canadian tax?',
    answer:
      'Canada uses individual filing — federal income tax brackets apply to each person\'s income separately, regardless of marital status. The filing status selection does not change the federal calculation in this estimate. In Canada, marital status can affect certain credits (such as the Spouse or Common-Law Partner Amount) that are not modeled in this V1 calculator.',
  },
  {
    question: 'How do I find my state or local tax rate (USA)?',
    answer:
      'State income tax rates vary widely — some states have no income tax (e.g., Florida, Texas, Nevada), while others have rates ranging from under 3% to over 13% (e.g., California). Many states also have local income taxes. Check your state\'s department of revenue website for current rates, or use a flat combined estimate. Enter 0% if your state has no income tax.',
  },
];

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Canada — Federal Tax Calculation
      </h3>
      <div className="my-4 p-4 font-mono space-y-1.5"
        style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em' }}>
        <div>Progressive tax on gross income using 5 federal brackets</div>
        <div>BPA Credit = Basic Personal Amount × 14.5%</div>
        <div>Federal Tax = max(0, Progressive Tax − BPA Credit)</div>
        <div>Provincial Tax ≈ Gross Income × Approx. Provincial Rate</div>
        <div>Total Tax = Federal Tax + Provincial Tax</div>
        <div>After-Tax Income = Gross Income − Total Tax</div>
        <div>Effective Rate = Total Tax ÷ Gross Income × 100</div>
      </div>
      <p className="text-sm text-slate-600">
        Provincial tax is a flat approximation. Actual provincial tax uses progressive brackets unique to each province or territory.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        USA — Federal Tax Calculation
      </h3>
      <div className="my-4 p-4 font-mono space-y-1.5"
        style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em' }}>
        <div>Taxable Income = max(0, Gross Income − Standard Deduction)</div>
        <div>Federal Tax = Progressive tax on Taxable Income (7 brackets)</div>
        <div>State/Local Tax = Gross Income × Manual State Rate</div>
        <div>Total Tax = Federal Tax + State/Local Tax</div>
        <div>After-Tax Income = Gross Income − Total Tax</div>
        <div>Effective Rate = Total Tax ÷ Gross Income × 100</div>
      </div>
      <p className="text-sm text-slate-600">
        Standard deduction applied automatically ($15,750 Single / $31,500 MFJ for 2025). State/local tax is a flat rate on gross income entered manually.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        2025 Federal Tax Brackets
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Canada */}
        <div className="overflow-x-auto" style={{ borderRadius: '8px', border: '1px solid #E4E9EF' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(29,181,132,0.08)' }}>
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700 text-xs" colSpan={2}>Canada Federal (2025)</th>
              </tr>
              <tr style={{ borderTop: '1px solid #E4E9EF' }}>
                <th className="px-3 py-1.5 text-left font-semibold text-slate-600 text-xs">Income</th>
                <th className="px-3 py-1.5 text-left font-semibold text-slate-600 text-xs">Rate</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid #E4E9EF' }}>
              {[
                ['$0 – $57,375', '14.5%'],
                ['$57,375 – $114,750', '20.5%'],
                ['$114,750 – $177,882', '26%'],
                ['$177,882 – $253,414', '29%'],
                ['Over $253,414', '33%'],
              ].map(([inc, rate]) => (
                <tr key={inc} style={{ borderBottom: '1px solid #F1F4F7' }}>
                  <td className="px-3 py-1.5 text-xs text-slate-600">{inc}</td>
                  <td className="px-3 py-1.5 text-xs font-semibold text-slate-800">{rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* USA */}
        <div className="overflow-x-auto" style={{ borderRadius: '8px', border: '1px solid #E4E9EF' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(29,181,132,0.08)' }}>
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700 text-xs" colSpan={2}>USA Federal Single (2025)</th>
              </tr>
              <tr style={{ borderTop: '1px solid #E4E9EF' }}>
                <th className="px-3 py-1.5 text-left font-semibold text-slate-600 text-xs">Taxable Income</th>
                <th className="px-3 py-1.5 text-left font-semibold text-slate-600 text-xs">Rate</th>
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid #E4E9EF' }}>
              {[
                ['$0 – $11,925', '10%'],
                ['$11,925 – $48,475', '12%'],
                ['$48,475 – $103,350', '22%'],
                ['$103,350 – $197,300', '24%'],
                ['$197,300 – $250,525', '32%'],
                ['$250,525 – $626,350', '35%'],
                ['Over $626,350', '37%'],
              ].map(([inc, rate]) => (
                <tr key={inc} style={{ borderBottom: '1px solid #F1F4F7' }}>
                  <td className="px-3 py-1.5 text-xs text-slate-600">{inc}</td>
                  <td className="px-3 py-1.5 text-xs font-semibold text-slate-800">{rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Assumptions &amp; Limitations
      </h3>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>Employment income only</strong> — capital gains, rental, investment, and self-employment income are not modeled.</li>
        <li><strong>No payroll deductions</strong> — CPP, EI (Canada) and FICA, Medicare (USA) are excluded.</li>
        <li><strong>No personal credits or deductions</strong> — beyond BPA (Canada) and standard deduction (USA).</li>
        <li><strong>Approximate provincial rates</strong> (Canada) — flat estimates only; actual provincial tax uses progressive brackets.</li>
        <li><strong>Flat state/local rate</strong> (USA) — user-entered; actual state tax may use brackets.</li>
        <li><strong>2025 constants</strong> — brackets and deductions are indexed annually and may change.</li>
        <li><strong>Educational only</strong> — not a substitute for official CRA, IRS, or provincial tax authority calculations.</li>
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

export default function IncomeTaxCalculatorPage() {
  return (
    <>
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.06) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(29,181,132,0.05) 0%, transparent 100%)',
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(29,181,132,0.04) 0%, transparent 100%)',
            'linear-gradient(180deg, #f3f7fd 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
          ].join(', '),
        }}
      >
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            Income Tax Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Estimate your federal and provincial or state income tax — and see how much of your income you keep.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            2025 estimate · Educational only · Canada &amp; USA
          </p>
        </div>

        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <IncomeTaxCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
