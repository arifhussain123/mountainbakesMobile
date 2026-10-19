import type { ProductionOrder, ProductionOrderStatus, SpecialOrder, SpecialOrderStatus } from '@/api';
import type { StatusVariant } from '@/shared/ui';
import { effectivePackingQty, effectiveQty } from '@/features/orders/utils/demandLines';

/**
 * Pure helpers behind Super Admin's Orders tab — the web `/orders` page
 * (`ProductionOrdersPage.tsx`, `OrderPrintPreview.tsx`, `SpecialOrdersPanel.tsx`),
 * reproduced figure-for-figure. Kept free of React so they can be unit-tested.
 */

/** Branch names all start "Mountain Bakes " — dead weight in a list of them. */
export const shortBranch = (name: string): string => (name ?? '').replace('Mountain Bakes ', '');

/** The slip's "Order #": `PO-` + raised date without dashes + `-` + time without the colon. */
export function slipReference(order: Pick<ProductionOrder, 'date' | 'time'>): string {
  return `PO-${(order.date || '').replace(/-/g, '')}-${(order.time || '').replace(':', '')}`;
}

/** The web Orders table's labels; other statuses print as the raw value (shown capitalised there). */
const STATUS_LABEL: Partial<Record<ProductionOrderStatus, string>> = {
  awaiting_verification: 'Awaiting Verification',
  verified: 'Verified — Awaiting Approval',
  // The branch withdrew it — the same word the branch pressed.
  cancelled: 'Deleted by Branch',
};

export function productionOrderStatusLabel(status: string): string {
  const label = STATUS_LABEL[status as ProductionOrderStatus];
  if (label) return label;
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';
}

/** pending amber · awaiting blue · verified violet · approved green · rejected red · cancelled grey. */
export const PRODUCTION_ORDER_STATUS_VARIANT: Record<ProductionOrderStatus, StatusVariant> = {
  pending: 'warning',
  awaiting_verification: 'info',
  verified: 'violet',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

/** The Status filter, in the web's order. Values are what the Data Engine filters on. */
export const PRODUCTION_ORDER_STATUS_OPTIONS: { value: ProductionOrderStatus; label: string }[] = (
  ['pending', 'awaiting_verification', 'verified', 'approved', 'rejected', 'cancelled'] as const
).map((value) => ({ value, label: STATUS_LABEL[value] ?? value }));

// ─── Special Orders (SpecialOrdersPanel, production mode) ──────────────────

export const SPECIAL_ORDER_STATUS_LABEL: Record<SpecialOrderStatus, string> = {
  pending: 'Waiting for Preparation',
  awaiting_verification: 'Prepared — Waiting for Branch Verification',
  verified: 'Branch Verified — Waiting for Approval',
  approved: 'Verified & Approved — In Branch Stock',
};

export const SPECIAL_ORDER_STATUS_VARIANT: Record<SpecialOrderStatus, StatusVariant> = {
  pending: 'warning',
  awaiting_verification: 'info',
  verified: 'violet',
  approved: 'success',
};

/** Production's side of the panel: it is finished with an order once the branch has verified it, so approved ones drop off. */
export function openSpecialOrders(orders: SpecialOrder[]): SpecialOrder[] {
  return orders.filter((o) => o.status !== 'approved');
}

/** `pending` (to prepare) and legacy `verified` (to approve) are Production's to act on. */
export function specialOrdersNeedingAction(orders: SpecialOrder[]): number {
  return orders.filter((o) => o.status === 'pending' || o.status === 'verified').length;
}

// ─── Demand Summary — Waiting Orders ───────────────────────────────────────

/** Waiting runs until the BRANCH verifies — not until Production reviews. */
export function isWaitingOrder(order: Pick<ProductionOrder, 'status'>): boolean {
  return order.status === 'pending' || order.status === 'awaiting_verification';
}

export interface DemandPivotRow {
  key: string;
  name: string;
  total: number;
  /** The share of `total` already reviewed and out for delivery — never added on top of it. */
  sent: number;
  byBranch: Record<string, number>;
}

export interface SpecialDemandRow {
  orderId: string;
  demandNumber: string;
  branch: string;
  name: string;
  qty: number;
  description: string;
  photoCount: number;
  awaitingVerification: boolean;
}

export interface DemandSummary {
  /** Short branch names in the order the orders list them. */
  branches: string[];
  rows: DemandPivotRow[];
  packingRows: DemandPivotRow[];
  specialRows: SpecialDemandRow[];
  pendingOrders: number;
  awaitingOrders: number;
}

/**
 * The web's Product × Branch and Packing Material × Branch pivots over the
 * waiting orders. Quantity is `approvedQty ?? qty`; a line at or below zero is
 * skipped; special items are listed one by one instead of pivoted.
 */
export function buildDemandSummary(orders: ProductionOrder[]): DemandSummary {
  const branches = new Set<string>();
  const products = new Map<string, DemandPivotRow>();
  const packing = new Map<string, DemandPivotRow>();
  const specialRows: SpecialDemandRow[] = [];
  let pendingOrders = 0;
  let awaitingOrders = 0;

  for (const o of orders.filter(isWaitingOrder)) {
    const branch = shortBranch(o.branchName);
    branches.add(branch);
    const sent = o.status === 'awaiting_verification';
    if (sent) awaitingOrders += 1;
    else pendingOrders += 1;

    for (const it of o.items ?? []) {
      const qty = effectiveQty(it);
      if (qty <= 0) continue;
      if (it.isSpecial) {
        specialRows.push({
          orderId: o.id,
          demandNumber: o.demandNumber,
          branch,
          name: it.productName,
          qty,
          description: it.description ?? '',
          photoCount: (it.photos ?? []).length,
          awaitingVerification: sent,
        });
        continue;
      }
      let row = products.get(it.productId);
      if (!row) {
        row = { key: it.productId, name: it.productName, total: 0, sent: 0, byBranch: {} };
        products.set(it.productId, row);
      }
      row.total += qty;
      if (sent) row.sent += qty;
      row.byBranch[branch] = (row.byBranch[branch] ?? 0) + qty;
    }

    for (const it of o.packingItems ?? []) {
      const qty = effectivePackingQty(it);
      if (qty <= 0) continue;
      let row = packing.get(it.packingMaterialId);
      if (!row) {
        row = { key: it.packingMaterialId, name: it.materialName, total: 0, sent: 0, byBranch: {} };
        packing.set(it.packingMaterialId, row);
      }
      row.total += qty;
      if (sent) row.sent += qty;
      row.byBranch[branch] = (row.byBranch[branch] ?? 0) + qty;
    }
  }

  return {
    branches: [...branches],
    rows: [...products.values()],
    packingRows: [...packing.values()],
    specialRows,
    pendingOrders,
    awaitingOrders,
  };
}

/** "3 to make" or "2 of 3 to make" — a special item already sent is not one to make. */
export function specialToMakeLabel(rows: SpecialDemandRow[]): string {
  const toMake = rows.filter((r) => !r.awaitingVerification).length;
  return toMake === rows.length ? `${toMake} to make` : `${toMake} of ${rows.length} to make`;
}

/** "{n} to review · {m} sent, awaiting branch verification" — either half omitted at zero. */
export function waitingSubtitle(pendingOrders: number, awaitingOrders: number): string {
  const parts: string[] = [];
  if (pendingOrders > 0) parts.push(`${pendingOrders} to review`);
  if (awaitingOrders > 0) parts.push(`${awaitingOrders} sent, awaiting branch verification`);
  return parts.join(' · ');
}

// ─── Order slip (OrderPrintPreview, read-only) ─────────────────────────────

export interface SlipLine {
  key: string;
  productName: string;
  isSpecial: boolean;
  description: string;
  /** Production added it — the branch never demanded it, so Demand reads "—". */
  isAdded: boolean;
  demand: number;
  approved: number;
  unitPrice: number;
  amount: number;
}

const isFrozen = (status: ProductionOrderStatus): boolean =>
  status === 'awaiting_verification' || status === 'verified' || status === 'approved';

/**
 * The review table. Once the order has left `pending` the approved figure is
 * frozen (`approvedQty ?? qty`) and zero-approved lines are hidden from the
 * table — but the totals are still taken over EVERY line, as the web's are.
 * While pending every line shows at its requested quantity. Unit price is the
 * line's snapshot, falling back to the live price list only where there is no
 * snapshot (an older line, or one Production added).
 */
export function slipView(
  order: Pick<ProductionOrder, 'status' | 'items'>,
  livePriceById?: Map<string, number>,
): { lines: SlipLine[]; totals: { demand: number; approved: number; amount: number } } {
  const frozen = isFrozen(order.status);
  const all = (order.items ?? []).map((it, i): SlipLine => {
    const isAdded = it.addedByProduction === true;
    const qty = Number(it.qty) || 0;
    const approved = frozen ? Number(it.approvedQty ?? qty) || 0 : qty;
    const snapshot = it.unitPrice == null ? null : Number(it.unitPrice);
    const unitPrice = snapshot != null && Number.isFinite(snapshot) ? snapshot : (livePriceById?.get(it.productId) ?? 0);
    return {
      key: `${it.productId}-${i}`,
      productName: it.productName,
      isSpecial: it.isSpecial === true,
      description: (it.description ?? (it.isSpecial ? it.remarks : '')) || '',
      isAdded,
      demand: isAdded ? 0 : qty,
      approved,
      unitPrice,
      amount: approved * unitPrice,
    };
  });
  const totals = all.reduce(
    (a, l) => ({ demand: a.demand + l.demand, approved: a.approved + l.approved, amount: a.amount + l.amount }),
    { demand: 0, approved: 0, amount: 0 },
  );
  return { lines: frozen ? all.filter((l) => l.approved > 0) : all, totals };
}

export interface SlipPackingLine {
  key: string;
  materialName: string;
  requested: number;
  approved: number;
}

export function slipPackingLines(order: Pick<ProductionOrder, 'status' | 'packingItems'>): SlipPackingLine[] {
  const frozen = isFrozen(order.status);
  const lines = (order.packingItems ?? []).map((it) => {
    const requested = Number(it.qty) || 0;
    return {
      key: it.packingMaterialId,
      materialName: it.materialName,
      requested,
      approved: frozen ? Number(it.approvedQty ?? requested) || 0 : requested,
    };
  });
  return frozen ? lines.filter((l) => l.approved > 0) : lines;
}
