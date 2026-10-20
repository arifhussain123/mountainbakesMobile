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

/** `'yearly'` and an explicit `from`/`to` (sent as `period=custom`) are additions for Branch Reports — the Dashboard only ever uses `daily`/`weekly`/`monthly`. */
export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

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
  /**
   * The four below are only sent WITHOUT `fields=basic` (Super Admin Reports,
   * `getReportSummary(..., { full: true })`). Absent means "not computed",
   * never zero — the server's own rule (`report.types.ts`).
   */
  branchData?: ReportBranchData[];
  topProducts?: ReportTopProduct[];
  categoryBreakdown?: ReportCategoryBreakdown[];
  paymentMethodBreakdown?: ReportPaymentMethodBreakdown[];
}

/** `ReportSummary.branchData` — one row per branch in the period (server `BranchSalesData`). */
export interface ReportBranchData {
  branchId: string;
  branchName: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

/** `ReportSummary.topProducts` — top 10 by revenue (server `TopProduct`). */
export interface ReportTopProduct {
  productId: string;
  productName: string;
  categoryName: string;
  totalQty: number;
  totalRevenue: number;
}

export interface ReportCategoryBreakdown {
  categoryName: string;
  totalQty: number;
  totalRevenue: number;
}

export interface ReportPaymentMethodBreakdown {
  method: string;
  total: number;
  count: number;
}

// ─── Dashboard: GET /api/sales-analytics ──────────────────────────────────

/**
 * Field names match the server's `SalesAnalyticsDay` exactly
 * (`sales-analytics.service.ts`) — this used to be typed as `{ revenue,
 * orders }`, which doesn't exist on the actual response (the server sends
 * `sales`/`transactions`). Every value read through the old names was
 * silently `undefined`, which is why the Dashboard's "Last 7 Days" card and
 * chart showed "Rs. NaN" / "undefined orders" instead of real numbers.
 */
export interface SalesAnalyticsDailyPoint {
  date: string;
  sales: number;
  transactions: number;
}

/** Field names match the server's `SalesAnalyticsProduct` exactly — see `SalesAnalyticsDailyPoint`'s note; this had the same `totalQty`/`totalRevenue` vs. `qty`/`sales` mismatch for the Top Products card. */
export interface SalesAnalyticsTopProduct {
  productId: string;
  productName: string;
  /** `''` when the product has no category — the RPC's own `coalesce(min(category_name), '')`. */
  categoryName: string;
  qty: number;
  sales: number;
}

export interface SalesAnalyticsPaymentMethod {
  method: string;
  total: number;
  count: number;
}

/**
 * Previous-period comparison — `null` (not absent) unless the request passed
 * `compare: true` and the window has days to compare (`comparisonFrom()` in
 * `sales-analytics.service.ts` returns `null` otherwise). `changePct`/`direction` are server-computed (never
 * recomputed client-side) — `changePct` is `null` when the previous period had
 * zero sales, rather than a fabricated divide-by-zero percentage.
 */
export interface SalesAnalyticsComparison {
  sales: number;
  changePct: number | null;
  direction: 'up' | 'down' | 'stable';
}

export interface SalesAnalytics {
  from: string;
  effectiveTo: string;
  todaySales: number;
  totalSales: number;
  totalTransactions: number;
  averageDailySales: number;
  highestDay: { date: string; sales: number; transactions: number } | null;
  lowestDay: { date: string; sales: number; transactions: number } | null;
  daily: SalesAnalyticsDailyPoint[];
  topProducts: SalesAnalyticsTopProduct[];
  paymentMethods: SalesAnalyticsPaymentMethod[];
  comparison: SalesAnalyticsComparison | null;
  staffCount: number;
  /** Staff (unpaid) sales total — outside `totalSales`. Sent by the server; read by the Admin Dashboard. */
  staffTotal?: number;
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

/** One product's ABSOLUTE target figures in a super admin save (`PATCH /stock/admin`). Never both `balance` and `adjustment`. */
export interface AdminStockRowEdit {
  productId: string;
  opening?: number;
  newQty?: number;
  sold?: number;
  returned?: number;
  adjustment?: number;
  balance?: number;
}

export interface AdminStockSaveInput {
  branchId: string;
  date?: string;
  /** Rides along on the notification the branch receives. ≤ 300 chars. */
  reason?: string;
  rows: AdminStockRowEdit[];
}

export type AdminStockFigures = Pick<StockRow, 'opening' | 'newQty' | 'sold' | 'returned' | 'adjustment' | 'balance'>;

/** Partial saves are possible and named: `applied: false` is a no-op (figures already matched), `failed` is every row refused and why. */
export interface AdminStockSaveResult {
  branchId: string;
  date: string;
  changedCount: number;
  saved: { productId: string; productName: string; applied: boolean; before: AdminStockFigures; after: AdminStockFigures }[];
  failed: { productId: string; productName: string; error: string }[];
}

/** `zero` corrects the balance to 0 and keeps the ledger; `purge` deletes the stock row and its whole history for that branch. */
export interface AdminStockDeleteInput {
  branchId: string;
  productId: string;
  mode: 'zero' | 'purge';
  date?: string;
  reason?: string;
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

/**
 * `GET /stock/history/branches?days=N` (super_admin) — one row per branch over
 * the window. Previous is the balance the window opened with, Remaining is
 * today's live balance; amounts are stock valued at current prices.
 */
export interface BranchStockSummaryRow {
  branchId: string;
  branchName: string;
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
  /** First business date this branch's figures cover — later than the window start when its ledger hit the read cap. */
  from: string;
  capped: boolean;
}

export interface BranchStockSummaryResponse {
  from: string;
  to: string;
  rows: BranchStockSummaryRow[];
  /** True when ANY branch's ledger was capped. */
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

/**
 * The full product row (`GET /api/products/:id`, or the list with
 * `includeSpecial=true`) — Super Admin's view, cost included. `sku` and
 * `costPrice` are nullable columns: older rows and the hidden Special Order
 * products carry neither.
 */
export interface CatalogProduct {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  sku: string | null;
  stockCode: string;
  price: number;
  costPrice: number | null;
  description: string | null;
  isActive: boolean;
  isSpecial: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Super Admin → Products' Data Engine query (`GET /api/data/products`) — the
 * filters the web's GenericDataTable offers. `sort` is the engine's own
 * `field:direction` form over the registry's sortable fields.
 */
export interface AdminProductsQuery {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  priceMin?: number;
  priceMax?: number;
  sort?: string;
}

// ─── Price History (`/api/products/price/history`, super_admin only) ───────

/**
 * - `active`: applied — it became the product's price (`activatedOn`). NOT
 *   "currently in force": an applied row stays `active` after a later change
 *   replaces it.
 * - `scheduled`: future-dated, waiting for its effective date.
 * - `superseded`: a scheduled change replaced by a newer one before it applied.
 */
export type PriceChangeStatus = 'active' | 'scheduled' | 'superseded';

/** `manual` = the product's Change Price action; `import` = a Price List spreadsheet import. */
export type PriceChangeSource = 'manual' | 'import';

export interface PriceChange {
  id: string;
  /** PRC-###### */
  priceNumber: string;
  productId: string;
  /** The product's SKU as it was at the change — null when it had none. */
  productCode: string | null;
  productName: string;
  categoryName: string | null;
  oldPrice: number | null;
  newPrice: number;
  /** 'YYYY-MM-DD', business-date semantics. */
  effectiveDate: string;
  reason: string | null;
  source: PriceChangeSource;
  status: PriceChangeStatus;
  /** Per product, 1, 2, 3… */
  versionNumber: number;
  /** The account's user id. */
  changedBy: string | null;
  /** The display name at the time ("Super Admin"), not the login. */
  changedByName: string | null;
  /** ISO UTC — when it was recorded. */
  changedOn: string;
  /** ISO UTC — when it went live; null while scheduled. */
  activatedOn: string | null;
  batchId: string | null;
}

export interface PriceHistoryResponse {
  history: PriceChange[];
  total: number;
}

export type PriceHistorySortKey = 'priceNumber' | 'productName' | 'oldPrice' | 'newPrice' | 'effectiveDate' | 'changedByName' | 'changedOn' | 'status';

export interface PriceHistoryQuery {
  productId?: string;
  search?: string;
  /** Server sort (web's sortable columns); omitted = `changedOn` desc. */
  sortBy?: PriceHistorySortKey;
  sortDir?: 'asc' | 'desc';
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

/**
 * The subset of `GET /api/settings` this app reads — a single global row
 * (`gstEnabled`/`gstRate`), not per-branch or per-payment-method. The server
 * has many more settings fields; only the ones this app actually uses are
 * typed here.
 */
export interface AppSettings {
  gstEnabled: boolean;
  gstRate: number;
  // Read by Super Admin's Settings screen only. The server always sends them;
  // optional here because no other screen depends on them.
  companyName?: string;
  currency?: string;
  receiptFooter?: string;
  businessStartTime?: string;
  businessClosingTime?: string;
  orderStartTime?: string;
  orderEndTime?: string;
  autoCloseBusiness?: boolean;
  autoStockClosing?: boolean;
  closingNotificationsEnabled?: boolean;
  orderConfirmationsEnabled?: boolean;
  eventNotificationsEnabled?: boolean;
  geofencingEnabled?: boolean;
  geofenceDefaultRadiusKm?: number;
  geofenceVerifyIntervalMin?: number;
  logoUrl?: string;
  currencySymbol?: string;
  geofenceRequireHighAccuracy?: boolean;
  geofenceGpsTimeoutSec?: number;
  geofenceMaxPositionAgeSec?: number;
  updatedAt?: string;
}

/**
 * The Data Engine's paginated list wire shape (`backend/src/shared/types/data-engine.types.ts`),
 * used for the one resource the mobile app reads this way: `GET /api/data/sales`
 * — it's the authoritative, `business_date`-scoped sales count (`/api/orders`'s
 * own count is a `created_at`-window count, which disagrees with it for a sale
 * whose business date was backdated at sync time).
 */
export interface DataEnginePage<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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
  /** A special item's instruction — the server mirrors `remarks` here on `/production-orders`. */
  description?: string | null;
  /** A special item's reference photos. */
  photos?: Attachment[];
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
  /**
   * Stamped by `PUT /production-orders/:id/verify`. Gates `isVerified()`
   * (`utils/demandLines.ts`) rather than `status === 'verified'` — an order
   * approved before verification existed carries no timestamp and must not be
   * read as counted-in.
   */
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  verifiedByName?: string | null;
  /** Photos the branch attached when raising the demand. */
  demandPhotos?: Attachment[];
  /** Photos the branch attached when verifying what physically arrived. */
  verificationPhotos?: Attachment[];
}

export interface ProductionOrderListResponse {
  orders: ProductionOrder[];
  total: number;
}

export interface VerifyProductionOrderItemInput {
  productId: string;
  verifiedQty: number;
}

export interface VerifyProductionOrderNewItemInput {
  productId: string;
  qty: number;
}

export interface VerifyProductionOrderInput {
  verifiedItems: VerifyProductionOrderItemInput[];
  newItems: VerifyProductionOrderNewItemInput[];
  attachmentIds: string[];
}

export interface CancelProductionOrderInput {
  reason: string;
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

// ─── Previous order balance (mountainbakesProduction.html screen 03 — "Previous
// Order Balance" + "Returned since last order") ────────────────────────────
// `GET /production-orders/:id/previous-balance` — what the branch owes for the
// delivery immediately before this one, and what came back since. Mirrors
// `backend/src/services/previous-balance.service.ts`'s `PreviousOrderBalance`
// field-for-field — a display statement, not a live ledger (see that file's
// own comment: it reports the same figure on every reprint).
export interface PreviousOrderBalanceItem {
  productName: string;
  qty: number;
  amount: number;
}

export interface PreviousOrderBalanceDiscountItem {
  demandNumber: string;
  amount: number;
}

export interface PreviousOrderBalancePaymentItem {
  transferId: string;
  amount: number;
  [key: string]: unknown;
}

export interface PreviousOrderBalance {
  previous: { demandNumber: string; date: string } | null;
  orderedValue: number;
  deliveredValue: number;
  companySharePct: number;
  companyShareValue: number;
  returnsValue: number;
  returnItems: PreviousOrderBalanceItem[];
  discountsValue: number;
  discountItems: PreviousOrderBalanceDiscountItem[];
  amountToCollect: number;
  paymentsReceivedValue: number;
  paymentItems: PreviousOrderBalancePaymentItem[];
  remainingBalance: number;
}

// ─── Special Orders (mountainbakesProduction.html screen 02 — "Special
// Orders": a branch's one-off, sent straight to Production, NOT a demand line
// and never counted in it) ───────────────────────────────────────────────────
// `GET/PUT /api/special-orders` — its own resource (`special_orders` /
// `special_order_items` tables, migration 143), distinct from
// `production_orders`. Mirrors `backend/src/routes/special-orders.routes.ts`.

export type SpecialOrderStatus = 'pending' | 'awaiting_verification' | 'verified' | 'approved';

export interface SpecialOrderItem {
  id: string;
  productId: string;
  itemName: string;
  qty: number;
  preparedQty: number | null;
  verifiedQty: number | null;
  amount: number;
  description: string;
  lineNo: number;
  stockMovementId: string | null;
  stockTransactionNo: string | null;
  requestPhotos?: unknown[];
}

export interface SpecialOrder {
  id: string;
  orderNumber: string;
  branchId: string;
  branchName: string;
  date: string;
  requiredDate: string | null;
  status: SpecialOrderStatus;
  items: SpecialOrderItem[];
  totalAmount: number;
  createdBy: string | null;
  createdByName: string | null;
  submittedAt: string;
  preparedBy: string | null;
  preparedByName: string | null;
  preparedAt: string | null;
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  verificationPhotos?: unknown[];
}

export interface SpecialOrderListResponse {
  orders: SpecialOrder[];
  total: number;
}

export interface PrepareSpecialOrderItemInput {
  itemId: string;
  preparedQty: number;
}

export interface PrepareSpecialOrderInput {
  items?: PrepareSpecialOrderItemInput[];
}

// ─── Production Dashboard overview (mountainbakesProduction.html screen 01)
// ────────────────────────────────────────────────────────────────────────────
// `GET /api/production/overview` — mirrors `backend/src/routes/production.routes.ts`
// field-for-field. SQL-aggregated server-side (migrations 112/140/141), never
// reduced from raw order rows on the client (CLAUDE.md §36).

export type ProductionDashboardPeriod = 'today' | 'week' | 'month';

export interface ProductionOverviewCards {
  waitingOrders: number;
  approvedOrders: number;
  deliveredOrders: number;
  changedOrders: number;
  returnedProducts: number;
  todayProduction: number;
  weeklyProduction: number;
  monthlyProduction: number;
  totalBranches: number;
  totalProducts: number;
  totalDemandQty: number;
  availableProductionStock: number;
  branchReturnStock: number;
}

export interface ProductionDemandByDay {
  date: string;
  qty: number;
  orders: number;
}

export interface ProductionDemandByMonth {
  month: string;
  qty: number;
}

export interface ProductionBranchDemand {
  branchId: string;
  branchName: string;
  qty: number;
}

export interface ProductionTopProduct {
  productId: string | null;
  productName: string;
  qty: number;
}

export interface ProductionOverviewBranch {
  branchId: string;
  branchName: string;
}

export interface ProductionKpiPair {
  cur: number;
  prev: number;
}

export interface ProductionWeekKpis {
  demand: ProductionKpiPair;
  delivered: ProductionKpiPair;
  produced: ProductionKpiPair;
  openOrders: ProductionKpiPair;
  deliveredOrders: ProductionKpiPair;
  returns: ProductionKpiPair;
}

export interface ProductionTrendPoint {
  date: string;
  demand: number;
  produced: number;
}

export interface ProductionOrderStatusCounts {
  pending: number;
  awaitingVerification: number;
  verified: number;
  approved: number;
  rejected: number;
  /** Overlaps the other counts (a changed order is also verified/approved/…) — never a share of the total. */
  changed: number;
}

export interface ProductionBranchCompare {
  branchId: string;
  branchName: string;
  demand: number;
  delivered: number;
}

export interface ProductionPlanRow {
  productId: string | null;
  productName: string;
  demand: number;
  produced: number;
  stock: number;
}

export interface ProductionHeatmapRow {
  branchId: string;
  branchName: string;
  values: number[];
}

export interface ProductionHeatmap {
  products: { productId: string | null; productName: string }[];
  rows: ProductionHeatmapRow[];
}

export interface ProductionRecentDemand {
  id: string;
  submittedAt: string;
  branchName: string;
  products: number;
  units: number;
  status: ProductionOrderStatus;
  wasChanged: boolean;
}

export interface ProductionMonthlySeriesPoint {
  month: string;
  demand: number;
  produced: number;
}

export interface ProductionHourlySeriesPoint {
  hour: string;
  demand: number;
  produced: number;
}

export interface ProductionOverviewWeek {
  period: ProductionDashboardPeriod;
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  branchId: string | null;
  kpis: ProductionWeekKpis;
  trend: ProductionTrendPoint[];
  orderStatus: ProductionOrderStatusCounts;
  branchCompare: ProductionBranchCompare[];
  plan: ProductionPlanRow[];
  heat: ProductionHeatmap;
  recent: ProductionRecentDemand[];
  monthly: ProductionMonthlySeriesPoint[];
  hourly: ProductionHourlySeriesPoint[];
}

export interface ProductionOverview {
  cards: ProductionOverviewCards;
  demandByDay: ProductionDemandByDay[];
  demandByMonth: ProductionDemandByMonth[];
  branchDemand: ProductionBranchDemand[];
  topProducts: ProductionTopProduct[];
  branches: ProductionOverviewBranch[];
  week: ProductionOverviewWeek;
}

// ─── Production Dashboard — Branch Stock matrix (mountainbakesProduction.html
// screen 09, "Branch Stock") ────────────────────────────────────────────────
// `GET /api/production/branch-stock` — Product × Branch balance matrix,
// `production_user`/`super_admin` only (NOT the same route as the
// `super_admin`-only `GET /stock/history/branches` in `stock.routes.ts`).
export interface ProductionBranchStockBranch {
  branchId: string;
  branchName: string;
}

export interface ProductionBranchStockRow {
  productId: string;
  productName: string;
  byBranch: Record<string, number>;
}

export interface ProductionBranchStockResponse {
  branches: ProductionBranchStockBranch[];
  rows: ProductionBranchStockRow[];
}

// ─── Production Reports (mountainbakesProduction.html screen 13) ──────────
// `GET /api/production-reports/summary` — its own reporting surface,
// deliberately separate from `/api/reports` (sales/financials), which refuses
// `production_user`. Ten report types sharing one generic
// title/headers/rows shape — mirrors `backend/src/routes/production-reports.routes.ts`.

export const PRODUCTION_REPORT_TYPES = [
  'production',
  'prepared-detail',
  'branch-demand',
  'approved-orders',
  'pending-balance',
  'returned-products',
  'production-stock',
  'branch-return-stock',
  'branch-stock',
  'collections',
] as const;
export type ProductionReportType = (typeof PRODUCTION_REPORT_TYPES)[number];

export const PRODUCTION_REPORT_LABELS: Record<ProductionReportType, string> = {
  production: 'Production',
  'prepared-detail': 'Prepared Detail',
  'branch-demand': 'Branch Demand',
  'approved-orders': 'Approved Orders',
  'pending-balance': 'Pending Balance',
  'returned-products': 'Returned Products',
  'production-stock': 'Production Stock',
  'branch-return-stock': 'Branch Return Stock',
  'branch-stock': 'Branch Stock',
  collections: 'Collections',
};

/** Reports driven by an explicit from/to window instead of the period dropdown — mirrors `usesDateRange` server-side. */
export const PRODUCTION_REPORT_USES_DATE_RANGE = new Set<ProductionReportType>(['prepared-detail', 'collections']);

export type ProductionReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ProductionReportPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ProductionReportSummary {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  specialRowCount?: number;
  pagination?: ProductionReportPagination;
}

export interface GetProductionReportParams {
  report: ProductionReportType;
  period?: ProductionReportPeriod;
  from?: string;
  to?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
}

// ─── Packing materials ──────────────────────────────────────────────────────

export interface PackingMaterial {
  id: string;
  materialCode: string;
  materialName: string;
  isActive: boolean;
  /** Free-text grouping — the admin catalogue shows "—" when unset. */
  category?: string | null;
  description?: string | null;
  createdAt?: string;
}

export interface PackingMaterialListResponse {
  packingMaterials: PackingMaterial[];
  total: number;
}

// ─── Attachments (photo capture) ───────────────────────────────────────────
// Extend this union only as a slice actually uploads against a new entity —
// the full server-side list (`attachment.types.ts`) covers more than this app
// touches.

export type AttachmentEntity =
  | 'branch_return'
  | 'cash_transfer'
  | 'finance_transaction'
  | 'production_order_demand'
  | 'production_order_verification';

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
  /** The photo of THIS returned product (one per line since migration 20261020000001), or null. `url` is a 1-hour signed URL. */
  photo?: Attachment | null;
  /** An older return whose ONE photo covers every product of its submission — shown with "One photo for all items (older return)". */
  legacySinglePhoto?: boolean;
  /** The product's SKU, or null where none is set. */
  productCode?: string | null;
  /** Rs. per unit — the product's price in force on `date` (a return stores none of its own). Null when no price exists. */
  unitPrice?: number | null;
  /** qty × unitPrice, rounded to the paisa; null exactly when unitPrice is. */
  amount?: number | null;
}

export interface BranchReturnListResponse {
  returns: BranchReturn[];
  total: number;
}

export interface CreateBranchReturnItemInput {
  productId: string;
  qty: number;
  /** This line's own photo (`POST /api/attachments`, entity `branch_return`). Required for every qty > 0 line; never shared between lines. */
  attachmentId?: string;
}

export interface CreateBranchReturnInput {
  items: CreateBranchReturnItemInput[];
  reason?: string;
  /**
   * @deprecated One photo for the whole return — the shape before photos went
   * per line. The server still accepts it for a single-product return only;
   * send each line's `attachmentId` instead.
   */
  attachmentIds?: string[];
  businessDate?: string;
}

// ─── Branch discounts (Request Discount / Discounts) ───────────────────────
// `/api/branch-discounts` — money claimed back against a production demand.
// MOVES NO STOCK (unlike branch returns) — no geofence. Create has no server-
// side idempotency support (confirmed: no `idempotent(...)` middleware on the
// POST route), so it requires connectivity rather than being queued for
// blind retry; revise/withdraw are naturally idempotent (PUT/DELETE converge
// to the same end state) and go through the offline write-queue.

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

/** `PUT /branch-discounts/:id` — no `productionOrderId`: re-pointing to a different demand isn't a "revision". */
export interface ReviseBranchDiscountInput {
  amount: number;
  reason: string;
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

/** `GET /api/finance/cash-transfers/summary` — the list's own filters, summed in Postgres. */
export interface FinanceCashTransferSummary {
  from: string | null;
  to: string | null;
  /** `amount` excludes fuel, as a transfer's Total does. */
  totals: { count: number; amount: number; cash: number; easypaisa: number; bank: number; fuel: number };
  pending: { count: number; amount: number };
  approved: { count: number; amount: number };
  rejected: { count: number; amount: number };
}

// Finance Daily Closing's deposit check — `GET /api/finance/daily-sales`. Each
// branch day's Company Share with the deposits the server set against it (by
// amount, else the nearest; `deposit-reconciliation.ts` server-side). Each row
// is the branch's own Daily Sale Record plus its reconciliation; the matching
// panel only reads the `FinanceDailySaleDay` subset.

export type DepositReconStatus = 'nothing_due' | 'not_received' | 'pending' | 'matched' | 'discrepancy';
export type DepositMatchKind = 'amount' | 'nearest' | 'none';

export interface BranchDayDeposit {
  id: string;
  transferNo: string;
  voucherNo: string | null;
  status: 'pending' | 'approved';
  branchId: string;
  branchName: string;
  /** The date the deposit was handed over, not the sales day it pays for. */
  businessDate: string;
  amount: number;
  cashAmount: number;
  easypaisaAmount: number;
  bankAmount: number;
}

export interface DailySaleReconciliation {
  expected: number;
  received: number;
  pending: number;
  /** Company Share − approved received. */
  difference: number;
  status: DepositReconStatus;
  match: DepositMatchKind;
  provisional: boolean;
  deposits: BranchDayDeposit[];
}

/** The fields the deposit matching reads off a branch day. */
export interface FinanceDailySaleDay {
  id: string | null;
  branchId: string;
  branchName: string;
  businessDate: string;
  status: DailySaleRecordStatus;
  autoTotalSale: number;
  companySharePct: number;
  companyShare: number;
  reconciliation: DailySaleReconciliation;
}

/** The whole row as the server sends it — what Daily Closing's Branch Sales tab shows. */
export interface FinanceDailySaleRow extends DailySaleRecord {
  reconciliation: DailySaleReconciliation;
}

/** The reconciliation over the whole window on show. */
export interface FinanceDailySaleSummary {
  expected: number;
  received: number;
  pending: number;
  difference: number;
  /** How many branch days sit in each state. */
  counts: Record<DepositReconStatus, number>;
}

export interface FinanceDailySaleList {
  from: string;
  to: string;
  records: FinanceDailySaleRow[];
  reconciliation: FinanceDailySaleSummary;
  unmatchedDeposits: BranchDayDeposit[];
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
  // Fields the server returns on every event view that the branch list never
  // read — optional so existing call sites are unaffected (Super Admin's
  // Special Events screens use them).
  /** Server-computed Hijri label for eventDate, e.g. "1 Shawwal 1447 AH". */
  hijriLabel?: string | null;
  durationDays?: number;
  preparationStartDate?: string | null;
  appliesToAllBranches?: boolean;
  /** Branch ids when appliesToAllBranches is false (detail response only). */
  branchIds?: string[];
  /** Mean of the four stage percentages, 0–100 (list + detail, not calendar). */
  readinessPercentage?: number;
  demandSummary?: EventDemandSummary;
}

/** Branch participation roll-up for one event. */
export interface EventDemandSummary {
  totalBranches: number;
  submittedBranches: number;
  pendingBranches: number;
  draftBranches: number;
  totalItems: number;
  totalQty: number;
}

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  islamic: 'Islamic',
  ahlul_bayt: 'Ahlul Bayt (A.S.)',
  national: 'National',
  international: 'International',
  company: 'Company',
};

/** Expected demand level. `critical` is the web's "Very High". */
export const EVENT_PRIORITY_LABELS: Record<EventPriority, string> = {
  low: 'Low',
  normal: 'Medium',
  high: 'High',
  critical: 'Very High',
};

export type EventNotificationStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'skipped' | 'cancelled';

/** One scheduled reminder — `GET /special-events/notifications?eventId=` (super_admin). */
export interface EventNotificationRow {
  id: string;
  eventId: string;
  audience: 'branch' | 'production' | 'admin';
  branchId: string | null;
  reminderKind: 'event_countdown' | 'demand_due' | 'preparation_start';
  offsetDays: number;
  scheduledFor: string;
  title: string;
  message: string;
  status: EventNotificationStatus;
  sentAt: string | null;
  errorMessage: string | null;
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
  submittedByName?: string | null;
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
  branchSharePct: number;
  branchShare: number;
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
  /** Sent by the server on every record; optional here because older screens never read them. */
  lockedByName?: string | null;
  lockedAt?: string | null;
  amendedAt?: string | null;
}

export interface PaymentMethodLock {
  paymentMethod: PaymentMethod;
  isLocked: boolean;
  source: 'default' | 'configured';
  reason: string | null;
  /** Who last set it — the server sends these; absent on an older echo. */
  updatedByName?: string | null;
  updatedAt?: string | null;
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
  /** `GET /daily-sale-records/:id` sends these; the write endpoints' echo may not — hence optional. */
  audits?: DailySaleAudit[];
  branch?: { id: string; name: string; address: string | null; phone: string | null; city: string | null };
}

export type DailySaleAuditAction =
  | 'generated'
  | 'refreshed'
  | 'manual_feed'
  | 'manual_feed_override'
  | 'verified'
  | 'locked'
  | 'unlocked'
  | 'amended'
  | 'method_locked'
  | 'method_unlocked';

/** One entry in a record's history. Append-only (server `DailySaleAudit`). */
export interface DailySaleAudit {
  id: string;
  recordId: string | null;
  branchId: string;
  businessDate: string;
  action: DailySaleAuditAction;
  /** Which figure moved, or 'status'. Null for whole-record actions. */
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
}

export interface FeedDailySaleRecordInput {
  businessDate: string;
  /** Super admin only — names the branch; a branch role sends none and the API reads its JWT. */
  branchId?: string;
  cash?: number;
  easypaisa?: number;
  bank?: number;
}

/** The counted figures an admin may amend on a closed record — never an auto figure. */
export type DailySaleAmendField = 'manual_cash' | 'manual_easypaisa' | 'manual_bank';

export interface AmendDailySaleRecordInput {
  field: DailySaleAmendField;
  amount: number;
  reason: string;
}

export interface SetPaymentMethodLockInput {
  branchId: string;
  paymentMethod: 'cash' | 'easypaisa' | 'foodpanda' | 'bank_account';
  isLocked: boolean;
  reason?: string;
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
  /** The page the server sliced; `totals` cover the whole filtered range regardless. */
  pagination?: { page: number; pageSize: number; total: number; totalPages: number; hasNext: boolean };
}

export type PackingUsageSortKey = 'date' | 'branchName' | 'materialName' | 'requestedQty' | 'approvedQty' | 'deliveredQty';

/** `GET /reports/packing-usage` with the web report's filters and server paging. */
export interface PackingUsageQuery {
  from: string;
  to: string;
  branchId?: string | null;
  packingMaterialId?: string | null;
  pageSize?: number;
  sortBy?: PackingUsageSortKey;
  sortDir?: 'asc' | 'desc';
}

/** `GET /data/customers` filters — the web Customers page's filter bar. */
export interface AdminCustomersQuery {
  search?: string;
  branchId?: string | null;
  ordersMin?: string;
  ordersMax?: string;
  spentMin?: string;
  spentMax?: string;
  /** `YYYY-MM-DD` business dates — the engine widens them to whole days. */
  sinceFrom?: string;
  sinceTo?: string;
  sort?: string;
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
  /** The record's own DB id — `support.routes.ts`'s `resolveReference` always sets this, but it's the actual table id, not the human reference number, so it's what "Open record" navigation needs for a detail route (`{ orderId }`/`{ transferId }`), not `referenceId`. */
  entityId?: string;
  title: string;
  fields: SupportDetailField[];
  /** Informational-only reference (counter sale, rejected deposit/demand) — nothing can be written back. */
  readOnly?: boolean;
  /** A STOCK reference describing the central production pool rather than a branch ledger. */
  isProductionPool?: boolean;
  /** Sale references only: the sale's current lines. */
  saleItems?: SupportSaleItem[];
}

/** One line of a sale reference, as the Support Center's View prints it. */
export interface SupportSaleItem {
  productId: string | null;
  productName: string;
  unitPrice: number;
  qty: number;
  discount: number;
}

/** `GET /api/support` query — the Super Admin Support Center's server-paged ops queue. */
export interface AdminSupportTicketQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  source?: 'branch' | 'production';
  sortBy?: 'ticketNumber' | 'referenceId' | 'branchName' | 'message' | 'status' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

/** `GET /api/support/stats` (super_admin) — open-ticket counts by source. */
export interface SupportStats {
  branchOpen: number;
  productionOpen: number;
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
  /** Present on every server row (`rowToApi`); optional only so client-built optimistic rows still type-check. */
  branchId?: string | null;
  raisedByRole?: string | null;
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
  /** Sent by `GET /api/branches` (which lists active branches unless asked otherwise). */
  isActive?: boolean;
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
  /** The photo of THIS returned product, or null. `url` is a 1-hour signed URL — key any cache on `photo.id`. */
  photo?: Attachment | null;
  /** An older return whose ONE photo covers every product of its submission — shown with "One photo for all items (older return)". */
  legacySinglePhoto?: boolean;
  /** The product's SKU, or null where none is set. */
  productCode?: string | null;
  /** Rs. per unit — the product's price in force on `date` (a return stores none of its own). Null when no price exists. */
  unitPrice?: number | null;
  /** qty × unitPrice, rounded to the paisa; null exactly when unitPrice is. */
  amount?: number | null;
}

export interface ProductionReturnListResponse {
  returns: ProductionReturn[];
  total: number;
}

// ─── Monthly Product Returns summary ────────────────────────────────────────
// `GET /api/production-returns/summary` (Production, every branch or one) and
// `GET /api/stock/returns/summary` (a branch, its own). Mirrors the backend's
// `shared/utils/returns-summary.ts` field-for-field; summed in Postgres, never
// reconstructed here. A "transaction" is one return row (one product, one
// status); `amount` is qty × the product's price in force on the return's
// business date, so a later price change never rewrites it.

export interface ReturnsBucket {
  qty: number;
  amount: number;
  count: number;
}

export interface ReturnsSummaryTotals {
  /** Every return this month, whatever its status. */
  submitted: ReturnsBucket;
  pending: ReturnsBucket;
  /** Approved — the only final, credited value. */
  accepted: ReturnsBucket;
  rejected: ReturnsBucket;
  /** Sent back to the branch for correction. */
  returned: ReturnsBucket;
  /** Rows with no price on record — counted in qty, left out of amount. */
  unpricedCount: number;
}

/** One product's returns this month, every status — the product lines sum to `submitted`. */
export interface ProductReturnsLine extends ReturnsBucket {
  productId: string;
  productName: string;
  productCode: string | null;
}

export interface BranchReturnsSummary extends ReturnsSummaryTotals {
  branchId: string;
  branchName: string;
  /** Item-wise, largest amount first. */
  products: ProductReturnsLine[];
}

export interface MonthlyReturnsSummary {
  /** 'YYYY-MM-01' — first day of the current business month. */
  from: string;
  /** 'YYYY-MM-DD' — today's business date, inclusive. */
  to: string;
  branches: BranchReturnsSummary[];
  totals: ReturnsSummaryTotals;
  /** Item-wise across every branch in scope, largest amount first. */
  products: ProductReturnsLine[];
  /** Branches in scope with at least one return this month. */
  branchesReporting: number;
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

// ─── Monthly Finance Dashboard ───────────────────────────────────────────────
// Verbatim from the web's `@mb/shared` finance.types.ts (FinanceMonthlyDashboard
// and friends) — `GET /finance/dashboard/monthly` and `/finance/dashboard/records`.

export interface FinanceDashboardDay {
  date: string;
  branchId: string | null;
  /** Σ approved_qty × product price over Production-reviewed orders. */
  demand: number;
  /** Demand × the branch's company share %, rounded per order. */
  companyShare: number;
  /** Live ledger income on Company Share / Fuel heads + Cash Deposit postings. */
  received: number;
  /** Accepted production returns, qty × product price. */
  returns: number;
  /** Approved production (branch) discounts. */
  discount: number;
  orders: number;
  /** Delivered lines whose product has no price — valued at 0. */
  unpricedLines: number;
  receipts: number;
  returnCount: number;
  discountCount: number;
}

export interface FinanceDashboardLedgerRow {
  date: string;
  branchId: string | null;
  ledgerHeadId: string;
  /** The head's current Admin-defined name. */
  ledgerHeadName: string;
  /** credit − debit, so a reversal nets out. */
  amount: number;
  entries: number;
}

export interface FinanceDashboardMonthTrend {
  month: string;
  demand: number;
  companyShare: number;
  received: number;
  balance: number;
  returns: number;
  discount: number;
}

/** A branch's balance for the previous business month; null = no records that month. */
export interface FinanceDashboardPreviousBalance {
  branchId: string | null;
  balance: number | null;
}

export interface FinanceMonthlyDashboardSummary {
  demand: number;
  companyShare: number;
  received: number;
  /** companyShare − received. */
  balance: number;
  /** The previous month's balance for the same scope; null when it had no records. */
  lastMonthBalance: number | null;
  ledgerExpense: number;
  returns: number;
  discount: number;
  orders: number;
  receipts: number;
  ledgerEntries: number;
  returnCount: number;
  discountCount: number;
  unpricedLines: number;
  /** finance_ledger_totals over the same window — the ledger's own totals. */
  ledgerIncome: number;
  ledgerExpenseTotal: number;
  ledgerNet: number;
}

export interface FinanceMonthlyDashboard {
  month: string;
  previousMonth: string;
  from: string;
  to: string;
  branchId: string | null;
  businessDate: string;
  generatedAt: string;
  /** Every branch (Admin names), including inactive ones that still carry history. */
  branches: { id: string; name: string; isActive: boolean }[];
  summary: FinanceMonthlyDashboardSummary;
  days: FinanceDashboardDay[];
  ledger: FinanceDashboardLedgerRow[];
  previous: FinanceDashboardPreviousBalance[];
  /** The six business months ending at `month`, whole months, oldest first. */
  trend: FinanceDashboardMonthTrend[];
}

/** `month` is `YYYY-MM`; `from`/`to` (inside that month) only when not the full month. */
export type FinanceMonthlyDashboardQuery = {
  month: string;
  from?: string;
  to?: string;
  branchId?: string;
};

export type FinanceDashboardMetric = 'demand' | 'share' | 'received' | 'ledger' | 'return' | 'discount';

export interface FinanceDashboardRecord {
  id: string;
  /** Demand number, voucher number — whatever the source calls itself. */
  reference: string | null;
  date: string;
  branchId: string | null;
  branchName: string | null;
  source: string;
  detail: string | null;
  status: string;
  amount: number;
  createdBy: string | null;
  approvedBy: string | null;
}

export interface FinanceDashboardRecordsPage {
  total: number;
  /** Sum over every matching record, not just this page. */
  amount: number;
  page: number;
  pageSize: number;
  rows: FinanceDashboardRecord[];
}

export type FinanceDashboardRecordsQuery = {
  metric: FinanceDashboardMetric;
  from: string;
  to: string;
  branchId?: string;
  /** Unassigned (no branch) rows only — overrides `branchId` on the server. */
  noBranch?: boolean;
  ledgerHeadId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

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

// ─── Finance: Help Desk (screens 21–22) ─────────────────────────────────────
// `finance-tickets.routes.ts` (mounted at `/finance/tickets`) — a SEPARATE
// ticket system from the Branch/Production Help Desk (`support.routes.ts`).
// Mobile is scoped to view/report/discuss/request-reopen only, per an explicit
// decision this session — every super_admin-only admin action (edit a query,
// amend/correct/delete the underlying financial record, restore, recreate,
// assign, change status, truly reopen) stays web-only and is not built here.

export type FinanceTicketStatus = 'draft' | 'open' | 'under_review' | 'waiting_for_finance' | 'amended' | 'reopened' | 'resolved' | 'rejected' | 'closed';

export const FINANCE_TICKET_STATUS_LABELS: Record<FinanceTicketStatus, string> = {
  draft: 'Draft',
  open: 'Pending',
  under_review: 'In Review',
  waiting_for_finance: 'Waiting Finance',
  amended: 'Amended',
  reopened: 'Reopened',
  resolved: 'Resolved',
  rejected: 'Rejected',
  closed: 'Closed',
};

export const FINANCE_QUERY_TYPES = [
  'income', 'expense', 'company_transaction', 'partner_advance', 'company_share',
  'branch_share', 'salary', 'ledger', 'payment', 'stock_finance_difference', 'other', 'calculation_issue',
] as const;
export type FinanceQueryType = (typeof FINANCE_QUERY_TYPES)[number];

export const FINANCE_QUERY_TYPE_LABELS: Record<FinanceQueryType, string> = {
  income: 'Income',
  expense: 'Expense',
  company_transaction: 'Company Transaction',
  partner_advance: 'Partner Advance',
  company_share: 'Company Share',
  branch_share: 'Branch Share',
  salary: 'Salary',
  ledger: 'Ledger',
  payment: 'Payment',
  stock_finance_difference: 'Stock/Finance Difference',
  other: 'Other',
  calculation_issue: 'Calculation Issue',
};

export const FINANCE_QUERY_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type FinanceQueryPriority = (typeof FINANCE_QUERY_PRIORITIES)[number];

export type FinanceTicketReferenceType = 'ledger_entry' | 'income_approval' | 'finance_transaction' | 'salary_payment' | 'employee_advance' | 'partner_expense' | 'branch_share_payment' | 'order' | 'cash_transfer';

export interface FinanceTicketReferenceLookup {
  referenceType: FinanceTicketReferenceType;
  referenceId: string;
  referenceNo: string;
  label: string;
  snapshot: Record<string, unknown>;
}

export interface FinanceTicketMessage {
  id: string;
  ticketId: string;
  authorName: string;
  authorSide: 'finance' | 'admin';
  body: string;
  createdAt: string;
  attachments?: Attachment[];
}

export interface FinanceTicket {
  id: string;
  queryNo: string;
  queryType: FinanceQueryType;
  priority: FinanceQueryPriority;
  referenceType: FinanceTicketReferenceType | null;
  referenceNo: string | null;
  subject: string;
  message: string;
  status: FinanceTicketStatus;
  amount: number | null;
  branchName: string | null;
  businessDate: string | null;
  remarks: string | null;
  adminResponse: string | null;
  resolutionNote: string | null;
  raisedByName: string;
  assignedToName: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  reopenReason: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  messages?: FinanceTicketMessage[];
  attachments?: Attachment[];
  /** Server columns the Super Admin Support Center reads (web FinanceHelpDeskPage). */
  raisedByRole?: string | null;
  referenceSnapshot?: Record<string, unknown> | null;
  voucherRef?: string | null;
  transactionRef?: string | null;
  expenseRef?: string | null;
  incomeRef?: string | null;
  amendCount?: number;
  reopenCount?: number;
  recreatedFromQueryNo?: string | null;
  recreatedAsQueryNo?: string | null;
  deletedAt?: string | null;
  deleteReason?: string | null;
}

export interface FinanceTicketStats {
  total: number;
  draft: number;
  open: number;
  underReview: number;
  waiting: number;
  amended: number;
  reopened: number;
  resolved: number;
  rejected: number;
  closed: number;
  highPriority: number;
  urgent: number;
  unassigned: number;
  recent: number;
  deleted: number;
}

export interface FinanceTicketQuery {
  status?: FinanceTicketStatus | 'all';
  queryType?: FinanceQueryType | 'all';
  priority?: FinanceQueryPriority | 'all';
  search?: string;
  mine?: boolean;
  page?: number;
  pageSize?: number;
  /** Admin-only Deleted view. Omit rather than send `false` — the server coerces any string to true. */
  deletedOnly?: true;
}

export interface CreateFinanceTicketInput {
  subject?: string;
  queryType?: FinanceQueryType;
  priority?: FinanceQueryPriority;
  description: string;
  amount?: number | null;
  branchId?: string | null;
  businessDate?: string | null;
  remarks?: string | null;
  referenceNo?: string | null;
  draft?: boolean;
  attachmentIds?: string[];
}

export interface FinanceTicketMessageInput {
  body: string;
  attachmentIds?: string[];
}

export interface RequestReopenFinanceTicketInput {
  reason: string;
}

// ─── Closing summary recipients (`/api/closing-notifications`, super_admin) ──

/** `both` = one SMS and one WhatsApp per report. */
export type RecipientChannel = 'whatsapp' | 'sms' | 'both';

/**
 * A central recipient: `admin` gets EVERY report (each branch's, production's
 * and the company's); `production` gets the production report only.
 */
export type RecipientDepartment = 'production' | 'admin';

/** Exactly one of `branchId` / `department` is set — the server's check constraint. */
export interface NotificationRecipient {
  id: string;
  branchId: string | null;
  branchName: string | null;
  department: RecipientDepartment | null;
  recipientName: string;
  /** E.164, e.g. +923001234567. */
  mobileNumber: string;
  channel: RecipientChannel;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateRecipientInput {
  branchId: string | null;
  department: RecipientDepartment | null;
  recipientName: string;
  mobileNumber: string;
  channel: RecipientChannel;
  active: boolean;
}

/** Scope (branch/department) cannot be changed after creation — the server's PATCH ignores it. */
export type UpdateRecipientInput = Partial<Pick<CreateRecipientInput, 'recipientName' | 'mobileNumber' | 'channel' | 'active'>>;

/**
 * One send of one report to one recipient over one channel. `sent` means the
 * provider ACCEPTED it — there are no delivery receipts. With the `log`
 * provider (test mode) it was only written to the server log.
 */
export interface NotificationLog {
  id: string;
  reportId: string | null;
  recipientId: string | null;
  businessDate: string;
  channel: 'whatsapp' | 'sms';
  status: 'pending' | 'sent' | 'failed';
  provider: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  /** Retries after the first attempt (0 = first try). */
  retryCount: number;
  sentAt: string | null;
  createdAt: string;
  recipientName: string | null;
  mobileNumber: string | null;
}

export interface NotificationLogQuery {
  businessDate?: string;
  status?: 'pending' | 'sent' | 'failed';
  channel?: 'whatsapp' | 'sms';
  recipientId?: string;
}

/** `live` is false when the server falls back to the log provider (no Twilio credentials). */
export interface MessagingProviderStatus {
  provider: string;
  live: boolean;
  retry: { maxAttempts: number; baseDelayMs: number };
}

export interface ClosingDispatchResult {
  businessDate: string;
  reportsGenerated: number;
  messagesSent: number;
  messagesFailed: number;
  skipped?: string;
}

// ─── Notifications: GET /api/notifications, POST /api/notifications/read ──
// Step 0: no unread-count or mark-all-read endpoint exists server-side — both
// are derived/driven client-side from this one feed (capped at 50, newest
// first, so "mark all" is always a single POST /read of the whole unread set).
// No push (FCM/APNs/web-push) exists server-side either — `push.service.ts`'s
// `sendPush()` is a no-op — so this is in-app only.

export type NotificationType =
  | 'order_created'
  | 'order_ready'
  | 'order_cancelled'
  | 'low_stock'
  | 'new_user'
  | 'branch_added'
  | 'price_changed'
  | 'password_reset'
  | 'production_demand'
  | 'production_reviewed'
  | 'production_return'
  | 'production_order_verified'
  | 'production_demand_cancelled'
  | 'branch_discount'
  | 'branch_discount_reviewed'
  | 'cash_transfer'
  | 'cash_transfer_reviewed'
  | 'support_query'
  | 'support_resolved'
  | 'finance_query'
  | 'finance_query_resolved'
  | 'finance_query_updated'
  | 'finance_query_message'
  | 'finance_query_amended'
  | 'event_created'
  | 'event_reminder'
  | 'event_demand_due'
  | 'event_demand_submitted'
  | 'event_demand_reviewed'
  | 'event_production_updated'
  | 'security_alert';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** The legacy per-row flag — Step 0: the feed's own `readIds` (below) is the one this app actually trusts, since a notification broadcast to a role/branch is "read" per-reader, not per-row. */
  isRead: boolean;
  targetUserId: string | null;
  targetRole: string | null;
  branchId: string | null;
  /** The record this notification is about (a demand/discount/cash-transfer/support-ticket/event's own DB id) — used for deep-linking. `null` for types with nothing to link to (e.g. `security_alert`). */
  relatedId: string | null;
  createdAt: string;
}

export interface NotificationFeedResponse {
  /** Newest first, capped at 50 server-side. */
  notifications: AppNotification[];
  /** Ids from `notifications` THIS reader has marked read — the authoritative read state (see `AppNotification.isRead`'s own note). */
  readIds: string[];
}

// ─── Generic API error ─────────────────────────────────────────────────────

export interface ApiError {
  /** `null` means the request never reached the server (no connection, timeout). */
  status: number | null;
  message: string;
  code?: string;
  details?: unknown;
}

// ─── Monthly Branch Discount summary ─────────────────────────────────────────
// GET /api/production-discounts/summary and /api/branch-discounts/summary —
// mirrors backend shared/utils/discount-summary.ts. The server sums; these are
// only its shape.

export interface DiscountBucket {
  /** Rs. claimed. */
  amount: number;
  /** Claims (rows). */
  count: number;
}

export interface DiscountSummaryTotals {
  /** Every claim raised this month, all statuses. */
  submitted: DiscountBucket;
  pending: DiscountBucket;
  /** The final, deducted figure — a box's "Total Discount". */
  approved: DiscountBucket;
  rejected: DiscountBucket;
  returned: DiscountBucket;
}

export interface BranchDiscountTotals extends DiscountSummaryTotals {
  branchId: string;
  branchName: string;
}

export interface MonthlyDiscountSummary {
  /** 'YYYY-MM-01' — first day of the current business month. */
  from: string;
  /** 'YYYY-MM-DD' — today's business date, inclusive. */
  to: string;
  /** Every active branch in scope, alphabetical, Rs. 0 where nothing was claimed. */
  branches: BranchDiscountTotals[];
  totals: DiscountSummaryTotals;
}

// ─── Monthly Cash Transfer summary ───────────────────────────────────────────
// GET /api/cash-transfers/monthly-summary — mirrors backend
// shared/utils/cash-transfer-summary.ts. The server sums; these are only its
// shape. The branch is the token's; the table's filters never apply to it.

export interface CashTransferBucket {
  /** Rs. */
  amount: number;
  /** Transfers with a non-zero amount for this figure. */
  count: number;
}

export interface CashTransferSummaryTotals {
  /** Total Amount, every status. */
  transferred: CashTransferBucket;
  cash: CashTransferBucket;
  easypaisa: CashTransferBucket;
  bank: CashTransferBucket;
  /** Total Amount Finance approved. */
  approved: CashTransferBucket;
  /** Total Amount still awaiting Finance. */
  pending: CashTransferBucket;
  /** Total Amount Finance rejected. */
  rejected: CashTransferBucket;
  /** Fuel Charges, every status — never part of Total Amount. */
  fuel: CashTransferBucket;
}

export interface MonthlyCashTransferSummary {
  /** 'YYYY-MM-01' — first day of the current business month. */
  from: string;
  /** 'YYYY-MM-DD' — today's business date, inclusive. */
  to: string;
  branchId: string;
  /** Every live transfer in the window, fuel-only ones included. */
  transfers: number;
  totals: CashTransferSummaryTotals;
}

// ─── Data Engine aggregate (`GET /api/data/:resource/aggregate`) ─────────────
// backend shared/types/data-engine.types.ts. Values are keyed `count` or
// `metric:field`, e.g. `sum:amount`.

export interface DataEngineAggregateResponse {
  rows: { group?: Record<string, string | number | boolean | null>; values: Record<string, number | null> }[];
}

// ─── Production Dashboard sections (`/api/production/dashboard/*`) ───────────
// The web's redesigned dashboard sections — backend
// shared/utils/production-dashboard.ts. Only the fields the mobile charts read
// are typed; the server sends more (kpis, previous, comparisons, sparks).

export interface ProductionBranchSummaryRow {
  branchId: string;
  branchName: string;
  demanded: number;
  delivered: number;
  returned: number;
  /** delivered ÷ demanded, %; null with no demand. */
  fulfilment: number | null;
}

/** `GET /production/dashboard/branch-summary?period=` — every active branch, highest demand first. */
export interface ProductionBranchSummarySection {
  window: { period: ProductionDashboardPeriod; from: string; to: string };
  series: ProductionBranchSummaryRow[];
}

export type ProductionStockState = 'ok' | 'low' | 'out';

export interface ProductionCurrentStockRow {
  productId: string;
  productName: string;
  /** Available in the central pool; can be negative (drawn from zero). */
  production: number;
  /** On branch shelves (one branch when filtered). */
  branch: number;
  /** What is physically there: each side counted from zero, never below. */
  total: number;
  state: ProductionStockState;
}

/** `GET /production/dashboard/current-stock?branchId=` — stock right now, largest first; no period. */
export interface ProductionCurrentStockSection {
  kpis: Record<'production' | 'branch' | 'inStock' | 'low' | 'out', number>;
  series: ProductionCurrentStockRow[];
  breakdown: { threshold: number; products: number };
  branchId: string | null;
}

// ─── Super Admin nav signals ──────────────────────────────────────────────
// `GET /api/admin/backups/health` (super_admin only). The server judges each
// type by the age of its last verified run; see the Backup monitor's Step 0
// for why that misses a skipped monthly slot.
export type BackupHealthStatus = 'healthy' | 'overdue' | 'failed' | 'never';

export interface BackupTypeHealth {
  status: BackupHealthStatus;
  lastSuccessfulAt: string | null;
  lastAttemptAt: string | null;
  ageHours: number | null;
  expectedWithinHours: number;
}

export interface BackupHealth {
  daily: BackupTypeHealth;
  weekly: BackupTypeHealth;
  monthly: BackupTypeHealth;
  recentFailures: number;
  checkedAt: string;
}

// ─── Super Admin read-only lists ────────────────────────────────────────────
// Verbatim from the server's `@mb/shared` types (customer, product, branch,
// user, login-session, backup). Every list below is super_admin's all-branch
// view; none of these routes pages except login history and backups.

/** `GET /api/customers` — no limit server-side, so the db layer caps it at 1,000 rows. */
export interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  branchId: string | null;
  branchName: string | null;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

/** `POST` / `PUT /api/customers` body — the web `CustomerForm` (`CreateCustomerInput`). */
export interface AdminCustomerInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  branchId: string;
}

/** `GET /api/products/categories` — active categories only, in `sortOrder`. */
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

/** `GET /api/branches?includeInactive=true` — the full row. */
export interface AdminBranch {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  isActive: boolean;
  /** `null` = inherits the global company share. */
  companySharePct: number | null;
  createdAt?: string;
  /** The web's Manager column — "Unassigned" when null. */
  managerName?: string | null;
  dailyBudget?: number;
  weeklyBudget?: number;
  monthlyBudget?: number;
}

export interface BranchGeofence {
  latitude: number;
  longitude: number;
  radiusKm: number;
  updatedAt?: string;
  /** Enforced (`true`) or disabled with the coordinates kept (`false`). */
  isActive: boolean;
  address?: string;
  googlePlaceId?: string | null;
}

export interface BranchLocationRow {
  branchId: string;
  branchName: string;
  branchAddress: string;
  branchIsActive: boolean;
  location: BranchGeofence | null;
}

export interface BranchLocationsResponse {
  branches: BranchLocationRow[];
  stats: {
    totalBranches: number;
    activeBranches: number;
    gpsConfigured: number;
    missingGps: number;
    onlineUsers: number;
    usersOutsideRadius: number;
  };
  geofencingEnabled: boolean;
}

export type AdminUserStatus = 'active' | 'inactive' | 'suspended';

/** `GET /api/users` — super_admin only, newest first. */
export interface AdminUser {
  id: string;
  userCode: string | null;
  email: string;
  displayName: string | null;
  phone: string | null;
  username: string | null;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
  status: AdminUserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  // Sent by `GET /api/data/users` (the row is `select *`); read by the User details sheet.
  lastPasswordReset?: string | null;
  passwordResetByName?: string | null;
  mustChangePassword?: boolean;
}

/** One `GET /api/login-history` row — the fields the Security list shows. */
export interface LoginSessionRow {
  id: string;
  userCode: string | null;
  userEmail: string;
  userName: string;
  userRole: UserRole | null;
  branchName: string | null;
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  country: string | null;
  city: string | null;
  loginAt: string;
  isSuspicious: boolean;
  // Sent by the same route; read by the Admin Dashboard's Login History card.
  /** The Google account the session was signed in with; null for a password login. */
  browserEmail?: string | null;
  browserVersion?: string | null;
  osVersion?: string | null;
  deviceName?: string | null;
  /** Neighbourhood, only when the device sent its position. */
  area?: string | null;
  state?: 'active' | 'idle' | 'ended' | 'expired' | 'revoked';
  loginStatus?: 'SUCCESS';
  durationMs?: number;
}

/** `GET /api/login-history` filters the Admin Dashboard's Login History card sends. */
export interface LoginHistoryQuery {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  /** Business dates, inclusive. */
  from?: string;
  to?: string;
}

/** `GET /api/data/orders/aggregate` grouped by branch — paid sales per branch for a period. */
export interface BranchSalesGroup {
  branchId: string;
  branchName: string;
  sales: number;
  orders: number;
}

export interface LoginSessionPage {
  sessions: LoginSessionRow[];
  total: number;
  page: number;
}

export type BackupJobType = 'daily' | 'weekly' | 'monthly' | 'manual';
export type BackupJobStatus = 'running' | 'success' | 'verified' | 'failed' | 'stale';

/** `GET /api/admin/backups/history` — the fields the Backup screen shows. */
export interface BackupJob {
  id: string;
  backupId: string;
  backupType: BackupJobType;
  status: BackupJobStatus;
  trigger: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  fileSize: number | null;
  errorMessage: string | null;
  triggeredByName: string | null;
  // The rest of the row (`backup.types.ts`), read by Database Backup's cards and detail sheet.
  environment?: string;
  appVersion?: string | null;
  databaseVersion?: string | null;
  pgDumpVersion?: string | null;
  dumpMs?: number | null;
  uploadMs?: number | null;
  s3Bucket?: string;
  s3Key?: string | null;
  authS3Key?: string | null;
  manifestS3Key?: string | null;
  authFileSize?: number | null;
  checksumSha256?: string | null;
  authChecksumSha256?: string | null;
  retentionUntil?: string | null;
  attempts?: number;
  errorCategory?: string | null;
  lastVerifiedAt?: string | null;
}

export interface BackupHistoryPage {
  jobs: BackupJob[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Super Admin: Users, Security, Database Backup, Restriction Rules ───────
// Verbatim from the server's `@mb/shared` types (audit, login-session, backup,
// restriction). Read-only on mobile this phase.

/** `GET /api/data/users` filters (Data Engine wire format is built by the service). */
export interface UsersDataQuery {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  status?: AdminUserStatus;
  branchId?: string;
  /** Last-login window, business dates inclusive. */
  lastLoginFrom?: string;
  lastLoginTo?: string;
}

/** `GET /api/users/activity` — one audit row. */
export interface UserAuditLog {
  id: string;
  action: string;
  adminId: string;
  adminName: string;
  targetUserId: string | null;
  targetUserName: string | null;
  targetUserRole: string | null;
  details: string | null;
  createdAt: string;
}

export type SessionState = 'active' | 'idle' | 'ended' | 'expired' | 'revoked';
export type SessionDeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
export type SessionLocationSource = 'IP' | 'DEVICE_GPS' | 'UNKNOWN';

/** One `login_sessions` row as `/api/login-history*` sends it (`LoginSession` in `@mb/shared`). */
export interface SecuritySession {
  id: string;
  userId: string | null;
  userCode: string | null;
  userEmail: string;
  browserEmail: string | null;
  emailMasked: boolean;
  userName: string;
  userRole: UserRole | null;
  branchId: string | null;
  branchName: string | null;
  authSessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: SessionDeviceType | null;
  deviceName: string | null;
  screenSize: string | null;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  area: string | null;
  timezone: string | null;
  locationSource: SessionLocationSource;
  latitude: number | null;
  longitude: number | null;
  loginAt: string;
  lastSeenAt: string;
  endedAt: string | null;
  revokedAt: string | null;
  revokedByName: string | null;
  revokeReason: string | null;
  isSuspicious: boolean;
  suspiciousReason: string | null;
  /** Business date of the login. */
  date: string;
  state: SessionState;
  loginStatus: 'SUCCESS';
  durationMs: number;
  canRevoke: boolean;
}

export type SecuritySessionSortKey = 'loginAt' | 'userName' | 'browserEmail' | 'city' | 'country' | 'browser' | 'browserVersion' | 'os' | 'deviceType' | 'ipAddress';

/** Every filter `GET /api/login-history` takes (the Security screen's Login History tab). */
export interface SecuritySessionQuery {
  page: number;
  pageSize: number;
  search?: string;
  state?: SessionState;
  country?: string;
  /** Business dates, inclusive. */
  from?: string;
  to?: string;
  suspiciousOnly?: boolean;
  branchId?: string;
  role?: string;
  city?: string;
  browser?: string;
  deviceType?: SessionDeviceType;
  sortBy?: SecuritySessionSortKey;
  sortDir?: 'asc' | 'desc';
}

export interface SecuritySessionPage {
  sessions: SecuritySession[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActiveSessionGroup {
  userId: string | null;
  userCode: string | null;
  userName: string;
  userEmail: string;
  emailMasked: boolean;
  userRole: UserRole | null;
  branchName: string | null;
  sessions: SecuritySession[];
  sessionCount: number;
  countries: string[];
  multiCountry: boolean;
  hasSuspicious: boolean;
  lastSeenAt: string;
}

/** `GET /api/login-history/active`. */
export interface ActiveSessionsResponse {
  groups: ActiveSessionGroup[];
  totalSessions: number;
  totalUsers: number;
  multiCountryUsers: number;
}

/** `GET /api/login-history/filters` — the values the country, city and browser filters offer. */
export interface LoginFilterOptions {
  countries: string[];
  cities: string[];
  browsers: string[];
}

export type LoginAttemptReason =
  | 'invalid_credentials'
  | 'account_disabled'
  | 'email_not_confirmed'
  | 'rate_limited'
  | 'no_role'
  | 'invalid_session'
  | 'expired_token'
  | 'unknown';

/** One refused sign-in (`GET /api/login-attempts`). The address is as typed — not an account. */
export interface LoginAttempt {
  id: string;
  email: string;
  reason: LoginAttemptReason;
  ipAddress: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: SessionDeviceType | null;
  country: string | null;
  city: string | null;
  attemptedAt: string;
  date: string;
}

export interface LoginAttemptQuery {
  page: number;
  pageSize: number;
  search?: string;
  reason?: LoginAttemptReason;
  country?: string;
  from?: string;
  to?: string;
}

export interface LoginAttemptsPage {
  attempts: LoginAttempt[];
  total: number;
  page: number;
  pageSize: number;
}

/** `GET /api/admin/backups/status` (503 when the backup system has no environment). */
export interface BackupStatusResponse {
  health: {
    daily: BackupTypeHealth;
    weekly: BackupTypeHealth;
    monthly: BackupTypeHealth;
    recentFailures: number;
  };
  latest: Record<BackupJobType, BackupJob | null>;
  running: BackupJob[];
  storage: { bucket: string; prefix: string; region: string | null };
  retention: { dailyDays: number; weeklyDays: number; monthlyDays: number; manualDays: number };
  schedule: { timezone: string; daily: string; weekly: string; monthly: string };
}

/** `GET /api/admin/backups/restore-tests/latest`. */
export interface LatestRestoreTestResponse {
  restoreTest: { startedAt: string; status: 'running' | 'success' | 'failed' } | null;
}

export type RestrictionGroup = 'demand' | 'sales' | 'production' | 'cash' | 'ledger' | 'company';

export interface RestrictionRules {
  demand: {
    pendingLimit: { enabled: boolean; warnAt: number; blockAt: number };
    backdated: { enabled: boolean; requireApproval: boolean };
    lowSales: { enabled: boolean; minSoldPercent: number };
  };
  sales: { hourly: { enabled: boolean; threshold: number } };
  production: { stockShortage: { enabled: boolean; allowAdminOverride: boolean } };
  cash: { dailyLimit: { enabled: boolean; limit: number; allowExceptions: boolean } };
  ledger: { backdate: { enabled: boolean; allowedDays: number } };
  company: { shareIncome: { enabled: boolean; allowApproval: boolean } };
}

/** `GET /api/restrictions/rules` — merged over the defaults by the service. */
export interface RestrictionRulesState {
  rules: RestrictionRules;
  saved: Record<RestrictionGroup, { updatedAt: string | null; updatedByName: string | null }>;
  businessDate: string;
  timezone: string;
  /** 'HH:MM', 24-hour. */
  closingTime: string;
  pendingRequests: number;
}

export type RestrictionRequestType = 'BACKDATED_DEMAND' | 'LEDGER_BACKDATE' | 'COMPANY_SHARE_INCOME' | 'CASH_DEPOSIT_LIMIT';
export type RestrictionRequestStatus = 'pending' | 'approved' | 'rejected';

export interface RestrictionRequest {
  id: string;
  requestNo: string;
  type: RestrictionRequestType;
  branchId: string | null;
  branchName: string | null;
  requestedDate: string;
  currentBusinessDate: string;
  amount: number | null;
  description: string | null;
  entryLabel: string | null;
  reason: string;
  requestedByName: string;
  requestedAt: string;
  status: RestrictionRequestStatus;
  approvalNo: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  adminReason: string | null;
  consumedAt: string | null;
  consumedRef: string | null;
}

export type RestrictionEventResult = 'Blocked' | 'Warned' | 'Approval requested' | 'Approved' | 'Rejected' | 'Allowed' | 'Updated';

export interface RestrictionEvent {
  id: string;
  eventNo: string;
  ruleCode: string;
  branchName: string | null;
  userName: string | null;
  ref: string | null;
  currentValue: string | null;
  threshold: string | null;
  action: string;
  result: RestrictionEventResult;
  approvalNo: string | null;
  createdAt: string;
}

export interface RestrictionMonitorRow {
  branchId: string;
  branchName: string;
  pendingCount: number;
  pendingDemandNumbers: string[];
  oldestPending: { demandNumber: string; submittedAt: string } | null;
  salesThisHour: number;
  depositsToday: number;
  demandStatus: 'Normal' | 'Warning' | 'Blocked';
}
