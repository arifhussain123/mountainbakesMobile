/**
 * @format
 */
import type { StockRow } from '@/api/types';
import {
  addStockPreview,
  addStockRow,
  addableRows,
  canPurge,
  deleteSuccessMessage,
  dirtyRows,
  draftFromRow,
  draftsAfterSave,
  editDraft,
  isDirty,
  reflow,
  rowError,
  sanitizeFigure,
  sanitizeQty,
  saveOutcome,
  savePayload,
  withoutDraft,
} from '@/features/admin/utils/branchStockActions';

const row = (over: Partial<StockRow> = {}): StockRow => ({
  productId: 'p1',
  stockCode: 'CP-01',
  productName: 'Cream Puff',
  isActive: true,
  opening: 10,
  newQty: 20,
  sold: 5,
  returned: 1,
  adjustment: 0,
  balance: 24,
  ...over,
});

describe('figure inputs', () => {
  it('keeps counts to digits without leading zeros', () => {
    expect(sanitizeFigure('0a12-', false)).toBe('12');
    expect(sanitizeFigure('000', false)).toBe('0');
  });

  it('lets a signed field start with a lone minus', () => {
    expect(sanitizeFigure('-', true)).toBe('-');
    expect(sanitizeFigure('-05', true)).toBe('-5');
    expect(sanitizeFigure('3-4', true)).toBe('34');
  });
});

describe('balance and adjustment drive each other', () => {
  it('moves Balance when any other figure changes', () => {
    const d = editDraft(draftFromRow(row()), 'sold', '9');
    expect(d.sold).toBe('9');
    expect(d.balance).toBe('20');
  });

  it('moves Adjustment when Balance is typed', () => {
    const d = editDraft(draftFromRow(row()), 'balance', '30');
    expect(d.adjustment).toBe('6');
  });

  it('reads a blank figure as zero', () => {
    expect(reflow({ ...draftFromRow(row()), opening: '' }, 'opening').balance).toBe('14');
  });
});

describe('dirty rows and save payload', () => {
  it('ignores a Balance-only difference — Balance is never sent', () => {
    expect(isDirty({ ...draftFromRow(row()), balance: '99' }, row())).toBe(false);
  });

  it('counts dirty rows across all rows, not just a filtered view', () => {
    const rows = [row(), row({ productId: 'p2', productName: 'Pastry' })];
    const drafts = { p2: editDraft(draftFromRow(rows[1]!), 'newQty', '25') };
    expect(dirtyRows(rows, drafts).map((r) => r.productId)).toEqual(['p2']);
  });

  it('sends the five absolute figures and never Balance', () => {
    const r = row();
    const drafts = { p1: editDraft(draftFromRow(r), 'balance', '30') };
    expect(savePayload([r], drafts)).toEqual({
      rows: [{ productId: 'p1', opening: 10, newQty: 20, sold: 5, returned: 1, adjustment: 6 }],
    });
  });

  it('names the first row that would go negative', () => {
    const r = row();
    const drafts = { p1: editDraft(draftFromRow(r), 'sold', '40') };
    expect(rowError(drafts.p1)).toBe('Balance cannot be negative');
    expect(savePayload([r], drafts)).toEqual({ error: 'Cream Puff: Balance cannot be negative' });
  });

  it('allows a negative Adjustment', () => {
    expect(rowError(editDraft(draftFromRow(row()), 'adjustment', '-4'))).toBeNull();
  });
});

describe('save outcome', () => {
  it('reports a full save', () => {
    expect(saveOutcome({ changedCount: 2, failed: [] })).toEqual({ title: 'Saved', message: 'Saved 2 products' });
  });

  it('reports a no-op', () => {
    expect(saveOutcome({ changedCount: 0, failed: [] })).toEqual({ title: 'Nothing to Change', message: 'Nothing to change — those figures already match' });
  });

  it('reports a partial save by name', () => {
    const out = saveOutcome({ changedCount: 1, failed: [{ productId: 'p2', productName: 'Pastry', error: 'Day is closed' }] });
    expect(out.title).toBe('Not Everything Saved');
    expect(out.message).toBe('1 product not saved — Pastry: Day is closed\nSaved 1 product');
  });

  it('keeps drafts only for rows the server did not accept', () => {
    const d = draftFromRow(row());
    expect(Object.keys(draftsAfterSave({ p1: d, p2: d }, [{ productId: 'p1' }]))).toEqual(['p2']);
    expect(withoutDraft({ p1: d, p2: d }, 'p2')).toEqual({ p1: d });
  });
});

describe('add stock', () => {
  it('offers active products only', () => {
    expect(addableRows([row(), row({ productId: 'p2', isActive: false })]).map((r) => r.productId)).toEqual(['p1']);
  });

  it('sends current + qty as the absolute target in the chosen column', () => {
    expect(addStockRow(row(), '6', 'newQty')).toEqual({ productId: 'p1', newQty: 26 });
    expect(addStockRow(row({ adjustment: -2 }), '5', 'adjustment')).toEqual({ productId: 'p1', adjustment: 3 });
  });

  it('needs a product and a positive quantity', () => {
    expect(addStockRow(null, '5', 'newQty')).toBeNull();
    expect(addStockRow(row(), '', 'newQty')).toBeNull();
    expect(addStockRow(row(), sanitizeQty('0'), 'newQty')).toBeNull();
    expect(sanitizeQty('007x')).toBe('7');
  });

  it('previews the column and balance change', () => {
    expect(addStockPreview(row(), '6', 'newQty')).toBe('Cream Puff: New 20 → 26, balance 24 → 30');
    expect(addStockPreview(row(), '', 'adjustment')).toBe('Cream Puff: Adjustment 0 → 0, balance 24 → 24');
  });
});

describe('delete', () => {
  it('unlocks Delete permanently only on the product name', () => {
    expect(canPurge('Cream Puff', '  cream puff ')).toBe(true);
    expect(canPurge('Cream Puff', 'cream')).toBe(false);
  });

  it('uses the web wording', () => {
    expect(deleteSuccessMessage('zero', 'Cream Puff', 'Alabad')).toBe('Cream Puff set to 0');
    expect(deleteSuccessMessage('purge', 'Cream Puff', 'Alabad')).toBe('Cream Puff removed from Alabad');
  });
});
