import { apiClient } from '../client';
import type { BranchClosingSummary } from '../types';

/** `/api/branch-closing?date=` — one business date's reconciliation, defaults to today. */
export async function getBranchClosing(date?: string): Promise<BranchClosingSummary> {
  return apiClient.get<BranchClosingSummary>('/branch-closing', date ? { date } : undefined);
}
