import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { expenseService } from '../services';
import type { CreateExpenseInput } from '../types';

export function useExpenses() {
  return useQuery({
    queryKey: queryKeys.expenses(),
    queryFn: () => expenseService.listExpenses(),
  });
}

/** Shop Expenses' list: from `from` (the 1st of the business month) to today, newest first, 50 a page. */
export function useExpensesData(params: { from: string; search?: string }) {
  return useInfiniteQuery({
    queryKey: queryKeys.expensesData({ from: params.from, search: params.search }),
    queryFn: ({ pageParam }) => expenseService.listExpensesData({ from: params.from, search: params.search, page: pageParam, pageSize: 50 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.page + 1 : undefined),
  });
}

/** The server's total over the same window and search as `useExpensesData`. */
export function useExpensesTotal(params: { from: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.expensesTotal({ from: params.from, search: params.search }),
    queryFn: () => expenseService.getExpensesTotal(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: Omit<CreateExpenseInput, 'date'>; idempotencyKey: string }) =>
      expenseService.createExpense(input, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      void queryClient.invalidateQueries({ queryKey: ['expensesData'] });
      void queryClient.invalidateQueries({ queryKey: ['expensesTotal'] });
      void queryClient.invalidateQueries({ queryKey: ['reportSummary'] });
    },
  });
}
