import type { ImportCommitResult, ImportPreviewResult, PriceImportCommitInput } from '@/api/types';
import { formatRsCompact } from './catalogFormat';

/**
 * Rules for the Price List's "Import Price List" and its "Review Price Import"
 * sheet (web `PriceListPage`). Parsing and row validation are the server's
 * (`parseImportWorkbook`): the phone only groups the preview, decides what
 * commits, and checks the picked file before uploading it.
 */

// ─── The picked file ─────────────────────────────────────────────────────────

/** The server's multer limit on `/import/preview`. */
export const PRICE_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = ['xlsx', 'csv'];
const ACCEPTED_TYPES = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'text/comma-separated-values'];

/**
 * The web's `accept=".xlsx,.csv"`, plus the server's 5 MB limit — checked
 * here because the server's own too-large message is written for photos.
 * A file passes on its extension OR its type (a Drive name may carry no
 * extension). `null` = fine to upload.
 */
export function importFileProblem(file: { name: string; type: string; size: number | null }): string | null {
  const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';
  if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
    // The server's wording for an unreadable file.
    return "Please upload a valid Excel (.xlsx) or CSV file — old .xls files aren't supported.";
  }
  if (file.size !== null && file.size > PRICE_IMPORT_MAX_BYTES) {
    return 'That file is larger than 5 MB. Please upload a smaller Excel or CSV file.';
  }
  return null;
}

// ─── The review sheet ────────────────────────────────────────────────────────

export type ImportStatTone = 'success' | 'muted' | 'danger';

/** The three summary tiles, in the web's order. */
export function importSummaryStats(preview: ImportPreviewResult): { key: string; label: string; value: number; tone: ImportStatTone }[] {
  return [
    { key: 'valid', label: 'Will update', value: preview.summary.valid, tone: 'success' },
    { key: 'unchanged', label: 'Unchanged', value: preview.summary.unchanged, tone: 'muted' },
    { key: 'errors', label: 'Errors', value: preview.summary.errors, tone: 'danger' },
  ];
}

/** One preview row as the phone lists it — the web table's cells, laid out as a line. */
export interface ImportReviewRow {
  key: string;
  /** Code + product (valid / unchanged), or "Row n · code" (error). */
  title: string;
  /** Product name; the raw value for an error row. */
  subtitle: string;
  /** "Rs.1,000 → Rs.1,200" (valid) or "Rs.1,000" (unchanged); the problem for an error row. */
  value: string;
}

export interface ImportReviewSection {
  key: 'valid' | 'errors' | 'unchanged';
  title: string;
  rows: ImportReviewRow[];
}

/**
 * The web's three sections, in its order (Will update, Errors — skipped,
 * Unchanged), each only when it has rows. Missing code / value show "—".
 */
export function importReviewSections(preview: ImportPreviewResult): ImportReviewSection[] {
  const sections: ImportReviewSection[] = [];
  if (preview.validRows.length > 0) {
    sections.push({
      key: 'valid',
      title: `Will update (${preview.validRows.length})`,
      rows: preview.validRows.map((r, i) => ({
        key: `v${i}`,
        title: r.productCode,
        subtitle: r.productName,
        value: `${formatRsCompact(r.currentPrice)} → ${formatRsCompact(r.newPrice)}`,
      })),
    });
  }
  if (preview.errorRows.length > 0) {
    sections.push({
      key: 'errors',
      title: `Errors — skipped (${preview.errorRows.length})`,
      rows: preview.errorRows.map((r, i) => ({
        key: `e${i}`,
        title: `Row ${r.rowNumber} · ${r.productCode || '—'}`,
        subtitle: `Value: ${r.rawPrice || '—'}`,
        value: r.message,
      })),
    });
  }
  if (preview.unchangedRows.length > 0) {
    sections.push({
      key: 'unchanged',
      title: `Unchanged (${preview.unchangedRows.length})`,
      rows: preview.unchangedRows.map((r, i) => ({ key: `u${i}`, title: r.productCode, subtitle: r.productName, value: formatRsCompact(r.price) })),
    });
  }
  return sections;
}

/** The confirm button's wording: "Apply 1 change" / "Apply 12 changes". */
export function applyChangesLabel(validCount: number): string {
  return `Apply ${validCount} change${validCount === 1 ? '' : 's'}`;
}

/** Disabled while saving, or when the file has nothing valid to apply. */
export function canApplyImport(preview: ImportPreviewResult | null, committing: boolean): boolean {
  return !committing && (preview?.validRows.length ?? 0) > 0;
}

/**
 * The commit body — only the valid rows, as `{ productId, newPrice }` — or
 * the web's reason toast. `null` when nothing is valid (the web returns
 * without a word; its button is disabled then anyway).
 */
export function importCommitPayload(
  preview: ImportPreviewResult | null,
  effectiveDate: string,
  reason: string,
): { input: PriceImportCommitInput } | { error: string } | null {
  if (!preview || preview.validRows.length === 0) return null;
  if (!reason.trim()) return { error: 'Please enter a reason' };
  return {
    input: {
      rows: preview.validRows.map((r) => ({ productId: r.productId, newPrice: r.newPrice })),
      effectiveDate,
      reason: reason.trim(),
    },
  };
}

/** The web's success toast. */
export function importSuccessMessage(res: Pick<ImportCommitResult, 'appliedImmediate' | 'scheduled'>): string {
  return `Imported — ${res.appliedImmediate} applied, ${res.scheduled} scheduled`;
}
