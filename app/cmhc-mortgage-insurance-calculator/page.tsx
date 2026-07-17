import type { Metadata } from 'next';
import { type Faq } from '@/components/layout/CalculatorLayout';
import CMHCInsuranceCalculator from './CMHCInsuranceCalculator';

export const metadata: Metadata = {
  title: 'CMHC Mortgage Insurance Calculator 2026 | Premium Estimator',
  description:
    'Estimate your CMHC mortgage default insurance premium for Canadian home purchases. See down payment thresholds, premium rates, and next-threshold savings — Canada only.',
};

const faqs: Faq[] = [
  {
    question: 'What is CMHC mortgage insurance and who needs it?',
    answer:
      'CMHC (Canada Mortgage and Housing Corporation) mortgage default insurance is mandatory when your down payment is less than 20% of the purchase price. It protects the lender — not you — against default, but allows buyers to purchase sooner with a smaller down payment. The premium is added to your mortgage balance and repaid with interest over the amortization period.',
  },
  {
    question: 'How is the CMHC insurance premium calculated?',
    answer:
      'The premium is a percentage of your base mortgage (purchase price minus down payment). The rate depends on your down payment percentage: 4.00% for 5%–9.99% down, 3.10% for 10%–14.99%, and 2.80% for 15%–19.99%. Putting 20% or more down avoids CMHC insurance entirely. The premium is added to your mortgage balance, not paid upfront.',
  },
  {
    question: 'Are homes over $1.5 million eligible for CMHC insurance?',
    answer:
      'No. CMHC mortgage default insurance is only available for homes with a purchase price below $1,500,000. Properties at or above $1.5M require a conventional mortgage with a minimum 20% down payment — CMHC insurance cannot be used regardless of down payment size.',
  },
  {
    question: 'What is the minimum down payment in Canada?',
    answer:
      'For homes priced at $500,000 or less: the minimum is 5% of the purchase price. For homes between $500,001 and $1,499,999: the minimum is 5% on the first $500,000 plus 10% on the portion above $500,000. For example, a $750,000 home requires $25,000 (5% of $500K) + $25,000 (10% of $250K) = $50,000 minimum. For $1.5M+: 20% conventional minimum applies.',
  },
  {
    question: 'Can I get a 30-year amortization with a CMHC-insured mortgage?',
    answer:
      'As of December 15, 2024, CMHC allows 30-year amortization on insured mortgages when the borrower is a first-time homebuyer (has not owned and occupied a home as a principal residence in the last 4 years) or is purchasing a newly constructed home that has not previously been occupied for residential purposes. All other insured mortgage borrowers are limited to a 25-year maximum amortization.',
  },
  {
    question: 'Does CMHC insurance include provincial sales tax?',
    answer:
      'Provincial sales tax may apply to the mortgage insurance premium. CMHC currently identifies Ontario, Quebec and Saskatchewan on its premium information page. The tax cannot be added to the mortgage — it must be paid upfront — and provincial tax treatment can vary by insurer or change over time, so confirm current treatment with your lender or insurer. This calculator does not include provincial PST in its estimates.',
  },
];

const formulaSection = (
  <div className="space-y-6">
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        CMHC Premium Rate Table
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        The CMHC premium rate depends on your down payment percentage. Rates apply to the base mortgage amount (purchase price minus down payment) and are added to your loan balance.
      </p>
      <div className="overflow-x-auto" style={{ borderRadius: '8px', border: '1px solid #E4E9EF' }}>
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(29,181,132,0.10)' }}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Down Payment %</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">CMHC Premium Rate</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Example on $600K home</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid #E4E9EF' }}>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">5% – 9.99%</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-rose-600">4.00%</td>
              <td className="px-4 py-2.5 text-sm text-rose-600">$22,800 on $570K mortgage</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">10% – 14.99%</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-amber-600">3.10%</td>
              <td className="px-4 py-2.5 text-sm text-amber-600">$16,740 on $540K mortgage</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">15% – 19.99%</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-amber-600">2.80%</td>
              <td className="px-4 py-2.5 text-sm text-amber-600">$14,280 on $510K mortgage</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-sm text-slate-600">20% or more</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-emerald-600">None</td>
              <td className="px-4 py-2.5 text-sm text-emerald-600">$0 — conventional mortgage</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Minimum Down Payment Rules
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        The federal minimum down payment in Canada is tiered by purchase price:
      </p>
      <ul className="space-y-2 text-sm text-slate-600">
        <li className="flex gap-2">
          <span className="font-semibold text-slate-700 shrink-0">$500,000 or less:</span>
          Minimum 5% of the full purchase price.
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-slate-700 shrink-0">$500,001 – $1,499,999:</span>
          5% on the first $500,000 + 10% on the portion above $500,000.
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-slate-700 shrink-0">$1,500,000 or more:</span>
          CMHC insurance is unavailable — 20% conventional down payment required.
        </li>
      </ul>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        How the Premium Is Applied
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">
        The CMHC premium is not paid upfront at closing (except for the provincial sales tax portion in applicable provinces). Instead, it is added directly to your mortgage balance and amortized over your full amortization period at your contracted interest rate. This means the actual cost of the premium over time is higher than the face value — for example, a $20,000 premium on a 25-year mortgage at 5.50% adds roughly $35,000 in total principal and interest payments.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        30-Year Amortization — Eligibility
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">
        As of December 15, 2024, CMHC-insured mortgages may have an amortization of up to 30 years when the borrower is a first-time homebuyer <em>or</em> is purchasing a newly constructed home. Without one of these conditions, the maximum insured amortization is 25 years. Conventional mortgages (20%+ down) are not subject to this restriction.
      </p>
    </section>
  </div>
);

export default function CMHCInsuranceCalculatorPage() {
  return (
    <>
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.13) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(147,197,253,0.17) 0%, transparent 100%)',
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(196,181,253,0.09) 0%, transparent 100%)',
            'linear-gradient(180deg, #f3faf8 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
          ].join(', '),
        }}
      >
        {/* Banner */}
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            CMHC Mortgage Insurance Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Estimate your CMHC mortgage default insurance premium, see down payment thresholds, and understand your next savings opportunity.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Canada only · CMHC premium rates · Down payment eligibility
          </p>
        </div>

        {/* Calculator workspace */}
        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <CMHCInsuranceCalculator formulaContent={formulaSection} faqItems={faqs} />
        </div>
      </div>
    </>
  );
}
