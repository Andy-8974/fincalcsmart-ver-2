// Inline SVG flag icons — no emoji, cross-platform reliable.
// No 'use client' needed — pure render, safe for server and client components.

export function USFlagIcon({ width = 18, height = 12 }: { width?: number; height?: number }) {
  return (
    <svg
      width={width} height={height} viewBox="0 0 18 12"
      aria-hidden="true"
      style={{ display: 'block', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}
    >
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x="0" y={i * (12 / 7)} width="18" height={12 / 7 + 0.5}
          fill={i % 2 === 0 ? '#B22234' : '#FFFFFF'} />
      ))}
      <rect x="0" y="0" width="7" height="6.5" fill="#3C3B6E" />
      {[1, 3, 5].flatMap(row =>
        [1.2, 2.5, 3.8].map(col => (
          <circle key={`${row}-${col}`} cx={col} cy={row * 1.1} r="0.45" fill="#FFFFFF" />
        ))
      )}
    </svg>
  );
}

export function CAFlagIcon({ width = 18, height = 12 }: { width?: number; height?: number }) {
  return (
    <svg
      width={width} height={height} viewBox="0 0 18 12"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect x="0"    y="0" width="4.5" height="12" fill="#FF0000" />
      <rect x="4.5"  y="0" width="9"   height="12" fill="#FFFFFF" />
      <rect x="13.5" y="0" width="4.5" height="12" fill="#FF0000" />
      <path
        d="M9 1.8 L9.5 3.6 L11 3 L10.1 4.6 L11.8 4.6 L9 8.4 L6.2 4.6 L7.9 4.6 L7 3 L8.5 3.6 Z"
        fill="#FF0000"
      />
      <rect x="8.6" y="8.4" width="0.8" height="1.4" fill="#FF0000" />
    </svg>
  );
}
