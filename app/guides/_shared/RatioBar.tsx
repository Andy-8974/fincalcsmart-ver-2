interface RatioBarProps {
  /** Display label above the bar, e.g. "GDS Ratio" */
  label: string;
  /** Optional sub-label, e.g. "Gross Debt Service" */
  sublabel?: string;
  /** Current ratio value as a percentage (0–100), e.g. 37 */
  value: number;
  /** Text shown at the left end below the bar, e.g. "~37% estimated" */
  valueLabel: string;
  /** The guideline threshold (0–100), e.g. 39 */
  threshold: number;
  /** Text shown at the right end below the bar, e.g. "~39% typical guideline" */
  thresholdLabel: string;
  /**
   * The value that represents the full (100%) bar width.
   * Defaults to 50 — i.e. the bar spans 0–50%, leaving visible space after the threshold.
   */
  maxDisplay?: number;
  /** Small footnote beneath the bar labels */
  note?: string;
}

/**
 * Reusable horizontal ratio bar for article pages.
 * Shows a filled teal portion (current value) and an amber threshold marker.
 * Pure CSS — no SVG, no new dependencies.
 */
export default function RatioBar({
  label,
  sublabel,
  value,
  valueLabel,
  threshold,
  thresholdLabel,
  maxDisplay = 50,
  note,
}: RatioBarProps) {
  const fillPct = Math.min(100, (value / maxDisplay) * 100);
  const markerPct = Math.min(99, (threshold / maxDisplay) * 100);

  return (
    <div>
      {/* Labels above bar */}
      <div className="mb-2.5">
        <p className="text-[13px] font-bold" style={{ color: '#0D1B2A' }}>
          {label}
        </p>
        {sublabel && (
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(13,27,42,0.54)' }}>
            {sublabel}
          </p>
        )}
      </div>

      {/* Bar track */}
      <div
        className="relative h-3 rounded-full"
        style={{ background: 'rgba(13,27,42,0.08)' }}
        role="img"
        aria-label={`${label}: ${valueLabel}; guideline: ${thresholdLabel}`}
      >
        {/* Teal fill — current ratio */}
        <div
          className="absolute left-0 top-0 h-3 rounded-full"
          style={{ width: `${fillPct}%`, background: '#1DB584' }}
          aria-hidden
        />
        {/* Amber threshold marker */}
        <div
          className="absolute top-[-4px] bottom-[-4px] w-[2px] rounded-full"
          style={{ left: `${markerPct}%`, background: '#C9A84C' }}
          aria-hidden
        />
      </div>

      {/* Labels below bar */}
      <div className="mt-2 flex items-start justify-between gap-2">
        <span className="text-[12px] font-semibold" style={{ color: '#1DB584' }}>
          {valueLabel}
        </span>
        <span className="text-[12px] font-semibold text-right" style={{ color: '#C9A84C' }}>
          {thresholdLabel}
        </span>
      </div>

      {note && (
        <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.50)' }}>
          {note}
        </p>
      )}
    </div>
  );
}
