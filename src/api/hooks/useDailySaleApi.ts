import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { dailySaleService } from '../services';
import type { ListDailySaleRecordsParams } from '../services/dailySaleService';
import type { FeedDailySaleRecordInput } from '../types';

export function useDailySaleRecords(params?: ListDailySaleRecordsParams) {
  return useQuery({
    queryKey: queryKeys.dailySaleRecords(params),
    queryFn: () => dailySaleService.listDailySaleRecords(params),
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
