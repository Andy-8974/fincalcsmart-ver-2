import type { Metadata } from 'next';
import CalculatorsClient from './CalculatorsClient';

export const metadata: Metadata = {
  title: 'All Financial Calculators',
  description: 'Free, accurate financial calculators for mortgages, loans, retirement, taxes, and more — built for Canada and the USA. No sign-up required.',
};

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function CalculatorsPage({ searchParams }: PageProps) {
  const { q, category } = await searchParams;
  const initialQuery    = typeof q        === 'string' ? q.trim()        : '';
  const initialCategory = typeof category === 'string' ? category.trim() : '';

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        marginTop: '-80px',
        paddingTop: '80px',
        background: [
          'radial-gradient(ellipse 700px 500px at top center, rgba(29,181,132,0.07) 0%, transparent 70%)',
          'radial-gradient(ellipse 500px 400px at top right, rgba(14,165,233,0.05) 0%, transparent 100%)',
          'linear-gradient(180deg, #f3f7fd 0px, #f5f8fd 300px, #F8FAFB 600px)',
        ].join(', '),
      }}
    >
      <CalculatorsClient initialQuery={initialQuery} initialCategory={initialCategory} />
    </div>
  );
}
