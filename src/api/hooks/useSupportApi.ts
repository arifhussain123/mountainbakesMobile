import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { supportService } from '../services';

export function useSupportTickets() {
  return useQuery({
    queryKey: queryKeys.supportTickets(),
    queryFn: () => supportService.listSupportTickets(),
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { referenceId: string; message: string }) => supportService.createSupportTicket(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets() });
    },
  });
}
