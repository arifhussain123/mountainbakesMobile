import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useFinanceDashboardRecords } from '@/api';
import type { FinanceDashboardRecord } from '@/api/types';
import { colors as fin } from '@/finance/theme';
import type { FinanceHomeStackParamList } from '@/navigation';
import { useTabBarHeight } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useDebouncedValue } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils/formatters';
import { formatMoney2, moneyWords } from '../../utils/financeFormat';
import { METRIC_INFO } from '../../utils/dashboardModel';

const PAGE_SIZE = 25;

/**
 * The source records behind one dashboard figure — the web's RecordsDrawer as
 * a pushed screen. "Tap a day / a branch for its demand" lands here on the
 * Company Share records (the demands that make it up). 25 a page, as the web
 * pages it; the total is the server's sum over every matching record.
 */
export function FinanceDashboardRecordsScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const { params } = useRoute<RouteProp<FinanceHomeStackParamList, 'FinanceDashboardRecords'>>();
  const { target, dashboardBranchId } = params;
  const info = METRIC_INFO[target.metric];
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);

  // undefined = follow the dashboard's branch filter; null = unassigned only.
  const branchId = target.branchId === undefined ? dashboardBranchId ?? undefined : target.branchId ?? undefined;
  const records = useFinanceDashboardRecords({
    metric: target.metric,
    from: target.from,
    to: target.to,
    branchId,
    noBranch: target.branchId === null ? true : undefined,
    ledgerHeadId: target.ledgerHeadId,
    search: q.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const data = records.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const renderItem = ({ item }: { item: FinanceDashboardRecord }) => (
    <View
      accessible
      accessibilityLabel={`${info.refLabel} ${item.reference ?? 'none'}, ${formatDisplayDate(item.date)}, ${item.branchName ?? 'Company'}, ${item.status}, ${moneyWords(item.amount)}`}
      style={[styles.row, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.md }]}>
      <View style={styles.rowHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.ref, { color: theme.colors.text }]}>
            {item.reference ?? '—'}
          </Text>
          <Text numberOfLines={1} style={[styles.sub, { color: theme.colors.textSecondary }]}>
            {formatDisplayDate(item.date)} · {item.branchName ?? 'Company / unassigned'}
          </Text>
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.amount, { color: theme.colors.text }]}>
          {formatMoney2(item.amount)}
        </Text>
      </View>
      {item.detail ? (
        <Text numberOfLines={2} style={[styles.sub, { color: theme.colors.text, marginTop: 4 }]}>
          {item.detail}
        </Text>
      ) : null}
      <Text numberOfLines={1} style={[styles.meta, { color: theme.colors.textFaint }]}>
        {item.source} · {item.status}
        {item.createdBy ? ` · by ${item.createdBy}` : ''}
        {item.approvedBy ? ` · approved ${item.approvedBy}` : ''}
      </Text>
    </View>
  );

  return (
    <Screen>
      <AppHeader title={info.title} subtitle={target.context} />
      <FlatList
        data={data?.rows ?? []}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0, paddingBottom: theme.spacing.lg + tabBarHeight, gap: theme.spacing.sm }}
        refreshing={records.isRefetching}
        onRefresh={() => void records.refetch()}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
            <Text style={[styles.rule, { color: theme.colors.textSecondary }]}>{info.rule}</Text>
            <SearchBar
              value={search}
              onChangeText={(t) => {
                setSearch(t);
                setPage(1);
              }}
              placeholder="Search reference, branch or detail"
            />
            {data ? (
              <View style={[styles.total, { backgroundColor: fin.navyCard, borderRadius: theme.radii.md }]} accessible accessibilityLabel={`${data.total} records, total ${moneyWords(data.amount)}`}>
                <Text style={[styles.totalLabel, { color: '#D9D2F5' }]}>
                  {data.total} {data.total === 1 ? 'RECORD' : 'RECORDS'} · TOTAL
                </Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.totalValue, { color: fin.text }]}>
                  {formatMoney2(data.amount)}
                </Text>
              </View>
            ) : null}
            {records.isLoading ? <LoadingSkeleton height={240} /> : null}
            {records.error && !data ? <ErrorState message={mapErrorToMessage(records.error)} onRetry={() => void records.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={data && !records.isLoading ? <EmptyState title="No Records" message={q ? 'Nothing matches this search.' : 'No source records for this figure.'} /> : undefined}
        ListFooterComponent={
          data && pages > 1 ? (
            <View style={styles.pager}>
              <Pressable accessibilityRole="button" disabled={page <= 1} onPress={() => setPage((p) => p - 1)} style={[styles.pageBtn, { borderColor: theme.colors.cardBorder, opacity: page <= 1 ? 0.4 : 1 }]}>
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Previous</Text>
              </Pressable>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                Page {page} of {pages}
              </Text>
              <Pressable accessibilityRole="button" disabled={page >= pages} onPress={() => setPage((p) => p + 1)} style={[styles.pageBtn, { borderColor: theme.colors.cardBorder, opacity: page >= pages ? 0.4 : 1 }]}>
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>Next</Text>
              </Pressable>
            </View>
          ) : undefined
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rule: { fontSize: 12 },
  row: { borderWidth: 1, padding: 12 },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ref: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  meta: { fontSize: 11, marginTop: 6 },
  amount: { fontSize: 14, fontWeight: '800', maxWidth: '45%', fontVariant: ['tabular-nums'] },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12 },
  totalLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  totalValue: { fontSize: 16, fontWeight: '800', flexShrink: 1, fontVariant: ['tabular-nums'] },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  pageBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
});
