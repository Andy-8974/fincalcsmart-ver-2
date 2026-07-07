'use client';

import { ChevronDown } from 'lucide-react';

// Sticky header height on mobile: pt-3 (12px) + h-[58px] = 70px.
// Add 10px breathing room → 80px offset.
const HEADER_OFFSET = 80;

export default function MobileCalcCTA() {
  function scrollToResults() {
    const el = document.getElementById('calc-results');
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  return (
    <button
      type="button"
      onClick={scrollToResults}
      className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-bold text-white transition-colors active:opacity-90"
      style={{ background: '#1DB584' }}
    >
      Calculate &amp; View Results
      <ChevronDown size={13} aria-hidden />
    </button>
  );
}
