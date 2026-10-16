import type { ProductionOrder, ProductionOrderItem, ProductionOrderPackingItem } from '@/api';

/**
 * Ported from the web app's `utils/demandLines.ts` — the branch and web
 * clients must agree on these figures, since a branch comparing the two
 * screens is exactly what this module exists to keep honest.
 */

/** The branch's request until Production reviews it, Production's figure until the branch verifies, the counted figure after that. `?? qty` not `|| qty` — 0 is a decision, not a missing value. */
export function effectiveQty(it: Pick<ProductionOrderItem, 'qty' | 'approvedQty'>): number {
  return Number(it.approvedQty ?? it.qty) || 0;
}

export function effectivePackingQty(it: Pick<ProductionOrderPackingItem, 'qty' | 'approvedQty'>): number {
  return Number(it.approvedQty ?? it.qty) || 0;
}

export function isEmptyLine(it: Pick<ProductionOrderItem, 'qty' | 'approvedQty'>): boolean {
  return effectiveQty(it) <= 0;
}

export function isEmptyPackingLine(it: Pick<ProductionOrderPackingItem, 'qty' | 'approvedQty'>): boolean {
  return effectivePackingQty(it) <= 0;
}

/** Lines worth showing — everything with a quantity behind it (a line Production cut to 0 is dropped, not resurrected). */
export function liveItems<T extends Pick<ProductionOrderItem, 'qty' | 'approvedQty'>>(items: T[] | undefined): T[] {
  return (items ?? []).filter((it) => !isEmptyLine(it));
}

export function livePackingItems<T extends Pick<ProductionOrderPackingItem, 'qty' | 'approvedQty'>>(items: T[] | undefined): T[] {
  return (items ?? []).filter((it) => !isEmptyPackingLine(it));
}

export interface DemandTotals {
  /** Distinct product lines with a quantity behind them. */
  products: number;
  /** Sum of those lines' quantities. */
  qty: number;
}

/**
 * What the branch asked for — the demand as raised. Excludes lines Production
 * added (`addedByProduction`) and reads `qty`, never `effectiveQty`, so this
 * keeps saying what was requested even after a line is reviewed down.
 */
export function requestedTotals(order: Pick<ProductionOrder, 'items'>): DemandTotals {
  const lines = (order.items ?? []).filter((it) => !it.addedByProduction && Number(it.qty) > 0);
  return {
    products: lines.length,
    qty: lines.reduce((sum, it) => sum + (Number(it.qty) || 0), 0),
  };
}

/** What is actually moving — the current figure on every live line (the branch's count once verified). */
export function fulfilledTotals(order: Pick<ProductionOrder, 'items'>): DemandTotals {
  const lines = liveItems(order.items);
  return {
    products: lines.length,
    qty: lines.reduce((sum, it) => sum + effectiveQty(it), 0),
  };
}

/** Has this demand been counted in at the door? Gated on `verifiedAt`, not status — see `ProductionOrder.verifiedAt`. */
export function isVerified(order: Pick<ProductionOrder, 'verifiedAt'>): boolean {
  return Boolean(order.verifiedAt);
}

/** Needs-action = the branch still has something to do: wait on Production, or verify a delivery. Matches the web app's `BranchNewOrders.tsx` split exactly. */
export function isActiveOrder(order: Pick<ProductionOrder, 'status'>): boolean {
  return order.status === 'pending' || order.status === 'awaiting_verification';
}
