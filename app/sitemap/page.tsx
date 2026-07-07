import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleLayout from '@/app/guides/_shared/ArticleLayout';
import { CALC_INDEX } from '@/lib/calculators';

export const metadata: Metadata = {
  title: 'Sitemap',
  description: 'A full list of pages and financial calculators available on FinCalc Smart.',
};

const MAIN_PAGES = [
  { label: 'Home',             href: '/' },
  { label: 'About',            href: '/about' },
  { label: 'All Calculators',  href: '/calculators' },
  { label: 'AI Insights',      href: '/ai-insights' },
  { label: 'Financial Guides', href: '/guides' },
];

const GUIDES = [
  { label: 'Mortgage Affordability Guide',    href: '/guides/mortgage-affordability' },
  { label: 'How to Build an Emergency Fund',  href: '/guides/emergency-fund' },
  { label: 'Understanding Compound Interest', href: '/guides/compound-interest' },
  { label: 'How Much Do You Need to Retire?', href: '/guides/how-much-to-retire' },
];

const LEGAL = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Use',   href: '/terms' },
  { label: 'Sitemap',        href: '/sitemap' },
];

function SitemapGroup({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <section>
      <h2 className="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">
        {title}
      </h2>
      <ul className="space-y-2">
        {links.map(({ label, href }) => (
          <li key={href} className="flex items-baseline gap-2">
            <Link href={href} className="text-sm font-medium" style={{ color: '#1DB584' }}>
              {label}
            </Link>
            <span className="text-xs text-slate-400 font-mono">{href}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SitemapPage() {
  const publicCalcs = CALC_INDEX.filter((e) => e.available && !e.navHidden);

  const byCategory = publicCalcs.reduce<Record<string, typeof publicCalcs>>((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category].push(entry);
    return acc;
  }, {});

  return (
    <ArticleLayout>
      <div className="mx-auto max-w-3xl px-4 py-14 space-y-10">

        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Sitemap</h1>
          <p className="text-sm text-slate-500">All pages on FinCalc Smart.</p>
        </div>

        <SitemapGroup title="Main Pages" links={MAIN_PAGES} />

        {Object.entries(byCategory).map(([category, entries]) => (
          <SitemapGroup
            key={category}
            title={`${category} Calculators`}
            links={entries.map((e) => ({ label: e.label, href: e.href }))}
          />
        ))}

        <SitemapGroup title="Financial Guides" links={GUIDES} />

        <SitemapGroup title="Legal & Utility" links={LEGAL} />

      </div>
    </ArticleLayout>
  );
}
