import { useMemo, useState } from 'react';
import { useAdminUsers, type AdminUser, type AdminUserStatus } from '@/api';
import { useDebouncedValue } from '@/shared/hooks';
import { FilterChipRow, SearchBar, type FilterChipOption, type StatusVariant } from '@/shared/ui';
import { formatCount, formatDisplayDate, formatRelativeTime, includesTerm, roleLabel } from '@/shared/utils';
import { AdminListScreen, AdminRow, SummaryTiles } from '../components';

type StatusFilter = AdminUserStatus | 'all';
const STATUS_OPTIONS: FilterChipOption<StatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];
const STATUS_VARIANT: Record<AdminUserStatus, StatusVariant> = { active: 'success', inactive: 'neutral', suspended: 'danger' };

/** Every account, newest first. Last sign-in is updated by web sign-ins only. */
export function UsersScreen() {
  const q = useAdminUsers();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim().toLowerCase());
  const [status, setStatus] = useState<StatusFilter>('all');
  const users = useMemo(() => q.data?.users ?? [], [q.data]);

  const rows = useMemo(
    () =>
      users.filter(
        (u) =>
          (status === 'all' || u.status === status) &&
          (!term ||
            includesTerm(u.displayName, term) ||
            includesTerm(u.email, term) ||
            includesTerm(u.username, term) ||
            includesTerm(u.userCode, term) ||
            includesTerm(u.branchName, term)),
      ),
    [users, status, term],
  );

  return (
    <AdminListScreen<AdminUser>
      title="Users"
      subtitle="Every account and its role. Read-only."
      data={rows}
      keyExtractor={(u) => u.id}
      renderItem={({ item }) => (
        <AdminRow
          title={item.displayName || item.username || item.email}
          lines={[
            `${item.userCode ? `${item.userCode} · ` : ''}${item.email}`,
            `${roleLabel(item.role)}${item.branchName ? ` · ${item.branchName}` : ''}`,
            item.lastLoginAt ? `Last sign-in ${formatRelativeTime(item.lastLoginAt)}` : `Added ${formatDisplayDate(item.createdAt.slice(0, 10))}`,
          ]}
          badge={{ label: item.status[0].toUpperCase() + item.status.slice(1), variant: STATUS_VARIANT[item.status] ?? 'neutral' }}
        />
      )}
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      emptyTitle="No Users"
      emptyMessage={term || status !== 'all' ? 'Nothing matches this filter.' : undefined}
      header={
        <>
          {q.data ? (
            <SummaryTiles
              tiles={[
                { label: 'Accounts', value: formatCount(users.length) },
                { label: 'Active', value: formatCount(users.filter((u) => u.status === 'active').length) },
              ]}
            />
          ) : null}
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, email, ID or branch" />
          <FilterChipRow options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        </>
      }
    />
  );
}
