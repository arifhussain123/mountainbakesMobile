/**
 * @format
 */
import type { BranchStockSummaryRow, ProductionOrder, SpecialOrder } from '@/api/types';
import {
  addablePackingMaterials,
  addableProducts,
  buildDemandSummary,
  openSpecialOrders,
  preparePayload,
  returnableItems,
  reviewSubmission,
  shortageFromError,
  productionOrderStatusLabel,
  slipPackingLines,
  slipReference,
  slipView,
  specialOrdersNeedingAction,
  specialToMakeLabel,
  waitingSubtitle,
} from '@/features/admin/utils/productionOrders';
import { addDays, filterStockRows, formatDay, otherQty, totalBranchSummary } from '@/features/admin/utils/stockActivity';

function order(over: Partial<ProductionOrder>): ProductionOrder {
  return {
    id: 'o1',
    demandNumber: 'DEM-1',
    branchId: 'b1',
    branchName: 'Mountain Bakes Alabad',
    date: '2026-10-20',
    time: '09:05',
    requiredDate: '2026-10-21',
    items: [],
    packingItems: [],
    status: 'pending',
    createdBy: 'u',
    createdByName: 'Ali',
    submittedAt: '2026-10-20T04:05:00Z',
    approvedBy: null,
    approvedByName: null,
    approvedAt: null,
    ...over,
  };
}

describe('production order helpers', () => {
  it('builds the slip reference from date and time', () => {
    expect(slipReference({ date: '2026-10-20', time: '09:05' })).toBe('PO-20261020-0905');
  });

  it('labels statuses as the web does', () => {
    expect(productionOrderStatusLabel('cancelled')).toBe('Deleted by Branch');
    expect(productionOrderStatusLabel('awaiting_verification')).toBe('Awaiting Verification');
    expect(productionOrderStatusLabel('verified')).toBe('Verified — Awaiting Approval');
    expect(productionOrderStatusLabel('approved')).toBe('Approved');
  });

  it('pivots only waiting orders, using approvedQty ?? qty and skipping empty lines', () => {
    const summary = buildDemandSummary([
      order({
        id: 'a',
        status: 'pending',
        items: [
          { productId: 'p1', productName: 'Cream Puff', qty: 10, remarks: '' },
          { productId: 'p2', productName: 'Zero', qty: 0, remarks: '' },
          { productId: 'p3', productName: 'Name Cake', qty: 1, remarks: 'Happy Birthday', isSpecial: true, description: 'Happy Birthday' },
        ],
        packingItems: [{ packingMaterialId: 'm1', materialName: 'Box', qty: 5 }],
      }),
      order({
        id: 'b',
        branchName: 'Mountain Bakes Saddar',
        status: 'awaiting_verification',
        items: [{ productId: 'p1', productName: 'Cream Puff', qty: 8, approvedQty: 6, remarks: '' }],
      }),
      order({ id: 'c', status: 'approved', items: [{ productId: 'p1', productName: 'Cream Puff', qty: 99, remarks: '' }] }),
      order({ id: 'd', status: 'cancelled', items: [{ productId: 'p1', productName: 'Cream Puff', qty: 99, remarks: '' }] }),
    ]);
    expect(summary.branches).toEqual(['Alabad', 'Saddar']);
    expect(summary.pendingOrders).toBe(1);
    expect(summary.awaitingOrders).toBe(1);
    expect(summary.rows).toHaveLength(1);
    expect(summary.rows[0]).toMatchObject({ name: 'Cream Puff', total: 16, sent: 6, byBranch: { Alabad: 10, Saddar: 6 } });
    expect(summary.packingRows[0]).toMatchObject({ name: 'Box', total: 5, sent: 0 });
    expect(summary.specialRows).toEqual([
      expect.objectContaining({ name: 'Name Cake', qty: 1, branch: 'Alabad', description: 'Happy Birthday', awaitingVerification: false }),
    ]);
    expect(specialToMakeLabel(summary.specialRows)).toBe('1 to make');
    expect(waitingSubtitle(summary.pendingOrders, summary.awaitingOrders)).toBe('1 to review · 1 sent, awaiting branch verification');
    expect(waitingSubtitle(0, 2)).toBe('2 sent, awaiting branch verification');
  });

  it('freezes approved figures after review, hides zero lines but keeps them in the totals', () => {
    const o = order({
      status: 'awaiting_verification',
      items: [
        { productId: 'p1', productName: 'A', qty: 10, approvedQty: 8, unitPrice: 100, remarks: '' },
        { productId: 'p2', productName: 'B', qty: 4, approvedQty: 0, unitPrice: 50, remarks: '' },
        { productId: 'p3', productName: 'C', qty: 2, approvedQty: 2, addedByProduction: true, remarks: '' },
      ],
      packingItems: [
        { packingMaterialId: 'm1', materialName: 'Box', qty: 5, approvedQty: 0 },
        { packingMaterialId: 'm2', materialName: 'Bag', qty: 3, approvedQty: 2 },
      ],
    });
    const { lines, totals } = slipView(o, new Map([['p3', 30]]));
    expect(lines.map((l) => l.productName)).toEqual(['A', 'C']);
    expect(lines[1]).toMatchObject({ isAdded: true, demand: 0, approved: 2, unitPrice: 30, amount: 60 });
    expect(totals).toEqual({ demand: 14, approved: 10, amount: 860 });
    expect(slipPackingLines(o)).toEqual([{ key: 'm2', packingMaterialId: 'm2', materialName: 'Bag', requested: 3, approved: 2 }]);
  });

  it('shows every line at its request while pending', () => {
    const { lines } = slipView(order({ items: [{ productId: 'p1', productName: 'A', qty: 0, approvedQty: 5, remarks: '' }] }));
    expect(lines).toHaveLength(1);
    expect(lines[0]!.approved).toBe(0);
  });

  it('drops approved special orders and counts pending + legacy verified as needing action', () => {
    const so = (status: SpecialOrder['status']) => ({ id: status, status }) as SpecialOrder;
    const open = openSpecialOrders([so('pending'), so('awaiting_verification'), so('verified'), so('approved')]);
    expect(open).toHaveLength(3);
    expect(specialOrdersNeedingAction(open)).toBe(2);
  });
});

describe('order review actions', () => {
  const pending = order({
    items: [
      { productId: 'p1', productName: 'A', qty: 10, approvedQty: undefined, unitPrice: 100, remarks: '' },
      { productId: 'p2', productName: 'B', qty: 4, approvedQty: undefined, unitPrice: 50, remarks: '' },
    ],
    packingItems: [{ packingMaterialId: 'm1', materialName: 'Box', qty: 5 }],
  });

  it('applies typed quantities while pending; an emptied box counts as 0', () => {
    const { lines, totals } = slipView(pending, undefined, { p1: 7, p2: null });
    expect(lines.map((l) => l.approved)).toEqual([7, 0]);
    expect(totals).toEqual({ demand: 14, approved: 7, amount: 700 });
    expect(slipPackingLines(pending, { m1: 2 })[0]!.approved).toBe(2);
  });

  it('ignores typed quantities once frozen', () => {
    const frozen = { ...pending, status: 'awaiting_verification' as const, items: pending.items.map((i) => ({ ...i, approvedQty: 3 })) };
    expect(slipView(frozen, undefined, { p1: 9 }).lines[0]!.approved).toBe(3);
  });

  it('submits every line and flags a change only when a figure moved', () => {
    expect(reviewSubmission(pending, {}, {})).toEqual({
      approvedItems: [
        { productId: 'p1', approvedQty: 10 },
        { productId: 'p2', approvedQty: 4 },
      ],
      approvedPackingItems: [{ packingMaterialId: 'm1', approvedQty: 5 }],
      changed: false,
    });
    const cut = reviewSubmission(pending, { p2: 0 }, {});
    expect(cut.approvedItems).toHaveLength(2);
    expect(cut.approvedItems[1]).toEqual({ productId: 'p2', approvedQty: 0 });
    expect(cut.changed).toBe(true);
    expect(reviewSubmission(pending, {}, { m1: 1 }).changed).toBe(true);
  });

  it('counts a line Production added as a change', () => {
    const added = order({ items: [{ productId: 'p9', productName: 'Z', qty: 3, approvedQty: undefined, addedByProduction: true, remarks: '' }] });
    expect(reviewSubmission(added, {}, {}).changed).toBe(true);
  });

  it('offers only products not on the demand, and returns only delivered lines', () => {
    expect(addableProducts([{ id: 'p1' }, { id: 'p3' }], pending)).toEqual([{ id: 'p3' }]);
    const delivered = order({
      items: [
        { productId: 'p1', productName: 'A', qty: 10, approvedQty: 6, remarks: '' },
        { productId: 'p2', productName: 'B', qty: 4, approvedQty: 0, remarks: '' },
      ],
    });
    expect(returnableItems(delivered)).toEqual([{ productId: 'p1', productName: 'A' }]);
  });

  it('offers only active packing materials not already on the demand', () => {
    const withPacking = order({ packingItems: [{ packingMaterialId: 'm1', materialName: 'Shopper', qty: 5 }] });
    const materials = [
      { id: 'm1', isActive: true },
      { id: 'm2', isActive: true },
      { id: 'm3', isActive: false },
    ];
    expect(addablePackingMaterials(materials, withPacking)).toEqual([{ id: 'm2', isActive: true }]);
    expect(addablePackingMaterials(materials, order({ packingItems: undefined }))).toHaveLength(2);
  });

  it('reads the stock-shortage notice off a 409 and ignores anything else', () => {
    const err = {
      status: 409,
      message: 'INSUFFICIENT_STOCK',
      details: {
        code: 'restriction',
        allowed: false,
        restriction: {
          title: 'Insufficient Production Stock',
          messages: ['Not enough stock.'],
          shortages: [{ productName: 'Cream Puff', required: 20, available: 12, short: 8 }],
        },
      },
    };
    expect(shortageFromError(err)).toEqual({
      title: 'Insufficient Production Stock',
      messages: ['Not enough stock.'],
      shortages: [{ productName: 'Cream Puff', required: 20, available: 12, short: 8 }],
      after: [],
    });
    expect(shortageFromError({ status: 409, message: 'x' })).toBeNull();
    expect(shortageFromError({ status: 400, details: err.details })).toBeNull();
    expect(shortageFromError(null)).toBeNull();
  });

  it('checks Prepared Qty the web way', () => {
    const items = [
      { id: 'i1', qty: 2 },
      { id: 'i2', qty: 1 },
    ];
    expect(preparePayload(items, {})).toEqual({
      items: [
        { itemId: 'i1', preparedQty: 2 },
        { itemId: 'i2', preparedQty: 1 },
      ],
    });
    expect(preparePayload(items, { i1: null })).toEqual({ problem: 'Enter the quantity prepared for every item.' });
    expect(preparePayload(items, { i1: 0, i2: 0 })).toEqual({ problem: 'Enter the quantity prepared for at least one item.' });
    expect(preparePayload(items, { i2: 0 })).toEqual({ items: [{ itemId: 'i1', preparedQty: 2 }, { itemId: 'i2', preparedQty: 0 }] });
  });
});

describe('stock activity helpers', () => {
  it('formats a business day without timezone drift', () => {
    expect(formatDay('2026-10-20')).toBe('Tue 20 Oct');
  });

  it('steps dates across month ends', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('nets returns and adjustments, and totals branches', () => {
    const r = (over: Partial<BranchStockSummaryRow>): BranchStockSummaryRow => ({
      branchId: 'b',
      branchName: 'B',
      openingQty: 10,
      openingAmount: 100,
      newQty: 5,
      newAmount: 50,
      soldQty: 3,
      soldAmount: 30,
      returnedQty: 2,
      returnedAmount: 20,
      adjustmentQty: 1,
      adjustmentAmount: 10,
      balanceQty: 11,
      balanceAmount: 110,
      from: '2026-10-14',
      capped: false,
      ...over,
    });
    expect(otherQty(r({}))).toBe(-1);
    const t = totalBranchSummary([r({}), r({ branchId: 'c', balanceQty: -1 })]);
    expect(t.openingQty).toBe(20);
    expect(t.otherQty).toBe(-2);
    expect(t.balanceQty).toBe(10);
  });

  it('searches the ledger by product or stock code', () => {
    const rows = [
      { productId: '1', stockCode: 'CP-01', productName: 'Cream Puff', isActive: true, opening: 0, newQty: 0, sold: 0, returned: 0, adjustment: 0, balance: 0 },
      { productId: '2', stockCode: 'KK-02', productName: 'KitKat Cake', isActive: true, opening: 0, newQty: 0, sold: 0, returned: 0, adjustment: 0, balance: 0 },
    ];
    expect(filterStockRows(rows, 'kk').map((r) => r.productId)).toEqual(['2']);
    expect(filterStockRows(rows, ' cream ').map((r) => r.productId)).toEqual(['1']);
    expect(filterStockRows(rows, '')).toHaveLength(2);
  });
});
