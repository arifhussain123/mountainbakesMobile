import type { CashTransfer } from '@/api';

/** How many days after a sale day its deposit may be dated — mirrors the backend's Finance-side `deposit-reconciliation.ts` (DEPOSIT_MATCH_DAYS = 2). */
const DEPOSIT_MATCH_DAYS = 2;

function addDaysStr(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A Company Share often carries 50 paisa; a deposit amount is a whole rupee — agree within less than a rupee either way (covers both rounding and truncation to whole rupees). */
function amountsAgree(a: number, b: number): boolean {
  return Math.abs(a - b) < 1;
}

/**
 * Best-effort client-side port of the backend's Finance-only deposit↔Company-Share
 * reconciliation, scoped to transfers already loaded for this branch. There is no
 * branch-facing endpoint for this link (confirmed in Step 0), so this is a hint,
 * not a confirmed server-validated match — callers should label it accordingly.
 * Picks the exact-amount match nearest to the business date when more than one exists.
 */
export function findLikelyDeposit(companyShare: number, businessDate: string, transfers: CashTransfer[]): CashTransfer | null {
  if (companyShare <= 0) return null;
  const windowEnd = addDaysStr(businessDate, DEPOSIT_MATCH_DAYS);

  const candidates = transfers.filter((t) => t.date >= businessDate && t.date <= windowEnd && amountsAgree(t.amount, companyShare));
  if (candidates.length === 0) return null;

  return candidates.reduce((nearest, t) => (t.date < nearest.date ? t : nearest));
}
