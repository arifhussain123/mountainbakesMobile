import type { BranchStockHistoryRow } from '@/shared/types/stock.types';
import { api } from './client';

/**
 * The branch stock **ledger** — `GET /api/stock/history`.
 *
 * Separate from `getStock` in `catalogApi`, and the split is the question each
 * answers. `/api/stock` is *this product, today*: one row per product for one
 * business day, which is what a shelf count reads. This is *the whole shop, over
 * time*: every product folded together, one row per business day, with a money
 * figure beside every quantity.
 *
 * ---------------------------------------------------------------------------
 * The amounts are stock at today's prices, NOT the day's takings
 * ---------------------------------------------------------------------------
 * Every quantity — including `soldAmount` — is valued at the product's *current*
 * `products.price`. That is deliberate on the server: an order's real revenue is
 * its snapshotted `unitPrice` less discount, and using that figure here would
 * stop the row adding up (`opening + new − sold − returned + adjustment =
 * balance`) on any day carrying a discount or a since-changed price.
 *
 * So a screen must never label `soldAmount` as revenue. `docs/screen-patterns.md`
 * and the type's own doc in `@mb/shared/types/stock.types` say the same thing
 * from the other two sides; this is the third place someone might read it before
 * writing "Sales" over the column.
 *
 * ---------------------------------------------------------------------------
 * Scope is the server's, not ours
 * ---------------------------------------------------------------------------
 * A branch role is auto-scoped to its own branch and must **not** send
 * `branchId`; a super admin has no implicit branch and receives 400 "Branch
 * context required" without one. Production and finance roles are refused
 * outright with 403. Same shape as `/api/stock/audit`, and it is not an accident
 * — reading one shop's ledger across days is exactly what a branch account may
 * not do for a shop that is not its own.
 */

/**
 * `GET /api/stock/history?days=N`.
 *
 * Declared here rather than in `@mb/shared` because it is not there: the server
 * defines `BranchStockHistoryResult` in `services/stock.service.ts`, outside the
 * mirrored tree. Only the *row* is shared. That makes this envelope one of the
 * inline response shapes `CLAUDE.md` warns about — nothing checks it against the
 * server — so it is kept minimal and every field it names is read from the route
 * handler rather than assumed.
 */
export interface BranchStockHistoryResult {
  branchId: string;
  /**
   * The oldest business date the rows actually cover.
   *
   * Not always `to − days`: the ledger read is capped, and a branch with a very
   * large catalogue and a wide window gets a shorter window rather than a
   * half-summed oldest day. `capped` says when that happened, and a screen has
   * to show it — silently answering about six days when seven were asked for is
   * a number that reads exactly like the right one.
   */
  from: string;
  to: string;
  /** Newest business day first. */
  rows: BranchStockHistoryRow[];
  capped: boolean;
}

export interface BranchStockDayResult {
  branchId: string;
  date: string;
  row: BranchStockHistoryRow;
}

/**
 * A window of business days, newest first.
 *
 * `days` is clamped to 1–365 on the server, and a junk value falls back to seven
 * rather than 400-ing the screen — so this sends what it was given and lets the
 * server be the authority on the bound.
 */
export function getBranchStockHistory(options: {
  days: number;
  /** Admin only. A branch role must omit it — the server scopes by JWT. */
  branchId?: string | null;
}): Promise<BranchStockHistoryResult> {
  const params: Record<string, string> = { days: String(options.days) };
  if (options.branchId) params.branchId = options.branchId;
  return api.get<BranchStockHistoryResult>('/api/stock/history', { params });
}

/**
 * One business day.
 *
 * `date` and `days` are mutually exclusive on the server — sending both means
 * two different questions, and it would answer one of them silently. This
 * function sends only `date`, and `getBranchStockHistory` only `days`, so the
 * pair cannot be mixed at a call site.
 *
 * A date the ledger cannot reach — in the future, more than a year back, or
 * beyond the read cap — comes back as an error naming the reason rather than as
 * an empty row. That distinction matters here more than usual: "nothing moved
 * that day" and "we cannot get back that far" are both a table of zeroes if the
 * failure is swallowed.
 */
export function getBranchStockDay(options: {
  date: string;
  branchId?: string | null;
}): Promise<BranchStockDayResult> {
  const params: Record<string, string> = { date: options.date };
  if (options.branchId) params.branchId = options.branchId;
  return api.get<BranchStockDayResult>('/api/stock/history', { params });
}
