import { apiClient, generateIdempotencyKey, type MutationOptions } from '../client';
import { getBusinessDate } from '../businessDate';
import { getCurrentGeoPosition } from '../geo';
import type { CreatePosSaleInput, CreatePosSaleResult, DataEnginePage, Order, OrderListResponse } from '../types';

export interface ListOrdersParams {
  status?: string;
  from?: string;
  to?: string;
  [key: string]: unknown;
}

export async function listOrders(params?: ListOrdersParams): Promise<OrderListResponse> {
  return apiClient.get<OrderListResponse>('/orders', params);
}

export async function getOrder(id: string): Promise<Order> {
  const { order } = await apiClient.get<{ order: Order }>(`/orders/${id}`);
  return order;
}

export interface ListSalesDataParams {
  businessDate: string;
  page?: number;
  pageSize?: 20 | 50 | 100;
  search?: string;
  /** Omit for "All" — the Data Engine's own `field=value` wire form defaults to `eq`. */
  paymentMethod?: string;
  /** e.g. `'createdAt:desc'` — the Data Engine's own `sort=field:direction` form. */
  sort?: string;
}

/**
 * The Data Engine's `sales` resource (`GET /api/data/sales`) — the
 * authoritative, `business_date`-scoped sales list/count (see the comment on
 * `DataEnginePage` for why this is used instead of `/api/orders`' own count).
 * Branch-role scoping is enforced server-side (`branchScope(user)`); no
 * `branchId` param is sent here, matching every other branch-scoped call.
 */
export async function listSalesData(params: ListSalesDataParams): Promise<DataEnginePage<Order>> {
  const { businessDate, page = 1, pageSize = 20, search, paymentMethod, sort } = params;
  return apiClient.get<DataEnginePage<Order>>('/data/sales', {
    businessDate,
    status: 'delivered',
    page,
    pageSize,
    ...(search ? { search } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(sort ? { sort } : {}),
  });
}

/**
 * `GET /api/data/sales/export` returns a real file (CSV/Excel), not JSON —
 * shared as text via `Share`, same approach as the dashboard's export (no
 * file-system/share-sheet native module installed for a binary attachment;
 * CSV works because it's plain text).
 */
export async function exportSalesCsv(businessDate: string): Promise<string> {
  return apiClient.get<string>('/data/sales/export', { businessDate, status: 'delivered', format: 'csv', scope: 'all' });
}

/**
 * Creates a POS sale. Reads the device's current GPS position (CLAUDE.md Section
 * 31) and stamps the business date (2 AM Karachi rollover) itself — the two
 * things `CreatePosSaleInput` leaves to the caller rather than the UI layer,
 * since every call site needs them identically.
 *
 * `idempotencyKey`: pass the SAME key on a retry of the same logical sale (e.g.
 * after a timeout) — generate a fresh one only for a genuinely new sale.
 */
export async function createPosSale(
  input: Omit<CreatePosSaleInput, 'businessDate'>,
  idempotencyKey: string = generateIdempotencyKey('sale'),
): Promise<CreatePosSaleResult> {
  const geoPosition = await getCurrentGeoPosition();
  const body: CreatePosSaleInput = { ...input, businessDate: getBusinessDate() };
  const options: MutationOptions = { idempotencyKey, geoPosition };
  return apiClient.post<CreatePosSaleResult>('/orders/pos', body, options);
}
