import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { adminEventActionsService, specialEventService } from '../services';
import type { EventProductionStage, EventStatus, ReviewEventDemandInput, SpecialEventInput, UpdateEventStageInput } from '../types';

// ─── Super admin (web /special-events and /special-events/[id]) ─────────────

/**
 * An event edit moves the list, the detail, the calendar, the dashboard
 * counts and the reminder schedule at once — the web's `invalidateEvents`.
 * Prefix keys, so every year / filter / month variant is refreshed.
 */
function invalidateEvents(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['specialEvents'] });
  void queryClient.invalidateQueries({ queryKey: ['specialEvent'] });
  void queryClient.invalidateQueries({ queryKey: ['eventCalendar'] });
  void queryClient.invalidateQueries({ queryKey: ['eventsSummary'] });
  void queryClient.invalidateQueries({ queryKey: ['eventNotifications'] });
}

export function useCreateSpecialEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SpecialEventInput) => adminEventActionsService.createSpecialEvent(input),
    onSuccess: () => invalidateEvents(queryClient),
  });
}

export function useUpdateSpecialEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SpecialEventInput }) => adminEventActionsService.updateSpecialEvent(id, input),
    onSuccess: () => invalidateEvents(queryClient),
  });
}

export function useConfirmEventDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmedDate }: { id: string; confirmedDate: string | null }) =>
      adminEventActionsService.confirmEventDate(id, confirmedDate),
    onSuccess: () => invalidateEvents(queryClient),
  });
}

export function useUpdateEventStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EventStatus }) => adminEventActionsService.updateEventStatus(id, status),
    onSuccess: () => invalidateEvents(queryClient),
  });
}

export function useDeleteSpecialEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminEventActionsService.deleteSpecialEvent(id),
    onSuccess: () => invalidateEvents(queryClient),
  });
}

/**
 * Approve / reject a submitted branch demand from the admin event page. Same
 * endpoint as Production's `useReviewEventDemand`, but refreshes what the admin
 * screens read too (participation counts on the list and the detail) — the
 * web's `invalidateDemands`.
 */
export function useAdminReviewEventDemand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ demandId, input }: { demandId: string; input: ReviewEventDemandInput }) =>
      specialEventService.reviewEventDemand(demandId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['eventDemands'] });
      void queryClient.invalidateQueries({ queryKey: ['myEventDemand'] });
      void queryClient.invalidateQueries({ queryKey: ['consolidatedDemand'] });
      void queryClient.invalidateQueries({ queryKey: ['specialEvents'] });
      void queryClient.invalidateQueries({ queryKey: ['specialEvent'] });
      void queryClient.invalidateQueries({ queryKey: ['eventsSummary'] });
    },
  });
}

/** One preparation stage's completion, from the admin event page (readiness shows on the list and detail too). */
export function useAdminUpdateEventStage(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stage, input }: { stage: EventProductionStage; input: UpdateEventStageInput }) =>
      specialEventService.updateEventProductionStage(eventId, stage, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['eventProductionStatus'] });
      void queryClient.invalidateQueries({ queryKey: ['specialEvent'] });
      void queryClient.invalidateQueries({ queryKey: ['specialEvents'] });
      void queryClient.invalidateQueries({ queryKey: ['eventsSummary'] });
    },
  });
}

/** "Send due reminders now" — every event's due reminders, not just this one's. */
export function useDispatchEventNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminEventActionsService.dispatchEventNotifications(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['eventNotifications'] });
      void queryClient.invalidateQueries({ queryKey: ['eventsSummary'] });
    },
  });
}

export function useRegenerateEventSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => adminEventActionsService.regenerateEventSchedule(eventId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['eventNotifications'] });
    },
  });
}
