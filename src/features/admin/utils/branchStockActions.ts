import type { AdminStockRowEdit, AdminStockSaveResult, StockRow } from '@/api';

/**
 * Pure rules behind Super Admin's Branch Stock actions — the web's
 * `AdminBranchStockPage` (row drafts, Save / Discard), `AddBranchStockModal`
 * and `DeleteBranchStockDialog`, reproduced exactly. Every gate here is
 * courtesy: `apply_stock_correction` re-sizes each movement against the LIVE
 * ledger under a row lock and refuses a negative balance or a closed day.
 *
 * Every figure is ABSOLUTE, never a delta. Balance and Adjustment are one
 * degree of freedom seen from two ends —
 * `opening + new − sold − returned + adjustment = balance` — so each drives the
 * other, and only the five non-Balance figures are ever sent (the API refuses
 * a row that sets both).
 */

export type FigureKey = 'opening' | 'newQty' | 'sold' | 'returned' | 'adjustment' | 'balance';

/** The five ABSOLUTE targets actually sent. Balance is omitted on purpose. */
export const SENT_KEYS = ['opening', 'newQty', 'sold', 'returned', 'adjustment'] as const;

/** Figures that are tallies and cannot go below zero. Adjustment is signed. */
const COUNT_KEYS = ['opening', 'newQty', 'sold', 'returned', 'balance'] as const;

export const FIGURE_COLUMNS: { key: FigureKey; label: string; signed: boolean }[] = [
  { key: 'opening', label: 'Opening', signed: false },
  { key: 'newQty', label: 'New', signed: false },
  { key: 'sold', label: 'Sold', signed: false },
  { key: 'returned', label: 'Returned', signed: false },
  { key: 'adjustment', label: 'Adjustment', signed: true },
  { key: 'balance', label: 'Balance', signed: false },
];

export type StockDraft = Record<FigureKey, string>;

/** Keyed by productId — only rows the admin has touched have one. */
export type StockDrafts = Record<string, StockDraft>;

/**
 * Keep a figure input to something parseable while it is typed. A lone '-'
 * survives so a signed field can be typed left to right; it parses as 0 until
 * a digit follows it.
 */
export function sanitizeFigure(raw: string, signed: boolean): string {
  const cleaned = raw.replace(signed ? /[^\d-]/g : /\D/g, '');
  if (!signed) return cleaned.replace(/^0+(?=\d)/, '');
  const negative = cleaned.startsWith('-');
  const digits = cleaned.replace(/-/g, '').replace(/^0+(?=\d)/, '');
  return `${negative ? '-' : ''}${digits}`;
}

/** Blank reads as 0 — clearing a figure means setting it to nothing, i.e. zero. */
export function figureNum(raw: string): number {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

export function draftFromRow(r: StockRow): StockDraft {
  return {
    opening: String(r.opening),
    newQty: String(r.newQty),
    sold: String(r.sold),
    returned: String(r.returned),
    adjustment: String(r.adjustment),
    balance: String(r.balance),
  };
}

/** Typing a Balance moves Adjustment (the residual); typing anything else moves Balance (the total). */
export function reflow(draft: StockDraft, changed: FigureKey): StockDraft {
  const base = figureNum(draft.opening) + figureNum(draft.newQty) - figureNum(draft.sold) - figureNum(draft.returned);
  if (changed === 'balance') return { ...draft, adjustment: String(figureNum(draft.balance) - base) };
  return { ...draft, balance: String(base + figureNum(draft.adjustment)) };
}

/** One keystroke into a draft: sanitised for its column, then the Balance/Adjustment pair re-derived. */
export function editDraft(draft: StockDraft, key: FigureKey, raw: string): StockDraft {
  const signed = FIGURE_COLUMNS.find((c) => c.key === key)!.signed;
  return reflow({ ...draft, [key]: sanitizeFigure(raw, signed) }, key);
}

/** True when the draft targets differ from what the server last reported. */
export function isDirty(draft: StockDraft, row: StockRow): boolean {
  return SENT_KEYS.some((k) => figureNum(draft[k]) !== row[k]);
}

/** The row-level complaint that blocks a save, or null. */
export function rowError(draft: StockDraft): string | null {
  for (const key of COUNT_KEYS) {
    if (figureNum(draft[key]) < 0) return `${FIGURE_COLUMNS.find((c) => c.key === key)!.label} cannot be negative`;
  }
  return null;
}

/**
 * The rows with a pending change — across ALL rows, not just the ones a
 * search leaves visible, so a search typed after editing cannot silently drop
 * those edits from the save.
 */
export function dirtyRows(rows: StockRow[], drafts: StockDrafts): StockRow[] {
  return rows.filter((r) => drafts[r.productId] && isDirty(drafts[r.productId]!, r));
}

/** The Save body's rows, or the first row-level problem (named) that blocks it. */
export function savePayload(dirty: StockRow[], drafts: StockDrafts): { rows: AdminStockRowEdit[] } | { error: string } {
  const blocked = dirty.find((r) => rowError(drafts[r.productId]!) !== null);
  if (blocked) return { error: `${blocked.productName}: ${rowError(drafts[blocked.productId]!)}` };
  return {
    rows: dirty.map((r) => {
      const d = drafts[r.productId]!;
      return {
        productId: r.productId,
        opening: figureNum(d.opening),
        newQty: figureNum(d.newQty),
        sold: figureNum(d.sold),
        returned: figureNum(d.returned),
        adjustment: figureNum(d.adjustment),
      };
    }),
  };
}

const products = (n: number) => `product${n === 1 ? '' : 's'}`;

/**
 * How a Save came back, in the web's toast wording. A partial save is reported
 * as one — the rows that went through are real stock movements and stay.
 */
export function saveOutcome(result: Pick<AdminStockSaveResult, 'changedCount' | 'failed'>): { title: string; message: string } {
  const lines: string[] = [];
  if (result.failed.length > 0) {
    const first = result.failed[0]!;
    lines.push(`${result.failed.length} ${products(result.failed.length)} not saved — ${first.productName}: ${first.error}`);
  }
  if (result.changedCount > 0) lines.push(`Saved ${result.changedCount} ${products(result.changedCount)}`);
  else if (result.failed.length === 0) lines.push('Nothing to change — those figures already match');
  const title = result.failed.length > 0 ? 'Not Everything Saved' : result.changedCount > 0 ? 'Saved' : 'Nothing to Change';
  return { title, message: lines.join('\n') };
}

/**
 * Only the rows the server accepted lose their draft; a refused row keeps what
 * was typed so it can be corrected rather than retyped.
 */
export function draftsAfterSave(drafts: StockDrafts, saved: { productId: string }[]): StockDrafts {
  const accepted = new Set(saved.map((s) => s.productId));
  const next: StockDrafts = {};
  for (const [productId, draft] of Object.entries(drafts)) {
    if (!accepted.has(productId)) next[productId] = draft;
  }
  return next;
}

export function withoutDraft(drafts: StockDrafts, productId: string): StockDrafts {
  const next = { ...drafts };
  delete next[productId];
  return next;
}

// ─── Add Stock ───────────────────────────────────────────────────────────────

export type BookAs = 'newQty' | 'adjustment';

/** Which ledger column the added units land in. */
export const BOOK_AS: { value: BookAs; label: string; hint: string }[] = [
  {
    value: 'newQty',
    label: 'New Stock',
    hint: 'Books the units as production delivered today — the same column an approved demand fills.',
  },
  {
    value: 'adjustment',
    label: 'Adjustment',
    hint: 'Books them as an admin correction. Use for a stock-take fix rather than a real delivery.',
  },
];

/** Adding stock is forward-looking: active products only (discontinued ones still holding stock stay in the ledger). */
export function addableRows(rows: StockRow[]): StockRow[] {
  return rows.filter((r) => r.isActive);
}

export function sanitizeQty(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

/**
 * The Add Stock body row, or null while the form is incomplete. Still an
 * ABSOLUTE target — what is there now plus what is being added — which is what
 * keeps the server's live-figure sizing meaningful.
 */
export function addStockRow(product: StockRow | null, qty: string, bookAs: BookAs): AdminStockRowEdit | null {
  const amount = parseInt(qty, 10);
  if (!product || !Number.isFinite(amount) || amount <= 0) return null;
  return { productId: product.productId, [bookAs]: product[bookAs] + amount };
}

/** "Cream Puff: New 4 → 24, balance 10 → 30" — the web's live preview line. */
export function addStockPreview(product: StockRow, qty: string, bookAs: BookAs): string {
  const parsed = parseInt(qty, 10);
  const amount = Number.isFinite(parsed) ? parsed : 0;
  return `${product.productName}: ${bookAs === 'newQty' ? 'New' : 'Adjustment'} ${product[bookAs]} → ${product[bookAs] + amount}, balance ${product.balance} → ${product.balance + amount}`;
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export type DeleteMode = 'zero' | 'purge';

/** Delete permanently is gated on typing the product name (case- and edge-space-insensitive). */
export function canPurge(productName: string, typed: string): boolean {
  return typed.trim().toLowerCase() === productName.trim().toLowerCase();
}

export function deleteSuccessMessage(mode: DeleteMode, productName: string, branchName: string): string {
  return mode === 'purge' ? `${productName} removed from ${branchName}` : `${productName} set to 0`;
}
