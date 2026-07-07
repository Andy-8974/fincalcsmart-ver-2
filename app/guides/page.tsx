import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Calculator, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Financial Guides',
  description: 'Plain-language guides to understand mortgages, investing, retirement, and more — paired with free financial calculators for Canada and the USA.',
};

/* ── Illustrations ─────────────────────────────────────────── */

function AffordabilitySnapshot() {
  return (
    <svg width="100%" viewBox="0 0 240 192" fill="none" aria-hidden style={{ maxWidth: 256 }}>
      <defs>
        <clipPath id="barClip">
          <rect x="0" y="142" width="240" height="12" rx="6" />
        </clipPath>
      </defs>

      {/* Title */}
      <text x="0" y="14" fontSize="8.5" fontWeight="700" fill="#1DB584" letterSpacing="0.07em">
        AFFORDABILITY SNAPSHOT
      </text>

      {/* Row 1 — Home price / Down payment */}
      <text x="0"   y="36" fontSize="9" fill="rgba(13,27,42,0.62)">Home price</text>
      <text x="128" y="36" fontSize="9" fill="rgba(13,27,42,0.62)">Down payment</text>
      <text x="0"   y="53" fontSize="15" fontWeight="700" fill="#0D1B2A">CA$650,000</text>
      <text x="128" y="53" fontSize="15" fontWeight="700" fill="#1DB584">CA$130,000</text>
      {/* 20% down pill */}
      <rect x="128" y="59" width="50" height="14" rx="7" fill="rgba(29,181,132,0.13)" />
      <text x="153" y="70" textAnchor="middle" fontSize="9" fontWeight="600" fill="#1DB584">20% down</text>

      {/* Row 2 — Est. mortgage / Monthly payment */}
      <text x="0"   y="92" fontSize="9" fill="rgba(13,27,42,0.62)">Est. mortgage</text>
      <text x="128" y="92" fontSize="9" fill="rgba(13,27,42,0.62)">Est. monthly payment</text>
      <text x="0"   y="109" fontSize="15" fontWeight="700" fill="#0D1B2A">CA$520,000</text>
      <text x="128" y="112" fontSize="18" fontWeight="800" fill="#0D1B2A">CA$3,040</text>

      {/* Divider */}
      <line x1="0" y1="124" x2="240" y2="124" stroke="rgba(13,27,42,0.08)" strokeWidth="1" />

      {/* Bar label */}
      <text x="0" y="138" fontSize="8" fill="rgba(13,27,42,0.60)">Qualifying range</text>

      {/* Affordability bar — clipped segments */}
      <g clipPath="url(#barClip)">
        <rect x="0"   y="142" width="240" height="12" fill="rgba(13,27,42,0.08)" />
        <rect x="0"   y="142" width="132" height="12" fill="#1DB584" />
        <rect x="132" y="142" width="48"  height="12" fill="#C9A84C" />
      </g>

      {/* Current position marker — 45% */}
      <circle cx="108" cy="148" r="6" fill="white" stroke="#1DB584" strokeWidth="2" />

      {/* Stress test dashed marker */}
      <line x1="168" y1="136" x2="168" y2="157"
        stroke="#C9A84C" strokeWidth="1.5" strokeDasharray="2.5 1.5" strokeLinecap="round" />

      {/* Bar axis labels */}
      <text x="0"   y="170" fontSize="8" fill="#1DB584" fontWeight="600">Qualifying</text>
      <text x="155" y="170" textAnchor="middle" fontSize="8" fill="#C9A84C" fontWeight="600">Stress test</text>
      <text x="240" y="170" textAnchor="end" fontSize="8" fill="rgba(13,27,42,0.52)">Limit</text>

      {/* Footnote */}
      <text x="0" y="185" fontSize="7.5" fill="rgba(13,27,42,0.44)">
        5.19% rate · 25yr amortization · CA region · Illustrative estimate
      </text>
    </svg>
  );
}

function EmergencyFundIllustration() {
  return (
    <svg width="160" height="110" viewBox="0 0 160 110" fill="none" aria-hidden>
      {/* Track */}
      <path d="M 18 90 A 62 62 0 0 1 142 90"
        stroke="rgba(13,27,42,0.09)" strokeWidth="12" strokeLinecap="round" fill="none" />
      {/* Progress — ~65% of arc */}
      <path d="M 18 90 A 62 62 0 0 1 120 38"
        stroke="#1DB584" strokeWidth="12" strokeLinecap="round" fill="none" />
      {/* Center values */}
      <text x="80" y="76" textAnchor="middle" fontSize="20"
        fill="#0D1B2A" fontWeight="700">4.2</text>
      <text x="80" y="90" textAnchor="middle" fontSize="8"
        fill="rgba(13,27,42,0.45)">months covered</text>
      {/* Labels */}
      <text x="12" y="106" fontSize="8" fill="rgba(13,27,42,0.38)">0 mo</text>
      <text x="108" y="106" fontSize="8" fill="rgba(13,27,42,0.38)">6 mo target</text>
      {/* Target dot */}
      <circle cx="142" cy="90" r="4.5"
        fill="rgba(13,27,42,0.10)" stroke="rgba(13,27,42,0.22)" strokeWidth="1" />
    </svg>
  );
}

function CompoundInterestIllustration() {
  return (
    <svg width="180" height="110" viewBox="0 0 180 110" fill="none" aria-hidden>
      {/* Area fill */}
      <path d="M 14 94 C 40 92, 60 86, 80 74 S 122 46, 166 14 L 166 98 Z"
        fill="rgba(29,181,132,0.08)" />
      {/* Growth line */}
      <path d="M 14 94 C 40 92, 60 86, 80 74 S 122 46, 166 14"
        stroke="#1DB584" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Dots */}
      <circle cx="14"  cy="94" r="3.5" fill="#1DB584" />
      <circle cx="60"  cy="85" r="3.5" fill="#1DB584" />
      <circle cx="112" cy="58" r="3.5" fill="#1DB584" />
      <circle cx="166" cy="14" r="3.5" fill="#1DB584" />
      {/* X-axis labels */}
      <text x="14"  y="108" textAnchor="middle" fontSize="7.5" fill="rgba(13,27,42,0.40)">Y1</text>
      <text x="60"  y="108" textAnchor="middle" fontSize="7.5" fill="rgba(13,27,42,0.40)">Y5</text>
      <text x="112" y="108" textAnchor="middle" fontSize="7.5" fill="rgba(13,27,42,0.40)">Y15</text>
      <text x="166" y="108" textAnchor="middle" fontSize="7.5" fill="rgba(13,27,42,0.40)">Y30</text>
      {/* Value callout */}
      <rect x="128" y="5" width="52" height="17" rx="3"
        fill="rgba(29,181,132,0.12)" />
      <text x="154" y="17" textAnchor="middle" fontSize="8.5"
        fill="#0F6E56" fontWeight="600">×5.7 growth</text>
    </svg>
  );
}

function RetirementIllustration() {
  const bars = [10, 16, 24, 34, 44, 54, 62] as const;
  return (
    <svg width="180" height="110" viewBox="0 0 180 110" fill="none" aria-hidden>
      {/* Goal dashed line */}
      <line x1="14" y1="20" x2="154" y2="20"
        stroke="rgba(13,27,42,0.18)" strokeWidth="1" strokeDasharray="3 2" />
      {/* Bars */}
      {bars.map((h, i) => (
        <rect key={i} x={14 + i * 20} y={82 - h} width={13} height={h} rx="2"
          fill={i < 5 ? 'rgba(29,181,132,0.28)' : '#1DB584'} />
      ))}
      {/* Goal flag pole */}
      <line x1="154" y1="20" x2="154" y2="82"
        stroke="rgba(13,27,42,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Flag triangle */}
      <path d="M 154 20 L 172 26 L 154 32 Z" fill="#1DB584" />
      <text x="154" y="14" textAnchor="middle" fontSize="7.5"
        fill="#1DB584" fontWeight="600">Goal</text>
      {/* Timeline base */}
      <line x1="14" y1="82" x2="166" y2="82"
        stroke="rgba(13,27,42,0.14)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Age labels */}
      <text x="14"  y="96" fontSize="7.5" fill="rgba(13,27,42,0.40)">Age 35</text>
      <text x="116" y="96" fontSize="7.5" fill="rgba(13,27,42,0.40)">Age 65</text>
    </svg>
  );
}

/* ── Data ──────────────────────────────────────────────────── */

const GUIDES = [
  {
    category: 'Financial Planning',
    categoryColor: '#185FA5',
    categoryBg: 'rgba(42,90,132,0.10)',
    title: 'How to Build an Emergency Fund',
    summary:
      'Why three to six months of expenses is the target, how to calculate your coverage number, and the fastest path to reach it.',
    readTime: '6 min read',
    href: '/guides/emergency-fund',
    calcHref: '/emergency-fund-calculator',
    calcLabel: 'Emergency Fund Calculator',
    Illustration: EmergencyFundIllustration,
  },
  {
    category: 'Investing',
    categoryColor: '#0369a1',
    categoryBg: 'rgba(14,165,233,0.10)',
    title: 'How Compound Interest Works',
    summary:
      'Why time in the market matters more than timing, and how the compounding curve accelerates growth over decades.',
    readTime: '5 min read',
    href: '/guides/compound-interest',
    calcHref: '/compound-interest-calculator',
    calcLabel: 'Compound Interest Calculator',
    Illustration: CompoundInterestIllustration,
  },
  {
    category: 'Retirement',
    categoryColor: '#C2410C',
    categoryBg: 'rgba(234,88,12,0.10)',
    title: 'How Much Do I Need to Retire?',
    summary:
      'Learn how retirement goals, time horizon, contributions, and expected returns affect the amount you may need to save.',
    readTime: '7 min read',
    href: '/guides/how-much-to-retire',
    calcHref: '/retirement-planning-calculator',
    calcLabel: 'Retirement Savings Calculator',
    Illustration: RetirementIllustration,
  },
];

const STEPS = [
  { Icon: BookOpen,   label: 'Learn the concept',          sub: 'Read the guide'           },
  { Icon: Calculator, label: 'Run the numbers',            sub: 'Use the calculator'        },
  { Icon: Sparkles,   label: 'Review AI-assisted insights', sub: 'Understand your result'   },
];

/* ── Page ──────────────────────────────────────────────────── */

export default function GuidesPage() {
  return (
    <div>

      {/* ── LIGHT TOP REGION: behind nav → bottom of 3 guide cards ── */}
      <div className="relative overflow-x-clip" style={{ marginTop: '-80px' }}>
        {/* Gradient — starts behind nav (top:0 of this wrapper) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(145deg, #E4F5EE 0%, #EFF9F5 18%, #F8FDFB 38%, #FFFFFF 52%, #F2F1FD 72%, #EEE8F9 88%, #F5EEF7 100%)' }}
          aria-hidden
        />
        {/* Left teal glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 8% 20%, rgba(29,181,132,0.18) 0%, rgba(29,181,132,0.06) 45%, transparent 68%)' }}
          aria-hidden
        />
        {/* Right lavender glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 85% 18%, rgba(109,99,236,0.10) 0%, rgba(139,92,246,0.05) 40%, transparent 65%)' }}
          aria-hidden
        />

        {/* Content sits below nav (z-10 over gradient layers) */}
        <div className="relative z-10" style={{ paddingTop: '80px' }}>

      {/* ── HERO ── */}
      <section>
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-6 sm:pt-12 sm:pb-8 lg:pt-16 lg:pb-10">
          <h1
            className="font-extrabold text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.12] lg:whitespace-nowrap"
            style={{ color: '#0D1B2A', letterSpacing: '-0.6px' }}
          >
            Clear financial guidance for everyday decisions
          </h1>
          <p
            className="mt-3 text-[15px] sm:text-base leading-relaxed"
            style={{ color: 'rgba(13,27,42,0.55)' }}
          >
            Plain-language explanations of the concepts behind your calculations — for Canada and the USA.
          </p>
        </div>
      </section>

      {/* ── FEATURED GUIDE — Mortgage Affordability ── */}
      <section style={{ background: 'transparent' }}>
        <div className="mx-auto max-w-6xl px-4 pb-5 sm:pb-6 lg:pb-7">
          <div
            className="rounded-brand-xl bg-white overflow-hidden"
            style={{ border: '1px solid rgba(15,41,66,0.08)', boxShadow: '0 4px 24px rgba(13,27,42,0.07)' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] lg:grid-cols-3">

              {/* Copy — 2/3 */}
              <div className="p-5 sm:p-8 lg:col-span-2 lg:p-10">
                <div className="flex items-center gap-3 mb-3 sm:mb-5">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(29,181,132,0.12)', color: '#1DB584' }}
                  >
                    Mortgage
                  </span>
                  <span className="text-[12px]" style={{ color: 'rgba(13,27,42,0.58)' }}>
                    8 min read
                  </span>
                </div>
                <h2
                  className="font-extrabold text-2xl sm:text-3xl leading-snug mb-2 sm:mb-4"
                  style={{ color: '#0D1B2A', letterSpacing: '-0.4px' }}
                >
                  The complete mortgage affordability guide
                </h2>
                <p
                  className="text-[15px] leading-relaxed mb-4 sm:mb-7"
                  style={{ color: 'rgba(13,27,42,0.58)', maxWidth: '480px' }}
                >
                  How lenders calculate what you can borrow, how the stress test works, and what
                  levers actually move your qualifying number — explained without jargon.
                </p>
                <div className="flex flex-row flex-wrap items-center gap-3 sm:gap-4">
                  <Link
                    href="/guides/mortgage-affordability"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: '#1DB584' }}
                  >
                    Read guide <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <p className="text-[13px]" style={{ color: 'rgba(13,27,42,0.45)' }}>
                    Then try:{' '}
                    <Link
                      href="/mortgage-qualifier-calculator"
                      className="font-semibold transition-opacity hover:opacity-75"
                      style={{ color: '#1DB584' }}
                    >
                      Mortgage Qualifier Calculator →
                    </Link>
                  </p>
                </div>
              </div>

              {/* Illustration — 1/3 */}
              <div
                className="flex items-center justify-center p-4 sm:p-8 lg:p-12"
                style={{ background: '#F4F8FC' }}
              >
                <AffordabilitySnapshot />
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── 3-CARD GUIDE GRID ── */}
      <section>
        <div className="mx-auto max-w-6xl px-4 pb-8 sm:pb-10 lg:pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
            {GUIDES.map(({ category, categoryColor, categoryBg, title, summary, readTime, href, calcHref, calcLabel, Illustration }) => (
              <div
                key={title}
                className="rounded-brand-xl bg-white overflow-hidden flex flex-col"
                style={{ border: '1px solid rgba(15,41,66,0.08)', boxShadow: '0 2px 12px rgba(13,27,42,0.06)' }}
              >
                {/* Illustration strip */}
                <div
                  className="flex items-center justify-center py-6 px-4"
                  style={{ background: '#F4F8FC', minHeight: '132px' }}
                >
                  <Illustration />
                </div>

                {/* Card body */}
                <div className="p-5 sm:p-6 flex flex-col flex-1 gap-3">
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                      style={{ background: categoryBg, color: categoryColor }}
                    >
                      {category}
                    </span>
                    <span className="text-[11px]" style={{ color: 'rgba(13,27,42,0.56)' }}>
                      {readTime}
                    </span>
                  </div>
                  <h3
                    className="font-extrabold text-[16px] leading-snug"
                    style={{ color: '#0D1B2A' }}
                  >
                    {title}
                  </h3>
                  <p
                    className="text-[13.5px] leading-relaxed flex-1"
                    style={{ color: 'rgba(13,27,42,0.68)' }}
                  >
                    {summary}
                  </p>
                  <div className="pt-1 flex flex-col gap-2">
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-70"
                      style={{ color: '#1DB584' }}
                    >
                      Read guide <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <Link
                      href={calcHref}
                      className="text-[11.5px] transition-opacity hover:opacity-70"
                      style={{ color: 'rgba(13,27,42,0.58)' }}
                    >
                      Try: {calcLabel} →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

        </div>{/* end z-10 content wrapper */}
      </div>{/* end light top region */}

      {/* ── LEARNING JOURNEY STRIP ── */}
      <section style={{ background: 'linear-gradient(160deg, #091523 0%, #0D1B2A 45%, #0A1628 100%)' }}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 lg:py-24">
          <div
            className="rounded-brand-xl px-10 py-14 sm:px-14 sm:py-16"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-0">
              {STEPS.map(({ Icon, label, sub }, i) => (
                <div key={label} className="flex flex-col sm:flex-row items-center gap-10 sm:gap-0 w-full sm:flex-1 lg:flex-none lg:w-auto">
                  <div className="flex items-center gap-6 w-full sm:w-full sm:flex-col sm:items-center sm:gap-4 lg:flex-row lg:items-center lg:gap-6 lg:w-auto">
                    <div
                      className="flex items-center justify-center rounded-full w-16 h-16 flex-shrink-0"
                      style={{ background: 'rgba(29,181,132,0.16)' }}
                    >
                      <Icon className="h-8 w-8" style={{ color: '#1DB584' }} aria-hidden />
                    </div>
                    <div className="sm:text-center lg:text-left">
                      <p className="text-[16px] font-bold text-white leading-snug mb-2">
                        {label}
                      </p>
                      <p className="text-[13.5px]" style={{ color: 'rgba(255,255,255,0.52)' }}>
                        {sub}
                      </p>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="hidden sm:flex items-center justify-center mx-4 lg:mx-12 flex-shrink-0" aria-hidden>
                      <ArrowRight className="h-5 w-5" style={{ color: '#1DB584', opacity: 0.55 }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ background: 'linear-gradient(160deg, #091523 0%, #0D1B2A 45%, #0A1628 100%)' }}>
        <div
          className="mx-auto max-w-6xl px-4 py-20 sm:py-24 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h2
            className="font-extrabold text-2xl sm:text-3xl text-white mb-4"
            style={{ letterSpacing: '-0.3px' }}
          >
            Ready to see your numbers?
          </h2>
          <p
            className="text-[15px] leading-relaxed mb-8"
            style={{ color: 'rgba(255,255,255,0.52)' }}
          >
            Free calculators for mortgages, investing, retirement, and more — for Canada and the USA.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/calculators"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#1DB584' }}
            >
              Explore All Calculators <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/ai-insights"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.78)' }}
            >
              View AI Insights
            </Link>
          </div>
          <p className="mt-8 text-[12px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
            Educational estimates only · Not financial advice · Canada & USA
          </p>
        </div>
      </section>

    </div>
  );
}
