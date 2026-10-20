import { apiClient } from '../client';
import type { RestrictionGroup, RestrictionRequest, RestrictionRules, RestrictionRulesState } from '../types';

/**
 * Super Admin's Settings write actions — the web `SettingsPage` ("Save
 * Settings") and the Restriction Rules `RulesTab` / `ApprovalsTab`, same
 * endpoints and bodies. Every route is `requireRole('super_admin')`
 * server-side, and each body goes through the API's own Zod schema.
 */

/**
 * `PUT /api/settings` — the web sends the whole loaded settings object minus
 * `logoUrl`, `logoPath`, `updatedAt`, `updatedBy`; the server writes only the
 * fields its schema knows (unknown keys are stripped) and answers `{ success }`.
 */
export async function updateAppSettings(input: Record<string, unknown>): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>('/settings', input);
}

/** The PUT answer: the full rule state after the save (no `pendingRequests` — that comes from the GET). */
export type SavedRestrictionRulesState = Omit<RestrictionRulesState, 'pendingRequests'>;

/**
 * `PUT /api/restrictions/rules/:group` — replaces ONE group's whole config
 * (the web never sends a group the admin did not touch). A body that fails
 * the group's schema is a 400 with per-field details.
 */
export async function saveRestrictionGroup<G extends RestrictionGroup>(group: G, config: RestrictionRules[G]): Promise<SavedRestrictionRulesState> {
  return apiClient.put<SavedRestrictionRulesState>(`/restrictions/rules/${group}`, config);
}

/**
 * `POST /api/restrictions/requests/:id/decide` — `{ decision, reason? }`. A
 * reject needs a reason (the server refuses an empty one). A request someone
 * else already decided is a 409.
 */
export async function decideRestrictionRequest(
  id: string,
  decision: 'approved' | 'rejected',
  reason?: string,
): Promise<{ request: RestrictionRequest }> {
  const res = await apiClient.post<{ request: RestrictionRequest }>(`/restrictions/requests/${id}/decide`, { decision, reason });
  const r = res.request;
  return { request: { ...r, amount: r.amount === null || r.amount === undefined ? null : Number(r.amount) } };
}
