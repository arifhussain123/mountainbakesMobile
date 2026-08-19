import type { Expense } from '@/shared/types/expense.types';
import { api } from './client';

/**
 * Expenses.
 *
 * Reads go straight to the API. Writes do NOT live here — an expense is created
 * through the offline write path (local row + queue row in one transaction),
 * which the sync manager then sends. One code path whether online or not, so the
 * offline case is never the untested branch.
 */

export interface ExpenseFilters {
  branchId?: string;
  from?: string;
  to?: string;
  category?: string;
}

export async function getExpenses(filters: ExpenseFilters = {}): Promise<Expense[]> {
  const params: Record<string, string> = {};
  if (filters.branchId) params.branchId = filters.branchId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.category) params.category = filters.category;

  const data = await api.get<{ expenses: Expense[]; total: number }>('/api/expenses', { params });
  return data.expenses ?? [];
}
