import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getBusinessDate,
  useAllBranchesStockSummary,
  useBranchStock,
  useBranchStockHistorySeries,
  useBranches,
  type StockRow,
} from '@/api';
import { openDrawer, useTabBarHeight } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  Card,
  Dropdown,
  EmptyState,
  ErrorState,
  Icon,
  LoadingSkeleton,
  Screen,
  SearchBar,
  type DropdownOption,
} from '@/shared/ui';
import { formatCount, formatDisplayDate, formatSigned } from '@/shared/utils';
import { StockActivityCard, type HistoryDays, type StockActivityRow } from '../components/StockActivityCard';
import { addDays, filterStockRows, formatDay, toActivityFigures, totalBranchSummary } from '../utils/stockActivity';

/** The picker value meaning "every branch at once" — never a uuid, so it cannot collide with one. */
const ALL_BRANCHES = 'all';

const shortBranch = (name: string) => name.replace('Mountain Bakes ', '');

const LEDGER_COLUMNS: { key: keyof Pick<StockRow, 'opening' | 'newQty' | 'sold' | 'returned' | 'adjustment' | 'balance'>; label: string }[] = [
  { key: 'opening', label: 'Opening' },
  { key: 'newQty', label: 'New' },
  { key: 'sold', label: 'Sold' },
  { key: 'returned', label: 'Returned' },
  { key: 'adjustment', label: 'Adjustment' },
  { key: 'balance', label: 'Balance' },
];

function LedgerCard({ row }: { row: StockRow }) {
  const theme = useAppTheme();
  return (
    <Card style={{ padding: 14 }}>
      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={2}>
        {row.productName}
      </Text>
      {row.stockCode ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{row.stockCode}</Text> : null}
      <View style={styles.ledgerGrid}>
        {LEDGER_COLUMNS.map((c) => {
          const value = Number(row[c.key]) || 0;
          return (
            <View key={c.key} style={styles.ledgerCell}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{c.label}</Text>
              <Text
                style={[
                  theme.typography.bodySmall,
                  {
                    color: c.key === 'balance' && value < 0 ? theme.colors.danger : theme.colors.text,
                    fontWeight: c.key === 'balance' ? '700' : '600',
                  },
                ]}>
                {c.key === 'adjustment' ? formatSigned(value) : formatCount(value)}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/** Business date, a day at a time — no date-picker library in this app. Never past today. */
function DateStepper({ date, today, onChange }: { date: string; today: string; onChange: (date: string) => void }) {
  const theme = useAppTheme();
  const atToday = date >= today;
  return (
    <View style={[styles.stepper, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.md }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous day" onPress={() => onChange(addDays(date, -1))} style={styles.stepBtn} hitSlop={6}>
        <Icon name="chevron-left" size={16} color={theme.colors.text} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to today"
        onPress={() => onChange(today)}
        disabled={atToday}
        style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>{formatDisplayDate(date)}</Text>
        {!atToday ? <Text style={[theme.typography.label, { color: theme.colors.primary }]}>Tap for today</Text> : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next day"
        accessibilityState={{ disabled: atToday }}
        disabled={atToday}
        onPress={() => onChange(addDays(date, 1))}
        style={[styles.stepBtn, { opacity: atToday ? 0.35 : 1 }]}
        hitSlop={6}>
        <Icon name="chevron-right" size={16} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

/**
 * Super Admin → Branch Stock: the web `/stock-control` page ("Branch Stock
 * Control"), read-only. One branch: its per-product ledger for a business
 * date plus its day-by-day stock history. "All branches": each branch's stock
 * activity over the window. Editing, Add Stock and Delete stay on the web.
 */
export function AdminBranchStockScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const today = getBusinessDate();

  const branchesQ = useBranches();
  const branches = useMemo(() => branchesQ.data?.branches ?? [], [branchesQ.data]);
  const [picked, setPicked] = useState<string | null>(null);
  // First branch by default, once the list arrives — as the web does.
  const branchId = picked ?? branches[0]?.id ?? null;
  const single = !!branchId && branchId !== ALL_BRANCHES;
  const branchName = branches.find((b) => b.id === branchId)?.name ?? '';

  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  // Shared by both history views, so switching keeps the chosen window.
  const [days, setDays] = useState<HistoryDays>('7');

  const stockQ = useBranchStock(single ? branchId : null, date);
  const historyQ = useBranchStockHistorySeries(single ? branchId : null, Number(days));
  const allQ = useAllBranchesStockSummary(Number(days), branchId === ALL_BRANCHES);

  const visible = useMemo(() => filterStockRows(stockQ.data?.rows ?? [], search), [stockQ.data, search]);

  const branchOptions = useMemo<DropdownOption<string>[]>(
    () => [{ value: ALL_BRANCHES, label: 'All branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))],
    [branches],
  );

  const onRefresh = useCallback(() => {
    void branchesQ.refetch();
    if (single) {
      void stockQ.refetch();
      void historyQ.refetch();
    } else if (branchId === ALL_BRANCHES) {
      void allQ.refetch();
    }
  }, [branchesQ, stockQ, historyQ, allQ, single, branchId]);
  const refreshing = stockQ.isRefetching || historyQ.isRefetching || allQ.isRefetching;

  const historyRows = useMemo<StockActivityRow[]>(
    () => (historyQ.data?.rows ?? []).map((r) => ({ key: r.date, title: formatDay(r.date), figures: toActivityFigures(r) })),
    [historyQ.data],
  );
  const allRows = useMemo<StockActivityRow[]>(
    () =>
      (allQ.data?.rows ?? []).map((r) => ({
        key: r.branchId,
        title: shortBranch(r.branchName),
        note: r.capped ? `from ${r.from}` : undefined,
        figures: toActivityFigures(r),
      })),
    [allQ.data],
  );
  const allTotal = useMemo<StockActivityRow | undefined>(
    () => (allQ.data && allQ.data.rows.length > 0 ? { key: 'total', title: 'Total', figures: totalBranchSummary(allQ.data.rows), emphasis: true } : undefined),
    [allQ.data],
  );

  const header = (
    <View>
      <Card>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>Branch</Text>
        <Dropdown
          options={branchOptions}
          value={branchId}
          onChange={(v) => setPicked(v)}
          placeholder={branchesQ.isLoading ? 'Loading…' : 'Choose a branch'}
          loading={branchesQ.isLoading}
        />
        {single ? (
          <>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6 }]}>Business date</Text>
            <DateStepper date={date} today={today} onChange={(d) => setDate(d > today ? today : d)} />
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6 }]}>Search</Text>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Product or ID…" />
          </>
        ) : null}
      </Card>
      {branchesQ.error ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <ErrorState message={mapErrorToMessage(branchesQ.error)} onRetry={() => void branchesQ.refetch()} />
        </View>
      ) : null}
      {single ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm }]}>
          {branchName} · {date}
        </Text>
      ) : null}
      {single && stockQ.isLoading ? <LoadingSkeleton height={220} /> : null}
      {single && stockQ.error ? <ErrorState message={mapErrorToMessage(stockQ.error)} onRetry={() => void stockQ.refetch()} /> : null}
      {!branchId && !branchesQ.isLoading && !branchesQ.error ? (
        <EmptyState title="Choose a branch" message="Pick a branch to load its stock." />
      ) : null}
    </View>
  );

  const footer = single ? (
    <StockActivityCard
      title="Branch Stock History"
      subtitle="Qty and value per business day · stock valued at current prices, so Sold here is not the till total"
      days={days}
      onDaysChange={setDays}
      rows={historyRows}
      loading={historyQ.isLoading}
      error={historyQ.error}
      onRetry={() => void historyQ.refetch()}
      emptyTitle="No stock history yet"
      emptyMessage="Days appear here once stock starts moving in this branch."
      footnote={historyQ.data?.capped ? `Too much history to summarise in one read — showing from ${historyQ.data.from} onwards.` : undefined}
    />
  ) : branchId === ALL_BRANCHES ? (
    <StockActivityCard
      title="All Branches — Stock Activity"
      subtitle={`Qty and value per branch${allQ.data ? ` · ${allQ.data.from} → ${allQ.data.to}` : ''} · stock valued at current prices, so Sold here is not the till total`}
      days={days}
      onDaysChange={setDays}
      rows={allRows}
      total={allTotal}
      loading={allQ.isLoading}
      error={allQ.error}
      onRetry={() => void allQ.refetch()}
      emptyTitle="No branches"
      emptyMessage="Add an active branch and its stock activity appears here."
      footnote={
        allQ.data?.capped
          ? 'At least one branch has more history than can be summarised in one read — those rows are marked with the date they start from.'
          : undefined
      }
    />
  ) : undefined;

  const showLedger = single && !stockQ.isLoading && !stockQ.error;

  return (
    <Screen>
      <AppHeader
        title="Branch Stock Control"
        subtitle={single ? shortBranch(branchName) : branchId === ALL_BRANCHES ? 'All branches' : undefined}
        actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <FlatList
        data={showLedger ? visible : []}
        keyExtractor={(r) => r.productId}
        renderItem={({ item }) => <LedgerCard row={item} />}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg + tabBarHeight, gap: 10 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          showLedger ? (
            <EmptyState title="No products found" message={search.trim() ? 'Try a different search term.' : 'This branch has no active products.'} />
          ) : undefined
        }
        ListFooterComponent={footer}
        refreshing={refreshing}
        onRefresh={onRefresh}
        initialNumToRender={10}
        windowSize={7}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ledgerGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginTop: 10 },
  ledgerCell: { width: '33.33%', paddingRight: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 4 },
  stepBtn: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
});
