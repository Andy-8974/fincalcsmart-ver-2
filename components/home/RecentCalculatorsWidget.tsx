'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { History, X } from 'lucide-react';
import { useRecentCalculators } from '@/lib/recent-calculators';

// Tracks whether the user has ever collapsed the list — not whether the whole widget is hidden.
const LIST_COLLAPSED_KEY = 'fcs-recent-widget-dismissed';

export default function RecentCalculatorsWidget() {
  const recent = useRecentCalculators();
  const [expanded, setExpanded] = useState(false);
  const hasDecidedInitialState = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // First time the widget has anything to show, auto-open the list once —
  // unless the user has already collapsed it on a previous visit.
  useEffect(() => {
    if (hasDecidedInitialState.current || recent.length === 0) return;
    hasDecidedInitialState.current = true;
    try {
      const hasCollapsedBefore = window.localStorage.getItem(LIST_COLLAPSED_KEY) === '1';
      setExpanded(!hasCollapsedBefore);
    } catch {
      setExpanded(true);
    }
  }, [recent]);

  useEffect(() => {
    if (!expanded) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expanded]);

  function handleCollapse(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded(false);
    try {
      window.localStorage.setItem(LIST_COLLAPSED_KEY, '1');
    } catch {
      // localStorage unavailable — preference just won't persist, non-critical
    }
  }

  if (recent.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className="fixed bottom-5 right-4 z-[60] flex flex-col items-end sm:right-6"
      style={{ maxWidth: '270px' }}
    >
      {expanded && (
        <div
          className="mb-2 w-[250px] overflow-hidden"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(15,41,66,0.09)',
            borderRadius: '14px',
            boxShadow: '0 8px 28px rgba(13,27,42,0.18)',
          }}
        >
          <div
            className="flex items-center justify-between px-3.5 py-2.5"
            style={{ borderBottom: '1px solid rgba(15,41,66,0.06)' }}
          >
            <span className="text-xs font-bold" style={{ color: '#0D1B2A' }}>
              Continue Planning
            </span>
            <button
              type="button"
              onClick={handleCollapse}
              aria-label="Collapse continue planning list"
              className="flex items-center justify-center rounded-full transition-colors"
              style={{ width: '22px', height: '22px', color: '#9BA8B5' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,41,66,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={13} />
            </button>
          </div>
          <div className="py-1.5">
            {recent.map((entry) => {
              const Icon = entry.icon;
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className="flex items-center gap-2.5 px-3.5 py-2 transition-colors"
                  style={{ color: '#0D1B2A' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(29,181,132,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{ width: '28px', height: '28px', borderRadius: '8px', background: entry.iconBg }}
                  >
                    <Icon size={14} color={entry.iconColor} />
                  </div>
                  <span className="truncate text-xs font-medium">{entry.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex items-center gap-2 transition-transform hover:-translate-y-0.5"
        style={{
          background: '#0D1B2A',
          color: '#FFFFFF',
          borderRadius: '999px',
          padding: '10px 16px',
          fontSize: '12px',
          fontWeight: 600,
          boxShadow: '0 4px 16px rgba(13,27,42,0.25)',
        }}
      >
        <History size={14} />
        Continue Planning
      </button>
    </div>
  );
}
