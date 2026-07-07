import type { Metadata } from 'next';
import SalaryCalculator from './SalaryCalculator';

export const metadata: Metadata = {
  title: 'Salary Calculator — Hourly, Weekly, Monthly & Annual Pay',
  description:
    'Convert your salary to hourly, weekly, biweekly, monthly, and annual pay. Estimate take-home pay after deductions for USA and Canada. Free salary calculator with AI insights.',
};

const faqItems = [
  {
    question: 'How do I convert an hourly wage to an annual salary?',
    answer:
      'Multiply your hourly rate by your hours per week, then multiply by the number of weeks you work per year. For example: $25/hr x 40 hrs/week x 52 weeks = $52,000 annual salary. The calculator does this automatically when you select "Hourly" as your salary type.',
  },
  {
    question: 'What is the difference between biweekly and semi-monthly pay?',
    answer:
      'Biweekly means you are paid every two weeks — 26 paycheques per year. Two months each year will have three paycheques. Semi-monthly means you are paid twice per month on fixed dates (e.g., the 1st and 15th) — exactly 24 paycheques per year. The annual gross is the same either way, but the per-paycheque amount differs slightly.',
  },
  {
    question: 'What deduction rate should I use?',
    answer:
      'Many earners use 20-35% as a rough starting estimate. The right rate depends on your country, province or state, income level, filing status, and payroll deductions (income tax, CPP/EI in Canada, FICA/Medicare in the USA, benefit premiums, retirement contributions, etc.). Check your most recent paystub for your actual total deductions as a percentage of gross pay for a personalized estimate.',
  },
  {
    question: 'Does this calculator account for Canadian or US tax brackets?',
    answer:
      'No. This calculator uses a single user-entered deduction rate — it does not model official federal or provincial/state tax brackets, CPP, EI, FICA, Medicare, or any other specific payroll deductions. For a detailed tax estimate, use a tax-specific calculator or consult a payroll professional.',
  },
  {
    question: 'Why does my biweekly gross not equal my monthly gross multiplied by 2?',
    answer:
      'A month is longer than two weeks. There are 26 biweekly pay periods in a year but only 12 monthly periods. Your monthly gross = annual divided by 12, while your biweekly gross = annual divided by 26. Multiplying the biweekly amount by 2 gives you two weeks of pay, not a calendar month.',
  },
  {
    question: 'How is the effective hourly rate calculated?',
    answer:
      'The effective hourly rate is your estimated annual take-home pay divided by your total annual hours worked (hours per week multiplied by weeks per year). This gives you a sense of what each working hour is truly worth after estimated deductions — useful for comparing job offers or evaluating contract versus salaried work.',
  },
  {
    question: 'What is the Pay Clarity Score?',
    answer:
      'The Pay Clarity Score (0-100) is an illustrative metric showing the strength of your take-home pay relative to your gross. A higher score means more of your gross pay reaches your bank account. It is based on your estimated take-home percentage and is intended as a quick visual reference — not a financial rating or benchmark.',
  },
  {
    question: 'Can I use this calculator for contract or freelance income?',
    answer:
      'Yes. Enter your hourly rate and set your expected hours per week and billable weeks per year. Keep in mind that self-employed earners often have higher deduction rates (no employer CPP/EI or FICA match, plus potential self-employment tax), so you may want to use a higher deduction rate estimate — often 30-40% or more depending on your situation.',
  },
];

const formulaContent = (
  <div className="space-y-6">
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Salary Normalization
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        The calculator converts any salary type to an annual gross figure, then derives all pay periods from it.
      </p>
      <ul className="space-y-1.5 list-disc list-inside text-sm text-slate-600">
        <li><strong>Annual:</strong> the entered amount is used directly</li>
        <li><strong>Monthly:</strong> annual = monthly x 12</li>
        <li><strong>Biweekly:</strong> annual = biweekly x 26</li>
        <li><strong>Weekly:</strong> annual = weekly x weeks per year</li>
        <li><strong>Hourly:</strong> annual = hourly x hours per week x weeks per year</li>
      </ul>
    </section>
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Pay Period Breakdown
      </h3>
      <ul className="space-y-1.5 list-disc list-inside text-sm text-slate-600">
        <li><strong>Monthly:</strong> annual divided by 12 (12 paycheques/year)</li>
        <li><strong>Semi-monthly:</strong> annual divided by 24 (2 per month, 24/year)</li>
        <li><strong>Biweekly:</strong> annual divided by 26 (every 2 weeks, 26/year)</li>
        <li><strong>Weekly:</strong> annual divided by weeks per year</li>
        <li><strong>Daily:</strong> annual divided by (weeks per year x 5 working days)</li>
        <li><strong>Hourly equivalent:</strong> annual divided by total annual hours worked</li>
      </ul>
    </section>
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Take-Home Estimate
      </h3>
      <ul className="space-y-1.5 list-disc list-inside text-sm text-slate-600">
        <li><strong>Annual deductions:</strong> annual gross x deduction rate / 100</li>
        <li><strong>Annual take-home:</strong> annual gross minus annual deductions</li>
        <li><strong>Take-home per period:</strong> annual take-home / pay periods per year</li>
        <li><strong>Effective hourly rate:</strong> annual take-home / total annual hours</li>
      </ul>
      <p className="text-sm text-slate-500 mt-4 italic">
        The deduction rate is a user-entered estimate. It does not account for specific brackets, CPP, EI, FICA, Medicare, employee benefits, or tax credits. Actual take-home pay depends on your country, province/state, tax year, and employer setup.
      </p>
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

export default function SalaryCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.09) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(14,165,233,0.07) 0%, transparent 100%)',
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(29,181,132,0.04) 0%, transparent 100%)',
            'linear-gradient(180deg, #f3f7fd 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
          ].join(', '),
        }}
      >
        {/* Banner */}
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            Salary Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Convert your salary to any pay period and estimate take-home pay after deductions.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Hourly · Biweekly · Monthly · Annual · Canada &amp; USA
          </p>
        </div>

        {/* Calculator */}
        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <SalaryCalculator formulaContent={formulaContent} faqItems={faqItems} />
        </div>
      </div>
    </>
  );
}
