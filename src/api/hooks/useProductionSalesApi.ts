import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { productionSaleService } from '../services';
import type { ListProductionSalesParams } from '../services/productionSaleService';
import type { CreateProductionSaleInput } from '../types';

export function useProductionSales(params?: ListProductionSalesParams) {
  return useQuery({
    queryKey: queryKeys.productionSales(params),
    queryFn: () => productionSaleService.listProductionSales(params),
  });
}

export function useCreateProductionSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductionSaleInput) => productionSaleService.createProductionSale(input),
    onSuccess: () => {
      // A completed sale draws down the central pool — invalidate the pool and
      // this screen's own sale list, same breadth as useCreatePosSale's branch-side equivalent.
      void queryClient.invalidateQueries({ queryKey: ['productionSales'] });
      void queryClient.invalidateQueries({ queryKey: ['productionStock'] });
    },
  });
}
