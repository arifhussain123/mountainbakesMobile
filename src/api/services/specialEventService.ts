import { apiClient } from '../client';
import type { EventBranchDemand, SaveEventDemandInput, SpecialEventListResponse } from '../types';

/** `/api/special-events` — this year's events, branch-scoped to ones the caller participates in. */
export async function listSpecialEvents(year?: number): Promise<SpecialEventListResponse> {
  return apiClient.get<SpecialEventListResponse>('/special-events', year ? { year } : undefined);
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
