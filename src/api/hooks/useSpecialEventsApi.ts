import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { specialEventService } from '../services';
import type { EventProductionStage, ReviewEventDemandInput, SaveEventDemandInput, UpdateEventStageInput } from '../types';

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

/** Production's "Special Events" stat grid. */
export function useEventsSummary() {
  return useQuery({
    queryKey: queryKeys.eventsSummary(),
    queryFn: () => specialEventService.getEventsSummary(),
  });
}

/** Every branch's demand for one event — `super_admin`/`production_user` only. */
export function useEventDemands(eventId: string) {
  return useQuery({
    queryKey: queryKeys.eventDemands(eventId),
    queryFn: () => specialEventService.getEventDemands(eventId),
    enabled: !!eventId,
  });
}

/** Product-wise roll-up across every branch — what Production plans against. */
export function useConsolidatedDemand(eventId: string) {
  return useQuery({
    queryKey: queryKeys.consolidatedDemand(eventId),
    queryFn: () => specialEventService.getConsolidatedDemand(eventId),
    enabled: !!eventId,
  });
}

export function useEventProductionStatus(eventId: string) {
  return useQuery({
    queryKey: queryKeys.eventProductionStatus(eventId),
    queryFn: () => specialEventService.getEventProductionStatus(eventId),
    enabled: !!eventId,
  });
}

export function useUpdateEventStage(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stage, input }: { stage: EventProductionStage; input: UpdateEventStageInput }) =>
      specialEventService.updateEventProductionStage(eventId, stage, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventProductionStatus(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventsSummary() });
    },
  });
}

export function useReviewEventDemand(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ demandId, input }: { demandId: string; input: ReviewEventDemandInput }) =>
      specialEventService.reviewEventDemand(demandId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventDemands(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.consolidatedDemand(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventsSummary() });
    },
  });
}
