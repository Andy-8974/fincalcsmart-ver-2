import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleLayout from '@/app/guides/_shared/ArticleLayout';

export const metadata: Metadata = {
  title: 'About FinCalc Smart',
  description:
    'FinCalc Smart provides free, easy-to-use financial calculators with AI-assisted insights and downloadable PDF reports for Canada and the USA.',
};

const VALUES = [
  {
    title: 'Clarity first',
    body: 'We present numbers clearly so you can understand what they mean, not just what they are.',
  },
  {
    title: 'Educational, not advisory',
    body: 'Our tools help you explore scenarios. They are not a substitute for advice from a qualified professional.',
  },
  {
    title: 'Privacy-conscious',
    body: 'Calculator inputs stay in your browser session. We do not require an account to use any calculator.',
  },
  {
    title: 'Practical tools',
    body: 'Every calculator is built around real decisions: mortgages, savings, debt, retirement, and more.',
  },
  {
    title: 'Free access',
    body: 'All calculators, AI insights, and PDF reports are available at no cost. No account required.',
  },
];

const OFFERINGS = [
  {
    title: 'Financial calculators',
    body: 'More than 20 calculators covering mortgages, retirement, investing, debt, tax, and more.',
  },
  {
    title: 'AI-assisted insights',
    body: 'Each calculator includes an analysis panel that explains what your results mean in plain language.',
  },
  {
    title: 'Visual charts and summaries',
    body: 'Interactive charts help you see how inputs affect outcomes at a glance.',
  },
  {
    title: 'Downloadable PDF reports',
    body: 'Save a formatted scenario summary for your records or to share with an advisor.',
  },
  {
    title: 'Canada and U.S. support',
    body: 'Most calculators work for both regions, with region-specific math and currency where applicable.',
  },
];

export default function AboutPage() {
  return (
    <ArticleLayout>
      <div className="mx-auto max-w-3xl px-4 py-14 space-y-14">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">About FinCalc Smart</h1>
          <p className="text-base text-slate-600 leading-relaxed">
            FinCalc Smart provides free, easy-to-use financial calculators with AI-assisted insights
            and downloadable PDF reports. Our tools are designed to help people in Canada and the
            United States explore financial scenarios clearly, without jargon or unnecessary complexity.
          </p>
        </section>

        {/* ── Mission ──────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Our Mission</h2>
          <p className="text-base text-slate-600 leading-relaxed">
            We believe that understanding your financial situation should not require a finance degree
            or an expensive advisor for every question. FinCalc Smart exists to make financial
            estimates accessible — so you can explore options, run numbers, and arrive at conversations
            with professionals better prepared.
          </p>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Our focus is on education, clarity, and practical planning tools that reflect real
            decisions people face: buying a home, saving for retirement, managing debt, or
            understanding how compound growth works over time.
          </p>
        </section>

        {/* ── What We Offer ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-5">What We Offer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {OFFERINGS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <h3 className="font-semibold text-slate-800 mb-1">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Our Values ───────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-5">Our Values</h2>
          <div className="space-y-4">
            {VALUES.map((v) => (
              <div key={v.title} className="flex gap-3">
                <div
                  className="mt-1 h-5 w-5 shrink-0 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(29,181,132,0.12)' }}
                >
                  <div className="h-2 w-2 rounded-full" style={{ background: '#1DB584' }} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{v.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{v.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Disclaimer ───────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-base font-bold text-amber-900 mb-2">Important Disclaimer</h2>
          <p className="text-sm text-amber-800 leading-relaxed">
            FinCalc Smart provides educational estimates based on the inputs you enter and standard
            financial formulas. Results are not financial, tax, legal, mortgage, or investment advice.
            Calculator outputs depend on assumptions that may not reflect your full situation. Before
            making major financial decisions, please consult a qualified professional — such as a
            financial advisor, mortgage broker, accountant, or lawyer.
          </p>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Start exploring</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/calculators"
              className="inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition"
              style={{ background: '#1DB584' }}
            >
              Browse All Calculators
            </Link>
            <Link
              href="/ai-insights"
              className="inline-block rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 transition"
            >
              View AI Insights
            </Link>
            <Link
              href="/guides"
              className="inline-block rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 transition"
            >
              Read Financial Guides
            </Link>
          </div>
        </section>

      </div>
    </ArticleLayout>
  );
}
