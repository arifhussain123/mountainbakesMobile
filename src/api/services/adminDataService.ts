import { apiClient } from '../client';
import type {
  AdminBranch,
  AdminCustomer,
  AdminUser,
  BackupHistoryPage,
  BranchLocationsResponse,
  LoginSessionPage,
  ProductCategory,
} from '../types';

/**
 * Super Admin's read-only lists. Each route already serves super_admin every
 * branch (no branch filter is applied for that role). numeric columns can
 * arrive as strings, so money and counts are coerced here once.
 */
export async function listCustomers(search?: string): Promise<{ customers: AdminCustomer[]; total: number }> {
  const res = await apiClient.get<{ customers: AdminCustomer[]; total: number }>('/customers', search ? { search } : undefined);
  return {
    total: Number(res.total ?? 0),
    customers: (res.customers ?? []).map((c) => ({ ...c, totalOrders: Number(c.totalOrders ?? 0), totalSpent: Number(c.totalSpent ?? 0) })),
  };
}

export async function listCategories(): Promise<{ categories: ProductCategory[] }> {
  return apiClient.get<{ categories: ProductCategory[] }>('/products/categories');
}

/** Active and deactivated branches — DELETE on a branch is a soft deactivate. */
export async function listAllBranches(): Promise<{ branches: AdminBranch[] }> {
  return apiClient.get<{ branches: AdminBranch[] }>('/branches', { includeInactive: 'true' });
}

export async function listBranchLocations(): Promise<BranchLocationsResponse> {
  return apiClient.get<BranchLocationsResponse>('/branch-locations');
}

export async function listUsers(): Promise<{ users: AdminUser[]; total: number }> {
  return apiClient.get<{ users: AdminUser[]; total: number }>('/users');
}

/** Newest first. Mobile sign-ins open no session row, so these are web sign-ins. */
export async function listLoginSessions(query: { page: number; pageSize: number; suspiciousOnly?: boolean }): Promise<LoginSessionPage> {
  const res = await apiClient.get<LoginSessionPage>('/login-history', {
    page: query.page,
    pageSize: query.pageSize,
    ...(query.suspiciousOnly ? { suspiciousOnly: 'true' } : {}),
  });
  return { ...res, total: Number(res.total ?? 0) };
}

export async function listBackupJobs(query: { page: number; pageSize: number }): Promise<BackupHistoryPage> {
  const res = await apiClient.get<BackupHistoryPage>('/admin/backups/history', query);
  return { ...res, total: Number(res.total ?? 0) };
}
