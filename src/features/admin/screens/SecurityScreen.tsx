import { useMemo, useState } from 'react';
import { getBusinessDate, useLoginSessionPages, useSuspiciousSignInCount, type LoginSessionRow } from '@/api';
import { FilterChipRow, type FilterChipOption } from '@/shared/ui';
import { formatCount, formatDisplayDate, formatDisplayTime, roleLabel } from '@/shared/utils';
import { AdminListScreen, AdminRow, SummaryTiles } from '../components';

type Filter = 'all' | 'suspicious';
const FILTER_OPTIONS: FilterChipOption<Filter>[] = [
  { value: 'all', label: 'All sign-ins' },
  { value: 'suspicious', label: 'Suspicious' },
];

/**
 * Sign-in history, newest first, with the server's suspicious flag. Only web
 * sign-ins open a session row, so phone sign-ins are not in this list.
 */
export function SecurityScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const q = useLoginSessionPages(filter === 'suspicious');
  const todayQ = useSuspiciousSignInCount(getBusinessDate());
  const sessions = useMemo(() => q.data?.pages.flatMap((p) => p.sessions) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total;

  return (
    <AdminListScreen<LoginSessionRow>
      title="Security"
      subtitle="Sign-in history (web sign-ins). Read-only."
      data={sessions}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => (
        <AdminRow
          title={item.userName || item.userEmail || 'Unknown user'}
          lines={[
            `${item.userRole ? roleLabel(item.userRole) : '—'}${item.branchName ? ` · ${item.branchName}` : ''}`,
            `${formatDisplayDate(item.loginAt.slice(0, 10))} · ${formatDisplayTime(item.loginAt)}`,
            [item.browser, item.os, item.deviceType].filter(Boolean).join(' · ') || null,
            [item.city, item.country].filter(Boolean).join(', ') || item.ipAddress,
          ]}
          badge={item.isSuspicious ? { label: 'Suspicious', variant: 'danger' } : undefined}
        />
      )}
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching && !q.isFetchingNextPage}
      onRefresh={() => {
        void q.refetch();
        void todayQ.refetch();
      }}
      onEndReached={() => {
        if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
      }}
      loadingMore={q.isFetchingNextPage}
      emptyTitle={filter === 'suspicious' ? 'No Suspicious Sign-ins' : 'No Sign-ins'}
      header={
        <>
          <SummaryTiles
            tiles={[
              { label: filter === 'suspicious' ? 'Suspicious, all time' : 'Sign-ins recorded', value: total === undefined ? '—' : formatCount(total) },
              { label: 'Suspicious today', value: todayQ.data === undefined ? '—' : formatCount(todayQ.data), tone: todayQ.data ? 'danger' : undefined },
            ]}
          />
          <FilterChipRow options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
        </>
      }
    />
  );
}
