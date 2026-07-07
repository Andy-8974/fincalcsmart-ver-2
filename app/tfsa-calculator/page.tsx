import type { Metadata } from 'next';
import TFSACalculator from './TFSACalculator';

export const metadata: Metadata = {
  title: 'TFSA Contribution & Growth Calculator',
  description:
    'Estimate how your Tax-Free Savings Account contributions may grow tax-free and check whether your planned first-year contributions fit within your available TFSA contribution room. Canada only.',
};

const faqItems: Array<{ question: string; answer: string }> = [
  {
    question: 'What is a TFSA and how does it work?',
    answer:
      'A Tax-Free Savings Account (TFSA) is a registered savings account available to Canadian residents aged 18 or older with a valid SIN. Contributions are made with after-tax dollars, but investment growth — including interest, dividends, and capital gains — is not taxed while held in the account and is not taxed when withdrawn. TFSAs are flexible: you can hold a wide range of investments, withdraw at any time for any reason, and recontribute withdrawn amounts in a future year.',
  },
  {
    question: 'What is TFSA contribution room?',
    answer:
      'TFSA contribution room is the maximum amount you are allowed to contribute to your TFSA in a given year without triggering a tax on excess contributions. Room accumulates each year you are 18 or older and a Canadian resident. The 2026 TFSA annual limit is $7,000. Your personal room may be higher if you have unused room from prior years or if you made withdrawals in a prior year — those withdrawn amounts are added back to your room on January 1 of the following year. Your exact available room can only be confirmed through CRA My Account or your financial institution.',
  },
  {
    question: 'Why do I have to enter my contribution room manually?',
    answer:
      'Your personal TFSA contribution room depends on your full contribution history, withdrawals, and years of eligibility as a Canadian resident — information only CRA holds. This calculator cannot access or calculate your exact room. You must verify your available room directly with CRA My Account, the MyCRA mobile app, or your financial institution before making contributions. The room figure you enter in this calculator is used only for the first-year illustration shown on this page.',
  },
  {
    question: 'How does this calculator check my contribution room?',
    answer:
      'This calculator estimates your first-year planned contribution as your one-time contribution plus 12 months of your monthly contribution amount. It compares this total against the available room you enter. If the first-year plan exceeds your entered room, an over-room warning is shown. This is an educational check only — it is based entirely on the figures you enter and does not reflect your actual CRA room balance. Monthly contributions beyond the first year may use future annual room, which is not modeled.',
  },
  {
    question: 'What happens if I over-contribute to my TFSA?',
    answer:
      'If you contribute more than your available TFSA contribution room in a given year, CRA may assess a 1% per month tax on the excess amount for each month it remains. This applies to the over-contribution amount, not the full balance. The over-contribution warning in this calculator is for educational purposes only and does not constitute tax or legal advice. Always verify your exact available room with CRA My Account before contributing, especially if you have made withdrawals or held multiple TFSAs.',
  },
  {
    question: 'Are TFSA withdrawals added back to my contribution room?',
    answer:
      'Yes — in general, amounts withdrawn from a TFSA are added back to your contribution room on January 1 of the following calendar year. This means withdrawals do not permanently reduce your lifetime room; they restore it after one calendar year. For example, a $5,000 withdrawal in 2026 would re-add $5,000 to your available room on January 1, 2027. This does not apply to certain complex situations; always confirm with CRA or a tax professional if you are unsure.',
  },
  {
    question: 'What assumptions does this calculator make?',
    answer:
      'Five main assumptions: (1) the annual return rate is constant throughout the investment horizon — real investment returns vary; (2) monthly contributions are made every month with no gaps; (3) the effective monthly rate is derived from the nominal annual rate and selected compounding frequency; (4) the available contribution room you enter is taken at face value — this tool cannot verify it; and (5) future annual TFSA room increases beyond the current year are not modeled. All projections are illustrative estimates only.',
  },
];

const formulaContent = (
  <div className="space-y-6">

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Growth Projection
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        The projected TFSA value combines the lump-sum starting balance (current balance + one-time contribution) grown over the full horizon, plus the future value of ongoing monthly contributions:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          FV = P × (1 + r_m)^n + C × [(1 + r_m)^n − 1] ÷ r_m
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        Where P = current balance + one-time contribution, C = monthly contribution, r_m = effective monthly rate, n = total months.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        How TFSA Contribution Room Works
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        TFSA contribution room generally starts accumulating from the year a person turns 18, provided they are a Canadian resident with a valid Social Insurance Number. Key rules to understand:
      </p>
      <ul className="space-y-2 list-disc list-inside text-sm text-slate-600 mb-5">
        <li><strong>Unused room carries forward.</strong> Any room not used in a given year rolls over to the next year automatically.</li>
        <li><strong>Withdrawals restore room.</strong> Amounts withdrawn from a TFSA are generally added back to your contribution room on January 1 of the following calendar year — not the year of withdrawal.</li>
        <li><strong>This calculator does not calculate your exact room.</strong> Your available room depends on your full contribution history, withdrawals, and years of eligibility — information only CRA holds. Always verify your exact available room through CRA My Account, the MyCRA mobile app, or your financial institution before contributing.</li>
      </ul>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        <strong>Illustrative example:</strong> If someone first became eligible in 2016 and made no contributions or withdrawals, their available room by the start of 2026 would be the sum of the annual TFSA limits from 2016 through 2025, plus the 2026 limit:
      </p>
      <div className="overflow-x-auto mb-4" style={{ borderRadius: '12px', border: '1px solid rgba(15,41,66,0.09)' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(29,181,132,0.08)' }}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Year</th>
              <th className="px-4 py-2.5 text-right font-semibold text-slate-700 text-sm">Annual TFSA Limit</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid rgba(15,41,66,0.08)' }}>
            <tr style={{ borderBottom: '1px solid rgba(15,41,66,0.06)' }}><td className="px-4 py-2 text-sm text-slate-700">2016</td><td className="px-4 py-2 text-sm text-right font-semibold text-slate-700">$5,500</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(15,41,66,0.06)' }}><td className="px-4 py-2 text-sm text-slate-700">2017</td><td className="px-4 py-2 text-sm text-right font-semibold text-slate-700">$5,500</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(15,41,66,0.06)' }}><td className="px-4 py-2 text-sm text-slate-700">2018</td><td className="px-4 py-2 text-sm text-right font-semibold text-slate-700">$5,500</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(15,41,66,0.06)' }}><td className="px-4 py-2 text-sm text-slate-700">2019</td><td className="px-4 py-2 text-sm text-right font-semibold text-slate-700">$6,000</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(15,41,66,0.06)' }}><td className="px-4 py-2 text-sm text-slate-700">2020</td><td className="px-4 py-2 text-sm text-right font-semibold text-slate-700">$6,000</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(15,41,66,0.06)' }}><td className="px-4 py-2 text-sm text-slate-700">2021</td><td className="px-4 py-2 text-sm text-right font-semibold text-slate-700">$6,000</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(15,41,66,0.06)' }}><td className="px-4 py-2 text-sm text-slate-700">2022</td><td className="px-4 py-2 text-sm text-right font-semibold text-slate-700">$6,000</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(15,41,66,0.06)' }}><td className="px-4 py-2 text-sm text-slate-700">2023</td><td className="px-4 py-2 text-sm text-right font-semibold text-slate-700">$6,500</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(15,41,66,0.06)' }}><td className="px-4 py-2 text-sm text-slate-700">2024</td><td className="px-4 py-2 text-sm text-right font-semibold text-slate-700">$7,000</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(15,41,66,0.06)' }}><td className="px-4 py-2 text-sm text-slate-700">2025</td><td className="px-4 py-2 text-sm text-right font-semibold text-slate-700">$7,000</td></tr>
            <tr style={{ background: 'rgba(29,181,132,0.04)' }}>
              <td className="px-4 py-2 text-sm text-slate-700" style={{ fontWeight: 600 }}>2026 (current)</td>
              <td className="px-4 py-2 text-sm text-right font-semibold text-slate-700">$7,000</td>
            </tr>
            <tr style={{ borderTop: '2px solid rgba(15,41,66,0.12)', background: 'rgba(29,181,132,0.06)' }}>
              <td className="px-4 py-2.5 text-sm font-bold" style={{ color: '#0D1B2A' }}>Illustrative total (eligible from 2016, no prior contributions or withdrawals)</td>
              <td className="px-4 py-2.5 text-sm text-right font-bold" style={{ color: '#1DB584' }}>$68,000</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        This is a simplified example. Your actual available room depends on your personal contribution history, prior withdrawals, and when you first became eligible. <strong>Always verify with CRA My Account before contributing.</strong>
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        First-Year Room Check
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        The first-year contribution plan and room check:
      </p>
      <div className="overflow-x-auto">
        <div className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
          firstYearPlan = oneTime + monthly × 12
          <br />
          roomRemaining = availableRoom − firstYearPlan
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">
        If firstYearPlan exceeds availableRoom, an over-room warning is shown. This is an educational estimate based on the available room you enter — not verified CRA data.
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
        <li><strong>User-provided room</strong> — available contribution room is entered by the user and is not calculated or verified by this tool.</li>
        <li><strong>First-year room only</strong> — the room check covers year one only; future annual TFSA limits are not modeled.</li>
        <li><strong>No taxes, fees, or inflation</strong> — all values are shown in nominal pre-fee dollars. TFSA growth is tax-free within the account.</li>
        <li><strong>No withdrawal modeling</strong> — this calculator does not account for withdrawals or the recontribution of withdrawn amounts.</li>
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

export default function TFSACalculatorPage() {
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
            TFSA Contribution &amp; Growth Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Estimate how your Tax-Free Savings Account contributions may grow and check your first-year contribution room.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Canada only · Tax-free growth illustration · Verify room with CRA My Account
          </p>
        </div>

        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <TFSACalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
