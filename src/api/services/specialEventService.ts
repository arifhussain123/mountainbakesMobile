import { apiClient } from '../client';
import type {
  ConsolidatedDemandRow,
  EventBranchDemand,
  EventDashboardSummary,
  EventProductionStage,
  EventProductionStatusRow,
  ReviewEventDemandInput,
  SaveEventDemandInput,
  SpecialEventListResponse,
  UpdateEventStageInput,
} from '../types';

/** `/api/special-events` — this year's events, branch-scoped to ones the caller participates in. */
export async function listSpecialEvents(year?: number): Promise<SpecialEventListResponse> {
  return apiClient.get<SpecialEventListResponse>('/special-events', year ? { year } : undefined);
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
