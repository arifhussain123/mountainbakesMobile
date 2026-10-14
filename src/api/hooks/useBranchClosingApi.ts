import { useQuery } from '@tanstack/react-query';
import { LIVE_STALE_TIME_MS } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { branchClosingService } from '../services';

export function useBranchClosing(date?: string) {
  return useQuery({
    queryKey: queryKeys.branchClosing(date),
    queryFn: () => branchClosingService.getBranchClosing(date),
    staleTime: LIVE_STALE_TIME_MS,
  });
}
