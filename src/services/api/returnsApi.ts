import type { ProductionReturn } from '@/shared/types/production-ops.types';
import { api } from './client';

/**
 * Returns as **production** reviews them.
 *
 * ---------------------------------------------------------------------------
 * There are two return paths, and this is only one of them
 * ---------------------------------------------------------------------------
 * A branch handing unsold stock back at close of day posts `POST
 * /api/stock/return`. That is applied **immediately** — branch balance down,
 * production pool up — and there is no review step and no list endpoint for it.
 * It shows up as the "Returned" column on the branch stock ledger, which is
 * where a branch looks for its own returns.
 *
 * `production_returns` is the other path: production records a return against a
 * branch, and it sits `pending` until somebody accepts or rejects it. Accepting
 * moves the stock; rejecting moves nothing. That is why this one has a queue and
 * the branch one does not.
 *
 * The whole router is `requireRole('super_admin', 'production_user')`, so a
 * branch account gets 403 from every route here — including the read. It is not
 * a branch screen.
 *
 * ---------------------------------------------------------------------------
 * The window is the server's and it is not a parameter
 * ---------------------------------------------------------------------------
 * `GET /` returns the last **thirty business days**, newest first, and takes no
 * filters at all. A screen showing this must not imply otherwise — an "All"
 * chip over a thirty-day window is a lie that reads exactly like the truth.
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
