import type { Metadata } from 'next';
import RRSPSavingsCalculator from './RRSPSavingsCalculator';

export const metadata: Metadata = {
  title: 'RRSP Savings & Tax Refund Calculator',
  description:
    'Estimate your RRSP growth, check your first-year deduction room usage, and see a simplified tax refund estimate based on your marginal rate. Canada only.',
};

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'What is an RRSP and how does it work?',
    answer:
      'A Registered Retirement Savings Plan (RRSP) is a Canadian government-registered account designed to help you save for retirement. Contributions are generally tax-deductible — they reduce your taxable income in the year you contribute — and investment growth inside the account is tax-deferred until withdrawal. When you withdraw funds (typically in retirement), the amount is included in your income and taxed at your marginal rate at that time. The idea is that your marginal rate in retirement will be lower than during your working years.',
  },
  {
    question: 'What is RRSP deduction room?',
    answer:
      'Your RRSP deduction room (also called contribution room) is the maximum amount you can contribute to your RRSP and deduct from income in a given year. It is generally calculated as 18% of your previous year\'s earned income, up to the annual dollar maximum ($33,810 for 2026), minus any pension adjustment, plus any unused room carried forward from prior years. This annual maximum is a ceiling, not your personal figure — only CRA holds your complete and authoritative deduction room. Always verify your exact available room in CRA My Account, on your Notice of Assessment, or via Form T1028 before contributing.',
  },
  {
    question: 'Why do I have to enter my deduction room manually?',
    answer:
      'Your personal RRSP deduction room depends on your full earned income history, pension adjustments, past service pension adjustments, and unused room from prior years — information only CRA holds. This calculator cannot access or calculate your exact room. The room figure you enter is used only for the first-year illustration on this page. Always verify your exact available room directly with CRA My Account, the MyCRA mobile app, or your Notice of Assessment before making RRSP contributions.',
  },
  {
    question: 'How is the estimated tax reduction calculated?',
    answer:
      'The estimated tax reduction is calculated as: first-year in-room contribution × your entered marginal tax rate. It is a simplified illustration only. It does not reflect your actual CRA tax return, account for other sources of income, model provincial surtaxes, deduction phasing, pension credits, or any other tax factor. Your actual tax refund or reduction will differ. This is not tax advice — consult a qualified tax advisor for a personalized assessment.',
  },
  {
    question: 'How does this calculator check my deduction room?',
    answer:
      'This calculator estimates your first-year planned contribution as your one-time contribution plus 12 months of your monthly contribution. It compares this total against the available room you enter. If the first-year plan exceeds your entered room, an over-room warning is shown. This is an educational check based entirely on your inputs — it does not reflect your actual CRA room balance. Monthly contributions beyond the first year may use future annual RRSP room, which is not modeled here.',
  },
  {
    question: 'What is the RRSP contribution deadline?',
    answer:
      'You generally have until 60 days after the end of the tax year to make RRSP contributions that can be deducted on that year\'s tax return. For contributions to be deductible on your 2026 tax return, the deadline is the 60th day of 2027 — typically March 1, 2027. Contributions made after that date apply to the following tax year. Always confirm the exact deadline on the CRA website, as dates can shift slightly based on weekends and holidays.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'Six main assumptions: (1) the annual return rate is constant throughout the investment horizon — real returns vary year to year; (2) monthly contributions are made every month with no gaps; (3) the effective monthly rate is derived from the nominal annual rate and selected compounding frequency; (4) the available deduction room you enter is taken at face value — this tool cannot verify it; (5) future annual RRSP room beyond the current year is not modeled; and (6) no taxes, fees, or inflation adjustments are applied to the growth projection. RRSP withdrawals are taxed as income and are not modeled here. All projections are illustrative estimates only.',
  },
];

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Growth Projection
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        The projected RRSP value combines the lump-sum starting balance (current balance + one-time contribution) grown over the full horizon, plus the future value of ongoing monthly contributions:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          FV = P × (1 + r_m)^n + C × [(1 + r_m)^n − 1] ÷ r_m
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        Where P = current balance + one-time contribution, C = monthly contribution, r_m = effective monthly rate, n = total months.
        Growth inside the RRSP is tax-deferred — it is not taxed until withdrawal.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Estimated Tax Reduction
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        The estimated tax reduction is a simplified illustration based on the in-room portion of your first-year contribution:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          taxRefundBase = min(firstYearPlan, availableRoom)
          <br />
          estimatedTaxReduction = taxRefundBase × (marginalTaxRate ÷ 100)
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        This is a simplified estimate only. It does not reflect your actual CRA tax return, other income, provincial surtaxes,
        deduction phasing, or any other tax factor. This is not tax advice.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        First-Year Room Check
      </h3>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          firstYearPlan = oneTime + monthly × 12
          <br />
          roomRemaining = availableRoom − firstYearPlan
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        If firstYearPlan exceeds availableRoom, an over-room warning is shown. This is an educational estimate — not verified CRA data.
        Monthly contributions beyond the first year may use future annual room, which is not modeled.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        How RRSP Deduction Room Works
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        RRSP deduction room is generally calculated by CRA based on your earned income, annual limits, pension adjustments, and unused room carried forward. Key things to know:
      </p>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600 mb-5">
        <li><strong>Annual dollar maximum.</strong> For 2026, the RRSP annual dollar maximum is $33,810. This is the ceiling on current-year room alone — it is not your personal deduction limit, which may be lower (if your earned income is lower) or higher (via carried-forward unused room).</li>
        <li><strong>18% of earned income.</strong> Your room for a given year is generally 18% of your previous year&apos;s earned income, up to the annual limit, minus your pension adjustment.</li>
        <li><strong>Unused room carries forward.</strong> Any room not used in a prior year rolls over automatically — so your available room may be much larger than the current year&apos;s limit.</li>
        <li><strong>Verify with CRA.</strong> This calculator does not calculate or verify your exact deduction room. Always check CRA My Account, your Notice of Assessment, or Form T1028 before contributing.</li>
      </ul>
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
        <li><strong>User-provided room</strong> — available deduction room is entered by the user and is not calculated or verified by this tool.</li>
        <li><strong>First-year room only</strong> — the room check covers year one only; future annual RRSP limits are not modeled.</li>
        <li><strong>No withdrawal modeling</strong> — RRSP withdrawals are taxed as income and are not modeled here.</li>
        <li><strong>No fees or inflation</strong> — all values are shown in nominal pre-fee dollars.</li>
        <li><strong>Simplified tax estimate</strong> — the tax reduction estimate uses a flat marginal rate and does not model the full tax calculation.</li>
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

export default function RRSPSavingsCalculatorPage() {
  return (
    <>
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.08) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(29,181,132,0.06) 0%, transparent 100%)',
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
            RRSP Savings Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Estimate your RRSP growth, check your first-year deduction room, and see a simplified tax refund estimate.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Canada only · Tax-deferred growth illustration · Verify room with CRA My Account · Not tax advice
          </p>
        </div>

        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <RRSPSavingsCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
