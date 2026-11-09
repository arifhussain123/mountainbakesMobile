/**
 * `#RRGGBB` → `rgba(r, g, b, alpha)`. Only for hex tokens — the tokens that are
 * already `rgba(...)` strings carry their own alpha and must not go through this.
 */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
