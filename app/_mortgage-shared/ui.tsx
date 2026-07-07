'use client';

import { useState } from 'react';

// ── NumericInput ──────────────────────────────────────────────────────────────

function fmtCommas(val: string): string {
  const s = String(val).replace(/[^0-9.]/g, '');
  if (!s || s === '.') return s;
  const dot = s.indexOf('.');
  const intPart = dot >= 0 ? s.slice(0, dot) : s;
  const decPart = dot >= 0 ? s.slice(dot) : '';
  const n = parseInt(intPart || '0', 10);
  if (isNaN(n)) return val;
  return n.toLocaleString('en-US') + decPart;
}

export function NumericInput({
  value,
  onChange,
  prefix,
  suffix,
  inputClassName,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  prefix?: string;
  suffix?: string;
  inputClassName?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  // Use inline style for prefix padding to avoid Tailwind class-conflict with inputClassName's pl-* values.
  // "CA$" (length 3) needs more room than "$" (length 1).
  const prefixStyle: React.CSSProperties | undefined = prefix
    ? { paddingLeft: prefix.length > 1 ? '2.75rem' : '1.75rem' }
    : undefined;
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={focused ? value : fmtCommas(value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.replace(/,/g, ''))}
        className={`${inputClassName ?? ''}${suffix ? ' pr-8' : ''}`}
        style={prefixStyle}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

export function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center ml-1.5 cursor-help"
      tabIndex={0}
      role="button"
      aria-label={text}
      onClick={() => setOpen(o => !o)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <svg
        className="w-3.5 h-3.5 text-slate-400 hover:text-sky-500 transition-colors"
        fill="currentColor"
        viewBox="0 0 20 20"
        width="14" height="14"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      {open && (
        <span role="tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 rounded-xl bg-slate-900 text-white text-xs p-3 pointer-events-none z-30 shadow-xl leading-relaxed whitespace-normal">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
}

// ── DonutChart ────────────────────────────────────────────────────────────────

export interface PieSlice {
  label: string;
  value: number;
  color: string;
  alwaysShow?: boolean;
}

export function DonutChart({
  slices,
  className = 'w-36 h-36 shrink-0',
  centerValue,
  centerLabel,
}: {
  slices: PieSlice[];
  className?: string;
  /** Text rendered in the center hole — e.g. "$3,615" */
  centerValue?: string;
  /** Small sublabel beneath centerValue — e.g. "total/mo" */
  centerLabel?: string;
}) {
  const toRender = slices.filter((s) => s.alwaysShow || s.value > 0);
  const total = toRender.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const cx = 80, cy = 80, R = 65, ri = 38;

  if (total <= 0) {
    return (
      <div className={`${className} rounded-full border-4 border-slate-200 flex items-center justify-center text-xs text-slate-400`}>
        No data
      </div>
    );
  }

  const hasCenter = Boolean(centerValue);
  const valueY = hasCenter && centerLabel ? cy - 8 : cy;
  const CenterText = hasCenter ? (
    <>
      <text
        x={cx} y={valueY}
        textAnchor="middle" dominantBaseline="middle"
        fill="#0D1B2A" fontSize={centerLabel ? "11" : "14"} fontWeight="800"
      >
        {centerValue}
      </text>
      {centerLabel && (
        <text
          x={cx} y={cy + 10}
          textAnchor="middle" dominantBaseline="middle"
          fill="#9BA8B5" fontSize="9" fontWeight="600"
          letterSpacing="0.04"
        >
          {centerLabel}
        </text>
      )}
    </>
  ) : null;

  const nonZeroSlices = toRender.filter((s) => s.value > 0);
  if (nonZeroSlices.length <= 1) {
    const color = nonZeroSlices[0]?.color ?? toRender[0].color;
    return (
      <svg viewBox="0 0 160 160" className={className} width="160" height="160" style={{ display: 'block' }}>
        <circle cx={cx} cy={cy} r={R} fill={color} />
        <circle cx={cx} cy={cy} r={ri} fill="white" />
        {CenterText}
      </svg>
    );
  }

  const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
  let angle = -Math.PI / 2;
  const paths = toRender
    .filter((s) => s.value > 0)
    .map((s) => {
      const sweep = (s.value / total) * 2 * Math.PI;
      const a0 = angle;
      angle += sweep;
      const c0 = r6(Math.cos(a0)), s0 = r6(Math.sin(a0));
      const c1 = r6(Math.cos(angle)), s1 = r6(Math.sin(angle));
      const large = sweep > Math.PI ? 1 : 0;
      return {
        ...s,
        d: [
          `M ${r6(cx + R * c0)} ${r6(cy + R * s0)}`,
          `A ${R} ${R} 0 ${large} 1 ${r6(cx + R * c1)} ${r6(cy + R * s1)}`,
          `L ${r6(cx + ri * c1)} ${r6(cy + ri * s1)}`,
          `A ${ri} ${ri} 0 ${large} 0 ${r6(cx + ri * c0)} ${r6(cy + ri * s0)}`,
          'Z',
        ].join(' '),
      };
    });

  return (
    <svg viewBox="0 0 160 160" className={className} width="160" height="160" style={{ display: 'block' }}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="2" />
      ))}
      {CenterText}
    </svg>
  );
}

// ── FaqAccordion ──────────────────────────────────────────────────────────────

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span>{item.q}</span>
            <svg
              className={`w-5 h-5 text-slate-400 shrink-0 ml-4 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === i && (
            <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Disclaimer ────────────────────────────────────────────────────────────────

export function Disclaimer() {
  return (
    <p className="text-xs text-slate-400 text-center mt-4 pb-12 px-4 leading-relaxed max-w-4xl mx-auto">
      This calculator is for illustrative and informational purposes only. Results are estimates and
      may not reflect actual mortgage terms. Individual results will vary based on lender terms,
      credit profile, amortization period, and prevailing market conditions. This does not constitute
      financial, tax, or legal advice. Consult a licensed mortgage professional or qualified financial
      advisor before making any financial decisions.
    </p>
  );
}
