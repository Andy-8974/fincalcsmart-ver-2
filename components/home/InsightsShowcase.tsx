import {
  TrendingDown, TrendingUp, Sprout, Compass,
  AlertTriangle,
  Target, RefreshCw, Shield,
  type LucideIcon,
} from 'lucide-react';

export type WeekGroup = 0 | 1 | 2 | 3;

// ─── Insight type system ─────────────────────────────────────────────────────

type InsightType = 'opportunity' | 'risk' | 'strategy';

const TYPE_META: Record<InsightType, { label: string; color: string; bg: string }> = {
  opportunity: { label: 'Opportunity', color: '#1DB584', bg: 'rgba(29,181,132,0.11)' },
  risk:        { label: 'Risk signal', color: '#B07B2A', bg: 'rgba(176,123,42,0.11)'  },
  strategy:    { label: 'Next step',   color: '#3A5A8A', bg: 'rgba(58,90,138,0.11)'   },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface InsightItem {
  heading: string;
  body: string;
  Icon: LucideIcon;
  type: InsightType;
}

interface DonutSegment {
  label: string;
  pct: number;
  color: string;
}

interface Scenario {
  label: string;
  value: string;
  note: string;
  badge?: string;
}

interface Outcome {
  label: string;
  value: string;
  accent?: boolean;
  note?: string;
}

interface MockupField {
  label: string;
  value: string;
}

interface InsightGroup {
  title: string;
  category: string;
  accentColor: string;
  items: InsightItem[];
  mockup: {
    calculatorLabel: string;
    fields: MockupField[];
    donutSegments: DonutSegment[];
    donutCenter: { value: string; label: string };
    scenarioA: Scenario;
    scenarioB: Scenario;
    outcomes: [Outcome, Outcome];
  };
}

// ─── Hero donut chart ─────────────────────────────────────────────────────────
// Segmented ring with gaps — fresh style, distinct from mortgage calculator.

function HeroDonut({
  segments, centerValue, centerLabel,
}: {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
}) {
  const size = 104;
  const cx   = 52;
  const r    = 36;
  const circ = 2 * Math.PI * r;
  const GAP  = 4; // gap in path units between segments

  let cumFrac = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {/* Track ring */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8.5"
      />
      {/* Segments */}
      {segments.map((seg) => {
        const segLen     = Math.max(0, (seg.pct / 100) * circ - GAP);
        const dashOffset = -(cumFrac * circ);
        cumFrac += seg.pct / 100;
        return (
          <circle
            key={seg.label}
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="8.5"
            strokeLinecap="butt"
            strokeDasharray={`${segLen.toFixed(2)} ${circ.toFixed(2)}`}
            strokeDashoffset={dashOffset.toFixed(2)}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        );
      })}
      {/* Center value */}
      <text x={cx} y={cx + 3} textAnchor="middle"
        style={{ fontSize: 16, fontWeight: 800, fill: 'white', letterSpacing: -0.5 }}>
        {centerValue}
      </text>
      <text x={cx} y={cx + 17} textAnchor="middle"
        style={{ fontSize: 9, fill: 'rgba(255,255,255,0.55)', letterSpacing: 0.4 }}>
        {centerLabel}
      </text>
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const INSIGHT_GROUPS: Record<WeekGroup, InsightGroup> = {
  0: {
    title: 'Mortgage Savings',
    category: 'Mortgage',
    accentColor: '#1DB584',
    mockup: {
      calculatorLabel: 'Mortgage Calculator',
      fields: [
        { label: 'Home Price',    value: '$650,000' },
        { label: 'Down Payment', value: '$130,000' },
        { label: 'Rate',         value: '5.19%' },
      ],
      donutSegments: [
        { label: 'Principal', pct: 33, color: '#1DB584' },
        { label: 'Interest',  pct: 59, color: '#C9A84C' },
        { label: 'Insurance', pct:  8, color: 'rgba(255,255,255,0.22)' },
      ],
      donutCenter: { value: '$3,847', label: 'per month' },
      scenarioA: { label: 'Standard',  value: '$142,100', note: 'Total interest paid' },
      scenarioB: { label: '+$150/mo',  value: '$113,700', note: 'Total interest paid', badge: 'Saves $28,400' },
      outcomes: [
        { label: 'Interest saved', value: '~$28,400', accent: true, note: 'Sample mortgage scenario' },
        { label: 'Time saved',     value: '~2 years',               note: 'vs. standard payments' },
      ],
    },
    items: [
      {
        type: 'opportunity',
        Icon: TrendingDown,
        heading: 'Extra payments reduce total interest',
        body: 'Increasing your monthly payment by $150 can reduce total interest by tens of thousands over a full amortization period.',
      },
      {
        type: 'risk',
        Icon: AlertTriangle,
        heading: 'Down payment crosses a key threshold',
        body: 'Staying below 20% down triggers mortgage insurance — a cost that adds up significantly over the life of your loan.',
      },
      {
        type: 'strategy',
        Icon: Target,
        heading: 'Biweekly payments pay off faster',
        body: 'Accelerated biweekly payments may shorten your mortgage timeline by 3–4 years and meaningfully reduce total interest.',
      },
    ],
  },
  1: {
    title: 'Debt Payoff',
    category: 'Debt',
    accentColor: '#3B82F6',
    mockup: {
      calculatorLabel: 'Debt Payoff Calculator',
      fields: [
        { label: 'Total Debt',     value: '$24,500' },
        { label: 'Interest Rate',  value: '19.99%' },
        { label: 'Monthly Budget', value: '$1,200' },
      ],
      donutSegments: [
        { label: 'Paid off',  pct: 44, color: '#3B82F6' },
        { label: 'Remaining', pct: 56, color: 'rgba(255,255,255,0.13)' },
      ],
      donutCenter: { value: '44%', label: 'paid off' },
      scenarioA: { label: 'Min. payments', value: '48 months', note: '~$6,400 in interest' },
      scenarioB: { label: 'With strategy', value: '24 months', note: '~$3,200 in interest', badge: '2× faster' },
      outcomes: [
        { label: 'Payoff timeline',     value: '24 months', accent: true, note: 'Debt payoff sample'    },
        { label: 'Est. interest saved', value: '$3,200',                  note: 'vs. minimum payments' },
      ],
    },
    items: [
      {
        type: 'opportunity',
        Icon: TrendingDown,
        heading: 'Target your highest-rate debt first',
        body: 'Focusing extra payments on your highest-rate debt reduces total interest paid across all accounts over time.',
      },
      {
        type: 'risk',
        Icon: AlertTriangle,
        heading: 'Minimum payments extend your timeline',
        body: 'At 19.99% APR, paying only the minimum can more than double your repayment period and cost thousands in avoidable interest.',
      },
      {
        type: 'strategy',
        Icon: Target,
        heading: 'Consistency matters more than amount',
        body: 'Even small additional payments applied consistently can significantly reduce your payoff timeline over many years.',
      },
    ],
  },
  2: {
    title: 'Investment Growth',
    category: 'Investing',
    accentColor: '#8B5CF6',
    mockup: {
      calculatorLabel: 'Investment Calculator',
      fields: [
        { label: 'Initial Amount',   value: '$10,000' },
        { label: 'Monthly Contrib.', value: '$500' },
        { label: 'Expected Return',  value: '7.0%' },
      ],
      donutSegments: [
        { label: 'Growth',        pct: 56, color: '#8B5CF6' },
        { label: 'Contributions', pct: 44, color: 'rgba(255,255,255,0.20)' },
      ],
      donutCenter: { value: '$296K', label: '20-yr value' },
      scenarioA: { label: 'No extras',  value: '$196,400', note: 'Without extra contrib.' },
      scenarioB: { label: '+$500/mo',   value: '$296,400', note: 'With extra contrib.', badge: '+$100K' },
      outcomes: [
        { label: '20-year value', value: '$296,400', accent: true, note: 'Sample investment scenario'   },
        { label: 'Extra growth',  value: '~$100K',               note: 'vs. no extra contributions' },
      ],
    },
    items: [
      {
        type: 'opportunity',
        Icon: Sprout,
        heading: 'Start earlier, benefit from compounding',
        body: 'Starting contributions 5 years earlier can significantly increase your final portfolio value due to the compounding effect.',
      },
      {
        type: 'risk',
        Icon: AlertTriangle,
        heading: 'Return assumptions can be misleading',
        body: 'Even small deviations from your expected return rate compound significantly over 20 years — model conservative and optimistic scenarios.',
      },
      {
        type: 'strategy',
        Icon: RefreshCw,
        heading: 'Reinvesting dividends accelerates growth',
        body: 'Reinvesting dividends rather than withdrawing them accelerates long-term growth potential through compounding reinvestment.',
      },
    ],
  },
  3: {
    title: 'Retirement Planning',
    category: 'Retirement',
    accentColor: '#C9A84C',
    mockup: {
      calculatorLabel: 'Retirement Calculator',
      fields: [
        { label: 'Current Age',     value: '35 years' },
        { label: 'Retirement Age',  value: '65 years' },
        { label: 'Monthly Savings', value: '$1,500' },
      ],
      donutSegments: [
        { label: 'Saved',  pct: 65, color: '#C9A84C' },
        { label: 'To go',  pct: 35, color: 'rgba(255,255,255,0.13)' },
      ],
      donutCenter: { value: '$1.2M', label: 'est. total' },
      scenarioA: { label: 'Current rate', value: '$800K', note: 'Est. by age 65' },
      scenarioB: { label: 'Optimized',    value: '$1.2M', note: 'Est. by age 65', badge: '+$400K' },
      outcomes: [
        { label: 'Est. retirement savings', value: '$1.2M',  accent: true, note: 'Sample retirement scenario' },
        { label: 'Monthly savings needed',  value: '$1,500',               note: 'to reach target'            },
      ],
    },
    items: [
      {
        type: 'opportunity',
        Icon: Compass,
        heading: 'Know your income replacement target',
        body: 'Estimating your retirement income needs early helps determine how much you should be saving today to reach your goal.',
      },
      {
        type: 'risk',
        Icon: AlertTriangle,
        heading: 'Withdrawing too early drains savings fast',
        body: 'Delaying withdrawals by even a few years can materially change how long your savings last and affect your tax situation.',
      },
      {
        type: 'strategy',
        Icon: Shield,
        heading: 'Tax-advantaged accounts reduce drag',
        body: 'Maximizing RRSP, TFSA, or 401(k) contributions can meaningfully reduce the tax drag on your retirement savings over time.',
      },
    ],
  },
};

interface Props {
  weekGroup: WeekGroup;
}

export default function InsightsShowcase({ weekGroup }: Props) {
  const group  = INSIGHT_GROUPS[weekGroup];
  const accent = group.accentColor;
  const { mockup } = group;

  return (
    <section className="bg-brand-gray-50 px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:gap-12 lg:grid-cols-[5fr_6fr] lg:items-start">

          {/* ── Left: redesigned calculator mockup ── */}
          <div className="relative">
            {/* Back card — depth effect */}
            <div
              className="absolute inset-x-3 -bottom-3 rounded-brand-xl border border-brand-gray-100 bg-white"
              style={{ boxShadow: '0 4px 16px rgba(13,27,42,0.05)' }}
              aria-hidden
            />

            {/* Main card */}
            <div
              className="relative overflow-hidden rounded-brand-xl border border-brand-gray-200 bg-white"
              style={{ boxShadow: '0 8px 32px rgba(13,27,42,0.10), 0 2px 8px rgba(13,27,42,0.06)' }}
            >
              {/* Window chrome */}
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ background: '#F8FAFB', borderBottom: '1px solid #E4E9EF' }}
              >
                <div className="flex items-center gap-1.5" aria-hidden>
                  <div className="h-2 w-2 rounded-full bg-red-300/70" />
                  <div className="h-2 w-2 rounded-full bg-amber-300/70" />
                  <div className="h-2 w-2 rounded-full bg-green-300/70" />
                </div>
                <span className="text-[11px] font-bold text-brand-gray-400">
                  {mockup.calculatorLabel}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: `${accent}15`, color: accent }}
                >
                  {group.category}
                </span>
              </div>

              {/* Sample inputs */}
              <div className="space-y-2 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gray-400">
                  Sample inputs
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {mockup.fields.map((f) => (
                    <div
                      key={f.label}
                      className="rounded-brand-sm border border-brand-gray-200 bg-brand-gray-50 px-3 py-2.5"
                    >
                      <p className="text-[9.5px] font-semibold uppercase tracking-wider text-brand-gray-400">
                        {f.label}
                      </p>
                      <p className="mt-1 text-[13px] font-bold text-brand-navy">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dark result panel */}
              <div
                className="mx-5 mb-5 rounded-brand-lg p-4"
                style={{
                  background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 100%)',
                  border: `1px solid ${accent}28`,
                }}
              >

                {/* ── Row 1: Hero donut + legend ── */}
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <HeroDonut
                      segments={mockup.donutSegments}
                      centerValue={mockup.donutCenter.value}
                      centerLabel={mockup.donutCenter.label}
                    />
                  </div>
                  {/* Legend */}
                  <div className="flex-1 space-y-2.5">
                    {mockup.donutSegments.map((seg) => (
                      <div key={seg.label} className="flex items-center gap-2">
                        <span
                          className="shrink-0 rounded-sm"
                          style={{ width: 9, height: 9, background: seg.color }}
                        />
                        <span className="flex-1 text-[11.5px] text-white/70">{seg.label}</span>
                        <span className="text-[11.5px] font-bold text-white/90">{seg.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="my-3.5 border-t border-white/[0.07]" />

                {/* ── Row 2: Scenario comparison ── */}
                <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/52">
                  Scenario comparison
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Scenario A — baseline */}
                  <div
                    className="rounded-brand-sm p-3"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <p className="text-[9.5px] font-semibold text-white/55 uppercase tracking-wider">
                      {mockup.scenarioA.label}
                    </p>
                    <p className="mt-1.5 text-[15px] font-extrabold leading-none text-white/80">
                      {mockup.scenarioA.value}
                    </p>
                    <p className="mt-1 text-[9.5px] text-white/45">{mockup.scenarioA.note}</p>
                  </div>

                  {/* Scenario B — strategy/highlighted */}
                  <div
                    className="rounded-brand-sm p-3"
                    style={{
                      background: `${accent}14`,
                      border: `1px solid ${accent}35`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: `${accent}CC` }}>
                        {mockup.scenarioB.label}
                      </p>
                      {mockup.scenarioB.badge && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[8.5px] font-bold leading-none"
                          style={{ background: `${accent}22`, color: accent }}
                        >
                          {mockup.scenarioB.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[15px] font-extrabold leading-none" style={{ color: accent }}>
                      {mockup.scenarioB.value}
                    </p>
                    <p className="mt-1 text-[9.5px]" style={{ color: `${accent}80` }}>
                      {mockup.scenarioB.note}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-3.5 border-t border-white/[0.07]" />

                {/* ── Row 3: Key outcomes ── */}
                <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/52">
                  Key outcomes
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {mockup.outcomes.map((o) => (
                    <div
                      key={o.label}
                      className="rounded-brand-sm p-3"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: o.accent ? `1px solid ${accent}38` : '1px solid rgba(255,255,255,0.09)',
                      }}
                    >
                      <p
                        className="text-[9.5px] font-semibold uppercase tracking-wider"
                        style={{ color: o.accent ? `${accent}AA` : 'rgba(255,255,255,0.48)' }}
                      >
                        {o.label}
                      </p>
                      <p
                        className="mt-2 font-extrabold leading-none"
                        style={{
                          fontSize: 22,
                          letterSpacing: '-0.5px',
                          color: 'rgba(255,255,255,0.92)',
                        }}
                      >
                        {o.value}
                      </p>
                      {o.note && (
                        <p
                          className="mt-1 text-[9px] leading-tight"
                          style={{ color: 'rgba(255,255,255,0.38)' }}
                        >
                          {o.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between border-t border-brand-gray-100 px-5 py-3"
                style={{ background: '#F8FAFB' }}
              >
                <p className="text-[11px] text-brand-gray-400">
                  This week:{' '}
                  <span className="font-semibold text-brand-navy">{group.title}</span>
                </p>
                <span
                  className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ borderColor: `${accent}40`, color: accent, background: `${accent}10` }}
                >
                  {group.category}
                </span>
              </div>
            </div>
          </div>

          {/* ── Right: section header + 3 typed insight items (unchanged) ── */}
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-brand-teal">
              AI-Assisted Insights
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
              Smarter insights built into every calculation
            </h2>
            <p className="mt-4 text-base leading-relaxed text-brand-gray-600">
              After your calculation, FinCalc Smart turns results into practical insights so you
              can understand risks, opportunities, and next steps.
            </p>

            <div className="mt-8 divide-y divide-brand-gray-100">
              {group.items.map((item) => {
                const meta = TYPE_META[item.type];
                return (
                  <div key={item.heading} className="flex gap-4 py-6 first:pt-0 last:pb-0">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-brand-md"
                      style={{ background: meta.bg }}
                    >
                      <item.Icon className="h-4 w-4" style={{ color: meta.color }} aria-hidden />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        <h3 className="text-[14.5px] font-bold leading-snug text-brand-navy">
                          {item.heading}
                        </h3>
                      </div>
                      <p className="mt-2 text-[14px] leading-relaxed text-brand-gray-600">
                        {item.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-8 text-xs text-brand-gray-400">
              AI-assisted insights are generated from calculator inputs and financial logic for
              informational purposes only. They are not financial advice.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
