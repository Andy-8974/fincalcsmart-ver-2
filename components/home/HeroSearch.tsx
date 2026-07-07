'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import CalcSearch from '@/components/ui/CalcSearch';

const CHIPS = [
  { label: 'Mortgage',           href: '/calculators?category=Mortgage' },
  { label: 'Loans',              href: '/calculators?category=Loans' },
  { label: 'Financial Planning', href: '/calculators?category=Financial%20Planning' },
  { label: 'Investing',          href: '/calculators?category=Investing' },
  { label: 'Tax & Salary',       href: '/calculators?category=Tax%20%26%20Salary' },
] as const;

export default function HeroSearch() {
  return (
    <div className="mt-8">
      <CalcSearch variant="hero" placeholder="Search calculators..." />

      {/* ── Shortcut chips — desktop only ── */}
      <div className="hidden lg:flex mt-3.5 flex-wrap gap-2">
        {CHIPS.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-full border border-brand-gray-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-brand-gray-600 transition-all hover:border-brand-teal/40 hover:bg-brand-teal/[0.05] hover:text-brand-teal"
            style={{ boxShadow: '0 1px 2px rgba(13,27,42,0.05)' }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── Browse link ── */}
      <div className="mt-5">
        <Link
          href="/calculators"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-brand-gray-400 transition-colors hover:text-brand-teal"
        >
          Browse all calculators
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
}
