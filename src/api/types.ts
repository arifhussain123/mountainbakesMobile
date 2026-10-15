/**
 * Request/response DTOs, copied by hand from the real backend contract
 * (`backend/src/shared/types/*.ts`, `backend/src/services/auth/auth.service.ts`,
 * `backend/src/routes/*.routes.ts`) rather than invented — this mobile app is a
 * client of the existing Express API, not a new backend's imagined shape.
 */

// ─── Auth ──────────────────────────────────────────────────────────────────

export type UserRole =
  | 'super_admin'
  | 'branch_manager'
  | 'production_user'
  | 'finance_admin'
  | 'finance_manager'
  | 'accountant'
  | 'finance_auditor';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  username: string | null;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
  mustChangePassword: boolean;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
  user: SessionUser;
}

export interface MeResponse {
  user: {
    uid: string;
    email: string;
    role: UserRole;
    branchId: string | null;
    branchName: string | null;
  };
}

// ─── Dashboard: GET /api/reports/summary ──────────────────────────────────

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface ReportDailyPoint {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  totalCancelled: number;
  expenses: number;
  profit: number;
}

export interface ReportSummary {
  period: string;
  from: string;
  to: string;
  totalOrders: number;
  totalRevenue: number;
  totalDiscount: number;
  staffTotal: number;
  totalCancelled: number;
  totalPending: number;
  averageOrderValue: number;
  totalExpenses: number;
  totalProfit: number;
  dailyData: ReportDailyPoint[];
  budget?: { daily: number; weekly: number; monthly: number };
}

// ─── Dashboard: GET /api/sales-analytics ──────────────────────────────────

export interface SalesAnalyticsDailyPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface SalesAnalyticsTopProduct {
  productId: string;
  productName: string;
  totalQty: number;
  totalRevenue: number;
}

export interface SalesAnalyticsPaymentMethod {
  method: string;
  total: number;
  count: number;
}

export interface SalesAnalytics {
  from: string;
  effectiveTo: string;
  todaySales: number;
  totalSales: number;
  totalTransactions: number;
  averageDailySales: number;
  highestDay: { date: string; revenue: number } | null;
  lowestDay: { date: string; revenue: number } | null;
  daily: SalesAnalyticsDailyPoint[];
  topProducts: SalesAnalyticsTopProduct[];
  paymentMethods: SalesAnalyticsPaymentMethod[];
  comparison?: unknown;
  staffCount: number;
}

// ─── Stock ─────────────────────────────────────────────────────────────────

export interface StockRow {
  productId: string;
  stockCode: string;
  productName: string;
  isActive: boolean;
  opening: number;
  newQty: number;
  sold: number;
  returned: number;
  adjustment: number;
  balance: number;
}

export interface StockListResponse {
  date: string;
  rows: StockRow[];
}

export interface BranchStockHistoryRow {
  date: string;
  openingQty: number;
  openingAmount: number;
  newQty: number;
  newAmount: number;
  soldQty: number;
  soldAmount: number;
  returnedQty: number;
  returnedAmount: number;
  adjustmentQty: number;
  adjustmentAmount: number;
  balanceQty: number;
  balanceAmount: number;
}

export interface StockReconciliation {
  statementQty: number;
  itemsQty: number;
  difference: number;
  unexplained: number;
}

export interface StockHistoryDayResponse {
  branchId: string;
  date: string;
  row: BranchStockHistoryRow;
  reconciliation: StockReconciliation;
}

export interface StockHistorySeriesResponse {
  branchId: string;
  from: string;
  to: string;
  rows: BranchStockHistoryRow[];
  capped: boolean;
}

// ─── Products ──────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  sku: string;
  price: number;
  isActive: boolean;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
}

// ─── Orders / POS sales ────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'easypaisa' | 'foodpanda' | 'bank_account';

export interface OrderItemInput {
  productId: string;
  qty: number;
  discount: number;
}

export interface CreatePosSaleInput {
  branchId: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItemInput[];
  paymentMethod: PaymentMethod;
  receivedCash?: number;
  notes?: string;
  businessDate?: string;
}

export interface OrderItemResult extends OrderItemInput {
  productName: string;
  categoryId: string | null;
  categoryName: string | null;
  unitPrice: number;
  lineTotal: number;
}

export interface CreatePosSaleResult {
  id: string;
  orderNumber: string;
  grandTotal: number;
  items: OrderItemResult[];
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  receivedCash?: number;
  cashReturned?: number;
  createdAt: string;
}

// Production's own counter sale draws from the central pool, not a branch's
// `stock`, and may additionally use 'staff' (no money taken, comment required).
export type ProductionSalePaymentMethod = PaymentMethod | 'staff';

export interface CreateProductionSaleInput {
  customerName?: string;
  customerPhone?: string;
  items: OrderItemInput[];
  paymentMethod: ProductionSalePaymentMethod;
  receivedCash?: number;
  notes?: string;
}

// Field names match the wire shape of `StockShortfall` (backend
// `stock.service.ts`) exactly — `requested`/`available`, NOT `requestedQty`/
// `availableQty` (that's a different shape, used by packing-material demand).
export interface InsufficientStockDetail {
  productId: string;
  productName: string;
  requested: number;
  available: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  branchId: string;
  branchName: string;
  customerName: string;
  customerPhone: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  paymentMethod: string;
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  grandTotal: number;
  receivedCash: number | null;
  cashReturned: number | null;
  notes: string;
  businessDate: string;
  createdAt: string;
  items: OrderItemResult[];
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
}

// ─── Production orders (branch demand to the central kitchen) ─────────────
// NOT the same as `/api/orders` above — this is `/api/production-orders`,
// the branch's own request for stock, built from `production-order.types.ts`.

export type ProductionOrderStatus = 'pending' | 'awaiting_verification' | 'verified' | 'approved' | 'rejected' | 'cancelled';

export interface ProductionOrderItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice?: number;
  remarks: string;
  approvedQty?: number;
  isSpecial?: boolean;
  addedByProduction?: boolean;
}

export interface ProductionOrderPackingItem {
  packingMaterialId: string;
  materialName: string;
  qty: number;
  approvedQty?: number;
}

export interface ProductionOrder {
  id: string;
  demandNumber: string;
  branchId: string;
  branchName: string;
  date: string;
  time: string;
  requiredDate?: string | null;
  items: ProductionOrderItem[];
  packingItems?: ProductionOrderPackingItem[];
  status: ProductionOrderStatus;
  wasChanged?: boolean;
  changeReason?: string | null;
  createdBy: string;
  createdByName: string;
  submittedAt: string;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  cancelReason?: string | null;
}

export interface ProductionOrderListResponse {
  orders: ProductionOrder[];
  total: number;
}

export interface CreateProductionOrderItemInput {
  productId: string;
  qty: number;
  remarks?: string;
}

export interface CreateProductionOrderPackingItemInput {
  packingMaterialId: string;
  qty: number;
}

export interface CreateProductionOrderInput {
  items: CreateProductionOrderItemInput[];
  packingItems?: CreateProductionOrderPackingItemInput[];
  requiredDate: string;
  businessDate?: string;
}

// ─── Packing materials ──────────────────────────────────────────────────────

export interface PackingMaterial {
  id: string;
  materialCode: string;
  materialName: string;
  isActive: boolean;
}

export interface PackingMaterialListResponse {
  packingMaterials: PackingMaterial[];
  total: number;
}

// ─── Attachments (photo capture) ───────────────────────────────────────────
// Extend this union only as a slice actually uploads against a new entity —
// the full server-side list (`attachment.types.ts`) covers more than this app
// touches.

export type AttachmentEntity = 'branch_return' | 'cash_transfer' | 'finance_transaction';

export interface Attachment {
  id: string;
  entity: AttachmentEntity;
  entityId: string | null;
  /** Short-lived signed URL, re-minted on every read — never cache past a page load. */
  url: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: string;
}

// ─── Branch returns (Return Items / Return Stock) ──────────────────────────
// `/api/stock/return` (create) and `/api/stock/returns` (the branch's own
// list/revise/withdraw) — one row per product, geofenced like order creation.

export type BranchReturnStatus = 'pending' | 'accepted' | 'rejected' | 'returned';

export interface BranchReturn {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  qty: number;
  reason: string;
  status: BranchReturnStatus;
  source: 'branch' | null;
  date: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  photo?: Attachment | null;
}

export interface BranchReturnListResponse {
  returns: BranchReturn[];
  total: number;
}

export interface CreateBranchReturnItemInput {
  productId: string;
  qty: number;
}

export interface CreateBranchReturnInput {
  items: CreateBranchReturnItemInput[];
  reason?: string;
  attachmentIds?: string[];
  businessDate?: string;
}

// ─── Branch discounts (Request Discount / Discounts) ───────────────────────
// `/api/branch-discounts` — money claimed back against a production demand.
// MOVES NO STOCK (unlike branch returns) — no idempotency key, no geofence.

export type BranchDiscountStatus = 'pending' | 'approved' | 'rejected' | 'returned';

export interface BranchDiscount {
  id: string;
  branchId: string;
  branchName: string;
  productionOrderId: string;
  demandNumber: string;
  amount: number;
  reason: string;
  status: BranchDiscountStatus;
  date: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  /** Why Production refused it or sent it back. Null until reviewed. */
  reviewNote: string | null;
}

export interface BranchDiscountListResponse {
  discounts: BranchDiscount[];
  total: number;
}

export interface CreateBranchDiscountInput {
  productionOrderId: string;
  amount: number;
  reason: string;
  businessDate?: string;
}

/**
 * Production's review of a claim (`PUT /production-discounts/:id/review`).
 * 'returned' REQUIRES `reviewNote` server-side (what the branch needs to
 * correct) — 'approved'/'rejected' leave it optional.
 */
export interface ReviewBranchDiscountInput {
  status: 'approved' | 'rejected' | 'returned';
  reviewNote?: string;
}

// ─── Cash transfers (Cash Deposit / Cash Transfers) ────────────────────────
// `/api/cash-transfers` — money a branch hands over to the company. NO edit,
// NO withdraw once raised (a wrong one is rejected by Finance and resubmitted).

export type CashTransferMethod = 'cash' | 'easypaisa' | 'bank_account';
export type CashTransferStatus = 'pending' | 'approved' | 'rejected';

export interface CashTransfer {
  id: string;
  transferNo: string;
  branchId: string;
  branchName: string;
  cashAmount: number;
  easypaisaAmount: number;
  bankAmount: number;
  /** Total Amount = cashAmount + easypaisaAmount + bankAmount. Excludes fuel. */
  amount: number;
  fuelCharges: number;
  paymentMethod: CashTransferMethod | null;
  note: string | null;
  date: string;
  status: CashTransferStatus;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  approvalNote: string | null;
  rejectionReason: string | null;
  voucherNo: string | null;
  updatedAt: string;
  attachments: Attachment[];
}

export interface CashTransferListResponse {
  transfers: CashTransfer[];
  total: number;
}

export interface CreateCashTransferInput {
  cashAmount?: number;
  easypaisaAmount?: number;
  bankAmount?: number;
  fuelCharges?: number;
  totalAmount?: number;
  note?: string;
  attachmentIds?: string[];
  businessDate?: string;
}

// Finance's own review side — `/api/finance/cash-transfers` (screen 03).

export type CashTransferSortKey = 'date' | 'createdAt' | 'approvedAt' | 'transferNo' | 'voucherNo' | 'branchName' | 'amount' | 'fuelCharges' | 'status';

export interface FinanceCashTransferQuery {
  branchId?: string;
  from?: string;
  to?: string;
  status?: CashTransferStatus;
  paymentMethod?: CashTransferMethod;
  search?: string;
  sortBy?: CashTransferSortKey;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ApproveCashTransferInput {
  note?: string;
}

export interface RejectCashTransferInput {
  reason: string;
}

// ─── Shop expenses ──────────────────────────────────────────────────────────
// `/api/expenses` — cash/easypaisa only, today-only date for a branch role,
// no edit/delete.

export type ExpensePaymentMethod = 'cash' | 'easypaisa';

export const EXPENSE_CATEGORIES = [
  'Shop Expense',
  'Lunch Expense',
  'Tea Expense',
  'Guest Expense',
  'Electricity',
  'Utilities',
  'Rent',
  'Salary',
  'Advance Salary',
  'Advance Cash',
  'Loan',
  'Home Expense',
  'Material',
  'Transport',
  'Other',
] as const;

export interface Expense {
  id: string;
  expenseNumber: string;
  branchId: string;
  branchName: string;
  date: string;
  category: string;
  description: string;
  paymentMethod: ExpensePaymentMethod;
  amount: number;
  remarks: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
}

export interface CreateExpenseInput {
  category: string;
  description: string;
  paymentMethod: ExpensePaymentMethod;
  amount: number;
  remarks?: string;
  /** Branch role: today only, enforced server-side. */
  date?: string;
}

// ─── Special events / Event demand ─────────────────────────────────────────
// `/api/special-events` — List view only (branchApp.md 18 names a Calendar
// view too; there is no existing month-calendar component, so that is an
// explicit follow-up, not built here).

export type EventCategory = 'islamic' | 'ahlul_bayt' | 'national' | 'international' | 'company';
export type EventStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';
export type EventPriority = 'low' | 'normal' | 'high' | 'critical';
export type EventDemandStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'fulfilled';

export interface SpecialEvent {
  id: string;
  eventNumber: string;
  name: string;
  description: string | null;
  category: EventCategory;
  /** Null until resolved (an un-confirmed Hijri date with no estimate yet). */
  eventDate: string | null;
  eventEndDate: string | null;
  /** True when `eventDate` is the computed estimate, not an Admin-confirmed date. */
  dateIsEstimated: boolean;
  daysRemaining: number | null;
  demandDueDate: string | null;
  status: EventStatus;
  priority: EventPriority;
  color: string | null;
  notes: string | null;
}

export interface SpecialEventListResponse {
  events: SpecialEvent[];
  total: number;
}

export interface EventBranchDemandItem {
  id: string;
  demandId: string;
  productId: string | null;
  productName: string;
  qty: number;
  approvedQty: number | null;
  preparedQty: number;
  unitPrice: number | null;
  remarks: string | null;
}

export interface EventBranchDemand {
  id: string;
  eventId: string;
  branchId: string;
  branchName: string | null;
  status: EventDemandStatus;
  expectedCustomers: number | null;
  notes: string | null;
  submittedAt: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewRemarks?: string | null;
  items: EventBranchDemandItem[];
}

export interface SaveEventDemandItemInput {
  productId: string;
  qty: number;
  remarks?: string;
}

export interface SaveEventDemandInput {
  items: SaveEventDemandItemInput[];
  expectedCustomers?: number | null;
  notes?: string;
}

/** Production's dashboard/stats view of Special Events — `GET /special-events/summary`. */
export interface EventDashboardSummary {
  upcomingEvents: number;
  activeEvents: number;
  branchesSubmitted: number;
  branchesPending: number;
  notificationsSent: number;
  notificationsPending: number;
  nextEvent: {
    id: string;
    name: string;
    eventDate: string | null;
    daysRemaining: number | null;
    readinessPercentage: number;
  } | null;
}

/** One product's roll-up across every branch's demand for an event — what Production plans against. */
export interface ConsolidatedDemandRow {
  productId: string | null;
  productName: string;
  requestedQty: number;
  approvedQty: number;
  branchCount: number;
  estimatedValue: number;
}

/** The four manual preparation stages — no BOM/raw-materials table exists to derive them. */
export type EventProductionStage = 'raw_materials' | 'packing_materials' | 'finished_products' | 'staff_assigned';

export const EVENT_STAGE_LABELS: Record<EventProductionStage, string> = {
  raw_materials: 'Raw Materials',
  packing_materials: 'Packing Materials',
  finished_products: 'Finished Products',
  staff_assigned: 'Staff Assigned',
};

export const EVENT_STAGES: readonly EventProductionStage[] = [
  'raw_materials',
  'packing_materials',
  'finished_products',
  'staff_assigned',
];

export interface EventProductionStatusRow {
  id: string;
  eventId: string;
  stage: EventProductionStage;
  completionPercentage: number;
  remarks: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
}

export interface ReviewEventDemandInput {
  status: 'approved' | 'rejected';
  approvedItems?: { productId: string; approvedQty: number }[];
  remarks?: string;
}

export interface UpdateEventStageInput {
  completionPercentage: number;
  remarks?: string;
}

// ─── Branch Closing ─────────────────────────────────────────────────────────
// `/api/branch-closing` — one business date's reconciliation. Added alongside
// this screen: previously only `/branch-closing/export` (a file) existed. The
// server composes this from `computeClosingTotals` (shared with the export) —
// never reconstructed client-side. The per-product stock table is NOT part of
// this response; it reuses `GET /api/stock?date=` (`useStock`), which already
// serves exactly that shape.

export interface BranchClosingPaymentMethodTotal {
  method: PaymentMethod;
  orderCount: number;
  amount: number;
}

export interface BranchClosingExpenseCategoryTotal {
  category: string;
  amount: number;
}

/** Mirrors the backend's `ClosingTotals` (`shared/utils/closing.ts`) field-for-field. */
export interface ClosingTotals {
  sales: number;
  discounts: number;
  expenses: number;
  net: number;
  orderCount: number;
  cancelled: number;
  cashSales: number;
  cashExpenses: number;
  cashInHand: number;
}

export interface BranchClosingSummary {
  date: string;
  branchId: string;
  branchName: string;
  totals: ClosingTotals;
  paymentMethods: BranchClosingPaymentMethodTotal[];
  expenseCategories: BranchClosingExpenseCategoryTotal[];
}

// ─── Daily Sale Record / Manual Feed ────────────────────────────────────────
// `/api/daily-sale-records` — the branch's own counted-cash reconciliation,
// distinct from Branch Closing above (that one reads the ledger's own totals;
// this one is what the branch physically counted against them).

export type DailySaleRecordStatus = 'open' | 'pending_verification' | 'verified' | 'locked' | 'amended';

export interface DailySaleRecord {
  id: string | null;
  branchId: string;
  branchName: string;
  businessDate: string;
  autoTotalSale: number;
  companySharePct: number;
  companyShare: number;
  autoCash: number;
  autoEasypaisa: number;
  autoFoodpanda: number;
  autoBank: number;
  autoOther: number;
  autoStaff: number;
  discount: number;
  cashExpense: number;
  expenseTotal: number;
  orderCount: number;
  generatedAt: string;
  manualCash: number | null;
  manualEasypaisa: number | null;
  manualBank: number | null;
  fedBy: string | null;
  fedByName: string | null;
  fedAt: string | null;
  cashDifference: number | null;
  easypaisaDifference: number | null;
  bankDifference: number | null;
  overallDifference: number;
  paymentTotal: number;
  expectedCashInHand: number;
  status: DailySaleRecordStatus;
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
}

export interface PaymentMethodLock {
  paymentMethod: PaymentMethod;
  isLocked: boolean;
  source: 'default' | 'configured';
  reason: string | null;
}

export interface DailySaleSummary {
  totalSale: number;
  cash: number;
  easypaisa: number;
  foodpanda: number;
  bank: number;
  cashExpense: number;
  discount: number;
  difference: number;
  uncounted: number;
}

export interface DailySaleRecordList {
  from: string;
  to: string;
  records: DailySaleRecord[];
  summary: DailySaleSummary;
  locks: PaymentMethodLock[];
}

export interface DailySaleRecordDetail {
  record: DailySaleRecord;
  locks: PaymentMethodLock[];
}

export interface FeedDailySaleRecordInput {
  businessDate: string;
  cash?: number;
  easypaisa?: number;
  bank?: number;
}

// ─── Reports → Packing usage ────────────────────────────────────────────────
// `/api/reports/packing-usage` — Reports (23) Packing tab. Trend and Top
// Products tabs reuse `GET /sales-analytics`, already consumed by the dashboard.

export interface PackingUsageRow {
  date: string;
  branchId: string;
  branchName: string;
  packingMaterialId: string | null;
  materialName: string;
  requestedQty: number;
  approvedQty: number;
  deliveredQty: number;
}

export interface PackingUsageResponse {
  usage: PackingUsageRow[];
  totals: { requested: number; approved: number; delivered: number };
  from: string;
  to: string;
  total: number;
  capped: boolean;
}

// ─── Help Desk / New Query ──────────────────────────────────────────────────
// `/api/support` — a branch_manager may raise and read its own queries only.
// Resolve/reject/figures edits are admin-only, explicitly out of scope here.

export type SupportReferenceType = 'sale' | 'demand' | 'expense' | 'stock' | 'cash_transfer' | 'system';
export type SupportTicketStatus = 'open' | 'resolved' | 'rejected';

export interface SupportDetailField {
  label: string;
  value: string;
}

export interface SupportReference {
  type: SupportReferenceType;
  referenceId: string;
  title: string;
  fields: SupportDetailField[];
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  referenceType: SupportReferenceType;
  referenceId: string;
  referenceSnapshot: SupportReference | null;
  message: string;
  status: SupportTicketStatus;
  resolutionNote: string | null;
  branchName: string | null;
  raisedByName: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface SupportTicketListResponse {
  tickets: SupportTicket[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Production stock (the central production pool) ────────────────────────
// `/api/production-stock` — production_user/super_admin only.

export type ProductionStockStatus = 'healthy' | 'low' | 'out' | 'shortage';

export interface ProductionStockRow {
  productId: string;
  stockCode: string;
  productName: string;
  categoryId: string | null;
  categoryName: string | null;
  status: ProductionStockStatus;
  opening: number;
  preparedToday: number;
  totalStock: number;
  branchDemand: number;
  demandFulfilled: number;
  soldToday: number;
  /** Units transferred in from Branch Return Stock on the day. */
  returnTransferIn: number;
  /** Legacy: pre-migration-139 days only — always 0 on current days. */
  returned: number;
  adjustment: number;
  balance: number;
  available: number;
}

export interface ProductionStockListResponse {
  rows: ProductionStockRow[];
  date: string;
}

// ── Today's Prepared Products (`POST /production-stock/prepare`) ───────────

export interface PrepareProductionItemInput {
  productId: string;
  qty: number;
}

export interface PrepareProductionInput {
  items: PrepareProductionItemInput[];
}

export interface PrepareProductionResult {
  id: string;
  count: number;
}

// ── Production stock adjustment (`POST /production-stock/adjustment`) ──────
// A signed correction — never a balance edit. See the backend schema's own
// comment: a reason is mandatory, and the server re-checks it is non-empty.

export const PRODUCTION_ADJUSTMENT_TYPES = [
  'damage',
  'expired',
  'count_correction',
  'production_correction',
  'data_correction',
  'other',
] as const;

export type ProductionAdjustmentType = (typeof PRODUCTION_ADJUSTMENT_TYPES)[number];

export const PRODUCTION_ADJUSTMENT_LABELS: Record<ProductionAdjustmentType, string> = {
  damage: 'Damage',
  expired: 'Expired product',
  count_correction: 'Counting correction',
  production_correction: 'Production correction',
  data_correction: 'Data correction',
  other: 'Other authorised adjustment',
};

export interface CreateProductionAdjustmentInput {
  productId: string;
  adjustmentType: ProductionAdjustmentType;
  /** SIGNED and non-zero. Positive adds to the pool, negative takes from it. */
  qty: number;
  reason: string;
  remarks?: string;
  approvedBy?: string;
}

export interface ProductionAdjustmentResult {
  before: number;
  after: number;
  delta: number;
  duplicate: boolean;
}

// ─── Production order review (production_user's half of `/production-orders`) ──

export interface ApprovedItemInput {
  productId: string;
  approvedQty: number;
}

export interface ApprovedPackingItemInput {
  packingMaterialId: string;
  approvedQty: number;
}

export interface ReviewProductionOrderInput {
  status: 'awaiting_verification' | 'rejected';
  approvedItems?: ApprovedItemInput[];
  approvedPackingItems?: ApprovedPackingItemInput[];
  reason?: string;
}

// ─── Branches (read-only — `GET /api/branches`, all authenticated roles) ───
// A lean subset: Production's return picker only needs id/name, so that's all
// that is typed here, not the full admin `Branch` shape.

export interface BranchSummary {
  id: string;
  name: string;
}

export interface BranchListResponse {
  branches: BranchSummary[];
}

// ─── Production returns (`/api/production-returns`) ────────────────────────
// Production's review queue for a branch's incoming return, PLUS its own
// record of a return it received directly (no branch screen involved). NOT
// the same table as the Branch app's Return Items/Return Stock
// (`/api/stock/return`) — see `source` below for how the two relate.

export type ProductionReturnStatus = 'pending' | 'accepted' | 'rejected' | 'returned';

export interface ProductionReturn {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  qty: number;
  reason: string;
  status: ProductionReturnStatus;
  /**
   * 'branch' — raised by the branch (`POST /stock/return`); the branch balance
   * is already debited and waiting on this review. `null` — Production
   * recorded it directly; nothing has moved yet, so accepting here moves BOTH
   * the branch and Return Stock balances. Decides which review actions are
   * valid: 'returned' (send back) only exists on a 'branch' row.
   */
  source: 'branch' | null;
  date: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  photo?: Attachment | null;
}

export interface ProductionReturnListResponse {
  returns: ProductionReturn[];
  total: number;
}

export interface CreateProductionReturnInput {
  branchId: string;
  productId: string;
  qty: number;
  reason: string;
}

export type ProductionReturnDisposition = 'saleable' | 'damaged' | 'expired';

export interface ReviewProductionReturnInput {
  status: 'accepted' | 'rejected' | 'returned';
  /** Only meaningful when accepting — a rejected/sent-back return moves no stock. */
  disposition?: ProductionReturnDisposition;
  /** Required when `disposition` is 'damaged' or 'expired' — writing stock off has to say why. */
  dispositionNote?: string;
}

// ─── Finance (mobile-finance-plan.md) ──────────────────────────────────────
// Four roles (`finance_admin`/`finance_manager`/`accountant`/`finance_auditor`,
// already part of `UserRole` above), gated by `requireFinance(permission)` — NOT
// a plain role check. `financeCan` below mirrors the backend's own function
// (`backend/src/shared/types/finance.types.ts`) for client-side UI gating only;
// the server enforces this regardless of what the client shows or hides.

export type FinanceRole = 'finance_admin' | 'finance_manager' | 'accountant' | 'finance_auditor';
export type FinancePermission = 'view' | 'create' | 'approve' | 'adjust' | 'configure';

export const FINANCE_ROLE_LABELS: Record<FinanceRole, string> = {
  finance_admin: 'Finance Admin',
  finance_manager: 'Finance Manager',
  accountant: 'Accountant',
  finance_auditor: 'Read Only Auditor',
};

const FINANCE_ROLE_PERMISSIONS: Record<FinanceRole, readonly FinancePermission[]> = {
  finance_admin: ['view', 'create', 'approve', 'adjust', 'configure'],
  finance_manager: ['view', 'create', 'approve'],
  accountant: ['view', 'create'],
  finance_auditor: ['view'],
};

function isFinanceRole(role: unknown): role is FinanceRole {
  return role === 'finance_admin' || role === 'finance_manager' || role === 'accountant' || role === 'finance_auditor';
}

/** Mirrors the backend's `requireFinance(permission)` gate — for showing/hiding actions only, never trusted in place of it. */
export function financeCan(role: UserRole | null | undefined, permission: FinancePermission, allowSuperAdminWrite = false): boolean {
  if (role === 'super_admin') return permission === 'view' || allowSuperAdminWrite;
  if (!isFinanceRole(role)) return false;
  return FINANCE_ROLE_PERMISSIONS[role].includes(permission);
}

export type FinanceAccount = 'cash' | 'bank';
export const FINANCE_ACCOUNT_LABELS: Record<FinanceAccount, string> = { cash: 'Cash in Hand', bank: 'Bank' };

export type FinancePaymentMethod = 'cash' | 'easypaisa' | 'bank_transfer' | 'cheque' | 'foodpanda' | 'online' | 'other';

export const FINANCE_PAYMENT_METHODS: readonly FinancePaymentMethod[] = ['cash', 'easypaisa', 'bank_transfer', 'cheque', 'foodpanda', 'online', 'other'];

export const FINANCE_PAYMENT_METHOD_LABELS: Record<FinancePaymentMethod, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  foodpanda: 'Foodpanda',
  online: 'Online',
  other: 'Other',
};

export type LedgerHeadType = 'income' | 'expense';

export type FinanceDocStatus = 'draft' | 'pending_approval' | 'approved' | 'posted' | 'locked' | 'rejected';
/** The one rule every document list/detail screen enforces identically: an edit action only renders in these two statuses. */
export const EDITABLE_DOC_STATUSES: readonly FinanceDocStatus[] = ['draft', 'rejected'];

export type LedgerEntryStatus = 'posted' | 'locked' | 'reversed';

export type LedgerSourceType =
  | 'opening'
  | 'manual'
  | 'branch_income'
  | 'company_share'
  | 'branch_share'
  | 'salary'
  | 'employee_advance'
  | 'partner_expense'
  | 'adjustment'
  | 'branch_share_payout'
  | 'branch_share_bonus'
  | 'vendor_payment'
  | 'cash_transfer';

/** What every approval across the module ultimately posts — one shape, whichever document raised it. */
export interface LedgerEntry {
  id: string;
  voucherNo: string;
  seq: number;
  entryDate: string;
  ledgerHeadId: string | null;
  ledgerHeadName: string;
  ledgerHeadType: LedgerHeadType;
  branchId: string | null;
  branchName: string | null;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  account: FinanceAccount;
  paymentMethod: string | null;
  status: LedgerEntryStatus;
  sourceType: LedgerSourceType;
  sourceId: string | null;
  reversesEntryId: string | null;
  reversedByEntryId: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  createdBy: string | null;
  createdByName: string | null;
  postedAt: string;
  updatedAt?: string | null;
  updatedByName?: string | null;
  attachments?: Attachment[];
}

/** `GET /finance/dashboard` — today's composite, plus a trailing trend. */
export interface FinanceDashboard {
  businessDate: string;
  todayIncome: number;
  todayExpenses: number;
  netCashBalance: number;
  companyShare: number;
  branchShare: number;
  pendingIncomeApprovals: number;
  pendingIncomeAmount: number;
  pendingExpenseApprovals: number;
  pendingExpenseAmount: number;
  bankBalance: number;
  cashInHand: number;
  recentEntries: LedgerEntry[];
  trend: { businessDate: string; income: number; expenses: number; net: number }[];
}

export type FinancePendingApprovalKind = 'transaction' | 'partner_expense' | 'salary' | 'advance';

/** The documents behind the dashboard's "pending approval" figure, as rows — `GET /finance/pending-approvals`. */
export interface FinancePendingApproval {
  kind: FinancePendingApprovalKind;
  id: string;
  refNo: string;
  date: string;
  description: string;
  amount: number;
  status: FinanceDocStatus;
  raisedBy: string | null;
}

export type ShareBasis = 'gross' | 'net';

/** `GET /finance/settings` — this is where `allowSuperAdminWrite` itself lives. */
export interface FinanceSettings {
  companySharePct: number;
  branchSharePct: number;
  shareBasis: ShareBasis;
  openingCashBalance: number;
  openingBankBalance: number;
  openingBalanceDate: string | null;
  autoImportBranchIncome: boolean;
  requireAdminVerification: boolean;
  allowSuperAdminWrite: boolean;
  updatedAt: string;
  updatedBy: string;
}

// ─── Finance: Daily Ledger (screen 02) ──────────────────────────────────────
// `/api/finance/ledger` — strictly read-only from the UI's point of view; a
// correction is one of the three `adjust`-gated actions below, never a plain edit.

export interface LedgerQuery {
  from?: string;
  to?: string;
  branchId?: string;
  ledgerHeadId?: string;
  type?: LedgerHeadType;
  account?: FinanceAccount;
  status?: LedgerEntryStatus;
  sourceType?: LedgerSourceType;
  voucherNo?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

export interface LedgerPage {
  entries: LedgerEntry[];
  total: number;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
}

export interface LedgerSummary {
  businessDate: string;
  monthStart: string;
  openingBalance: number;
  totalReceived: number;
  totalExpense: number;
  balance: number;
}

/** `adjust` permission only — reverses, and optionally re-posts corrected. */
export interface AdjustLedgerEntryInput {
  reason: string;
  correctedAmount?: number;
  correctedDescription?: string;
}

export interface EditLedgerEntryChanges {
  amount?: number;
  entryDate?: string;
  ledgerHeadId?: string;
  branchId?: string;
  paymentMethod?: string;
  account?: FinanceAccount;
  description?: string;
}

/** `adjust` permission — edits the SAME voucher in place (no reversal, no new entry). */
export interface EditLedgerEntryInput {
  reason: string;
  changes: EditLedgerEntryChanges;
  expected?: Partial<Record<keyof EditLedgerEntryChanges, string>>;
}

// ─── Finance: Ledger Heads (screens 16–17) ──────────────────────────────────

export interface LedgerHead {
  id: string;
  code: string;
  name: string;
  type: LedgerHeadType;
  description: string | null;
  groupName: string | null;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLedgerHeadInput {
  code: string;
  name: string;
  type: LedgerHeadType;
  description?: string | null;
  groupName?: string | null;
  sortOrder?: number;
}

export interface UpdateLedgerHeadInput {
  name?: string;
  description?: string | null;
  groupName?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

// ─── Finance: Daily Closing (screen 18) ─────────────────────────────────────

export interface FinanceDayClosing {
  businessDate: string;
  openingBalance: number;
  openingCash: number;
  openingBank: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  cashInHand: number;
  bankBalance: number;
  closingBalance: number;
  entryCount: number;
  status: 'open' | 'closed';
  closedBy: string | null;
  closedByName: string | null;
  closedAt: string | null;
}

// ─── Finance: Reports (screen 19) ───────────────────────────────────────────
// One shape for all ten reports — the screen is a single generic viewer driven
// by `type`, not ten bespoke ones.

export const FINANCE_REPORT_TYPES = [
  'daily_cash_book',
  'general_ledger',
  'income_statement',
  'expense_report',
  'profit_loss',
  'company_share',
  'branch_share',
  'salary',
  'partner_expense',
  'trial_balance',
] as const;
export type FinanceReportType = (typeof FINANCE_REPORT_TYPES)[number];

export const FINANCE_REPORT_LABELS: Record<FinanceReportType, string> = {
  daily_cash_book: 'Daily Cash Book',
  general_ledger: 'General Ledger',
  income_statement: 'Income Statement',
  expense_report: 'Expense Report',
  profit_loss: 'Profit & Loss',
  company_share: 'Company Share Report',
  branch_share: 'Branch Share Report',
  salary: 'Salary Report',
  partner_expense: 'Partner Expense Report',
  trial_balance: 'Trial Balance',
};

export type ReportCellFormat = 'text' | 'money' | 'number' | 'date';

export interface FinanceReportColumn {
  key: string;
  label: string;
  format?: ReportCellFormat;
  align?: 'left' | 'right' | 'center';
  width?: number;
}

export interface FinanceReportQuery {
  type: FinanceReportType;
  from?: string;
  to?: string;
  branchId?: string;
  ledgerHeadId?: string;
  partnerName?: string;
  employeeId?: string;
  department?: string;
  salaryMonth?: string;
}

export interface FinanceReport {
  type: FinanceReportType;
  title: string;
  subtitle: string;
  periodFrom: string;
  periodTo: string;
  generatedAt: string;
  generatedBy: string;
  columns: FinanceReportColumn[];
  rows: Record<string, string | number | null>[];
  totals: Record<string, number>;
  summary: { label: string; value: number; format?: ReportCellFormat }[];
  pagination?: { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean; hasPrevious: boolean };
}

// ─── Finance: Audit Trail (screen 20) ───────────────────────────────────────

export type FinanceAuditAction =
  | 'created' | 'updated' | 'submitted' | 'verified' | 'approved' | 'rejected'
  | 'posted' | 'reversed' | 'adjusted' | 'locked' | 'imported' | 'settings_updated'
  | 'salary_revised' | 'resigned' | 'resignation_cancelled' | 'resolved'
  | 'reopened' | 'reopen_requested' | 'deleted' | 'amended' | 'restored' | 'recreated';

export type FinanceAuditEntity =
  | 'ledger_entry' | 'ledger_head' | 'finance_transaction' | 'income_approval'
  | 'salary_payment' | 'employee_advance' | 'partner_expense' | 'employee'
  | 'day_closing' | 'settings' | 'branch_share_payment' | 'finance_partner'
  | 'finance_ticket' | 'cash_transfer';

export interface FinanceAuditLog {
  id: string;
  entity: FinanceAuditEntity;
  entityId: string | null;
  entityRef: string | null;
  action: FinanceAuditAction;
  actorId: string | null;
  actorName: string;
  actorRole: string | null;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  deviceInfo: string | null;
  createdAt: string;
}

export interface FinanceAuditQuery {
  entity?: string;
  entityId?: string;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'action' | 'entity' | 'entityRef' | 'actorName';
  sortDir?: 'asc' | 'desc';
}

// ─── Finance: Income & Expense (screens 04–05) ──────────────────────────────
// `/api/finance/income/entries` — manual documents. `txnType` is NEVER
// client-sent; it is derived server-side from the chosen ledger head.

export interface FinanceTransaction {
  id: string;
  txnNo: string;
  txnType: LedgerHeadType;
  ledgerHeadId: string;
  ledgerHeadName: string;
  branchId: string | null;
  branchName: string | null;
  description: string;
  amount: number;
  paymentMethod: string;
  account: FinanceAccount;
  businessDate: string;
  status: FinanceDocStatus;
  referenceNo: string | null;
  notes: string | null;
  createdBy: string | null;
  createdByName: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  ledgerEntryId: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
}

export type FinanceTransactionSortKey = 'txnNo' | 'businessDate' | 'ledgerHeadName' | 'description' | 'branchName' | 'notes' | 'amount' | 'paymentMethod' | 'status';

export interface FinanceTransactionQuery {
  status?: FinanceDocStatus | 'pending';
  type?: LedgerHeadType;
  branchId?: string;
  ledgerHeadId?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
  sortBy?: FinanceTransactionSortKey;
  sortDir?: 'asc' | 'desc';
}

export interface CreateFinanceTransactionInput {
  ledgerHeadId: string;
  branchId?: string | null;
  description: string;
  amount: number;
  paymentMethod: FinancePaymentMethod;
  account: FinanceAccount;
  businessDate?: string;
  referenceNo?: string | null;
  notes?: string | null;
  asDraft?: boolean;
  confirmDuplicate?: boolean;
  attachmentIds: string[];
}

export type UpdateFinanceTransactionInput = Partial<Omit<CreateFinanceTransactionInput, 'asDraft' | 'confirmDuplicate' | 'attachmentIds'>>;

export interface UpdateFinanceSettingsInput {
  companySharePct?: number;
  branchSharePct?: number;
  shareBasis?: ShareBasis;
  openingCashBalance?: number;
  openingBankBalance?: number;
  openingBalanceDate?: string | null;
  autoImportBranchIncome?: boolean;
  requireAdminVerification?: boolean;
  allowSuperAdminWrite?: boolean;
}

// ─── Finance: Payroll (screens 06–11) ───────────────────────────────────────
// `finance-payroll.routes.ts`. baseSalary is NEVER directly editable — only via
// a SalaryRevision; netSalary/totalAmount are always server-computed.

export const RESIGNATION_REASONS = ['Personal reasons', 'Better opportunity', 'Relocation', 'Health', 'Further studies', 'Other'] as const;
export type EmployeeResignationStatus = 'recorded' | 'cancelled';

export interface EmployeeResignation {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  resignationDate: string;
  resignationTime: string;
  reason: string;
  remarks: string | null;
  status: EmployeeResignationStatus;
  submittedByName: string;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceEmployee {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  designation: string;
  branchId: string | null;
  branchName: string | null;
  baseSalary: number;
  pendingRevision: { newSalary: number; effectiveFrom: string; reason: string } | null;
  phone: string | null;
  joinedOn: string | null;
  isActive: boolean;
  resignation: EmployeeResignation | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryRevision {
  id: string;
  employeeId: string;
  employeeName: string;
  previousSalary: number;
  newSalary: number;
  reason: string;
  effectiveFrom: string;
  changedByName: string;
  createdAt: string;
}

export interface SalaryPayment {
  id: string;
  salaryNo: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  salaryMonth: string;
  grossSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  paymentDate: string | null;
  paymentMethod: string;
  account: FinanceAccount;
  status: FinanceDocStatus;
  notes: string | null;
  createdByName: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  ledgerEntryId: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
}

export interface EmployeeAdvance {
  id: string;
  advanceNo: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  businessDate: string;
  advanceAmount: number;
  bonusAmount: number;
  loanAmount: number;
  totalAmount: number;
  paymentMethod: string;
  account: FinanceAccount;
  status: FinanceDocStatus;
  notes: string | null;
  recoveredBySalaryId: string | null;
  recoveredBySalaryNo: string | null;
  recoveredAt: string | null;
  isRecovered: boolean;
  createdByName: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  ledgerEntryId: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
}

export interface EmployeeAdvanceSummary {
  employeeId: string;
  employeeName: string;
  totalPaid: number;
  totalRecovered: number;
  outstanding: number;
  outstandingBonus: number;
  advances: EmployeeAdvance[];
}

export interface EmployeeProfile {
  employee: FinanceEmployee;
  resignations: EmployeeResignation[];
  lastApprovedSalary: { salaryNo: string; salaryMonth: string; amount: number } | null;
  allTimeApproved: number;
}

export interface ResignationImpact {
  approvedAfter: { salaryNo: string; salaryMonth: string; amount: number }[];
  pendingAfter: { salaryNo: string; salaryMonth: string; amount: number }[];
}

export interface CreateEmployeeInput {
  name: string;
  department: string;
  designation: string;
  branchId?: string | null;
  baseSalary?: number;
  phone?: string | null;
  joinedOn?: string | null;
}

export type UpdateEmployeeInput = Partial<Omit<CreateEmployeeInput, 'baseSalary'>> & { isActive?: boolean };

export interface CreateSalaryRevisionInput {
  newSalary: number;
  reason: string;
  effectiveFrom: string;
}

export interface RecordResignationInput {
  resignationDate: string;
  resignationTime: string;
  reason: string;
  remarks?: string | null;
}

export interface CancelResignationInput {
  reason: string;
}

export interface CreateSalaryPaymentInput {
  employeeId: string;
  salaryMonth: string;
  grossSalary: number;
  bonus?: number;
  deductions?: number;
  paymentDate?: string | null;
  paymentMethod: FinancePaymentMethod;
  account: FinanceAccount;
  notes?: string | null;
  asDraft?: boolean;
  recoverAdvanceIds?: string[];
  attachmentIds: string[];
}

export interface CreateEmployeeAdvanceInput {
  employeeId: string;
  businessDate?: string;
  advanceAmount?: number;
  bonusAmount?: number;
  loanAmount?: number;
  paymentMethod: FinancePaymentMethod;
  account: FinanceAccount;
  notes?: string | null;
  asDraft?: boolean;
  attachmentIds: string[];
}

export type SalaryQueryStatus = FinanceDocStatus | 'pending';

export interface SalaryQuery {
  status?: SalaryQueryStatus;
  salaryMonth?: string;
  employeeId?: string;
  department?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AdvanceQuery {
  status?: SalaryQueryStatus;
  employeeId?: string;
  department?: string;
  from?: string;
  to?: string;
  outstandingOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// Salary Ledger (screen 11) — read-only year grid, approved payslips only.

export type LedgerCellState = 'paid' | 'unpaid' | 'none' | 'closed';

export interface LedgerCell {
  month: number;
  amount: number;
  count: number;
  state: LedgerCellState;
  flagged: boolean;
  pendingCount: number;
}

export interface LedgerYearOption {
  year: number;
  hasRecords: boolean;
}

export const SALARY_LEDGER_STATUS_FILTERS = ['all', 'active', 'resigned', 'unpaid', 'pending'] as const;
export type SalaryLedgerStatusFilter = (typeof SALARY_LEDGER_STATUS_FILTERS)[number];

export interface SalaryLedgerRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  joinedOn: string | null;
  isActive: boolean;
  resignation: EmployeeResignation | null;
  cells: LedgerCell[];
  total: number;
  unpaidMonths: number;
  flaggedMonths: number;
  hasPending: boolean;
}

export interface SalaryLedgerSummary {
  totalApproved: number;
  paymentCount: number;
  employees: number;
  activeEmployees: number;
  resignedEmployees: number;
  unpaidEmployeeMonths: number;
  flaggedMonths: number;
}

export interface SalaryLedger {
  year: number;
  currentMonth: string;
  years: LedgerYearOption[];
  departments: string[];
  summary: SalaryLedgerSummary;
  rows: SalaryLedgerRow[];
  total: number;
  page: number;
  pageSize: number;
  monthTotals: number[];
  yearTotal: number;
}

export interface SalaryLedgerQuery {
  year?: number;
  search?: string;
  department?: string;
  status?: SalaryLedgerStatusFilter;
  sort?: 'code' | 'name' | 'total';
  page?: number;
  pageSize?: number;
}

export interface SalaryLedgerPayment {
  id: string;
  salaryNo: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  salaryMonth: string;
  year: number;
  month: number;
  status: FinanceDocStatus;
  grossSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  paymentDate: string | null;
  paymentMethod: string;
  account: FinanceAccount;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  voucherNo: string | null;
  counted: boolean;
  countedAmount: number;
  afterResignation: boolean;
}

export interface SalaryLedgerPayments {
  payments: SalaryLedgerPayment[];
  total: number;
  countedTotal: number;
  countedCount: number;
}

// ─── Finance: Partners (screens 12–15) ──────────────────────────────────────
// `finance-partners.routes.ts` (mounted at `/finance/partner-expenses`) and
// `finance-branch-share.routes.ts`. The mockup's "Company Transaction Details"
// (15) is the partner ledger (`/ledger`), not Branch Share Payments — no mockup
// frame shows Branch Share Payments, so it isn't built here.

export type PartnerType = 'founder' | 'co_founder';

export interface FinancePartner {
  id: string;
  partnerCode: string;
  name: string;
  fatherName: string | null;
  dateOfBirth: string | null;
  joinedOn: string | null;
  partnerType: PartnerType | null;
  address: string | null;
  contactNumber: string | null;
  emergencyNumber: string | null;
  sharePct: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PartnerTxnKind = 'advance' | 'draw';

export interface PartnerExpense {
  id: string;
  expenseNo: string;
  partnerId: string | null;
  partnerName: string;
  txnKind: PartnerTxnKind;
  ledgerHeadId: string;
  ledgerHeadName: string;
  description: string;
  amount: number;
  paymentMethod: string;
  account: FinanceAccount;
  businessDate: string;
  status: FinanceDocStatus;
  requestedByName: string;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  ledgerEntryId: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
}

export interface PartnerShareRow {
  id: string;
  name: string;
  sharePct: number;
  sharePctAmount: number;
  advancePaid: number;
  drawPaid: number;
  balance: number;
}

export interface PartnerShareSummary {
  from: string | null;
  to: string | null;
  totalExpense: number;
  totalCompanyShare: number;
  grandTotal: number;
  ledgerBalance: number;
  partners: PartnerShareRow[];
}

export interface UpdateFinancePartnerInput {
  fatherName?: string | null;
  dateOfBirth?: string | null;
  joinedOn?: string | null;
  partnerType?: PartnerType | null;
  address?: string | null;
  contactNumber?: string | null;
  emergencyNumber?: string | null;
}

export interface CreatePartnerExpenseInput {
  partnerId: string;
  txnKind: PartnerTxnKind;
  amount: number;
  paymentMethod: FinancePaymentMethod;
  account: FinanceAccount;
  businessDate?: string;
  notes?: string | null;
  asDraft?: boolean;
  attachmentIds: string[];
}

export interface PartnerExpenseQuery {
  status?: FinanceDocStatus | 'pending';
  partnerId?: string;
  partnerName?: string;
  txnKind?: PartnerTxnKind;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Partner ledger (screen 15 "Company Transaction Details") — read-only year grid.

export interface PartnerLedgerRow {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  sharePct: number;
  isActive: boolean;
  cells: LedgerCell[];
  total: number;
  hasPending: boolean;
}

export interface PartnerLedgerSummary {
  yearTotal: number;
  transactionCount: number;
  partners: number;
  highestMonth: { month: number; amount: number } | null;
  unassigned: { count: number; amount: number };
}

export interface PartnerLedger {
  year: number;
  years: LedgerYearOption[];
  txnKind: PartnerTxnKind | null;
  summary: PartnerLedgerSummary;
  rows: PartnerLedgerRow[];
  total: number;
  page: number;
  pageSize: number;
  monthTotals: number[];
  yearTotal: number;
}

export interface PartnerLedgerQuery {
  year?: number;
  search?: string;
  txnKind?: PartnerTxnKind;
  sort?: 'code' | 'name' | 'total';
  page?: number;
  pageSize?: number;
}

export interface PartnerLedgerTransaction {
  id: string;
  expenseNo: string;
  partnerId: string | null;
  partnerCode: string | null;
  partnerName: string;
  txnKind: PartnerTxnKind;
  description: string;
  amount: number;
  businessDate: string;
  ledgerDate: string;
  year: number;
  month: number;
  status: FinanceDocStatus;
  paymentMethod: string;
  account: FinanceAccount;
  notes: string | null;
  requestedByName: string;
  createdAt: string;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  voucherNo: string | null;
  counted: boolean;
  countedAmount: number;
}

export interface PartnerLedgerTransactions {
  transactions: PartnerLedgerTransaction[];
  total: number;
  countedTotal: number;
  countedCount: number;
}

export interface PartnerLedgerTransactionsQuery {
  year?: number;
  month?: number;
  partnerId?: string;
  txnKind?: PartnerTxnKind;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── Generic API error ─────────────────────────────────────────────────────

export interface ApiError {
  /** `null` means the request never reached the server (no connection, timeout). */
  status: number | null;
  message: string;
  code?: string;
  details?: unknown;
}
