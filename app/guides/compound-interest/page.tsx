import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Banknote,
  RefreshCw,
  Percent,
  type LucideIcon,
} from 'lucide-react';
import ArticleLayout from '../_shared/ArticleLayout';
import GuideCTA from '../_shared/GuideCTA';
import ArticleDisclaimer from '../_shared/ArticleDisclaimer';

/* ── Metadata ──────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: 'How Compound Interest Works — Long-Term Growth Guide',
  description:
    'Understand how compound interest builds wealth over time, what drives long-term growth, and how contributions, return rate, and time each shape your outcome.',
};

/* ── JSON-LD ────────────────────────────────────────────────── */

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How Compound Interest Works — Long-Term Growth Guide',
  description:
    'Understand how compound interest builds wealth over time, what drives long-term growth, and how contributions, return rate, and time each shape your outcome.',
  author: { '@type': 'Organization', name: 'FinCalc Smart Editorial Team' },
  publisher: {
    '@type': 'Organization',
    name: 'FinCalc Smart',
    url: 'https://www.fincalcsmart.com',
  },
  datePublished: '2026-06-13',
  dateModified: '2026-06-13',
  url: 'https://www.fincalcsmart.com/guides/compound-interest',
  inLanguage: 'en',
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.fincalcsmart.com' },
    { '@type': 'ListItem', position: 2, name: 'Financial Guides', item: 'https://www.fincalcsmart.com/guides' },
    { '@type': 'ListItem', position: 3, name: 'Compound Interest Guide', item: 'https://www.fincalcsmart.com/guides/compound-interest' },
  ],
};

/* ── Data ───────────────────────────────────────────────────── */

/* Section 02 — four forces (2×2 open editorial grid)
   All comparison figures verified against CompoundInterestCalculator.tsx formula:
   eMR = ((1 + r/periods)^periods)^(1/12) − 1
   FV  = principal × (1+eMR)^months + monthly × ((1+eMR)^months − 1) / eMR
   Baseline: CA$10,000 / CA$500/mo / 6% / Monthly / 20yr → CA$264,122 */
const FORCES: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Clock,
    title: 'Time',
    body: 'The longer money has to compound, the greater the effect. Starting five years later reduces the ending balance by approximately CA$94,000 — even with identical contributions and return.',
  },
  {
    Icon: TrendingUp,
    title: 'Rate of return',
    body: 'A higher assumed return accelerates growth, but it is not directly controllable. A 2% difference in assumed return changes the ending balance by approximately CA$59,000 over 20 years.',
  },
  {
    Icon: Banknote,
    title: 'Ongoing contributions',
    body: 'Adding CA$250 more per month increases the ending balance by approximately CA$115,000 over 20 years — often more impactful than chasing a higher assumed return.',
  },
  {
    Icon: RefreshCw,
    title: 'Compounding frequency',
    body: 'The more frequently interest compounds, the slightly higher the effective annual return. The calculator models annual, semi-annual, monthly, and daily compounding.',
  },
];

/* Section 03 — scenario card: 5 inputs (last tile spans 2 cols)
   Inputs and outputs verified against source formula in CompoundInterestCalculator.tsx */
const SCENARIO_INPUTS = [
  { label: 'Initial investment',    value: 'CA$10,000' },
  { label: 'Monthly contribution',  value: 'CA$500 / mo' },
  { label: 'Annual return',         value: '6% (assumed)' },
  { label: 'Compounding',           value: 'Monthly' },
  { label: 'Time horizon',          value: '20 years' },
];

/* Section 03 right — three editorial observations (single-column divider list, no before→after) */
const OBSERVATIONS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Banknote,
    title: 'What you contributed',
    body: 'CA$10,000 initially plus CA$500 per month over 20 years totals CA$130,000 invested — just under half the ending balance.',
  },
  {
    Icon: TrendingUp,
    title: 'What compounding added',
    body: 'CA$134,122 came from investment growth — more than half the final balance. The actual money invested never exceeded CA$130,000.',
  },
  {
    Icon: Clock,
    title: 'Why the later years matter more',
    body: 'At the 10-year mark, the balance is approximately CA$100,000. The second decade adds over CA$164,000 more — because growth compounds on a much larger base.',
  },
];

/* Section 04 — four comparisons (2×2 open editorial grid)
   All figures verified:
   - 15yr: CA$169,950 (wait 5yr);  20yr baseline: CA$264,122 → gap CA$94,172
   - CA$750/mo 20yr: CA$379,633 → gain CA$115,511 vs CA$500/mo
   - 4% 20yr:  CA$205,360 → gap CA$58,762 vs 6%
   - net 4.5% (1.5% fee) 20yr: CA$216,159 vs net 5.5% (0.5% fee): CA$245,905 → gap CA$29,746 */
const LEVERS: { Icon: LucideIcon; title: string; before: string; after: string; effect: string }[] = [
  {
    Icon: Clock,
    title: 'Start earlier',
    before: 'Wait 5 years (15yr horizon)',
    after: 'Start now (20yr horizon)',
    effect: 'Waiting five years reduces the ending balance from approximately CA$264,000 to approximately CA$170,000 — a difference of about CA$94,000 at the same future endpoint.',
  },
  {
    Icon: Banknote,
    title: 'Contribute more each month',
    before: 'CA$500 / mo',
    after: 'CA$750 / mo',
    effect: 'Adding CA$250 per month increases the ending balance from approximately CA$264,000 to approximately CA$380,000 — a gain of about CA$115,000 over 20 years.',
  },
  {
    Icon: Percent,
    title: 'Assumed return',
    before: '4% assumed return',
    after: '6% assumed return',
    effect: 'A 2% higher assumed rate produces approximately CA$59,000 more over 20 years. Shown for context only — actual investment returns vary and are not guaranteed.',
  },
  {
    Icon: TrendingDown,
    title: 'Reduce investment fees',
    before: '1.5% annual fee (net ~4.5%)',
    after: '0.5% annual fee (net ~5.5%)',
    effect: 'A 1% annual fee reduction adds approximately CA$30,000 over 20 years. Fee drag compounds against you the same way returns compound for you. See the Investment Fees Calculator for detailed modeling.',
  },
];

/* Section 04 — three misunderstandings (3-column open editorial grid) */
const MISTAKES = [
  {
    title: 'Expecting smooth annual returns',
    body: 'Real portfolios fluctuate year to year. The scenario above models a constant assumed rate — actual sequences of returns vary, and a poor year early in the period can have a lasting effect on the ending balance.',
  },
  {
    title: 'Focusing on return while ignoring contributions and time',
    body: 'A 2% higher assumed return adds about CA$59,000 over 20 years. Investing CA$250 more per month for the same period adds approximately CA$115,000. Contributions and time are often more controllable than return.',
  },
  {
    title: 'Treating projected growth as a plan',
    body: 'Compound interest projections are estimates, not guarantees. Taxes, inflation, investment fees, and actual market returns all affect what you end up with. Use projections for direction, not precision.',
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

export default function CompoundInterestGuide() {
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
                <span style={{ color: 'rgba(13,27,42,0.65)' }}>Compound Interest Guide</span>
              </nav>

              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: 'rgba(29,181,132,0.12)', color: '#1DB584' }}
                >
                  Investing
                </span>
                <span className="text-[12px]" style={{ color: 'rgba(13,27,42,0.58)' }}>~5 min read</span>
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
                Understanding Compound Interest
              </h1>

              <p
                className="text-[16.5px] sm:text-[18px] leading-relaxed"
                style={{ color: 'rgba(13,27,42,0.60)', maxWidth: '560px' }}
              >
                Compound interest means your growth earns growth. Over time, this effect becomes
                the most powerful force in long-term saving and investing — and understanding it
                helps you make better decisions about when to start, how much to contribute, and
                what assumptions to question.
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
                      'How compound growth differs from simple interest',
                      'The four forces that shape long-term outcomes',
                      'What a 20-year saving scenario actually produces',
                      'Which changes have the greatest effect on your result',
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

        {/* ── 01 WHAT IS COMPOUND INTEREST? ───────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <div className="max-w-3xl">
            <SectionHeader
              num="01"
              title="What is compound interest?"
              subtitle="Your returns earn returns — and that changes everything over time."
            />

            <p className="text-[14px] leading-[1.72] mb-4" style={{ color: 'rgba(13,27,42,0.72)' }}>
              With simple interest, you earn a fixed amount on your original principal each period.
              With compound interest, you earn returns on both your principal and on the growth
              already accumulated — so each period builds on a larger base than the one before.
            </p>
            <p className="text-[14px] leading-[1.72] mb-4" style={{ color: 'rgba(13,27,42,0.72)' }}>
              This distinction matters most over long periods. In the early years, the difference
              between simple and compound growth is modest. Over 20 or 30 years, it becomes the
              dominant factor in your ending balance.
            </p>
            <p className="text-[14px] leading-[1.72]" style={{ color: 'rgba(13,27,42,0.72)' }}>
              The Compound Interest Calculator models this directly: enter an initial amount, a
              monthly contribution, an assumed return rate, and a time horizon — and it separates
              exactly how much of the ending balance came from your contributions versus investment
              growth.
            </p>
          </div>
        </section>

        {/* ── 02 THE FOUR FORCES BEHIND COMPOUNDING ───────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <SectionHeader
            num="02"
            title="The four forces behind compounding"
            subtitle="These inputs drive the outcome — and not all of them are equally within your control."
          />

          {/* Four forces — 2×2 open editorial grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
            {FORCES.map(({ Icon, title, body }, i) => (
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
            Of the four forces, contribution amount and time are the most directly actionable.
            Return rate and compounding frequency matter, but they are harder to control — and
            projected returns are never guaranteed.
          </p>

          {/* Mid-article calculator text link */}
          <div className="mt-8">
            <Link
              href="/compound-interest-calculator"
              className="inline-flex items-center gap-1 text-[14px] font-medium hover:underline underline-offset-2 transition-opacity hover:opacity-80"
              style={{ color: '#1DB584' }}
            >
              See how contributions and time interact in the calculator →
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

                {/* Dark result panel — teal border (positive growth outcome) */}
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

                  {/* Row 1: Final Balance + Total Contributed */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div
                      className="rounded-brand-sm p-2.5"
                      style={{ background: 'rgba(29,181,132,0.12)', border: '1px solid rgba(29,181,132,0.28)' }}
                    >
                      <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(29,181,132,0.72)' }}>
                        Final balance
                      </p>
                      <p className="mt-1 text-[15px] font-extrabold leading-none" style={{ color: '#1DB584' }}>
                        CA$264,122
                      </p>
                    </div>
                    <div
                      className="rounded-brand-sm p-2.5"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                        Total contributed
                      </p>
                      <p className="mt-1 text-[15px] font-extrabold leading-none text-white/90">
                        CA$130,000
                      </p>
                    </div>
                  </div>

                  <div className="my-2.5 border-t border-white/[0.07]" />

                  {/* Row 2: Investment Growth hero + stacked breakdown */}
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Investment breakdown
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Investment Growth — teal hero */}
                    <div
                      className="rounded-brand-sm p-2.5"
                      style={{
                        background: 'rgba(29,181,132,0.10)',
                        border: '1px solid rgba(29,181,132,0.24)',
                      }}
                    >
                      <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(29,181,132,0.80)' }}>
                        Investment growth
                      </p>
                      <p className="mt-1 text-[22px] font-extrabold leading-none" style={{ color: '#1DB584' }}>
                        CA$134,122
                      </p>
                      <p className="mt-0.5 text-[9px]" style={{ color: 'rgba(29,181,132,0.55)' }}>
                        from compounding
                      </p>
                    </div>

                    {/* Growth share — stacked */}
                    <div className="flex flex-col gap-1.5">
                      <div
                        className="rounded-brand-sm p-2.5"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                      >
                        <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                          Growth share
                        </p>
                        <p className="mt-1 text-[14px] font-extrabold leading-none text-white/90">
                          ~50.8%
                        </p>
                      </div>
                      <div
                        className="rounded-brand-sm p-2.5"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                      >
                        <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                          Contribution share
                        </p>
                        <p className="mt-1 text-[14px] font-extrabold leading-none text-white/90">
                          ~49.2%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="my-2.5 border-t border-white/[0.07]" />

                  {/* Status badge */}
                  <div
                    className="rounded-brand-sm px-3 py-2"
                    style={{ background: 'rgba(29,181,132,0.10)', border: '1px solid rgba(29,181,132,0.28)' }}
                  >
                    <p className="text-[11px] font-bold" style={{ color: '#1DB584' }}>
                      More than half came from compounding, not contributions
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      End-of-period contributions — no inflation or fees modeled. Actual results will differ.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="border-t border-brand-gray-100 px-4 py-2"
                  style={{ background: '#F8FAFB' }}
                >
                  <p className="text-[10.5px] text-brand-gray-400 leading-relaxed">
                    CA$10,000 initial + CA$500 × 240 months = CA$130,000 contributed.
                    At 0.5% effective monthly rate (6% nominal, monthly compounding): final balance CA$264,122. Illustrative only.
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
                (6% nominal, monthly compounding). No inflation adjustment or fees modeled.
                Actual results will differ based on return, fees, and contribution timing.
              </p>
            </div>

          </div>
        </section>

        {/* ── 04 WHAT CHANGES THE RESULT MOST? + MISTAKES ─────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <SectionHeader
            num="04"
            title="What changes the result most?"
            subtitle="Four comparisons — and three misunderstandings that lead people to the wrong conclusions."
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
              All figures use the same formula as the scenario above — CA$10,000 initial / CA$500/mo / monthly compounding.
              Return comparisons are illustrative. Actual investment returns vary and are not guaranteed.
              Fee comparison models gross 6% minus annual fee as a net return rate.
            </p>
          </div>

          {/* Three misunderstandings — exact MG/EF three-column grid */}
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

          {/* 05 CTA — section number inline, exact EF pattern */}
          <div className="mb-2">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>05</p>
          </div>
          <GuideCTA
            heading="Explore your long-term growth"
            benefits={[
              'Estimate a future balance from any starting amount and contribution',
              'See exactly how much came from contributions versus compounding',
              'Compare how time, rate, or contribution changes shift the result',
            ]}
            primaryHref="/compound-interest-calculator"
            primaryLabel="Open Compound Interest Calculator"
            secondaryHref="/investment-fees-calculator"
            secondaryLabel="Try Investment Fees Calculator"
            note="After calculating, FinCalc Smart AI can highlight which assumptions drive your outcome most and which changes may have the greatest long-term effect."
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
