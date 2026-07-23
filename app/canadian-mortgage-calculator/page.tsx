import type { Metadata } from 'next';
import Link from 'next/link';
import { type Faq } from '@/components/layout/CalculatorLayout';
import CanadaMortgageCalculator from './CanadaMortgageCalculator';

export const metadata: Metadata = {
  title: 'Canadian Mortgage Calculator 2026 | CMHC, Semi-Annual Compounding',
  description:
    'Calculate your Canadian mortgage payment with CMHC insurance, semi-annual compounding (Interest Act), GDS/TDS ratios, and a full amortization schedule. Compare 15 vs 25 vs 30-year terms.',
};

const faqs: Faq[] = [
  {
    question: 'What credit score do I need for a mortgage in Canada?',
    answer:
      'For CMHC-insured mortgages (under 20% down), most lenders require a minimum score of 680. For conventional mortgages, 680–720 is typical, though some lenders accept 650 with compensating factors like a large down payment or stable income. Your score affects your rate: 750+ often unlocks the best available rates.',
  },
  {
    question: 'What is CMHC insurance and how much does it cost?',
    answer:
      'CMHC (Canada Mortgage and Housing Corporation) mortgage default insurance is mandatory when your down payment is less than 20%. The premium — 2.80% to 4.00% of your mortgage — is added to your loan balance and paid back with interest over your amortization. It protects the lender, not you, but it allows you to buy sooner with less than 20% down.',
  },
  {
    question: "How does Canada's mortgage stress test work?",
    answer:
      'The federal B-20 guideline (OSFI) requires you to qualify at the higher of: (a) your contracted rate + 2%, or (b) the Bank of Canada\'s minimum qualifying rate (currently 5.25%). If a lender offers you 5.5%, you must prove you can afford payments at 7.5%. This applies to all federally regulated lenders regardless of down payment size. This calculator uses your entered contract rate for its payment and GDS/TDS estimates — it does not apply the stress-test rate. For a formal, stress-tested qualification estimate, use the Mortgage Qualifier Calculator.',
  },
  {
    question: 'Can I use my RRSP or FHSA to buy a home?',
    answer:
      "Yes — two powerful programs exist for Canadians. The RRSP Home Buyers' Plan (HBP) lets first-time buyers withdraw up to $35,000 ($70,000 per couple) tax-free, repayable over 15 years. The First Home Savings Account (FHSA), introduced in 2023, allows up to $8,000/year ($40,000 lifetime) in contributions that are tax-deductible on the way in and completely tax-free on withdrawal for a qualifying home purchase.",
  },
  {
    question: 'What are GDS and TDS ratios, and why do they matter?',
    answer:
      "The Gross Debt Service (GDS) ratio is your total monthly housing costs (P&I, property tax, heat, 50% of condo fees) divided by gross monthly income — lenders require GDS ≤ 32%. The Total Debt Service (TDS) ratio adds all other debts — lenders require TDS ≤ 44%. This calculator estimates both ratios using the interest rate you enter above, so they are planning estimates rather than a lender's formal mortgage-qualification result — Canadian lenders may assess your application at the federal stress-test rate instead. A GDS under 28% is the hallmark of a financially comfortable mortgage.",
  },
];

const formulaSection = (
  <div className="space-y-6">
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        The Formula — With Canadian Semi-Annual Compounding
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">Your monthly principal and interest payment is derived from the standard amortization formula:</p>
      <div className="overflow-x-auto">
        <div
          className="my-4 p-4 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '18px', fontWeight: 700, letterSpacing: '0.02em' }}
        >
          M = P × [r(1 + r)ⁿ] / [(1 + r)ⁿ − 1]
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        What makes Canada unique: the <strong>Interest Act (RSC 1985)</strong> mandates that residential mortgage
        rates be compounded semi-annually, not monthly. The effective monthly rate is:
      </p>
      <div className="overflow-x-auto">
        <div
          className="my-3 p-3 text-center font-mono"
          style={{ borderRadius: '8px', background: '#0A1628', color: '#1DB584', fontSize: '15px', fontWeight: 700 }}
        >
          r_monthly = (1 + annual_rate / 2)^(1/6) − 1
        </div>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        A quoted rate of 5.25% compounded semi-annually yields an effective annual rate of approximately 5.32% —
        meaningfully different from a US-style monthly compounded rate.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        CMHC Insurance — Full Rate Table
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        When your down payment is below 20%, mortgage default insurance is mandatory. The premium is added to your
        loan balance.
      </p>
      <div
        className="mt-4 overflow-x-auto"
        style={{ borderRadius: '8px', border: '1px solid #E4E9EF' }}
      >
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(29,181,132,0.10)' }}>
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">Down Payment</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">CMHC Premium Rate</th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 text-sm">On $600K</th>
            </tr>
          </thead>
          <tbody style={{ borderTop: '1px solid #E4E9EF' }}>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">5% – 9.99%</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-rose-600">4.00%</td>
              <td className="px-4 py-2.5 text-sm text-rose-600">$24,000</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">10% – 14.99%</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-amber-600">3.10%</td>
              <td className="px-4 py-2.5 text-sm text-amber-600">$18,600</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F4F7' }}>
              <td className="px-4 py-2.5 text-sm text-slate-600">15% – 19.99%</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-amber-600">2.80%</td>
              <td className="px-4 py-2.5 text-sm text-amber-600">$16,800</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-sm text-slate-600">20% or more</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-emerald-600">None</td>
              <td className="px-4 py-2.5 text-sm text-emerald-600">$0</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        The Stress Test (B-20 Guidelines)
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        The OSFI B-20 stress test requires you to qualify at the higher of: (a) contracted rate + 2%, or (b) 5.25%.
        If your lender offers 5.5%, you must prove you can afford 7.5% payments. This applies regardless of down
        payment size.
      </p>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        This calculator uses your entered contract rate for its payment, amortization, and GDS/TDS estimates — it
        does not apply the stress-test rate above. For a formal, stress-tested view of how much you may qualify
        for,{' '}
        <Link href="/mortgage-qualifier-calculator" className="font-semibold hover:underline" style={{ color: '#1DB584' }}>
          use the Mortgage Qualifier Calculator
        </Link>.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        GDS &amp; TDS — Canada's Affordability Framework
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        <strong>Gross Debt Service (GDS) ≤ 32%</strong> — Housing costs (P&amp;I + tax + heat + 50% condo fees) ÷
        gross monthly income.
      </p>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        <strong>Total Debt Service (TDS) ≤ 44%</strong> — All debt payments ÷ gross monthly income. Financial
        planners recommend targeting GDS below 28% for genuine flexibility.
      </p>
    </section>

    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>
        5 Strategies to Pay Off Faster
      </h3>
      <ol className="space-y-3 list-decimal list-inside text-sm text-slate-600">
        <li><strong>Accelerated bi-weekly payments</strong> — 26 half-payments/year = 13 monthly payments, cutting 2–3 years off a 25-year amortization.</li>
        <li><strong>Annual lump-sum prepayments</strong> — Most lenders allow 10–20% of original principal per year penalty-free.</li>
        <li><strong>Increase payment at renewal</strong> — Apply salary increases to your mortgage payment.</li>
        <li><strong>Shorten amortization at renewal</strong> — 25 to 20 years saves dramatically on interest.</li>
        <li><strong>Shop your renewal aggressively</strong> — A mortgage broker can compare 30+ lenders vs. your bank's auto-renewal offer.</li>
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

export default function CanadianMortgageCalculatorPage() {
  return (
    <>
      {/*
        ── Single top-shell gradient wrapper ────────────────────────────────────
        ONE background applied here — covers:
          • the floating nav area (pill has backdrop-blur, page colour shows through)
          • the calculator banner / title
          • the input + results workspace (Blocks A + B)
        Pixel stops ensure the gradient fades to #F8FAFB at ~1100 px regardless
        of how tall the full page is. Blocks C–G sit on the flat body colour.

        No separate backgrounds on the banner div or the workspace div inside
        CanadaMortgageCalculator — this is the only gradient on the page.
        ──────────────────────────────────────────────────────────────────────── */}
      <div
        className="min-h-screen overflow-x-hidden px-4"
        style={{
          /*
           * Pull the div up by the nav height (80 px) so the gradient starts
           * at y=0 — behind the floating nav pill — then compensate with
           * matching padding-top so the banner text sits at the correct position.
           * The nav is sticky z-[500] so it remains on top; the gradient shows
           * through the pill's backdrop-blur with no white strip above it.
           *
           * Gradient: ambient multi-stop — soft mint at top → pale blue mid →
           * faint mint → very light → flat #F8FAFB. Pixel stops keep the colour
           * confined to the nav + banner + workspace zone regardless of page height.
           */
          marginTop: '-80px',
          paddingTop: '80px',
          background: [
            /* Mint-teal glow — top-left corner, brand teal at low opacity */
            'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.13) 0%, transparent 100%)',
            /* Pale-blue glow — top-right corner */
            'radial-gradient(ellipse 500px 400px at top right, rgba(147,197,253,0.17) 0%, transparent 100%)',
            /* Faint lavender glow — right-center of workspace */
            'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(196,181,253,0.09) 0%, transparent 100%)',
            /* Base: very light airy white with minimal tint, pixel-stop fade to flat body */
            'linear-gradient(180deg, #f3faf8 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
          ].join(', '),
        }}
      >

        {/* ── Banner: title + subtitle — no RegionToggle (nav already has one) ── */}
        <div className="mx-auto max-w-6xl pt-2 pb-1 sm:pt-9 sm:pb-4 lg:pt-11 lg:pb-5">
          <h1
            className="font-extrabold text-xl sm:text-3xl md:text-4xl"
            style={{ color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: '1.15' }}
          >
            Canadian Mortgage Calculator
          </h1>
          <p
            className="mt-0.5 sm:mt-2 text-[13px] sm:text-[15px] leading-snug sm:leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.68)' }}
          >
            Estimate payments, compare scenarios, and understand your mortgage with Canadian rules and AI-assisted insights.
          </p>
          <p
            className="mt-0.5 sm:mt-1.5"
            style={{ fontSize: '11.5px', color: 'rgba(13,27,42,0.38)', lineHeight: '1.4', letterSpacing: '0.01em' }}
          >
            Semi-annual compounding · CMHC insurance · GDS/TDS ratios
          </p>
        </div>

        {/* ── Calculator workspace + lower sections ────────────────────────── */}
        <div className="mx-auto max-w-6xl pb-6 sm:pb-8 lg:pb-10">
          <CanadaMortgageCalculator formulaContent={formulaSection} faqItems={faqs} />
        </div>

      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
