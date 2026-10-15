import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { branchService } from '../services';

export function useBranches() {
  return useQuery({
    queryKey: queryKeys.branches(),
    queryFn: () => branchService.listBranches(),
  });
}
