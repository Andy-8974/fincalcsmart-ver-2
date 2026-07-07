'use client';

import Link from 'next/link';
import { useRegion } from '@/lib/region/context';

// ── Footer link data (mirrors header nav, same slugs) ────────────────────────

type FooterLink = {
  label: string;
  href: string;
  /** When set, href is overridden by the matching country URL */
  regionRoutes?: { ca: string; us: string };
};

const FOOTER_LINKS: Record<string, FooterLink[]> = {
  Mortgage: [
    {
      label: 'Mortgage',
      href: '/canadian-mortgage-calculator',
      regionRoutes: { ca: '/canadian-mortgage-calculator', us: '/us-mortgage-calculator' },
    },
    { label: 'Mortgage Qualifier Calculator', href: '/mortgage-qualifier-calculator' },
    { label: 'CMHC Insurance Calculator',     href: '/cmhc-mortgage-insurance-calculator' },
    { label: 'Rent vs. Buy Calculator',       href: '/rent-vs-buy-calculator' },
    { label: 'Mortgage Refinance Calculator', href: '/mortgage-refinance-calculator' },
  ],
  'Financial Planning': [
    { label: 'Net Worth Calculator',      href: '/net-worth-calculator' },
    { label: 'Emergency Fund Calculator', href: '/emergency-fund-calculator' },
    { label: 'TFSA Calculator',           href: '/tfsa-calculator' },
    { label: 'RRSP Savings Calculator',   href: '/rrsp-savings-calculator' },
    { label: 'Savings Goal Calculator',   href: '/savings-goal-calculator' },
  ],
  Investing: [
    { label: 'Compound Interest Calculator', href: '/compound-interest-calculator' },
    { label: 'ROI Calculator',               href: '/roi-calculator' },
    { label: 'Investment Fees Calculator',   href: '/investment-fees-calculator' },
    { label: 'Lump Sum vs Monthly Investment', href: '/lump-sum-vs-dca-calculator' },
  ],
  Retirement: [
    { label: 'FIRE Calculator',                  href: '/fire-calculator' },
    { label: 'Retirement Savings Calculator',     href: '/retirement-planning-calculator' },
    { label: 'Retirement Withdrawal Calculator', href: '/retirement-withdrawal-calculator' },
  ],
  Loans: [
    { label: 'Personal Loan Calculator',  href: '/personal-loan-calculator' },
    { label: 'Car Loan Calculator',       href: '/car-loan-calculator' },
    { label: 'Debt Repayment Calculator', href: '/debt-repayment-calculator' },
  ],
  'Tax & Salary': [
    { label: 'Income Tax Calculator', href: '/income-tax-calculator' },
    { label: 'Salary Calculator',     href: '/salary-calculator' },
    { label: 'Sales Tax Calculator',  href: '/sales-tax-calculator' },
  ],
};

// ── Inline SVG social icons (no extra dependency in server component) ─────────

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

const SOCIALS = [
  { label: 'Follow us on X',      href: 'https://x.com/FSamrt75467',                             icon: XIcon,        external: true },
  { label: 'Connect on LinkedIn', href: 'https://www.linkedin.com/in/fincalc-smart-51198140a/', icon: LinkedInIcon, external: true },
  { label: 'Email us',            href: 'mailto:contact@fincalcsmart.com',                        icon: MailIcon,     external: false },
];

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Dark navy footer.
 * Background: #060F1A (Navy Deep) per brand guidelines.
 * Brand column: logo matches header wordmark exactly + social icons in dark tiles.
 */
export default function SiteFooter() {
  const { region } = useRegion();

  return (
    <footer style={{ background: '#060F1A' }}>

      {/* ── Link grid ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-8 sm:gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">

          {/* ── Brand column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-1">

            {/* Logo — identical markup to SiteHeader wordmark */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-white"
              style={{ letterSpacing: '-0.5px' }}
              aria-label="FinCalc Smart Pro home"
            >
              <span>
                FinCalc <span style={{ color: '#1DB584' }}>Smart.</span>
              </span>
              <span className="border border-slate-500 text-slate-400 text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded leading-none">
                PRO
              </span>
            </Link>

            {/* Tagline */}
            <p
              className="mt-3 text-[13px] leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.48)' }}
            >
              Free financial calculators for the USA &amp; Canada. Estimate, compare, and understand your numbers.
            </p>

            {/* Social icons — dark rounded-square tiles below tagline */}
            <div className="mt-5 flex items-center gap-2.5">
              {SOCIALS.map(({ label, href, icon: Icon, external }) => (
                <a
                  key={href}
                  href={href}
                  aria-label={label}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="group flex items-center justify-center rounded-[10px] transition-all duration-150"
                  style={{
                    width: 38,
                    height: 38,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    color: 'rgba(255,255,255,0.45)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget;
                    el.style.background = 'rgba(29,181,132,0.15)';
                    el.style.borderColor = 'rgba(29,181,132,0.35)';
                    el.style.color = '#1DB584';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    el.style.background = 'rgba(255,255,255,0.06)';
                    el.style.borderColor = 'rgba(255,255,255,0.09)';
                    el.style.color = 'rgba(255,255,255,0.45)';
                  }}
                >
                  <Icon />
                </a>
              ))}
            </div>

          </div>

          {/* ── Calculator link columns ──────────────────────────────────── */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3
                className="mb-4 text-xs font-bold uppercase tracking-[0.12em]"
                style={{ color: 'rgba(255,255,255,0.60)' }}
              >
                {category}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.regionRoutes?.[region] ?? link.href}
                      className="text-xs font-medium text-white/80 transition-colors duration-150 hover:text-brand-teal"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>
      </div>

      {/* ── Disclaimer ─────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
          <p className="text-center text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.30)' }}>
            FinCalc Smart tools and AI-assisted insights are for informational purposes only and do not constitute financial advice.
          </p>
        </div>
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs sm:flex-row lg:px-8"
          style={{ color: 'rgba(255,255,255,0.32)' }}
        >
          <p>© {new Date().getFullYear()} FinCalc Smart Pro. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/about"   className="transition-colors hover:text-brand-teal">About</Link>
            <Link href="/privacy" className="transition-colors hover:text-brand-teal">Privacy</Link>
            <Link href="/terms"   className="transition-colors hover:text-brand-teal">Terms</Link>
            <Link href="/sitemap" className="transition-colors hover:text-brand-teal">Sitemap</Link>
          </div>
        </div>
      </div>

    </footer>
  );
}
