/**
 * @format
 */
import type { ImportPreviewResult } from '@/api/types';
import {
  PRICE_IMPORT_MAX_BYTES,
  applyChangesLabel,
  canApplyImport,
  importCommitPayload,
  importFileProblem,
  importReviewSections,
  importSuccessMessage,
  importSummaryStats,
} from '@/features/admin/utils/priceImport';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const preview = (over: Partial<ImportPreviewResult> = {}): ImportPreviewResult => ({
  summary: { total: 4, valid: 2, unchanged: 1, errors: 1 },
  validRows: [
    { productId: 'p1', productCode: 'CP-01', productName: 'Cream Puff', categoryName: 'Pastry', currentPrice: 1000, newPrice: 1200 },
    { productId: 'p2', productCode: 'KK-02', productName: 'KitKat Cake', categoryName: 'Cake', currentPrice: 2500, newPrice: 2750.5 },
  ],
  unchangedRows: [{ productCode: 'MC-03', productName: 'Millennium Cake', price: 3000 }],
  errorRows: [{ rowNumber: 5, productCode: '', rawPrice: 'abc', error: 'INVALID_PRICE', message: 'Price must be a positive number' }],
  ...over,
});

describe('importFileProblem', () => {
  it('accepts .xlsx and .csv like the web input', () => {
    expect(importFileProblem({ name: 'prices.xlsx', type: XLSX, size: 1000 })).toBeNull();
    expect(importFileProblem({ name: 'PRICES.CSV', type: 'application/vnd.ms-excel', size: 1000 })).toBeNull();
  });

  it('accepts a name without the extension when the type is a spreadsheet', () => {
    expect(importFileProblem({ name: 'Price list v2.1', type: XLSX, size: null })).toBeNull();
    expect(importFileProblem({ name: 'prices', type: 'text/csv', size: null })).toBeNull();
  });

  it("rejects old .xls in the server's words", () => {
    expect(importFileProblem({ name: 'prices.xls', type: 'application/vnd.ms-excel', size: 1000 })).toBe(
      "Please upload a valid Excel (.xlsx) or CSV file — old .xls files aren't supported.",
    );
  });

  it("rejects a file over the server's 5 MB limit", () => {
    expect(importFileProblem({ name: 'prices.xlsx', type: XLSX, size: PRICE_IMPORT_MAX_BYTES })).toBeNull();
    expect(importFileProblem({ name: 'prices.xlsx', type: XLSX, size: PRICE_IMPORT_MAX_BYTES + 1 })).toMatch(/larger than 5 MB/);
  });
});

describe('review sheet', () => {
  it('shows the three summary counts in the web order', () => {
    expect(importSummaryStats(preview()).map((s) => [s.label, s.value, s.tone])).toEqual([
      ['Will update', 2, 'success'],
      ['Unchanged', 1, 'muted'],
      ['Errors', 1, 'danger'],
    ]);
  });

  it('groups every row: will update, errors, unchanged', () => {
    const sections = importReviewSections(preview());
    expect(sections.map((s) => s.title)).toEqual(['Will update (2)', 'Errors — skipped (1)', 'Unchanged (1)']);
    expect(sections[0].rows[0]).toMatchObject({ title: 'CP-01', subtitle: 'Cream Puff', value: 'Rs.1,000 → Rs.1,200' });
    expect(sections[0].rows[1].value).toBe('Rs.2,500 → Rs.2,750.5');
    expect(sections[1].rows[0]).toMatchObject({ title: 'Row 5 · —', subtitle: 'Value: abc', value: 'Price must be a positive number' });
    expect(sections[2].rows[0]).toMatchObject({ title: 'MC-03', subtitle: 'Millennium Cake', value: 'Rs.3,000' });
  });

  it('leaves out empty sections and dashes a missing value', () => {
    const p = preview({
      validRows: [],
      unchangedRows: [],
      errorRows: [{ rowNumber: 2, productCode: 'X-1', rawPrice: '', error: 'MISSING_FIELD', message: 'Missing price' }],
    });
    const sections = importReviewSections(p);
    expect(sections.map((s) => s.key)).toEqual(['errors']);
    expect(sections[0].rows[0].subtitle).toBe('Value: —');
  });

  it('words and enables the apply button as the web does', () => {
    expect(applyChangesLabel(0)).toBe('Apply 0 changes');
    expect(applyChangesLabel(1)).toBe('Apply 1 change');
    expect(applyChangesLabel(12)).toBe('Apply 12 changes');
    expect(canApplyImport(preview(), false)).toBe(true);
    expect(canApplyImport(preview(), true)).toBe(false);
    expect(canApplyImport(preview({ validRows: [] }), false)).toBe(false);
    expect(canApplyImport(null, false)).toBe(false);
  });
});

describe('importCommitPayload', () => {
  it('commits only the valid rows, with the trimmed reason', () => {
    expect(importCommitPayload(preview(), '2026-10-21', '  Supplier price increase ')).toEqual({
      input: {
        rows: [
          { productId: 'p1', newPrice: 1200 },
          { productId: 'p2', newPrice: 2750.5 },
        ],
        effectiveDate: '2026-10-21',
        reason: 'Supplier price increase',
      },
    });
  });

  it('needs a reason', () => {
    expect(importCommitPayload(preview(), '2026-10-21', '   ')).toEqual({ error: 'Please enter a reason' });
  });

  it('does nothing without valid rows', () => {
    expect(importCommitPayload(preview({ validRows: [] }), '2026-10-21', 'x')).toBeNull();
    expect(importCommitPayload(null, '2026-10-21', 'x')).toBeNull();
  });
});

it("uses the web's success toast", () => {
  expect(importSuccessMessage({ appliedImmediate: 3, scheduled: 0 })).toBe('Imported — 3 applied, 0 scheduled');
});
