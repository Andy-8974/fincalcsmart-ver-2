import type { ReactNode } from 'react';
import AdSlot from '@/components/ui/AdSlot';
import RegionToggle from '@/components/ui/RegionToggle';
import CalculatorFaqAccordion from './CalculatorFaqAccordion';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Faq {
  question: string;
  answer: string;
}

interface CalculatorLayoutProps {
  /** Page H1 — also populates FAQPage JSON-LD */
  heading: string;
  /** Short descriptor beneath the H1 in the hero strip */
  lede?: string;
  /** Show the US/CA region toggle in the hero strip (default: true) */
  showRegionToggle?: boolean;
  /**
   * The interactive calculator tool — rendered inside the calculator card
   * (or directly in the layout when noCard=true).
   */
  children: ReactNode;
  /** Formula & methodology section — rendered after the post-calculator ad */
  formulaSection?: ReactNode;
  /** Worked example scenarios — rendered between formula and FAQ */
  scenariosSection?: ReactNode;
  /** FAQ items — rendered as a semantic dl + injected as FAQPage JSON-LD */
  faqs?: Faq[];
  /**
   * When true, suppresses the outer white calculator card and the xl sidebar.
   * The calculator manages its own multi-column layout and card styling
   * internally. Formula, scenarios, and FAQ sections still render below.
   */
  noCard?: boolean;
}

// ── Main Layout ───────────────────────────────────────────────────────────────

/**
 * Master wrapper for every individual calculator page.
 *
 * Implements the brand "sandwich" layout:
 *   Dark navy hero (H1 + lede + region toggle)
 *   → Light gray body (calculator + ads + content)
 *   → Dark navy footer (in root layout)
 *
 * Ad slots use fixed IAB dimensions via inline styles — guaranteed CLS = 0.
 *
 * Render order (matches SEO manifesto):
 *   Hero strip → Leaderboard ad → Calculator card → Post-calc ad
 *   → Formula → [mid ad] → Scenarios → FAQ → FAQPage JSON-LD
 */
export default function CalculatorLayout({
  heading,
  lede,
  showRegionToggle = true,
  children,
  formulaSection,
  scenariosSection,
  faqs = [],
  noCard = false,
}: CalculatorLayoutProps) {
  const faqJsonLd =
    faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: { '@type': 'Answer', text: answer },
          })),
        }
      : null;

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════
          HERO STRIP — dark navy, satisfies brand "sandwich" top layer.
          H1 at 36px/800 per brand type scale. Region toggle on dark variant.
         ══════════════════════════════════════════════════════════════════ */}
      <div
        style={{ background: '#0D1B2A', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="flex flex-col gap-3 sm:gap-5 sm:flex-row sm:items-start sm:justify-between">

            <div>
              <h1
                className="font-extrabold text-white text-2xl sm:text-3xl md:text-4xl"
                style={{ letterSpacing: '-0.5px', lineHeight: '1.15' }}
              >
                {heading}
              </h1>
              {lede && (
                <p
                  className="mt-1.5 sm:mt-3 max-w-xl leading-relaxed"
                  style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.7' }}
                >
                  {lede}
                </p>
              )}
            </div>

            {showRegionToggle && (
              <div className="shrink-0 sm:pt-1">
                <RegionToggle variant="dark" />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          BODY — light gray (#F8FAFB).
          noCard=false (default): 70/30 content + xl sidebar grid.
          noCard=true: single column, calculator owns its own card.
         ══════════════════════════════════════════════════════════════════ */}
      <div style={{ background: '#F8FAFB' }} className="min-h-screen overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-2 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">

          {noCard ? (
            /* ── noCard: single column, no outer section card, no sidebar ── */
            <div className="space-y-6">

              {children}

              {formulaSection && (
                <section
                  aria-labelledby="formula-heading"
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #E4E9EF',
                    borderRadius: '16px',
                  }}
                  className="p-6 lg:p-8"
                >
                  <h2
                    id="formula-heading"
                    className="font-extrabold text-brand-navy"
                    style={{ fontSize: '24px', letterSpacing: '-0.3px' }}
                  >
                    How It Works
                  </h2>
                  <div
                    className="mt-4 space-y-4"
                    style={{ fontSize: '15px', color: '#374151', lineHeight: '1.7' }}
                  >
                    {formulaSection}
                  </div>
                </section>
              )}

              {formulaSection && scenariosSection && (
                <div className="flex justify-center">
                  <AdSlot variant="large-rectangle" />
                </div>
              )}

              {scenariosSection && (
                <section
                  aria-labelledby="scenarios-heading"
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #E4E9EF',
                    borderRadius: '16px',
                  }}
                  className="p-6 lg:p-8"
                >
                  <h2
                    id="scenarios-heading"
                    className="font-extrabold text-brand-navy"
                    style={{ fontSize: '24px', letterSpacing: '-0.3px' }}
                  >
                    Example Scenarios
                  </h2>
                  <div className="mt-4">{scenariosSection}</div>
                </section>
              )}

              {faqs.length > 0 && (
                <section
                  aria-labelledby="faq-heading"
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #E4E9EF',
                    borderRadius: '16px',
                  }}
                  className="p-6 lg:p-8"
                >
                  <h2
                    id="faq-heading"
                    className="font-extrabold text-brand-navy"
                    style={{ fontSize: '24px', letterSpacing: '-0.3px' }}
                  >
                    Frequently Asked Questions
                  </h2>
                  <CalculatorFaqAccordion faqs={faqs} />
                </section>
              )}

            </div>
          ) : (
            /* ── Default: 70/30 content + xl sidebar grid ─────────────── */
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_300px]">

              {/* ── MAIN COLUMN (≈70%) ──────────────────────────────────── */}
              <main className="min-w-0 space-y-6">

                {/* ── CALCULATOR CARD ─────────────────────────────────────
                    Brand spec: bg-white, 1.5px border #E4E9EF, radius 16px.
                    overflow:visible so tooltip popups are not clipped.
                   ──────────────────────────────────────────────────────── */}
                <section
                  aria-label={`${heading} calculator tool`}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #E4E9EF',
                    borderRadius: '16px',
                  }}
                >
                  <div className="p-0">
                    {children}
                  </div>
                </section>

                {/* Post-calculator ad — 336×280 large rectangle, centered. */}
                <div className="flex justify-center">
                  <AdSlot variant="large-rectangle" />
                </div>

                {/* ── FORMULA & METHODOLOGY ─────────────────────────────── */}
                {formulaSection && (
                  <section
                    aria-labelledby="formula-heading"
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #E4E9EF',
                      borderRadius: '16px',
                    }}
                    className="p-6 lg:p-8"
                  >
                    <h2
                      id="formula-heading"
                      className="font-extrabold text-brand-navy"
                      style={{ fontSize: '24px', letterSpacing: '-0.3px' }}
                    >
                      How It Works
                    </h2>
                    <div
                      className="mt-4 space-y-4"
                      style={{ fontSize: '15px', color: '#374151', lineHeight: '1.7' }}
                    >
                      {formulaSection}
                    </div>
                  </section>
                )}

                {/* Mid-content ad — only rendered between formula and scenarios. */}
                {formulaSection && scenariosSection && (
                  <div className="flex justify-center">
                    <AdSlot variant="large-rectangle" />
                  </div>
                )}

                {/* ── SCENARIO EXAMPLES ─────────────────────────────────── */}
                {scenariosSection && (
                  <section
                    aria-labelledby="scenarios-heading"
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #E4E9EF',
                      borderRadius: '16px',
                    }}
                    className="p-6 lg:p-8"
                  >
                    <h2
                      id="scenarios-heading"
                      className="font-extrabold text-brand-navy"
                      style={{ fontSize: '24px', letterSpacing: '-0.3px' }}
                    >
                      Example Scenarios
                    </h2>
                    <div className="mt-4">{scenariosSection}</div>
                  </section>
                )}

                {/* ── FAQ ─────────────────────────────────────────────────── */}
                {faqs.length > 0 && (
                  <section
                    aria-labelledby="faq-heading"
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #E4E9EF',
                      borderRadius: '16px',
                    }}
                    className="p-6 lg:p-8"
                  >
                    <h2
                      id="faq-heading"
                      className="font-extrabold text-brand-navy"
                      style={{ fontSize: '24px', letterSpacing: '-0.3px' }}
                    >
                      Frequently Asked Questions
                    </h2>
                    <CalculatorFaqAccordion faqs={faqs} />
                  </section>
                )}

              </main>

              {/* ── SIDEBAR (≈30%) ──────────────────────────────────────────
                  Half-page ad (300×600). Hidden below xl breakpoint.
                  sticky top = nav height (62px) + 16px gap = 78px.
                 ──────────────────────────────────────────────────────── */}
              <aside className="hidden xl:block">
                <div className="sticky top-[78px] space-y-6">
                  <AdSlot variant="half-page" />

                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #E4E9EF',
                      borderRadius: '16px',
                      padding: '20px',
                    }}
                  >
                    <h3
                      className="font-bold text-brand-navy"
                      style={{ fontSize: '13px', letterSpacing: '0.04em', marginBottom: 14 }}
                    >
                      Related Calculators
                    </h3>
                    <ul className="space-y-3">
                      {[
                        { label: 'US Mortgage Calculator',    href: '/us-mortgage-calculator' },
                        { label: 'CMHC Insurance Calculator', href: '#' },
                        { label: 'Mortgage Qualifier',        href: '#' },
                        { label: 'Compound Interest',         href: '/compound-interest-calculator' },
                        { label: 'FIRE Calculator',           href: '/fire-calculator' },
                      ].map(({ label, href }) => (
                        <li key={label}>
                          <Link
                            href={href}
                            className="transition-opacity hover:opacity-75"
                            style={{ fontSize: '13px', color: '#1DB584', fontWeight: 500 }}
                          >
                            {label} →
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </aside>

            </div>
          )}
        </div>
      </div>

      {/* ── FAQPage JSON-LD ─────────────────────────────────────────────── */}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          // Safe: assembled from our own static data, never from user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
    </>
  );
}

// ── Exported sub-components for calculator client components ─────────────────

/**
 * Wrap calculator output in ResultsPanel for brand-compliant dark navy styling.
 *
 * min-height reserves layout space before results compute, eliminating CLS.
 *
 * Usage (inside a 'use client' calculator):
 *   import { ResultsPanel } from '@/components/layout/CalculatorLayout';
 *   <ResultsPanel>
 *     <p style={{ color: '#1DB584', fontSize: 28, fontWeight: 800 }}>$3,190/mo</p>
 *   </ResultsPanel>
 */
export function ResultsPanel({
  children,
  minHeight = 140,
}: {
  children: ReactNode;
  minHeight?: number;
}) {
  return (
    <div
      style={{
        background: 'linear-gradient(150deg, #0D2137, #0A1628, #0D1B2A)',
        border: '1px solid rgba(29,181,132,0.15)',
        borderRadius: '12px',
        minHeight,
      }}
      className="mt-6 p-5"
    >
      {children}
    </div>
  );
}

/**
 * InputGrid — 2-column responsive grid for calculator form fields.
 * Matches brand spec: gap-4 on mobile, gap-x-8 gap-y-5 on md+.
 */
export function InputGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-8 md:gap-y-5">
      {children}
    </div>
  );
}

/**
 * FormLabel — brand-compliant field label.
 * Spec: 12–13px / 600 / #6B7A8D, block display.
 */
export function FormLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 flex items-center gap-1"
      style={{ fontSize: '12px', fontWeight: 600, color: '#6B7A8D' }}
    >
      {children}
    </label>
  );
}

/**
 * Brand-compliant input className string — import and apply directly.
 *
 * Usage:
 *   import { inputCls } from '@/components/layout/CalculatorLayout';
 *   <input className={inputCls} />
 *
 * Spec: 1.5px border #E4E9EF, radius 8px, focus ring teal #1DB584.
 */
export const inputCls =
  'w-full rounded-brand-sm border-[1.5px] border-brand-gray-200 text-brand-navy bg-brand-gray-50 ' +
  'px-3 py-2.5 text-sm transition-colors duration-150 ' +
  'focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/[0.15]';
