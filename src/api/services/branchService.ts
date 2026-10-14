import { apiClient } from '../client';
import type { BranchListResponse } from '../types';

/** `/api/branches` — all authenticated roles can read it; active branches only. */
export async function listBranches(): Promise<BranchListResponse> {
  return apiClient.get<BranchListResponse>('/branches');
}
