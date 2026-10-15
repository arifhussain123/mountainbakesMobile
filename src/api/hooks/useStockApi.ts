import { useQuery } from '@tanstack/react-query';
import { LIVE_STALE_TIME_MS } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { stockService } from '../services';

export function useStock(date?: string) {
  return useQuery({
    queryKey: queryKeys.stock(date),
    queryFn: () => stockService.getStock(date),
    staleTime: LIVE_STALE_TIME_MS,
  });
}
