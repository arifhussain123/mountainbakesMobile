import type { StatusVariant } from '@/shared/ui';
import type { BranchDiscount } from '@/api';

/** Labels matched to the web client's own `DISCOUNT_STATUS_LABELS` (`discountShared.tsx`) — not invented. */
export const DISCOUNT_STATUS_LABEL: Record<BranchDiscount['status'], string> = {
  pending: 'Awaiting Production',
  returned: 'Sent Back to Fix',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const DISCOUNT_STATUS_VARIANT: Record<BranchDiscount['status'], StatusVariant> = {
  pending: 'warning',
  returned: 'info',
  approved: 'success',
  rejected: 'danger',
};

/**
 * `pending` and `returned` are mutable; `approved`/`rejected` are terminal.
 * Mirrors the server's own `.in('status', ['pending', 'returned'])` guard on
 * both the revise and withdraw routes exactly — this must never drift from
 * what the server actually enforces.
 */
export function isDiscountOpen(status: BranchDiscount['status']): boolean {
  return status === 'pending' || status === 'returned';
}

/** "Correct" reads better than "Change" once Production has sent a claim back — matches the web's own copy. */
export function discountChangeActionLabel(status: BranchDiscount['status']): string {
  return status === 'returned' ? 'Correct' : 'Change';
}

/**
 * There is no server-side (or prior client-side) guard against two claims on
 * the same demand — confirmed a real, unaddressed gap. This is a soft,
 * client-only warning (never a hard block, since the server allows it and
 * there may be a legitimate reason), checked only against the currently
 * loaded page(s) of this branch's own claims.
 */
export function findExistingClaim(productionOrderId: string, discounts: BranchDiscount[]): BranchDiscount | null {
  return discounts.find((d) => d.productionOrderId === productionOrderId) ?? null;
}
