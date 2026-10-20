/**
 * Typed text → the numbers the purchasing API accepts. The schemas take money
 * with at most 2 decimals and quantities with at most 3
 * (`purchasing.schemas.ts`), so a value that would be refused there is
 * refused here first, with the same wording.
 *
 * Pure: no React, no API client — jest imports this file directly.
 */

const MONEY_MAX = 100_000_000;
const QTY_MAX = 1_000_000;

/** `'  '` → null, `' x '` → `'x'`. What every optional text field sends. */
export function trimOrNull(value: string | null | undefined): string | null {
  const t = (value ?? '').trim();
  return t ? t : null;
}

function decimals(text: string): number {
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

/** A plain non-negative decimal as typed (`10`, `1.5`, `.5`), commas allowed as thousands separators. */
function parseDecimal(text: string): { value: number; places: number } | null {
  const t = text.trim().replace(/,/g, '');
  if (!/^\d*\.?\d*$/.test(t) || t === '' || t === '.') return null;
  const value = Number(t);
  if (!Number.isFinite(value)) return null;
  return { value, places: decimals(t) };
}

export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

/** A quantity: > 0 unless `allowZero`, at most 3 decimals. */
export function parseQuantity(text: string, options: { allowZero?: boolean } = {}): ParseResult {
  const parsed = parseDecimal(text);
  if (!parsed) return { ok: false, error: 'Enter a valid quantity' };
  if (parsed.places > 3) return { ok: false, error: 'Quantity can have at most 3 decimal places' };
  if (parsed.value > QTY_MAX) return { ok: false, error: 'That quantity looks wrong — check the figure' };
  if (!options.allowZero && parsed.value <= 0) return { ok: false, error: 'Enter a quantity above zero' };
  return { ok: true, value: parsed.value };
}

/** Rupees: ≥ 0 (or > 0 with `positive`), at most 2 decimals. */
export function parseMoney(text: string, options: { positive?: boolean } = {}): ParseResult {
  const parsed = parseDecimal(text);
  if (!parsed) return { ok: false, error: 'Enter a valid amount' };
  if (parsed.places > 2) return { ok: false, error: 'Amount can have at most 2 decimal places' };
  if (parsed.value > MONEY_MAX) return { ok: false, error: 'That amount looks wrong — check the figure' };
  if (options.positive && parsed.value <= 0) return { ok: false, error: 'Enter an amount above zero' };
  return { ok: true, value: parsed.value };
}

/** An optional money field: blank is `null`, anything else must parse. */
export function parseOptionalMoney(text: string): ParseResult | { ok: true; value: null } {
  if (!text.trim()) return { ok: true, value: null };
  return parseMoney(text);
}

/** `8` → `'8'`, `1.25` → `'1.25'`, `0.3333` → `'0.333'` — a quantity as the API stores it. */
export function formatQtyNumber(n: number): string {
  if (!Number.isFinite(n)) return '-';
  return (Math.round(n * 1000) / 1000).toLocaleString('en-US', { maximumFractionDigits: 3 });
}

/** `8 kg` */
export function formatQty(n: number | null | undefined, unit?: string | null): string {
  if (n === null || n === undefined) return '-';
  return unit ? `${formatQtyNumber(n)} ${unit}` : formatQtyNumber(n);
}

/** Number → the text a field starts with when editing a saved value (`null` → `''`). */
export function numberToField(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  return String(Math.round(n * 1000) / 1000);
}

/**
 * qty × rate in paisa, then back to rupees — integer arithmetic, so a preview
 * never shows float noise like 1202.0000000002. A preview only: every saved
 * total is the server's.
 */
export function lineTotalPreview(qty: number, rate: number): number {
  const milli = Math.round(qty * 1000);
  const paisa = Math.round(rate * 100);
  return Math.round((milli * paisa) / 1000) / 100;
}

/** Sum of rupee amounts via paisa, for previews. */
export function sumMoney(values: number[]): number {
  return values.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100;
}
