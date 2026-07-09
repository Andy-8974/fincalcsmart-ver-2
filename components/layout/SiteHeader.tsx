'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { X as CloseIcon, Menu, ChevronDown, ArrowRight } from 'lucide-react';
import CalcSearch from '@/components/ui/CalcSearch';
import { useRegion } from '@/lib/region/context';
import { USFlagIcon, CAFlagIcon } from '@/components/ui/FlagIcons';
import { CALC_INDEX } from '@/lib/calculators';

// ── Mega-menu data ────────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  'Mortgage', 'Financial Planning', 'Investing',
  'Retirement', 'Loans', 'Tax & Salary',
] as const;

const CATEGORY_COLOR: Record<string, string> = {
  'Mortgage':           '#1DB584',
  'Financial Planning': '#F59E0B',
  'Investing':          '#0EA5E9',
  'Retirement':         '#F97316',
  'Loans':              '#3B82F6',
  'Tax & Salary':       '#8B5CF6',
};

const MEGA_CATEGORIES = CATEGORY_ORDER.map(cat => ({
  label: cat,
  color: CATEGORY_COLOR[cat],
  items: CALC_INDEX.filter(e => e.category === cat && !e.navHidden),
}));

const NAV_LABEL: Record<string, string> = {
  // Mortgage — canonical entry label shown in nav (US Mortgage is navHidden, routed via regionRoutes)
  'Canadian Mortgage Calculator':      'Mortgage',
  'Mortgage Qualifier Calculator':     'Mortgage Qualifier',
  'CMHC Insurance Calculator':         'CMHC Insurance',
  'Rent vs. Buy Calculator':           'Rent vs. Buy',
  'Mortgage Refinance Calculator':     'Mortgage Refinance',
  // Financial Planning
  'Net Worth Calculator':              'Net Worth',
  'Emergency Fund Calculator':         'Emergency Fund',
  'TFSA Calculator':                   'TFSA',
  'RRSP Savings Calculator':           'RRSP Savings',
  // Investing
  'Compound Interest Calculator':      'Compound Interest',
  'ROI Calculator':                    'ROI',
  'Investment Fees Calculator':        'Investment Fees',
  'Lump Sum vs Monthly Investment Calculator': 'Lump Sum vs Monthly',
  'Rule of 72 Calculator':             'Rule of 72',
  // Retirement
  'FIRE Calculator':                   'FIRE',
  'Retirement Savings Calculator':     'Retirement Savings',
  'Retirement Planning Calculator':    'Retirement Planning',
  'Retirement Withdrawal Calculator':  'Retirement Withdrawal',
  // Loans
  'Personal Loan Calculator':          'Personal Loan',
  'Car Loan Calculator':               'Car Loan',
  'Debt Repayment Calculator':         'Debt Repayment',
  // Tax & Salary
  'Income Tax Calculator':             'Income Tax',
  'Salary Calculator':                 'Salary',
  'Sales Tax Calculator':              'Sales Tax',
};

// ── Mega-menu panel ───────────────────────────────────────────────────────────

function MegaMenu({ onClose, region }: { onClose: () => void; region: 'ca' | 'us' }) {
  return (
    <div
      className="w-[648px]"
      style={{
        background: 'white',
        border: '1px solid rgba(13,27,42,0.10)',
        borderRadius: '16px',
        boxShadow: '0 20px 56px rgba(13,27,42,0.13), 0 4px 14px rgba(13,27,42,0.06)',
      }}
    >
      {/* ── 3-column grid ── */}
      <div className="grid grid-cols-3 p-4 pb-3">
        {MEGA_CATEGORIES.map(({ label, color, items }) => (
          <div key={label} className="px-2.5 py-1.5">

            {/* Category heading */}
            <p
              className="mb-2 text-[10px] font-bold uppercase tracking-[0.10em]"
              style={{ color }}
            >
              {label}
            </p>

            {/* Items */}
            <div className="space-y-px">
              {items.map((item) => {
                const Icon = item.icon;

                const iconEl = (
                  <span
                    className="flex shrink-0 items-center justify-center rounded-[6px]"
                    style={{
                      width: 20, height: 20,
                      background: item.iconBg,
                      opacity: item.available ? 1 : 0.5,
                    }}
                  >
                    <Icon size={10} color={item.iconColor} />
                  </span>
                );

                return item.available ? (
                  <Link
                    key={item.href}
                    href={item.regionRoutes?.[region] ?? item.href}
                    onClick={onClose}
                    className="group flex items-center gap-2 rounded-[7px] px-1.5 py-[4px] transition-colors duration-100"
                    style={{ color: '#0F172A' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(13,27,42,0.05)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {iconEl}
                    <span className="flex-1 text-[12px] font-semibold leading-snug">
                      {NAV_LABEL[item.label] ?? item.label}
                    </span>
                  </Link>
                ) : (
                  <div
                    key={item.href}
                    className="flex items-center gap-2 rounded-[7px] px-1.5 py-[4px]"
                    style={{ cursor: 'default' }}
                  >
                    {iconEl}
                    <span className="flex-1 text-[12px] font-medium leading-snug" style={{ color: '#B0BBCA' }}>
                      {NAV_LABEL[item.label] ?? item.label}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold"
                      style={{ background: '#F0F3F6', color: '#A0AABB' }}
                    >
                      Soon
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer strip ── */}
      <div
        className="flex items-center justify-center px-4 py-2.5"
        style={{ borderTop: '1px solid rgba(13,27,42,0.06)' }}
      >
        <Link
          href="/calculators"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-teal transition-opacity hover:opacity-70"
        >
          Browse all calculators
          <ArrowRight size={12} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SiteHeader() {
  const { region, setRegion } = useRegion();
  const [megaOpen, setMegaOpen]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  function openMega() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setMegaOpen(true);
  }

  function scheduleMegaClose() {
    leaveTimer.current = setTimeout(() => setMegaOpen(false), 140);
  }

  return (
    <>
      {/* ════════════ FLOATING PILL HEADER ════════════
          sticky top-0 with pt-3 gap so the pill visually
          floats above the hero content, not flush to edge.
      ══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-[500] w-full pt-3">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div
            className="flex h-[58px] lg:h-[68px] items-center justify-between gap-4 rounded-full px-7 lg:px-10"
            style={{
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(24px) saturate(200%)',
              WebkitBackdropFilter: 'blur(24px) saturate(200%)',
              border: '1px solid rgba(13,27,42,0.07)',
              boxShadow: '0 2px 20px rgba(13,27,42,0.08), 0 1px 3px rgba(13,27,42,0.04)',
            }}
          >

            {/* ══ LEFT GROUP: logo + nav ══ */}
            <div className="flex items-center gap-5">

              {/* ── Wordmark ── */}
              <Link
                href="/"
                className="shrink-0 inline-flex items-center gap-2 text-xl font-black tracking-tight text-brand-navy"
                style={{ letterSpacing: '-0.5px' }}
                aria-label="FinCalc Smart Pro home"
              >
                <span>FinCalc <span style={{ color: '#1DB584' }}>Smart.</span></span>
                <span className="border border-brand-gray-200 text-brand-gray-400 text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded leading-none">
                  PRO
                </span>
              </Link>

              {/* ── Desktop nav ── */}
              <nav
                className="hidden lg:flex items-center gap-0.5 relative"
                aria-label="Main navigation"
              >
                {/* Calculators trigger */}
                <div
                  className="relative h-[56px] flex items-center"
                  onMouseEnter={openMega}
                  onMouseLeave={scheduleMegaClose}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1 px-3.5 py-1.5 text-[14px] font-medium transition-all duration-150 rounded-lg"
                    style={{
                      color:      megaOpen ? '#1DB584' : '#374151',
                      background: megaOpen ? 'rgba(29,181,132,0.09)' : 'transparent',
                    }}
                    aria-haspopup="true"
                    aria-expanded={megaOpen}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        megaOpen ? setMegaOpen(false) : openMega();
                      } else if (e.key === 'Escape' && megaOpen) {
                        e.preventDefault();
                        setMegaOpen(false);
                      }
                    }}
                  >
                    Calculators
                    <ChevronDown
                      size={13}
                      style={{
                        color: megaOpen ? '#1DB584' : '#9BA8B5',
                        transform: megaOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 200ms',
                        flexShrink: 0,
                      }}
                    />
                  </button>
                </div>

                {/* AI Insights — placeholder link */}
                <Link
                  href="/ai-insights"
                  className="px-3.5 py-1.5 text-[14px] font-medium rounded-lg transition-colors duration-150"
                  style={{ color: '#374151' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#1DB584'; e.currentTarget.style.background = 'rgba(29,181,132,0.07)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.background = 'transparent'; }}
                >
                  AI Insights
                </Link>

                {/* Financial Guides — placeholder link */}
                <Link
                  href="/guides"
                  className="px-3.5 py-1.5 text-[14px] font-medium rounded-lg transition-colors duration-150"
                  style={{ color: '#374151' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#1DB584'; e.currentTarget.style.background = 'rgba(29,181,132,0.07)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.background = 'transparent'; }}
                >
                  Financial Guides
                </Link>

                {/* Mega panel — drops from nav left edge */}
                {megaOpen && (
                  <div
                    className="absolute top-full left-0 z-50 mt-2"
                    onMouseEnter={openMega}
                    onMouseLeave={scheduleMegaClose}
                  >
                    <MegaMenu onClose={() => setMegaOpen(false)} region={region} />
                  </div>
                )}
              </nav>
            </div>

            {/* ══ RIGHT GROUP: search + region ══ */}
            <div className="hidden lg:flex items-center gap-2.5 shrink-0">
              <div className="w-[200px]">
                <CalcSearch variant="header" />
              </div>

              <div
                role="group"
                aria-label="Select region"
                className="inline-flex items-center rounded-full border"
                style={{ borderColor: 'rgba(29,181,132,0.28)', background: 'rgba(29,181,132,0.04)' }}
              >
                {([
                  { value: 'us' as const, label: 'USA',    Flag: USFlagIcon },
                  { value: 'ca' as const, label: 'Canada', Flag: CAFlagIcon },
                ] as const).map(({ value, label, Flag }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRegion(value)}
                    aria-pressed={region === value}
                    className="flex items-center gap-1.5 rounded-full px-3.5 py-[6px] text-[12.5px] font-semibold transition-all duration-150 whitespace-nowrap"
                    style={{
                      background: region === value ? '#0D1B2A' : 'transparent',
                      color:      region === value ? 'white'   : '#374151',
                    }}
                  >
                    <Flag />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Mobile: hamburger ── */}
            <button
              type="button"
              className="lg:hidden flex items-center justify-center p-2.5 rounded-lg transition-colors"
              style={{ color: '#374151' }}
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <CloseIcon size={22} /> : <Menu size={22} />}
            </button>

          </div>
        </div>
      </header>

      {/* ════════════════════════════ MOBILE MENU OVERLAY ════════════════════════
          White/glass drawer — flex column so CTA is always pinned to bottom.
          top-[70px] = 12px (pt-3 gap) + 58px (mobile pill height)
      ══════════════════════════════════════════════════════════════════════════ */}
      {mobileOpen && (
        <div
          className="fixed inset-x-0 top-[70px] bottom-0 z-[499] flex flex-col lg:hidden"
          style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(13,27,42,0.07)',
          }}
        >
          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4">

            {/* Region toggle */}
            <div
              role="group"
              aria-label="Select region"
              className="mb-4 flex w-full rounded-full border"
              style={{ borderColor: 'rgba(29,181,132,0.28)', background: 'rgba(29,181,132,0.04)' }}
            >
              {([
                { value: 'us' as const, label: 'USA',    Flag: USFlagIcon },
                { value: 'ca' as const, label: 'Canada', Flag: CAFlagIcon },
              ] as const).map(({ value, label, Flag }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRegion(value)}
                  aria-pressed={region === value}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-all duration-150"
                  style={{
                    background: region === value ? '#0D1B2A' : 'transparent',
                    color:      region === value ? 'white'   : '#374151',
                  }}
                >
                  <Flag />
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="mb-4">
              <CalcSearch variant="drawer" onNavigate={() => setMobileOpen(false)} />
            </div>

            {/* Flat category list with available / soon distinction */}
            {MEGA_CATEGORIES.map(({ label, color, items }, idx) => (
              <div key={label} className={idx < MEGA_CATEGORIES.length - 1 ? 'mb-3.5' : ''}>
                <p
                  className="mb-1.5 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color }}
                >
                  {label}
                </p>
                <div>
                  {items.map(({ label: itemLabel, href, icon: Icon, iconColor, iconBg, available }) => {
                    const row = (
                      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                        <span
                          className="flex shrink-0 items-center justify-center rounded-[9px]"
                          style={{ width: 32, height: 32, background: iconBg, opacity: available ? 1 : 0.45 }}
                        >
                          <Icon size={15} color={iconColor} />
                        </span>
                        <span
                          className="flex-1 text-[13.5px] font-medium"
                          style={{ color: available ? '#0F172A' : '#B0BBCA' }}
                        >
                          {itemLabel}
                        </span>
                        {!available && (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold"
                            style={{ background: '#F0F3F6', color: '#A0AABB' }}
                          >
                            Soon
                          </span>
                        )}
                      </div>
                    );

                    return available ? (
                      <Link
                        key={href}
                        href={href}
                        className="block rounded-xl transition-colors hover:bg-brand-teal/[0.06]"
                        onClick={() => setMobileOpen(false)}
                      >
                        {row}
                      </Link>
                    ) : (
                      <div key={href} className="cursor-default">{row}</div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Secondary links — AI Insights & Financial Guides */}
            <div>
              <Link
                href="/ai-insights"
                className="block rounded-xl transition-colors hover:bg-brand-teal/[0.06]"
                onClick={() => setMobileOpen(false)}
              >
                <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <span className="flex-1 text-[13.5px] font-medium" style={{ color: '#0F172A' }}>
                    AI Insights
                  </span>
                </div>
              </Link>
              <Link
                href="/guides"
                className="block rounded-xl transition-colors hover:bg-brand-teal/[0.06]"
                onClick={() => setMobileOpen(false)}
              >
                <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <span className="flex-1 text-[13.5px] font-medium" style={{ color: '#0F172A' }}>
                    Financial Guides
                  </span>
                </div>
              </Link>
            </div>

          </div>

          {/* ── Pinned bottom CTA ── */}
          <div
            className="shrink-0 px-5 py-4"
            style={{ borderTop: '1px solid rgba(13,27,42,0.07)', background: 'rgba(255,255,255,0.97)' }}
          >
            <Link
              href="/calculators"
              className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold text-white transition-colors"
              style={{ background: '#1DB584' }}
              onClick={() => setMobileOpen(false)}
            >
              Browse All Calculators
              <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
