import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getBusinessDate, getBusinessMonthStart, useAdminGenerateDailySaleRecord, useBranches, useDailySaleRecords, type DailySaleRecord } from '@/api';
import { openDrawer, Routes, type SuperAdminDailySaleStackParamList } from '@/navigation';
import { dailySaleAllBeforeStartEmpty, dailySaleBeforeStartNotice, resolveDailySaleWindow } from '@/features/closing/dailySaleWindow';
import { KpiGrid, type KpiItem } from '@/features/reports/components';
import { useAppTheme } from '@/shared/theme';
import { mapErrorToMessage } from '@/shared/helpers';
import {
  AppHeader,
  Card,
  DateRangeSheet,
  Dropdown,
  EmptyState,
  ErrorState,
  Icon,
  LoadingSkeleton,
  Screen,
  SearchBar,
  type DropdownOption,
} from '@/shared/ui';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { FieldGrid, type FieldGridItem } from '../components';
import { canGenerateToday, findTodayRow } from '../utils/dailySaleActions';
import { useDailySaleSheet } from './DailySale/dailySaleSheets';
import {
  ActionChip,
  DAILY_SALE_MAX_WINDOW_DAYS,
  DSR_STATUS_LABEL,
  DifferenceBadge,
  DsrStatusBadge,
  Notice,
  daysBetween,
  displayDate,
  money,
  paisaMoney,
  rowDifference,
} from './DailySale/dailySaleBits';

const ALL = 'all';

type Nav = NativeStackNavigationProp<SuperAdminDailySaleStackParamList>;

/** The figure columns, in the web table's order (columns.tsx) — the row card and the totals card share them. */
function figureItems(r: Pick<DailySaleRecord, 'autoTotalSale' | 'companyShare' | 'autoCash' | 'autoEasypaisa' | 'autoFoodpanda' | 'autoBank' | 'cashExpense' | 'expectedCashInHand' | 'discount' | 'branchShare'>, colors: { danger: string; success: string }): FieldGridItem[] {
  return [
    { label: 'Total Sale', value: money(r.autoTotalSale), valueStyle: { fontWeight: '700' } },
    { label: 'Company Share', value: paisaMoney(r.companyShare), valueStyle: { color: colors.danger, fontWeight: '700' } },
    { label: 'Cash', value: money(r.autoCash) },
    { label: 'Easypaisa', value: money(r.autoEasypaisa) },
    { label: 'Foodpanda', value: money(r.autoFoodpanda) },
    { label: 'Bank', value: money(r.autoBank) },
    { label: 'Cash Expense', value: money(r.cashExpense) },
    { label: 'Cash on Table', value: money(r.expectedCashInHand), valueStyle: { fontWeight: '700' } },
    { label: 'Discount', value: money(r.discount) },
    { label: 'Branch Share', value: paisaMoney(r.branchShare), valueStyle: { color: colors.success, fontWeight: '700' } },
  ];
}

/**
 * Super Admin → Daily Sale Records (web /daily-sale-records, `DailySaleRecordPage admin`).
 * The day's takings per payment method against what was counted, for every
 * branch or one. Every figure — rows, tiles, notices — is the server's
 * (`GET /daily-sale-records`); the only sums here are the filtered rows'
 * totals, which the web table also adds in its footer.
 *
 * Actions (the web's): Manual Entry Locks for the picked branch, Generate
 * Today while today has no record, Manual Feed for today, and Generate on a
 * day with sales but no stored record. Verify / Lock / Unlock / Amend live on
 * the record's View screen. Print stays on the web.
 */
export function AdminDailySaleScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<Nav>();
  const rangeSheetRef = useRef<BottomSheetModal>(null);

  const today = getBusinessDate();
  const [range, setRange] = useState(() => ({ from: getBusinessMonthStart(), to: today }));
  const [branchId, setBranchId] = useState<string>(ALL);
  const [search, setSearch] = useState('');

  const branchesQ = useBranches();
  const generate = useAdminGenerateDailySaleRecord();
  const sheet = useDailySaleSheet();
  const branchOptions = useMemo<DropdownOption[]>(
    () => [{ value: ALL, label: 'All branches' }, ...(branchesQ.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [branchesQ.data],
  );

  const win = resolveDailySaleWindow(range);
  const windowTooWide = !win.allBeforeStart && daysBetween(win.queryFrom, win.to) > DAILY_SALE_MAX_WINDOW_DAYS;
  const showBranch = branchId === ALL;

  const q = useDailySaleRecords(
    { from: win.queryFrom, to: win.to, ...(branchId === ALL ? {} : { branchId }) },
    { enabled: !windowTooWide && !win.allBeforeStart },
  );
  const fetching = !windowTooWide && !win.allBeforeStart;
  const summary = fetching ? q.data?.summary : undefined;
  const isLoading = fetching && q.isLoading;

  // Client search over the rows on show, as the web table's search box does.
  const records = useMemo(() => {
    const all = fetching ? (q.data?.records ?? []) : [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter((r) =>
      [displayDate(r.businessDate), r.businessDate, r.branchName, DSR_STATUS_LABEL[r.status], r.status]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [fetching, q.data, search]);

  const totals = useMemo(() => {
    const sum = (pick: (r: DailySaleRecord) => number) =>
      Math.round(records.reduce((s, r) => s + (Number.isFinite(pick(r)) ? pick(r) : 0), 0) * 100) / 100;
    return {
      autoTotalSale: sum((r) => r.autoTotalSale),
      companyShare: sum((r) => r.companyShare),
      autoCash: sum((r) => r.autoCash),
      autoEasypaisa: sum((r) => r.autoEasypaisa),
      autoFoodpanda: sum((r) => r.autoFoodpanda),
      autoBank: sum((r) => r.autoBank),
      cashExpense: sum((r) => r.cashExpense),
      expectedCashInHand: sum((r) => r.expectedCashInHand),
      discount: sum((r) => r.discount),
      branchShare: sum((r) => r.branchShare),
    };
  }, [records]);

  const tiles: KpiItem[] = [
    { id: 'total', label: 'Total Sale', value: money(summary?.totalSale ?? 0), icon: 'cart' },
    { id: 'cash', label: 'Cash', value: money(summary?.cash ?? 0), icon: 'banknote' },
    { id: 'easypaisa', label: 'Easypaisa', value: money(summary?.easypaisa ?? 0), icon: 'wallet' },
    { id: 'foodpanda', label: 'Foodpanda', value: money(summary?.foodpanda ?? 0), icon: 'orders' },
    { id: 'bank', label: 'Bank', value: money(summary?.bank ?? 0), icon: 'bank' },
    { id: 'cashExpense', label: 'Cash Expense', value: money(summary?.cashExpense ?? 0), icon: 'receipt' },
    { id: 'discount', label: 'Discount', value: money(summary?.discount ?? 0), icon: 'percent' },
    {
      id: 'difference',
      label: 'Difference',
      value: money(summary?.difference ?? 0),
      icon: summary && summary.difference === 0 ? 'check' : 'scales',
      valueColor: summary && summary.difference === 0 ? theme.colors.success : theme.colors.danger,
    },
  ];

  const effectiveBranchId = branchId === ALL ? null : branchId;
  const branchName = (branchesQ.data?.branches ?? []).find((b) => b.id === effectiveBranchId)?.name ?? null;
  const todayRow = findTodayRow(fetching ? (q.data?.records ?? []) : [], today, effectiveBranchId);
  const showGenerateToday = canGenerateToday(todayRow, effectiveBranchId, win.to, today);

  const runGenerate = (businessDate: string, forBranch: string) => {
    generate.mutate(
      { businessDate, branchId: forBranch },
      {
        onSuccess: () => Alert.alert('Generated', 'Record generated from the day’s sales.'),
        onError: (e) => Alert.alert('Could Not Generate the Record', mapErrorToMessage(e)),
      },
    );
  };

  const feedToday = () => {
    if (todayRow) {
      sheet.open({ kind: 'feed', record: todayRow });
      return;
    }
    // No row for today means no sales and no record yet — nothing to reconcile against.
    Alert.alert('No Sales Today', 'There are no sales recorded for today yet.');
  };

  const before = dailySaleBeforeStartNotice();
  const allBefore = dailySaleAllBeforeStartEmpty();
  const colors = { danger: theme.colors.danger, success: theme.colors.success };

  const header = (
    <View style={{ gap: 10, marginBottom: theme.spacing.sm }}>
      <Card style={{ gap: 10, padding: theme.spacing.md }}>
        <View style={styles.dateRow}>
          {(['from', 'to'] as const).map((side) => (
            <Pressable
              key={side}
              accessibilityRole="button"
              accessibilityLabel={`${side === 'from' ? 'From' : 'To'} date, ${formatDisplayDate(range[side])}`}
              onPress={() => rangeSheetRef.current?.present()}
              style={[styles.dateField, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{side === 'from' ? 'From' : 'To'}</Text>
              <View style={styles.dateValue}>
                <Icon name="calendar" size={13} color={theme.colors.primary} />
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{formatDisplayDate(range[side])}</Text>
              </View>
            </Pressable>
          ))}
        </View>
        <View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 4 }]}>Branch</Text>
          <Dropdown options={branchOptions} value={branchId} onChange={setBranchId} placeholder="All branches" loading={branchesQ.isLoading} />
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by date, branch or status…" />
      </Card>

      <View style={styles.actions}>
        <ActionChip icon="lock" label="Manual Entry Locks" onPress={() => sheet.open({ kind: 'locks', branchId: effectiveBranchId, branchName })} />
        {showGenerateToday && effectiveBranchId ? (
          <ActionChip
            icon="refresh"
            label={generate.isPending ? 'Generating…' : 'Generate Today'}
            onPress={() => runGenerate(today, effectiveBranchId)}
            disabled={generate.isPending}
          />
        ) : null}
        <ActionChip icon="plus" label="Manual Feed" primary onPress={feedToday} disabled={!todayRow && !effectiveBranchId} />
      </View>

      {fetching ? <KpiGrid items={tiles} /> : null}

      {!isLoading && summary && summary.uncounted > 0 ? (
        <Notice tone="muted">
          {`${summary.uncounted} ${summary.uncounted === 1 ? 'day has' : 'days have'} nothing counted yet, so the Difference card covers only the days that do.`}
        </Notice>
      ) : null}
      {!isLoading && summary && summary.difference !== 0 ? (
        <Notice tone="warning">
          This window is out by <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{money(summary.difference)}</Text> (
          {summary.difference < 0 ? 'short' : 'over'}). Open each day with a difference and check the figure against the counted amount.
        </Notice>
      ) : null}
      {windowTooWide ? <Notice tone="muted">{`That range is longer than ${DAILY_SALE_MAX_WINDOW_DAYS} days. Narrow it to load the records.`}</Notice> : null}
      {win.beforeStart ? (
        <Notice tone="muted" title={before.title}>
          {before.body}
        </Notice>
      ) : null}

      {isLoading ? <LoadingSkeleton height={180} /> : null}
      {fetching && q.error ? <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
    </View>
  );

  const renderItem = ({ item }: { item: DailySaleRecord }) => {
    const hasRecord = item.id !== null;
    return (
      <Pressable
        accessibilityRole={hasRecord ? 'button' : undefined}
        disabled={!hasRecord}
        onPress={() => item.id && navigation.navigate(Routes.SUPER_ADMIN_DAILY_SALE_DETAIL, { recordId: item.id })}>
        <Card style={{ padding: 14 }}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{displayDate(item.businessDate)}</Text>
              {showBranch ? (
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                  {item.branchName}
                </Text>
              ) : null}
              <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 2 }]}>
                Generated {item.generatedAt ? formatDisplayTime(item.generatedAt) || '—' : '—'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <DsrStatusBadge status={item.status} />
              <DifferenceBadge difference={rowDifference(item)} />
            </View>
          </View>
          <FieldGrid items={figureItems(item, colors)} />
          <View style={[styles.cardFoot, { borderTopColor: theme.colors.border }]}>
            {hasRecord ? (
              <>
                <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>View record</Text>
                <Icon name="chevron-right" size={14} color={theme.colors.primary} />
              </>
            ) : (
              <View style={styles.genRow}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1 }]}>No record — this day has sales but no stored record yet.</Text>
                <ActionChip icon="refresh" label="Generate" onPress={() => runGenerate(item.businessDate, item.branchId)} disabled={generate.isPending} />
              </View>
            )}
          </View>
        </Card>
      </Pressable>
    );
  };

  const emptyComponent = (() => {
    if (win.allBeforeStart) return <EmptyState title={allBefore.title} message={allBefore.message} />;
    if (!fetching || isLoading || q.error) return undefined;
    return search.trim() ? (
      <EmptyState title="No matching records" message="Try a different date, branch or status." />
    ) : (
      <EmptyState title="No records" message="Days with sales in this window appear here." />
    );
  })();

  return (
    <Screen>
      <AppHeader
        title="Daily Sale Records"
        subtitle="The day's takings against what was physically counted. Sales and expenses are never changed by this screen."
        actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <FlatList
        data={isLoading || (fetching && q.error) ? [] : records}
        keyExtractor={(r) => `${r.branchId}:${r.businessDate}`}
        renderItem={renderItem}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 8 }}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyComponent}
        ListFooterComponent={
          records.length > 0 ? (
            <Card style={{ padding: 14, marginTop: 4 }}>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>
                Totals · {records.length} {records.length === 1 ? 'row' : 'rows'}
              </Text>
              <FieldGrid items={figureItems(totals, colors)} />
            </Card>
          ) : undefined
        }
        refreshing={fetching && q.isRefetching}
        onRefresh={() => {
          if (fetching) void q.refetch();
        }}
        initialNumToRender={8}
        windowSize={7}
      />
      <DateRangeSheet
        ref={rangeSheetRef}
        today={today}
        value={range}
        onApply={(next) => {
          // To never runs past today; From never past To (the web's date inputs' min/max).
          const to = next.to > today ? today : next.to;
          setRange({ from: next.from > to ? to : next.from, to });
        }}
        onRequestClose={() => rangeSheetRef.current?.dismiss()}
      />
      {sheet.element}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  dateValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
