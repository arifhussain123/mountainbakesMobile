/**
 * financeApp.md Section 1.1 token table — a third, separate palette from
 * both `@/shared/theme` (Branch) and `@/theme` (Production's own rebuild), by
 * the same explicit per-module decision Production got. Finance's accent is
 * fixed (`#FF6B35`) — the spec never makes it a user setting the way
 * Production's does, so there is no `useAccentStore` equivalent here.
 */
export const colors = {
  bg: '#0B0C12',
  bgGlowPurple: 'rgba(88,70,210,.30)',
  bgGlowTeal: 'rgba(24,110,140,.22)',
  text: '#F5F1EC',
  textSoft: '#CFC6BE',
  textMuted: '#A39A92',
  textFaint: '#857B73',
  textGhost: '#6E655E',
  accent: '#FF6B35',
  onAccent: '#1C1917',
  income: '#34C38A',
  danger: '#FF5A5F',
  warning: '#F5B800',
  discrepancy: '#FF8A5C',
  info: '#608CFF',
  incomeHeader: '#4F3F8F',
  incomeBar: '#6E5BD0',
  incomeBarLegend: '#8F7EE8',
  receivedBar: '#E0793A',
  expenseHeader: '#5C3F2A',
  expenseBar: '#A0623A',
  expenseBarLegend: '#C07A4A',
  navyCard: '#262440',
  surface: 'rgba(255,255,255,.05)',
  surfaceBorder: 'rgba(255,255,255,.08)',
  divider: 'rgba(255,255,255,.06)',
} as const;

/** `color` must be a `#RRGGBB` hex literal — every token above already expressed as `rgba(...)` carries its own alpha and doesn't need this. */
export function tint(color: string, alpha: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
