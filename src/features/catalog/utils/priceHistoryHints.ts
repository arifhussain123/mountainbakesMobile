import type { PriceChange, PriceChangeSource, PriceChangeStatus } from '@/api';
import type { StatusVariant } from '@/shared/ui';
import { percentChange } from '@/shared/utils';

/**
 * The Price History screen's own reading of the server's rows: labels for the
 * two enums, the price move, and the review hints. Everything here is derived
 * from `/api/products/price/history` (plus the product's current cost for
 * "Below cost") — no figure is invented, and a hint is a prompt to look, not a
 * finding.
 */

export const PRICE_STATUS_LABEL: Record<PriceChangeStatus, string> = {
  active: 'Applied',
  scheduled: 'Scheduled',
  superseded: 'Replaced before it applied',
};

export const PRICE_STATUS_VARIANT: Record<PriceChangeStatus, StatusVariant> = {
  active: 'success',
  scheduled: 'warning',
  superseded: 'neutral',
};

export const PRICE_SOURCE_LABEL: Record<PriceChangeSource, string> = {
  manual: 'Change price',
  import: 'Price List import',
};

/** Days either side of a change in which an opposite change on the same product counts as a reversal. */
export const REVERSAL_WINDOW_DAYS = 7;

export type PriceDirection = 'up' | 'down' | 'same';

export interface PriceMove {
  direction: PriceDirection;
  /** new − old; null when there is no old price on record. */
  diff: number | null;
  /** Percent of the old price; null when the old price is 0 or missing (no base). */
  pct: number | null;
}

export function priceMove(change: Pick<PriceChange, 'oldPrice' | 'newPrice'>): PriceMove {
  if (change.oldPrice === null) return { direction: 'same', diff: null, pct: null };
  const diff = change.newPrice - change.oldPrice;
  return {
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
    diff,
    pct: percentChange(change.newPrice, change.oldPrice),
  };
}

/** The Karachi calendar day of a UTC timestamp (UTC+5, no daylight saving). */
export function karachiDay(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso.slice(0, 10);
  return new Date(t + 5 * 60 * 60_000).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

export function isFromZero(change: Pick<PriceChange, 'oldPrice'>): boolean {
  return change.oldPrice === 0;
}

/**
 * An opposite move on the same product within `REVERSAL_WINDOW_DAYS` of this
 * one, by effective date. A superseded row never took effect, so it neither
 * reverses nor is reversed.
 */
export function isQuicklyReversed(change: PriceChange, all: readonly PriceChange[], windowDays = REVERSAL_WINDOW_DAYS): boolean {
  if (change.status === 'superseded') return false;
  const dir = priceMove(change).direction;
  if (dir === 'same') return false;
  return all.some(
    (other) =>
      other.id !== change.id &&
      other.productId === change.productId &&
      other.status !== 'superseded' &&
      priceMove(other).direction === (dir === 'up' ? 'down' : 'up') &&
      daysBetween(other.effectiveDate, change.effectiveDate) <= windowDays,
  );
}

/** Below the product's CURRENT cost — `null`/`undefined` cost means unknown, never "below". */
export function isBelowCost(change: Pick<PriceChange, 'newPrice'>, cost: number | null | undefined): boolean {
  return cost !== null && cost !== undefined && change.newPrice < cost;
}

export type PriceHintKey = 'fromZero' | 'reversed' | 'belowCost';

export interface PriceHint {
  key: PriceHintKey;
  label: string;
  tone: 'warning' | 'danger';
}

export function priceHints(change: PriceChange, all: readonly PriceChange[], currentCost: number | null | undefined): PriceHint[] {
  const hints: PriceHint[] = [];
  if (isFromZero(change)) hints.push({ key: 'fromZero', label: 'From Rs. 0', tone: 'warning' });
  if (isQuicklyReversed(change, all)) hints.push({ key: 'reversed', label: `Reversed within ${REVERSAL_WINDOW_DAYS} days`, tone: 'warning' });
  if (isBelowCost(change, currentCost)) hints.push({ key: 'belowCost', label: 'Below cost', tone: 'danger' });
  return hints;
}

/**
 * Per product, the applied change that set the price in force now: the latest
 * `active` row by when it went live. Only as complete as `all` — a product
 * whose newer change is not loaded yet is judged on what is.
 */
export function inForceIds(all: readonly PriceChange[]): Set<string> {
  const latest = new Map<string, PriceChange>();
  for (const c of all) {
    if (c.status !== 'active') continue;
    const cur = latest.get(c.productId);
    const at = c.activatedOn ?? c.changedOn;
    if (!cur || at > (cur.activatedOn ?? cur.changedOn)) latest.set(c.productId, c);
  }
  return new Set([...latest.values()].map((c) => c.id));
}

export interface PriceMonthSection {
  key: string;
  title: string;
  data: PriceChange[];
}

/** Grouped by the Karachi month it was recorded in, keeping the incoming (newest-first) order. */
export function groupByMonth(changes: readonly PriceChange[]): PriceMonthSection[] {
  const sections: PriceMonthSection[] = [];
  for (const c of changes) {
    const key = karachiDay(c.changedOn).slice(0, 7);
    let section = sections.find((s) => s.key === key);
    if (!section) {
      const title = new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      section = { key, title, data: [] };
      sections.push(section);
    }
    section.data.push(c);
  }
  return sections;
}

export interface PriceHistoryFilters {
  /** Effective date window, inclusive. */
  from?: string;
  to?: string;
  changedBy?: string;
  direction?: 'up' | 'down';
  source?: PriceChangeSource;
}

/** The filters the server does not take, applied to the loaded rows. */
export function matchesPriceFilters(change: PriceChange, f: PriceHistoryFilters): boolean {
  if (f.from && change.effectiveDate < f.from) return false;
  if (f.to && change.effectiveDate > f.to) return false;
  if (f.changedBy && (change.changedByName ?? '') !== f.changedBy) return false;
  if (f.direction && priceMove(change).direction !== f.direction) return false;
  if (f.source && change.source !== f.source) return false;
  return true;
}

function rupees(n: number): string {
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} rupees`;
}

function spokenDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

/**
 * The card as one spoken line, e.g. "Cookies, COOKIES-001, price down from 200
 * to 150 rupees, 25 percent, effective 23 September, reason: change due to old
 * stock" — then the status and any hints, so nothing shown in colour is lost.
 */
export function priceChangeA11yLabel(change: PriceChange, hints: readonly PriceHint[] = []): string {
  const move = priceMove(change);
  const price =
    change.oldPrice === null
      ? `price set to ${rupees(change.newPrice)}`
      : move.direction === 'same'
        ? `price unchanged at ${rupees(change.newPrice)}`
        : `price ${move.direction} from ${change.oldPrice.toLocaleString('en-US')} to ${rupees(change.newPrice)}`;
  return [
    change.productName,
    change.productCode || 'no code',
    price,
    move.pct !== null && move.direction !== 'same' ? `${Math.round(Math.abs(move.pct) * 10) / 10} percent` : null,
    `effective ${spokenDay(change.effectiveDate)}`,
    change.reason?.trim() ? `reason: ${change.reason.trim().toLowerCase()}` : 'no reason given',
    PRICE_STATUS_LABEL[change.status].toLowerCase(),
    ...hints.map((h) => h.label),
  ]
    .filter(Boolean)
    .join(', ');
}
