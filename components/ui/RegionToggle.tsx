'use client';

import { useRegion, type Region } from '@/lib/region/context';
import { USFlagIcon, CAFlagIcon } from '@/components/ui/FlagIcons';

// ── Component ────────────────────────────────────────────────────────────────

const OPTIONS: { value: Region; label: string; Flag: React.ComponentType<{ width?: number; height?: number }> }[] = [
  { value: 'us', label: 'USA',    Flag: USFlagIcon },
  { value: 'ca', label: 'Canada', Flag: CAFlagIcon },
];

interface RegionToggleProps {
  /**
   * 'light' — for use on white/gray backgrounds (container: 8% navy)
   * 'dark'  — for use on navy hero backgrounds (container: 9% white)
   */
  variant?: 'light' | 'dark';
}

/**
 * US/CA region toggle.
 * Brand spec: rounded-[10px] container · rounded-[7px] buttons · 13px / 600
 * Active state: bg-white, text-navy, shadow
 * Uses SVG flags — never emoji per brand guidelines.
 */
export default function RegionToggle({ variant = 'light' }: RegionToggleProps) {
  const { region, setRegion } = useRegion();

  const containerBg = variant === 'dark'
    ? 'rgba(255,255,255,0.09)'
    : 'rgba(13,27,42,0.08)';

  return (
    <div
      role="group"
      aria-label="Select region"
      className="inline-flex items-center rounded-brand-md p-1"
      style={{ background: containerBg }}
    >
      {OPTIONS.map(({ value, label, Flag }) => {
        const active = region === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setRegion(value)}
            aria-pressed={active}
            className={[
              'inline-flex items-center gap-2 rounded-[7px] px-3 py-1.5',
              'text-[13px] font-semibold transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal',
              active
                ? 'bg-white text-brand-navy shadow-sm'
                : variant === 'dark'
                  ? 'text-white/50 hover:text-white/80'
                  : 'text-black/50 hover:text-black/80',
            ].join(' ')}
          >
            <Flag />
            {label}
          </button>
        );
      })}
    </div>
  );
}
