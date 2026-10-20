/**
 * @format
 */
import type {
  DailySaleRecord,
  FinanceMonthlyDashboard,
  PreviousOrderBalance,
  ProductionOrder,
  ReportSummary,
  SalesAnalytics,
} from '@/api/types';
import {
  adminDashboardCsv,
  adminDashboardCsvName,
  adminDashboardPrintText,
  branchSummaryRows,
  buildDailySalePrintText,
  buildDemandSnapshot,
  buildDemandSummaryPrintText,
  buildReportsPrintText,
  canExport,
  collectionsWindow,
  demandStatusText,
  differenceText,
  exportAllLabel,
  hasDemandToPrint,
  karachiStamp,
} from '@/features/admin/utils/exports';
import {
  buildA4ChallanText,
  buildOrderChallanText,
  buildOrderPopText,
  buildPopPrintText,
  buildProductionCheckText,
  compactDate,
  slipReference,
  type SlipPrintInput,
} from '@/features/orders/utils/productionOrderPrint';
import { kvLine, textTable, wrapText } from '@/shared/utils/textLayout';

const lines = (text: string) => text.split('\n');

describe('textLayout', () => {
  it('wraps words and hard-breaks a word longer than the line', () => {
    expect(wrapText('one two three', 7)).toEqual(['one two', 'three']);
    expect(wrapText('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('puts the value at the right edge of the label line', () => {
    const [line] = kvLine('Total', 'Rs. 1,200', 20);
    expect(line).toHaveLength(20);
    expect(line.startsWith('Total')).toBe(true);
    expect(line.endsWith('Rs. 1,200')).toBe(true);
  });

  it('lays a table out to the width, figures right-aligned', () => {
    const out = textTable([{ header: 'Product' }, { header: 'Qty', width: 5 }], [['Cream Puff', '12']], 24);
    expect(out[0]).toHaveLength(24);
    expect(out[1]).toBe('-'.repeat(24));
    expect(out[2].endsWith('   12')).toBe(true);
  });
});

// File names and requests: adminFileExports.test.ts.
describe('data table export', () => {
  it('is dead only with no rows and no total', () => {
    expect(canExport(0, 0)).toBe(false);
    expect(canExport(0, null)).toBe(false);
    expect(canExport(3, 3)).toBe(true);
    expect(exportAllLabel(1234)).toBe('Export all 1,234 results');
    expect(exportAllLabel(undefined)).toBe('Export all results');
  });

  it('orders the Collections window', () => {
    expect(collectionsWindow('2026-10-25', '2026-10-01', '2026-10-20')).toEqual({ from: '2026-10-01', to: '2026-10-20' });
    expect(collectionsWindow('', '', '2026-10-20')).toEqual({ from: '2026-10-20', to: '2026-10-20' });
  });
});

// ─── Production orders ──────────────────────────────────────────────────────

const order = (over: Partial<ProductionOrder> = {}): ProductionOrder =>
  ({
    id: 'o1',
    demandNumber: 'DEM-000123',
    branchId: 'b1',
    branchName: 'Mountain Bakes Alabad',
    date: '2026-10-20',
    time: '10:30',
    requiredDate: null,
    status: 'pending',
    items: [],
    packingItems: [],
    createdBy: 'u1',
    createdByName: 'Ali',
    submittedAt: '',
    approvedBy: null,
    approvedByName: null,
    approvedAt: null,
    ...over,
  }) as ProductionOrder;

const balance = (over: Partial<PreviousOrderBalance> = {}): PreviousOrderBalance => ({
  previous: { demandNumber: 'DEM-000100', date: '2026-10-18' },
  orderedValue: 12000,
  deliveredValue: 10000,
  companySharePct: 30,
  companyShareValue: 3000,
  returnsValue: 200,
  returnItems: [{ productName: 'Cream Puff', qty: 2, amount: 200 }],
  discountsValue: 100,
  discountItems: [{ demandNumber: 'DEM-000090', amount: 100 }],
  amountToCollect: 2700,
  paymentsReceivedValue: 500,
  paymentItems: [{ transferId: 't1', transferNo: 'CT-1', voucherNo: 'RV-9', date: '2026-10-19', amount: 500, cashAmount: 500 }],
  remainingBalance: 2200,
  ...over,
});

const slip = (over: Partial<SlipPrintInput> = {}): SlipPrintInput => ({
  order: order(),
  branchName: 'Mountain Bakes Alabad',
  companyName: 'Mountain Bakes',
  currencySymbol: 'Rs.',
  lines: [
    { productName: 'Cream Puff', approved: 10, unitPrice: 100, amount: 1000 },
    { productName: 'Chocolate Cake', approved: 0, unitPrice: 900, amount: 0 },
    { productName: 'Bento Cake', approved: 2, unitPrice: 1250, amount: 2500 },
  ],
  packing: [
    { materialName: 'Cake Box', qty: 3 },
    { materialName: 'Bag', qty: 0 },
  ],
  balance: balance(),
  printDate: '20 Oct 2026',
  printTime: '11:00 AM',
  ...over,
});

describe('order slip print', () => {
  it('keeps the slip reference and compact dates', () => {
    expect(slipReference({ date: '2026-10-20', time: '10:30' })).toBe('PO-20261020-1030');
    expect(compactDate('2026-10-20')).toBe('20/10/2026');
    expect(compactDate('')).toBe('—');
  });

  it('POP Print lists only what ships, totals it, and carries the collection block', () => {
    const text = buildOrderPopText(slip());
    expect(text).toContain('MOUNTAIN BAKES');
    expect(text).toContain('Production Order');
    expect(text).toContain('DEM-000123');
    expect(text).toContain('20/10/2026');
    expect(text).toContain('Cream Puff');
    expect(text).not.toContain('Chocolate Cake');
    expect(text).toContain('Rs. 3,500');
    expect(text).toContain('Cake Box');
    expect(text).not.toContain('Bag');
    expect(text).toContain('AMOUNT TO COLLECT');
    expect(text).toContain('Rs. 2,200');
    expect(lines(text).every((l) => l.length <= 48)).toBe(true);
  });

  it('POP Print leaves the collection block off while loading and says when there is none', () => {
    expect(buildOrderPopText(slip({ balance: undefined }))).not.toContain('PREVIOUS ORDER BALANCE');
    expect(buildOrderPopText(slip({ balance: null }))).toContain('No previous delivery — nothing to collect.');
  });

  it('A4 Challan: two copies, the itemised working on the Company Copy only', () => {
    const text = buildOrderChallanText(slip({ order: order({ status: 'awaiting_verification' }) }));
    const [customer, company] = text.split('cut here');
    expect(customer).toContain('CUSTOMER COPY');
    expect(customer).toContain('PRODUCTION ORDER');
    expect(customer).toContain('AWAITING VERIFICATION');
    expect(customer).toContain('PREVIOUS ORDER BALANCE');
    expect(customer).toContain('2 · Rs.200');
    expect(customer).not.toContain('RETURN ITEMS');
    expect(customer).not.toContain('Cash Paid');
    expect(company).toContain('COMPANY COPY');
    expect(company).not.toContain('PRODUCTION ORDER\n');
    expect(company).toContain('RETURN ITEMS (SINCE LAST ORDER)');
    expect(company).toContain('DISCOUNTS (SINCE LAST ORDER)');
    expect(company).toContain('CT-1');
    expect(company).toContain('Cash Paid');
    expect(company).toContain('Rs.3,500');
    expect(text).not.toContain('Chocolate Cake');
  });

  it('Production Check is product, qty and amount only', () => {
    const text = buildProductionCheckText(slip());
    expect(text).toContain('PRODUCTION CHECK');
    expect(text).toContain('PO-20261020-1030');
    expect(text).toContain('Total Qty: 12    Total Amount: Rs.3,500');
    expect(text).not.toContain('PREVIOUS ORDER BALANCE');
    expect(buildProductionCheckText(slip({ lines: [] }))).toContain('No approved products.');
  });

  it("leaves the Production role's own slips exactly as they were", () => {
    const o = order({
      requiredDate: '2026-10-21',
      items: [{ productId: 'p1', productName: 'Cream Puff', qty: 2, unitPrice: 100, remarks: '' }],
    });
    expect(buildPopPrintText(o)).toBe(
      ['Mountain Bakes — Production Department', 'Demand DEM-000123', 'Mountain Bakes Alabad', 'Raised 20 Oct 2026 · Required 21 Oct 2026', '', 'Cream Puff x2  Rs. 200', '', 'Total  Rs. 200'].join(
        '\n',
      ),
    );
    const a4 = buildA4ChallanText(o, balance());
    expect(a4).toContain('--- Customer Copy ---');
    expect(a4).toContain('Previous order DEM-000100');
    expect(a4.indexOf('Previous order')).toBeGreaterThan(a4.indexOf('--- Company Copy ---'));
  });
});

describe('Print for Production (demand summary)', () => {
  const orders = [
    order({
      status: 'pending',
      items: [
        { productId: 'p1', productName: 'Cream Puff', qty: 10, unitPrice: 100, remarks: '' },
        { productId: 'p2', productName: 'Special Cake', qty: 1, remarks: '', isSpecial: true },
      ],
      packingItems: [{ packingMaterialId: 'm1', materialName: 'Cake Box', qty: 4 }],
    }),
    order({
      id: 'o2',
      branchId: 'b2',
      branchName: 'Mountain Bakes Saddar',
      status: 'awaiting_verification',
      items: [
        { productId: 'p1', productName: 'Cream Puff', qty: 5, approvedQty: 4, remarks: '' },
        { productId: 'p3', productName: 'Bun', qty: 3, remarks: '' },
      ],
    }),
    order({ id: 'o3', status: 'approved', items: [{ productId: 'p1', productName: 'Cream Puff', qty: 99, remarks: '' }] }),
  ];

  it('pivots the waiting orders, prices snapshot-first, and never understates an unpriced branch', () => {
    const s = buildDemandSnapshot(orders, new Map([['p1', 120]]), new Map([['p1', 20]]));
    expect(s.pendingOrders).toBe(1);
    expect(s.awaitingOrders).toBe(1);
    expect(s.products.map((p) => [p.productName, p.qty])).toEqual([
      ['Cream Puff', 14],
      ['Bun', 3],
    ]);
    expect(s.products[0]).toMatchObject({ stock: 20, balance: 6 });
    expect(s.branches).toEqual([
      { branchId: 'b1', branchName: 'Alabad', qty: 10, amount: 1000 },
      // Cream Puff has no snapshot → live 120 × 4; Bun has neither → unknown.
      { branchId: 'b2', branchName: 'Saddar', qty: 7, amount: null },
    ]);
    expect(s.totals.grandAmount).toBeNull();
    expect(s.totals.totalStock).toBe(20);
    expect(demandStatusText(s)).toBe('1 to review · 1 sent, awaiting branch verification');
    expect(hasDemandToPrint(s)).toBe(true);
    expect(buildDemandSnapshot(orders, new Map(), null).totals.balanceStock).toBeNull();
  });

  it('prints the POS receipt at the roll width and the A4 report with its stock summary', () => {
    const s = buildDemandSnapshot(orders, new Map([['p1', 120], ['p3', 50]]), new Map([['p1', 20]]));
    const ctx = { companyName: 'Mountain Bakes', currencySymbol: 'Rs.', businessDateText: '20 Oct 2026', printDateText: '20 Oct 2026', printTimeText: '11:00 AM' };
    const pos58 = buildDemandSummaryPrintText(s, ctx, '58mm');
    expect(pos58).toContain('Production Demand Summary');
    expect(pos58).toContain('Distinct Products');
    expect(lines(pos58).filter((l) => !l.includes('arifsiksavi')).every((l) => l.length <= 32)).toBe(true);
    const a4 = buildDemandSummaryPrintText(s, ctx, 'a4');
    expect(a4).toContain('S.No. Product Name');
    expect(a4).toContain('1. Cream Puff');
    expect(a4).toContain('STOCK SUMMARY');
    expect(a4).toContain('Grand Total');
    expect(a4).toContain('Rs. 1,630');
  });
});

// ─── Daily Sale ─────────────────────────────────────────────────────────────

describe('Daily Sale print', () => {
  const record = {
    id: 'r1',
    branchId: 'b1',
    branchName: 'Alabad',
    businessDate: '2026-10-20',
    status: 'verified',
    autoTotalSale: 10000,
    autoCash: 6000,
    autoEasypaisa: 3000,
    autoFoodpanda: 1000,
    autoBank: 0,
    autoOther: 0,
    autoStaff: 250,
    paymentTotal: 10000,
    discount: 0,
    cashExpense: 500,
    expectedCashInHand: 5500,
    orderCount: 42,
    generatedAt: '2026-10-20T15:00:00Z',
    manualCash: 5400.5,
    manualEasypaisa: 3000,
    manualBank: null,
    fedByName: 'Ali',
    fedAt: '2026-10-20T16:00:00Z',
    cashDifference: -99.5,
    easypaisaDifference: 0,
    bankDifference: null,
    overallDifference: -99.5,
    verifiedByName: 'Admin',
  } as unknown as DailySaleRecord;

  it('names every difference in words', () => {
    expect(differenceText(null, 'Rs.')).toBe('—');
    expect(differenceText(0, 'Rs.')).toBe('Rs. 0 (Matched)');
    expect(differenceText(250, 'Rs.')).toBe('+Rs. 250 (Over)');
    expect(differenceText(-99.5, 'Rs.')).toBe('Rs. -99.5 (Short)');
  });

  it('stamps on the Karachi clock', () => {
    expect(karachiStamp('2026-10-20T20:30:00Z')).toBe('2026-10-21 01:30');
  });

  it("prints the web sheet's sections and sign-offs", () => {
    const text = buildDailySalePrintText(
      { record, branch: { id: 'b1', name: 'Mountain Bakes Alabad', address: 'Main Rd', city: 'Quetta', phone: '0300' } },
      { companyName: 'Mountain Bakes', currencySymbol: 'Rs.' },
    );
    expect(text).toContain('DAILY SALE RECORD');
    expect(text).toContain('Main Rd, Quetta');
    expect(text).toContain('20-10-2026');
    expect(text).toContain('2026-10-20 20:00');
    expect(text).toContain('Staff consumption (no payment taken)');
    expect(text).not.toContain('Other ');
    expect(text).toContain('Rs. 5,401');
    expect(text).toContain('Rs. -99.5 (Short)');
    expect(text).toContain('Prepared By');
    expect(text).toContain('Admin');
    expect(lines(text).every((l) => l.length <= 64)).toBe(true);
  });
});

// ─── Dashboard ──────────────────────────────────────────────────────────────

const finance = (): FinanceMonthlyDashboard =>
  ({
    month: '2026-10',
    previousMonth: '2026-09',
    from: '2026-10-01',
    to: '2026-10-31',
    branchId: null,
    businessDate: '2026-10-20',
    generatedAt: '2026-10-20T06:00:00Z',
    branches: [
      { id: 'b1', name: 'Alabad', isActive: true },
      { id: 'b2', name: 'Saddar', isActive: true },
      { id: 'b3', name: 'Closed', isActive: false },
    ],
    summary: {
      demand: 1000,
      companyShare: 300,
      received: 100,
      balance: 200,
      lastMonthBalance: 50,
      ledgerExpense: 40,
      returns: 10,
      discount: 5,
      orders: 2,
      receipts: 1,
      ledgerEntries: 1,
      returnCount: 1,
      discountCount: 1,
      unpricedLines: 0,
      ledgerIncome: 0,
      ledgerExpenseTotal: 0,
      ledgerNet: 0,
    },
    days: [{ date: '2026-10-05', branchId: 'b1', demand: 1000, companyShare: 300, received: 100, returns: 10, discount: 5, orders: 2, receipts: 1 }],
    ledger: [{ date: '2026-10-06', branchId: 'b1', ledgerHeadId: 'h1', ledgerHeadName: 'Fuel', amount: 40, entries: 1 }],
    previous: [{ branchId: 'b1', balance: 50 }],
    trend: [],
  }) as unknown as FinanceMonthlyDashboard;

const sales = {
  totalSales: 5000,
  totalTransactions: 10,
  averageDailySales: 250,
  staffTotal: 30,
  staffCount: 1,
  paymentMethods: [{ method: 'cash', count: 8, total: 4000 }],
  topProducts: [{ productId: 'p1', productName: 'Cream Puff', categoryName: 'Pastry', qty: 20, sales: 2000 }],
} as unknown as SalesAnalytics;

describe('Admin Dashboard export', () => {
  it('lists every active branch, idle ones at zero, never an inactive one', () => {
    const rows = branchSummaryRows(finance());
    expect(rows.map((r) => r.branch)).toEqual(['Alabad', 'Saddar']);
    expect(rows[0]).toMatchObject({ demand: 1000, ledger: 40, lastMonthBalance: 50, orders: 2 });
    expect(rows[1]).toMatchObject({ demand: 0, lastMonthBalance: null });
  });

  it("is the web's adminCsv, block by block", () => {
    const csv = adminDashboardCsv({ context: 'October 2026 · All Branches', finance: finance(), sales, incGran: 'monthly', expGran: 'monthly' });
    const blocks = csv.split('\n\n');
    expect(blocks[0]).toBe('Mountain Bakes Admin Dashboard — October 2026 · All Branches');
    expect(blocks.slice(1).filter((_, i) => i % 2 === 0)).toEqual(['SALES', 'PAYMENT METHODS', 'TOP SELLING PRODUCTS', 'BRANCH SUMMARY', 'INCOME', 'EXPENSES']);
    expect(blocks[2]).toBe('Total Sales,Transactions,Average Daily Sales,Staff Sales (unpaid)\n5000,10,250,30');
    expect(blocks[4]).toBe('Method,Transactions,Amount\nCash,8,4000');
    expect(blocks[8]).toContain('Last Month Balance (September 2026)');
    expect(blocks[8]).toContain('Saddar,0,0,0,0,0,0,0,');
    expect(blocks[8].split('\n').pop()).toBe('Total,1000,300,100,200,40,10,5,50');
    // No sales answer → the three sales blocks are left out.
    expect(adminDashboardCsv({ context: 'x', finance: finance(), sales: null, incGran: 'monthly', expGran: 'monthly' }).split('\n\n')[1]).toBe('BRANCH SUMMARY');
  });

  it('names the CSV as the web does', () => {
    expect(adminDashboardCsvName('2026-10', null, null)).toBe('admin-dashboard-2026-10.csv');
    expect(adminDashboardCsvName('2026-10', 'Mountain Bakes Alabad', { from: 1, to: 7 })).toBe('admin-dashboard-2026-10-mountain-bakes-alabad-01-07.csv');
  });

  it('prints the sections in the page order', () => {
    const text = adminDashboardPrintText({
      context: 'October 2026 · All Branches',
      finance: finance(),
      sales,
      incGran: 'monthly',
      expGran: 'monthly',
      updatedAt: '11:00 AM',
      today: { heading: 'Business day 20 Oct 2026 · All Branches', summary: null, waitingOrders: 3, activeBranches: 2, lowStock: null },
    });
    const headings = ['TODAY', 'OCTOBER 2026', 'SALES OVERVIEW', 'PAYMENT METHODS', 'TOP SELLING PRODUCTS', 'BRANCH SUMMARY', 'INCOME', 'EXPENSES'].map((h) => text.indexOf(h));
    expect(headings.every((i) => i >= 0)).toBe(true);
    expect([...headings].sort((a, b) => a - b)).toEqual(headings);
    expect(text).toContain('Waiting Production Orders');
    expect(text).toContain('30.0% of Rs. 1,000.00 demand');
  });
});

// ─── Reports ────────────────────────────────────────────────────────────────

describe('Reports print', () => {
  const summary = {
    period: 'monthly',
    from: '2026-10-01T00:00:00Z',
    to: '2026-10-31T00:00:00Z',
    totalOrders: 1200,
    totalRevenue: 345000,
    averageOrderValue: 287.5,
    totalCancelled: 4,
    totalExpenses: 2000,
    totalProfit: 343000,
    dailyData: [{ date: '2026-10-01', totalOrders: 40, totalRevenue: 11000, totalCancelled: 0, expenses: 100, profit: 10900 }],
    branchData: [{ branchId: 'b1', branchName: 'Alabad', totalOrders: 600, totalRevenue: 170000, averageOrderValue: 283 }],
    topProducts: [{ productId: 'p1', productName: 'Cream Puff', categoryName: 'Pastry', totalQty: 300, totalRevenue: 30000 }],
    paymentMethodBreakdown: [{ method: 'easypaisa', count: 12, total: 4000 }],
  } as unknown as ReportSummary;

  it('prints the stats, payment methods and only the open tab', () => {
    const trend = buildReportsPrintText(summary, 'sales');
    expect(trend).toContain('2026-10-01 – 2026-10-31');
    expect(trend).toContain('Rs.345,000');
    expect(trend).toContain('Rs.288');
    expect(trend).toContain('Easypaisa (12)');
    expect(trend).toContain('SALES TREND');
    expect(trend).not.toContain('TOP 10 PRODUCTS');
    expect(buildReportsPrintText(summary, 'products')).toContain('1. Cream Puff (Pastry)');
    expect(buildReportsPrintText(summary, 'branches')).toContain('BRANCH COMPARISON');
    const packing = buildReportsPrintText(summary, 'packing', {
      rangeText: '01 Oct 2026 – 20 Oct 2026',
      branchLabel: 'All branches',
      materialLabel: 'All packing materials',
      totals: { requested: 10, approved: 8, delivered: 7 },
      rows: [{ date: '2026-10-02', branchId: 'b1', branchName: 'Alabad', packingMaterialId: 'm1', materialName: 'Cake Box', requestedQty: 10, approvedQty: 8, deliveredQty: 7 }],
      total: 30,
    });
    expect(packing).toContain('30 rows · 1 loaded on this screen');
    expect(packing).toContain('Cake Box');
  });
});
