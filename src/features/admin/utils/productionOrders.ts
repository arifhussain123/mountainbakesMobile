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
  productId: string;
  isSpecial: boolean;
  description: string;
  /** Production added it — the branch never demanded it, so Demand reads "—". */
  isAdded: boolean;
  demand: number;
  approved: number;
  unitPrice: number;
  amount: number;
}

/**
 * Approved quantities typed under Change Quantity, keyed by product id (or
 * packing material id). Absent = not touched, which reads as the requested
 * quantity; `null` = the box was emptied, which counts as 0 — the web's
 * `parseInt(...) || 0`.
 */
export type QtyEdits = Record<string, number | null>;

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
  edits?: QtyEdits,
): { lines: SlipLine[]; totals: { demand: number; approved: number; amount: number } } {
  const frozen = isFrozen(order.status);
  const all = (order.items ?? []).map((it, i): SlipLine => {
    const isAdded = it.addedByProduction === true;
    const qty = Number(it.qty) || 0;
    const typed = edits?.[it.productId];
    const approved = frozen ? Number(it.approvedQty ?? qty) || 0 : typed !== undefined ? (typed ?? 0) : qty;
    const snapshot = it.unitPrice == null ? null : Number(it.unitPrice);
    const unitPrice = snapshot != null && Number.isFinite(snapshot) ? snapshot : (livePriceById?.get(it.productId) ?? 0);
    return {
      key: `${it.productId}-${i}`,
      productId: it.productId,
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
  packingMaterialId: string;
  materialName: string;
  requested: number;
  approved: number;
}

export function slipPackingLines(order: Pick<ProductionOrder, 'status' | 'packingItems'>, edits?: QtyEdits): SlipPackingLine[] {
  const frozen = isFrozen(order.status);
  const lines = (order.packingItems ?? []).map((it) => {
    const requested = Number(it.qty) || 0;
    const typed = edits?.[it.packingMaterialId];
    return {
      key: it.packingMaterialId,
      packingMaterialId: it.packingMaterialId,
      materialName: it.materialName,
      requested,
      approved: frozen ? Number(it.approvedQty ?? requested) || 0 : typed !== undefined ? (typed ?? 0) : requested,
    };
  });
  return frozen ? lines.filter((l) => l.approved > 0) : lines;
}

// ─── Review actions (OrderPrintPreview) ────────────────────────────────────

/**
 * What Submit for Verification sends for a 'pending' demand. Built from EVERY
 * line, never a filtered list: a short override list lets the server fall back
 * to its own default for the missing lines — silently re-approving in full
 * what somebody cut to zero.
 *
 * `changed` is the web's test exactly: any approved figure differing from what
 * the branch demanded. A line Production added always counts (its demand is
 * 0), so a reason is asked for whenever one is on the order.
 */
export function reviewSubmission(
  order: Pick<ProductionOrder, 'status' | 'items' | 'packingItems'>,
  edits: QtyEdits,
  packingEdits: QtyEdits,
): {
  approvedItems: { productId: string; approvedQty: number }[];
  approvedPackingItems: { packingMaterialId: string; approvedQty: number }[];
  changed: boolean;
} {
  const { lines } = slipView({ ...order, status: 'pending' }, undefined, edits);
  const packing = slipPackingLines({ ...order, status: 'pending' }, packingEdits);
  return {
    approvedItems: lines.map((l) => ({ productId: l.productId, approvedQty: l.approved })),
    approvedPackingItems: packing.map((p) => ({ packingMaterialId: p.packingMaterialId, approvedQty: p.approved })),
    changed: lines.some((l) => l.approved !== l.demand) || packing.some((p) => p.approved !== p.requested),
  };
}

/** Add Product offers only products not already on the demand. */
export function addableProducts<P extends { id: string }>(products: P[], order: Pick<ProductionOrder, 'items'>): P[] {
  const onOrder = new Set((order.items ?? []).map((it) => it.productId));
  return products.filter((p) => !onOrder.has(p.id));
}

/** Return offers only products that actually went out on this delivery. */
export function returnableItems(order: Pick<ProductionOrder, 'items'>): { productId: string; productName: string }[] {
  return (order.items ?? [])
    .filter((it) => (Number(it.approvedQty) || 0) > 0)
    .map((it) => ({ productId: it.productId, productName: it.productName }));
}

export interface StockShortageNotice {
  title: string;
  messages: string[];
  shortages: { productName: string; required: number; available: number; short: number }[];
  after: string[];
}

/**
 * The stock shortage the server refused Submit for Verification with (a 409
 * whose `details` is a Restriction Rules notice), or null for any other error.
 * The response's own `error` is the bare code INSUFFICIENT_STOCK, so the notice
 * — every short product with its exact quantities — is what gets shown.
 */
export function shortageFromError(err: unknown): StockShortageNotice | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as { status?: unknown; details?: unknown };
  if (e.status !== 409 || !e.details || typeof e.details !== 'object') return null;
  const d = e.details as { code?: unknown; restriction?: unknown };
  if (d.code !== 'restriction' || !d.restriction || typeof d.restriction !== 'object') return null;
  const r = d.restriction as { title?: unknown; messages?: unknown; shortages?: unknown; after?: unknown };
  const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return {
    title: typeof r.title === 'string' && r.title ? r.title : 'Insufficient Production Stock',
    messages: strings(r.messages),
    shortages: Array.isArray(r.shortages)
      ? r.shortages.map((x: { productName?: unknown; required?: unknown; available?: unknown; short?: unknown }) => ({
          productName: String(x?.productName ?? ''),
          required: Number(x?.required) || 0,
          available: Number(x?.available) || 0,
          short: Number(x?.short) || 0,
        }))
      : [],
    after: strings(r.after),
  };
}

// ─── Special Orders: Mark Prepared ─────────────────────────────────────────

/**
 * The Prepared Qty boxes, checked the web's way: every item needs a figure
 * (an empty box is not 0), and at least one must be above 0. Returns the
 * request body, or the problem to show in its place.
 */
export function preparePayload(
  items: { id: string; qty: number }[],
  typed: QtyEdits,
): { items: { itemId: string; preparedQty: number }[] } | { problem: string } {
  const rows = items.map((it) => ({ itemId: it.id, qty: typed[it.id] === undefined ? Number(it.qty) || 0 : typed[it.id] }));
  if (rows.some((r) => r.qty === null)) return { problem: 'Enter the quantity prepared for every item.' };
  if (rows.every((r) => r.qty === 0)) return { problem: 'Enter the quantity prepared for at least one item.' };
  return { items: rows.map((r) => ({ itemId: r.itemId, preparedQty: r.qty ?? 0 })) };
}
