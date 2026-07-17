import type { Metadata } from 'next';
import { type Faq } from '@/components/layout/CalculatorLayout';
import USAMortgageCalculator from './USAMortgageCalculator';

export const metadata: Metadata = {
  title: 'US Mortgage Calculator 2025 | PMI, 30-Year Fixed, Amortization',
  description:
    'Calculate your US mortgage payment with PMI, the 28/36 affordability rule, conventional and FHA loan comparisons, and a full amortization schedule. Compare 15 vs 20 vs 30-year terms.',
};

const faqs: Faq[] = [
  {
    question: 'What credit score do I need for a mortgage in the USA?',
    answer:
      "Conventional loans backed by Fannie Mae or Freddie Mac require a minimum 620 credit score. FHA loans accept 580+ (with 3.5% down) or even 500–579 with 10% down. VA and USDA loans have no official floor but most lenders enforce 620+. The best rates — often 0.5%–1% lower — go to borrowers with scores above 760.",
  },
  {
    question: 'What is PMI and when can I remove it?',
    answer:
      "Private Mortgage Insurance protects your lender (not you) if you default. Under the federal Homeowners Protection Act (HPA), you can request PMI cancellation when your loan balance reaches 80% of the original purchase price, and it must be automatically terminated when the balance hits 78%. FHA loans have a different rule: MIP (Mortgage Insurance Premium) stays for the life of the loan if your down payment was under 10%. This calculator uses the PMI rate you enter directly rather than deriving it from your credit score.",
  },
  {
    question: 'What is the difference between a conventional and FHA loan?',
    answer:
      "Conventional loans (backed by Fannie Mae/Freddie Mac) require a 620+ credit score and 3–20% down. PMI drops once you reach 20% equity. FHA loans (backed by HUD) require only 580 credit and 3.5% down, but carry an upfront MIP of 1.75% plus annual MIP for the life of the loan (if < 10% down). Bottom line: FHA is better for lower credit scores; conventional costs less long-term for well-qualified borrowers.",
  },
  {
    question: 'Is mortgage interest tax-deductible in the US?',
    answer:
      "Yes, for loans originated after December 15, 2017, you can deduct interest on up to $750,000 of mortgage debt on your primary and secondary residence if you itemize deductions on Schedule A (Form 1040). The standard deduction ($16,100 for single filers in 2026, per IRS inflation adjustments) is now so high that most homeowners — especially early in their mortgage when interest is highest — benefit most from itemizing. Consult a tax advisor for your specific situation.",
  },
  {
    question: 'What is the 28/36 rule for affordability?',
    answer:
      "The 28/36 rule is the classic affordability guideline: housing costs (principal, interest, taxes, insurance, PMI, HOA) should not exceed 28% of your gross monthly income. All debt payments (housing + car loans + student loans + credit cards) should not exceed 36%. Fannie Mae's Selling Guide caps manually underwritten loans at 36% DTI in general, extending up to 45% only when specific credit score and reserve requirements are met; loans run through Desktop Underwriter (DU) automated underwriting can reach up to 50% for well-qualified borrowers — but staying closer to 28/36 provides meaningful financial cushion.",
  },
];

const formulaSection = (
  <div className="space-y-6">
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        The Formula — Standard Monthly Compounding
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">US mortgages use standard monthly compounding. Your monthly principal and interest payment is calculated as:</p>
      <div className="overflow-x-auto">
        <div
          className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '18px', fontWeight: 700, letterSpacing: '0.02em' }}
        >
          M = P × [r(1 + r)ⁿ] / [(1 + r)ⁿ − 1]
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        Where <strong>P</strong> is the loan principal, <strong>r</strong> is the monthly rate (annual rate ÷ 12),
        and <strong>n</strong> is the total number of monthly payments (loan term × 12).
      </p>
      <p className="text-sm text-slate-600 leading-relaxed">
        Each monthly payment covers accrued interest first; the remainder reduces your principal. In the early years
        of a 30-year mortgage, roughly 75–80% of each payment goes toward interest. By the final years, nearly all
        of each payment is principal. This front-loading of interest is why making extra payments early has an
        outsized impact on total interest paid.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Private Mortgage Insurance (PMI) — Typical Market Rates (Reference Only)
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        PMI is required on conventional loans when your down payment is less than 20%. It protects your lender —
        not you — in the event of default. Under the <strong>Homeowners Protection Act (HPA)</strong>, PMI must be
        automatically cancelled when your loan balance reaches 78% of the original purchase price, and you may
        request cancellation once it reaches 80%.
      </p>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        This calculator uses the PMI rate you enter above — it does not calculate a rate from your credit score.
        The table below shows typical market PMI pricing by credit tier for general reference only; your actual
        rate depends on your lender, loan program, credit profile, and loan-to-value ratio.
      </p>
      <div
        className="mt-4 overflow-x-auto"
        style={{ borderRadius: '8px', border: '1px solid #E4E9EF' }}
      >
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(29,181,132,0.10)' }}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Credit Score</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Typical PMI Rate</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Monthly PMI on $400K Loan</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid #E4E9EF' }}>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">760+</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-emerald-600">0.20% – 0.50%</td>
              <td className="px-4 py-2.5 text-sm text-emerald-600">$67 – $167</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">700 – 759</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-amber-600">0.50% – 0.80%</td>
              <td className="px-4 py-2.5 text-sm text-amber-600">$167 – $267</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">660 – 699</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-amber-600">0.80% – 1.20%</td>
              <td className="px-4 py-2.5 text-sm text-amber-600">$267 – $400</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-sm text-slate-600">620 – 659</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-rose-600">1.20% – 1.50%</td>
              <td className="px-4 py-2.5 text-sm text-rose-600">$400 – $500</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        The 28/36 Rule — US Affordability Standard
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">The 28/36 rule is the foundational affordability guideline used by US lenders and financial planners:</p>
      <ul className="mt-2 space-y-2 list-disc list-inside text-sm text-slate-600">
        <li><strong>28% front-end ratio</strong> — Housing costs (P&amp;I + property tax + homeowners insurance + PMI + HOA) ≤ 28% of gross monthly income.</li>
        <li><strong>36% back-end ratio</strong> — All monthly debt payments (housing + car loans + student loans + credit cards) ≤ 36% of gross monthly income.</li>
      </ul>
      <p className="text-sm text-slate-600 leading-relaxed mt-3">
        Fannie Mae's Selling Guide (B3-6-02) caps manually underwritten loans at 36% DTI in general, extending to
        45% only when specific credit score and reserve requirements are met; loans run through Desktop Underwriter
        (DU) automated underwriting can reach up to 50% for well-qualified borrowers — but staying closer to 28/36
        provides genuine financial security.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Loan Types: Conventional, FHA, VA, and USDA
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        <strong>Conventional loans</strong> (backed by Fannie Mae/Freddie Mac) require 620+ credit and 3–20% down;
        no government-mandated MIP once you reach 20% equity. <strong>FHA loans</strong> (backed by HUD) accept
        580+ credit with just 3.5% down, but carry an upfront MIP of 1.75% plus annual MIP for the life of the loan.
      </p>
      <p className="text-sm text-slate-600 leading-relaxed">
        <strong>VA loans</strong> (for eligible veterans and service members) offer 0% down, no PMI, and competitive
        rates — often the best deal available if you qualify. <strong>USDA loans</strong> offer 0% down for eligible
        rural and suburban properties with a small annual fee but no conventional PMI.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        Mortgage Interest Tax Deduction
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">
        US homeowners who itemize deductions on Schedule A can deduct mortgage interest paid on up to{' '}
        <strong>$750,000</strong> of mortgage debt on a primary or secondary residence (for loans originated after
        December 15, 2017; older loans have a $1M cap). The 2017 Tax Cuts and Jobs Act nearly doubled the standard
        deduction ($16,100 single / $32,200 married filing jointly in 2026, per IRS inflation adjustments) — compare
        both to maximize your benefit.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        5 Strategies to Pay Off Your US Mortgage Faster
      </h3>
      <ol className="space-y-3 list-decimal list-inside text-sm text-slate-600">
        <li><strong>Make one extra payment per year</strong> — Applying a 13th payment annually to principal reduces a 30-year mortgage to approximately 25 years.</li>
        <li><strong>Round up to the nearest $100</strong> — Even rounding $1,847 to $1,900 each month meaningfully accelerates payoff.</li>
        <li><strong>Refinance when rates drop 0.75%+</strong> — The break-even point for refinancing is typically 18–30 months. If you plan to stay that long, refinancing can save tens of thousands.</li>
        <li><strong>Apply windfalls to principal</strong> — Tax refunds, bonuses, and inheritances applied directly to principal provide an outsized return compared to any savings account.</li>
        <li><strong>Consider a 15-year at renewal or refi</strong> — The interest savings on a 15-year mortgage vs. a 30-year are dramatic: often $100,000–$200,000 on a $400K loan.</li>
      </ol>
    </section>
  </div>
);

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};

export default function USMortgageCalculatorPage() {
  return (
    <>
      {/*
        ── Single top-shell gradient wrapper ────────────────────────────────────
        Matches the Canadian Mortgage Calculator V2 page shell exactly.
        ONE background covers: floating nav zone, banner, workspace (Blocks A+B).
        Blocks C–G sit on the flat body colour (#F8FAFB).
        ──────────────────────────────────────────────────────────────────────── */}
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.10) 0%, transparent 100%)',
            'radial-gradient(ellipse 500px 400px at top right, rgba(147,197,253,0.14) 0%, transparent 100%)',
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(196,181,253,0.07) 0%, transparent 100%)',
            'linear-gradient(180deg, #f3faf8 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
          ].join(', '),
        }}
      >
        {/* ── Banner ── */}
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            US Mortgage Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Estimate payments, compare scenarios, and understand your mortgage with US lending rules and AI-assisted insights.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Monthly compounding · PMI · 28/36 DTI rule · Compare 15, 20 & 30-year terms
          </p>
        </div>

        {/* ── Calculator workspace + lower sections ── */}
        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <USAMortgageCalculator formulaContent={formulaSection} faqItems={faqs} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
