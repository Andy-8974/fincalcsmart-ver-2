import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Banknote,
  CreditCard,
  Home,
  Percent,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import ArticleLayout from '../_shared/ArticleLayout';
import GuideCTA from '../_shared/GuideCTA';
import RatioBar from '../_shared/RatioBar';
import ArticleDisclaimer from '../_shared/ArticleDisclaimer';

/* ── Metadata ──────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: 'Mortgage Affordability Guide — How Lenders Calculate What You Qualify For',
  description:
    'Understand GDS, TDS, debt-to-income ratios, and stress tests — plus the four levers that move your qualifying amount. Canada and USA covered.',
};

/* ── JSON-LD ────────────────────────────────────────────────── */

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Mortgage Affordability Guide — How Lenders Calculate What You Qualify For',
  description:
    'GDS, TDS, stress tests, and DTI ratios explained clearly for Canada and the USA — with worked examples and the four levers that change your qualifying amount.',
  author: { '@type': 'Organization', name: 'FinCalc Smart Editorial Team' },
  publisher: {
    '@type': 'Organization',
    name: 'FinCalc Smart',
    url: 'https://www.fincalcsmart.com',
  },
  dateModified: '2026-06-12',
  url: 'https://www.fincalcsmart.com/guides/mortgage-affordability',
  inLanguage: 'en',
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.fincalcsmart.com' },
    { '@type': 'ListItem', position: 2, name: 'Financial Guides', item: 'https://www.fincalcsmart.com/guides' },
    { '@type': 'ListItem', position: 3, name: 'Mortgage Affordability Guide', item: 'https://www.fincalcsmart.com/guides/mortgage-affordability' },
  ],
};

/* ── Data ───────────────────────────────────────────────────── */

const FACTORS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Banknote,
    title: 'Income',
    body: 'Gross household income — before tax — sets the ceiling on how much housing cost a lender will approve.',
  },
  {
    Icon: CreditCard,
    title: 'Monthly debts',
    body: 'Existing loan payments reduce the room available for a mortgage. Every dollar of debt lowers your qualifying range.',
  },
  {
    Icon: Home,
    title: 'Down payment',
    body: 'A larger down payment shrinks the mortgage required — and can eliminate default insurance.',
  },
  {
    Icon: Percent,
    title: 'Mortgage rate',
    body: 'The contracted rate sets your actual payment. Even a half-point difference adds tens of thousands over the amortization.',
  },
  {
    Icon: ShieldCheck,
    title: 'Qualifying rate',
    body: 'Lenders test your ability to handle a higher rate than the one offered, protecting both sides from payment shock.',
  },
];

const LEVERS: { Icon: LucideIcon; title: string; before: string; after: string; effect: string }[] = [
  {
    Icon: TrendingUp,
    title: 'Higher income',
    before: 'CA$120,000 / yr',
    after: 'CA$150,000 / yr',
    effect: 'A 25% income increase expands the housing-cost ceiling proportionally.',
  },
  {
    Icon: TrendingDown,
    title: 'Lower monthly debt',
    before: 'CA$650 / mo',
    after: 'CA$200 / mo',
    effect: 'Cutting debt reduces the TDS ratio by ~4–5 points, creating meaningful headroom.',
  },
  {
    Icon: Home,
    title: 'Larger down payment',
    before: 'CA$130k → CA$3,082/mo',
    // calcPayment(485000, monthlyRateCA(5.19), 300) ≈ $2,876
    after: 'CA$165k → CA$2,876/mo',
    effect: 'CA$35,000 more down reduces the mortgage to CA$485,000, saving ~CA$206/month.',
  },
  {
    Icon: Percent,
    title: 'Lower mortgage rate',
    before: '5.19% → CA$3,082/mo',
    // calcPayment(520000, monthlyRateCA(4.5), 300) ≈ $2,878
    after: '4.50% → CA$2,878/mo',
    effect: 'A 0.69% rate reduction saves ~CA$204/month and lowers the stress-test rate too.',
  },
];

const MISTAKES = [
  {
    title: 'Forgetting total ownership costs',
    body: 'Property tax, insurance, utilities, and condo fees commonly add CA$500–$1,500/month on top of the mortgage. Closing costs — legal fees, land transfer tax, and inspection — also run 1.5–4% of the purchase price, separate from your down payment.',
  },
  {
    title: 'Ignoring the stress test',
    body: 'In Canada, federally regulated lenders qualify you at a rate significantly above your contracted rate. Shopping based on the contracted rate alone often leads to an unexpected shortfall when the lender runs the actual calculation.',
  },
  {
    title: "Treating the lender's maximum as a personal budget",
    body: "Approval reflects what a lender will lend — not the amount that leaves you resilient. Many households that borrow at their approval ceiling find little room for savings, emergencies, or life changes.",
  },
];

/* ── Chip helpers ───────────────────────────────────────────── */

function ChipCA() {
  return (
    <span
      className="rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ background: 'rgba(29,181,132,0.13)', color: '#1DB584' }}
    >
      CA
    </span>
  );
}

function ChipUSA() {
  return (
    <span
      className="rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ background: 'rgba(10,49,97,0.09)', color: '#0A3161' }}
    >
      USA
    </span>
  );
}

/* ── Section heading helper — with optional editorial number ── */

function SectionHeader({
  num,
  title,
  subtitle,
}: {
  num?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8 sm:mb-10">
      {num && (
        <p
          className="mb-2 text-[11px] font-bold uppercase tracking-widest"
          style={{ color: '#1DB584' }}
        >
          {num}
        </p>
      )}
      <h2
        className="font-extrabold text-2xl sm:text-3xl leading-snug"
        style={{ color: '#0D1B2A', letterSpacing: '-0.4px' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.64)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

export default function MortgageAffordabilityGuide() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <ArticleLayout>

        {/* ── §1 HERO — two-column on desktop ─────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-10 sm:pt-14 sm:pb-12 lg:pt-18 lg:pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] lg:gap-16 lg:items-center">

            {/* Left: breadcrumb, meta, H1, lead */}
            <div>
              <nav
                aria-label="Breadcrumb"
                className="mb-5 flex flex-wrap items-center gap-1 text-[12px]"
                style={{ color: 'rgba(13,27,42,0.54)' }}
              >
                <Link href="/" className="hover:underline underline-offset-2">Home</Link>
                <ChevronText />
                <Link href="/guides" className="hover:underline underline-offset-2">Financial Guides</Link>
                <ChevronText />
                <span style={{ color: 'rgba(13,27,42,0.65)' }}>Mortgage Affordability</span>
              </nav>

              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: 'rgba(29,181,132,0.12)', color: '#1DB584' }}
                >
                  Mortgage
                </span>
                <span className="text-[12px]" style={{ color: 'rgba(13,27,42,0.58)' }}>6 min read</span>
                <span className="text-[12px]" style={{ color: 'rgba(13,27,42,0.32)' }} aria-hidden>·</span>
                <span className="text-[12px]" style={{ color: 'rgba(13,27,42,0.58)' }}>Updated June 2026</span>
                <span className="text-[12px]" style={{ color: 'rgba(13,27,42,0.28)' }} aria-hidden>·</span>
                <ChipCA />
                <ChipUSA />
              </div>

              <h1
                className="font-extrabold text-[2.2rem] sm:text-[2.75rem] lg:text-[3.1rem] leading-[1.08] mb-6"
                style={{ color: '#0D1B2A', letterSpacing: '-0.8px' }}
              >
                How much mortgage can you actually qualify for?
              </h1>

              <p
                className="text-[16.5px] sm:text-[18px] leading-relaxed"
                style={{ color: 'rgba(13,27,42,0.60)', maxWidth: '560px' }}
              >
                Lenders don&apos;t decide what you can afford — they decide what you can qualify for.
                Understanding the ratios and stress tests that drive that number puts you in control.
              </p>
            </div>

            {/* Right: What You'll Learn — desktop only */}
            <div className="hidden lg:block">
              <div className="flex gap-5">
                {/* Teal vertical accent line */}
                <div
                  className="w-[4px] flex-shrink-0 self-stretch rounded-full"
                  style={{ background: 'rgba(29,181,132,0.60)' }}
                  aria-hidden
                />
                <div>
                  <p
                    className="text-[12px] font-bold uppercase tracking-widest mb-6"
                    style={{ color: '#1DB584' }}
                  >
                    What you&apos;ll learn
                  </p>
                  <ul className="flex flex-col gap-5">
                    {[
                      'How income and debts affect qualification',
                      'How Canadian and U.S. lender methods differ',
                      'What changes can improve your result',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span
                          className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full"
                          style={{ background: '#1DB584' }}
                          aria-hidden
                        />
                        <span
                          className="text-[14.5px] leading-snug"
                          style={{ color: 'rgba(13,27,42,0.72)' }}
                        >
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── 01 FIVE FACTORS ─────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <div className="max-w-3xl">
            <SectionHeader
              num="01"
              title="What determines your affordability?"
              subtitle="Five inputs shape how much mortgage a lender will approve."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">
            {FACTORS.map(({ Icon, title, body }, i) => (
              <div
                key={title}
                className={`flex items-start gap-3.5${i === 4 ? ' sm:col-span-2 lg:col-span-1' : ''}`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <Icon className="h-5 w-5" style={{ color: '#1DB584' }} aria-hidden />
                </div>
                <div>
                  <p className="font-bold text-[14.5px] mb-0.5" style={{ color: '#0D1B2A' }}>
                    {title}
                  </p>
                  <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.68)' }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 02 HOW LENDERS CALCULATE ────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <div className="max-w-3xl">
            <SectionHeader
              num="02"
              title="How lenders run the numbers"
              subtitle="Ratios, stress tests, and the one rule that catches most buyers off guard."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

            {/* Canada panel */}
            <div
              className="rounded-brand-xl bg-white px-6 py-7 sm:px-8"
              style={{
                border: '1px solid rgba(15,41,66,0.08)',
                boxShadow: '0 2px 12px rgba(13,27,42,0.06)',
              }}
            >
              <div className="flex items-center gap-2 mb-6">
                <ChipCA />
                <span className="font-bold text-[14px]" style={{ color: '#0D1B2A' }}>
                  Canada — GDS, TDS &amp; Stress Test
                </span>
              </div>

              <h3 className="font-bold text-[15px] mb-1" style={{ color: '#0D1B2A' }}>
                GDS — Gross Debt Service Ratio
              </h3>
              <p className="text-[13.5px] leading-relaxed mb-4" style={{ color: 'rgba(13,27,42,0.64)' }}>
                Housing costs (mortgage, property tax, heat, 50% of condo fees) ÷ gross monthly income.
                A GDS around <strong>32–39%</strong> is a commonly used guideline — thresholds vary by lender.
              </p>
              <RatioBar
                label="GDS — illustrative example"
                sublabel="Contracted-rate calculation · property costs illustrative"
                value={37}
                valueLabel="~37% estimated"
                threshold={39}
                thresholdLabel="~39% common guideline"
                maxDisplay={50}
                note="Actual qualification uses the stress-test rate. Property tax and heat estimates vary by location."
              />

              <div className="my-6 h-px" style={{ background: 'rgba(13,27,42,0.07)' }} aria-hidden />

              <h3 className="font-bold text-[15px] mb-1" style={{ color: '#0D1B2A' }}>
                TDS — Total Debt Service Ratio
              </h3>
              <p className="text-[13.5px] leading-relaxed mb-4" style={{ color: 'rgba(13,27,42,0.64)' }}>
                GDS costs plus all other monthly debts (car, student, credit card minimums) ÷ gross monthly income.
                Around <strong>44%</strong> is a commonly cited guideline — lenders assess holistically.
              </p>
              <RatioBar
                label="TDS — illustrative example"
                sublabel="Contracted-rate calculation · CA$650/mo other debt"
                value={43}
                valueLabel="~43% estimated"
                threshold={44}
                thresholdLabel="~44% common guideline"
                maxDisplay={52}
                note="Close to the common guideline — typical for a household with moderate existing debt."
              />

              <div className="my-6 h-px" style={{ background: 'rgba(13,27,42,0.07)' }} aria-hidden />

              <h3 className="font-bold text-[15px] mb-1" style={{ color: '#0D1B2A' }}>
                The stress test
              </h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.64)' }}>
                OSFI requires lenders to qualify borrowers at the <strong>higher of: contracted rate + 2%,
                or the Bank of Canada&apos;s minimum qualifying rate (MQR)</strong>. At 5.19% contracted,
                you must qualify at 7.19%. Verify the current MQR before any application.
              </p>
            </div>

            {/* USA panel */}
            <div
              className="rounded-brand-xl bg-white px-6 py-7 sm:px-8"
              style={{
                border: '1px solid rgba(15,41,66,0.08)',
                boxShadow: '0 2px 12px rgba(13,27,42,0.06)',
              }}
            >
              <div className="flex items-center gap-2 mb-6">
                <ChipUSA />
                <span className="font-bold text-[14px]" style={{ color: '#0D1B2A' }}>
                  United States — DTI Ratios
                </span>
              </div>

              <h3 className="font-bold text-[15px] mb-1" style={{ color: '#0D1B2A' }}>
                Front-end DTI
              </h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.64)' }}>
                Housing costs only ÷ gross income. Often around <strong>28–31%</strong> for
                conventional loans — lender guidelines vary.
              </p>

              <div className="my-5 h-px" style={{ background: 'rgba(13,27,42,0.07)' }} aria-hidden />

              <h3 className="font-bold text-[15px] mb-1" style={{ color: '#0D1B2A' }}>
                Back-end DTI
              </h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.64)' }}>
                All monthly debts ÷ gross income. Conventional loans may approve up to{' '}
                <strong>~45–50%</strong> with compensating factors — thresholds vary by loan type and profile.
              </p>

              <div className="my-5 h-px" style={{ background: 'rgba(13,27,42,0.07)' }} aria-hidden />

              <h3 className="font-bold text-[15px] mb-1" style={{ color: '#0D1B2A' }}>
                No single federal stress test
              </h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.64)' }}>
                The US has no direct equivalent to Canada&apos;s OSFI B-20 rule. Individual lenders
                may apply their own rate buffers — ask each lender directly.
              </p>

              <div className="my-6 h-px" style={{ background: 'rgba(13,27,42,0.07)' }} aria-hidden />

              <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(13,27,42,0.48)' }}>
                Quick comparison
              </p>
              {/* 3-row aligned table: label | CA | USA */}
              <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-0 text-[12.5px]">
                {/* Header row */}
                <div />
                <p className="font-bold pb-2" style={{ color: '#1DB584' }}>Canada</p>
                <p className="font-bold pb-2" style={{ color: '#0A3161' }}>United States</p>
                {/* Row 1: Ratios */}
                <div className="h-px col-span-3 mb-3" style={{ background: 'rgba(13,27,42,0.07)' }} aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-wide pr-3 pt-0.5" style={{ color: 'rgba(13,27,42,0.42)' }}>Ratios</p>
                <p className="pb-3" style={{ color: 'rgba(13,27,42,0.68)' }}>GDS + TDS</p>
                <p className="pb-3" style={{ color: 'rgba(13,27,42,0.68)' }}>Front-end + back-end DTI</p>
                {/* Row 2: Stress test */}
                <div className="h-px col-span-3 mb-3" style={{ background: 'rgba(13,27,42,0.07)' }} aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-wide pr-3 pt-0.5" style={{ color: 'rgba(13,27,42,0.42)' }}>Stress test</p>
                <p className="pb-3" style={{ color: 'rgba(13,27,42,0.68)' }}>Mandatory (OSFI B-20)</p>
                <p className="pb-3" style={{ color: 'rgba(13,27,42,0.68)' }}>No federal requirement</p>
                {/* Row 3: Compounding */}
                <div className="h-px col-span-3 mb-3" style={{ background: 'rgba(13,27,42,0.07)' }} aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-wide pr-3 pt-0.5" style={{ color: 'rgba(13,27,42,0.42)' }}>Compounding</p>
                <p style={{ color: 'rgba(13,27,42,0.68)' }}>Semi-annual</p>
                <p style={{ color: 'rgba(13,27,42,0.68)' }}>Monthly</p>
              </div>
            </div>

          </div>

          {/* Mid-article calculator text link */}
          <div className="mt-8">
            <Link
              href="/mortgage-qualifier-calculator"
              className="inline-flex items-center gap-1 text-[14px] font-medium hover:underline underline-offset-2 transition-opacity hover:opacity-80"
              style={{ color: '#1DB584' }}
            >
              See how these ratios apply to your income and debts →
            </Link>
          </div>
        </section>

        {/* ── 03 SCENARIO + LEVERS ────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <div className="max-w-3xl">
            <SectionHeader
              num="03"
              title="See it in action — and what moves the result"
              subtitle="One realistic Canadian household, with four levers you can pull to improve the outcome."
            />
          </div>

          {/* Scenario: 5fr | Levers: 7fr — top-aligned */}
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-8 lg:gap-10 items-start">

            {/* Left: Scenario card — homepage InsightsShowcase product-card structure */}
            <div className="relative">
              {/* Back card — depth effect (from InsightsShowcase) */}
              <div
                className="absolute inset-x-3 -bottom-3 rounded-brand-xl border border-brand-gray-100 bg-white"
                style={{ boxShadow: '0 4px 16px rgba(13,27,42,0.05)' }}
                aria-hidden
              />

              {/* Main card — exact outer card from InsightsShowcase */}
              <div
                className="relative overflow-hidden rounded-brand-xl border border-brand-gray-200 bg-white"
                style={{ boxShadow: '0 8px 32px rgba(13,27,42,0.10), 0 2px 8px rgba(13,27,42,0.06)' }}
              >
                {/* Window chrome — same as InsightsShowcase */}
                <div
                  className="flex items-center justify-between px-5 py-2.5"
                  style={{ background: '#F8FAFB', borderBottom: '1px solid #E4E9EF' }}
                >
                  <span className="text-[11px] font-bold text-brand-gray-400 uppercase tracking-widest">
                    Illustrative Scenario — Canada
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(29,181,132,0.13)', color: '#1DB584' }}
                  >
                    CA
                  </span>
                </div>

                {/* Sample inputs — same pattern as InsightsShowcase */}
                <div className="space-y-1.5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                    Sample inputs
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'Gross Income',  value: 'CA$120,000 / yr' },
                      { label: 'Monthly Debt',  value: 'CA$650 / mo' },
                      { label: 'Home Price',    value: 'CA$650,000' },
                      { label: 'Down Payment',  value: 'CA$130,000 (20%)' },
                      { label: 'Mortgage Rate', value: '5.19%' },
                      { label: 'Amortization',  value: '25 years' },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-brand-sm border border-brand-gray-200 bg-brand-gray-50 px-3 py-2"
                      >
                        <p className="text-[9.5px] font-semibold uppercase tracking-wider text-brand-gray-400">
                          {label}
                        </p>
                        <p className="mt-1 text-[12.5px] font-bold text-brand-navy">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dark result panel — exact gradient + border pattern from InsightsShowcase */}
                <div
                  className="mx-4 mb-4 rounded-brand-lg p-3.5"
                  style={{
                    background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 100%)',
                    border: '1px solid rgba(29,181,132,0.22)',
                  }}
                >
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Estimated outputs
                  </p>

                  {/* Row 1: Mortgage required + Qualifying rate */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div
                      className="rounded-brand-sm p-2.5"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                        Mortgage required
                      </p>
                      <p className="mt-1 text-[15px] font-extrabold leading-none text-white/90">
                        CA$520,000
                      </p>
                    </div>
                    <div
                      className="rounded-brand-sm p-2.5"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                        Qualifying rate
                      </p>
                      <p className="mt-1 text-[15px] font-extrabold leading-none text-white/90">
                        7.19%
                      </p>
                    </div>
                  </div>

                  <div className="my-2.5 border-t border-white/[0.07]" />

                  {/* Row 2: Monthly payment hero + GDS/TDS */}
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Monthly payment
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Monthly payment — teal accent, like scenarioB */}
                    <div
                      className="rounded-brand-sm p-2.5"
                      style={{
                        background: 'rgba(29,181,132,0.13)',
                        border: '1px solid rgba(29,181,132,0.32)',
                      }}
                    >
                      <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(29,181,132,0.80)' }}>
                        At contracted rate
                      </p>
                      {/* calcPayment(520000, monthlyRateCA(5.19), 300) ≈ $3,082 */}
                      <p className="mt-1 text-[22px] font-extrabold leading-none" style={{ color: '#1DB584' }}>
                        CA$3,082
                      </p>
                      <p className="mt-0.5 text-[9px]" style={{ color: 'rgba(29,181,132,0.55)' }}>
                        per month
                      </p>
                    </div>

                    {/* GDS + TDS stacked */}
                    <div className="flex flex-col gap-1.5">
                      <div
                        className="rounded-brand-sm p-2.5"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                      >
                        <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                          Est. GDS ratio
                        </p>
                        <p className="mt-1 text-[14px] font-extrabold leading-none text-white">
                          ~37%
                        </p>
                      </div>
                      <div
                        className="rounded-brand-sm p-2.5"
                        style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.28)' }}
                      >
                        <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(201,168,76,0.70)' }}>
                          Est. TDS ratio
                        </p>
                        <p className="mt-1 text-[14px] font-extrabold leading-none" style={{ color: '#C9A84C' }}>
                          ~43%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="my-2.5 border-t border-white/[0.07]" />

                  {/* Status badge */}
                  <div
                    className="rounded-brand-sm px-3 py-2"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(29,181,132,0.22)' }}
                  >
                    <p className="text-[11px] font-bold" style={{ color: '#1DB584' }}>
                      Within range of typical guidelines
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Illustrative only — actual result depends on lender, property costs, and current rules
                    </p>
                  </div>
                </div>

                {/* Footer — exact pattern from InsightsShowcase */}
                <div
                  className="border-t border-brand-gray-100 px-4 py-2"
                  style={{ background: '#F8FAFB' }}
                >
                  <p className="text-[10.5px] text-brand-gray-400 leading-relaxed">
                    Canadian semi-annual compounding (Interest Act). GDS/TDS at contracted rate with
                    illustrative costs (CA$450/mo tax + CA$125/mo heat). Qualifying rate = max(5.19% + 2%, 5.25%) = 7.19%.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Levers — editorial divider list, top-aligned with scenario card content */}
            <div className="lg:pt-[52px]">
              <div className="flex flex-col">
                {LEVERS.map(({ Icon, title, before, after, effect }, i) => (
                  <div key={title}>
                    {i > 0 && (
                      <div className="h-px" style={{ background: 'rgba(13,27,42,0.07)' }} aria-hidden />
                    )}
                    <div className={`flex items-start gap-4 ${i === 0 ? 'pt-0 pb-5' : 'py-5'}`}>
                      <div className="mt-0.5 flex-shrink-0">
                        <Icon className="h-4 w-4" style={{ color: '#1DB584' }} aria-hidden />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[14px] mb-1.5" style={{ color: '#0D1B2A' }}>
                          {title}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] mb-2">
                          <span style={{ color: 'rgba(13,27,42,0.52)' }}>{before}</span>
                          <span style={{ color: 'rgba(13,27,42,0.38)' }} aria-hidden>→</span>
                          <span className="font-bold" style={{ color: '#1DB584' }}>{after}</span>
                        </div>
                        <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.65)' }}>
                          {effect}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-2 text-[12px]" style={{ color: 'rgba(13,27,42,0.50)' }}>
                Payment figures use Canadian semi-annual compounding. Income and debt effects are
                directional — actual qualifying impact depends on lender thresholds.
              </p>
            </div>

          </div>
        </section>

        {/* ── 04 MISTAKES — full-width 3-column ───────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <SectionHeader
            num="04"
            title="Three mistakes that derail first-time buyers"
            subtitle="Recognising them early is the difference between a smooth process and a late surprise."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-12">
            {MISTAKES.map(({ title, body }, i) => (
              <div
                key={title}
                className={[
                  'flex items-start gap-4 py-7',
                  // Mobile: top dividers on items 1+
                  i > 0 ? 'border-t sm:border-t-0' : '',
                  // Tablet (2-col): item 1 left border + padding
                  i === 1 ? 'sm:border-l sm:pl-8' : '',
                  // Tablet: item 2 spans full row below, gets top border
                  i === 2 ? 'sm:border-t sm:col-span-2 lg:col-span-1' : '',
                  // Desktop (3-col): right borders + horizontal padding
                  i === 0 ? 'lg:border-r lg:pr-12' : '',
                  i === 1 ? 'lg:border-l-0 lg:border-r lg:px-12 lg:border-t-0' : '',
                  i === 2 ? 'lg:border-l lg:border-t-0 lg:pl-12' : '',
                ].filter(Boolean).join(' ')}
                style={{ borderColor: 'rgba(13,27,42,0.12)' }}
              >
                <AlertTriangle
                  className="h-5 w-5 flex-shrink-0 mt-0.5"
                  style={{ color: '#C9A84C' }}
                  aria-hidden
                />
                <div>
                  <p className="font-extrabold text-[15.5px] mb-2" style={{ color: '#0D1B2A' }}>{title}</p>
                  <p className="text-[14px] leading-[1.72]" style={{ color: 'rgba(13,27,42,0.72)' }}>{body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 05 CTA — section number inline in heading */}
          <div className="mb-2">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>05</p>
          </div>
          <GuideCTA
            heading="Ready to see your qualifying amount?"
            benefits={[
              'Estimated qualifying mortgage based on your income and debts',
              'Affordability ratios with plain-language interpretation',
              'Monthly payment breakdown and AI-assisted opportunity signals',
            ]}
            primaryHref="/mortgage-qualifier-calculator"
            primaryLabel="Open Mortgage Qualifier Calculator"
            secondaryHref="/canadian-mortgage-calculator"
            secondaryLabel="Try the Canadian Mortgage Calculator"
            note="After calculating, FinCalc Smart can surface AI-assisted insights about affordability pressure, opportunity signals, and possible next steps — based on your numbers."
          />
        </section>

        {/* ── Disclaimer ──────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:pb-16 lg:pb-20">
          <ArticleDisclaimer />
        </section>

      </ArticleLayout>
    </>
  );
}

/* ── Local sub-components ───────────────────────────────────── */

function ChevronText() {
  return (
    <span aria-hidden style={{ color: 'rgba(13,27,42,0.30)' }}>
      /
    </span>
  );
}
