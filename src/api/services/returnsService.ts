import type { ProductionReturn } from '@/shared/types/production-ops.types';
import { api } from '../client';

/**
 * Returns, from **both** sides of the same table.
 *
 * ---------------------------------------------------------------------------
 * One resource, two routers, two windows
 * ---------------------------------------------------------------------------
 * `production_returns` holds every return, whoever raised it. A branch handing
 * unsold stock back posts `POST /api/stock/return`; production can also record
 * one against a branch. Either way the row sits `pending` until the counter
 * accepts or rejects it — accepting moves the units into the pool, rejecting
 * puts them back on the branch's balance.
 *
 * The two routers differ in **who** and **how far back**:
 *
 * | | Router | Role | Window |
 * |---|---|---|---|
 * | Production's queue | `GET /api/production-returns` | `super_admin` + `production_user` | 30 business days |
 * | A branch's own | `GET /api/stock/returns?days=N` | `super_admin` + branch roles | 90 days, default |
 *
 * Neither window is a client parameter on the production side: `GET
 * /api/production-returns` takes **no filters at all**. A screen showing it must
 * not imply otherwise — an "All" chip over a thirty-day window is a lie that
 * reads exactly like the truth.
 *
 * **An earlier version of this comment said a branch return was applied
 * immediately and had no list endpoint at all**, and that it could only be read
 * as the "Returned" column on the stock ledger. Both stopped being true when
 * branch returns stopped being auto-approved: the units come off the shop's
 * balance as the return is raised and then wait for a decision, and
 * `/api/stock/returns` is the list. `queryKeys.ts` carried the same stale claim.
 */

/** `GET /api/production-returns` — the last 30 business days, newest first. */
export async function getProductionReturns(): Promise<ProductionReturn[]> {
  const data = await api.get<{ returns: ProductionReturn[]; total: number }>(
    '/api/production-returns',
  );
  return data.returns ?? [];
}

/**
 * `PUT /api/production-returns/:id/review` — accept (restock) or reject.
 *
 * **Not idempotent, and not offline-capable.** The server's update carries an
 * `.eq('status', 'pending')` predicate, so a second review of the same return
 * matches nothing and comes back 409 "already reviewed" rather than moving the
 * stock twice. That is the right server behaviour and it is exactly why this
 * write must not be queued: a review sitting in a queue for an hour is a
 * decision about stock that may have been made by somebody else in the meantime,
 * and the drain would surface it as a conflict for a human — which is where it
 * started.
 *
 * So it goes straight out, fails loudly, and the list refetches.
 */
export function reviewProductionReturn(
  id: string,
  status: 'accepted' | 'rejected',
): Promise<ProductionReturn> {
  return api.put<ProductionReturn>(`/api/production-returns/${id}/review`, { status });
}

/**
 * `GET /api/stock/returns?days=N` — the branch's **own** returns, newest first.
 *
 * A different route from the queue above and a different gate:
 * `requireRole('super_admin', ...BRANCH_ROLES)`, with the branch taken off the
 * JWT for a branch role. The window is a real parameter here, defaulting to 90
 * days and clamped server-side to 1–365 — wider than the production board's
 * thirty because this is a shop auditing a quarter of its own returns rather
 * than a queue of today's work.
 *
 * The rows are the same `ProductionReturn`, so the branch list and the
 * production queue cannot disagree about what a return is.
 */
export async function getBranchReturns(days?: number): Promise<ProductionReturn[]> {
  const params: Record<string, string> = {};
  if (days !== undefined) params.days = String(days);
  const data = await api.get<{ returns: ProductionReturn[]; total: number }>(
    '/api/stock/returns',
    { params },
  );
  return data.returns ?? [];
}
