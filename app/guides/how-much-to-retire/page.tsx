import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Banknote,
  Percent,
  type LucideIcon,
} from 'lucide-react';
import ArticleLayout from '../_shared/ArticleLayout';
import GuideCTA from '../_shared/GuideCTA';
import ArticleDisclaimer from '../_shared/ArticleDisclaimer';

/* ── Metadata ──────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: 'How Much Do You Need to Retire? — Retirement Savings Guide',
  description:
    'Understand what drives your retirement savings target, how contributions and return shape your projected balance, and which adjustments have the greatest effect on your plan.',
};

/* ── JSON-LD ────────────────────────────────────────────────── */

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How Much Do You Need to Retire? — Retirement Savings Guide',
  description:
    'Understand what drives your retirement savings target, how contributions and return shape your projected balance, and which adjustments have the greatest effect on your plan.',
  author: { '@type': 'Organization', name: 'FinCalc Smart Editorial Team' },
  publisher: {
    '@type': 'Organization',
    name: 'FinCalc Smart',
    url: 'https://www.fincalcsmart.com',
  },
  datePublished: '2026-06-16',
  dateModified: '2026-06-16',
  url: 'https://www.fincalcsmart.com/guides/how-much-to-retire',
  inLanguage: 'en',
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.fincalcsmart.com' },
    { '@type': 'ListItem', position: 2, name: 'Financial Guides', item: 'https://www.fincalcsmart.com/guides' },
    { '@type': 'ListItem', position: 3, name: 'Retirement Savings Guide', item: 'https://www.fincalcsmart.com/guides/how-much-to-retire' },
  ],
};

/* ── Data ───────────────────────────────────────────────────── */

/* Section 02 — four calculator inputs (2×2 open editorial grid)
   Matches the actual inputs modeled by RetirementSavingsCalculator.tsx */
const INPUTS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Banknote,
    title: 'Current retirement savings',
    body: 'What you already have invested grows alongside your new contributions. Even a modest balance compounds significantly over a long horizon — which is why starting earlier matters even if the initial amount is small.',
  },
  {
    Icon: TrendingUp,
    title: 'Monthly contributions',
    body: 'Regular contributions are the most directly controllable driver of the projected balance. The calculator holds contributions constant — it does not model salary increases, contribution gaps, or changes in savings rate over time.',
  },
  {
    Icon: Clock,
    title: 'Time until retirement',
    body: 'The number of years between now and retirement age determines how long contributions and growth have to compound. Retiring earlier shortens the accumulation period significantly; a few additional years can add tens of thousands to the projected balance.',
  },
  {
    Icon: Percent,
    title: 'Assumed investment return',
    body: 'The calculator uses a fixed nominal return rate — it does not model market volatility, sequence-of-returns risk, or investment fees. Use a conservative rate that reflects your expected long-term return after fees and before inflation.',
  },
];

/* Section 03 — scenario card: 5 inputs (last tile spans 2 cols)
   All outputs verified against RetirementSavingsCalculator.tsx defaults:
   CA$25,000 / CA$500/mo / 6% / Monthly / Age 35→65 (30yr) / Goal CA$1,000,000
   eMR = 0.005; growth = (1.005)^360 ≈ 6.022575
   FV = 25,000 × 6.022575 + 500 × (6.022575 − 1) / 0.005 = CA$652,822 */
const SCENARIO_INPUTS = [
  { label: 'Current savings',          value: 'CA$25,000' },
  { label: 'Monthly contribution',     value: 'CA$500 / mo' },
  { label: 'Annual return',            value: '6% (assumed)' },
  { label: 'Retirement goal',          value: 'CA$1,000,000' },
  { label: 'Years to retirement',      value: '30 years (age 35→65)' },
];

/* Section 03 right — three editorial observations (single-column divider list) */
const OBSERVATIONS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: TrendingUp,
    title: 'Where the projection stands',
    body: 'At the current pace, the projected balance of CA$652,822 covers about 65% of the CA$1,000,000 goal. Of that balance, CA$447,822 comes from investment growth — contributions over 30 years total CA$205,000.',
  },
  {
    Icon: TrendingDown,
    title: 'The remaining gap',
    body: 'The CA$347,178 shortfall reflects the combined effect of contribution pace and time horizon. The calculator\'s PMT reverse-solve shows that reaching the goal requires a total of approximately CA$846/month — CA$346 more than the current CA$500.',
  },
  {
    Icon: Clock,
    title: 'The most direct adjustment',
    body: 'Increasing monthly contributions is the most directly controllable lever. Retiring a few years later also reduces the gap significantly — though it does not close it entirely at the current contribution rate.',
  },
];

/* Section 04 — four comparisons (2×2 open editorial grid)
   All figures verified against RetirementSavingsCalculator.tsx formula:
   Baseline: CA$25,000 / CA$500/mo / 6% / Monthly / 30yr → CA$652,822
   - Age 68 (33yr): (1.005)^396 ≈ 7.2074 → CA$800,925
   - CA$750/mo 30yr: CA$150,564 + CA$753,386 = CA$903,950
   - CA$50K start 30yr: CA$301,129 + CA$502,258 = CA$803,387
   - 4% 30yr: (1.003333)^360 ≈ 3.314 → CA$429,950 */
const LEVERS: { Icon: LucideIcon; title: string; before: string; after: string; effect: string }[] = [
  {
    Icon: Clock,
    title: 'Retire later',
    before: 'Retire at 65 (30yr horizon)',
    after: 'Retire at 68 (33yr horizon)',
    effect: 'Three additional years of contributions and growth increases the projected balance from approximately CA$652,822 to approximately CA$800,900 — about CA$148,000 more. The shortfall narrows from CA$347,178 to approximately CA$199,000.',
  },
  {
    Icon: Banknote,
    title: 'Increase monthly contributions',
    before: 'CA$500 / mo',
    after: 'CA$750 / mo',
    effect: 'Adding CA$250 per month over 30 years increases the projected balance from approximately CA$652,822 to approximately CA$903,950 — about CA$251,000 more. The shortfall narrows to approximately CA$96,000.',
  },
  {
    Icon: TrendingUp,
    title: 'Start with more savings',
    before: 'CA$25,000 current savings',
    after: 'CA$50,000 current savings',
    effect: 'An additional CA$25,000 invested today compounds for the full 30 years, increasing the projected balance from approximately CA$652,822 to approximately CA$803,387 — about CA$151,000 more.',
  },
  {
    Icon: Percent,
    title: 'Assumed return',
    before: '4% assumed return',
    after: '6% assumed return',
    effect: 'A 2% higher assumed return produces approximately CA$223,000 more over 30 years — from approximately CA$430,000 to CA$652,822. Shown for context only — actual investment returns vary and are not guaranteed.',
  },
];

/* Section 04 — three retirement-planning mistakes (3-column open editorial grid) */
const MISTAKES = [
  {
    title: 'Goal not connected to spending',
    body: 'A retirement balance is only meaningful relative to what you plan to spend each year. CA$1,000,000 supports very different lifestyles depending on annual drawdown, life expectancy, inflation, and whether government income — CPP, OAS, or Social Security — offsets part of your expenses.',
  },
  {
    title: 'Assuming a constant or guaranteed return',
    body: 'The calculator models a fixed rate for simplicity. Real portfolios experience volatility, down years, and sequence-of-returns risk — the order in which returns occur matters, particularly in the years just before and after you stop contributing.',
  },
  {
    title: 'Treating the projection as the full picture',
    body: 'The calculator shows only the accumulation side. Taxes on withdrawals, investment fees, inflation erosion, contribution gaps, and how long the money actually needs to last are all outside the model — and all affect what the projected balance is worth in retirement.',
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

/* ── Section heading helper ─────────────────────────────────── */

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

export default function RetirementSavingsGuide() {
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

        {/* ── HERO — two-column on desktop ─────────────────────── */}
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
                <span style={{ color: 'rgba(13,27,42,0.65)' }}>Retirement Savings Guide</span>
              </nav>

              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316' }}
                >
                  Retirement
                </span>
                <span className="text-[12px]" style={{ color: 'rgba(13,27,42,0.58)' }}>~6 min read</span>
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
                How Much Do You Need to Retire?
              </h1>

              <p
                className="text-[16.5px] sm:text-[18px] leading-relaxed"
                style={{ color: 'rgba(13,27,42,0.60)', maxWidth: '560px' }}
              >
                There is no single retirement number that applies to everyone. The right target
                depends on what you plan to spend, when you plan to retire, how your savings
                grow, and what other income you may have. This guide walks through each input
                and shows what a 30-year savings plan actually projects.
              </p>

              <p className="mt-3 text-[12.5px]" style={{ color: 'rgba(13,27,42,0.46)' }}>
                FinCalc Smart Editorial Team
              </p>
            </div>

            {/* Right: What You'll Learn — desktop only */}
            <div className="hidden lg:block">
              <div className="flex gap-5">
                <div
                  className="w-[4px] flex-shrink-0 self-stretch rounded-full"
                  style={{ background: 'rgba(249,115,22,0.55)' }}
                  aria-hidden
                />
                <div>
                  <p
                    className="text-[12px] font-bold uppercase tracking-widest mb-6"
                    style={{ color: '#F97316' }}
                  >
                    What you&apos;ll learn
                  </p>
                  <ul className="flex flex-col gap-5">
                    {[
                      'What drives a retirement projection',
                      'How savings and contributions work together',
                      'What a 30-year example actually projects',
                      'Which changes affect the result most',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span
                          className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full"
                          style={{ background: '#F97316' }}
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

        {/* ── 01 WHAT DETERMINES HOW MUCH YOU NEED? ───────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <div className="max-w-3xl">
            <SectionHeader
              num="01"
              title="What determines how much you need?"
              subtitle="Three related concepts that are easy to conflate."
            />

            <p className="text-[14px] leading-[1.72] mb-4" style={{ color: 'rgba(13,27,42,0.72)' }}>
              It helps to separate three things. Your <strong style={{ color: '#0D1B2A' }}>retirement spending</strong> is
              how much you expect to draw from savings each year. Your <strong style={{ color: '#0D1B2A' }}>retirement
              savings goal</strong> is the total balance you are trying to reach — you set this directly
              in the calculator. Your <strong style={{ color: '#0D1B2A' }}>projected retirement balance</strong> is what
              you are actually on track to accumulate. This guide focuses on the third: what your
              current savings and contributions are projected to produce.
            </p>
            <p className="text-[14px] leading-[1.72] mb-4" style={{ color: 'rgba(13,27,42,0.72)' }}>
              The calculator shows nominal balances — it does not adjust for inflation. CA$1,000,000
              in 30 years will have less purchasing power than CA$1,000,000 today. That gap matters
              when setting a goal, but it is outside what the calculator models. Similarly, income
              from CPP, OAS, Social Security, or employer pensions would reduce the savings balance
              you actually need to draw from — the calculator does not model any of these sources.
            </p>
            <p className="text-[14px] leading-[1.72] mb-4" style={{ color: 'rgba(13,27,42,0.72)' }}>
              The calculator also does not model investment fees, taxes on withdrawals, market
              volatility, or the decumulation phase after retirement. The projection assumes a
              fixed return rate and constant contributions throughout the entire horizon.
            </p>
            <p className="text-[14px] leading-[1.72]" style={{ color: 'rgba(13,27,42,0.72)' }}>
              What the calculator does well: it shows how your current savings balance, monthly
              contribution, time horizon, and assumed return interact — and how changing any one
              of them shifts the projected outcome. That is enough to make the direction of each
              decision clear, even if the precise number is an estimate.
            </p>
          </div>
        </section>

        {/* ── 02 THE INPUTS THAT SHAPE THE PROJECTION ─────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <SectionHeader
            num="02"
            title="The inputs that shape the projection"
            subtitle="Four variables the calculator models — and what each one actually does."
          />

          {/* Four inputs — 2×2 open editorial grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
            {INPUTS.map(({ Icon, title, body }, i) => (
              <div
                key={title}
                className={[
                  'flex items-start gap-4 py-5',
                  i === 0 ? 'pt-0' : 'border-t',
                  i === 1 ? 'md:border-t-0' : '',
                ].filter(Boolean).join(' ')}
                style={{ borderColor: 'rgba(13,27,42,0.07)' }}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <Icon className="h-4 w-4" style={{ color: '#1DB584' }} aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px] mb-1.5" style={{ color: '#0D1B2A' }}>
                    {title}
                  </p>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.68)' }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[13px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.64)' }}>
            The Retirement Savings Calculator takes a retirement goal as a direct input — you
            enter a target balance and it shows whether your current path reaches it. If you
            are unsure what goal to use, you can start with a round number, run the projection,
            and then use the calculator&apos;s reverse-solve to find the monthly contribution needed
            to close any gap.
          </p>

          {/* Mid-article calculator text link */}
          <div className="mt-8">
            <Link
              href="/retirement-planning-calculator"
              className="inline-flex items-center gap-1 text-[14px] font-medium hover:underline underline-offset-2 transition-opacity hover:opacity-80"
              style={{ color: '#1DB584' }}
            >
              See how your inputs project toward a retirement goal →
            </Link>
          </div>
        </section>

        {/* ── 03 SEE IT IN ACTION ─────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <div className="max-w-3xl">
            <SectionHeader
              num="03"
              title="See it in action"
              subtitle="One scenario — with the numbers the calculator actually produces."
            />
          </div>

          {/* Scenario: 5fr | Observations: 7fr — top-aligned */}
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-8 lg:gap-10 items-start">

            {/* Left: Scenario card — exact InsightsShowcase shell */}
            <div className="relative">
              {/* Back card — depth effect */}
              <div
                className="absolute inset-x-3 -bottom-3 rounded-brand-xl border border-brand-gray-100 bg-white"
                style={{ boxShadow: '0 4px 16px rgba(13,27,42,0.05)' }}
                aria-hidden
              />

              {/* Main card */}
              <div
                className="relative overflow-hidden rounded-brand-xl border border-brand-gray-200 bg-white"
                style={{ boxShadow: '0 8px 32px rgba(13,27,42,0.10), 0 2px 8px rgba(13,27,42,0.06)' }}
              >
                {/* Window chrome */}
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

                {/* Input tiles — 5 tiles: 2+2+1 (last spans full width) */}
                <div className="space-y-1.5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                    Sample inputs
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SCENARIO_INPUTS.map(({ label, value }, i) => (
                      <div
                        key={label}
                        className={`rounded-brand-sm border border-brand-gray-200 bg-brand-gray-50 px-3 py-2${
                          i === 4 ? ' col-span-2' : ''
                        }`}
                      >
                        <p className="text-[9.5px] font-semibold uppercase tracking-wider text-brand-gray-400">
                          {label}
                        </p>
                        <p className="mt-1 text-[12.5px] font-bold text-brand-navy">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dark result panel — amber border (Behind Target / shortfall state) */}
                <div
                  className="mx-4 mb-4 rounded-brand-lg p-3.5"
                  style={{
                    background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 100%)',
                    border: '1px solid rgba(201,168,76,0.28)',
                  }}
                >
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Estimated outputs
                  </p>

                  {/* Row 1: Projected Balance + Retirement Goal */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div
                      className="rounded-brand-sm p-2.5"
                      style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.28)' }}
                    >
                      <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(201,168,76,0.72)' }}>
                        Projected balance
                      </p>
                      <p className="mt-1 text-[15px] font-extrabold leading-none" style={{ color: '#C9A84C' }}>
                        CA$652,822
                      </p>
                    </div>
                    <div
                      className="rounded-brand-sm p-2.5"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                        Retirement goal
                      </p>
                      <p className="mt-1 text-[15px] font-extrabold leading-none text-white/90">
                        CA$1,000,000
                      </p>
                    </div>
                  </div>

                  <div className="my-2.5 border-t border-white/[0.07]" />

                  {/* Row 2: Shortfall hero + stacked breakdown */}
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Gap analysis
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Shortfall — amber hero */}
                    <div
                      className="rounded-brand-sm p-2.5"
                      style={{
                        background: 'rgba(201,168,76,0.10)',
                        border: '1px solid rgba(201,168,76,0.24)',
                      }}
                    >
                      <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(201,168,76,0.80)' }}>
                        Shortfall
                      </p>
                      <p className="mt-1 text-[22px] font-extrabold leading-none" style={{ color: '#C9A84C' }}>
                        CA$347,178
                      </p>
                      <p className="mt-0.5 text-[9px]" style={{ color: 'rgba(201,168,76,0.55)' }}>
                        below goal
                      </p>
                    </div>

                    {/* Progress + Additional needed — stacked */}
                    <div className="flex flex-col gap-1.5">
                      <div
                        className="rounded-brand-sm p-2.5"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                      >
                        <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                          Goal progress
                        </p>
                        <p className="mt-1 text-[14px] font-extrabold leading-none text-white/90">
                          ~65.3%
                        </p>
                      </div>
                      <div
                        className="rounded-brand-sm p-2.5"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                      >
                        <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                          Additional needed
                        </p>
                        <p className="mt-1 text-[14px] font-extrabold leading-none text-white/90">
                          ~CA$346/mo
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="my-2.5 border-t border-white/[0.07]" />

                  {/* Status badge */}
                  <div
                    className="rounded-brand-sm px-3 py-2"
                    style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.28)' }}
                  >
                    <p className="text-[11px] font-bold" style={{ color: '#C9A84C' }}>
                      Behind target — total contribution of ~CA$846/month reaches the goal by age 65
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      End-of-period contributions — no inflation, taxes, fees, or government benefits modeled. Actual results will differ.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="border-t border-brand-gray-100 px-4 py-2"
                  style={{ background: '#F8FAFB' }}
                >
                  <p className="text-[10.5px] text-brand-gray-400 leading-relaxed">
                    CA$25,000 initial + CA$500 × 360 months = CA$205,000 contributed.
                    At 0.5% effective monthly rate (6% nominal, monthly compounding): projected balance CA$652,822. Illustrative only.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Observations — single-column divider list, top-offset matches card chrome */}
            <div className="lg:pt-[52px]">
              <div className="flex flex-col">
                {OBSERVATIONS.map(({ Icon, title, body }, i) => (
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
                        <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.65)' }}>
                          {body}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-2 text-[12px]" style={{ color: 'rgba(13,27,42,0.50)' }}>
                Calculated using end-of-period monthly contributions at 0.5% effective monthly rate
                (6% nominal, monthly compounding). No inflation adjustment, fees, taxes, CPP, OAS, or
                Social Security modeled. Actual results will differ based on return, fees, and
                contribution timing.
              </p>
            </div>

          </div>
        </section>

        {/* ── 04 WHAT CAN CHANGE THE OUTCOME MOST? + MISTAKES ─── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <SectionHeader
            num="04"
            title="What can change the outcome most?"
            subtitle="Four comparisons — and three planning mistakes that lead to unrealistic expectations."
          />

          {/* Four comparisons — 2×2 open editorial grid */}
          <div className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
              {LEVERS.map(({ Icon, title, before, after, effect }, i) => (
                <div
                  key={title}
                  className={[
                    'flex items-start gap-4 py-5',
                    i === 0 ? 'pt-0' : 'border-t',
                    i === 1 ? 'md:border-t-0' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ borderColor: 'rgba(13,27,42,0.07)' }}
                >
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
              ))}
            </div>

            <p className="mt-2 text-[12px]" style={{ color: 'rgba(13,27,42,0.50)' }}>
              All figures use the same formula as the scenario above — CA$25,000 initial / CA$500/mo / monthly compounding.
              Return comparisons are illustrative. Actual investment returns vary and are not guaranteed.
              No inflation, taxes, or fees modeled.
            </p>
          </div>

          {/* Three mistakes — exact three-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-12">
            {MISTAKES.map(({ title, body }, i) => (
              <div
                key={title}
                className={[
                  'flex items-start gap-4 py-7',
                  i > 0 ? 'border-t sm:border-t-0' : '',
                  i === 1 ? 'sm:border-l sm:pl-8' : '',
                  i === 2 ? 'sm:border-t sm:col-span-2 lg:col-span-1' : '',
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

          {/* 05 CTA — section number inline, exact CI/EF pattern */}
          <div className="mb-2">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>05</p>
          </div>
          <GuideCTA
            heading="Estimate your retirement plan"
            benefits={[
              'Compare your projected savings with a specific retirement goal',
              'See whether your current monthly contributions are sufficient',
              'Test how retirement age or contribution changes shift the projection',
            ]}
            primaryHref="/retirement-planning-calculator"
            primaryLabel="Open Retirement Savings Calculator"
            secondaryHref="/retirement-withdrawal-calculator"
            secondaryLabel="Try Retirement Withdrawal Calculator"
            note="After calculating, FinCalc Smart can highlight your projected gap, the assumptions driving it, and the adjustments that may have the greatest effect."
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
