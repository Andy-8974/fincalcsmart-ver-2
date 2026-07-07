import type { ReactNode } from 'react';

interface ArticleLayoutProps {
  children: ReactNode;
}

/**
 * Shared wrapper for all /guides/[slug] article pages.
 * Provides the ambient gradient background that extends behind the sticky nav
 * (via negative top margin) and through the full article body.
 */
export default function ArticleLayout({ children }: ArticleLayoutProps) {
  return (
    <div className="relative overflow-x-clip" style={{ marginTop: '-80px' }}>
      {/* Base: strong gradient near hero, fades to near-white for article body */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #E8F5EF 0%, #F0F9F5 12%, #F7FCFA 24%, #FAFCFB 36%, #FCFCFC 50%, #F9F9F9 100%)',
        }}
        aria-hidden
      />
      {/* Teal glow — top-left, fades out by ~30% of page height */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 8% 8%, rgba(29,181,132,0.18) 0%, rgba(29,181,132,0.06) 35%, transparent 55%)',
        }}
        aria-hidden
      />
      {/* Lavender glow — top-right only, contained to hero zone */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 90% 6%, rgba(109,99,236,0.08) 0%, rgba(139,92,246,0.03) 30%, transparent 48%)',
        }}
        aria-hidden
      />
      {/* Content — offset by nav height */}
      <div className="relative z-10" style={{ paddingTop: '80px' }}>
        {children}
      </div>
    </div>
  );
}
