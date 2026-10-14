import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { specialEventService } from '../services';
import type { SaveEventDemandInput } from '../types';

export function useSpecialEvents(year?: number) {
  return useQuery({
    queryKey: queryKeys.specialEvents(year),
    queryFn: () => specialEventService.listSpecialEvents(year),
  });
}

export function useMyEventDemand(eventId: string) {
  return useQuery({
    queryKey: queryKeys.myEventDemand(eventId),
    queryFn: () => specialEventService.getMyEventDemand(eventId),
    enabled: !!eventId,
  });
}

export function useSaveEventDemand(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveEventDemandInput) => specialEventService.saveEventDemand(eventId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myEventDemand(eventId) });
    },
  });
}

export function useSubmitEventDemand(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (demandId: string) => specialEventService.submitEventDemand(eventId, demandId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myEventDemand(eventId) });
    },
  });
}
