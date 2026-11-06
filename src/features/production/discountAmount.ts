/**
 * Production → Discount Detail → Edit amount: the typed figure's rules, kept
 * pure so they can be tested without the screen. Same rules as the web popup
 * (frontend discountShared.tsx `sanitizeAmount` / `parseAmount`) and the
 * server's schema: more than 0, at most two decimals.
 */

/** Digits and one dot, at most two decimals, no leading zeros. */
export function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  const [whole = '', frac] = cleaned.split('.');
  const w = whole.replace(/^0+(?=\d)/, '');
  return frac === undefined ? w : `${w}.${frac.slice(0, 2)}`;
}

/** Paisa-rounded money, or 0 for "not a valid amount". */
export function parseAmountInput(raw: string): number {
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}
