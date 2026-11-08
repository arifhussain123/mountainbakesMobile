import type { CashTransfer } from '@/api';

/** How many days after a sale day its deposit may be dated — mirrors the backend's Finance-side `deposit-reconciliation.ts` (DEPOSIT_MATCH_DAYS = 2). */
const DEPOSIT_MATCH_DAYS = 2;

/** A deposit this many rupees or more from a share is not its nearest amount — the server's NEAREST_AMOUNT_GAP. */
const NEAREST_AMOUNT_GAP = 1000;

function addDaysStr(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A Company Share often carries 50 paisa; a deposit amount is a whole rupee — agree within less than a rupee either way (covers both rounding and truncation to whole rupees). */
function amountsAgree(a: number, b: number): boolean {
  return Math.abs(a - b) < 1;
}

const gap = (t: CashTransfer, share: number) => Math.abs(t.amount - share);

/**
 * Best-effort client-side port of the backend's Finance-only deposit↔Company-Share
 * reconciliation, scoped to transfers already loaded for this branch. There is no
 * branch-facing endpoint for this link (confirmed in Step 0), so this is a hint,
 * not a confirmed server-validated match — callers should label it accordingly.
 *
 * Same order as the server (owner's rule, 2026-11-06):
 *   1. the same amount, dated the day or up to two days after (earliest first) —
 *      but a later-dated one only when nothing dated the day itself is within
 *      999 of the share (that own-date deposit is the day's cash);
 *   2. else the deposit dated the day itself (nearest amount);
 *   3. else the nearest amount within 999 in the window.
 * Rejected deposits never count.
 */
export function findLikelyDeposit(companyShare: number, businessDate: string, transfers: CashTransfer[]): CashTransfer | null {
  if (companyShare <= 0) return null;
  const windowEnd = addDaysStr(businessDate, DEPOSIT_MATCH_DAYS);

  const open = transfers
    .filter((t) => t.status !== 'rejected' && t.amount > 0 && t.date >= businessDate && t.date <= windowEnd)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const ownDate = open.filter((t) => t.date === businessDate);
  const ownDateNear = ownDate.some((t) => gap(t, companyShare) < NEAREST_AMOUNT_GAP);

  const exact = (ownDateNear ? ownDate : open).find((t) => amountsAgree(t.amount, companyShare));
  if (exact) return exact;

  const byGap = (list: CashTransfer[]) => list.reduce<CashTransfer | null>((best, t) => (!best || gap(t, companyShare) < gap(best, companyShare) ? t : best), null);
  if (ownDate.length > 0) return byGap(ownDate);
  return byGap(open.filter((t) => gap(t, companyShare) < NEAREST_AMOUNT_GAP));
}
