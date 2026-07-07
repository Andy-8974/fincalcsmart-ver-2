'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Calculator, Globe, Sparkles } from 'lucide-react';
import { CALC_INDEX, type CalcEntry } from '@/lib/calculators';

// ─── Constants ────────────────────────────────────────────────────────────────

const FEATURED_HREFS = [
  '/canadian-mortgage-calculator',
  '/mortgage-qualifier-calculator',
  '/rent-vs-buy-calculator',
  '/savings-goal-calculator',
  '/retirement-withdrawal-calculator',
  '/income-tax-calculator',
];

interface Chip {
  label: string;
  value: string | null;
  count: number;
}

const CHIPS: Chip[] = [
  { label: 'All',                value: null,               count: 23 },
  { label: 'Mortgage',           value: 'Mortgage',         count: 5  },
  { label: 'Financial Planning', value: 'Financial Planning', count: 5 },
  { label: 'Investing',          value: 'Investing',        count: 4  },
  { label: 'Retirement',         value: 'Retirement',       count: 3  },
  { label: 'Loans',              value: 'Loans',            count: 3  },
  { label: 'Tax & Salary',       value: 'Tax & Salary',     count: 3  },
  { label: 'Canada Only',        value: 'canada-only',      count: 3  },
];

// ─── Search scoring ───────────────────────────────────────────────────────────

function scoreEntry(entry: CalcEntry, q: string): number {
  const lq = q.toLowerCase();
  if (entry.label.toLowerCase().includes(lq)) return 3;
  if (entry.searchLabel?.toLowerCase().includes(lq)) return 3;
  if (entry.description.toLowerCase().includes(lq)) return 2;
  if (entry.category.toLowerCase().includes(lq)) return 1;
  const regionText =
    entry.region === 'ca' ? 'canada' :
    entry.region === 'us' ? 'usa' :
    'canada usa';
  if (regionText.includes(lq)) return 0.5;
  return 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RegionBadge({ region }: { region: 'ca' | 'us' | 'both' }) {
  if (region === 'ca') {
    return (
      <span
        style={{
          background: 'rgba(251,191,36,0.12)',
          border: '1px solid rgba(217,119,6,0.22)',
          color: '#92400E',
          fontSize: '10px',
          fontWeight: 700,
          borderRadius: '20px',
          padding: '2px 8px',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        Canada
      </span>
    );
  }
  if (region === 'us') {
    return (
      <span
        style={{
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.2)',
          color: '#1D4ED8',
          fontSize: '10px',
          fontWeight: 700,
          borderRadius: '20px',
          padding: '2px 8px',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        USA
      </span>
    );
  }
  return (
    <span
      style={{
        background: 'transparent',
        border: '1px solid #E4E9EF',
        color: '#9BA8B5',
        fontSize: '10px',
        fontWeight: 600,
        borderRadius: '20px',
        padding: '2px 8px',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      CA &amp; USA
    </span>
  );
}

function CalcCard({ entry }: { entry: CalcEntry }) {
  const Icon = entry.icon;
  return (
    <Link href={entry.href} className="block">
      <div
        className="h-full flex flex-col"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(15,41,66,0.09)',
          borderRadius: '16px',
          padding: '20px',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = 'rgba(29,181,132,0.35)';
          el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = 'rgba(15,41,66,0.09)';
          el.style.boxShadow = 'none';
        }}
      >
        {/* Header: icon tile + region badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              borderRadius: '10px',
              background: entry.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={18} color={entry.iconColor} />
          </div>
          <RegionBadge region={entry.region} />
        </div>

        {/* Name + description */}
        <div className="flex-1">
          <p
            className="font-bold leading-snug"
            style={{ color: '#0D1B2A', fontSize: '14px' }}
          >
            {entry.label}
          </p>
          <p
            className="mt-1 text-xs leading-relaxed line-clamp-2"
            style={{ color: '#6B7A8D' }}
          >
            {entry.description}
          </p>
        </div>

        {/* Footer: category chip + open link */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span
            style={{
              background: entry.iconBg,
              color: entry.iconColor,
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              padding: '3px 8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '140px',
            }}
          >
            {entry.category}
          </span>
          <span
            className="text-xs font-semibold shrink-0"
            style={{ color: '#1DB584' }}
          >
            Open →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Dark variants for the featured navy panel ────────────────────────────────

function DarkRegionBadge({ region }: { region: 'ca' | 'us' | 'both' }) {
  if (region === 'ca') {
    return (
      <span
        style={{
          background: 'rgba(251,191,36,0.12)',
          border: '1px solid rgba(217,119,6,0.22)',
          color: '#FCD34D',
          fontSize: '10px',
          fontWeight: 700,
          borderRadius: '20px',
          padding: '2px 8px',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        Canada
      </span>
    );
  }
  return (
    <span
      style={{
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'rgba(255,255,255,0.38)',
        fontSize: '10px',
        fontWeight: 600,
        borderRadius: '20px',
        padding: '2px 8px',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      CA &amp; USA
    </span>
  );
}

function DarkCalcCard({ entry }: { entry: CalcEntry }) {
  const Icon = entry.icon;
  return (
    <Link href={entry.href} className="block">
      <div
        className="h-full flex flex-col"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '18px',
          transition: 'background 150ms ease, border-color 150ms ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.background = 'rgba(255,255,255,0.07)';
          el.style.borderColor = 'rgba(29,181,132,0.25)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.background = 'rgba(255,255,255,0.04)';
          el.style.borderColor = 'rgba(255,255,255,0.08)';
        }}
      >
        {/* Header: icon tile + region badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div
            style={{
              width: '38px',
              height: '38px',
              minWidth: '38px',
              borderRadius: '9px',
              background: entry.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={16} color={entry.iconColor} />
          </div>
          <DarkRegionBadge region={entry.region} />
        </div>

        {/* Name + description */}
        <div className="flex-1">
          <p
            className="font-bold leading-snug"
            style={{ color: '#FFFFFF', fontSize: '13px' }}
          >
            {entry.label}
          </p>
          <p
            className="mt-1 text-xs leading-relaxed line-clamp-2"
            style={{ color: 'rgba(255,255,255,0.52)' }}
          >
            {entry.description}
          </p>
        </div>

        {/* Footer: category chip + open link */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span
            style={{
              background: entry.iconBg,
              color: entry.iconColor,
              fontSize: '10px',
              fontWeight: 600,
              borderRadius: '6px',
              padding: '2px 7px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '120px',
            }}
          >
            {entry.category}
          </span>
          <span
            className="text-xs font-semibold shrink-0"
            style={{ color: '#1DB584' }}
          >
            Open →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialQuery: string;
  initialCategory: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalculatorsClient({ initialQuery, initialCategory }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<string | null>(initialCategory || null);

  // Sync state to URL (skip on initial render to avoid redundant replace)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (activeFilter) params.set('category', activeFilter);
    const search = params.toString();
    router.replace(pathname + (search ? `?${search}` : ''), { scroll: false });
  }, [query, activeFilter, pathname, router]);

  // Base list: exclude navHidden and unavailable entries
  const visibleList = useMemo(
    () => CALC_INDEX.filter((e) => !e.navHidden && e.available),
    []
  );

  // Filtered list: category/canada-only + search, both work simultaneously
  const filtered = useMemo(() => {
    let list = visibleList;

    if (activeFilter === 'canada-only') {
      list = list.filter((e) => e.region === 'ca');
    } else if (activeFilter) {
      list = list.filter((e) => e.category === activeFilter);
    }

    const q = query.trim();
    if (!q) return list;

    return list
      .map((entry) => ({ entry, s: scoreEntry(entry, q) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ entry }) => entry);
  }, [query, activeFilter, visibleList]);

  // Featured entries (hardcoded order, shown only when no filter/search)
  const showFeatured = !query.trim() && !activeFilter;

  const featuredEntries = useMemo(
    () =>
      FEATURED_HREFS
        .map((href) => visibleList.find((e) => e.href === href))
        .filter((e): e is CalcEntry => e !== undefined),
    [visibleList]
  );

  // Result count label
  const countText = useMemo(() => {
    const n = filtered.length;
    const q = query.trim();
    const filterLabel =
      activeFilter === 'canada-only' ? 'Canada Only' : activeFilter;
    if (!q && !activeFilter) return `Showing ${n} calculators`;
    if (q && activeFilter)
      return `Showing ${n} result${n !== 1 ? 's' : ''} for '${q}' in ${filterLabel}`;
    if (q) return `Showing ${n} calculator${n !== 1 ? 's' : ''} matching '${q}'`;
    return `Showing ${n} ${filterLabel} calculator${n !== 1 ? 's' : ''}`;
  }, [filtered.length, query, activeFilter]);

  return (
    <div className="mx-auto max-w-6xl px-4">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="pt-8 pb-6 sm:pt-12 sm:pb-8">
        <h1
          className="font-extrabold"
          style={{
            color: '#0D1B2A',
            fontSize: 'clamp(24px, 4vw, 36px)',
            letterSpacing: '-0.5px',
            lineHeight: '1.15',
          }}
        >
          All Financial Calculators
        </h1>
        <p
          className="mt-2 sm:mt-3 max-w-2xl"
          style={{ color: 'rgba(13,27,42,0.65)', fontSize: '15px', lineHeight: '1.6' }}
        >
          Free calculators for mortgages, loans, investing, retirement, taxes, and financial
          planning — built for Canada and the USA.
        </p>

        {/* Trust chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { Icon: Calculator, text: '23 free calculators' },
              { Icon: Globe,      text: 'Canada & USA'       },
              { Icon: Sparkles,   text: 'AI-assisted analysis' },
            ] as const
          ).map(({ Icon, text }) => (
            <span
              key={text}
              className="inline-flex items-center gap-1.5"
              style={{
                background: 'rgba(29,181,132,0.08)',
                border: '1px solid rgba(29,181,132,0.2)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0D7A55',
              }}
            >
              <Icon size={11} />
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: '#9BA8B5' }}
            aria-hidden="true"
          />
          <label htmlFor="calculator-search" className="sr-only">
            Search calculators
          </label>
          <input
            id="calculator-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search calculators — mortgage, tax, retirement, savings..."
            autoComplete="off"
            className="w-full pl-11 pr-4 transition-all focus:outline-none"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E4E9EF',
              borderRadius: '14px',
              color: '#0D1B2A',
              fontSize: '14px',
              padding: '13px 16px 13px 44px',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#1DB584';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29,181,132,0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E4E9EF';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        <p className="mt-2 text-xs" style={{ color: '#9BA8B5' }}>
          {countText}
        </p>
      </div>

      {/* ── Category chips ─────────────────────────────────────────────────── */}
      <div
        className="mb-8 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        <div className="flex gap-2 pb-1">
          {CHIPS.map((chip) => {
            const isActive = activeFilter === chip.value;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  // "All" chip always clears filter; other chips toggle
                  if (chip.value === null) {
                    setActiveFilter(null);
                  } else {
                    setActiveFilter(isActive ? null : chip.value);
                  }
                }}
                className="shrink-0 transition-all duration-150"
                style={{
                  background: isActive ? '#0D1B2A' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#374151',
                  border: isActive ? '1.5px solid transparent' : '1.5px solid #E4E9EF',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {chip.label}
                <span
                  style={{
                    marginLeft: '5px',
                    opacity: isActive ? 0.65 : 0.45,
                    fontSize: '11px',
                  }}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Featured calculators — dark navy panel ───────────────────────── */}
      {showFeatured && (
        <div
          className="mb-10 overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #091523 0%, #0D1B2A 45%, #0A1628 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            padding: '28px 20px',
          }}
        >
          {/* Panel heading */}
          <div className="mb-6 sm:px-2">
            <p
              className="font-extrabold text-white"
              style={{ fontSize: '17px', letterSpacing: '-0.2px' }}
            >
              Popular Calculators
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: 'rgba(255,255,255,0.48)' }}
            >
              Start with the tools most users need first.
            </p>
          </div>

          {/* Dark cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:px-2">
            {featuredEntries.map((entry) => (
              <DarkCalcCard key={entry.href} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* ── All calculators grid ─────────────────────────────────────────── */}
      <div className="mb-12">
        {showFeatured && (
          <p
            className="mb-4 font-bold uppercase tracking-widest"
            style={{ fontSize: '11px', color: '#9BA8B5', letterSpacing: '0.1em' }}
          >
            All Calculators
          </p>
        )}

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((entry) => (
              <CalcCard key={entry.href} entry={entry} />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p
              className="text-base font-semibold"
              style={{ color: '#0D1B2A' }}
            >
              {query.trim()
                ? `No calculators found for '${query.trim()}'.`
                : 'No calculators found.'}
            </p>
            <p className="mt-2 text-sm" style={{ color: '#9BA8B5' }}>
              Try one of these:
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {(['mortgage', 'retirement', 'tax', 'salary', 'savings', 'loan'] as const).map(
                (term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      setActiveFilter(null);
                    }}
                    className="transition-colors"
                    style={{
                      background: 'rgba(29,181,132,0.08)',
                      border: '1px solid rgba(29,181,132,0.2)',
                      borderRadius: '20px',
                      padding: '5px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0D7A55',
                      cursor: 'pointer',
                    }}
                  >
                    {term}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── SEO content block ─────────────────────────────────────────────── */}
      <section
        className="pb-16 pt-8"
        style={{ borderTop: '1px solid #E4E9EF' }}
      >
        <h2
          className="text-base font-bold mb-3"
          style={{ color: '#0D1B2A' }}
        >
          About FinCalcSmart Calculators
        </h2>
        <p
          className="text-sm leading-relaxed mb-3"
          style={{ color: '#6B7A8D', maxWidth: '680px' }}
        >
          FinCalcSmart offers 23 free financial calculators for residents of Canada and the USA.
          Every calculator includes AI-assisted analysis to help users understand their results,
          not just see the numbers. From mortgage payments and retirement planning to income tax
          estimates and investment growth, these tools cover key personal finance decisions.
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: '#9BA8B5', maxWidth: '680px' }}
        >
          All calculators are educational estimates only. Results do not constitute financial,
          tax, legal, or investment advice. For official tax calculations, consult the CRA in
          Canada or the IRS in the USA.
        </p>
      </section>

    </div>
  );
}
