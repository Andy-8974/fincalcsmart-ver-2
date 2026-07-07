'use client';

// ─── Types (exported for calculator use) ─────────────────────────────────────

export interface RatioData {
  ratio: number;
  limit: number;
  label: string;
  sublabel: string;
}

export interface RateShockData {
  currentPayment: number;
  shockedPayment: number;
  difference: number;
  newRate: number;
}

export interface RoundUpData {
  extra: number;
  roundedPayment: number;
  yearsSaved: number;
  interestSaved: number;
}

export interface InsuranceThresholdData {
  type: 'CMHC' | 'PMI';
  amountNeeded: number;
  annualSavings: number;
  instantReturn: number;
  currentDownPct: number;
}

export interface InsightPanelProps {
  mainInsight: string;
  rateShock: RateShockData;
  roundUp: RoundUpData;
  insuranceThreshold: InsuranceThresholdData | null;
  primaryRatio?: RatioData;
  secondaryRatio?: RatioData;
  fmt: (n: number) => string;
  fmtx: (n: number) => string;
  /** Current down payment percentage — drives the Insurance Threshold fallback message */
  downPct: number;
  /** Region determines whether fallback labels say "CMHC" or "PMI" */
  region: 'CA' | 'US';
}

// ─── Ratio Gauge ──────────────────────────────────────────────────────────────

function RatioGauge({ data }: { data: RatioData }) {
  const fillPct = Math.min((data.ratio / data.limit) * 100, 105);
  const overLimit = data.ratio > data.limit;
  const nearLimit = data.ratio > data.limit * 0.85;

  const barColor = overLimit
    ? 'bg-rose-500'
    : nearLimit
    ? 'bg-amber-400'
    : 'bg-emerald-500';

  const valueColor = overLimit
    ? 'text-rose-700'
    : nearLimit
    ? 'text-amber-700'
    : 'text-emerald-700';

  const statusText = overLimit ? 'Exceeds limit' : nearLimit ? 'Near limit' : 'Within range';

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-xs font-bold text-slate-700">{data.label}</span>
          <span className="ml-1.5 text-xs text-slate-400">{data.sublabel}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-sm font-bold tabular-nums ${valueColor}`}>
            {data.ratio.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400">/ {data.limit}%</span>
        </div>
      </div>
      <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.min(fillPct, 100)}%` }}
        />
        {/* Limit marker */}
        <div className="absolute right-0 top-0 h-full w-0.5 bg-slate-400 opacity-60" />
      </div>
      <p className={`text-xs font-medium ${valueColor}`}>{statusText}</p>
    </div>
  );
}

// ─── Expert Trigger Card ──────────────────────────────────────────────────────

function TriggerCard({
  icon,
  title,
  borderColor,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border-l-[3px] ${borderColor} bg-white px-4 py-3`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</p>
      </div>
      <div className="text-sm text-slate-700 leading-relaxed">{children}</div>
    </div>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconZap = () => (
  <svg className="w-3.5 h-3.5 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
  </svg>
);

const IconTrend = () => (
  <svg className="w-3.5 h-3.5 text-sky-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const IconTarget = () => (
  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function InsightPanel({
  mainInsight,
  rateShock,
  roundUp,
  insuranceThreshold,
  primaryRatio,
  secondaryRatio,
  fmt,
  fmtx,
  downPct,
  region,
}: InsightPanelProps) {
  const hasRatios = primaryRatio !== undefined && secondaryRatio !== undefined;

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-slate-50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3" style={{ background: '#1DB584', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        <p className="text-xs font-bold uppercase tracking-widest text-white">
          FinCalcSmart Expert Analysis
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Affordability Ratios */}
        {hasRatios && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Affordability Assessment
            </p>
            <RatioGauge data={primaryRatio!} />
            <RatioGauge data={secondaryRatio!} />
            {primaryRatio!.label === 'GDS' && (
              <p className="text-xs text-slate-400 italic">
                Heating estimated at $150/mo for GDS calculation.
              </p>
            )}
          </div>
        )}

        {/* Market Context */}
        <div>
          <p className="text-base font-bold mb-1.5" style={{ color: '#0D1B2A' }}>
            Market Context
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">{mainInsight}</p>
        </div>

        {/* Expert Insight Triggers */}
        <div className="space-y-2.5">
          <p className="text-base font-bold mb-0.5" style={{ color: '#0D1B2A' }}>
            Expert Insights
          </p>

          {/* 1. Rate Shock */}
          <TriggerCard
            icon={<IconZap />}
            title="Rate Shock Analysis"
            borderColor="border-rose-400"
          >
            A 200-basis-point rate increase at renewal would raise your monthly payment by{' '}
            <strong className="text-rose-700">{fmtx(rateShock.difference)}</strong> to{' '}
            <strong>{fmtx(rateShock.shockedPayment)}</strong> at{' '}
            {rateShock.newRate.toFixed(2)}%. Maintaining a payment buffer of this magnitude
            ensures financial flexibility through rate cycles.
          </TriggerCard>

          {/* 2. Round-Up / Amortization Compression */}
          <TriggerCard
            icon={<IconTrend />}
            title="Amortization Compression"
            borderColor="border-sky-400"
          >
            Increasing your principal & interest payment by{' '}
            <strong className="text-sky-700">{fmtx(roundUp.extra)}/month</strong> to{' '}
            <strong>{fmtx(roundUp.roundedPayment)}</strong> delivers{' '}
            {roundUp.yearsSaved > 0 ? (
              <>
                <strong className="text-sky-700">{roundUp.yearsSaved}-year</strong> amortization
                compression and reduces total interest paid by{' '}
                <strong>{fmt(roundUp.interestSaved)}</strong>.
              </>
            ) : (
              <>
                an estimated <strong>{fmt(roundUp.interestSaved)}</strong> reduction in total
                interest paid — minimal lifestyle impact, measurable long-term benefit.
              </>
            )}
          </TriggerCard>

          {/* 3. Insurance Threshold (conditional) */}
          {insuranceThreshold ? (
            <TriggerCard
              icon={<IconTarget />}
              title="Insurance Threshold Opportunity"
              borderColor="border-emerald-400"
            >
              {insuranceThreshold.type === 'CMHC' ? (
                <>
                  At <strong>{insuranceThreshold.currentDownPct.toFixed(1)}%</strong> down, you
                  are within 2% of the CMHC-free threshold. Contributing an additional{' '}
                  <strong className="text-emerald-700">
                    {fmt(insuranceThreshold.amountNeeded)}
                  </strong>{' '}
                  eliminates{' '}
                  <strong>{fmtx(insuranceThreshold.annualSavings / 12)}/month</strong> in
                  CMHC-inflated payments — an effective instant return of{' '}
                  <strong className="text-emerald-700">
                    {insuranceThreshold.instantReturn.toFixed(0)}%
                  </strong>{' '}
                  annually on that incremental capital.
                </>
              ) : (
                <>
                  At <strong>{insuranceThreshold.currentDownPct.toFixed(1)}%</strong> down, you
                  are within 2% of the PMI elimination threshold. An additional{' '}
                  <strong className="text-emerald-700">
                    {fmt(insuranceThreshold.amountNeeded)}
                  </strong>{' '}
                  removes{' '}
                  <strong>{fmtx(insuranceThreshold.annualSavings / 12)}/month</strong> in
                  Private Mortgage Insurance immediately — an effective instant return of{' '}
                  <strong className="text-emerald-700">
                    {insuranceThreshold.instantReturn.toFixed(0)}%
                  </strong>{' '}
                  annually on that incremental capital.
                </>
              )}
            </TriggerCard>
          ) : (downPct ?? 0) >= 20 ? (
            <div className="rounded-xl border-l-[3px] border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
              <span className="font-semibold">Insurance Threshold:</span> Not applicable — your down payment exceeds 20%.
            </div>
          ) : (
            <div className="rounded-xl border-l-[3px] border-amber-400 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
              {region === 'CA' ? 'CMHC Insurance Required' : 'PMI Required'} — your {(downPct ?? 0).toFixed(1)}% down payment is below the 20% threshold.
            </div>
          )}
        </div>

        {/* Mini Disclaimer */}
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 leading-relaxed">
          <strong className="font-semibold">Important:</strong> The above analysis is for
          illustrative purposes only and does not constitute financial, tax, or mortgage advice.
          Individual results will vary based on lender terms, credit profile, and market conditions.
          Consult a licensed mortgage professional before making financial decisions.
        </div>
      </div>
    </div>
  );
}
