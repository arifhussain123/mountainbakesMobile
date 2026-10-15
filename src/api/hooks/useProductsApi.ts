import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { productService } from '../services';

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products(),
    queryFn: () => productService.listProducts(),
  });
}
