import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFinanceDashboardRecords } from '@/api';
import type { FinanceDashboardRecord } from '@/api/types';
import { FINANCE_METRIC_INFO, formatMoney2, type FinanceDrillTarget } from '@/features/finance';
import { mapErrorToMessage } from '@/shared/helpers';
import { useDebouncedValue } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { EmptyState, ErrorState, Icon, LoadingSkeleton, SearchBar } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { SmallButton } from './parts';

const PAGE_SIZE = 25;

/**
 * The source records behind one dashboard figure — the web's RecordsDrawer as
 * a full-screen sheet over the Dashboard tab (which has no stack to push the
 * Finance role's records screen onto). Same request, same 25 a page; the
 * total is the server's sum over every matching record.
 */
export function RecordsSheet({ target, dashboardBranchId, onClose }: { target: FinanceDrillTarget | null; dashboardBranchId: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!target} animationType="slide" onRequestClose={onClose}>
      {target ? <RecordsBody key={JSON.stringify(target)} target={target} dashboardBranchId={dashboardBranchId} onClose={onClose} /> : null}
    </Modal>
  );
}

function RecordsBody({ target, dashboardBranchId, onClose }: { target: FinanceDrillTarget; dashboardBranchId: string | null; onClose: () => void }) {
  const theme = useAppTheme();
  const info = FINANCE_METRIC_INFO[target.metric];
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
    <View style={[styles.row, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.md }]}>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.header, { paddingHorizontal: theme.spacing.lg }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, fontWeight: '700' }]}>{info.title}</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{target.context}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
          <Icon name="close" color={theme.colors.text} />
        </Pressable>
      </View>
      <FlatList
        data={data?.rows ?? []}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0, gap: theme.spacing.sm }}
        refreshing={records.isRefetching}
        onRefresh={() => void records.refetch()}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{info.rule}</Text>
            <SearchBar
              value={search}
              onChangeText={(t) => {
                setSearch(t);
                setPage(1);
              }}
              placeholder="Search reference, branch or detail"
            />
            {data ? (
              <View style={[styles.total, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
                <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>
                  {data.total} {data.total === 1 ? 'RECORD' : 'RECORDS'} · TOTAL
                </Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.totalValue, { color: theme.colors.text }]}>
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
              <SmallButton label="Previous" onPress={() => setPage((p) => Math.max(1, p - 1))} />
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                Page {page} of {pages}
              </Text>
              <SmallButton label="Next" onPress={() => setPage((p) => Math.min(pages, p + 1))} />
            </View>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  row: { borderWidth: 1, padding: 12 },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ref: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  meta: { fontSize: 11, marginTop: 6 },
  amount: { fontSize: 14, fontWeight: '800', maxWidth: '45%', fontVariant: ['tabular-nums'] },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, borderWidth: 1 },
  totalLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  totalValue: { fontSize: 16, fontWeight: '800', flexShrink: 1, fontVariant: ['tabular-nums'] },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
});
