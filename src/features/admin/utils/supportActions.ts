import type {
  PaymentMethod,
  Product,
  SupportDemandItem,
  SupportFiguresResult,
  SupportProductionStockFigures,
  SupportReference,
  SupportSaleItem,
  SupportSaleItemInput,
  SupportSaleTotals,
  SupportStockFigures,
  SupportTicket,
} from '@/api';

/**
 * Pure rules behind the Super Admin Support Center's Branches & Production
 * actions — the web `SupportCenterPage`'s row actions, `ChangeDialog`
 * dispatcher and its editors (sale lines, demand lines, branch stock, the
 * production pool, cash deposits, flat fields), reproduced exactly. Every gate
 * is courtesy: `/api/support` re-decides each write (`requireRole('super_admin')`)
 * and re-reads the live record before moving anything.
 */

type TicketLike = Pick<SupportTicket, 'referenceType' | 'referenceSnapshot' | 'raisedByRole' | 'status'>;

/** A stock ticket about the central production pool — the snapshot's flag, else the raiser's role (legacy snapshots). */
export function isPoolStockTicket(t: Pick<SupportTicket, 'referenceType' | 'referenceSnapshot' | 'raisedByRole'>): boolean {
  if (t.referenceType !== 'stock') return false;
  return t.referenceSnapshot?.isProductionPool === true || t.raisedByRole === 'production_user';
}

/** A rejected CT- deposit is final — nothing was booked, so nothing can be corrected. */
export function isRejectedDeposit(ref: SupportReference | null | undefined): boolean {
  return ref?.type === 'cash_transfer' && ref.fields.some((f) => f.label === 'Status' && f.value === 'Rejected');
}

/** Web `useLiveReference.canRefresh`: read-only references are not re-read, except a pool ticket and a cash deposit. */
export function canRefreshReference(t: Pick<SupportTicket, 'referenceType' | 'referenceSnapshot' | 'raisedByRole'>): boolean {
  const snapshot = t.referenceSnapshot;
  return Boolean(snapshot) && (snapshot?.readOnly !== true || isPoolStockTicket(t) || t.referenceType === 'cash_transfer');
}

/**
 * Web `canChange`: "Change figures" only where something can be changed. A
 * pool ticket, a demand (deletable even when its lines are not) and a
 * non-rejected deposit override the snapshot's read-only flag.
 */
export function canChangeFigures(t: Pick<SupportTicket, 'referenceType' | 'referenceSnapshot' | 'raisedByRole'>): boolean {
  const ref = t.referenceSnapshot;
  return (
    Boolean(ref) &&
    (ref?.readOnly !== true ||
      isPoolStockTicket(t) ||
      t.referenceType === 'demand' ||
      (t.referenceType === 'cash_transfer' && !isRejectedDeposit(ref)))
  );
}

export interface SupportTicketActions {
  /** "Mark Resolved" lives in View and only while the query is open. */
  resolve: boolean;
  edit: boolean;
  change: boolean;
  reject: boolean;
  /** "Delete record" — any cash deposit query, whatever its status (the server answers 409 when it is gone). */
  deleteDeposit: boolean;
  archive: boolean;
}

export function supportTicketActions(t: TicketLike): SupportTicketActions {
  return {
    resolve: t.status === 'open',
    edit: true,
    change: canChangeFigures(t),
    reject: true,
    deleteDeposit: t.referenceType === 'cash_transfer' && Boolean(t.referenceSnapshot?.entityId),
    archive: true,
  };
}

export type ChangeEditor = 'pool' | 'deleteDemand' | 'deposit' | 'nothing' | 'sale' | 'demand' | 'stock' | 'fields';

/** Web `ChangeDialog` — which editor a reference deserves, checked in the web's order. */
export function changeEditorFor(t: Pick<SupportTicket, 'referenceType' | 'referenceSnapshot' | 'raisedByRole'>): ChangeEditor {
  const ref = t.referenceSnapshot;
  if (ref && isPoolStockTicket(t)) return 'pool';
  if (ref?.type === 'demand' && ref.readOnly) return 'deleteDemand';
  if (ref?.type === 'cash_transfer' && !isRejectedDeposit(ref)) return 'deposit';
  if (!ref || ref.readOnly) return 'nothing';
  if (ref.type === 'sale' && ref.saleItems) return 'sale';
  if (ref.type === 'demand' && ref.demandItems) return 'demand';
  if (ref.type === 'stock') return 'stock';
  return 'fields';
}

/** Web EditDialog disables Save under 3 characters (the schema's `message.min(3)`). */
export function editMessageProblem(message: string): string | null {
  return message.trim().length < 3 ? 'Describe the issue in at least 3 characters.' : null;
}

/** "Type DMD-… / CT-… to confirm" — case and surrounding spaces ignored, as on the web (the server re-checks). */
export function confirmNumberMatches(typed: string, number: string): boolean {
  return typed.trim().toUpperCase() === number.trim().toUpperCase();
}

/** DeleteDemandSchema / DeleteCashDepositSchema: `.trim().min(5)`. */
export function deleteReasonValid(reason: string): boolean {
  return reason.trim().length >= 5;
}

export function deleteDemandSuccess(demandNumber: string, res: { stockMoved: boolean; branchReversals: unknown[] }): string {
  const n = res.branchReversals.length;
  return res.stockMoved ? `${demandNumber} deleted — stock reversed on ${n} product${n === 1 ? '' : 's'}` : `${demandNumber} deleted`;
}

// ─── Sale line editor ───────────────────────────────────────────────────────

export const SALE_PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'easypaisa', 'foodpanda', 'bank_account'];
export const SALE_PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank Account',
  staff: 'Staff',
  card: 'Card',
  online: 'Online',
};

/** One editable line, numbers kept as typed (web `Number(e.target.value)` on read: blank is 0). */
export interface SaleDraftRow {
  key: string;
  productId: string | null;
  productName: string;
  categoryId: string | null;
  categoryName: string | null;
  unitPrice: string;
  qty: string;
  discount: string;
}

const num = (v: string | undefined) => Number(v ?? 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function saleDraftRows(items: SupportSaleItem[], prefix: string): SaleDraftRow[] {
  return items.map((it, i) => ({
    key: `${prefix}-${i}`,
    productId: it.productId,
    productName: it.productName,
    categoryId: it.categoryId ?? null,
    categoryName: it.categoryName ?? null,
    unitPrice: String(it.unitPrice),
    qty: String(it.qty),
    discount: String(it.discount),
  }));
}

export function emptySaleRow(key: string): SaleDraftRow {
  return { key, productId: null, productName: '', categoryId: null, categoryName: null, unitPrice: '0', qty: '1', discount: '0' };
}

/**
 * Swapping the product resets the rate to its current price and clears the
 * discount — the old one was struck against a different item's price.
 */
export function pickSaleProduct(row: SaleDraftRow, p: Pick<Product, 'id' | 'name' | 'categoryId' | 'categoryName' | 'price'>): SaleDraftRow {
  return {
    ...row,
    productId: p.id,
    productName: p.name,
    categoryId: p.categoryId || null,
    categoryName: p.categoryName || null,
    unitPrice: String(Number(p.price ?? 0)),
    discount: '0',
  };
}

/** Rate × qty − line discount, unclamped — exactly as edit_sale_items computes it. */
export function saleLineTotal(r: SaleDraftRow): number {
  return num(r.unitPrice) * num(r.qty) - num(r.discount);
}

export function saleDiscountTooBig(r: SaleDraftRow): boolean {
  return num(r.discount) > num(r.unitPrice) * num(r.qty) || num(r.discount) < 0;
}

export function saleRowValid(r: SaleDraftRow): boolean {
  const qty = num(r.qty);
  const price = num(r.unitPrice);
  const discount = num(r.discount);
  return Boolean(r.productId) && qty > 0 && price >= 0 && discount >= 0 && discount <= price * qty;
}

/** The sale's money row as the edits leave it — rounded at every step, like the numeric(14,2) columns. */
export function salePreviewTotals(rows: SaleDraftRow[], totals: SupportSaleTotals | undefined) {
  const gross = round2(rows.reduce((s, r) => s + num(r.unitPrice) * num(r.qty), 0));
  const discountTotal = round2(rows.reduce((s, r) => s + num(r.discount), 0));
  const subtotal = round2(gross - discountTotal);
  const delivery = totals?.deliveryCharges ?? 0;
  const taxAmount = round2(subtotal * (totals?.taxRate ?? 0));
  return { gross, discountTotal, subtotal, delivery, taxAmount, grandTotal: round2(subtotal + delivery + taxAmount) };
}

export const SALE_ROWS_PROBLEM = 'Every line needs a product, a quantity above 0, an amount, and a discount no bigger than the line';

/** The `/sale-items` lines, or null when any line is invalid (web `valid`). */
export function saleItemsPayload(rows: SaleDraftRow[]): SupportSaleItemInput[] | null {
  if (rows.length === 0 || !rows.every(saleRowValid)) return null;
  return rows.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    unitPrice: num(r.unitPrice),
    qty: num(r.qty),
    discount: num(r.discount),
  }));
}

// ─── Demand line editor ─────────────────────────────────────────────────────

export interface DemandDraftRow {
  key: string;
  productId: string;
  productName: string;
  qty: string;
  approvedQty: string;
}

export function demandDraftRows(items: SupportDemandItem[], prefix: string): DemandDraftRow[] {
  return items.map((it, i) => ({ key: `${prefix}-${i}`, productId: it.productId, productName: it.productName, qty: String(it.qty), approvedQty: String(it.approvedQty) }));
}

export function emptyDemandRow(key: string): DemandDraftRow {
  return { key, productId: '', productName: '', qty: '0', approvedQty: '0' };
}

/** What the branch ledger will move: new approved − old approved per product, zero-deltas dropped, removed lines reversed. */
export function demandDeltas(rows: DemandDraftRow[], original: SupportDemandItem[]): { productName: string; delta: number }[] {
  const was = new Map(original.map((i) => [i.productId, i.approvedQty]));
  const out: { productName: string; delta: number }[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r.productId) continue;
    seen.add(r.productId);
    const d = num(r.approvedQty) - (was.get(r.productId) ?? 0);
    if (d !== 0) out.push({ productName: r.productName, delta: d });
  }
  for (const [pid, approved] of was) {
    if (!seen.has(pid) && approved !== 0) {
      out.push({ productName: original.find((i) => i.productId === pid)?.productName ?? 'Removed line', delta: -approved });
    }
  }
  return out;
}

export function demandDuplicated(rows: DemandDraftRow[]): boolean {
  const ids = rows.map((r) => r.productId).filter(Boolean);
  return new Set(ids).size !== ids.length;
}

/** The web's toast when Save is pressed on an invalid demand, or null. */
export function demandProblem(rows: DemandDraftRow[]): string | null {
  const dup = demandDuplicated(rows);
  const valid = rows.length > 0 && rows.every((r) => Boolean(r.productId) && num(r.qty) >= 0 && num(r.approvedQty) >= 0) && !dup;
  if (valid) return null;
  return dup ? 'The same product is on two lines — combine them' : 'Every line needs a product and quantities of 0 or more';
}

export function demandItemsPayload(rows: DemandDraftRow[]) {
  return rows.map((r) => ({ productId: r.productId, productName: r.productName, qty: num(r.qty), approvedQty: num(r.approvedQty) }));
}

export function demandSuccess(stockMoved: boolean, deltaCount: number): string {
  return stockMoved && deltaCount ? 'Demand updated, stock reconciled & query resolved' : 'Demand updated & query resolved';
}

// ─── Branch stock editor ────────────────────────────────────────────────────

export type StockKey = 'opening' | 'newQty' | 'sold' | 'returned' | 'adjustment' | 'balance';
export type StockTargets = Record<StockKey, string>;

export const STOCK_FIELDS: readonly { key: 'newQty' | 'sold' | 'returned'; label: string; hint: string }[] = [
  { key: 'newQty', label: 'New Stock', hint: 'units received from Production' },
  { key: 'sold', label: 'Sold', hint: 'units sold today' },
  { key: 'returned', label: 'Returned', hint: 'units sent back to Production' },
];

export function stockTargetsFrom(f: SupportStockFigures): StockTargets {
  return {
    opening: String(f.opening),
    newQty: String(f.newQty),
    sold: String(f.sold),
    returned: String(f.returned),
    adjustment: String(f.adjustment),
    balance: String(f.balance),
  };
}

export interface StockEditorState {
  targets: StockTargets;
  /** Balance and Adjustment are one degree of freedom — exactly one is typed, the other follows. */
  residualMode: 'balance' | 'adjustment';
  balanceTouched: boolean;
  adjustmentTouched: boolean;
}

/**
 * Web StockFiguresDialog's arithmetic: opening + new − sold − returned +
 * adjustment = balance. Only figures the admin actually moved are sent (an
 * absolute target left in would revert a sale rung up meanwhile), and never
 * both Balance and Adjustment.
 */
export function stockCorrection(f: SupportStockFigures, s: StockEditorState) {
  const t = s.targets;
  const inAdjustmentMode = s.residualMode === 'adjustment';
  const base = num(t.opening) + num(t.newQty) - num(t.sold) - num(t.returned);
  const implied = base + f.adjustment;
  const extraAdjustment = inAdjustmentMode ? num(t.adjustment) - f.adjustment : s.balanceTouched ? num(t.balance) - implied : 0;
  const finalBalance = inAdjustmentMode ? base + num(t.adjustment) : s.balanceTouched ? num(t.balance) : implied;
  const finalAdjustment = inAdjustmentMode ? num(t.adjustment) : f.adjustment + extraAdjustment;
  const shownBalance = inAdjustmentMode ? String(finalBalance) : s.balanceTouched ? t.balance : String(implied);
  const shownAdjustment = inAdjustmentMode ? (s.adjustmentTouched ? t.adjustment : String(f.adjustment)) : String(finalAdjustment);

  const invalid =
    (['opening', 'newQty', 'sold', 'returned'] as const).some((k) => {
      const v = num(t[k]);
      return t[k] === '' || !Number.isFinite(v) || v < 0;
    }) ||
    (!inAdjustmentMode && s.balanceTouched && t.balance === '') ||
    (inAdjustmentMode && (t.adjustment === '' || !Number.isFinite(num(t.adjustment)))) ||
    finalBalance < 0;

  const edits: Record<string, number> = {};
  for (const k of ['opening', 'newQty', 'sold', 'returned'] as const) {
    if (num(t[k]) !== f[k]) edits[k] = num(t[k]);
  }
  if (inAdjustmentMode) {
    if (s.adjustmentTouched && num(t.adjustment) !== f.adjustment) edits.adjustment = num(t.adjustment);
  } else if (s.balanceTouched && num(t.balance) !== implied) {
    edits.balance = num(t.balance);
  }

  return { implied, extraAdjustment, finalBalance, finalAdjustment, shownBalance, shownAdjustment, invalid, edits, changed: Object.keys(edits).length > 0 };
}

export function stockSuccess(res: SupportFiguresResult): string {
  return res.stock?.applied
    ? `Branch stock corrected — balance ${res.stock.before.balance} → ${res.stock.after.balance}`
    : 'Branch stock already matched — query resolved';
}

// ─── Production pool editor ─────────────────────────────────────────────────

/**
 * The pool's movement figures. `key` is what `/figures` reads for the pool
 * (`preparedToday` / `approvedQty` / `soldToday`); `figure` is where the live
 * row carries it — Demand Fulfilled is the pool's `demandFulfilled`, sent as
 * `approvedQty`. No Returned: a branch return is Branch Return Stock.
 */
export const PRODUCTION_FIELDS: readonly {
  key: 'preparedToday' | 'approvedQty' | 'soldToday';
  figure: 'preparedToday' | 'demandFulfilled' | 'soldToday';
  label: string;
  hint: string;
}[] = [
  { key: 'preparedToday', figure: 'preparedToday', label: 'Prepared Today', hint: 'units made today' },
  { key: 'approvedQty', figure: 'demandFulfilled', label: 'Demand Fulfilled', hint: 'units verified out to branches' },
  { key: 'soldToday', figure: 'soldToday', label: 'Sold', hint: 'units sold at the counter' },
];

/** Web ProductionStockFiguresDialog: prepared adds to the day, approved and sold take from it; a negative balance is allowed. */
export function productionCorrection(f: SupportProductionStockFigures, edited: Record<string, string>) {
  const t: Record<string, string> = {
    preparedToday: String(f.preparedToday),
    approvedQty: String(f.demandFulfilled),
    soldToday: String(f.soldToday),
    ...edited,
  };
  const balanceTouched = edited.balance !== undefined;
  const implied = f.balance + (num(t.preparedToday) - f.preparedToday) - (num(t.approvedQty) - f.demandFulfilled) - (num(t.soldToday) - f.soldToday);
  const extraAdjustment = balanceTouched ? num(t.balance) - implied : 0;
  const finalBalance = balanceTouched ? num(t.balance) : implied;
  const shownBalance = balanceTouched ? (t.balance ?? '') : String(implied);
  const invalid =
    PRODUCTION_FIELDS.some((p) => {
      const v = num(t[p.key]);
      return t[p.key] === '' || !Number.isFinite(v) || v < 0;
    }) ||
    (balanceTouched && (t.balance === '' || !Number.isFinite(num(t.balance))));

  const edits: Record<string, number> = {};
  for (const p of PRODUCTION_FIELDS) {
    if (num(t[p.key]) !== f[p.figure]) edits[p.key] = num(t[p.key]);
  }
  if (balanceTouched && num(t.balance) !== implied) edits.balance = num(t.balance);

  return { values: t, balanceTouched, implied, extraAdjustment, finalBalance, shownBalance, invalid, edits, changed: Object.keys(edits).length > 0 };
}

export function productionSuccess(res: SupportFiguresResult): string {
  return res.productionStock?.applied
    ? `Production stock corrected — today's balance ${res.productionStock.before.balance} → ${res.productionStock.after.balance}`
    : 'Production stock already matched — query resolved';
}

// ─── Cash deposit editor ────────────────────────────────────────────────────

export type DepositFigure = 'cashAmount' | 'easypaisaAmount' | 'bankAmount' | 'fuelCharges';

export const DEPOSIT_FIGURES: readonly { key: DepositFigure; label: string }[] = [
  { key: 'cashAmount', label: 'Cash' },
  { key: 'easypaisaAmount', label: 'Easypaisa' },
  { key: 'bankAmount', label: 'Bank' },
  { key: 'fuelCharges', label: 'Fuel Charges' },
];

export interface DepositValues {
  figures: Record<DepositFigure, string>;
  note: string;
  date: string;
}

/** The deposit as it stands now — from the LIVE reference's editable fields. */
export function depositCurrent(live: SupportReference | null | undefined): DepositValues {
  const get = (key: string) => live?.editableFields?.find((f) => f.key === key)?.value;
  return {
    figures: {
      cashAmount: String(get('cashAmount') ?? '0'),
      easypaisaAmount: String(get('easypaisaAmount') ?? '0'),
      bankAmount: String(get('bankAmount') ?? '0'),
      fuelCharges: String(get('fuelCharges') ?? '0'),
    },
    note: String(get('note') ?? ''),
    date: live?.businessDate ?? '',
  };
}

const depositNum = (v: string) => (v.trim() === '' ? 0 : Number(v));

/** Total = Cash + Easypaisa + Bank — shown, never typed (the server recomputes it). */
export function depositTotal(figures: Record<DepositFigure, string>): number {
  return Math.round(((depositNum(figures.cashAmount) || 0) + (depositNum(figures.easypaisaAmount) || 0) + (depositNum(figures.bankAmount) || 0)) * 100) / 100;
}

export function depositChangedFigures(figures: Record<DepositFigure, string>, current: DepositValues): DepositFigure[] {
  return DEPOSIT_FIGURES.filter((f) => depositNum(figures[f.key]) !== depositNum(current.figures[f.key])).map((f) => f.key);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Web CashDepositDialog's `submit` checks, in order — the `/figures` edits or the problem to show. */
export function depositEdits(next: DepositValues, current: DepositValues, today: string): { edits: Record<string, string | number> } | { error: string } {
  const edits: Record<string, string | number> = {};
  for (const key of depositChangedFigures(next.figures, current)) {
    const n = depositNum(next.figures[key]);
    if (!Number.isFinite(n) || n < 0) return { error: 'Amounts must be numbers, 0 or more' };
    edits[key] = n;
  }
  if (next.note.trim() !== current.note.trim()) edits.note = next.note.trim();
  const date = next.date.trim();
  if (date !== '' && date !== current.date) {
    if (!ISO_DATE.test(date)) return { error: 'Use YYYY-MM-DD for the date' };
    if (date > today) return { error: 'The date cannot be in the future' };
    edits.businessDate = date;
  }
  if (Object.keys(edits).length === 0) return { error: 'Change at least one value' };
  return { edits };
}

// ─── Flat field editor (expenses, and anything with no correctable figure) ──

export interface FieldEditRow {
  key: string;
  label: string;
  value: string;
  editable: boolean;
}

/** Web FieldEditDialog: the expense's editable fields applied live, or the display fields recorded for manual follow-up. */
export function fieldEditRows(ref: SupportReference | null | undefined): { rows: FieldEditRow[]; isLiveEdit: boolean } {
  if (!ref) return { rows: [], isLiveEdit: false };
  const editable = ref.editableFields ?? [];
  const isLiveEdit = editable.length > 0;
  const rows = isLiveEdit
    ? editable.map((f) => ({ key: f.key, label: f.label, value: String(f.value), editable: true }))
    : ref.fields.map((f) => ({ key: f.label, label: f.label, value: f.value, editable: true }));
  return { rows, isLiveEdit };
}

/** Only the fields the admin changed. */
export function fieldEdits(rows: FieldEditRow[], values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) if ((values[r.key] ?? r.value) !== r.value) out[r.key] = values[r.key] ?? '';
  return out;
}
