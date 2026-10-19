import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { adminNavService } from '../services';

export function useBackupHealth() {
  return useQuery({
    queryKey: queryKeys.backupHealth(),
    queryFn: () => adminNavService.getBackupHealth(),
  });
}

export function useSuspiciousSignInCount(from: string) {
  return useQuery({
    queryKey: queryKeys.suspiciousSignInCount(from),
    queryFn: () => adminNavService.countSuspiciousSignIns(from),
  });
}
