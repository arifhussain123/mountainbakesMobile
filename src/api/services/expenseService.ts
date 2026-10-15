import { apiClient, generateIdempotencyKey, type MutationOptions } from '../client';
import { getBusinessDate } from '../businessDate';
import type { CreateExpenseInput, ExpenseListResponse } from '../types';

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
