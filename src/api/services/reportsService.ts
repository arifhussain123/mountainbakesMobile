import type { ReportPeriod, ReportSummary } from '@/shared/types/report.types';
import { api } from '../client';

/**
 * Reports.
 *
 * `GET /api/reports/summary` is restricted to `super_admin` and `branch_manager`
 * — a `branch_user` receives 403, which is why that role has no dashboard tab.
 *
 * A branch manager is auto-scoped to their own branch server-side and must not
 * send `branchId`; an admin may pass one to scope the figures.
 */
export async function getReportSummary(options: {
  period: ReportPeriod;
  branchId?: string;
  from?: string;
  to?: string;
}): Promise<ReportSummary> {
  const params: Record<string, string> = { period: options.period };
  if (options.branchId) params.branchId = options.branchId;
  if (options.from) params.from = options.from;
  if (options.to) params.to = options.to;

  return api.get<ReportSummary>('/api/reports/summary', { params });
}
