import { apiClient } from '../client';
import type { PackingUsageResponse } from '../types';

/** `/api/reports/packing-usage` — branch-scoped server-side; defaults to the current month. */
export async function getPackingUsage(from: string, to: string): Promise<PackingUsageResponse> {
  return apiClient.get<PackingUsageResponse>('/reports/packing-usage', { from, to, pageSize: 500 });
}
