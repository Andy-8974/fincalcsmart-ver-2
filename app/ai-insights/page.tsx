import type { Metadata } from 'next';
import Link from 'next/link';
import { Wallet, Percent, CalendarDays, Check, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI-Assisted Financial Insights',
  description:
    'See how FinCalc Smart calculators combine instant results, visual breakdowns, and AI-assisted insights to help you understand mortgages, savings, retirement, taxes, and investing — free, no sign-up, Canada & USA.',
};

// Animation classes (.ais-line-draw, .ais-insight-card, .ais-cta-outline)
// are defined in app/globals.css

/* ─────────────────────────────────────────────
   SVG helpers — Section 3 cards
───────────────────────────────────────────── */
function ArcGauge({ score, size = 72 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = size * 0.1;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={strokeW} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1DB584" strokeWidth={strokeW}
        strokeDasharray={`${filled} ${circumference - filled}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={size * 0.2} fontWeight="700">{score}</text>
    </svg>
  );
}

function SemiGauge({ pct, size = 72 }: { pct: number; size?: number }) {
  const r = size * 0.4;
  const cx = size / 2;
  const cy = size * 0.62;
  const strokeW = size * 0.1;
  const halfCirc = Math.PI * r;
  const filled = (pct / 100) * halfCirc;
  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={strokeW} strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#1DB584" strokeWidth={strokeW} strokeLinecap="round"
        strokeDasharray={`${filled} ${halfCirc - filled}`} />
      <text x={cx} y={cy - size * 0.06} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={size * 0.22} fontWeight="700">{pct}%</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Hero mockup SVG sub-components
───────────────────────────────────────────── */

/** 4-segment donut: P&I, Tax, Insurance, PMI */
function MockupDonut() {
  const size = 156; const cx = 78; const r = 54;
  const circ = 2 * Math.PI * r; const GAP = 3.5;
  const segments = [
    { label: 'P&I',       pct: 67, color: '#1DB584'                },
    { label: 'Tax',       pct: 17, color: '#1F4268'                },
    { label: 'Insurance', pct:  8, color: '#4A90D9'                },
    { label: 'PMI',       pct:  8, color: 'rgba(255,255,255,0.22)' },
  ];
  let cumFrac = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="13" />
      {segments.map((seg) => {
        const segLen = Math.max(0, (seg.pct / 100) * circ - GAP);
        const dashOffset = -(cumFrac * circ);
        cumFrac += seg.pct / 100;
        return (
          <circle key={seg.label} cx={cx} cy={cx} r={r} fill="none"
            stroke={seg.color} strokeWidth="13" strokeLinecap="butt"
            strokeDasharray={`${segLen.toFixed(2)} ${circ.toFixed(2)}`}
            strokeDashoffset={dashOffset.toFixed(2)}
            transform={`rotate(-90 ${cx} ${cx})`} />
        );
      })}
      <text x={cx} y={cx - 4} textAnchor="middle"
        style={{ fontSize: 19, fontWeight: 800, fill: 'white', letterSpacing: -0.5 }}>$3,847</text>
      <text x={cx} y={cx + 15} textAnchor="middle"
        style={{ fontSize: 10, fill: 'rgba(255,255,255,0.42)', letterSpacing: 0.3 }}>per month</text>
    </svg>
  );
}

/** Grouped bar chart — standard vs extra-payments, 6 year groups, Y-axis labels, white line overlay */
function MockupInterestBarChart() {
  const bottom = 103; const chartLeft = 30; const chartRight = 198;
  const maxVal = 60000;
  const maxH = 85;
  const toY = (v: number) => bottom - (v / maxVal) * maxH;
  const groups = [
    { yr: '5',  std: 28000, extra: 18000 },
    { yr: '10', std: 42000, extra: 28000 },
    { yr: '15', std: 52000, extra: 36000 },
    { yr: '20', std: 58000, extra: 44000 },
    { yr: '25', std: 62000, extra: 50000 },
    { yr: '30', std: 65000, extra: 53000 },
  ];
  const groupW = (chartRight - chartLeft) / 6;
  const centers = groups.map((_, i) => chartLeft + groupW * i + groupW / 2);
  const bw = 8; const gap = 2;

  // White line along standard bar tops (center-x of std bar)
  const stdPts = groups.map((g, i) => [centers[i] - gap / 2 - bw / 2, toY(g.std)] as [number, number]);
  const linePath = stdPts.map(([x, y], i) => {
    if (i === 0) return `M ${x},${y}`;
    const [px, py] = stdPts[i - 1];
    const mx = (px + x) / 2;
    return `C ${mx},${py} ${mx},${y} ${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" viewBox="0 -10 200 132" preserveAspectRatio="xMidYMid meet" aria-hidden>
      {/* Y-axis grid lines + labels */}
      {[0, 20000, 40000, 60000].map((v) => (
        <g key={v}>
          <line x1={chartLeft} y1={toY(v)} x2={chartRight} y2={toY(v)}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <text x={chartLeft - 3} y={toY(v) + 1} textAnchor="end"
            fill="rgba(255,255,255,0.28)" fontSize="5.5">
            {v === 0 ? '$0' : `$${v / 1000}K`}
          </text>
        </g>
      ))}
      {/* Baseline */}
      <line x1={chartLeft} y1={bottom} x2={chartRight} y2={bottom}
        stroke="rgba(255,255,255,0.14)" strokeWidth={1} />

      {/* Grouped bars */}
      {groups.map((g, i) => {
        const c = centers[i];
        const stdX = c - gap / 2 - bw;
        const extraX = c + gap / 2;
        const delay = `${0.1 + i * 0.07}s`;
        return (
          <g key={g.yr}>
            <rect x={stdX} y={toY(g.std)} width={bw} height={bottom - toY(g.std)}
              rx={1.5} fill="rgba(255,255,255,0.20)"
              className="ais-bar-rise" style={{ animationDelay: delay }} />
            <rect x={extraX} y={toY(g.extra)} width={bw} height={bottom - toY(g.extra)}
              rx={1.5} fill="rgba(29,181,132,0.68)"
              className="ais-bar-rise" style={{ animationDelay: `${parseFloat(delay) + 0.04}s` }} />
            <text x={c} y={bottom + 9} textAnchor="middle"
              fill="rgba(255,255,255,0.28)" fontSize="5.5">{g.yr}</text>
          </g>
        );
      })}
      {/* "yr" label */}
      <text x={chartRight + 1} y={bottom + 9} fill="rgba(255,255,255,0.22)" fontSize="5">yr</text>

      {/* White standard line overlay */}
      <path d={linePath} fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"
        pathLength="1" className="ais-line-draw" />

      {/* Callout — top-right, flush to chart right edge */}
      <rect x={145} y={-8} width={53} height={26} rx={4}
        fill="white" stroke="rgba(13,27,42,0.08)" strokeWidth={0.5} />
      <text x={171} y={2} textAnchor="middle" fill="rgba(13,27,42,0.45)" fontSize="5.5" fontWeight="600">You could save</text>
      <text x={171} y={13} textAnchor="middle" fill="#1DB584" fontSize="10" fontWeight="800">$28,400</text>
    </svg>
  );
}

/** Arc ring with 74/100 text inside — Health Score card */
function HealthScoreGauge() {
  const score = 74; const r = 37; const cx = 51; const cy = 51; const sw = 8;
  const circ   = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <svg width={102} height={102} viewBox="0 0 102 102">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(29,181,132,0.13)" strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1DB584" strokeWidth={sw}
        strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
        fill="#0D1B2A" fontSize="22" fontWeight="800">74</text>
      <text x={cx} y={cy + 14} textAnchor="middle"
        fill="rgba(13,27,42,0.38)" fontSize="9">/100</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Insight example cards data (Section 3)
───────────────────────────────────────────── */
const INSIGHT_CARDS = [
  {
    calc: 'Mortgage Calculator',
    category: 'Mortgage',
    insight: 'Mortgage Health Score',
    result: '74 / 100 · Good',
    sub: 'Based on rate, down payment, and estimated affordability.',
    href: '/canadian-mortgage-calculator',
    gauge: <ArcGauge score={74} />,
  },
  {
    calc: 'Savings Goal Calculator',
    category: 'Financial Planning',
    insight: 'Goal Readiness Score',
    result: '89% of way to goal',
    sub: 'CA$10,000 target · on track in approximately 34 months.',
    href: '/savings-goal-calculator',
    gauge: <SemiGauge pct={89} />,
  },
  {
    calc: 'Retirement Withdrawal Calculator',
    category: 'Retirement',
    insight: 'Withdrawal Pressure Score',
    result: '38 / 100 · Sustainable',
    sub: 'Savings projected to last until approximately age 82.',
    href: '/retirement-withdrawal-calculator',
    gauge: <ArcGauge score={38} />,
  },
  {
    calc: 'Income Tax Calculator',
    category: 'Tax & Salary',
    insight: 'Take-Home Clarity Score',
    result: '63 / 100',
    sub: 'Effective rate 24.5% · Monthly take-home CA$5,031.',
    href: '/income-tax-calculator',
    gauge: <ArcGauge score={63} />,
  },
] as const;

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function AIInsightsPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ marginTop: '-80px', paddingTop: '80px' }}>

        {/* ── SECTION 1 — Hero ── */}
        <section
          style={{
            background: [
              'radial-gradient(ellipse 800px 600px at top center, rgba(29,181,132,0.07) 0%, transparent 70%)',
              'radial-gradient(ellipse 500px 400px at top right, rgba(14,165,233,0.05) 0%, transparent 100%)',
              'linear-gradient(180deg, #f3f7fd 0px, #f5f8fd 400px, #F8FAFB 700px)',
            ].join(', '),
          }}
        >
          <div className="mx-auto max-w-6xl px-4 pt-6 pb-4 sm:pt-10 sm:pb-6 lg:pt-14 lg:pb-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-14">

              {/* Mockup — 2nd on mobile (order-last), 1st on desktop (lg:order-first) */}
              <div className="w-full lg:w-[58%] flex-shrink-0 relative order-last lg:order-first" style={{ paddingBottom: '20rem' }}>
                <ProductMockup />

                {/* Floating Mortgage Health Score card */}
                <div
                  className="ais-insight-card ais-fade-up hidden sm:block absolute z-10 bg-white rounded-2xl p-3"
                  style={{
                    bottom: '255px',
                    right: '-12px',
                    boxShadow: '0 8px 40px rgba(13,27,42,0.14)',
                    border: '1px solid rgba(15,41,66,0.08)',
                    width: 268,
                  }}
                >
                  <p className="text-[10px] font-bold mb-0.5" style={{ color: '#1DB584' }}>
                    ✦ AI-assisted analysis
                  </p>
                  <p className="text-[13px] font-extrabold mb-2" style={{ color: '#0D1B2A' }}>
                    Mortgage Health Score
                  </p>
                  {/* Gauge row */}
                  <div className="flex items-center gap-3 mb-2">
                    <HealthScoreGauge />
                    <div>
                      <p className="text-[22px] font-extrabold leading-none mb-1" style={{ color: '#1DB584' }}>Good</p>
                      <p className="text-[10px] leading-snug" style={{ color: 'rgba(13,27,42,0.52)', maxWidth: 130 }}>
                        You&apos;re in a strong position. Small optimizations could improve your outcome even more.
                      </p>
                    </div>
                  </div>
                  {/* Footer row */}
                  <div className="flex items-center justify-between pt-2"
                    style={{ borderTop: '1px solid rgba(13,27,42,0.07)' }}>
                    <div className="flex items-center gap-1.5">
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                        <path d="M5.5 1L1 3v2.75c0 2.3 1.75 4.4 4.5 5C8.25 10.15 10 8.05 10 5.75V3L5.5 1z"
                          stroke="rgba(13,27,42,0.35)" strokeWidth="0.9" strokeLinejoin="round"/>
                      </svg>
                      <div>
                        <p className="text-[9px] font-semibold" style={{ color: 'rgba(13,27,42,0.45)' }}>Based on your inputs</p>
                        <p className="text-[8.5px]" style={{ color: 'rgba(13,27,42,0.30)' }}>Updated just now</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(29,181,132,0.10)', color: '#1DB584', border: '1px solid rgba(29,181,132,0.20)' }}>
                      See key factors →
                    </span>
                  </div>
                </div>
              </div>

              {/* Copy — 1st on mobile (order-first), 2nd on desktop (lg:order-last) */}
              <div className="w-full lg:w-[42%] order-first lg:order-last lg:pt-16" style={{ alignSelf: 'flex-start' }}>
                <CopyBlock />
              </div>

            </div>
          </div>
        </section>

        {/* ── SECTION 2 — Calculate → Analyze → Decide ── */}
        <section style={{ background: 'linear-gradient(160deg, #091523 0%, #0D1B2A 45%, #0A1628 100%)', marginTop: '-190px', position: 'relative', zIndex: 1 }}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 lg:py-24">

            <div className="text-center mb-12 sm:mb-14">
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#1DB584' }}>
                How It Works
              </p>
              <h2 className="font-extrabold text-xl sm:text-4xl text-white" style={{ letterSpacing: '-0.5px' }}>
                Calculate{' '}
                <span style={{ color: '#1DB584' }}>→</span>
                {' '}Analyze{' '}
                <span style={{ color: '#1DB584' }}>→</span>
                {' '}Decide
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 mb-8 sm:mb-10">

              {/* Card 1 — Calculate */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 flex flex-col gap-5 sm:gap-6"
                style={{ boxShadow: '0 8px 40px rgba(13,27,42,0.18)' }}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(29,181,132,0.12)', color: '#1DB584' }}>01</span>
                  <p className="font-extrabold text-xl" style={{ color: '#0D1B2A' }}>Calculate</p>
                </div>
                <p className="text-[13px] leading-relaxed -mt-3" style={{ color: 'rgba(13,27,42,0.52)' }}>
                  Enter your details and get instant results.
                </p>
                {/* Input rows */}
                <div className="flex flex-col gap-3">
                  {([
                    { icon: <Wallet size={14} />, label: 'Loan Amount',  value: 'CA$450,000' },
                    { icon: <Percent size={14} />, label: 'Rate',         value: '5.25%'      },
                    { icon: <CalendarDays size={14} />, label: 'Amortization', value: '25 yrs' },
                  ] as const).map(({ icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl px-4 py-3"
                      style={{ background: '#F4F7FA', border: '1px solid #E4EBF3' }}>
                      <span className="flex items-center justify-center rounded-lg shrink-0"
                        style={{ width: 30, height: 30, background: 'rgba(29,181,132,0.10)', color: '#1DB584' }}>
                        {icon}
                      </span>
                      <span className="flex-1 text-[13px] font-medium" style={{ color: 'rgba(13,27,42,0.55)' }}>{label}</span>
                      <span className="text-[13px] font-bold tabular-nums" style={{ color: '#0D1B2A' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2 — Analyze */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 flex flex-col gap-5 sm:gap-6"
                style={{ boxShadow: '0 8px 40px rgba(13,27,42,0.18)' }}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(29,181,132,0.12)', color: '#1DB584' }}>02</span>
                  <p className="font-extrabold text-xl" style={{ color: '#0D1B2A' }}>Analyze</p>
                </div>
                <p className="text-[13px] leading-relaxed -mt-3" style={{ color: 'rgba(13,27,42,0.52)' }}>
                  See visual breakdowns and AI-assisted scoring.
                </p>
                {/* Gauge + bar chart — stacked on mobile, side-by-side on sm+ */}
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  {/* Donut gauge */}
                  <div className="flex flex-col items-center shrink-0">
                    <svg width={108} height={108} viewBox="0 0 108 108" aria-hidden>
                      <circle cx={54} cy={54} r={40} fill="none" stroke="rgba(13,27,42,0.07)" strokeWidth={11} />
                      <circle cx={54} cy={54} r={40} fill="none" stroke="#0D1B2A" strokeWidth={11}
                        strokeDasharray={`${0.26 * 2 * Math.PI * 40} ${0.74 * 2 * Math.PI * 40}`}
                        strokeLinecap="butt" transform="rotate(-90 54 54)"
                        strokeDashoffset={`${-0.74 * 2 * Math.PI * 40}`} />
                      <circle cx={54} cy={54} r={40} fill="none" stroke="#1DB584" strokeWidth={11}
                        strokeDasharray={`${0.74 * 2 * Math.PI * 40} ${0.26 * 2 * Math.PI * 40}`}
                        strokeLinecap="butt" transform="rotate(-90 54 54)" />
                      <text x={54} y={48} textAnchor="middle" dominantBaseline="middle"
                        fill="#0D1B2A" fontSize="22" fontWeight="800">74</text>
                      <text x={54} y={63} textAnchor="middle" fill="rgba(13,27,42,0.38)" fontSize="9">/100</text>
                      <text x={54} y={74} textAnchor="middle" fill="rgba(13,27,42,0.38)" fontSize="8">Health Score</text>
                    </svg>
                    <p className="text-[13px] font-extrabold -mt-1" style={{ color: '#1DB584' }}>Good</p>
                  </div>
                  {/* Bar chart */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold mb-2" style={{ color: 'rgba(13,27,42,0.40)' }}>Total Interest Over Time</p>
                    <svg width="100%" viewBox="0 0 130 90" preserveAspectRatio="xMidYMid meet" aria-hidden>
                      {/* Y grid */}
                      {[0,20,40,60].map((v, gi) => {
                        const y = 70 - (v / 60) * 60;
                        return (
                          <g key={v}>
                            <line x1={18} y1={y} x2={128} y2={y} stroke="rgba(13,27,42,0.06)" strokeWidth={0.8} />
                            <text x={14} y={y+1} textAnchor="end" fill="rgba(13,27,42,0.30)" fontSize="5.5">{v===0?'$0':`$${v}k`}</text>
                          </g>
                        );
                      })}
                      <line x1={18} y1={70} x2={128} y2={70} stroke="rgba(13,27,42,0.12)" strokeWidth={0.8} />
                      {/* Bars */}
                      {([
                        { yr:'5',  std:28, opt:18 },
                        { yr:'10', std:42, opt:28 },
                        { yr:'15', std:52, opt:36 },
                        { yr:'20', std:58, opt:44 },
                        { yr:'25', std:62, opt:50 },
                      ] as const).map((g, i) => {
                        const cx = 26 + i * 22;
                        const stdH = (g.std/60)*60; const optH = (g.opt/60)*60;
                        return (
                          <g key={g.yr}>
                            <rect x={cx-7} y={70-stdH} width={6} height={stdH} rx={1} fill="#0D1B2A" />
                            <rect x={cx+1} y={70-optH} width={6} height={optH} rx={1} fill="#1DB584" opacity={0.80} />
                            <text x={cx} y={78} textAnchor="middle" fill="rgba(13,27,42,0.35)" fontSize="5.5">
                              {i===0?`Year ${g.yr}`:g.yr}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                    {/* Legend */}
                    <div className="flex gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#0D1B2A' }} />
                        <span className="text-[9px]" style={{ color: 'rgba(13,27,42,0.45)' }}>Current Plan</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#1DB584', opacity: 0.8 }} />
                        <span className="text-[9px]" style={{ color: 'rgba(13,27,42,0.45)' }}>Optimized Plan</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3 — Decide */}
              <div className="bg-white rounded-2xl p-5 sm:p-7 flex flex-col gap-5 sm:gap-6"
                style={{ boxShadow: '0 8px 40px rgba(13,27,42,0.18)' }}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(29,181,132,0.12)', color: '#1DB584' }}>03</span>
                  <p className="font-extrabold text-xl" style={{ color: '#0D1B2A' }}>Decide</p>
                </div>
                <p className="text-[13px] leading-relaxed -mt-3" style={{ color: 'rgba(13,27,42,0.52)' }}>
                  Spot the next best move clearly.
                </p>
                {/* Result panel */}
                <div className="rounded-xl px-5 py-5 flex flex-col gap-4"
                  style={{ background: '#F4F7FA', border: '1px solid #E4EBF3' }}>
                  {/* Header row */}
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center rounded-full shrink-0 mt-0.5"
                      style={{ width: 28, height: 28, background: '#1DB584', color: 'white' }}>
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                    <div>
                      <p className="text-[12px] font-extrabold" style={{ color: '#1DB584' }}>Smart Optimization Found</p>
                      <p className="text-[12px] mt-0.5" style={{ color: 'rgba(13,27,42,0.55)' }}>Increase your payment to</p>
                      <p className="text-[16px] font-extrabold" style={{ color: '#0D1B2A' }}>CA$1,650/mo</p>
                    </div>
                  </div>
                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2 pt-3 items-end" style={{ borderTop: '1px solid #DDE4EE' }}>
                    {[
                      { label: 'Total Interest Saved', value: 'CA$28,400', color: '#1DB584' },
                      { label: 'Payoff Faster By',      value: '2 years',   color: '#1DB584' },
                      { label: 'New Payoff Date',        value: 'Aug 2030',  color: '#F59E0B' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex flex-col justify-end">
                        <p className="text-[9px] leading-tight mb-1" style={{ color: 'rgba(13,27,42,0.40)' }}>{label}</p>
                        <p className="text-[13px] font-extrabold leading-none" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom summary bar */}
            <div className="rounded-2xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-center sm:text-left"
              style={{ background: 'rgba(13,27,42,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="flex items-center justify-center rounded-full shrink-0"
                style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.08)', color: '#1DB584' }}>
                <Sparkles size={16} />
              </span>
              <span className="text-[15px] sm:text-[18px] font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>One scenario, three steps:</span>
              <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-4">
                <span className="font-bold text-[15px] sm:text-[18px] text-white">Extra CA$150/mo</span>
                <span className="font-bold text-[15px] sm:text-[18px]" style={{ color: 'rgba(255,255,255,0.30)' }}>→</span>
                <span className="font-bold text-[15px] sm:text-[18px]" style={{ color: '#1DB584' }}>CA$28,400 saved</span>
                <span className="font-bold text-[15px] sm:text-[18px]" style={{ color: 'rgba(255,255,255,0.30)' }}>→</span>
                <span className="font-bold text-[15px] sm:text-[18px]" style={{ color: '#1DB584' }}>2 yrs faster payoff</span>
              </div>
            </div>

          </div>
        </section>

        {/* ── SECTION 3 — Real Insights ── */}
        <section id="insight-examples" style={{ background: 'linear-gradient(180deg, #F8FAFB 0%, #f0f4fa 100%)' }}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 lg:py-24">

            <div className="text-center mb-12 sm:mb-14">
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#1DB584' }}>Real Insights</p>
              <h2 className="font-extrabold text-3xl sm:text-4xl mb-3" style={{ color: '#0D1B2A', letterSpacing: '-0.5px' }}>
                What could your numbers reveal?
              </h2>
              <p className="text-[15px] sm:text-[15px]" style={{ color: 'rgba(13,27,42,0.62)' }}>
                AI-assisted insights that help you make smarter financial decisions.
              </p>
            </div>

            {/* 2-column layout: large left + right stack */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">

              {/* ── Featured left card: Mortgage ── */}
              <div className="bg-white rounded-2xl p-7 flex flex-col"
                style={{ border: '1px solid rgba(15,41,66,0.08)', boxShadow: '0 4px 24px rgba(13,27,42,0.08)' }}>
                {/* Category badge */}
                <div className="flex items-center gap-2.5 mb-6">
                  <span className="flex items-center justify-center rounded-xl"
                    style={{ width: 36, height: 36, background: 'rgba(29,181,132,0.10)' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M1.5 7.5 8 2l6.5 5.5V14a.5.5 0 01-.5.5H10V10H6v4.5H2a.5.5 0 01-.5-.5V7.5z"
                        stroke="#1DB584" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>Mortgage</span>
                </div>

                <h3 className="font-extrabold text-2xl leading-tight mb-2" style={{ color: '#0D1B2A', letterSpacing: '-0.3px' }}>
                  Could a small change<br />save you thousands?
                </h3>
                <p className="text-[13px] mb-6" style={{ color: 'rgba(13,27,42,0.50)' }}>
                  See how one extra payment changes your entire mortgage.
                </p>

                {/* 2 stat boxes */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl px-5 py-3" style={{ background: '#F4F7FA', border: '1px solid #E4EBF3' }}>
                    <p className="text-[26px] font-extrabold leading-none mb-1" style={{ color: '#1DB584' }}>$28,400</p>
                    <p className="text-[12px] font-medium" style={{ color: 'rgba(13,27,42,0.45)' }}>saved</p>
                  </div>
                  <div className="rounded-xl px-5 py-3" style={{ background: '#F4F7FA', border: '1px solid #E4EBF3' }}>
                    <p className="text-[26px] font-extrabold leading-none mb-1" style={{ color: '#0D1B2A' }}>2</p>
                    <p className="text-[12px] font-medium" style={{ color: 'rgba(13,27,42,0.45)' }}>yrs faster</p>
                  </div>
                </div>

                {/* Mini charts row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Semi-circle gauge — Total Interest */}
                  <div className="rounded-xl px-4 py-4 flex flex-col items-center"
                    style={{ background: '#F4F7FA', border: '1px solid #E4EBF3' }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-3 self-start"
                      style={{ color: 'rgba(13,27,42,0.38)' }}>Total Interest</p>
                    <svg width={140} height={81} viewBox="0 0 100 58" aria-hidden>
                      {/* Track */}
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(13,27,42,0.10)" strokeWidth="10" strokeLinecap="round"/>
                      {/* Navy = standard (full) */}
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#0D1B2A" strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${Math.PI*40} ${Math.PI*40}`} strokeDashoffset="0"/>
                      {/* Teal = with extra payments (72%) */}
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1DB584" strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${0.72*Math.PI*40} ${Math.PI*40}`} strokeDashoffset="0"/>
                      <text x={50} y={45} textAnchor="middle" fill="#1DB584" fontSize="14" fontWeight="800">−28%</text>
                      <text x={50} y={56} textAnchor="middle" fill="rgba(13,27,42,0.40)" fontSize="7">interest</text>
                    </svg>
                  </div>
                  {/* Balance over time mini line chart */}
                  <div className="rounded-xl px-4 py-4"
                    style={{ background: '#F4F7FA', border: '1px solid #E4EBF3' }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-3"
                      style={{ color: 'rgba(13,27,42,0.38)' }}>Balance Over Time</p>
                    <svg width="100%" viewBox="0 0 100 52" preserveAspectRatio="none" aria-hidden>
                      {/* Bars decreasing - standard */}
                      {[48,42,35,27,18,10,4].map((h,i)=>(
                        <rect key={i} x={i*14+1} y={52-h} width={6} height={h} rx={1.5}
                          fill={i < 4 ? 'rgba(13,27,42,0.18)' : 'rgba(29,181,132,0.50)'} />
                      ))}
                      {/* Teal line — new scenario */}
                      <polyline points="4,52 18,44 32,34 46,22 60,12 74,5 88,2"
                        fill="none" stroke="#1DB584" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      {/* Dashed line — current plan */}
                      <polyline points="4,52 18,46 32,38 46,28 60,19 74,13 88,8"
                        fill="none" stroke="rgba(13,27,42,0.30)" strokeWidth="1.4" strokeDasharray="3 2"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className="flex gap-3 mt-1.5">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-0.5 inline-block rounded" style={{ background: '#1DB584' }} />
                        <span className="text-[8px]" style={{ color: 'rgba(13,27,42,0.40)' }}>New scenario</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-0.5 inline-block rounded" style={{ background: 'rgba(13,27,42,0.30)' }} />
                        <span className="text-[8px]" style={{ color: 'rgba(13,27,42,0.40)' }}>Current plan</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <Link href="/canadian-mortgage-calculator"
                    className="text-[14px] font-semibold transition-colors duration-150"
                    style={{ color: '#1DB584' }}>
                    Check mortgage insights →
                  </Link>
                </div>
              </div>

              {/* ── Right column: 3 smaller cards ── */}
              <div className="flex flex-col gap-5 sm:gap-6">

                {/* Top-right: Savings Goal */}
                <div className="bg-white rounded-2xl p-5 flex flex-col gap-3"
                  style={{ border: '1px solid rgba(15,41,66,0.08)', boxShadow: '0 4px 24px rgba(13,27,42,0.08)' }}>
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center rounded-xl"
                      style={{ width: 28, height: 28, background: 'rgba(29,181,132,0.10)' }}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
                        <circle cx="7" cy="7" r="5.5" stroke="#1DB584" strokeWidth="1.2"/>
                        <path d="M7 4v3l2 1.5" stroke="#1DB584" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>Savings Goal</span>
                  </div>
                  <h3 className="font-extrabold text-xl leading-tight" style={{ color: '#0D1B2A', letterSpacing: '-0.3px' }}>
                    Are you on track to reach your goal?
                  </h3>
                  {/* Donut + stats inline */}
                  <div className="flex items-center gap-4">
                    <svg width={92} height={92} viewBox="0 0 92 92" aria-hidden className="shrink-0">
                      <circle cx={46} cy={46} r={35} fill="none" stroke="rgba(29,181,132,0.12)" strokeWidth={9} />
                      <circle cx={46} cy={46} r={35} fill="none" stroke="#1DB584" strokeWidth={9}
                        strokeDasharray={`${0.89 * 2 * Math.PI * 35} ${0.11 * 2 * Math.PI * 35}`}
                        strokeLinecap="round" transform="rotate(-90 46 46)" />
                      <text x={46} y={42} textAnchor="middle" dominantBaseline="middle"
                        fill="#0D1B2A" fontSize="19" fontWeight="800">89%</text>
                      <text x={46} y={56} textAnchor="middle" fill="rgba(13,27,42,0.40)" fontSize="8">on track</text>
                    </svg>
                    <div className="flex flex-col gap-2 flex-1">
                      {[
                        { label: 'Monthly needed', value: 'CA$286/mo' },
                        { label: 'Time remaining',  value: '~34 months' },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg px-3 py-2"
                          style={{ background: '#F4F7FA', border: '1px solid #E4EBF3' }}>
                          <p className="text-[9.5px] leading-tight" style={{ color: 'rgba(13,27,42,0.40)' }}>{label}</p>
                          <p className="text-[12px] font-extrabold leading-tight" style={{ color: '#1DB584' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto pt-1">
                    <Link href="/savings-goal-calculator"
                      className="text-[13px] font-semibold transition-colors duration-150"
                      style={{ color: '#1DB584' }}>
                      View goal insights →
                    </Link>
                  </div>
                </div>

                {/* Bottom-right: 2 cards side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">

                  {/* Retirement */}
                  <div className="bg-white rounded-2xl p-6 flex flex-col"
                    style={{ border: '1px solid rgba(15,41,66,0.08)', boxShadow: '0 4px 24px rgba(13,27,42,0.08)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex items-center justify-center rounded-xl"
                        style={{ width: 30, height: 30, background: 'rgba(13,27,42,0.06)' }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                          <path d="M2 11c0-2.8 1.8-4.5 5-4.5S12 8.2 12 11" stroke="#0D1B2A" strokeWidth="1.2" strokeLinecap="round"/>
                          <circle cx="7" cy="4.5" r="2" stroke="#0D1B2A" strokeWidth="1.2"/>
                        </svg>
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(13,27,42,0.50)' }}>Retirement</span>
                    </div>
                    <h3 className="font-extrabold text-lg leading-snug mb-2" style={{ color: '#0D1B2A' }}>
                      Can your money last<br />in retirement?
                    </h3>
                    {/* Semi-gauge */}
                    <div className="flex items-center gap-3 my-3">
                      <svg width={72} height={42} viewBox="0 0 72 42" aria-hidden className="w-[94px] h-[55px] sm:w-[72px] sm:h-[42px]">
                        <path d="M 6 38 A 30 30 0 0 1 66 38" fill="none" stroke="rgba(13,27,42,0.10)" strokeWidth="8" strokeLinecap="round"/>
                        <path d="M 6 38 A 30 30 0 0 1 66 38" fill="none" stroke="#0D1B2A" strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${Math.PI*30} ${Math.PI*30}`}/>
                        <path d="M 6 38 A 30 30 0 0 1 66 38" fill="none" stroke="#1DB584" strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${0.68*Math.PI*30} ${Math.PI*30}`}/>
                        <text x={36} y={32} textAnchor="middle" fill="#0D1B2A" fontSize="13" fontWeight="800">82</text>
                        <text x={36} y={40} textAnchor="middle" fill="rgba(13,27,42,0.38)" fontSize="6">age</text>
                      </svg>
                      <div>
                        <p className="text-[13px] font-extrabold" style={{ color: '#0D1B2A' }}>Sustainable</p>
                        <p className="text-[11px]" style={{ color: 'rgba(13,27,42,0.45)' }}>to age 82</p>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <Link href="/retirement-withdrawal-calculator"
                        className="text-[13px] font-semibold transition-colors duration-150"
                        style={{ color: '#1DB584' }}>
                        View retirement insights →
                      </Link>
                    </div>
                  </div>

                  {/* Income Tax */}
                  <div className="bg-white rounded-2xl p-6 flex flex-col"
                    style={{ border: '1px solid rgba(15,41,66,0.08)', boxShadow: '0 4px 24px rgba(13,27,42,0.08)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex items-center justify-center rounded-xl"
                        style={{ width: 30, height: 30, background: 'rgba(245,158,11,0.10)' }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                          <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="#F59E0B" strokeWidth="1.2"/>
                          <path d="M4 6h6M4 8.5h4" stroke="#F59E0B" strokeWidth="1.1" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#F59E0B' }}>Tax &amp; Salary</span>
                    </div>
                    <h3 className="font-extrabold text-lg leading-snug mb-2" style={{ color: '#0D1B2A' }}>
                      How much will you<br />take home?
                    </h3>
                    {/* Amber figure + mini line chart */}
                    <p className="text-[26px] font-extrabold leading-none mb-3" style={{ color: '#F59E0B' }}>
                      $5,031<span className="text-[14px] font-semibold ml-1" style={{ color: 'rgba(13,27,42,0.40)' }}>/mo</span>
                    </p>
                    <svg width="100%" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden className="mb-3">
                      <defs>
                        <linearGradient id="amberFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.18"/>
                          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path d="M 0 30 C 15 28, 25 24, 35 22 S 55 16, 65 14 S 80 10, 100 6 L 100 36 L 0 36 Z"
                        fill="url(#amberFill)"/>
                      <path d="M 0 30 C 15 28, 25 24, 35 22 S 55 16, 65 14 S 80 10, 100 6"
                        fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round"/>
                      {[0, 25, 50, 65, 80, 100].map((x, i) => {
                        const pts: [number,number][] = [[0,30],[25,25],[50,19],[65,14],[80,10],[100,6]];
                        return <circle key={i} cx={pts[i][0]} cy={pts[i][1]} r="2.5" fill="#F59E0B" />;
                      })}
                    </svg>
                    <div className="mt-auto">
                      <Link href="/income-tax-calculator"
                        className="text-[13px] font-semibold transition-colors duration-150"
                        style={{ color: '#F59E0B' }}>
                        View tax insights →
                      </Link>
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ── SECTION 4 — Final CTA + Trust ── */}
        <section style={{ background: 'linear-gradient(160deg, #091523 0%, #0D1B2A 45%, #0A1628 100%)' }}>
          <div className="mx-auto max-w-xl px-4 sm:px-6 py-20 sm:py-24 text-center">
            <h2 className="font-extrabold text-2xl sm:text-3xl text-white mb-4" style={{ letterSpacing: '-0.3px' }}>
              Ready to see your own insights?
            </h2>
            <p className="text-[15px] mb-8" style={{ color: 'rgba(255,255,255,0.58)' }}>
              Run a free calculator — no sign-up, no account required.
            </p>
            <Link href="/calculators"
              className="inline-block font-bold text-[15px] px-8 py-3.5 rounded-full transition-opacity duration-150 hover:opacity-90"
              style={{ background: '#1DB584', color: '#fff' }}>
              Explore All Calculators
            </Link>
            <p className="mt-8 text-[11px]" style={{ color: 'rgba(255,255,255,0.32)' }}>
              Educational estimates only · Not financial advice · Canada &amp; USA
            </p>
          </div>
        </section>

      </div>
  );
}

/* ─────────────────────────────────────────────
   Product Mockup
   Two dark panels side-by-side: payment breakdown
   (donut + legend + summary card) and interest
   over time (grouped bar chart). Stat chips below.
───────────────────────────────────────────── */
function ProductMockup() {
  return (
    <div className="relative">

      {/* Main white report card */}
      <div
        className="relative overflow-hidden rounded-2xl border bg-white"
        style={{
          borderColor: '#D8E0EB',
          boxShadow: '0 12px 48px rgba(13,27,42,0.12), 0 2px 8px rgba(13,27,42,0.06)',
        }}
      >
        {/* ── Browser chrome — label LEFT-aligned ── */}
        <div
          className="flex items-center gap-3 px-4 py-2.5"
          style={{ background: '#F8FAFB', borderBottom: '1px solid #E4E9EF' }}
        >
          <div className="hidden sm:flex items-center gap-1.5 shrink-0" aria-hidden>
            <div className="h-2 w-2 rounded-full" style={{ background: 'rgba(239,68,68,0.55)' }} />
            <div className="h-2 w-2 rounded-full" style={{ background: 'rgba(245,158,11,0.55)' }} />
            <div className="h-2 w-2 rounded-full" style={{ background: 'rgba(34,197,94,0.55)' }} />
          </div>
          <span className="text-[11px] font-semibold" style={{ color: 'rgba(13,27,42,0.45)' }}>
            Mortgage Calculator
          </span>
          <div className="ml-auto">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: 'rgba(29,181,132,0.12)', color: '#1DB584' }}
            >
              Mortgage
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-4 sm:p-5">

          {/* Sample inputs with icons */}
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5"
            style={{ color: 'rgba(13,27,42,0.38)' }}>
            Sample inputs
          </p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Home Price',    value: '$650,000', icon: (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M1.5 6.5 7 2l5.5 4.5V12a.5.5 0 01-.5.5H9V9H5v3.5H2a.5.5 0 01-.5-.5V6.5z" stroke="#1DB584" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )},
              { label: 'Down Payment', value: '$130,000', icon: (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <rect x="1.5" y="4" width="11" height="7" rx="1.2" stroke="#1DB584" strokeWidth="1.1"/>
                  <path d="M4.5 4V3a2.5 2.5 0 015 0v1" stroke="#1DB584" strokeWidth="1.1" strokeLinecap="round"/>
                  <circle cx="7" cy="7.5" r="1" fill="#1DB584"/>
                </svg>
              )},
              { label: 'Rate',         value: '5.19%',    icon: (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <circle cx="4.5" cy="4.5" r="1.5" stroke="#1DB584" strokeWidth="1.1"/>
                  <circle cx="9.5" cy="9.5" r="1.5" stroke="#1DB584" strokeWidth="1.1"/>
                  <path d="M3 11L11 3" stroke="#1DB584" strokeWidth="1.1" strokeLinecap="round"/>
                </svg>
              )},
            ].map(({ label, value, icon }) => (
              <div key={label}
                className="rounded-xl px-3 py-2.5"
                style={{ background: '#F4F7FA', border: '1px solid #E0E8F0' }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="flex items-center justify-center rounded-full"
                    style={{ width: 18, height: 18, background: 'rgba(29,181,132,0.10)', flexShrink: 0 }}>
                    {icon}
                  </span>
                  <p className="text-[9px] font-semibold uppercase tracking-wider truncate"
                    style={{ color: 'rgba(13,27,42,0.42)' }}>{label}</p>
                </div>
                <p className="text-[13px] font-bold" style={{ color: '#0D1B2A' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── TWO dark analytics panels side by side ── */}
          <div className="grid grid-cols-2 gap-3 mb-3">

            {/* LEFT panel — Monthly payment breakdown */}
            <div className="rounded-xl p-3"
              style={{
                background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 100%)',
                border: '1px solid rgba(29,181,132,0.14)',
              }}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2.5"
                style={{ color: 'rgba(255,255,255,0.38)' }}>
                Monthly payment breakdown
              </p>
              {/* Donut + legend side-by-side */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                <div className="shrink-0">
                  <MockupDonut />
                </div>
                {/* 4-item legend inline */}
                <div className="hidden sm:block space-y-1.5 min-w-0 flex-1">
                {[
                  { color: '#1DB584', label: 'P&I',       pct: '67%', amt: '$2,575' },
                  { color: '#1F4268', label: 'Taxes',     pct: '17%', amt: '$654'   },
                  { color: '#4A90D9', label: 'Insurance', pct: '8%',  amt: '$308'   },
                  { color: 'rgba(255,255,255,0.30)', label: 'PMI', pct: '8%', amt: '$310' },
                ].map(({ color, label, pct, amt }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="shrink-0 rounded-full" style={{ width: 6, height: 6, background: color }} />
                    <span className="text-[9px] flex-1 truncate" style={{ color: 'rgba(255,255,255,0.60)' }}>{label}</span>
                    <span className="text-[9px] tabular-nums" style={{ color: 'rgba(255,255,255,0.45)' }}>{pct}</span>
                    <span className="text-[9px] font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.80)' }}>{amt}</span>
                  </div>
                ))}
                </div>{/* end legend */}
              </div>{/* end flex donut+legend */}
              {/* Glass summary card */}
              <div className="hidden sm:block rounded-lg px-3 py-2"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  backdropFilter: 'blur(8px)',
                }}>
                <p className="text-[8.5px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Total monthly payment
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-[15px] font-extrabold leading-none" style={{ color: 'white' }}>
                    $3,847
                  </p>
                  <p className="text-[8.5px] font-semibold" style={{ color: '#1DB584' }}>
                    ↓ $215 vs. standard
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT panel — Total interest over time */}
            <div className="rounded-xl p-3"
              style={{
                background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 100%)',
                border: '1px solid rgba(29,181,132,0.14)',
              }}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(255,255,255,0.38)' }}>
                Total interest over time
              </p>
              <MockupInterestBarChart />
              {/* Legend row */}
              <div className="flex gap-3" style={{ marginTop: '-3px' }}>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'rgba(29,181,132,0.68)' }} />
                  <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.45)' }}>With extra payments</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'rgba(255,255,255,0.20)' }} />
                  <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.45)' }}>Standard</span>
                </div>
              </div>
            </div>

          </div>

          {/* ── Stat row — single gray container ── */}
          <div className="rounded-xl px-4 py-3 grid grid-cols-3"
            style={{ background: '#F4F7FA', border: '1px solid #E4EBF3' }}>
            {[
              { value: '$28,400',      label: 'Interest saved', sub: 'over loan term'      },
              { value: '2 yrs faster', label: 'Payoff time',    sub: 'with extra payments' },
              { value: '$113,700',     label: 'Total interest', sub: 'with extra payments' },
            ].map(({ value, label, sub }, i) => (
              <div key={label} className="flex flex-col items-center text-center"
                style={i > 0 ? { borderLeft: '1px solid #DDE4EE' } : {}}>
                <p className="text-[12.5px] font-extrabold leading-none mb-0.5 tabular-nums" style={{ color: '#0D1B2A' }}>{value}</p>
                <p className="text-[8.5px] font-semibold leading-none mb-0.5" style={{ color: 'rgba(13,27,42,0.50)' }}>{label}</p>
                <p className="text-[8px] leading-none" style={{ color: 'rgba(13,27,42,0.32)' }}>{sub}</p>
              </div>
            ))}
          </div>

        </div>

        {/* ── Footer — privacy ── */}
        <div
          className="flex items-center gap-2 px-5 py-2.5 border-t"
          style={{ background: '#F8FAFB', borderColor: '#E4E9EF' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M6 1L1.5 3v3c0 2.5 1.9 4.8 4.5 5.5C8.6 10.8 10.5 8.5 10.5 6V3L6 1z"
              stroke="rgba(13,27,42,0.38)" strokeWidth="1" strokeLinejoin="round"/>
          </svg>
          <p className="text-[9.5px]" style={{ color: 'rgba(13,27,42,0.38)' }}>
            Private &amp; secure. Your data stays private and is never shared.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Copy block (right side of hero)
───────────────────────────────────────────── */
function CopyBlock() {
  return (
    <div className="flex flex-col gap-7">
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>
        AI-ASSISTED INSIGHTS
      </p>

      <h1
        className="font-extrabold text-3xl sm:text-4xl lg:text-[2.6rem] leading-[1.15]"
        style={{ color: '#0D1B2A', letterSpacing: '-0.6px' }}
      >
        Understand what your numbers mean — not just what they are.
      </h1>

      <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.60)', maxWidth: '380px' }}>
        Every calculator delivers instant results, visual breakdowns, and AI-assisted insights
        — so you can spot trade-offs and take confident next steps.
      </p>

      {/* CTAs — only 2 */}
      <div className="flex flex-wrap gap-3 pt-1">
        <Link
          href="/calculators"
          className="inline-block font-bold text-[14px] px-7 py-3.5 rounded-full transition-opacity duration-150 hover:opacity-90"
          style={{ background: '#1DB584', color: '#fff' }}
        >
          Explore Calculators
        </Link>
        <a
          href="#insight-examples"
          className="ais-cta-outline inline-block font-semibold text-[14px] px-7 py-3.5 rounded-full"
          style={{ color: '#0D1B2A', border: '1.5px solid rgba(13,27,42,0.18)' }}
        >
          View Examples ↓
        </a>
      </div>
    </div>
  );
}
