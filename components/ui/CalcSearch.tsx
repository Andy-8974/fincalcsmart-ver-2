'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { CALC_INDEX, regionBadge, type CalcEntry } from '@/lib/calculators';
import { useRegion } from '@/lib/region/context';

// Filter once at module load — available calculators that are not nav-hidden
// (navHidden entries have a canonical counterpart that covers them in search)
const AVAILABLE = CALC_INDEX.filter((c) => c.available && !c.navHidden);

interface CalcSearchProps {
  variant: 'hero' | 'header' | 'drawer';
  placeholder?: string;
  /** Called after navigation — used by the mobile drawer to close itself. */
  onNavigate?: () => void;
}

function score(entry: CalcEntry, q: string): number {
  const lq = q.toLowerCase();
  if (entry.label.toLowerCase() === lq) return 3;
  if (entry.label.toLowerCase().startsWith(lq)) return 2;
  if (entry.label.toLowerCase().includes(lq)) return 1.5;
  if (entry.description.toLowerCase().includes(lq)) return 1;
  if (entry.category.toLowerCase().includes(lq)) return 0.5;
  return 0;
}

export default function CalcSearch({
  variant,
  placeholder = 'Search calculators...',
  onNavigate,
}: CalcSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { region } = useRegion();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return AVAILABLE
      .map((entry) => ({ entry, s: score(entry, q) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map(({ entry }) => entry);
  }, [query]);

  useEffect(() => {
    setOpen(results.length > 0);
  }, [results]);

  // Close on click outside
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Resolves regionRoutes for entries that have country-specific pages
  const navigate = useCallback(
    (entry: CalcEntry) => {
      const href = entry.regionRoutes?.[region] ?? entry.href;
      setOpen(false);
      setQuery('');
      router.push(href);
      onNavigate?.();
    },
    [router, region, onNavigate],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'Enter') {
      submitQuery();
    }
  }

  function submitQuery() {
    const q = query.trim();
    if (!q) return;
    const topScore = results.length > 0 ? score(results[0], q) : 0;
    if (results.length === 1 || topScore === 3) {
      navigate(results[0]);
    } else {
      setOpen(false);
      setQuery('');
      router.push(`/calculators?q=${encodeURIComponent(q)}`);
      onNavigate?.();
    }
  }

  const compactInputCls = {
    header: 'w-full rounded-lg border border-[#E4E9EF] bg-[#F4F6F8] pl-9 pr-4 py-2 text-sm text-brand-navy placeholder:text-[#9BA8B5] focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/[0.15] transition-colors',
    drawer: 'w-full rounded-lg border border-[#E4E9EF] bg-[#F4F6F8] pl-9 pr-4 py-2.5 text-sm text-brand-navy placeholder:text-[#9BA8B5] focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/[0.15] transition-colors',
  } as const;

  // Shared input props
  const inputProps = {
    type: 'search' as const,
    value: query,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
    onKeyDown: handleKeyDown,
    onFocus: () => { if (results.length > 0) setOpen(true); },
    placeholder,
    'aria-label': 'Search calculators',
    'aria-expanded': open,
    'aria-haspopup': 'listbox' as const,
    autoComplete: 'off' as const,
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* ── Hero variant: large pill + CTA button ── */}
      {variant === 'hero' ? (
        <div
          className="flex items-center rounded-full border border-brand-gray-200 bg-white transition-all focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/[0.12]"
          style={{ boxShadow: '0 2px 12px rgba(13,27,42,0.09)' }}
        >
          <Search className="ml-5 h-4 w-4 shrink-0 text-brand-gray-400" aria-hidden />
          <input
            {...inputProps}
            className="min-w-0 flex-1 cursor-text bg-transparent px-3 py-[13px] md:py-[18px] text-[15px] text-brand-navy placeholder:text-brand-gray-400 focus:outline-none"
            style={{ caretColor: '#1DB584' }}
          />
          <button
            type="button"
            onClick={submitQuery}
            className="m-2 shrink-0 rounded-full bg-brand-teal px-6 py-2.5 md:py-3.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-teal-dark"
          >
            Find Calculator
          </button>
        </div>
      ) : (
        /* ── Header / drawer variant: compact input ── */
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#9BA8B5' }}
            aria-hidden="true"
          />
          <input
            {...inputProps}
            className={compactInputCls[variant as 'header' | 'drawer']}
          />
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Calculator search results"
          className={`absolute z-50 mt-1.5 overflow-hidden rounded-xl border border-[#E4E9EF] bg-white py-1 ${variant === 'header' ? 'w-80 right-0' : 'w-full'}`}
          style={{ boxShadow: '0 8px 32px rgba(13,27,42,0.12)' }}
        >
          {results.map((entry) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.href}
                role="option"
                type="button"
                onClick={() => navigate(entry)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#F4F6F8] focus:bg-[#F4F6F8] focus:outline-none"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: entry.iconBg }}
                  aria-hidden="true"
                >
                  <Icon size={15} style={{ color: entry.iconColor }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-brand-navy">
                    {entry.searchLabel ?? entry.label}
                  </span>
                  <span className="block truncate text-xs" style={{ color: '#6B7A8D' }}>
                    {entry.category} · {regionBadge(entry)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
