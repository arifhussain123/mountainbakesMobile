/**
 * productionApp.md Step 1 token table — a separate palette from
 * `@/shared/theme` (Branch's own theme) by explicit decision: Production gets
 * its own `src/theme/`, not an extension of Branch's. Every value here is a
 * literal from the spec's table, not re-derived from Branch's palette.
 */
export const colors = {
  bg: '#0B0C12',
  bgGlowViolet: 'rgba(88,70,210,.30)',
  bgGlowTeal: 'rgba(24,110,140,.22)',
  surface: 'rgba(255,255,255,.05)',
  surfaceStrong: 'rgba(255,255,255,.08)',
  border: 'rgba(255,255,255,.08)',
  divider: 'rgba(255,255,255,.06)',
  text: '#F5F1EC',
  textSoft: '#CFC6BE',
  textMuted: '#A39A92',
  textDim: '#857B73',
  onAccent: '#1C1917',
  ink: '#1C1917',
  success: '#34C38A',
  warning: '#F5B800',
  danger: '#FF5A5F',
  dangerSoft: '#FF8A80',
  info: '#8FB0FF',
  violet: '#B79BFF',
} as const;

/** The 4 accent choices the design exposes — selected one lives in `useAccentStore`, not hardcoded per screen. */
export const ACCENT_OPTIONS = ['#FF6B35', '#8B5CF6', '#F5B800', '#34C38A'] as const;
export type AccentOption = (typeof ACCENT_OPTIONS)[number];

export const DEFAULT_ACCENT: AccentOption = '#FF6B35';

/**
 * `color` must be a `#RRGGBB` hex literal (every accent option and every
 * token above that feeds this is) — not applicable to the tokens already
 * expressed as `rgba(...)` strings (`bg`, `surface`, `border`, etc.), which
 * carry their own alpha already.
 */
export function tint(color: string, alpha: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
