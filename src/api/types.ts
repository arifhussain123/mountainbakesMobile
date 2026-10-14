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
// the full server-side list (`attachment.types.ts`) covers finance entities
// this app never touches.

export type AttachmentEntity = 'branch_return' | 'cash_transfer';

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

// ─── Generic API error ─────────────────────────────────────────────────────

export interface ApiError {
  /** `null` means the request never reached the server (no connection, timeout). */
  status: number | null;
  message: string;
  code?: string;
  details?: unknown;
}
