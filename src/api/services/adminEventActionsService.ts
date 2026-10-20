import { apiClient } from '../client';
import type { AdminSpecialEvent, EventDispatchResult, EventScheduleResult, EventStatus, SpecialEventInput } from '../types';

/**
 * Super Admin's write actions on `/api/special-events` — the web
 * `useCreateEvent` / `useUpdateEvent` / `useConfirmEventDate` /
 * `useUpdateEventStatus` / `useDeleteEvent` / `useDispatchEventNotifications` /
 * `useRegenerateEventSchedule`, same methods and bodies. Every route here is
 * `requireRole('super_admin')`. Demand review and stage updates already live in
 * `specialEventService` (`reviewEventDemand`, `updateEventProductionStage`).
 */

/** `POST /special-events` — the server resolves the date and schedules the reminders. 409 when the series already has that year. */
export async function createSpecialEvent(input: SpecialEventInput): Promise<{ event: AdminSpecialEvent }> {
  return apiClient.post<{ event: AdminSpecialEvent }>('/special-events', input);
}

/** `PUT /special-events/:id` — the schedule is reconciled when a date-affecting field is in the body. */
export async function updateSpecialEvent(id: string, input: SpecialEventInput): Promise<{ event: AdminSpecialEvent }> {
  return apiClient.put<{ event: AdminSpecialEvent }>(`/special-events/${id}`, input);
}

/** `PATCH /special-events/:id/confirm-date` — the moon-sighting override; null hands the date back to the estimate. */
export async function confirmEventDate(id: string, confirmedDate: string | null): Promise<{ event: AdminSpecialEvent }> {
  return apiClient.patch<{ event: AdminSpecialEvent }>(`/special-events/${id}/confirm-date`, { confirmedDate });
}

/** `PATCH /special-events/:id/status` — cancelling also stops the pending reminders. */
export async function updateEventStatus(id: string, status: EventStatus): Promise<{ event: AdminSpecialEvent }> {
  return apiClient.patch<{ event: AdminSpecialEvent }>(`/special-events/${id}/status`, { status });
}

/** `DELETE /special-events/:id` — a SOFT delete (`is_active = false`) that cancels pending reminders. */
export async function deleteSpecialEvent(id: string): Promise<{ success: boolean; remindersCancelled: number }> {
  return apiClient.delete<{ success: boolean; remindersCancelled: number }>(`/special-events/${id}`);
}

/**
 * `POST /special-events/notifications/dispatch` — send every reminder due on or
 * before today, for ALL events. The only delivery path while the server's event
 * scheduler is not started.
 */
export async function dispatchEventNotifications(): Promise<EventDispatchResult> {
  return apiClient.post<EventDispatchResult>('/special-events/notifications/dispatch', {});
}

/** `POST /special-events/:id/notifications/regenerate` — rebuild one event's reminder schedule. */
export async function regenerateEventSchedule(eventId: string): Promise<EventScheduleResult> {
  return apiClient.post<EventScheduleResult>(`/special-events/${eventId}/notifications/regenerate`);
}
