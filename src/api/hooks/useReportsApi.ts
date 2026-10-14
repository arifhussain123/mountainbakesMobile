import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { reportService } from '../services';

export function usePackingUsage(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.packingUsage(from, to),
    queryFn: () => reportService.getPackingUsage(from, to),
  });
}
