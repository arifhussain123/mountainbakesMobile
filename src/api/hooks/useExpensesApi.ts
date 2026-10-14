import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { expenseService } from '../services';
import type { CreateExpenseInput } from '../types';

export function useExpenses() {
  return useQuery({
    queryKey: queryKeys.expenses(),
    queryFn: () => expenseService.listExpenses(),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: Omit<CreateExpenseInput, 'date'>; idempotencyKey: string }) =>
      expenseService.createExpense(input, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      void queryClient.invalidateQueries({ queryKey: ['reportSummary'] });
    },
  });
}
