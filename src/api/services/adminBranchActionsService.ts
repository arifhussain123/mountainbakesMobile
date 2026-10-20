import { apiClient } from '../client';
import type { AdminBranchInput, BranchGeofence, UpsertBranchLocationInput } from '../types';

/**
 * Super Admin's branch writes — the same endpoints the web Branches and Branch
 * Locations pages call. All are `requireRole('super_admin')` on the server.
 */

/** `POST /api/branches`. 409 when the name slugifies to an existing branch's. */
export async function createBranch(input: AdminBranchInput): Promise<{ id: string; name: string }> {
  return apiClient.post<{ id: string; name: string }>('/branches', input);
}

/** `PUT /api/branches/:id`. A share change is written to the finance audit trail. */
export async function updateBranch(id: string, input: AdminBranchInput): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>(`/branches/${id}`, input);
}

/** `DELETE /api/branches/:id` — a soft delete (is_active = false); the row leaves every branch list. */
export async function deactivateBranch(id: string): Promise<{ success: boolean }> {
  return apiClient.delete<{ success: boolean }>(`/branches/${id}`);
}

/** `PUT /api/branch-locations/:branchId` — set or replace the branch's geofence. */
export async function upsertBranchLocation(branchId: string, input: UpsertBranchLocationInput): Promise<{ location: BranchGeofence }> {
  return apiClient.put<{ location: BranchGeofence }>(`/branch-locations/${branchId}`, input);
}

/** `PATCH /api/branch-locations/:branchId/status` — enforce or disable without losing the pin. */
export async function setBranchLocationStatus(branchId: string, isActive: boolean): Promise<{ location: BranchGeofence }> {
  return apiClient.patch<{ location: BranchGeofence }>(`/branch-locations/${branchId}/status`, { isActive });
}

/** `DELETE /api/branch-locations/:branchId` — forgets the coordinates; the branch is unrestricted again. */
export async function deleteBranchLocation(branchId: string): Promise<void> {
  await apiClient.delete<unknown>(`/branch-locations/${branchId}`);
}
