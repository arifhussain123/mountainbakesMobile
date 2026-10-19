import { apiClient } from '../client';
import type {
  AdminBranch,
  AdminCustomer,
  AdminCustomersQuery,
  AdminUser,
  DataEnginePage,
  BackupHistoryPage,
  BranchLocationsResponse,
  LoginHistoryQuery,
  LoginSessionPage,
  ProductCategory,
  ActiveSessionsResponse,
  BackupJob,
  BackupStatusResponse,
  LatestRestoreTestResponse,
  LoginAttemptQuery,
  LoginAttemptsPage,
  LoginFilterOptions,
  RestrictionEvent,
  RestrictionGroup,
  RestrictionMonitorRow,
  RestrictionRequest,
  RestrictionRequestType,
  RestrictionRules,
  RestrictionRulesState,
  SecuritySession,
  SecuritySessionPage,
  SecuritySessionQuery,
  UserAuditLog,
  UsersDataQuery,
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

/**
 * `GET /api/data/customers` — the web Customers page's Data Engine list:
 * searched (name/phone/email), filtered, sorted and paged in the database.
 * Empty filter values are left off the request.
 */
export async function listCustomersData(query: AdminCustomersQuery & { page: number; pageSize: number }): Promise<DataEnginePage<AdminCustomer>> {
  const q = query;
  const params: Record<string, string | number> = { page: q.page, pageSize: q.pageSize, sort: q.sort || 'createdAt:desc' };
  const put = (key: string, value: string | null | undefined) => {
    if (value !== null && value !== undefined && value.trim() !== '') params[key] = value.trim();
  };
  put('search', q.search);
  put('branchId', q.branchId);
  put('totalOrders.gte', q.ordersMin);
  put('totalOrders.lte', q.ordersMax);
  put('totalSpent.gte', q.spentMin);
  put('totalSpent.lte', q.spentMax);
  put('createdAt.gte', q.sinceFrom);
  put('createdAt.lte', q.sinceTo);
  const res = await apiClient.get<DataEnginePage<AdminCustomer>>('/data/customers', params);
  return {
    ...res,
    total: Number(res.total ?? 0),
    data: (res.data ?? []).map((c) => ({ ...c, totalOrders: Number(c.totalOrders ?? 0), totalSpent: Number(c.totalSpent ?? 0) })),
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

/**
 * The Admin Dashboard's Login History card — paged, searched and filtered by
 * the API (search, role, business-date window), as the web card asks.
 */
export async function listLoginHistory(query: LoginHistoryQuery): Promise<LoginSessionPage> {
  const res = await apiClient.get<LoginSessionPage>('/login-history', {
    page: query.page,
    pageSize: query.pageSize,
    ...(query.search ? { search: query.search } : {}),
    ...(query.role ? { role: query.role } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
  });
  return { ...res, total: Number(res.total ?? 0) };
}

export async function listBackupJobs(query: { page: number; pageSize: number }): Promise<BackupHistoryPage> {
  const res = await apiClient.get<BackupHistoryPage>('/admin/backups/history', query);
  return { ...res, total: Number(res.total ?? 0) };
}

// ─── Users (web /users) ─────────────────────────────────────────────────────

/** Drops empty values so the Data Engine never sees `role=` (a 400 on an enum). */
function compact(params: Record<string, string | number | boolean | null | undefined>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '' || v === false) continue;
    out[k] = typeof v === 'boolean' ? 'true' : v;
  }
  return out;
}

/**
 * `GET /api/data/users` — the web Users table: searched (email, name,
 * username, code, phone), filtered and paged in the database, newest first.
 */
export async function listUsersData(query: UsersDataQuery): Promise<DataEnginePage<AdminUser>> {
  const res = await apiClient.get<DataEnginePage<AdminUser>>(
    '/data/users',
    compact({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search?.trim(),
      role: query.role,
      status: query.status,
      branchId: query.branchId,
      'lastLoginAt.gte': query.lastLoginFrom,
      'lastLoginAt.lte': query.lastLoginTo,
    }),
  );
  return { ...res, total: Number(res.total ?? 0), data: res.data ?? [] };
}

/**
 * `GET /api/data/users/export?scope=all&format=csv` — the web export (Code,
 * Name, Email, Role, Branch, Status, Last Login) for the current filters. CSV
 * text into the share sheet; there is no binary-file module for Excel.
 */
export async function exportUsersCsv(query: Omit<UsersDataQuery, 'page' | 'pageSize'>): Promise<string> {
  return apiClient.get<string>(
    '/data/users/export',
    compact({
      scope: 'all',
      format: 'csv',
      search: query.search?.trim(),
      role: query.role,
      status: query.status,
      branchId: query.branchId,
      'lastLoginAt.gte': query.lastLoginFrom,
      'lastLoginAt.lte': query.lastLoginTo,
    }),
  );
}

/** `GET /api/users/activity` — the user-management audit feed, newest first. */
export async function listUserActivity(): Promise<{ logs: UserAuditLog[] }> {
  const res = await apiClient.get<{ logs: UserAuditLog[] }>('/users/activity');
  return { logs: res.logs ?? [] };
}

// ─── Security (web /security) ───────────────────────────────────────────────

/** `GET /api/login-history` with every filter the web Login History tab sends. */
export async function listSecuritySessions(query: SecuritySessionQuery): Promise<SecuritySessionPage> {
  const res = await apiClient.get<SecuritySessionPage>(
    '/login-history',
    compact({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search?.trim(),
      state: query.state,
      country: query.country,
      from: query.from,
      to: query.to,
      suspiciousOnly: query.suspiciousOnly,
      branchId: query.branchId,
      role: query.role,
      city: query.city,
      browser: query.browser,
      deviceType: query.deviceType,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    }),
  );
  return { ...res, total: Number(res.total ?? 0), sessions: res.sessions ?? [] };
}

/** `GET /api/login-history/active` — everything signed in now, grouped by account. */
export async function getActiveSessions(): Promise<ActiveSessionsResponse> {
  const res = await apiClient.get<ActiveSessionsResponse>('/login-history/active');
  return {
    groups: res.groups ?? [],
    totalSessions: Number(res.totalSessions ?? 0),
    totalUsers: Number(res.totalUsers ?? 0),
    multiCountryUsers: Number(res.multiCountryUsers ?? 0),
  };
}

export async function getLoginFilterOptions(): Promise<LoginFilterOptions> {
  const res = await apiClient.get<LoginFilterOptions>('/login-history/filters');
  return { countries: res.countries ?? [], cities: res.cities ?? [], browsers: res.browsers ?? [] };
}

/** One session in full. The server records the view in the audit log (`session_viewed`). */
export async function getSecuritySession(id: string): Promise<SecuritySession> {
  return apiClient.get<SecuritySession>(`/login-history/${encodeURIComponent(id)}`);
}

/** `GET /api/login-attempts` — refused sign-ins (super_admin only). */
export async function listLoginAttempts(query: LoginAttemptQuery): Promise<LoginAttemptsPage> {
  const res = await apiClient.get<LoginAttemptsPage>(
    '/login-attempts',
    compact({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search?.trim(),
      reason: query.reason,
      country: query.country,
      from: query.from,
      to: query.to,
    }),
  );
  return { ...res, total: Number(res.total ?? 0), attempts: res.attempts ?? [] };
}

// ─── Database Backup (web /database-backup) ─────────────────────────────────

function normaliseBackupJob(j: BackupJob): BackupJob {
  const num = (v: number | null | undefined) => (v === null || v === undefined ? null : Number(v));
  return { ...j, fileSize: num(j.fileSize), authFileSize: num(j.authFileSize), durationMs: num(j.durationMs) };
}

/** `GET /api/admin/backups/status`. Rejects with status 503 when the backup system is not configured. */
export async function getBackupStatus(): Promise<BackupStatusResponse> {
  const res = await apiClient.get<BackupStatusResponse>('/admin/backups/status');
  const latest = res.latest ?? {};
  return {
    ...res,
    running: (res.running ?? []).map(normaliseBackupJob),
    latest: {
      daily: latest.daily ? normaliseBackupJob(latest.daily) : null,
      weekly: latest.weekly ? normaliseBackupJob(latest.weekly) : null,
      monthly: latest.monthly ? normaliseBackupJob(latest.monthly) : null,
      manual: latest.manual ? normaliseBackupJob(latest.manual) : null,
    },
  };
}

export async function getLatestRestoreTest(): Promise<LatestRestoreTestResponse> {
  const res = await apiClient.get<LatestRestoreTestResponse>('/admin/backups/restore-tests/latest');
  return { restoreTest: res.restoreTest ?? null };
}

/** The web page's one request: the newest 100 runs, searched and paged on the device. */
export async function listBackupHistory(): Promise<BackupHistoryPage> {
  const res = await apiClient.get<BackupHistoryPage>('/admin/backups/history', { page: 1, pageSize: 100 });
  return { ...res, total: Number(res.total ?? 0), jobs: (res.jobs ?? []).map(normaliseBackupJob) };
}

// ─── Settings → Restriction Rules (web /settings/restriction-rules) ─────────

const DEFAULT_RESTRICTION_RULES: RestrictionRules = {
  demand: {
    pendingLimit: { enabled: true, warnAt: 2, blockAt: 3 },
    backdated: { enabled: true, requireApproval: true },
    lowSales: { enabled: true, minSoldPercent: 30 },
  },
  sales: { hourly: { enabled: true, threshold: 2 } },
  production: { stockShortage: { enabled: true, allowAdminOverride: true } },
  cash: { dailyLimit: { enabled: true, limit: 3, allowExceptions: true } },
  ledger: { backdate: { enabled: true, allowedDays: 3 } },
  company: { shareIncome: { enabled: true, allowApproval: true } },
};
const RESTRICTION_GROUPS: RestrictionGroup[] = ['demand', 'sales', 'production', 'cash', 'ledger', 'company'];

/** The web's `mergeRules`: every rule the server has not saved yet reads as its default. */
function mergeRestrictionRules(saved: Partial<Record<RestrictionGroup, Record<string, object>>> | undefined): RestrictionRules {
  const out = JSON.parse(JSON.stringify(DEFAULT_RESTRICTION_RULES)) as Record<RestrictionGroup, Record<string, object>>;
  for (const g of RESTRICTION_GROUPS) {
    for (const [rule, value] of Object.entries(saved?.[g] ?? {})) {
      out[g][rule] = { ...(out[g][rule] ?? {}), ...value };
    }
  }
  return out as unknown as RestrictionRules;
}

export async function getRestrictionRules(): Promise<RestrictionRulesState> {
  const res = await apiClient.get<Omit<RestrictionRulesState, 'rules' | 'saved'> & { rules?: Partial<Record<RestrictionGroup, Record<string, object>>>; saved?: Partial<RestrictionRulesState['saved']> }>(
    '/restrictions/rules',
  );
  const saved = Object.fromEntries(RESTRICTION_GROUPS.map((g) => [g, res.saved?.[g] ?? { updatedAt: null, updatedByName: null }])) as RestrictionRulesState['saved'];
  return { ...res, rules: mergeRestrictionRules(res.rules), saved, pendingRequests: Number(res.pendingRequests ?? 0) };
}

export async function listRestrictionRequests(type: RestrictionRequestType | null): Promise<{ requests: RestrictionRequest[] }> {
  const res = await apiClient.get<{ requests: RestrictionRequest[] }>('/restrictions/requests', type ? { type } : undefined);
  return { requests: (res.requests ?? []).map((r) => ({ ...r, amount: r.amount === null || r.amount === undefined ? null : Number(r.amount) })) };
}

export async function getRestrictionMonitor(): Promise<{ branches: RestrictionMonitorRow[] }> {
  const res = await apiClient.get<{ branches: RestrictionMonitorRow[] }>('/restrictions/monitor');
  return { branches: res.branches ?? [] };
}

export async function listRestrictionEvents(ruleCode: string | null): Promise<{ events: RestrictionEvent[] }> {
  const res = await apiClient.get<{ events: RestrictionEvent[] }>('/restrictions/events', ruleCode ? { ruleCode } : undefined);
  return { events: res.events ?? [] };
}
