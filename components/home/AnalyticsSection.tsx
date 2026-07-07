'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Calendar, DollarSign, Lock, Shield, Lightbulb } from 'lucide-react';

// ─── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target: number, duration: number, active: boolean, noMotion: boolean): number {
  const [val, setVal] = useState(noMotion ? target : 0);
  useEffect(() => {
    if (!active) return;
    if (noMotion) { setVal(target); return; }
    const t0 = performance.now();
    let raf: number;
    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, noMotion]);
  return val;
}

// ─── Reduction donut ──────────────────────────────────────────────────────────
function ReductionDonut({ pct, animated, noMotion }: { pct: number; animated: boolean; noMotion: boolean }) {
  const size = 132; const cx = 66; const r = 48;
  return (
    <div className="shrink-0 flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {/* Track — light navy */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#CDD8E3" strokeWidth="10" />
        {/* Filled arc — medium navy */}
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke="#2A5A84" strokeWidth="10" strokeLinecap="round"
          pathLength="100"
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{
            strokeDasharray: animated ? `${pct} 100` : '0 100',
            transition: noMotion ? 'none' : 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1) 350ms',
          }}
        />
        {/* Inner accent ring — dark navy */}
        <circle cx={cx} cy={cx} r={r - 14} fill="none" stroke="#0D1B2A" strokeWidth="1.5" opacity="0.10" />
        <text x={cx} y={cx + 6} textAnchor="middle"
          style={{ fontSize: 24, fontWeight: 800, fill: '#0D1B2A', letterSpacing: -0.5 }}>
          {pct}%
        </text>
        <text x={cx} y={cx + 22} textAnchor="middle"
          style={{ fontSize: 9.5, fill: '#6B7A8D', letterSpacing: 0.6 }}>
          reduction
        </text>
      </svg>
    </div>
  );
}

// ─── Chart constants ──────────────────────────────────────────────────────────
// Illustrative loan balance ($K) over 30 years.
// Smart line pays off at yr 23 (2 years earlier than standard at yr 25).
const STD_DATA = [
  { year: 0,  val: 28.0 },
  { year: 5,  val: 24.9 },
  { year: 10, val: 21.2 },
  { year: 15, val: 16.9 },
  { year: 20, val: 11.7 },
  { year: 23, val:  8.2 },
  { year: 25, val:  0.0 },
];
const SRT_DATA = [
  { year: 0,  val: 28.0 },
  { year: 5,  val: 23.9 },
  { year: 10, val: 19.4 },
  { year: 15, val: 14.1 },
  { year: 20, val:  7.9 },
  { year: 23, val:  0.0 },
];

const VW = 460; const VH = 182;
const PL = 38;  const PR = 18; const PT = 16; const PB = 28;
const CW = VW - PL - PR;
const CH = VH - PT - PB;

function toX(yr: number) { return PL + (yr / 30) * CW; }
function toY(k:  number) { return PT + (1 - k  / 30) * CH; }

function makeLine(pts: { year: number; val: number }[]) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.year).toFixed(1)},${toY(p.val).toFixed(1)}`).join(' ');
}
function makeArea(pts: { year: number; val: number }[]) {
  const baseY = toY(0).toFixed(1);
  const l = makeLine(pts);
  return `${l} L ${toX(pts[pts.length - 1].year).toFixed(1)},${baseY} L ${toX(pts[0].year).toFixed(1)},${baseY} Z`;
}

const STD_LINE = makeLine(STD_DATA);
const SRT_LINE = makeLine(SRT_DATA);
const STD_AREA = makeArea(STD_DATA);
const SRT_AREA = makeArea(SRT_DATA);

const Y_LABELS = [{ k: 30, l: '$30K' }, { k: 20, l: '$20K' }, { k: 10, l: '$10K' }, { k: 0, l: '$0' }];
const X_TICKS  = [0, 5, 10, 15, 20, 25, 30];

// Callout box anchored above the smart-line payoff point (year 23)
const CX23    = toX(23);
const BASE_Y  = toY(0);
const BOX_W   = 90; const BOX_H = 48;
const BOX_X   = CX23 - BOX_W / 2;
const BOX_TOP = PT - 2;

// ─── Bar data ─────────────────────────────────────────────────────────────────
const BARS = [
  { label: 'With extra payments',    amt: 54600, pct: 65.8, color: '#0D1B2A', text: '#0D1B2A'  },
  { label: 'Interest saved',         amt: 28400, pct: 34.2, color: '#2A5A84', text: '#2A5A84'  },
  { label: 'Without extra payments', amt: 83000, pct: 100,  color: '#B8C8D8', text: '#6B7A8D'  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────
export default function AnalyticsSection() {
  const [animated,       setAnimated]       = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    if (mq.matches) { setAnimated(true); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setAnimated(true); obs.disconnect(); } },
      { threshold: 0.10 },
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const savingsAmt = useCountUp(28400, 1100, animated, prefersReduced);
  const barAmt0    = useCountUp(54600,  950, animated, prefersReduced);
  const barAmt1    = useCountUp(28400, 1050, animated, prefersReduced);
  const barAmt2    = useCountUp(83000, 1200, animated, prefersReduced);
  const barAmts    = [barAmt0, barAmt1, barAmt2];

  const fade = (d: number): React.CSSProperties => ({
    opacity: animated ? 1 : 0,
    transition: prefersReduced ? 'none' : `opacity 0.55s ease ${d}ms`,
  });

  const drawLine = (delay: number): React.CSSProperties => ({
    strokeDashoffset: animated ? 0 : 1,
    opacity: animated ? 1 : 0,
    transition: prefersReduced
      ? 'none'
      : `stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1) ${delay}ms, opacity 0.4s ease ${delay}ms`,
  });

  return (
    <section ref={sectionRef} className="bg-white px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">

        {/* ── Section header ── */}
        <div className="mb-8 sm:mb-12 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-teal">
            Visual Analytics
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-[40px] sm:leading-tight">
            See the full story.<br className="hidden sm:block" /> Make smarter financial decisions.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-gray-600">
            FinCalc Smart turns your numbers into clear visual insights—so you can compare,
            understand, and choose the best path forward.
          </p>
        </div>

        {/* ── Top row ── */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* ── Card 1: Calculate ── */}
          <div
            className="rounded-brand-xl border border-brand-gray-200 bg-white p-6"
            style={{ ...fade(80), boxShadow: '0 1px 4px rgba(13,27,42,0.07)' }}
          >
            {/* Step */}
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-[13px] font-extrabold text-brand-teal">
                1
              </span>
              <div>
                <p className="text-[14px] font-bold text-brand-navy">Calculate</p>
                <p className="text-[12px] text-brand-gray-400">We crunch the numbers for you.</p>
              </div>
            </div>

            {/* KPI + donut */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                  Potential interest saved
                </p>
                <p className="mt-2 text-[44px] font-extrabold leading-none tracking-tight text-brand-teal">
                  ~${savingsAmt.toLocaleString()}
                </p>
                <p className="mt-2 text-[12.5px] text-brand-gray-400">
                  by paying $150/mo extra each month
                </p>
              </div>
              <ReductionDonut pct={34} animated={animated} noMotion={prefersReduced} />
            </div>

            {/* Breakdown bars */}
            <div className="mt-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                Breakdown of interest
              </p>
              <div
                className="space-y-3.5 rounded-brand-xl p-4"
                style={{ background: '#F4F7FA', border: '1px solid #E0E8F0' }}
              >
                {BARS.map((bar, i) => (
                  <div key={bar.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: bar.text }}>
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: bar.color }} />
                        {bar.label}
                      </span>
                      <span className="text-[12.5px] font-bold tabular-nums" style={{ color: bar.text }}>
                        ${barAmts[i].toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#DDE6EF' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: animated ? `${bar.pct}%` : '0%',
                          background: bar.color,
                          transition: prefersReduced ? 'none' : `width 0.9s cubic-bezier(0.4,0,0.2,1) ${260 + i * 80}ms`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-5 text-[11px] text-brand-gray-400">
              Illustrative · $520K · 5.19% · 25yr amortization
            </p>
          </div>

          {/* ── Card 2: Analyze ── */}
          <div
            className="rounded-brand-xl border border-brand-gray-200 bg-white p-6"
            style={{ ...fade(200), boxShadow: '0 1px 4px rgba(13,27,42,0.07)' }}
          >
            {/* Step */}
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-[13px] font-extrabold text-brand-teal">
                2
              </span>
              <div>
                <p className="text-[14px] font-bold text-brand-navy">Analyze</p>
                <p className="text-[12px] text-brand-gray-400">We visualize your payoff journey.</p>
              </div>
            </div>

            {/* Chart header + legend */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                Loan balance over time
              </p>
              <div className="flex items-center gap-4" style={fade(280)}>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand-gray-500">
                  <svg width="18" height="3" aria-hidden>
                    <line x1="0" y1="1.5" x2="18" y2="1.5" stroke="#0D1B2A" strokeWidth="2" />
                  </svg>
                  Standard payments
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-teal">
                  <svg width="18" height="3" aria-hidden>
                    <line x1="0" y1="1.5" x2="18" y2="1.5" stroke="#1DB584" strokeWidth="2.5" />
                  </svg>
                  With extra payments
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="mt-3 w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${VW} ${VH}`}
                className="w-full"
                style={{ minWidth: 220, height: 'auto' }}
                role="img"
                aria-label="Loan balance over time. With extra payments, the loan pays off 2 years earlier."
              >
                {/* Y grid + labels */}
                {Y_LABELS.map(({ k, l }) => (
                  <g key={k}>
                    <line
                      x1={PL} y1={toY(k)} x2={VW - PR} y2={toY(k)}
                      stroke={k === 0 ? '#C8D0D9' : '#EAECF0'}
                      strokeWidth="1"
                      strokeDasharray={k === 0 ? undefined : '4 3'}
                    />
                    <text x={PL - 5} y={toY(k) + 4} textAnchor="end"
                      style={{ fontSize: 9, fill: '#9BA8B5' }}>{l}</text>
                  </g>
                ))}

                {/* Areas */}
                <path d={STD_AREA} fill="rgba(13,27,42,0.05)"   style={fade(260)} />
                <path d={SRT_AREA} fill="rgba(29,181,132,0.10)" style={fade(320)} />

                {/* Lines draw-on */}
                <path
                  d={STD_LINE} fill="none" stroke="#0D1B2A" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  pathLength="1" strokeDasharray="1"
                  style={drawLine(300)}
                />
                <path
                  d={SRT_LINE} fill="none" stroke="#1DB584" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  pathLength="1" strokeDasharray="1"
                  style={drawLine(420)}
                />

                {/* Endpoint dots */}
                <circle cx={toX(25)} cy={BASE_Y} r="4" fill="#0D1B2A" stroke="white" strokeWidth="1.5" style={fade(680)} />
                <circle cx={CX23}    cy={BASE_Y} r="4" fill="#1DB584" stroke="white" strokeWidth="1.5" style={fade(730)} />

                {/* Callout: "Paid off 2 years earlier" */}
                <g style={fade(780)}>
                  <line
                    x1={CX23} y1={BASE_Y - 6}
                    x2={CX23} y2={BOX_TOP + BOX_H + 5}
                    stroke="#B8C4CE" strokeWidth="1" strokeDasharray="3 2.5"
                  />
                  <rect
                    x={BOX_X} y={BOX_TOP} width={BOX_W} height={BOX_H}
                    rx="5" fill="white" stroke="#D5DDE5" strokeWidth="1.2"
                  />
                  <text x={CX23} y={BOX_TOP + 14} textAnchor="middle"
                    style={{ fontSize: 9, fill: '#9BA8B5' }}>Paid off</text>
                  <text x={CX23} y={BOX_TOP + 30} textAnchor="middle"
                    style={{ fontSize: 14, fontWeight: 800, fill: '#0D1B2A' }}>2 years</text>
                  <text x={CX23} y={BOX_TOP + 44} textAnchor="middle"
                    style={{ fontSize: 9, fill: '#9BA8B5' }}>earlier</text>
                </g>

                {/* X ticks */}
                {X_TICKS.map((yr) => (
                  <text key={yr} x={toX(yr)} y={VH - 6} textAnchor="middle"
                    style={{ fontSize: 9, fill: '#9BA8B5' }}>
                    {yr}
                  </text>
                ))}
                <text x={PL + CW / 2} y={VH + 2} textAnchor="middle"
                  style={{ fontSize: 8.5, fill: '#B8C4CE' }}>Years</text>
              </svg>
            </div>

            {/* KPI summary boxes */}
            <div className="mt-3 grid grid-cols-2 gap-2.5" style={fade(600)}>
              <div
                className="rounded-brand-lg px-3.5 py-2.5"
                style={{ background: '#F4F7FA', border: '1px solid #E0E8F0' }}
              >
                <p className="text-[9.5px] font-bold uppercase tracking-widest text-brand-gray-400">
                  Earlier payoff
                </p>
                <p className="mt-1 text-[18px] font-extrabold leading-none tracking-tight text-brand-navy">
                  2 years
                </p>
                <p className="mt-0.5 text-[10.5px] text-brand-gray-400">with extra $150/mo</p>
              </div>
              <div
                className="rounded-brand-lg px-3.5 py-2.5"
                style={{ background: '#F4F7FA', border: '1px solid #E0E8F0' }}
              >
                <p className="text-[9.5px] font-bold uppercase tracking-widest text-brand-gray-400">
                  Interest saved
                </p>
                <p className="mt-1 text-[18px] font-extrabold leading-none tracking-tight text-brand-teal">
                  $28,400
                </p>
                <p className="mt-0.5 text-[10.5px] text-brand-gray-400">over the loan term</p>
              </div>
            </div>

            {/* Insight note */}
            <div className="mt-3 flex items-start gap-1.5 rounded-brand-sm bg-brand-gray-50 px-3 py-2">
              <Lightbulb className="mt-px h-3 w-3 shrink-0 text-brand-teal" aria-hidden />
              <p className="text-[11px] leading-snug text-brand-gray-500">
                Extra payments shorten your loan term and reduce total interest.
              </p>
            </div>
          </div>
        </div>

        {/* ── Decide card ── */}
        <div
          className="overflow-hidden rounded-brand-xl border"
          style={{
            ...fade(350),
            background: 'linear-gradient(135deg, #E4F6EE 0%, #EEF9F5 55%, #F2FDF8 100%)',
            borderColor: 'rgba(29,181,132,0.22)',
            boxShadow: '0 1px 4px rgba(13,27,42,0.07)',
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3">

            {/* Column 1: CTA */}
            <div
              className="border-b p-7 lg:border-b-0 lg:border-r lg:p-8"
              style={{ borderColor: 'rgba(29,181,132,0.14)' }}
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-teal/15 text-[13px] font-extrabold text-brand-teal">
                  3
                </span>
                <div>
                  <p className="text-[14px] font-bold text-brand-navy">Decide</p>
                  <p className="text-[12px] text-brand-gray-500">Choose your best path forward.</p>
                </div>
              </div>
              <p className="mb-6 max-w-[240px] text-[15px] font-bold leading-snug text-brand-navy">
                A consistent extra payment accelerates your payoff and saves tens of thousands.
              </p>
              <Link
                href="/canadian-mortgage-calculator"
                className="group inline-flex items-center gap-2.5 rounded-full bg-brand-navy px-7 py-3.5 text-[13.5px] font-bold text-white transition-all hover:bg-[#0A1525]"
                style={{ boxShadow: '0 4px 18px rgba(13,27,42,0.24)' }}
              >
                Try the calculator
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-brand-gray-500">
                <Lock className="h-3 w-3 shrink-0" aria-hidden />
                100% free · No sign-up required
              </p>
            </div>

            {/* Column 2: ~2 yrs metric */}
            <div
              className="flex items-stretch border-b p-6 lg:border-b-0 lg:border-r lg:p-8"
              style={{ borderColor: 'rgba(29,181,132,0.14)' }}
            >
              <div
                className="flex w-full flex-col justify-center rounded-brand-xl p-5"
                style={{ background: 'rgba(255,255,255,0.68)', border: '1px solid rgba(255,255,255,0.85)' }}
              >
                <span
                  className="mb-4 flex h-9 w-9 items-center justify-center rounded-brand-md"
                  style={{ background: 'rgba(13,27,42,0.07)' }}
                >
                  <Calendar className="h-4 w-4 text-brand-navy" aria-hidden />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                  Earlier mortgage freedom
                </p>
                <p className="mt-2 text-[40px] font-extrabold leading-none tracking-tight text-brand-navy">
                  ~2 yrs
                </p>
                <p className="mt-2 text-[13px] font-semibold text-brand-teal">faster payoff</p>
              </div>
            </div>

            {/* Column 3: $28,400 metric */}
            <div className="flex items-stretch p-6 lg:p-8">
              <div
                className="flex w-full flex-col justify-center rounded-brand-xl p-5"
                style={{ background: 'rgba(255,255,255,0.68)', border: '1px solid rgba(255,255,255,0.85)' }}
              >
                <span
                  className="mb-4 flex h-9 w-9 items-center justify-center rounded-brand-md"
                  style={{ background: 'rgba(13,27,42,0.07)' }}
                >
                  <DollarSign className="h-4 w-4 text-brand-navy" aria-hidden />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                  Potential interest saved
                </p>
                <p className="mt-2 text-[40px] font-extrabold leading-none tracking-tight text-brand-navy">
                  $28,400
                </p>
                <p className="mt-2 text-[13px] text-brand-gray-500">over the life of your loan</p>
              </div>
            </div>
          </div>

          {/* Bottom trust bar */}
          <div
            className="flex items-center justify-center gap-2 border-t px-6 py-3"
            style={{ borderColor: 'rgba(29,181,132,0.15)', background: 'rgba(255,255,255,0.48)' }}
          >
            <Shield className="h-3.5 w-3.5 shrink-0 text-brand-teal" aria-hidden />
            <p className="text-[11.5px] text-brand-gray-500">
              All calculations are private and secure. Your data is never shared.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
