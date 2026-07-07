export type AdVariant =
  | 'leaderboard'      // 728×90  — desktop horizontal banner
  | 'rectangle'        // 300×250 — medium rectangle
  | 'large-rectangle'  // 336×280 — large rectangle
  | 'half-page'        // 300×600 — sidebar
  | 'mobile-banner';   // 320×50  — mobile top/bottom

interface SlotSpec {
  width: number;
  height: number;
  visibilityClass: string;
}

const SLOT_SPECS: Record<AdVariant, SlotSpec> = {
  'leaderboard':      { width: 728, height: 90,  visibilityClass: 'hidden lg:flex' },
  'rectangle':        { width: 300, height: 250, visibilityClass: 'flex' },
  'large-rectangle':  { width: 336, height: 280, visibilityClass: 'flex' },
  'half-page':        { width: 300, height: 600, visibilityClass: 'hidden xl:flex' },
  'mobile-banner':    { width: 320, height: 50,  visibilityClass: 'flex lg:hidden' },
};

interface AdSlotProps {
  variant: AdVariant;
  className?: string;
}

/**
 * Reserves exact IAB ad dimensions before the ad network script loads,
 * guaranteeing Cumulative Layout Shift = 0.
 *
 * min-height + maxWidth inline styles lock the space open regardless of
 * ad load state. Production: replace the inner comment with Mediavine/Raptive tag.
 */
export default function AdSlot({ variant, className = '' }: AdSlotProps) {
  const { width, height, visibilityClass } = SLOT_SPECS[variant];

  return (
    <div className={`${visibilityClass} flex-col items-center gap-1 ${className}`}>
      <span
        className="select-none text-[10px] font-medium uppercase tracking-[0.12em]"
        style={{ color: '#9BA8B5' }}
      >
        Advertisement
      </span>
      {/*
       * Dimensions are locked via inline style — not Tailwind arbitrary values —
       * so they cannot be purged and are guaranteed to survive all build modes.
       */}
      <div
        style={{
          minHeight: height,
          width: '100%',
          maxWidth: width,
          background: '#F1F4F7',
          border: '1.5px dashed #E4E9EF',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
        aria-hidden="true"
        data-ad-variant={variant}
      >
        {/* ad unit tag goes here */}
      </div>
    </div>
  );
}
