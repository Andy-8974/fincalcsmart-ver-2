import Link from 'next/link';
import { ArrowRight, CheckCircle } from 'lucide-react';

interface GuideCTAProps {
  heading: string;
  benefits: string[];
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  /** Optional sentence rendered beneath the CTA buttons */
  note?: string;
}

/**
 * Reusable CTA block for /guides/[slug] article pages.
 * Teal-tinted card with benefit list and two action buttons.
 */
export default function GuideCTA({
  heading,
  benefits,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  note,
}: GuideCTAProps) {
  return (
    <div
      className="rounded-brand-xl px-8 py-10 sm:px-10 sm:py-12"
      style={{
        background: 'rgba(29,181,132,0.06)',
        border: '1px solid rgba(29,181,132,0.20)',
      }}
    >
      <h2
        className="font-extrabold text-[1.7rem] sm:text-[2rem] mb-6"
        style={{ color: '#0D1B2A', letterSpacing: '-0.3px' }}
      >
        {heading}
      </h2>

      <ul className="mb-7 flex flex-col gap-4">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3">
            <CheckCircle
              className="h-4 w-4 flex-shrink-0 mt-0.5"
              style={{ color: '#1DB584' }}
              aria-hidden
            />
            <span className="text-[14.5px] leading-snug" style={{ color: 'rgba(13,27,42,0.74)' }}>
              {benefit}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={primaryHref}
          className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#1DB584' }}
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href={secondaryHref}
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold transition-opacity hover:opacity-80"
          style={{ border: '1px solid rgba(13,27,42,0.18)', color: 'rgba(13,27,42,0.72)' }}
        >
          {secondaryLabel}
        </Link>
      </div>

      {note && (
        <p
          className="mt-5 text-[13px] leading-relaxed"
          style={{ color: 'rgba(13,27,42,0.58)' }}
        >
          {note}
        </p>
      )}
    </div>
  );
}
