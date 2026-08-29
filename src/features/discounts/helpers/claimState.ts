import type { BranchDiscount } from '@/shared/types/discount.types';
import { isDiscountOpen } from '@/shared/types/discount.types';

/**
 * Reading a claim: whether the branch can still act on it, and how long
 * Production took.
 *
 * `isDiscountOpen` is **not** redefined here — it lives in the shared mirror
 * alongside the status union, and its own comment carries the rule this whole
 * screen turns on: `returned` is a request to correct rather than a refusal, so
 * both `pending` and `returned` are open. A second copy here would be the one
 * that stopped matching the server.
 *
 * Note what is deliberately NOT the test: `reviewedAt`. It is stamped on all
 * three review outcomes, `returned` included — a send-back is a review — so
 * gating on the timestamp would strand exactly the claims Production asked the
 * branch to fix.
 */

export { isDiscountOpen };

/** The counterpart, so a caller never has to write `!isOpen` and mean "decided". */
export function isFinal(claim: Pick<BranchDiscount, 'status'>): boolean {
  return !isDiscountOpen(claim.status);
}

/**
 * How long Production took, in the units a person would say it in.
 *
 * Minutes while it is under an hour, then hours, then days — because the figure
 * is used for chasing, and "1,847 minutes" is not something anybody repeats down
 * a phone. Null while it is still unreviewed: an open claim has no turnaround
 * yet, and rendering one as `0` would read as instant.
 */
export function turnaround(claim: Pick<BranchDiscount, 'createdAt' | 'reviewedAt'>): string | null {
  if (!claim.reviewedAt) return null;
  const from = Date.parse(claim.createdAt);
  const to = Date.parse(claim.reviewedAt);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;

  const minutes = Math.max(0, Math.round((to - from) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/**
 * Still-open claims first, then newest.
 *
 * The reason to open this screen is what can still be changed; a decided claim
 * is a record. Sorting by date alone buries an editable claim under a fortnight
 * of settled ones.
 */
export function sortClaims(claims: readonly BranchDiscount[]): BranchDiscount[] {
  return [...claims].sort((a, b) => {
    const openA = isDiscountOpen(a.status);
    const openB = isDiscountOpen(b.status);
    if (openA !== openB) return openA ? -1 : 1;
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
  });
}

/** Search across everything a person would look for. Query arrives lower-cased. */
export function matchesClaim(claim: BranchDiscount, query: string): boolean {
  if (!query) return true;
  return [claim.id, claim.demandNumber, claim.reason, claim.reviewNote ?? '', claim.status]
    .join(' ')
    .toLowerCase()
    .includes(query);
}
