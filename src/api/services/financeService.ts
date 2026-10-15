import { apiClient } from '../client';
import type { FinanceDashboard, FinancePendingApproval, FinanceSettings } from '../types';

/** `/api/finance/dashboard` — today's composite + a trailing trend. `requireFinance('view')`. */
export async function getFinanceDashboard(params?: { from?: string; to?: string; branchId?: string | null }): Promise<FinanceDashboard> {
  return apiClient.get<FinanceDashboard>('/finance/dashboard', params);
}

/** `/api/finance/pending-approvals` — the documents behind the dashboard's "pending approval" figure. */
export async function getPendingApprovals(): Promise<FinancePendingApproval[]> {
  const { items } = await apiClient.get<{ items: FinancePendingApproval[] }>('/finance/pending-approvals');
  return items;
}

/** `/api/finance/settings` — this is where `allowSuperAdminWrite` itself lives. */
export async function getFinanceSettings(): Promise<FinanceSettings> {
  const { settings } = await apiClient.get<{ settings: FinanceSettings }>('/finance/settings');
  return settings;
}
