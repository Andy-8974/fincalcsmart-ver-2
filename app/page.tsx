import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Home as HomeIcon,
  Wallet,
  TrendingUp,
  Receipt,
  Zap,
  Globe2,
  BarChart3,
  FileDown,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import HeroSearch from '@/components/home/HeroSearch';
import HeroPreview from '@/components/home/HeroPreview';
import CalcCard from '@/components/home/CalcCard';
import InsightsShowcase, { type WeekGroup } from '@/components/home/InsightsShowcase';
import AnalyticsSection from '@/components/home/AnalyticsSection';
import RecentCalculatorsWidget from '@/components/home/RecentCalculatorsWidget';
import { USFlagIcon, CAFlagIcon } from '@/components/ui/FlagIcons';


export const metadata: Metadata = {
  title: 'FinCalc Smart — Free Financial Calculators for Canada & the USA',
  description:
    'Estimate payments, compare scenarios, and understand your numbers with smart AI-assisted financial insights. Free calculators for mortgages, loans, retirement, and more.',
};

/* ── JSON-LD ────────────────────────────────────────────────── */

const organizationWebsiteSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.fincalcsmart.com/#organization',
      name: 'FinCalc Smart',
      url: 'https://www.fincalcsmart.com',
      description:
        'FinCalc Smart provides free financial calculators and AI-assisted educational insights for mortgages, investing, retirement, taxes, loans, and personal finance in the United States and Canada.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.fincalcsmart.com/#website',
      name: 'FinCalc Smart',
      url: 'https://www.fincalcsmart.com',
      publisher: { '@id': 'https://www.fincalcsmart.com/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://www.fincalcsmart.com/calculators?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

function getWeekGroup(): WeekGroup {
  return (Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 4) as WeekGroup;
}

// ─── Guide thumbnails — abstract fintech SVG compositions ─────────────────────

function MortgageThumbnail() {
  return (
    <div
      className="relative mb-4 h-40 w-full overflow-hidden rounded-brand-lg"
      style={{ background: 'linear-gradient(135deg, #C8EEE1 0%, #E6F7F1 100%)' }}
      aria-hidden
    >
      {/* Rising bar chart */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 220 90"
        preserveAspectRatio="none"
        style={{ height: '78%' }}
      >
        {[28, 42, 55, 68, 60, 50].map((h, i) => (
          <rect
            key={i}
            x={10 + i * 34}
            y={90 - h}
            width={22}
            height={h}
            fill="#1DB584"
            opacity={0.12 + i * 0.08}
            rx={3}
          />
        ))}
        <polyline
          points="21,65 55,48 89,34 123,12 157,22 191,38"
          fill="none"
          stroke="#1DB584"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
        <circle cx="123" cy="12" r="4.5" fill="#1DB584" opacity="0.95" />
        <circle cx="21"  cy="65" r="3"   fill="white" stroke="#1DB584" strokeWidth="1.5" opacity="0.85" />
        <circle cx="191" cy="38" r="3"   fill="white" stroke="#1DB584" strokeWidth="1.5" opacity="0.85" />
      </svg>
      {/* Subtle house outline */}
      <svg
        className="absolute right-4 top-3"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1DB584"
        strokeWidth="1.5"
        opacity="0.20"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
      </svg>
    </div>
  );
}

function StrategyThumbnail() {
  return (
    <div
      className="relative mb-4 h-40 w-full overflow-hidden rounded-brand-lg"
      style={{ background: 'linear-gradient(135deg, #E2EEF5 0%, #EDF5FA 100%)' }}
      aria-hidden
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 220 144"
        preserveAspectRatio="none"
      >
        {/* Fill under teal line — better scenario */}
        <path
          d="M 10,110 C 55,90 90,60 110,42 S 165,18 210,10 L 210,144 L 10,144 Z"
          fill="#1DB584"
          opacity="0.08"
        />
        {/* Scenario B — teal (better outcome) */}
        <path
          d="M 10,110 C 55,90 90,60 110,42 S 165,18 210,10"
          fill="none"
          stroke="#1DB584"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.75"
        />
        {/* Scenario A — dashed navy (standard baseline) */}
        <path
          d="M 10,30 C 55,50 90,70 110,82 S 165,100 210,108"
          fill="none"
          stroke="#0D1B2A"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="6 4"
          opacity="0.18"
        />
        {/* Dots on teal line */}
        {([[10,110],[65,72],[110,42],[160,22],[210,10]] as [number,number][]).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="#1DB584" opacity={0.42 + i * 0.11} />
        ))}
      </svg>
      {/* Legend */}
      <div className="absolute bottom-2.5 left-3 flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-[9px] font-semibold" style={{ color: '#1DB584' }}>
          <span className="inline-block h-1.5 w-5 rounded-full" style={{ background: '#1DB584', opacity: 0.85 }} />
          Scenario B
        </span>
        <span className="flex items-center gap-1.5 text-[9px] font-semibold" style={{ color: '#6B7A8D' }}>
          <span className="inline-block" style={{ width: 20, borderTop: '1.5px dashed rgba(13,27,42,0.35)' }} />
          Scenario A
        </span>
      </div>
      {/* Corner icon */}
      <svg className="absolute right-3 top-3" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="#1DB584" strokeWidth="1.5" opacity="0.22">
        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
      </svg>
    </div>
  );
}

function SavingsThumbnail() {
  return (
    <div
      className="relative mb-4 h-40 w-full overflow-hidden rounded-brand-lg"
      style={{ background: 'linear-gradient(135deg, #FDF4E3 0%, #FEF9F0 100%)' }}
      aria-hidden
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 220 130"
        preserveAspectRatio="none"
      >
        {/* Standard payments curve — navy, slow decline */}
        <path
          d="M 10,20 C 60,28 110,50 160,80 S 200,105 210,115"
          fill="none" stroke="#0D1B2A" strokeWidth="1.8"
          strokeLinecap="round" strokeDasharray="5 3" opacity="0.20"
        />
        {/* With extra payments — teal, faster payoff */}
        <path
          d="M 10,20 C 55,32 95,62 140,95 S 175,118 190,124"
          fill="none" stroke="#C9A84C" strokeWidth="2.5"
          strokeLinecap="round" opacity="0.75"
        />
        {/* Savings gap fill between the two curves */}
        <path
          d="M 10,20 C 55,32 95,62 140,95 S 175,118 190,124 L 210,115 C 200,105 160,80 110,50 C 60,28 10,20 10,20 Z"
          fill="#C9A84C" opacity="0.07"
        />
        {/* Dots on teal line */}
        {([[10,20],[60,36],[110,60],[160,94],[190,124]] as [number,number][]).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="#C9A84C" opacity={0.40 + i * 0.12} />
        ))}
        {/* Savings badge */}
        <rect x="136" y="44" width="72" height="26" rx="5" fill="white" opacity="0.85" />
        <text x="172" y="55" textAnchor="middle" style={{ fontSize: 8, fill: '#6B7A8D', fontWeight: 600 }}>
          Interest saved
        </text>
        <text x="172" y="66" textAnchor="middle" style={{ fontSize: 11, fill: '#C9A84C', fontWeight: 800 }}>
          $28,400
        </text>
      </svg>
      {/* Corner icon */}
      <svg className="absolute right-3 top-3" width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="#C9A84C" strokeWidth="1.5" opacity="0.28">
        <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
        <polyline points="17,6 23,6 23,12" />
      </svg>
    </div>
  );
}

// ─── Static data ──────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  {
    key: 'region', Icon: Globe2,
    label: (
      <span className="flex items-center gap-1 font-medium">
        <USFlagIcon width={14} height={9} />
        <span>USA</span>
        <span style={{ opacity: 0.4, fontSize: '11px' }}>&amp;</span>
        <CAFlagIcon width={14} height={9} />
        <span>Canada tools</span>
      </span>
    ),
  },
  { key: 'insights', Icon: CheckCircle2, label: 'Smart AI-assisted insights'  },
  { key: 'charts',   Icon: BarChart3,    label: 'Visual financial breakdowns' },
  { key: 'mobile',   Icon: Smartphone,   label: 'Mobile-friendly experience', hideOnMobile: true  },
];

const CATEGORIES = [
  {
    Icon: HomeIcon,
    title: 'Mortgage',
    description: 'Estimate payments, compare scenarios, and understand your home costs.',
    cta: 'Estimate payments',
    href: '/canadian-mortgage-calculator',
    iconColor: '#1DB584',
    iconBg: '#E6F7F1',
    iconBgHover: '#C8EDE2',
  },
  {
    Icon: Wallet,
    title: 'Loans',
    description: 'Calculate monthly payments, interest costs, and payoff timelines.',
    cta: 'Compare loan costs',
    href: '/calculators',
    iconColor: '#4F7EA8',
    iconBg: '#EBF2F8',
    iconBgHover: '#D6E6F2',
  },
  {
    Icon: TrendingUp,
    title: 'Financial Planning',
    description: 'Build your net worth, grow your savings, and plan for the future.',
    cta: 'Start planning',
    href: '/calculators',
    iconColor: '#D97706',
    iconBg: '#FEF3C7',
    iconBgHover: '#FDE68A',
  },
  {
    Icon: Receipt,
    title: 'Tax & Salary',
    description: 'Estimate your tax liability and understand your take-home pay.',
    cta: 'Calculate taxes',
    href: '/calculators',
    iconColor: '#7C3AED',
    iconBg: '#EDE9FE',
    iconBgHover: '#DDD6FE',
  },
] as const;


const WHY_SECONDARY = [
  {
    Icon: BarChart3,
    title: 'Scenario Comparison',
    body: 'Compare side-by-side scenarios to find the option that fits your situation best.',
  },
  {
    Icon: FileDown,
    title: 'Downloadable Reports',
    body: 'Export clean, shareable PDF reports directly from any calculator.',
  },
  {
    Icon: TrendingUp,
    title: 'Visual Breakdowns',
    body: 'Interactive charts make complex financial data easy to read and share.',
  },
  {
    Icon: BookOpen,
    title: 'Educational Guidance',
    body: 'Plain-language explanations of formulas and financial concepts, built in.',
  },
] as const;

const ARTICLES = [
  {
    Thumbnail: MortgageThumbnail,
    tag: 'Mortgage',
    tagColor: '#1DB584',
    tagBg: 'rgba(29,181,132,0.10)',
    title: 'How mortgage payments are calculated',
    body: 'Understanding the math behind your monthly payment — principal, interest, amortization, and compounding — helps you negotiate better and plan smarter.',
    href: '/guides',
    readTime: '4 min read',
  },
  {
    Thumbnail: StrategyThumbnail,
    tag: 'Strategy',
    tagColor: '#2A5A84',
    tagBg: 'rgba(42,90,132,0.10)',
    title: 'How to compare mortgage scenarios',
    body: 'Not all mortgages are equal. Learn how to compare fixed vs. variable rates, amortization terms, and lender offers side by side.',
    href: '/guides',
    readTime: '5 min read',
  },
  {
    Thumbnail: SavingsThumbnail,
    tag: 'Savings',
    tagColor: '#C9A84C',
    tagBg: 'rgba(201,168,76,0.10)',
    title: 'How extra payments reduce your interest',
    body: 'Even a small increase in your monthly payment can shave years off your amortization and save tens of thousands in interest.',
    href: '/guides',
    readTime: '3 min read',
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const weekGroup = getWeekGroup();

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationWebsiteSchema) }}
      />
      {/* ══════════════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative px-4 pb-10 pt-[100px] md:pt-[144px] md:pb-24 lg:pb-16"
        style={{
          background: 'linear-gradient(145deg, #E4F5EE 0%, #EFF9F5 18%, #F8FDFB 38%, #FFFFFF 52%, #F2F1FD 72%, #EEE8F9 88%, #F5EEF7 100%)',
          marginTop: '-80px',
        }}
      >
        {/* Left mint/teal glow */}
        <div
          className="pointer-events-none absolute left-0 top-0 h-full w-[45%]"
          style={{
            background: 'radial-gradient(ellipse at 8% 30%, rgba(29,181,132,0.20) 0%, rgba(29,181,132,0.06) 45%, transparent 68%)',
          }}
          aria-hidden
        />
        {/* Right lavender/blue glow */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-[55%]"
          style={{
            background: 'radial-gradient(ellipse at 85% 28%, rgba(109,99,236,0.13) 0%, rgba(139,92,246,0.06) 40%, transparent 65%)',
          }}
          aria-hidden
        />
        {/* Subtle blush accent — far right bottom */}
        <div
          className="pointer-events-none absolute right-0 bottom-0 h-[60%] w-[35%]"
          style={{
            background: 'radial-gradient(ellipse at 90% 80%, rgba(219,132,200,0.07) 0%, transparent 55%)',
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-6 lg:gap-12 lg:grid-cols-2">

            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-teal/25 bg-brand-teal/[0.08] px-2.5 py-1 text-[12px] md:px-3.5 md:py-1.5 md:text-sm font-bold text-brand-teal">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-teal" aria-hidden />
                <USFlagIcon />
                <span>USA</span>
                <span style={{ color: 'rgba(29,181,132,0.45)', fontSize: '10px' }}>·</span>
                <CAFlagIcon />
                <span>Canada</span>
              </span>

              <h1 className="mt-2.5 md:mt-5 text-[26px] leading-tight font-extrabold tracking-tight text-brand-navy md:text-[44px] lg:text-5xl xl:text-[52px]">
                Smarter Financial Calculators.<br /><span className="whitespace-nowrap">AI-Assisted Insights.</span>
              </h1>

              <p className="mt-2.5 md:mt-5 max-w-lg text-[14px] md:text-lg leading-relaxed text-brand-gray-600">
                Estimate payments, compare scenarios, and understand your numbers with AI-assisted insights.
              </p>

              {/* Desktop: search stays in left column */}
              <div className="hidden lg:block">
                <HeroSearch />
                <p className="mt-5 text-xs text-brand-gray-400">
                  Free to use · No sign-up required
                </p>
              </div>
            </div>

            <div className="lg:pl-4">
              <HeroPreview />
            </div>
          </div>

          {/* Mobile: search below HeroPreview */}
          <div className="mt-6 lg:hidden">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          2. TRUST BAR
      ══════════════════════════════════════════════════════ */}
      <section className="border-y border-brand-gray-100 bg-brand-gray-50 px-4 py-5">
        <div className="mx-auto max-w-6xl">
          <ul
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-10"
            aria-label="Key features"
          >
            {TRUST_ITEMS.map(({ key, Icon, label, hideOnMobile }) => (
              <li key={key} className={`${hideOnMobile ? 'hidden sm:flex' : 'flex'} items-center gap-2 text-sm text-brand-gray-600`}>
                <Icon className="h-4 w-4 text-brand-teal" aria-hidden />
                {typeof label === 'string'
                  ? <span className="font-medium">{label}</span>
                  : label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3. CALCULATOR DISCOVERY
      ══════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-teal">
                Calculators
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                Tools built for real financial decisions
              </h2>
              <p className="mt-3 max-w-lg text-base text-brand-gray-600">
                Choose the right tool for your decision. Every calculator covers both Canada and the USA.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {CATEGORIES.map(({ Icon, iconColor, ...card }) => (
              <CalcCard
                key={card.title}
                icon={<Icon className="h-5 w-5" style={{ color: iconColor }} aria-hidden />}
                {...card}
              />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 border-t border-brand-gray-100 pt-8">
            <Link
              href="/calculators"
              className="group inline-flex items-center gap-1.5 rounded-full border border-brand-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-gray-600 shadow-sm transition-all hover:border-brand-teal/40 hover:text-brand-teal"
            >
              Browse all calculators
              <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          4. AI INSIGHTS
      ══════════════════════════════════════════════════════ */}
      <InsightsShowcase weekGroup={weekGroup} />

      {/* ══════════════════════════════════════════════════════
          5. VISUAL ANALYTICS
      ══════════════════════════════════════════════════════ */}
      <AnalyticsSection />

      {/* ══════════════════════════════════════════════════════
          6. WHY FINCALC SMART — dark navy premium
      ══════════════════════════════════════════════════════ */}
      <section
        className="px-4 py-16 sm:py-24"
        style={{ background: 'linear-gradient(160deg, #091523 0%, #0D1B2A 45%, #0A1628 100%)' }}
      >
        <div className="mx-auto max-w-6xl">

          {/* Header */}
          <div className="mb-12 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-teal">
              Why FinCalc Smart
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Not just a calculator.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>
              FinCalc Smart turns your numbers into clarity — helping you understand,
              compare, and make smarter financial decisions.
            </p>
          </div>

          {/* ── Top 2 large feature cards ── */}
          <div className="grid gap-4 sm:grid-cols-2">

            {/* Large card 1: AI-Assisted Insights */}
            <div
              className="flex flex-col rounded-brand-xl p-7"
              style={{
                background: 'linear-gradient(150deg, #0D2440 0%, #0A1E35 100%)',
                border: '1px solid rgba(29,181,132,0.20)',
              }}
            >
              <div
                className="mb-5 flex h-11 w-11 items-center justify-center rounded-brand-md"
                style={{ background: 'rgba(29,181,132,0.15)' }}
              >
                <Zap className="h-5 w-5 text-brand-teal" aria-hidden />
              </div>
              <h3 className="text-[18px] font-bold text-white">Smart AI-Assisted Insights</h3>
              <p className="mt-2.5 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Every calculation surfaces contextual insights — not just the number,
                but what it means for your situation.
              </p>

              {/* Mini insight visual */}
              <div className="mt-6">
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Opportunity', bg: 'rgba(29,181,132,0.15)',   color: '#1DB584' },
                    { label: 'Risk signal', bg: 'rgba(176,123,42,0.15)',   color: '#D4A44C' },
                    { label: 'Next step',   bg: 'rgba(58,90,138,0.20)',    color: '#7BA7D4' },
                  ].map(({ label, bg, color }) => (
                    <span
                      key={label}
                      className="rounded-full px-3 py-1 text-[11px] font-bold"
                      style={{ background: bg, color }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <div
                  className="mt-3 rounded-brand-lg p-4"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <p className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Extra $150/mo payment could save
                  </p>
                  <p className="mt-1 text-[22px] font-extrabold leading-none tracking-tight" style={{ color: '#FCD34D' }}>
                    $18,400
                  </p>
                  <p className="mt-1 text-[10.5px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    in interest · 25-yr amortization
                  </p>
                </div>
              </div>
            </div>

            {/* Large card 2: USA & Canada Coverage */}
            <div
              className="flex flex-col rounded-brand-xl p-7"
              style={{
                background: 'linear-gradient(150deg, #101E2E 0%, #0C1A28 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div
                className="mb-5 flex h-11 w-11 items-center justify-center rounded-brand-md"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <Globe2 className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.70)' }} aria-hidden />
              </div>
              <h3 className="text-[18px] font-bold text-white">USA & Canada Coverage</h3>
              <p className="mt-2.5 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Full dual-region support with region-specific compounding rules, tax
                treatment, and terminology. Switch instantly.
              </p>

              {/* Flag pill visual */}
              <div className="mt-6">
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-brand-lg p-4"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                  >
                    <div className="mb-2.5 flex items-center gap-2">
                      <USFlagIcon width={18} height={12} />
                      <span className="text-[13px] font-bold text-white">USA</span>
                    </div>
                    <p className="text-[10.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Mortgage · Loans<br />Retirement
                    </p>
                  </div>
                  <div
                    className="rounded-brand-lg p-4"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                  >
                    <div className="mb-2.5 flex items-center gap-2">
                      <CAFlagIcon width={18} height={12} />
                      <span className="text-[13px] font-bold text-white">Canada</span>
                    </div>
                    <p className="text-[10.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Mortgage · RRSP<br />TFSA · Debt Payoff
                    </p>
                  </div>
                </div>
                <div
                  className="mt-3 flex items-center gap-2 rounded-brand-sm px-3 py-2.5"
                  style={{ background: 'rgba(29,181,132,0.08)', border: '1px solid rgba(29,181,132,0.14)' }}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" aria-hidden />
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.58)' }}>
                    Same calculator experience, localized rules.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom 4 small feature cards ── */}
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {WHY_SECONDARY.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-brand-xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div
                  className="mb-4 flex h-9 w-9 items-center justify-center rounded-brand-sm"
                  style={{ background: 'rgba(29,181,132,0.13)' }}
                >
                  <Icon className="h-4 w-4 text-brand-teal" aria-hidden />
                </div>
                <h3 className="text-[14px] font-bold text-white">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>
                  {body}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          7. GUIDES — SVG fintech thumbnails
      ══════════════════════════════════════════════════════ */}
      <section className="bg-brand-gray-50 px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-teal">
              Guides
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
              Learn while you calculate
            </h2>
            <p className="mt-4 max-w-lg text-base text-brand-gray-600">
              Plain-language guides to help you understand the concepts behind your calculations.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {ARTICLES.map(({ Thumbnail, tag, tagColor, tagBg, title, body, href, readTime }) => (
              <Link
                key={title}
                href={href}
                className="group flex flex-col rounded-brand-xl border border-brand-gray-200 bg-white p-6 motion-safe:transition-all motion-safe:duration-200 hover:border-brand-teal/30 motion-safe:hover:-translate-y-0.5"
                style={{ boxShadow: '0 2px 8px rgba(13,27,42,0.07)' }}
              >
                <Thumbnail />

                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider"
                    style={{ background: tagBg, color: tagColor }}
                  >
                    {tag}
                  </span>
                  <span className="text-xs text-brand-gray-400">{readTime}</span>
                </div>

                <h3 className="mb-2 text-[15px] font-extrabold leading-snug text-brand-navy transition-colors group-hover:text-brand-teal">
                  {title}
                </h3>
                <p className="flex-1 text-sm leading-relaxed text-brand-gray-600">{body}</p>

                <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-brand-teal">
                  Read guide
                  <ArrowRight className="h-3 w-3 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          8. FINAL CTA
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden px-4 py-20 sm:py-32 text-center"
        style={{ background: 'linear-gradient(160deg, #060F1A 0%, #0A1628 100%)' }}
      >
        {/* Soft radial teal glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 560, height: 340,
            background: 'radial-gradient(ellipse, rgba(29,181,132,0.11) 0%, rgba(29,181,132,0.04) 50%, transparent 75%)',
            borderRadius: '50%',
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-2xl">
          {/* Badge */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold"
            style={{
              background: 'rgba(29,181,132,0.10)',
              border: '1px solid rgba(29,181,132,0.22)',
              color: '#1DB584',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand-teal" aria-hidden />
            Free · No sign-up required
          </span>

          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[42px] lg:leading-tight">
            Start planning with smarter<br className="hidden sm:block" /> financial tools.
          </h2>

          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Explore calculators designed to help you estimate, compare, and understand
            your financial decisions.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/calculators"
              className="group inline-flex items-center gap-2 rounded-full bg-brand-teal px-8 py-4 text-[14px] font-bold text-white transition-all hover:bg-brand-teal-dark"
              style={{ boxShadow: '0 4px 24px rgba(29,181,132,0.26)' }}
            >
              Explore Calculators
              <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href="/canadian-mortgage-calculator"
              className="inline-flex items-center justify-center rounded-full px-8 py-4 text-[14px] font-bold transition-all hover:bg-white/[0.08]"
              style={{
                border: '1px solid rgba(255,255,255,0.16)',
                color: 'rgba(255,255,255,0.82)',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              Start with Mortgage Calculator
            </Link>
          </div>
        </div>
      </section>

      <RecentCalculatorsWidget />
    </main>
  );
}
