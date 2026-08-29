import type { BranchDiscount } from '@/shared/types/discount.types';
import type {
  CreateBranchDiscountInput,
  ReviseBranchDiscountInput,
} from '@/shared/schemas/discount.schemas';
import { api } from '../client';

/**
 * Branch discount claims — money a branch asks back against a demand when
 * something arrived damaged, short or wrong.
 *
 * Three things this is NOT, all of which are separate resources here: the
 * per-line discount on a customer sale (a price reduction, in `orders`), a
 * branch return (stock physically going back, `/api/stock/returns`), and
 * Production's review board (`/api/production-discounts`, which a branch role is
 * 403'd from at the mount rather than shown a filtered list).
 *
 * ---------------------------------------------------------------------------
 * Nothing here moves stock, and that is why these writes are live
 * ---------------------------------------------------------------------------
 * The router carries no idempotency keys — its own comment says so, because a
 * claim is a row and an amount rather than a movement to unwind. `POST` also
 * *creates* rather than upserting, so a queued retry would raise a second claim
 * for the same delivery. Both together mean these cannot go on the offline
 * queue: they post live, and a screen has to say so before someone types a
 * claim it cannot keep.
 *
 * ---------------------------------------------------------------------------
 * What "still open" means, and where that rule lives
 * ---------------------------------------------------------------------------
 * `isDiscountOpen(status)` in `@/shared/types/discount.types` — NOT a timestamp
 * check. `reviewedAt` is stamped on all three review outcomes including
 * `returned`, and a returned claim is a request to correct rather than a
 * refusal, so gating on "has it been reviewed" would strand exactly the claims
 * Production asked the branch to fix. The server gates on
 * `status IN ('pending','returned')` and so must every caller here.
 */

/**
 * `GET /api/branch-discounts?days=` — the branch's own claims.
 *
 * The window is clamped server-side to 1–365 and defaults to 90, and the
 * response does **not** echo it back: it is `{discounts, total}` and nothing
 * else. So a screen may only state the window it asked for, and only if it asked
 * for one inside the clamp — quoting an out-of-range request would describe a
 * window the server never used.
 *
 * No `branchId`. A branch role is scoped from its JWT; `super_admin` shares this
 * router and sees the lot.
 */
export async function getBranchDiscounts(days = 90): Promise<BranchDiscount[]> {
  const data = await api.get<{ discounts: BranchDiscount[]; total: number }>(
    '/api/branch-discounts',
    { params: { days: String(days) } },
  );
  return data.discounts ?? [];
}

/**
 * `POST /api/branch-discounts` — raise a claim against one demand.
 *
 * The amount is bounded only as money: positive, at most two decimals, and under
 * ten million — and that ceiling is a typo-catcher (its comment cites 500 typed
 * as 50000000), **not** a bound against the demand's value. The server never
 * compares the two, so a screen that stops an over-claim is doing it as a
 * courtesy and must not imply the API would have refused it.
 */
export function createBranchDiscount(
  input: CreateBranchDiscountInput,
): Promise<{ discount: BranchDiscount }> {
  return api.post<{ discount: BranchDiscount }>('/api/branch-discounts', input);
}

/**
 * `PUT /api/branch-discounts/:id` — correct a claim the branch still owns.
 *
 * Amount and reason only. The demand is deliberately not revisable: re-pointing
 * a claim at a different delivery is a different claim, not a correction of this
 * one, and Production may already have looked at this. Withdraw and raise again.
 *
 * Answers 409 once the claim has been decided. A revise also resets it to
 * `pending` and clears the review stamp, which is what puts a returned claim
 * back in front of Production.
 */
export function reviseBranchDiscount(
  id: string,
  input: ReviseBranchDiscountInput,
): Promise<{ discount: BranchDiscount }> {
  return api.put<{ discount: BranchDiscount }>(`/api/branch-discounts/${id}`, input);
}

/**
 * `DELETE /api/branch-discounts/:id` — withdraw it.
 *
 * A real delete rather than a `cancelled` status, and the route contrasts itself
 * with branch returns on exactly this point: nothing was booked when the claim
 * was raised, so there is no record anybody is planning against and nothing to
 * keep visible. Also 409s once decided.
 */
export function withdrawBranchDiscount(id: string): Promise<unknown> {
  return api.delete(`/api/branch-discounts/${id}`);
}
