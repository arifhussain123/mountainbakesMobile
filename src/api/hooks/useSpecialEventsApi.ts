import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { specialEventService } from '../services';
import type {
  EventCategory,
  EventProductionStage,
  EventStatus,
  ReviewEventDemandInput,
  SaveEventDemandInput,
  UpdateEventStageInput,
} from '../types';

export function useSpecialEvents(year?: number) {
  return useQuery({
    queryKey: queryKeys.specialEvents(year),
    queryFn: () => specialEventService.listSpecialEvents(year),
  });
}

/** Super Admin's filtered list — the web /special-events Year / Category / Status selects. */
export function useAdminSpecialEvents(year: number, category: EventCategory | null, status: EventStatus | null) {
  return useQuery({
    queryKey: queryKeys.adminSpecialEvents(year, category, status),
    queryFn: () => specialEventService.listSpecialEvents(year, { category, status }),
  });
}

/** One event + its stage rows — the web /special-events/[id] header and cards. */
export function useSpecialEvent(eventId: string) {
  return useQuery({
    queryKey: queryKeys.specialEvent(eventId),
    queryFn: () => specialEventService.getSpecialEvent(eventId),
    enabled: !!eventId,
  });
}

/** One calendar month's events (1-based month). */
export function useEventCalendar(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.eventCalendar(year, month),
    queryFn: () => specialEventService.getEventCalendar(year, month),
  });
}

/** One event's reminder schedule — super_admin only. */
export function useEventNotifications(eventId: string) {
  return useQuery({
    queryKey: queryKeys.eventNotifications(eventId),
    queryFn: () => specialEventService.listEventNotifications(eventId),
    enabled: !!eventId,
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
