import { apiClient, generateIdempotencyKey, type MutationOptions } from '../client';
import { getBusinessDate } from '../businessDate';
import type { CreateExpenseInput, DataEngineAggregateResponse, DataEnginePage, Expense, ExpenseListResponse } from '../types';

/** `/api/expenses` — last 7 business days, branch-scoped server-side. */
export async function listExpenses(): Promise<ExpenseListResponse> {
  return apiClient.get<ExpenseListResponse>('/expenses');
}

/** A branch role may only use today's date — the server stamps it if omitted and refuses any other. */
export async function createExpense(
  input: Omit<CreateExpenseInput, 'date'>,
  idempotencyKey: string = generateIdempotencyKey('expense'),
): Promise<{ id: string }> {
  const body: CreateExpenseInput = { ...input, date: getBusinessDate() };
  const options: MutationOptions = { idempotencyKey };
  return apiClient.post<{ id: string }>('/expenses', body, options);
}

export interface ListExpensesDataParams {
  /** 'YYYY-MM-DD' — first business date shown (Shop Expenses: the 1st of the business month). */
  from: string;
  page?: number;
  pageSize?: 20 | 50 | 100;
  /** Server search: expense #, description, remarks, entered by. */
  search?: string;
  /** e.g. `'createdAt:desc'` — the Data Engine's own `sort=field:direction` form. */
  sort?: string;
}

/**
 * The Data Engine's `expenses` resource (`GET /api/data/expenses`) — what the
 * web's Shop Expenses reads. Unlike `GET /expenses` (fixed to the last seven
 * business days) it takes a window, so the screen can open on the month to
 * date as the web does. Branch roles are scoped server-side (`branchScope`);
 * no `branchId` is sent. Rows carry `date` like the legacy list.
 */
export async function listExpensesData(params: ListExpensesDataParams): Promise<DataEnginePage<Expense>> {
  const { from, page = 1, pageSize = 50, search, sort = 'createdAt:desc' } = params;
  return apiClient.get<DataEnginePage<Expense>>('/data/expenses', {
    'businessDate.gte': from,
    page,
    pageSize,
    sort,
    ...(search ? { search } : {}),
  });
}

/**
 * The total over exactly the rows `listExpensesData` selects, summed in the
 * database (`GET /api/data/expenses/aggregate`) — never added up from the
 * pages loaded so far.
 */
export async function getExpensesTotal(params: { from: string; search?: string }): Promise<{ amount: number; count: number }> {
  const res = await apiClient.get<DataEngineAggregateResponse>('/data/expenses/aggregate', {
    'businessDate.gte': params.from,
    metrics: 'sum:amount,count',
    ...(params.search ? { search: params.search } : {}),
  });
  const values = res.rows[0]?.values ?? {};
  return { amount: Number(values['sum:amount'] ?? 0) || 0, count: Number(values.count ?? 0) || 0 };
}
