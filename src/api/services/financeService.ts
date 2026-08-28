import type {
  FinanceAccount,
  FinanceDashboard,
  FinanceIncomeApproval,
  IncomeApprovalStatus,
  LedgerPage,
} from '@/shared/types/finance.types';
import type { Order } from '@/shared/types/order.types';
import { api } from '../client';

/**
 * Admin orders and the Finance Ledger.
 *
 * Finance is a separate permission surface: every route is gated by
 * `requireFinance(permission)`, and a `super_admin` may always VIEW but can only
 * write when the `allowSuperAdminWrite` setting is on (off by default). This app
 * only reads.
 */

export interface OrderFilters {
  branchId?: string;
  status?: string;
  /** ISO instants. `to` is an INCLUSIVE upper bound on `created_at`. */
  from?: string;
  to?: string;
}

/**
 * Orders and counter sales — one resource, filtered.
 *
 * `status`, `from` and `to` are real indexed predicates on the server, not
 * client-side narrowing: the route pushes each into Postgres precisely so a
 * date range never pulls the whole table. A branch role is auto-scoped to its
 * own branch and `branchId` is ignored for it.
 */
export async function getOrders(filters: OrderFilters = {}): Promise<Order[]> {
  const params: Record<string, string> = {};
  if (filters.branchId) params.branchId = filters.branchId;
  if (filters.status) params.status = filters.status;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  const data = await api.get<{ orders: Order[]; total: number }>('/api/orders', { params });
  return data.orders ?? [];
}

/**
 * Finance dashboard for a business date.
 *
 * Defaults server-side to the current business date (2 AM rollover), which is
 * more reliable than computing it here and sending it.
 */
export function getFinanceDashboard(date?: string): Promise<FinanceDashboard> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  return api.get<FinanceDashboard>('/api/finance/dashboard', { params });
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

export interface LedgerFilters {
  from?: string;
  to?: string;
  branchId?: string;
  account?: FinanceAccount;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * The daily cash book.
 *
 * The ONLY paginated endpoint in the whole API (`limit`/`offset`, server-capped
 * at 500). Everything else returns its full filtered set.
 *
 * Entries come back ordered by `seq`, the global posting order — NOT by
 * `entryDate`. `balance` is the running book balance at the moment of posting,
 * so re-sorting by date client-side would display balances that never existed.
 * Do not sort this list.
 */
export function getLedger(filters: LedgerFilters = {}): Promise<LedgerPage> {
  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.branchId) params.branchId = filters.branchId;
  if (filters.account) params.account = filters.account;
  if (filters.search) params.search = filters.search;
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  if (filters.offset !== undefined) params.offset = String(filters.offset);

  return api.get<LedgerPage>('/api/finance/ledger', { params });
}

// ---------------------------------------------------------------------------
// Branch income approvals
// ---------------------------------------------------------------------------

/**
 * Daily branch takings awaiting verification and approval.
 *
 * Nothing here reaches the ledger until Finance approves it, and the share
 * percentages are snapshot at approval time so a later settings change cannot
 * silently restate an approved day.
 */
export async function getIncomeApprovals(
  filters: { status?: IncomeApprovalStatus; branchId?: string } = {},
): Promise<FinanceIncomeApproval[]> {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.branchId) params.branchId = filters.branchId;

  const data = await api.get<{ approvals: FinanceIncomeApproval[]; total: number }>(
    '/api/finance/income',
    { params },
  );
  return data.approvals ?? [];
}
