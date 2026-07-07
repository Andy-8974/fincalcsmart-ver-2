import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Umbrella,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Banknote,
  Target,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import ArticleLayout from '../_shared/ArticleLayout';
import GuideCTA from '../_shared/GuideCTA';
import ArticleDisclaimer from '../_shared/ArticleDisclaimer';

/* ── Metadata ──────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: 'How to Build an Emergency Fund — Savings Target Guide',
  description:
    'Learn how much to save in an emergency fund, how to choose a realistic target, and how monthly contributions can help close the gap.',
};

/* ── JSON-LD ────────────────────────────────────────────────── */

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Build an Emergency Fund — Savings Target Guide',
  description:
    'Learn how much to save in an emergency fund, how to choose a realistic target, and how monthly contributions can help close the gap.',
  author: { '@type': 'Organization', name: 'FinCalc Smart Editorial Team' },
  publisher: {
    '@type': 'Organization',
    name: 'FinCalc Smart',
    url: 'https://www.fincalcsmart.com',
  },
  datePublished: '2026-06-13',
  dateModified: '2026-06-13',
  url: 'https://www.fincalcsmart.com/guides/emergency-fund',
  inLanguage: 'en',
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.fincalcsmart.com' },
    { '@type': 'ListItem', position: 2, name: 'Financial Guides', item: 'https://www.fincalcsmart.com/guides' },
    { '@type': 'ListItem', position: 3, name: 'Emergency Fund Guide', item: 'https://www.fincalcsmart.com/guides/emergency-fund' },
  ],
};

/* ── Data ───────────────────────────────────────────────────── */

/* Section 02 — five factors that shape your target */
const FACTORS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Banknote,
    title: 'Essential monthly expenses',
    body: 'Use only non-negotiable costs such as housing, food, utilities, transport, insurance, and minimum debt payments.',
  },
  {
    Icon: ShieldAlert,
    title: 'Income stability',
    body: 'Stable employment may support a smaller target, while freelance, seasonal, or commission income may justify a larger buffer.',
  },
  {
    Icon: Umbrella,
    title: 'Household dependants',
    body: 'A single-income household or a family supporting dependants may need more protection.',
  },
  {
    Icon: Target,
    title: 'Insurance and employer benefits',
    body: 'Disability coverage, paid leave, and employer benefits can reduce how much cash protection is needed.',
  },
  {
    Icon: TrendingUp,
    title: 'Other accessible liquid savings',
    body: 'Consider savings you can access quickly without penalties or major market risk.',
  },
];

/* Section 02 — flexible target framework (editorial divider list) */
const TARGET_TIERS = [
  {
    label: 'Starter buffer',
    example: 'e.g., CA/US$1,000',
    body: 'A small first milestone while you build toward a larger target.',
  },
  {
    label: '3 months',
    example: null,
    body: 'May suit households with stable income, strong benefits, and low financial risk.',
  },
  {
    label: '6 months',
    example: null,
    body: 'A practical planning baseline for many working households.',
  },
  {
    label: '9–12 months',
    example: null,
    body: 'Worth considering for irregular income, dependants, or limited employment protection.',
  },
];

/* Section 03 — scenario card: 5 inputs (last tile spans 2 cols) */
const SCENARIO_INPUTS = [
  { label: 'Monthly expenses',     value: 'CA$4,000 / mo' },
  { label: 'Current savings',      value: 'CA$5,000' },
  { label: 'Monthly contribution', value: 'CA$500 / mo' },
  { label: 'Target coverage',      value: '6 months' },
  { label: 'Income stability',     value: 'Moderate' },
];

/* Section 03 right — three editorial observations (MG LEVERS structure, no before→after) */
const OBSERVATIONS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Umbrella,
    title: 'Current protection',
    body: 'CA$5,000 covers approximately 1.25 months of essential expenses — enough for a small unexpected cost, but well below a meaningful income-interruption cushion.',
  },
  {
    Icon: AlertTriangle,
    title: 'Remaining exposure',
    body: 'The household still has a CA$19,000 gap before reaching six months of coverage. Until then, a larger unexpected expense would likely require borrowing.',
  },
  {
    Icon: Clock,
    title: 'Current pace',
    body: 'At CA$500 per month, reaching the full target takes approximately 38 months — just over three years. The levers below can shorten that timeline.',
  },
];

/* Section 04 — four levers (full MG LEVERS format with before→after)
   Lever 1: CA$500 → CA$750/mo; gap 19,000 / 750 = 25.3 → 26 months
   Lever 2: CA$5,000 as first milestone — directional
   Lever 3: CA$2,000 lump; new gap = 24,000 − 7,000 = 17,000; 17,000/500 = 34 months
   Lever 4: expenses CA$4,000 → CA$3,200; new target = 6×3,200 = 19,200;
             gap = 19,200 − 5,000 = 14,200; 14,200/500 = 28.4 → ceil = 29 months */
const LEVERS: { Icon: LucideIcon; title: string; before: string; after: string; effect: string }[] = [
  {
    Icon: TrendingUp,
    title: 'Increase monthly savings',
    before: 'CA$500 / mo',
    after: 'CA$750 / mo',
    effect: 'Raises the contribution by CA$250/month and shortens the timeline from approximately 38 months to approximately 26 months.',
  },
  {
    Icon: Target,
    title: 'Build a starter buffer first',
    before: 'Full CA$24,000 target',
    after: 'CA$5,000 milestone reached',
    effect: 'The current savings already reach a meaningful starter buffer. Treating this as the first completed milestone can help maintain momentum toward the full target.',
  },
  {
    Icon: Banknote,
    title: 'Redirect a lump sum',
    before: 'CA$19,000 gap remaining',
    after: 'CA$17,000 gap after CA$2,000 lump sum',
    effect: 'A CA$2,000 windfall — tax refund, bonus, or gift — applied directly reduces the remaining gap and shortens the timeline from approximately 38 to approximately 34 months.',
  },
  {
    Icon: RefreshCw,
    title: 'Review true essential expenses',
    before: 'CA$4,000 / mo (all costs)',
    after: 'CA$3,200 / mo (essential only)',
    effect: 'Separating discretionary from essential costs reduces the six-month target to CA$19,200. With CA$5,000 already saved, the remaining gap falls to CA$14,200 — approximately 29 months at CA$500/month.',
  },
];

/* Section 04 — three mistakes (MG Section 04 three-column grid format) */
const MISTAKES = [
  {
    title: 'Keeping emergency savings in volatile investments',
    body: 'Stocks and funds can fall significantly at the exact moment you need cash. Emergency savings belong in liquid, stable accounts where the principal is not at risk from market movements.',
  },
  {
    title: 'Using the fund for planned purchases',
    body: 'The test is unplanned and urgent — not just unbudgeted. A holiday, appliance upgrade, or vehicle purchase is not an emergency. Spending from the fund for non-emergencies means it will not be there when something genuinely unexpected occurs.',
  },
  {
    title: 'Choosing a target so large that saving never begins',
    body: 'A fund that exists is more valuable than a perfect fund that has not been started. A starter buffer built this month protects against the most common unexpected expenses. Start with what is achievable.',
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

export default function EmergencyFundGuide() {
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
                <span style={{ color: 'rgba(13,27,42,0.65)' }}>Emergency Fund Guide</span>
              </nav>

              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: 'rgba(29,181,132,0.12)', color: '#1DB584' }}
                >
                  Financial Planning
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
                How to Build an Emergency Fund
              </h1>

              <p
                className="text-[16.5px] sm:text-[18px] leading-relaxed"
                style={{ color: 'rgba(13,27,42,0.60)', maxWidth: '560px' }}
              >
                Your emergency fund is the first line of defence against unplanned expenses—and
                against going into debt when something goes wrong. Learn how to choose a realistic
                target, build it steadily, and know when you are adequately prepared.
              </p>

              <p className="mt-3 text-[12.5px]" style={{ color: 'rgba(13,27,42,0.46)' }}>
                FinCalc Smart Editorial Team
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
                      'What an emergency fund should cover',
                      'How to choose a realistic savings target',
                      'How long your current plan may take',
                      'Which changes can shorten your timeline',
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

        {/* ── 01 WHAT IS AN EMERGENCY FUND? ───────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <div className="max-w-3xl">
            <SectionHeader
              num="01"
              title="What is an emergency fund?"
              subtitle="A liquid cash reserve for genuine, unexpected financial needs — not a savings account for everything."
            />

            <p className="text-[14px] leading-[1.72] mb-4" style={{ color: 'rgba(13,27,42,0.72)' }}>
              An emergency fund is a cash reserve for urgent, unplanned financial needs. It can
              help cover an income interruption, essential medical costs, or a necessary home or
              vehicle repair.
            </p>
            <p className="text-[14px] leading-[1.72] mb-4" style={{ color: 'rgba(13,27,42,0.72)' }}>
              It is not meant for holidays, planned purchases, or optional upgrades. Those expenses
              should be handled through separate savings goals.
            </p>
            <p className="text-[14px] leading-[1.72]" style={{ color: 'rgba(13,27,42,0.72)' }}>
              The purpose of an emergency fund is simple: to give you time and flexibility without
              forcing you to rely on high-interest debt when something goes wrong.
            </p>
          </div>
        </section>

        {/* ── 02 HOW MUCH SHOULD YOU SAVE? ────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <div className="max-w-3xl">
            <SectionHeader
              num="02"
              title="How much should you save?"
              subtitle="Five factors shape the appropriate target for your household."
            />
          </div>

          {/* Five factors — exact MG Section 01 grid structure */}
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

          {/* Flexible target framework — 2×2 grid on tablet/desktop */}
          <div className="mt-8">
            <p
              className="mb-6 text-[11px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(13,27,42,0.46)' }}
            >
              A flexible target framework
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
              {TARGET_TIERS.map(({ label, example, body }, i) => (
                <div
                  key={label}
                  className={[
                    'flex items-start gap-4 py-5',
                    i === 0 ? 'pt-0' : 'border-t',
                    i === 1 ? 'md:border-t-0' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ borderColor: 'rgba(13,27,42,0.07)' }}
                >
                  <span
                    className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ background: '#1DB584' }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2 mb-1.5">
                      <p className="font-bold text-[14px]" style={{ color: '#0D1B2A' }}>{label}</p>
                      {example && (
                        <span className="text-[12.5px]" style={{ color: 'rgba(13,27,42,0.48)' }}>
                          {example}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.68)' }}>
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[13px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.64)' }}>
              There is no single correct target. The right amount depends on your essential
              expenses, income stability, and available financial backup.
            </p>
          </div>

          {/* Mid-article calculator text link */}
          <div className="mt-8">
            <Link
              href="/emergency-fund-calculator"
              className="inline-flex items-center gap-1 text-[14px] font-medium hover:underline underline-offset-2 transition-opacity hover:opacity-80"
              style={{ color: '#1DB584' }}
            >
              Estimate your target and funding timeline →
            </Link>
          </div>
        </section>

        {/* ── 03 SEE IT IN ACTION ─────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <div className="max-w-3xl">
            <SectionHeader
              num="03"
              title="See it in action"
              subtitle="One household, one scenario — with the numbers the calculator actually produces."
            />
          </div>

          {/* Scenario: 5fr | Observations: 7fr — top-aligned */}
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-8 lg:gap-10 items-start">

            {/* Left: Scenario card — exact MG InsightsShowcase shell */}
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

                {/* Dark result panel — exact MG gradient + classes */}
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

                  {/* Row 1: Fund target + Current coverage */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div
                      className="rounded-brand-sm p-2.5"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                        Fund target
                      </p>
                      <p className="mt-1 text-[15px] font-extrabold leading-none text-white/90">
                        CA$24,000
                      </p>
                    </div>
                    <div
                      className="rounded-brand-sm p-2.5"
                      style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.24)' }}
                    >
                      <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(201,168,76,0.72)' }}>
                        Current coverage
                      </p>
                      <p className="mt-1 text-[15px] font-extrabold leading-none" style={{ color: '#C9A84C' }}>
                        1.25 months
                      </p>
                    </div>
                  </div>

                  <div className="my-2.5 border-t border-white/[0.07]" />

                  {/* Row 2: Remaining gap hero (amber) + Timeline stacked */}
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Remaining gap &amp; timeline
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Remaining gap — amber hero (shortfall) */}
                    <div
                      className="rounded-brand-sm p-2.5"
                      style={{
                        background: 'rgba(201,168,76,0.12)',
                        border: '1px solid rgba(201,168,76,0.32)',
                      }}
                    >
                      <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(201,168,76,0.80)' }}>
                        Remaining gap
                      </p>
                      <p className="mt-1 text-[22px] font-extrabold leading-none" style={{ color: '#C9A84C' }}>
                        CA$19,000
                      </p>
                      <p className="mt-0.5 text-[9px]" style={{ color: 'rgba(201,168,76,0.55)' }}>
                        to reach target
                      </p>
                    </div>

                    {/* Timeline — stacked (mirrors MG GDS+TDS stacked) */}
                    <div className="flex flex-col gap-1.5">
                      <div
                        className="rounded-brand-sm p-2.5"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                      >
                        <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                          Months to target
                        </p>
                        <p className="mt-1 text-[14px] font-extrabold leading-none text-white/90">
                          38 months
                        </p>
                      </div>
                      <div
                        className="rounded-brand-sm p-2.5"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                      >
                        <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                          Equivalent
                        </p>
                        <p className="mt-1 text-[14px] font-extrabold leading-none text-white/90">
                          ~3 yr 2 mo
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
                      Building toward a 6-month target
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Linear contributions — no account interest modeled. Actual timing may differ.
                    </p>
                  </div>
                </div>

                {/* Footer — exact MG pattern */}
                <div
                  className="border-t border-brand-gray-100 px-4 py-2"
                  style={{ background: '#F8FAFB' }}
                >
                  <p className="text-[10.5px] text-brand-gray-400 leading-relaxed">
                    Gap = CA$24,000 target − CA$5,000 savings = CA$19,000.
                    Timeline = CA$19,000 ÷ CA$500/mo = 38 months ≈ 3 yr 2 mo. Illustrative only.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Observations — exact MG LEVERS column structure and spacing */}
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
                Timeline calculated as remaining gap ÷ monthly contribution. No account interest
                is modeled. Actual results will differ based on savings rate and account type.
              </p>
            </div>

          </div>
        </section>

        {/* ── 04 LEVERS + MISTAKES — full MG Section 04 structure ─ */}
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-14 lg:pb-16">
          <SectionHeader
            num="04"
            title="Reach the goal faster—and avoid common mistakes"
            subtitle="Four changes that shorten the timeline, and three mistakes that extend it."
          />

          {/* Four levers — 2×2 grid on tablet/desktop */}
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
              Timeline figures use the same linear accumulation model as the scenario above.
              Lever 2 is directional — the current savings already reach a meaningful starter milestone.
            </p>
          </div>

          {/* Three mistakes — exact MG Section 04 full-width three-column grid */}
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

          {/* 05 CTA — section number inline in heading, exact MG pattern */}
          <div className="mb-2">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>05</p>
          </div>
          <GuideCTA
            heading="Ready to set your emergency fund target?"
            benefits={[
              'Estimate a target from your essential monthly expenses',
              'See how many months your current savings cover',
              'Estimate the contribution and time needed to close the gap',
            ]}
            primaryHref="/emergency-fund-calculator"
            primaryLabel="Open Emergency Fund Calculator"
            secondaryHref="/savings-goal-calculator"
            secondaryLabel="Try Savings Goal Calculator"
            note="After calculating, FinCalc Smart can provide AI-assisted insight into your funding gap, contribution pace, and possible next steps."
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
