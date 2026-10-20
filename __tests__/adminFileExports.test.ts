/**
 * @format
 */
import {
  EXPORT_FORMATS,
  FILE_EXTENSION,
  collectionsExportRequest,
  collectionsFileName,
  currentPageHint,
  currentPageWindow,
  dataTableExportRequest,
  exportFileTitle,
  exportStamp,
  financeLedgerExportRequest,
  financeReportExportRequest,
  priceHistoryExportRequest,
  priceListExportRequest,
  reportsExportRequest,
} from '@/features/admin/utils/exports';

const now = new Date('2026-10-20T08:00:00Z');

describe('formats per page (the web buttons)', () => {
  it('offers what each web page offers, in its order', () => {
    expect(EXPORT_FORMATS.dataTable).toEqual(['excel', 'csv']);
    expect(EXPORT_FORMATS.collections).toEqual(['excel']);
    expect(EXPORT_FORMATS.reports).toEqual(['pdf', 'excel', 'csv']);
    expect(EXPORT_FORMATS.priceList).toEqual(['excel', 'csv']);
    expect(EXPORT_FORMATS.priceHistory).toEqual(['excel', 'csv']);
    expect(EXPORT_FORMATS.financeReports).toEqual(['pdf', 'excel', 'csv']);
    expect(EXPORT_FORMATS.financeLedger).toEqual(['pdf', 'excel']);
  });

  it('maps formats to extensions and stamps in UTC like the web', () => {
    expect(FILE_EXTENSION).toEqual({ excel: 'xlsx', pdf: 'pdf', csv: 'csv' });
    expect(exportStamp(new Date('2026-10-20T23:30:00Z'))).toBe('2026-10-20');
  });
});

describe('data table export (ExportMenu)', () => {
  const table = { resource: 'customers', fileName: 'mountain-bakes-customers', params: { sort: 'createdAt:desc', search: 'ali' }, pageSize: 50, loadedRows: 50 };

  it('names the file as the web does', () => {
    expect(exportFileTitle('customers', 'mountain-bakes-customers', 'excel', now)).toBe('mountain-bakes-customers-2026-10-20.xlsx');
    expect(exportFileTitle('users', undefined, 'csv', now)).toBe('mountain-bakes-users-2026-10-20.csv');
    expect(exportFileTitle('productionOrders', 'production-orders', 'excel', now)).toBe('production-orders-2026-10-20.xlsx');
  });

  it('sends the list query with scope and format', () => {
    expect(dataTableExportRequest(table, 'all', 'excel', now)).toEqual({
      endpoint: '/data/customers/export',
      params: { sort: 'createdAt:desc', search: 'ali', scope: 'all', format: 'excel' },
      fileName: 'mountain-bakes-customers-2026-10-20.xlsx',
    });
    expect(dataTableExportRequest(table, 'page', 'csv', now)).toEqual({
      endpoint: '/data/customers/export',
      params: { sort: 'createdAt:desc', search: 'ali', page: 1, pageSize: 50, scope: 'page', format: 'csv' },
      fileName: 'mountain-bakes-customers-2026-10-20.csv',
    });
  });

  it('sizes "current page" to the rows loaded, within the sizes the server accepts', () => {
    expect(currentPageWindow(0, 20)).toEqual({ page: 1, pageSize: 20 });
    expect(currentPageWindow(20, 20)).toEqual({ page: 1, pageSize: 20 });
    expect(currentPageWindow(40, 20)).toEqual({ page: 1, pageSize: 50 });
    expect(currentPageWindow(100, 50)).toEqual({ page: 1, pageSize: 100 });
    expect(currentPageWindow(140, 20)).toEqual({ page: 1, pageSize: 100 });
  });

  it('says what the current-page file holds', () => {
    expect(currentPageHint(0, 20, 0)).toBe('No rows on this screen');
    expect(currentPageHint(12, 20, 12)).toBe('The 12 rows on this screen');
    expect(currentPageHint(20, 20, 300)).toBe('The 20 rows on this screen');
    expect(currentPageHint(40, 20, 300)).toBe('The first 50 rows of this list');
    expect(currentPageHint(140, 20, 300)).toBe('The first 100 rows of this list');
  });
});

describe('Collections', () => {
  it('names the Excel file after the window and the branch', () => {
    expect(collectionsFileName('2026-10-01', '2026-10-20', null)).toBe('mountain-bakes-collections-all-branches-2026-10-01_to_2026-10-20.xlsx');
    expect(collectionsFileName('2026-10-20', '2026-10-20', 'Mountain Bakes Alabad')).toBe('mountain-bakes-collections-mountain-bakes-alabad-2026-10-20.xlsx');
  });

  it('asks the production report export for Excel, branch only when one is picked', () => {
    expect(collectionsExportRequest('2026-10-01', '2026-10-20', null)).toEqual({
      endpoint: '/production-reports/export',
      params: { report: 'collections', from: '2026-10-01', to: '2026-10-20', type: 'excel' },
      fileName: 'mountain-bakes-collections-all-branches-2026-10-01_to_2026-10-20.xlsx',
    });
    expect(collectionsExportRequest('2026-10-20', '2026-10-20', { id: 'b1', name: 'Alabad' }).params).toEqual({
      report: 'collections',
      from: '2026-10-20',
      to: '2026-10-20',
      branchId: 'b1',
      type: 'excel',
    });
  });
});

describe('Reports & Analytics', () => {
  it('uses type=<format>&period and the web file name', () => {
    expect(reportsExportRequest('monthly', 'pdf')).toEqual({
      endpoint: '/reports/export',
      params: { type: 'pdf', period: 'monthly' },
      fileName: 'mountain-bakes-report-monthly.pdf',
    });
    expect(reportsExportRequest('daily', 'excel').fileName).toBe('mountain-bakes-report-daily.xlsx');
    expect(reportsExportRequest('yearly', 'csv').params).toEqual({ type: 'csv', period: 'yearly' });
  });
});

describe('Price List and Price History', () => {
  it('exports the list, or grouped by category', () => {
    expect(priceListExportRequest('excel', false, now)).toEqual({
      endpoint: '/products/price/list/export',
      params: { type: 'excel' },
      fileName: 'mountain-bakes-price-list-2026-10-20.xlsx',
    });
    expect(priceListExportRequest('csv', true, now)).toEqual({
      endpoint: '/products/price/list/export',
      params: { type: 'csv', groupBy: 'category' },
      fileName: 'mountain-bakes-products-by-category-2026-10-20.csv',
    });
  });

  it('exports the whole price trail', () => {
    expect(priceHistoryExportRequest('excel', now)).toEqual({
      endpoint: '/products/price/history/export',
      params: { type: 'excel' },
      fileName: 'mountain-bakes-price-history-2026-10-20.xlsx',
    });
    expect(priceHistoryExportRequest('csv', now).fileName).toBe('mountain-bakes-price-history-2026-10-20.csv');
  });
});

describe('Finance Reports and Finance Ledger', () => {
  it('sends the report filters with format, never the page, dropping empty values', () => {
    expect(
      financeReportExportRequest({ type: 'general_ledger', from: '2026-10-01', to: '2026-10-20', ledgerHeadId: undefined, branchId: '', page: 2, pageSize: 50 }, 'excel'),
    ).toEqual({
      endpoint: '/finance/reports/export',
      params: { type: 'general_ledger', from: '2026-10-01', to: '2026-10-20', format: 'excel' },
      fileName: 'mountain-bakes-general-ledger.xlsx',
    });
    expect(financeReportExportRequest({ type: 'daily_cash_book', from: '2026-10-20', to: '2026-10-20', ledgerHeadId: 'h1' }, 'pdf').params).toEqual({
      type: 'daily_cash_book',
      from: '2026-10-20',
      to: '2026-10-20',
      ledgerHeadId: 'h1',
      format: 'pdf',
    });
    expect(financeReportExportRequest({ type: 'trial_balance' }, 'csv').fileName).toBe('mountain-bakes-trial-balance.csv');
  });

  it("exports the ledger as the Daily Cash Book over the ledger's window and branch", () => {
    expect(financeLedgerExportRequest({ from: '2026-10-01', to: '2026-10-20', branchId: 'b1' }, 'pdf')).toEqual({
      endpoint: '/finance/reports/export',
      params: { type: 'daily_cash_book', from: '2026-10-01', to: '2026-10-20', branchId: 'b1', format: 'pdf' },
      fileName: 'mountain-bakes-daily-cash-book.pdf',
    });
    expect(financeLedgerExportRequest({ from: '2026-10-20', to: '2026-10-20' }, 'excel').params).toEqual({
      type: 'daily_cash_book',
      from: '2026-10-20',
      to: '2026-10-20',
      format: 'excel',
    });
  });
});
