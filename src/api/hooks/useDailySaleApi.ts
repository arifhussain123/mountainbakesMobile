import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { dailySaleService } from '../services';
import type { ListDailySaleRecordsParams } from '../services/dailySaleService';
import type { AmendDailySaleRecordInput, FeedDailySaleRecordInput, SetPaymentMethodLockInput } from '../types';

export function useDailySaleRecords(params?: ListDailySaleRecordsParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.dailySaleRecords(params),
    queryFn: () => dailySaleService.listDailySaleRecords(params),
    enabled,
  });
}

/** One stored record with its audit history and branch — the web's View dialog. */
export function useDailySaleRecord(id: string | null) {
  return useQuery({
    queryKey: queryKeys.dailySaleRecord(id ?? ''),
    queryFn: () => dailySaleService.getDailySaleRecord(id!),
    enabled: !!id,
  });
}

function invalidateRecords(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['dailySaleRecords'] });
}

export function useGenerateDailySaleRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (businessDate: string) => dailySaleService.generateDailySaleRecord(businessDate),
    onSuccess: () => invalidateRecords(queryClient),
  });
}

export function useFeedDailySaleRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FeedDailySaleRecordInput) => dailySaleService.feedDailySaleRecord(input),
    onSuccess: () => invalidateRecords(queryClient),
  });
}

export function useVerifyDailySaleRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dailySaleService.verifyDailySaleRecord(id),
    onSuccess: () => invalidateRecords(queryClient),
  });
}

// ─── Super admin (web Daily Sale Records, `admin`) ──────────────────────────

/** Generate (or refresh) one branch's record for a day — the admin names the branch. */
export function useAdminGenerateDailySaleRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessDate, branchId }: { businessDate: string; branchId: string }) =>
      dailySaleService.generateDailySaleRecord(businessDate, branchId),
    onSuccess: () => invalidateRecords(queryClient),
  });
}

export function useLockDailySaleRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dailySaleService.lockDailySaleRecord(id),
    onSuccess: () => invalidateRecords(queryClient),
  });
}

export function useUnlockDailySaleRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => dailySaleService.unlockDailySaleRecord(id, reason),
    onSuccess: () => invalidateRecords(queryClient),
  });
}

export function useAmendDailySaleRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AmendDailySaleRecordInput }) => dailySaleService.amendDailySaleRecord(id, input),
    onSuccess: () => invalidateRecords(queryClient),
  });
}

/** One branch's manual-entry locks — fetched for the record being fed, never "all branches". */
export function useDailySaleLocks(branchId: string | null) {
  return useQuery({
    queryKey: queryKeys.dailySaleLocks(branchId ?? ''),
    queryFn: () => dailySaleService.getDailySaleLocks(branchId!),
    enabled: !!branchId,
  });
}

export function useSetPaymentMethodLock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetPaymentMethodLockInput) => dailySaleService.setPaymentMethodLock(input),
    onSuccess: () => invalidateRecords(queryClient),
  });
}
