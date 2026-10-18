import type { ReportPeriod } from './types';

/** Centralized query key factory — no inline string arrays at call sites. */
export const queryKeys = {
  reportSummary: (period: ReportPeriod, from?: string, to?: string) => ['reportSummary', period, from ?? null, to ?? null] as const,
  salesAnalytics: (from: string, to: string, compare?: boolean, topLimit?: number) =>
    ['salesAnalytics', from, to, compare ?? false, topLimit ?? 5] as const,
  stockHistoryDay: (date: string) => ['stockHistoryDay', date] as const,
  stockHistorySeries: (days: number) => ['stockHistorySeries', days] as const,
  stock: (date?: string) => ['stock', date ?? 'today'] as const,
  branchClosing: (date?: string) => ['branchClosing', date ?? 'today'] as const,
  products: () => ['products'] as const,
  orders: (params?: { status?: string; from?: string; to?: string }) => ['orders', params ?? {}] as const,
  order: (id: string) => ['order', id] as const,
  salesData: (params: { businessDate: string; search?: string; paymentMethod?: string; sort?: string }) => ['salesData', params] as const,
  appSettings: () => ['appSettings'] as const,
  productionOrders: () => ['productionOrders'] as const,
  productionOrder: (id: string) => ['productionOrder', id] as const,
  packingMaterials: () => ['packingMaterials'] as const,
  // Keyed by the whole filter (window, product, status, search, sort, page) — each is a different server answer.
  branchReturns: (params?: Record<string, unknown>) => ['branchReturns', params ?? {}] as const,
  // Month-to-date returns summary. Under the ['branchReturns'] prefix so every return
  // write's invalidation reaches it; keyed by today's business date so a new day (and
  // with it a new month) is a new key, never yesterday's figures served as today's.
  branchReturnsSummary: (businessDate: string) => ['branchReturns', 'summary', businessDate] as const,
  branchDiscounts: (params?: { days?: number; status?: string }) => ['branchDiscounts', params ?? {}] as const,
  // Month-to-date discount summary — its own root, NOT under ['branchDiscounts']:
  // useNavBadges reads the first ['branchDiscounts'] entry as a claim list, and
  // a summary there crashed it. Every claim write invalidates this root too
  // (useDiscountsApi, useDiscountActions). Keyed by business date so a new
  // month is a new key.
  branchDiscountSummary: (businessDate: string) => ['branchDiscountSummary', businessDate] as const,
  branchDiscountsList: (params: { from: string; to: string; status?: string; search?: string; sortBy?: string; sortDir?: string }) =>
    ['branchDiscountsList', params] as const,
  cashTransfers: (params?: unknown) => ['cashTransfers', params ?? {}] as const,
  // Month-to-date summary — its own root, NOT under ['cashTransfers'], which the
  // Help Desk's recent-records list reads as a transfer list. A new deposit
  // invalidates it (useCreateCashTransfer). Keyed by business date so a new
  // month is a new key, never last month's figures.
  cashTransferMonthlySummary: (businessDate: string) => ['cashTransferMonthlySummary', businessDate] as const,
  cashTransfer: (id: string) => ['cashTransfer', id] as const,
  expenses: () => ['expenses'] as const,
  // Shop Expenses' month-to-date list and its server total (Data Engine). Own
  // roots, not ['expenses'], whose entries the Help Desk reads as an
  // ExpenseListResponse; useCreateExpense invalidates all three.
  expensesData: (params: { from: string; search?: string }) => ['expensesData', params] as const,
  expensesTotal: (params: { from: string; search?: string }) => ['expensesTotal', params] as const,
  specialEvents: (year?: number) => ['specialEvents', year ?? 'current'] as const,
  myEventDemand: (eventId: string) => ['myEventDemand', eventId] as const,
  eventsSummary: () => ['eventsSummary'] as const,
  eventDemands: (eventId: string) => ['eventDemands', eventId] as const,
  consolidatedDemand: (eventId: string) => ['consolidatedDemand', eventId] as const,
  eventProductionStatus: (eventId: string) => ['eventProductionStatus', eventId] as const,
  financeDashboard: (params?: { from?: string; to?: string; branchId?: string | null }) => ['financeDashboard', params ?? {}] as const,
  pendingApprovals: () => ['pendingApprovals'] as const,
  financeSettings: () => ['financeSettings'] as const,
  ledgerPage: (query: unknown) => ['ledgerPage', query] as const,
  ledgerSummary: (params: unknown) => ['ledgerSummary', params] as const,
  ledgerEntry: (id: string) => ['ledgerEntry', id] as const,
  ledgerHeads: (opts?: unknown) => ['ledgerHeads', opts ?? {}] as const,
  dayClosing: (date?: string) => ['dayClosing', date ?? 'today'] as const,
  dayClosingHistory: (days: number) => ['dayClosingHistory', days] as const,
  financeReport: (query?: unknown) => ['financeReport', query ?? {}] as const,
  financeAudit: (query: unknown) => ['financeAudit', query] as const,
  financeCashTransfers: (query: unknown) => ['financeCashTransfers', query] as const,
  financeCashTransfer: (id: string) => ['financeCashTransfer', id] as const,
  financeTransactions: (query: unknown) => ['financeTransactions', query] as const,
  employees: (opts?: unknown) => ['employees', opts ?? {}] as const,
  employeeProfile: (id: string) => ['employeeProfile', id] as const,
  salaryRevisions: (employeeId: string) => ['salaryRevisions', employeeId] as const,
  employeeAdvanceSummary: (employeeId: string) => ['employeeAdvanceSummary', employeeId] as const,
  salaries: (query: unknown) => ['salaries', query] as const,
  advances: (query: unknown) => ['advances', query] as const,
  salaryLedger: (query: unknown) => ['salaryLedger', query] as const,
  salaryLedgerPayments: (params: unknown) => ['salaryLedgerPayments', params] as const,
  financePartners: (includeInactive?: boolean) => ['financePartners', includeInactive ?? false] as const,
  partnerShareSummary: (params?: unknown) => ['partnerShareSummary', params ?? {}] as const,
  partnerExpenses: (query: unknown) => ['partnerExpenses', query] as const,
  partnerLedger: (query: unknown) => ['partnerLedger', query] as const,
  partnerLedgerTransactions: (query: unknown) => ['partnerLedgerTransactions', query] as const,
  financeTicketStats: () => ['financeTicketStats'] as const,
  financeTickets: (query: unknown) => ['financeTickets', query] as const,
  financeTicket: (id: string) => ['financeTicket', id] as const,
  dailySaleRecords: (params?: { from?: string; to?: string }) => ['dailySaleRecords', params ?? {}] as const,
  packingUsage: (from: string, to: string) => ['packingUsage', from, to] as const,
  supportTickets: () => ['supportTickets'] as const,
  productionStock: (date?: string) => ['productionStock', date ?? 'today'] as const,
  productionSales: (params?: { from?: string; to?: string }) => ['productionSales', params ?? {}] as const,
  productionReturns: (params?: { status?: string; search?: string }) => ['productionReturns', params ?? {}] as const,
  // Same idea for Production's per-branch summary — and the branch filter is part of it.
  productionReturnsSummary: (branchId: string | null, businessDate: string) =>
    ['productionReturns', 'summary', branchId, businessDate] as const,
  productionDiscounts: (params?: { status?: string; search?: string }) => ['productionDiscounts', params ?? {}] as const,
  // Under ['productionDiscounts'] so a review refreshes it with the queue.
  productionDiscountSummary: (branchId: string | null, businessDate: string) =>
    ['productionDiscounts', 'summary', branchId, businessDate] as const,
  branches: () => ['branches'] as const,
  productionOrderPreviousBalance: (orderId: string) => ['productionOrderPreviousBalance', orderId] as const,
  specialOrders: () => ['specialOrders'] as const,
  productionOverview: (period: 'today' | 'week' | 'month', branchId?: string | null) =>
    ['productionOverview', period, branchId ?? 'all'] as const,
  productionBranchStock: () => ['productionBranchStock'] as const,
  productionReportSummary: (query: unknown) => ['productionReportSummary', query] as const,
  notifications: () => ['notifications'] as const,
};
