import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { productionStockService } from '../services';
import type { CreateProductionAdjustmentInput, PrepareProductionInput } from '../types';

export function useProductionStock(date?: string) {
  return useQuery({
    queryKey: queryKeys.productionStock(date),
    queryFn: () => productionStockService.listProductionStock(date),
  });
}

export function usePrepareProduction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PrepareProductionInput) => productionStockService.prepareProduction(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productionStock'] });
    },
  });
}

export function useCreateProductionAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductionAdjustmentInput) => productionStockService.createProductionAdjustment(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productionStock'] });
    },
  });
}
