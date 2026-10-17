import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getBusinessDate, useDailySaleRecords, useGenerateDailySaleRecord, useVerifyDailySaleRecord } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { openDrawer, Routes, type ClosingStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  Card,
  DateRangeSheet,
  EmptyState,
  ErrorState,
  FilterChipRow,
  FormBottomSheet,
  Icon,
  LoadingSkeleton,
  PillButton,
  Screen,
  SearchBar,
  type FilterChipOption,
} from '@/shared/ui';
import { formatCurrency, formatDisplayTime, type DateRange } from '@/shared/utils';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import {
  DailySaleDifferenceCard,
  DailySaleHeroCard,
  DailySaleRecordCard,
  DailySaleSortSheet,
  DAILY_SALE_SORT_DIRECTION,
  formatDifferenceAmount,
  type DailySaleSortField,
} from '../../components';
import { ManualFeedSheetContent } from '../ManualFeedScreen';
import { styles } from './styles';
import type { DailySaleRecord, DailySaleRecordStatus } from '@/api';

type StatusFilter = 'all' | 'open' | 'pending_verification' | 'verified';
type QuickFilter = 'all' | 'hasDifference' | 'notCounted';

interface DailySaleCachePayload {
  records: DailySaleRecord[];
}

/** A record exists and has at least one counted channel — Foodpanda is never counted, so it's deliberately excluded from this check. */
function hasCount(r: DailySaleRecord): boolean {
  return r.id !== null && (r.manualCash !== null || r.manualEasypaisa !== null || r.manualBank !== null);
}

/** "Verified" groups every post-review state (verified/locked/amended) — a branch doesn't need to distinguish those three, only "still mine to act on" vs "done". */
function matchesStatusFilter(r: DailySaleRecord, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'verified') return r.status === 'verified' || r.status === 'locked' || r.status === 'amended';
  return r.status === filter;
}

const STATUS_RANK: Record<DailySaleRecordStatus, number> = { open: 0, pending_verification: 1, verified: 2, locked: 3, amended: 4 };

const STATUS_OPTIONS: FilterChipOption<StatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'pending_verification', label: 'Pending Verification' },
  { value: 'verified', label: 'Verified' },
];

const TILE_DOTS = ['#FF6B35', '#34C38A', '#5A8DEE', '#F5B800', '#FF5A5F', '#8A7A6D'];

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "01–12 OCT" when the range sits in one month, else "01 OCT – 12 NOV". */
function formatRangeLabel(from: string, to: string): string {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return `${from} – ${to}`;
  const fromDay = String(fromDate.getDate()).padStart(2, '0');
  const toDay = String(toDate.getDate()).padStart(2, '0');
  const fromMonth = fromDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const toMonth = toDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  if (fromMonth === toMonth && fromDate.getFullYear() === toDate.getFullYear()) {
    return `${fromDay}–${toDay} ${toMonth}`;
  }
  return `${fromDay} ${fromMonth} – ${toDay} ${toMonth}`;
}

/** branchApp.md screen 21 — Daily Sale Record: takings against what was physically counted. */
export function DailySaleRecordListScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const navigation = useNavigation<NativeStackNavigationProp<ClosingStackParamList>>();
  const manualFeedSheetRef = useRef<BottomSheetModal>(null);
  const dateRangeSheetRef = useRef<BottomSheetModal>(null);
  const sortSheetRef = useRef<BottomSheetModal>(null);
  const [generatingDate, setGeneratingDate] = useState<string | null>(null);
  const [manualFeedDate, setManualFeedDate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [sortField, setSortField] = useState<DailySaleSortField>('date');

  const today = getBusinessDate();
  // Defaults mirror the backend's own "last 30 business days ending today" window (dailySaleService.ts).
  const [dateRange, setDateRange] = useState<DateRange>(() => ({ from: shiftDate(today, -29), to: today }));

  const { data, isLoading, error, refetch, isRefetching } = useDailySaleRecords({ from: dateRange.from, to: dateRange.to });
  const generate = useGenerateDailySaleRecord();
  const verify = useVerifyDailySaleRecord();

  const rawRecords = useMemo(() => data?.records ?? [], [data]);

  const cacheKey = `dailySale:${dateRange.from}:${dateRange.to}`;
  const [cached, setCached] = useState<{ data: DailySaleCachePayload; updatedAt: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCachedResponse<DailySaleCachePayload>(cacheKey).then((result) => {
      if (!cancelled) setCached(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  useEffect(() => {
    if (rawRecords.length > 0) void setCachedResponse(cacheKey, { records: rawRecords });
  }, [cacheKey, rawRecords]);

  const showingCache = rawRecords.length === 0 && !isLoading && !!cached;
  const records = useMemo(() => (rawRecords.length > 0 ? rawRecords : showingCache ? cached!.data.records : []), [rawRecords, showingCache, cached]);

  const counts = useMemo(() => {
    const counted = records.filter(hasCount);
    return {
      all: records.length,
      hasDifference: counted.filter((r) => r.overallDifference !== 0).length,
      notCounted: records.filter((r) => !hasCount(r)).length,
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    let result = records.filter((r) => matchesStatusFilter(r, statusFilter));
    if (quickFilter === 'hasDifference') result = result.filter((r) => hasCount(r) && r.overallDifference !== 0);
    if (quickFilter === 'notCounted') result = result.filter((r) => !hasCount(r));
    if (term) {
      result = result.filter((r) => r.businessDate.includes(term) || r.status.replace('_', ' ').includes(term));
    }

    const dir = DAILY_SALE_SORT_DIRECTION[sortField] === 'asc' ? 1 : -1;
    return [...result].sort((a, b) => {
      let diff = 0;
      if (sortField === 'date') diff = a.businessDate < b.businessDate ? -1 : a.businessDate > b.businessDate ? 1 : 0;
      else if (sortField === 'totalSale') diff = a.autoTotalSale - b.autoTotalSale;
      else if (sortField === 'difference') diff = a.overallDifference - b.overallDifference;
      else diff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      return diff * dir;
    });
  }, [records, statusFilter, quickFilter, debouncedSearch, sortField]);

  const aggregates = useMemo(
    () =>
      filteredRecords.reduce(
        (acc, r) => ({
          totalSale: acc.totalSale + r.autoTotalSale,
          companyShare: acc.companyShare + r.companyShare,
          branchShare: acc.branchShare + r.branchShare,
          cashOnTable: acc.cashOnTable + r.expectedCashInHand,
          discount: acc.discount + r.discount,
        }),
        { totalSale: 0, companyShare: 0, branchShare: 0, cashOnTable: 0, discount: 0 },
      ),
    [filteredRecords],
  );

  const handleGenerate = (businessDate: string) => {
    setGeneratingDate(businessDate);
    generate.mutate(businessDate, {
      onError: (e) => Alert.alert('Could Not Generate', mapErrorToMessage(e)),
      onSettled: () => setGeneratingDate(null),
    });
  };

  const handleVerify = (id: string) => {
    verify.mutate(id, { onError: (e) => Alert.alert('Could Not Verify', mapErrorToMessage(e)) });
  };

  const openManualFeed = (businessDate: string) => {
    setManualFeedDate(businessDate);
    manualFeedSheetRef.current?.present();
  };

  const openOverflowMenu = () => {
    Alert.alert('More actions', undefined, [
      { text: `Generate Today (${today})`, onPress: () => handleGenerate(today) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const summary = data?.summary;
  const rangeFrom = data?.from ?? dateRange.from;
  const rangeTo = data?.to ?? dateRange.to;
  const dateRangeLabel = dateRange.from === dateRange.to ? dateRange.from : `${dateRange.from} to ${dateRange.to}`;

  const quickFilterOptions: FilterChipOption<QuickFilter>[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'hasDifference', label: 'Has difference', count: counts.hasDifference },
    { value: 'notCounted', label: 'Not counted', count: counts.notCounted },
  ];

  return (
    <Screen>
      <AppHeader
        title="Daily Sale Record"
        subtitle="Committee Chowk Branch · takings vs what was counted"
        actions={[
          ...appearanceActions,
          bellAction,
          { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' },
          { icon: 'more', onPress: openOverflowMenu, accessibilityLabel: 'More actions' },
        ]}
      />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm }}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textFaint }]}>
          Sales and expenses are never changed by this screen.
        </Text>
        <View style={{ marginTop: 10 }}>
          <PillButton label="Count today" onPress={() => openManualFeed(today)} showArrow />
        </View>
        {showingCache ? (
          <View style={[styles.offlinePill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, marginTop: 10 }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              Offline · Last updated {formatDisplayTime(new Date(cached!.updatedAt).toISOString())}
            </Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.businessDate}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error && !showingCache ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}

            {summary ? (
              <>
                <View style={{ marginTop: theme.spacing.md }}>
                  <DailySaleHeroCard
                    rangeLabel={formatRangeLabel(rangeFrom, rangeTo)}
                    totalSale={summary.totalSale}
                    companyShare={aggregates.companyShare}
                    branchShare={aggregates.branchShare}
                    cashOnTable={aggregates.cashOnTable}
                  />
                </View>

                <View style={[styles.tilesGrid, { marginTop: theme.spacing.sm }]}>
                  {(
                    [
                      { label: 'Cash', value: summary.cash },
                      { label: 'Easypaisa', value: summary.easypaisa },
                      { label: 'Foodpanda', value: summary.foodpanda },
                      { label: 'Bank', value: summary.bank },
                      { label: 'Expense', value: summary.cashExpense },
                      { label: 'Discount', value: summary.discount },
                    ] as const
                  ).map((t, i) => (
                    <View
                      key={t.label}
                      style={[
                        styles.tile,
                        { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.lg, padding: 11 },
                      ]}>
                      <View style={styles.tileDotRow}>
                        <View style={[styles.tileDot, { backgroundColor: TILE_DOTS[i] }]} />
                        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{t.label}</Text>
                      </View>
                      <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 4 }]}>{formatCurrency(t.value)}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ marginTop: theme.spacing.sm }}>
                  <DailySaleDifferenceCard difference={summary.difference} />
                </View>
                <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 4 }]}>Counted days only.</Text>

                <View style={{ marginTop: theme.spacing.sm, gap: 8 }}>
                  {summary.uncounted > 0 ? (
                    <View
                      style={[
                        styles.banner,
                        { backgroundColor: `${theme.colors.warning}17`, borderColor: `${theme.colors.warning}48`, borderRadius: theme.radii.md, padding: 11 },
                      ]}>
                      <Icon name="warning" size={15} color={theme.colors.warning} />
                      <Pressable onPress={() => setQuickFilter('notCounted')} style={{ flex: 1 }}>
                        <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>
                          {summary.uncounted} day{summary.uncounted === 1 ? ' has' : 's have'} nothing counted yet, so the Difference covers only
                          the days that do.
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {summary.difference !== 0 ? (
                    <View
                      style={[
                        styles.banner,
                        { backgroundColor: `${theme.colors.danger}14`, borderColor: `${theme.colors.danger}48`, borderRadius: theme.radii.md, padding: 11 },
                      ]}>
                      <Icon name="warning" size={15} color={theme.colors.danger} />
                      <Pressable onPress={() => setQuickFilter('hasDifference')} style={{ flex: 1 }}>
                        <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>
                          This window is out by{' '}
                          <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{formatDifferenceAmount(summary.difference)}</Text>.
                          Open each day with a difference and check it against the counted amount.
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            <View style={{ marginTop: theme.spacing.md }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search by date or status…" />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => dateRangeSheetRef.current?.present()}
                style={[styles.dateChip, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill, flex: 1 }]}>
                <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
                  {dateRangeLabel}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => sortSheetRef.current?.present()}
                style={[styles.dateChip, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill, flexDirection: 'row', gap: 6 }]}>
                <Icon name="bar-chart" size={12} color={theme.colors.text} />
                <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Sort</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 10 }}>
              <FilterChipRow options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
            </View>
            <View style={{ marginTop: 8 }}>
              <FilterChipRow options={quickFilterOptions} value={quickFilter} onChange={setQuickFilter} />
            </View>

            <View style={{ height: theme.spacing.sm }} />
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="No Records" message="Count today's business day to get started." /> : undefined
        }
        renderItem={({ item }) => (
          <DailySaleRecordCard
            record={item}
            isGenerating={generatingDate === item.businessDate}
            onGenerate={() => handleGenerate(item.businessDate)}
            onOpenManualFeed={() => openManualFeed(item.businessDate)}
            onOpenDetail={() => navigation.navigate(Routes.DAILY_SALE_DETAIL, { businessDate: item.businessDate })}
            onVerify={() => item.id && handleVerify(item.id)}
            isVerifying={verify.isPending}
          />
        )}
        ListFooterComponent={
          filteredRecords.length > 0 ? (
            <View>
              <Card style={[styles.aggregateCard, { marginTop: theme.spacing.sm }]}>
                <View style={styles.aggregateItem}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Total sale</Text>
                  <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 2 }]}>
                    {formatCurrency(aggregates.totalSale)}
                  </Text>
                </View>
                <View style={styles.aggregateItem}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Company share</Text>
                  <Text style={[theme.typography.cardTitle, { color: theme.colors.danger, marginTop: 2 }]}>
                    {formatCurrency(aggregates.companyShare)}
                  </Text>
                </View>
                <View style={[styles.aggregateItem, { marginTop: theme.spacing.sm }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Cash on table</Text>
                  <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 2 }]}>
                    {formatCurrency(aggregates.cashOnTable)}
                  </Text>
                </View>
                <View style={[styles.aggregateItem, { marginTop: theme.spacing.sm }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Discount</Text>
                  <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 2 }]}>
                    {formatCurrency(aggregates.discount)}
                  </Text>
                </View>
              </Card>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.md }]}>
                {filteredRecords.length} record{filteredRecords.length === 1 ? '' : 's'}
              </Text>
            </View>
          ) : undefined
        }
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <FormBottomSheet
        ref={manualFeedSheetRef}
        title="Manual Feed"
        subtitle={manualFeedDate ? manualFeedDate : undefined}
        onRequestClose={() => manualFeedSheetRef.current?.dismiss()}
        onDismiss={() => setManualFeedDate(null)}>
        {manualFeedDate ? (
          <ManualFeedSheetContent
            businessDate={manualFeedDate}
            record={records.find((r) => r.businessDate === manualFeedDate) ?? null}
            locks={data?.locks ?? []}
            onClose={() => manualFeedSheetRef.current?.dismiss()}
          />
        ) : null}
      </FormBottomSheet>

      <DateRangeSheet
        ref={dateRangeSheetRef}
        today={today}
        value={dateRange}
        onApply={setDateRange}
        onRequestClose={() => dateRangeSheetRef.current?.dismiss()}
      />

      <DailySaleSortSheet
        ref={sortSheetRef}
        value={sortField}
        onChange={setSortField}
        onRequestClose={() => sortSheetRef.current?.dismiss()}
      />
    </Screen>
  );
}
