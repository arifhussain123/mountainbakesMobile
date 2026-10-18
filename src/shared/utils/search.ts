/**
 * Whether a field contains a search term (already trimmed and lower-cased).
 *
 * Null-safe on purpose: list rows are typed as always carrying their text
 * fields, but a malformed row (a bad legacy record, a partial API response)
 * must not crash a picker for every row on screen. A row that way is simply
 * not matched — the fix the web made to its Return Items and discount demand
 * searches (`f5d70b4`, `12aa693`).
 */
export function includesTerm(value: unknown, term: string): boolean {
  return typeof value === 'string' && value.toLowerCase().includes(term);
}
