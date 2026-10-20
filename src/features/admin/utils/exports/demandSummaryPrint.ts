import type { ProductionOrder } from '@/api/types';
import { effectivePackingQty, effectiveQty } from '@/features/orders/utils/demandLines';
import { TEXT_COLUMNS, centerText, joinLines, kvLine, numText, ruleLine, textRow, textTable, type TextColumn } from '@/shared/utils/textLayout';
import { isWaitingOrder, shortBranch } from '../productionOrders';

/**
 * "Print for Production" on the Orders page — the web's
 * `DemandSummaryPrintModal`: one snapshot of every waiting demand
 * (`buildDemandSummarySnapshot`), printed as the POS receipt
 * (`buildDemandSummaryDocument`, 80mm or 58mm) or the A4 report
 * (`DemandSummaryA4Sheet`). Printing never touches an order or stock.
 */

export type DemandPrintFormat = '80mm' | '58mm' | 'a4';

export const DEMAND_PRINT_FORMATS: { value: DemandPrintFormat; label: string }[] = [
  { value: '80mm', label: 'POS 80mm' },
  { value: '58mm', label: 'POS 58mm' },
  { value: 'a4', label: 'A4 Report' },
];

export interface DemandSnapshot {
  pendingOrders: number;
  awaitingOrders: number;
  products: { productId: string; productName: string; qty: number; stock: number | null; balance: number | null }[];
  packing: { packingMaterialId: string; materialName: string; qty: number }[];
  /** `amount` is null when a line going to that branch could not be priced. */
  branches: { branchId: string; branchName: string; qty: number; amount: number | null }[];
  totals: {
    distinctProducts: number;
    totalProductQty: number;
    distinctPacking: number;
    totalPackingQty: number;
    /** null while today's stock has not loaded. */
    totalStock: number | null;
    balanceStock: number | null;
    /** null when any branch's amount is unknown — never an understated total. */
    grandAmount: number | null;
  };
}

/** The line's snapshot rate, or null when it has none (a 0 is a real rate). */
function rateOf(unitPrice: unknown): number | null {
  if (unitPrice === null || unitPrice === undefined) return null;
  const n = Number(unitPrice);
  return Number.isFinite(n) ? n : null;
}

/**
 * The web's `buildDemandSummarySnapshot`: waiting orders (pending + awaiting
 * verification), quantity `approvedQty ?? qty`, special items left out of the
 * pivot, prices snapshot-first with the live list as fallback, and today's
 * stock per product (`stockByProduct` null = not loaded yet).
 */
export function buildDemandSnapshot(
  orders: ProductionOrder[],
  livePriceById: Map<string, number>,
  stockByProduct: Map<string, number> | null,
): DemandSnapshot {
  const productRows = new Map<string, { productId: string; productName: string; qty: number }>();
  const packingRows = new Map<string, DemandSnapshot['packing'][number]>();
  const branchRows = new Map<string, { branchId: string; branchName: string; qty: number; amount: number; known: boolean }>();
  let pendingOrders = 0;
  let awaitingOrders = 0;

  for (const o of orders.filter(isWaitingOrder)) {
    if (o.status === 'awaiting_verification') awaitingOrders += 1;
    else pendingOrders += 1;
    let branch = branchRows.get(o.branchId);
    if (!branch) {
      branch = { branchId: o.branchId, branchName: shortBranch(o.branchName), qty: 0, amount: 0, known: true };
      branchRows.set(o.branchId, branch);
    }
    for (const it of o.items ?? []) {
      const qty = effectiveQty(it);
      if (qty <= 0 || it.isSpecial) continue;
      const row = productRows.get(it.productId) ?? { productId: it.productId, productName: it.productName, qty: 0 };
      row.qty += qty;
      productRows.set(it.productId, row);
      branch.qty += qty;
      const rate = rateOf(it.unitPrice) ?? livePriceById.get(it.productId) ?? null;
      if (rate === null) branch.known = false;
      else branch.amount += qty * rate;
    }
    for (const it of o.packingItems ?? []) {
      const qty = effectivePackingQty(it);
      if (qty <= 0) continue;
      const row = packingRows.get(it.packingMaterialId) ?? { packingMaterialId: it.packingMaterialId, materialName: it.materialName, qty: 0 };
      row.qty += qty;
      packingRows.set(it.packingMaterialId, row);
    }
  }

  const products = [...productRows.values()].map((r) => {
    const stock = stockByProduct ? (stockByProduct.get(r.productId) ?? 0) : null;
    return { ...r, stock, balance: stock === null ? null : stock - r.qty };
  });
  const branches = [...branchRows.values()].map(({ known, ...b }) => ({ ...b, amount: known ? b.amount : null }));
  const totalProductQty = products.reduce((s, r) => s + r.qty, 0);
  const totalStock = stockByProduct ? products.reduce((s, r) => s + (r.stock ?? 0), 0) : null;
  return {
    pendingOrders,
    awaitingOrders,
    products,
    packing: [...packingRows.values()],
    branches,
    totals: {
      distinctProducts: productRows.size,
      totalProductQty,
      distinctPacking: packingRows.size,
      totalPackingQty: [...packingRows.values()].reduce((s, r) => s + r.qty, 0),
      totalStock,
      balanceStock: totalStock === null ? null : totalStock - totalProductQty,
      grandAmount: branches.some((b) => b.amount === null) ? null : branches.reduce((s, b) => s + (b.amount ?? 0), 0),
    },
  };
}

/** "3 to review · 2 sent, awaiting branch verification". */
export function demandStatusText(s: Pick<DemandSnapshot, 'pendingOrders' | 'awaitingOrders'>): string {
  const parts: string[] = [];
  if (s.pendingOrders > 0) parts.push(`${s.pendingOrders} to review`);
  if (s.awaitingOrders > 0) parts.push(`${s.awaitingOrders} sent, awaiting branch verification`);
  return parts.join(' · ');
}

export interface DemandPrintContext {
  companyName: string;
  currencySymbol: string;
  /** e.g. "20 Oct 2026". */
  businessDateText: string;
  printDateText: string;
  printTimeText: string;
}

/** Something to print — the web disables Print when nothing is waiting. */
export function hasDemandToPrint(s: DemandSnapshot): boolean {
  return s.products.length > 0 || s.packing.length > 0;
}

/** The POS receipt (80mm / 58mm) — `buildDemandSummaryDocument`. */
function posText(s: DemandSnapshot, ctx: DemandPrintContext, paper: '80mm' | '58mm'): string {
  const w = TEXT_COLUMNS[paper];
  const sym = ctx.currencySymbol.trim() || 'Rs.';
  const money = (n: number) => `${sym} ${numText(n)}`;
  const status = demandStatusText(s);
  const qtyCol: TextColumn[] = [{ header: 'Product' }, { header: 'Qty', width: 7 }];
  return joinLines([
    ...centerText((ctx.companyName.trim() || 'Mountain Bakes').toUpperCase(), w),
    ...centerText('Production Department', w),
    ...centerText('Production Demand Summary', w),
    ruleLine(w),
    ...kvLine('Business Date', ctx.businessDateText, w),
    ...kvLine('Printed', `${ctx.printDateText} ${ctx.printTimeText}`, w),
    ...(status ? kvLine('Status', status, w) : []),
    ruleLine(w),
    'PRODUCT DEMAND',
    ...textTable(qtyCol, s.products.map((p) => [p.productName, numText(p.qty)]), w),
    ...(s.products.length === 0 ? ['No waiting demand.'] : []),
    ...kvLine('Total Qty', numText(s.totals.totalProductQty), w),
    ruleLine(w),
    ...(s.packing.length > 0
      ? [
          'PACKING MATERIAL REQUIREMENTS',
          ...textTable([{ header: 'Packing Material' }, { header: 'Qty', width: 7 }], s.packing.map((p) => [p.materialName, numText(p.qty)]), w),
          ...kvLine('Packing Qty', numText(s.totals.totalPackingQty), w),
          ruleLine(w),
        ]
      : []),
    'DEMAND TOTALS',
    ...kvLine('Distinct Products', numText(s.totals.distinctProducts), w),
    ...kvLine('Total Product Qty', numText(s.totals.totalProductQty), w),
    ...(s.totals.distinctPacking > 0 ? kvLine('Distinct Packing Items', numText(s.totals.distinctPacking), w) : []),
    ...(s.totals.distinctPacking > 0 ? kvLine('Total Packing Qty', numText(s.totals.totalPackingQty), w) : []),
    ruleLine(w),
    'BRANCH-WISE SUMMARY',
    ...textTable(
      [{ header: 'Branch' }, { header: 'Qty', width: 6 }, { header: 'Amount', width: paper === '58mm' ? 11 : 13 }],
      s.branches.map((b) => [b.branchName, numText(b.qty), b.amount === null ? 'N/A' : money(b.amount)]),
      w,
    ),
    ...kvLine('Grand Qty', numText(s.totals.totalProductQty), w),
    ...kvLine('Grand Amount', s.totals.grandAmount === null ? 'Amount unavailable' : money(s.totals.grandAmount), w),
    ruleLine(w),
    ...centerText('* Design & developed by arifsiksavi@gmail.com | 0322-2050545 *', w),
  ]);
}

/** The A4 report — `DemandSummaryA4Sheet`. */
function a4Text(s: DemandSnapshot, ctx: DemandPrintContext): string {
  const w = TEXT_COLUMNS.a4;
  const sym = ctx.currencySymbol || 'Rs.';
  const money = (n: number) => `${sym} ${Math.round(n).toLocaleString('en-US')}`;
  const fmt = (n: number) => n.toLocaleString('en-US');
  const status = demandStatusText(s);
  const branchCols: TextColumn[] = [{ header: 'Branch Name' }, { header: 'Total Qty', width: 10 }, { header: 'Total Amount', width: 18 }];
  return joinLines([
    ...centerText(ctx.companyName || 'Mountain Bakes', w),
    ...centerText('Production Department', w),
    ...centerText('PRODUCTION DEMAND SUMMARY', w),
    ...centerText(`Business Date: ${ctx.businessDateText}   Printed: ${ctx.printDateText} ${ctx.printTimeText}`, w),
    ...(status ? centerText(status, w) : []),
    '='.repeat(w),
    'PRODUCT DEMAND SUMMARY',
    ...textTable(
      [{ header: 'S.No. Product Name' }, { header: 'Total Demand Qty', width: 16 }],
      s.products.map((p, i) => [`${i + 1}. ${p.productName}`, fmt(p.qty)]),
      w,
    ),
    ...(s.products.length === 0 ? ['No waiting demand.'] : []),
    '',
    'PACKING MATERIAL REQUIREMENTS',
    ...(s.packing.length === 0
      ? ['No packing material requirements.']
      : textTable([{ header: 'Packing Material' }, { header: 'Required Qty', width: 12 }], s.packing.map((p) => [p.materialName, fmt(p.qty)]), w)),
    '',
    'BRANCH-WISE SUMMARY',
    ...textTable(branchCols, s.branches.map((b) => [b.branchName, fmt(b.qty), b.amount === null ? 'Amount unavailable' : money(b.amount)]), w),
    ruleLine(w),
    ...textRow(
      branchCols,
      ['Grand Total', fmt(s.totals.totalProductQty), s.totals.grandAmount === null ? 'Amount unavailable' : money(s.totals.grandAmount)],
      w,
    ),
    '',
    'STOCK SUMMARY',
    ...kvLine('Total Stock', s.totals.totalStock === null ? '—' : fmt(s.totals.totalStock), w),
    ...kvLine('Total Demand', fmt(s.totals.totalProductQty), w),
    ...kvLine('Balance', s.totals.balanceStock === null ? '—' : fmt(s.totals.balanceStock), w),
    '',
    ...centerText('* Design & developed by arifsiksavi@gmail.com | 0322-2050545 *', w),
  ]);
}

export function buildDemandSummaryPrintText(s: DemandSnapshot, ctx: DemandPrintContext, format: DemandPrintFormat): string {
  return format === 'a4' ? a4Text(s, ctx) : posText(s, ctx, format);
}
