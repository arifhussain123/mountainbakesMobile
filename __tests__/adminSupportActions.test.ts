/**
 * @format
 */
import type { FinanceTicket, SupportReference, SupportTicket } from '@/api/types';
import {
  canChangeFigures,
  changeEditorFor,
  confirmNumberMatches,
  deleteDemandSuccess,
  deleteReasonValid,
  demandDeltas,
  demandDraftRows,
  demandProblem,
  depositCurrent,
  depositEdits,
  depositTotal,
  editMessageProblem,
  fieldEditRows,
  fieldEdits,
  isPoolStockTicket,
  pickSaleProduct,
  productionCorrection,
  saleDraftRows,
  saleItemsPayload,
  salePreviewTotals,
  stockCorrection,
  stockTargetsFrom,
  supportTicketActions,
} from '@/features/admin/utils/supportActions';
import {
  correctionChanges,
  correctionFailureMessage,
  correctionInvalid,
  correctionPayload,
  deleteConfirmed,
  feedDiff,
  feedFromTicket,
  financeAmendableValue,
  financeQueryActions,
  FINANCE_AMENDABLE_FIELDS,
  isCorrectionConflict,
  quickFeedProblem,
  responsePayload,
  statusActionLabel,
  statusPayload,
} from '@/features/admin/utils/financeQueryActions';

const ref = (over: Partial<SupportReference>): SupportReference => ({ type: 'sale', referenceId: 'MB-000001', title: 'Sale', fields: [], ...over });

const ticket = (over: Partial<SupportTicket>): SupportTicket => ({
  id: 't1',
  ticketNumber: 'SUP-000001',
  referenceType: 'sale',
  referenceId: 'MB-000001',
  referenceSnapshot: ref({}),
  message: 'Wrong qty',
  status: 'open',
  resolutionNote: null,
  branchName: 'Alabad',
  raisedByName: 'Ali',
  resolvedByName: null,
  resolvedAt: null,
  createdAt: '2026-10-20T08:00:00Z',
  branchId: 'b1',
  raisedByRole: 'branch_manager',
  ...over,
});

describe('support ticket actions', () => {
  it('offers Mark Resolved only while open, Delete record only for a deposit', () => {
    expect(supportTicketActions(ticket({})).resolve).toBe(true);
    expect(supportTicketActions(ticket({ status: 'resolved' })).resolve).toBe(false);
    expect(supportTicketActions(ticket({})).deleteDeposit).toBe(false);
    const ct = ticket({ referenceType: 'cash_transfer', referenceSnapshot: ref({ type: 'cash_transfer', entityId: 'x', readOnly: true }) });
    expect(supportTicketActions(ct).deleteDeposit).toBe(true);
  });

  it('gates Change figures like the web canChange', () => {
    expect(canChangeFigures(ticket({ referenceSnapshot: null }))).toBe(false);
    expect(canChangeFigures(ticket({ referenceSnapshot: ref({ readOnly: true }) }))).toBe(false);
    expect(canChangeFigures(ticket({ referenceType: 'demand', referenceSnapshot: ref({ type: 'demand', readOnly: true }) }))).toBe(true);
    const rejectedCt = ref({ type: 'cash_transfer', readOnly: true, fields: [{ label: 'Status', value: 'Rejected' }] });
    expect(canChangeFigures(ticket({ referenceType: 'cash_transfer', referenceSnapshot: rejectedCt }))).toBe(false);
    const pool = ticket({ referenceType: 'stock', raisedByRole: 'production_user', referenceSnapshot: ref({ type: 'stock', readOnly: true }) });
    expect(isPoolStockTicket(pool)).toBe(true);
    expect(canChangeFigures(pool)).toBe(true);
  });

  it('routes Change figures to the editor the reference deserves', () => {
    expect(changeEditorFor(ticket({ referenceType: 'stock', raisedByRole: 'production_user', referenceSnapshot: ref({ type: 'stock', readOnly: true }) }))).toBe('pool');
    expect(changeEditorFor(ticket({ referenceSnapshot: ref({ type: 'demand', readOnly: true }) }))).toBe('deleteDemand');
    expect(changeEditorFor(ticket({ referenceSnapshot: ref({ type: 'cash_transfer', readOnly: true }) }))).toBe('deposit');
    expect(changeEditorFor(ticket({ referenceSnapshot: ref({ readOnly: true }) }))).toBe('nothing');
    expect(changeEditorFor(ticket({ referenceSnapshot: ref({ saleItems: [] }) }))).toBe('sale');
    expect(changeEditorFor(ticket({ referenceSnapshot: ref({ type: 'demand', demandItems: [] }) }))).toBe('demand');
    expect(changeEditorFor(ticket({ referenceType: 'stock', referenceSnapshot: ref({ type: 'stock' }) }))).toBe('stock');
    expect(changeEditorFor(ticket({ referenceType: 'expense', referenceSnapshot: ref({ type: 'expense' }) }))).toBe('fields');
  });

  it('checks the edit text, the typed number and the delete reason', () => {
    expect(editMessageProblem('ab')).not.toBeNull();
    expect(editMessageProblem('abc')).toBeNull();
    expect(confirmNumberMatches(' dmd-000012 ', 'DMD-000012')).toBe(true);
    expect(confirmNumberMatches('DMD-000013', 'DMD-000012')).toBe(false);
    expect(deleteReasonValid('    ok  ')).toBe(false);
    expect(deleteReasonValid('wrong delivery')).toBe(true);
    expect(deleteDemandSuccess('DMD-1', { stockMoved: true, branchReversals: [{}, {}] })).toBe('DMD-1 deleted — stock reversed on 2 products');
    expect(deleteDemandSuccess('DMD-1', { stockMoved: false, branchReversals: [] })).toBe('DMD-1 deleted');
  });
});

describe('sale line editor', () => {
  const rows = saleDraftRows([{ productId: 'p1', productName: 'Puff', unitPrice: 100, qty: 2, discount: 20, categoryId: 'c', categoryName: 'Bakery' }], 'o');

  it('previews the money row as edit_sale_items will write it', () => {
    expect(salePreviewTotals(rows, { subtotal: 180, discountTotal: 20, deliveryCharges: 50, taxRate: 0.1, taxAmount: 18, grandTotal: 248 })).toEqual({
      gross: 200,
      discountTotal: 20,
      subtotal: 180,
      delivery: 50,
      taxAmount: 18,
      grandTotal: 248,
    });
  });

  it('refuses a discount above the line, no product or a zero qty', () => {
    expect(saleItemsPayload(rows)).toEqual([{ productId: 'p1', productName: 'Puff', categoryId: 'c', categoryName: 'Bakery', unitPrice: 100, qty: 2, discount: 20 }]);
    expect(saleItemsPayload([{ ...rows[0]!, discount: '201' }])).toBeNull();
    expect(saleItemsPayload([{ ...rows[0]!, qty: '0' }])).toBeNull();
    expect(saleItemsPayload([{ ...rows[0]!, productId: null }])).toBeNull();
    expect(saleItemsPayload([])).toBeNull();
  });

  it('resets rate and discount when the product is swapped', () => {
    const next = pickSaleProduct(rows[0]!, { id: 'p2', name: 'Cake', categoryId: null, categoryName: null, price: 950 });
    expect(next).toMatchObject({ productId: 'p2', productName: 'Cake', unitPrice: '950', discount: '0', qty: '2' });
  });
});

describe('demand line editor', () => {
  const original = [
    { productId: 'p1', productName: 'Puff', qty: 10, approvedQty: 8 },
    { productId: 'p2', productName: 'Cake', qty: 2, approvedQty: 2 },
  ];

  it('previews per-product approved deltas, removed lines reversed', () => {
    const rows = demandDraftRows(original, 'o');
    rows[0]!.approvedQty = '10';
    expect(demandDeltas([rows[0]!], original)).toEqual([
      { productName: 'Puff', delta: 2 },
      { productName: 'Cake', delta: -2 },
    ]);
  });

  it('refuses duplicates and missing products with the web wording', () => {
    const rows = demandDraftRows(original, 'o');
    expect(demandProblem(rows)).toBeNull();
    expect(demandProblem([rows[0]!, { ...rows[1]!, productId: 'p1' }])).toBe('The same product is on two lines — combine them');
    expect(demandProblem([{ ...rows[0]!, productId: '' }])).toBe('Every line needs a product and quantities of 0 or more');
  });
});

describe('branch stock editor', () => {
  const f = { opening: 10, newQty: 5, sold: 3, returned: 0, adjustment: 1, balance: 13 };
  const base = { targets: stockTargetsFrom(f), residualMode: 'balance' as const, balanceTouched: false, adjustmentTouched: false };

  it('sends only the figures that moved, balance following them', () => {
    const c = stockCorrection(f, { ...base, targets: { ...base.targets, sold: '4' } });
    expect(c.edits).toEqual({ sold: 4 });
    expect(c.finalBalance).toBe(12);
    expect(c.invalid).toBe(false);
  });

  it('books a typed balance as the extra adjustment, never both residuals', () => {
    const c = stockCorrection(f, { ...base, balanceTouched: true, targets: { ...base.targets, balance: '11' } });
    expect(c.edits).toEqual({ balance: 11 });
    expect(c.extraAdjustment).toBe(-2);
    const a = stockCorrection(f, { ...base, residualMode: 'adjustment', adjustmentTouched: true, targets: { ...base.targets, adjustment: '0' } });
    expect(a.edits).toEqual({ adjustment: 0 });
    expect(a.finalBalance).toBe(12);
  });

  it('refuses a negative balance or a cleared figure', () => {
    expect(stockCorrection(f, { ...base, targets: { ...base.targets, sold: '40' } }).invalid).toBe(true);
    expect(stockCorrection(f, { ...base, targets: { ...base.targets, newQty: '' } }).invalid).toBe(true);
    expect(stockCorrection(f, base).changed).toBe(false);
  });
});

describe('production pool editor', () => {
  const f = { opening: 0, preparedToday: 50, totalStock: 50, demandFulfilled: 30, soldToday: 5, adjustment: 0, balance: 15 };

  it('sends Demand Fulfilled as approvedQty (the key /figures reads for the pool)', () => {
    const c = productionCorrection(f, { approvedQty: '25' });
    expect(c.edits).toEqual({ approvedQty: 25 });
    expect(c.implied).toBe(20);
  });

  it('allows a negative balance but refuses a negative movement', () => {
    expect(productionCorrection(f, { balance: '-3' }).invalid).toBe(false);
    expect(productionCorrection(f, { soldToday: '-1' }).invalid).toBe(true);
    expect(productionCorrection(f, {}).changed).toBe(false);
  });
});

describe('cash deposit editor', () => {
  const live = ref({
    type: 'cash_transfer',
    businessDate: '2026-10-18',
    editableFields: [
      { key: 'cashAmount', label: 'Cash', kind: 'number', value: 1000 },
      { key: 'easypaisaAmount', label: 'Easypaisa', kind: 'number', value: 200 },
      { key: 'bankAmount', label: 'Bank', kind: 'number', value: 0 },
      { key: 'fuelCharges', label: 'Fuel', kind: 'number', value: 50 },
      { key: 'note', label: 'Note', kind: 'text', value: 'evening' },
    ],
  });
  const current = depositCurrent(live);

  it('totals Cash + Easypaisa + Bank only', () => {
    expect(depositTotal(current.figures)).toBe(1200);
  });

  it('builds only the changed edits and checks the date', () => {
    expect(depositEdits({ ...current, figures: { ...current.figures, cashAmount: '900' } }, current, '2026-10-20')).toEqual({ edits: { cashAmount: 900 } });
    expect(depositEdits(current, current, '2026-10-20')).toEqual({ error: 'Change at least one value' });
    expect(depositEdits({ ...current, date: '2026-10-21' }, current, '2026-10-20')).toEqual({ error: 'The date cannot be in the future' });
    expect(depositEdits({ ...current, figures: { ...current.figures, bankAmount: '-1' } }, current, '2026-10-20')).toEqual({ error: 'Amounts must be numbers, 0 or more' });
  });
});

describe('flat field editor', () => {
  it('edits the expense fields live, else records the display fields', () => {
    const live = fieldEditRows(ref({ type: 'expense', editableFields: [{ key: 'amount', label: 'Amount', kind: 'number', value: 500 }] }));
    expect(live.isLiveEdit).toBe(true);
    expect(fieldEdits(live.rows, { amount: '450' })).toEqual({ amount: '450' });
    expect(fieldEdits(live.rows, { amount: '500' })).toEqual({});
    expect(fieldEditRows(ref({ fields: [{ label: 'Total', value: '10' }] })).isLiveEdit).toBe(false);
  });
});

// ─── Finance queries ────────────────────────────────────────────────────────

const fin = (over: Partial<FinanceTicket>): FinanceTicket => ({
  id: 'f1',
  queryNo: 'FIN-HD-000001',
  queryType: 'expense',
  priority: 'normal',
  referenceType: 'ledger_entry',
  referenceNo: 'PV-000010',
  referenceId: 'le1',
  subject: 'Wrong amount',
  message: 'Should be 4500',
  status: 'open',
  amount: 5000,
  branchName: null,
  businessDate: null,
  remarks: null,
  adminResponse: null,
  resolutionNote: null,
  raisedByName: 'Sara',
  assignedToName: null,
  resolvedByName: null,
  resolvedAt: null,
  reopenReason: null,
  createdAt: '2026-10-20T08:00:00Z',
  updatedAt: '2026-10-20T08:00:00Z',
  version: 3,
  ...over,
});

describe('finance query actions', () => {
  it('offers the web detail bar for a live query', () => {
    const a = financeQueryActions(fin({}), false);
    expect(a).toMatchObject({ restore: false, edit: true, amend: true, recreate: true, assign: true, correctRecord: true, deleteRecord: true, deleteQuery: true, reopen: false, reply: true });
    expect(a.statuses).toEqual(['under_review', 'resolved', 'rejected']);
  });

  it('a deleted query offers Restore only; a terminal one Reopen, no Amend', () => {
    const d = financeQueryActions(fin({ deletedAt: '2026-10-20' }), false);
    expect(d).toMatchObject({ restore: true, edit: false, recreate: false, deleteQuery: false, reply: false });
    expect(d.statuses).toEqual([]);
    const r = financeQueryActions(fin({ status: 'resolved' }), false);
    expect(r).toMatchObject({ amend: false, reopen: true });
    expect(r.statuses).toEqual(['closed']);
    expect(financeQueryActions(fin({ status: 'closed' }), false).reply).toBe(false);
  });

  it('no record action on a sale reference or a deleted record; no Recreate twice', () => {
    expect(financeQueryActions(fin({ referenceType: 'order' }), false).correctRecord).toBe(false);
    expect(financeQueryActions(fin({}), true).deleteRecord).toBe(false);
    expect(financeQueryActions(fin({ recreatedAsId: 'x' }), false).recreate).toBe(false);
  });

  it('labels the status buttons like the web', () => {
    const labels = { under_review: 'In Review' } as Record<FinanceTicket['status'], string>;
    expect(statusActionLabel('resolved', labels)).toBe('Resolve');
    expect(statusActionLabel('closed', labels)).toBe('Close query');
    expect(statusActionLabel('under_review', labels)).toBe('In Review');
  });
});

describe('finance status + response bodies', () => {
  it('a terminal move needs a response or note and carries type + amount', () => {
    expect('error' in statusPayload(fin({}), 'resolved', { response: '', note: '', amount: '', resolutionType: 'fixed' })).toBe(true);
    expect(statusPayload(fin({}), 'resolved', { response: 'Fixed it', note: '', amount: '4500', resolutionType: 'fixed' })).toEqual({
      input: { status: 'resolved', resolutionType: 'fixed', adminResponse: 'Fixed it', resolutionAmount: 4500 },
    });
    expect(statusPayload(fin({ adminResponse: 'same' }), 'under_review', { response: 'same', note: '', amount: '', resolutionType: 'fixed' })).toEqual({
      input: { status: 'under_review' },
    });
  });

  it('saves only the response fields that changed', () => {
    const t = fin({ adminResponse: 'a', resolutionNote: null, resolutionAmount: null, internalNote: null });
    expect(responsePayload(t, { response: 'a', resolution: '', amount: '', internal: '' })).toEqual({});
    expect(responsePayload(t, { response: 'b', resolution: '', amount: '10', internal: 'n' })).toEqual({ adminResponse: 'b', resolutionAmount: 10, internalNote: 'n' });
  });
});

describe('finance feeding form', () => {
  it('diffs only moved fields, amount compared as a number', () => {
    const base = feedFromTicket(fin({}));
    expect(feedDiff(base, { ...base, amount: '5000.00' })).toEqual({});
    expect(feedDiff(base, { ...base, subject: 'New subject', branchId: 'b1' })).toEqual({ subject: 'New subject', branchId: 'b1' });
  });

  it('needs subject, description, a reason and — for Edit — a change', () => {
    const base = feedFromTicket(fin({}));
    expect(quickFeedProblem('edit', base, {}, 'because')).toBe('Change a field above to enable Save.');
    expect(quickFeedProblem('amend', base, {}, 'because')).toBeNull();
    expect(quickFeedProblem('recreate', base, {}, 'no')).not.toBeNull();
    expect(quickFeedProblem('amend', { ...base, businessDate: '20/10/2026' }, {}, 'because')).not.toBeNull();
  });
});

describe('finance record correction', () => {
  const fields = FINANCE_AMENDABLE_FIELDS.ledger_entry;
  const live = { debit: 0, credit: 5000, description: 'Rent', status: 'posted' };
  const current = Object.fromEntries(fields.map((f) => [f.key, financeAmendableValue('ledger_entry', live, f.key)]));

  it("reads a voucher's amount from whichever side is non-zero", () => {
    expect(current.amount).toBe('5000');
  });

  it('lists changes with the money difference, sends expected values and confirmOverwrite on an approved record', () => {
    const changes = correctionChanges(fields, current, { ...current, amount: '4500.50', description: 'Rent ' });
    expect(changes.map((c) => [c.spec.key, c.to, c.difference])).toEqual([['amount', '4500.50', -499.5]]);
    expect(correctionPayload(fin({}), changes, '  ', true, true)).toEqual({
      edits: [{ field: 'amount', value: '4500.50', expected: '5000' }],
      resolve: true,
      expectedVersion: 3,
      confirmOverwrite: true,
    });
    expect(correctionInvalid(fields, { ...current, amount: '12.345' })).toEqual(['amount']);
  });

  it('recognises the conflict 409 and words offline / server failures', () => {
    expect(isCorrectionConflict({ status: 409, details: { code: 'conflict' } })).toBe(true);
    expect(isCorrectionConflict({ status: 409 })).toBe(false);
    expect(correctionFailureMessage({ status: null }, () => 'x')).toMatch(/nothing was saved/);
    expect(correctionFailureMessage({ status: 400 }, () => 'server says')).toBe('server says');
  });

  it('delete needs a reason and the tick', () => {
    expect(deleteConfirmed('dup', true)).toBe(true);
    expect(deleteConfirmed('dup', false)).toBe(false);
    expect(deleteConfirmed('no', true)).toBe(false);
  });
});
