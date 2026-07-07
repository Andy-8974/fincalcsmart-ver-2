'use client';

import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';

const INPUTS = [
  { label: 'Home Price',    value: '$650,000' },
  { label: 'Down Payment', value: '$130,000' },
  { label: 'Annual Rate',  value: '5.19%' },
] as const;

const BREAKDOWN = [
  { label: 'Principal', value: '$1,284', width: '33%', color: '#1DB584' },
  { label: 'Interest',  value: '$2,277', width: '59%', color: 'rgba(255,255,255,0.28)' },
  { label: 'Insurance', value: '$286',   width:  '8%', color: '#C9A84C' },
] as const;

// Full-circle donut gauge — no clipping risk at any size.
function ScoreArc({ score }: { score: number }) {
  const pct  = Math.min(Math.max(score / 100, 0), 1);
  const r    = 22;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <svg viewBox="0 0 58 58" width="58" height="58" aria-hidden focusable="false">
      <circle cx="29" cy="29" r={r} fill="none" stroke="#E4E9EF" strokeWidth="5.5" />
      <circle
        cx="29" cy="29" r={r}
        fill="none" stroke="#1DB584" strokeWidth="5.5" strokeLinecap="round"
        strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
        transform="rotate(-90 29 29)"
      />
      <text x="29" y="34" textAnchor="middle" style={{ fontSize: 14, fontWeight: 800, fill: '#0D1B2A' }}>
        {score}
      </text>
    </svg>
  );
}

export default function HeroPreview() {
  const [visible, setVisible]             = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  const shouldAnimate = !prefersReduced;
  const frame: React.CSSProperties = {
    transition: shouldAnimate ? 'opacity 0.7s ease 150ms, transform 0.7s ease 150ms' : 'none',
    opacity:   !shouldAnimate || visible ? 1 : 0,
    transform: !shouldAnimate || visible ? 'translateY(0)' : 'translateY(18px)',
  };

  return (
    /*
     * Outer wrapper: rounded border, NO overflow-hidden so the score strip
     * is never clipped at any viewport size. Overflow is handled per-region.
     */
    <div
      className="relative w-full select-none rounded-2xl border border-brand-gray-200"
      style={{
        ...frame,
        boxShadow:
          '0 32px 72px rgba(13,27,42,0.14), 0 8px 24px rgba(13,27,42,0.08), 0 0 0 1px rgba(13,27,42,0.04)',
      }}
      aria-label="Sample mortgage calculator product preview"
    >
      {/* ── Chrome bar + content: overflow-hidden applied here for top corner clip ── */}
      <div className="overflow-hidden rounded-t-2xl">

        {/* Window chrome bar */}
        <div
          className="flex items-center justify-between px-4 py-1.5"
          style={{ background: '#F8FAFB', borderBottom: '1px solid #E4E9EF' }}
        >
          <div className="flex items-center gap-1.5" aria-hidden>
            <div className="h-2.5 w-2.5 rounded-full bg-red-300/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-300/70" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: '#E6F7F1', color: '#18a073' }}
            >
              Mortgage
            </span>
          </div>
          <span
            className="rounded-full border border-brand-teal/20 px-2 py-0.5 text-[10px] font-semibold text-brand-teal"
            style={{ background: 'rgba(29,181,132,0.06)' }}
          >
            Sample scenario
          </span>
        </div>

        {/* Main 2-column content */}
        <div className="grid grid-cols-1 min-[340px]:grid-cols-[5fr_7fr]">

          {/* Left: Input panel */}
          <div
            className="space-y-1.5 p-2.5 min-[420px]:p-6"
            style={{ background: '#FAFBFC', borderRight: '1px solid #E4E9EF' }}
          >
            {INPUTS.map((f) => (
              <div key={f.label}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-brand-gray-400">
                  {f.label}
                </p>
                <div className="rounded-brand-sm border border-brand-gray-200 bg-white px-3 py-1.5">
                  <p className="text-[14px] font-bold text-brand-navy">{f.value}</p>
                </div>
              </div>
            ))}
            <div
              className="mt-2 w-full rounded-brand-sm py-1.5 text-center text-xs font-semibold"
              style={{ background: 'rgba(29,181,132,0.10)', color: '#1DB584' }}
              aria-hidden
            >
              Calculated ✓
            </div>
          </div>

          {/* Right: Results panel */}
          <div
            className="p-3 min-[420px]:p-6"
            style={{
              background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 55%, #0D1B2A 100%)',
            }}
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
              Example Calculation
            </p>

            <div className="mb-2 flex items-baseline gap-1">
              <span className="text-[28px] min-[420px]:text-[36px] font-extrabold leading-none tracking-tight text-brand-teal">
                $3,847
              </span>
              <span className="text-sm font-medium text-white/50">/mo</span>
            </div>

            <div className="mb-2 grid grid-cols-3 gap-1.5">
              {BREAKDOWN.map((item) => (
                <div
                  key={item.label}
                  className="rounded-brand-sm px-1.5 py-1.5 text-center"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <p className="text-[10px] text-white/50">{item.label}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-white/90">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Proportion bar */}
            <div
              className="mb-1 flex h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: 'rgba(255,255,255,0.10)' }}
            >
              {BREAKDOWN.map((item) => (
                <div key={item.label} className="h-full" style={{ width: item.width, background: item.color }} />
              ))}
            </div>
            <div className="mb-2 flex justify-between text-[9.5px] text-white/40">
              <span>33%</span>
              <span>59%</span>
              <span>8%</span>
            </div>

            {/* Smart Insight card — redesigned hierarchy */}
            <div
              className="rounded-brand-sm px-2.5 py-2"
              style={{
                background: 'rgba(201,168,76,0.10)',
                border: '1px solid rgba(201,168,76,0.24)',
              }}
            >
              <div className="flex items-start gap-2.5">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: 'rgba(251,191,36,0.65)' }}>
                    Smart insight
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'rgba(254,243,199,0.60)' }}>
                    Extra $150/mo saves
                  </p>
                  <p className="mt-1 text-[18px] font-extrabold leading-none tracking-tight" style={{ color: '#FCD34D' }}>
                    $18,400
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Score strip: outside overflow-hidden so it's never clipped ── */}
      <div
        className="flex items-center justify-between rounded-b-2xl px-4 py-2 min-[420px]:px-6 min-[420px]:py-4"
        style={{ background: '#F8FAFB', borderTop: '1px solid #E4E9EF' }}
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <ScoreArc score={82} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
              Mortgage Health Score
            </p>
            <p className="text-[16px] font-bold text-brand-navy">82 / 100 · Strong</p>
          </div>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-bold"
          style={{ background: 'rgba(29,181,132,0.10)', color: '#1DB584' }}
        >
          Good DTI
        </span>
      </div>
    </div>
  );
}
