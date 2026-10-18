import type { BranchDayDeposit, CashTransfer, FinanceDailySaleDay } from '@/api';
// Direct paths, not the barrels, so this stays a pure module the tests can load alone.
import { getBusinessDate } from '@/api/businessDate';
import { formatCurrency } from '@/shared/utils/formatters';

/**
 * Where a cash transfer stands against the Company Share it pays for.
 *
 * THE PAIRING IS THE SERVER'S. A deposit carries the date it was handed over,
 * not the sales day it pays for, and Daily Closing already decides which day
 * each deposit belongs to (`GET /api/finance/daily-sales`: by amount within a
 * rupee, else the nearest, over the sale day and the two after it, each deposit
 * used once). This file only finds the day that claimed the transfer and reads
 * the figures off it — so the badge on a card and the Deposit Status on Daily
 * Closing can never tell two stories about the same deposit.
 *
 * Over/short is measured with every deposit set against that day, pending ones
 * included: a day paid in two halves is not "short" because only one half has
 * been approved yet.
 */

/** Mirrors the server's `DEPOSIT_MATCH_DAYS`: a deposit pays for its own date or up to two days before. */
export const DEPOSIT_MATCH_DAYS = 2;

export type ShareMatchKind = 'matches' | 'over' | 'short' | 'none';

export interface ShareMatch {
  kind: ShareMatchKind;
  /** The branch day whose share this transfer was set against, or null. */
  day: FinanceDailySaleDay | null;
  /** Every deposit set against that day, this one included. */
  deposited: number;
  /** deposited − Company Share; positive is over. */
  difference: number;
  /** The day's other deposits — "1 deposit already made: CT-000055". */
  otherDeposits: BranchDayDeposit[];
}

const NONE: ShareMatch = { kind: 'none', day: null, deposited: 0, difference: 0, otherDeposits: [] };

export function findShareMatch(transfer: Pick<CashTransfer, 'id'>, days: readonly FinanceDailySaleDay[] | undefined): ShareMatch {
  const day = days?.find((d) => d.reconciliation.deposits.some((dep) => dep.id === transfer.id));
  if (!day || day.companyShare <= 0) return NONE;
  const deposited = day.reconciliation.deposits.reduce((sum, dep) => sum + dep.amount, 0);
  const difference = Math.round((deposited - day.companyShare) * 100) / 100;
  // Within a rupee is a match — the server's own `amountsAgree` tolerance.
  const kind: ShareMatchKind = Math.abs(difference) <= 1 ? 'matches' : difference > 0 ? 'over' : 'short';
  return { kind, day, deposited, difference, otherDeposits: day.reconciliation.deposits.filter((dep) => dep.id !== transfer.id) };
}

export function shareMatchLabel(match: ShareMatch): string {
  if (match.kind === 'matches') return 'Matches share';
  if (match.kind === 'none') return 'No share found';
  return `${formatCurrency(Math.abs(match.difference))} ${match.kind}`;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The daily-sales window that covers every sale day these transfers could pay
 * for: the earliest date less DEPOSIT_MATCH_DAYS, to the latest date.
 */
export function dailySalesWindow(transfers: readonly Pick<CashTransfer, 'date'>[]): { from: string; to: string } | null {
  if (transfers.length === 0) return null;
  const dates = transfers.map((t) => t.date).sort();
  return { from: addDays(dates[0]!, -DEPOSIT_MATCH_DAYS), to: dates[dates.length - 1]! };
}

// ─── Business day vs submit time ───────────────────────────────────────────
// The business day rolls over at 2 AM Karachi, so CT-000057 "dated 16 Oct" was
// submitted at 12:19 AM on the 17th and is still the 16th's deposit. The card
// shows both so the late-night ones stop looking misdated.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const KARACHI_OFFSET_MS = 5 * 60 * 60_000;

/** '2026-10-16' → '16 Oct'. */
export function shortDay(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ''}`;
}

/** The business date an instant falls on — the same 2 AM rule the server stamps transfers with. */
export function businessDateOf(iso: string): string {
  return getBusinessDate(new Date(iso));
}

/** '2026-10-16T19:19:00Z' → '17 Oct, 12:19 AM' — the calendar moment, in Karachi time. */
export function submittedAt(iso: string): string {
  const k = new Date(new Date(iso).getTime() + KARACHI_OFFSET_MS);
  const h = k.getUTCHours();
  const mm = String(k.getUTCMinutes()).padStart(2, '0');
  return `${k.getUTCDate()} ${MONTHS[k.getUTCMonth()]}, ${h % 12 === 0 ? 12 : h % 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

/**
 * Submitted on a different calendar day from its business date — between
 * midnight and 2 AM, or a deposit the branch dated back (the API allows up to
 * seven open business days).
 */
export function submittedOnAnotherDay(transfer: Pick<CashTransfer, 'date' | 'createdAt'>): boolean {
  const calendarDay = new Date(new Date(transfer.createdAt).getTime() + KARACHI_OFFSET_MS).toISOString().slice(0, 10);
  return calendarDay !== transfer.date;
}
