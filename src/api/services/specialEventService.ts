import { apiClient } from '../client';
import type {
  ConsolidatedDemandRow,
  EventBranchDemand,
  EventCategory,
  EventDashboardSummary,
  EventNotificationRow,
  EventProductionStage,
  EventProductionStatusRow,
  EventStatus,
  ReviewEventDemandInput,
  SaveEventDemandInput,
  SpecialEvent,
  SpecialEventListResponse,
  UpdateEventStageInput,
} from '../types';

/**
 * `/api/special-events` — this year's events, branch-scoped to ones the caller participates in.
 * `filters` (category / status) are the web admin list's Select filters; omitted = all.
 */
export async function listSpecialEvents(
  year?: number,
  filters?: { category?: EventCategory | null; status?: EventStatus | null },
): Promise<SpecialEventListResponse> {
  const params: Record<string, unknown> = {};
  if (year) params.year = year;
  if (filters?.category) params.category = filters.category;
  if (filters?.status) params.status = filters.status;
  return apiClient.get<SpecialEventListResponse>('/special-events', Object.keys(params).length > 0 ? params : undefined);
}

/** `/api/special-events/:id` — one event (with branchIds, readiness, demandSummary) plus its stage rows. */
export async function getSpecialEvent(id: string): Promise<{ event: SpecialEvent; stages: EventProductionStatusRow[] }> {
  return apiClient.get<{ event: SpecialEvent; stages: EventProductionStatusRow[] }>(`/special-events/${id}`);
}

/** `/api/special-events/calendar?year&month` — one month's events, multi-day events included on every day they span. */
export async function getEventCalendar(year: number, month: number): Promise<SpecialEvent[]> {
  const { events } = await apiClient.get<{ events: SpecialEvent[] }>('/special-events/calendar', { year, month });
  return events ?? [];
}

/** `/api/special-events/notifications?eventId=` — one event's reminder schedule (`super_admin` only). */
export async function listEventNotifications(eventId: string): Promise<EventNotificationRow[]> {
  const { notifications } = await apiClient.get<{ notifications: EventNotificationRow[] }>('/special-events/notifications', { eventId });
  return notifications ?? [];
}

/** `/api/special-events/summary` — role-shaped dashboard counts (Production's "Special Events" stat grid). */
export async function getEventsSummary(): Promise<EventDashboardSummary> {
  const { summary } = await apiClient.get<{ summary: EventDashboardSummary }>('/special-events/summary');
  return summary;
}

/** `/api/special-events/:id/demands` — every branch's demand for one event (`super_admin`/`production_user`). */
export async function getEventDemands(eventId: string): Promise<EventBranchDemand[]> {
  const { demands } = await apiClient.get<{ demands: EventBranchDemand[] }>(`/special-events/${eventId}/demands`);
  return demands;
}

/** `/api/special-events/:id/demands/consolidated` — product-wise roll-up across every branch. */
export async function getConsolidatedDemand(
  eventId: string,
): Promise<{ rows: ConsolidatedDemandRow[]; branchesIncluded: number }> {
  return apiClient.get<{ rows: ConsolidatedDemandRow[]; branchesIncluded: number }>(
    `/special-events/${eventId}/demands/consolidated`,
  );
}

/** `/api/special-events/:id/production-status` — the four stage completions + mean readiness. */
export async function getEventProductionStatus(
  eventId: string,
): Promise<{ stages: EventProductionStatusRow[]; readinessPercentage: number }> {
  return apiClient.get<{ stages: EventProductionStatusRow[]; readinessPercentage: number }>(
    `/special-events/${eventId}/production-status`,
  );
}

/** `PUT /special-events/:id/production-status/:stage` — move one stage's completion. */
export async function updateEventProductionStage(
  eventId: string,
  stage: EventProductionStage,
  input: UpdateEventStageInput,
): Promise<{ stages: EventProductionStatusRow[]; readinessPercentage: number }> {
  return apiClient.put<{ stages: EventProductionStatusRow[]; readinessPercentage: number }>(
    `/special-events/${eventId}/production-status/${stage}`,
    input,
  );
}

/** `PUT /special-events/demands/:demandId/review` — Production approves/rejects a submitted branch demand. */
export async function reviewEventDemand(demandId: string, input: ReviewEventDemandInput): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(`/special-events/demands/${demandId}/review`, input);
}

/** `/api/special-events/:id/my-demand` — null when the branch has not started one. */
export async function getMyEventDemand(eventId: string): Promise<EventBranchDemand | null> {
  const { demand } = await apiClient.get<{ demand: EventBranchDemand | null }>(`/special-events/${eventId}/my-demand`);
  return demand;
}

/** `POST /special-events/:id/demands` — create or replace the caller's own demand as a draft. */
export async function saveEventDemand(eventId: string, input: SaveEventDemandInput): Promise<{ id: string; status: 'draft' }> {
  return apiClient.post<{ id: string; status: 'draft' }>(`/special-events/${eventId}/demands`, input);
}

/** Only valid while the demand is still 'draft'. */
export async function submitEventDemand(eventId: string, demandId: string): Promise<{ success: boolean; status: 'submitted' }> {
  return apiClient.post<{ success: boolean; status: 'submitted' }>(`/special-events/${eventId}/demands/${demandId}/submit`);
}
