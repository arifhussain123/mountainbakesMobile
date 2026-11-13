import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getBusinessDate, getBusinessMonthStart, useDailySaleRecords, useGenerateDailySaleRecord } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { openDrawer, Routes, type ClosingStackParamList } from '@/navigation';
import { tintFill, type PastelTone, useAppTheme } from '@/shared/theme';
import {
  AccentFill,
  AppHeader,
  DateRangeSheet,
  EmptyState,
  ErrorState,
  type FilterChipOption,
  FilterChipRow,
  FormBottomSheet,
  Icon,
  type IconName,
  InfoBanner,
  LoadingSkeleton,
  MiniStat,
  Screen,
  SearchBar,
  StatCard,
} from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime, type DateRange } from '@/shared/utils';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { DailySaleDifferenceCard, DailySaleHeroCard, DailySaleRecordCard, DailySaleSortSheet, DAILY_SALE_SORT_DIRECTION, formatDifferenceAmount, type DailySaleSortField } from '../../components';
import { dailySaleAllBeforeStartEmpty, dailySaleBeforeStartNotice, resolveDailySaleWindow } from '../../dailySaleWindow';
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

/** "01–12 Oct" when the range sits in one month, else "01 Oct – 12 Nov". */
function formatRangeLabel(from: string, to: string): string {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return `${from} – ${to}`;
  const fromDay = String(fromDate.getDate()).padStart(2, '0');
  const toDay = String(toDate.getDate()).padStart(2, '0');
  const fromMonth = fromDate.toLocaleDateString('en-US', { month: 'short' });
  const toMonth = toDate.toLocaleDateString('en-US', { month: 'short' });
  if (fromMonth === toMonth && fromDate.getFullYear() === toDate.getFullYear()) {
    return `${fromDay}–${toDay} ${toMonth}`;
  }
  return `${fromDay} ${fromMonth} – ${toDay} ${toMonth}`;
}

/** The redesign's small `btn(…, 'sm')`: 38pt, icon + label — saffron gradient when `primary`, white outlined otherwise. */
function SmallButton({
  label,
  icon,
  primary,
  disabled,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  icon: IconName;
  primary?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const ink = primary ? theme.colors.primaryText : theme.colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallButton,
        primary
          ? { backgroundColor: theme.colors.primary, borderWidth: 0 }
          : { backgroundColor: theme.isDark ? 'transparent' : theme.colors.surface, borderColor: theme.colors.border },
        { opacity: disabled ? 0.6 : pressed ? 0.85 : 1 },
      ]}>
      {primary ? <AccentFill borderRadius={14} /> : null}
      <Icon name={icon} size={18} color={ink} />
      <Text style={[styles.smallButtonText, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
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
  // Opens on the current month so far (1st → today), as the web's Daily Sale
  // Record does. The record starts on 1 Sep 2026: earlier days are never
  // requested, and a window lying wholly before it requests nothing.
  const [dateRange, setDateRange] = useState<DateRange>(() => ({ from: getBusinessMonthStart(), to: today }));
  const dsrWindow = resolveDailySaleWindow(dateRange);

  const { data, isLoading, error, refetch, isRefetching } = useDailySaleRecords(
    { from: dsrWindow.queryFrom, to: dsrWindow.to },
    { enabled: !dsrWindow.allBeforeStart },
  );
  const generate = useGenerateDailySaleRecord();

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

  const openManualFeed = (businessDate: string) => {
    setManualFeedDate(businessDate);
    manualFeedSheetRef.current?.present();
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

  const isGeneratingToday = generatingDate === today;
  const offlineFill = theme.isDark ? theme.colors.cardFill : '#EEF0F8';

  const tiles = summary
    ? [
        { label: 'Cash', value: summary.cash },
        { label: 'Easypaisa', value: summary.easypaisa },
        { label: 'Foodpanda', value: summary.foodpanda },
        { label: 'Bank', value: summary.bank },
        { label: 'Expense', value: summary.cashExpense },
        { label: 'Discount', value: summary.discount },
      ]
    : [];

  return (
    <Screen>
      <AppHeader
        title="Daily Sale Record"
        subtitle="The day's takings against what was physically counted."
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.businessDate}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.grid2}>
              <SmallButton
                label={isGeneratingToday ? 'Generating…' : 'Generate today'}
                icon="refresh"
                primary
                disabled={isGeneratingToday}
                accessibilityLabel={`Generate today (${today})`}
                onPress={() => handleGenerate(today)}
              />
              <SmallButton label="Manual feed" icon="pencil" onPress={() => openManualFeed(today)} accessibilityLabel="Manual feed for today" />
            </View>
            <Text style={[styles.xs, { color: theme.colors.textFaint, marginTop: -8 }]}>Sales and expenses are never changed by this screen.</Text>

            {showingCache ? (
              <View style={[styles.offlinePill, { backgroundColor: offlineFill }]}>
                <Text style={[styles.xs, { color: theme.colors.textSecondary }]}>
                  Offline · Last updated {formatDisplayTime(new Date(cached!.updatedAt).toISOString())}
                </Text>
              </View>
            ) : null}

            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error && !showingCache ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}

            {summary ? (
              <>
                <DailySaleHeroCard
                  rangeLabel={formatRangeLabel(rangeFrom, rangeTo)}
                  totalSale={summary.totalSale}
                  companyShare={aggregates.companyShare}
                  branchShare={aggregates.branchShare}
                  cashOnTable={aggregates.cashOnTable}
                />

                <View style={styles.tiles}>
                  {[tiles.slice(0, 3), tiles.slice(3, 6)].map((row, r) => (
                    <View key={`row-${r}`} style={styles.tileRow}>
                      {row.map((t, i) => (
                        <StatCard key={t.label} label={t.label} value={formatCurrency(t.value)} tone={((r * 3 + i) % 5) as PastelTone} />
                      ))}
                    </View>
                  ))}
                </View>

                <DailySaleDifferenceCard difference={summary.difference} />

                {summary.difference !== 0 ? (
                  <Pressable accessibilityRole="button" onPress={() => setQuickFilter('hasDifference')}>
                    <InfoBanner kind="bad">
                      <Text style={[styles.bannerText, { color: theme.colors.danger }]}>
                        This window is out by <Text style={styles.bold}>{formatDifferenceAmount(summary.difference)}</Text>. Open each day with a
                        difference and check it against the counted amount.
                      </Text>
                    </InfoBanner>
                  </Pressable>
                ) : null}
                {summary.uncounted > 0 ? (
                  <Pressable accessibilityRole="button" onPress={() => setQuickFilter('notCounted')}>
                    <InfoBanner kind="warn">
                      {`${summary.uncounted} day${summary.uncounted === 1 ? ' has' : 's have'} nothing counted yet, so the Difference covers only the days that do.`}
                    </InfoBanner>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {dsrWindow.beforeStart ? (
              <InfoBanner kind="info">
                <Text style={[styles.bannerText, { color: theme.colors.info }]}>
                  <Text style={styles.bold}>{dailySaleBeforeStartNotice().title}</Text> {dailySaleBeforeStartNotice().body}
                </Text>
              </InfoBanner>
            ) : null}

            <SearchBar value={search} onChangeText={setSearch} placeholder="Search by date or status…" />

            <View style={styles.chipRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Date range ${dateRangeLabel}. Change`}
                onPress={() => dateRangeSheetRef.current?.present()}
                style={[styles.toolChip, styles.grow, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardFill }]}>
                <Icon name="calendar" size={16} color={theme.colors.textFaint} />
                <Text style={[styles.toolChipText, { color: theme.colors.text }]} numberOfLines={1}>
                  {dateRangeLabel}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => sortSheetRef.current?.present()}
                style={[styles.toolChip, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardFill }]}>
                <Icon name="sort" size={16} color={theme.colors.textFaint} />
                <Text style={[styles.toolChipText, { color: theme.colors.text }]}>Sort</Text>
              </Pressable>
            </View>

            <FilterChipRow options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
            <View style={{ marginTop: -8 }}>
              <FilterChipRow options={quickFilterOptions} value={quickFilter} onChange={setQuickFilter} />
            </View>
          </View>
        }
        ListEmptyComponent={
          dsrWindow.allBeforeStart ? (
            <EmptyState {...dailySaleAllBeforeStartEmpty()} />
          ) : !isLoading && !error ? (
            <EmptyState title="No Records" message="Count today's business day to get started." />
          ) : undefined
        }
        renderItem={({ item }) => (
          <DailySaleRecordCard
            record={item}
            isGenerating={generatingDate === item.businessDate}
            onGenerate={() => handleGenerate(item.businessDate)}
            onOpenManualFeed={() => openManualFeed(item.businessDate)}
            onOpenDetail={() => navigation.navigate(Routes.DAILY_SALE_DETAIL, { businessDate: item.businessDate })}
          />
        )}
        ListFooterComponent={
          filteredRecords.length > 0 ? (
            <View style={styles.footer}>
              <View style={[styles.tint, { backgroundColor: tintFill(theme) }]}>
                <View style={styles.tintRow}>
                  <MiniStat label="Total sale" value={formatCurrency(aggregates.totalSale)} />
                  <MiniStat label="Company share" value={formatCurrency(aggregates.companyShare)} />
                </View>
                <View style={styles.tintRow}>
                  <MiniStat label="Cash on table" value={formatCurrency(aggregates.cashOnTable)} />
                  <MiniStat label="Discount" value={formatCurrency(aggregates.discount)} />
                </View>
              </View>
              <Text style={[styles.sm, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
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
        subtitle={manualFeedDate ? formatDisplayDate(manualFeedDate) : undefined}
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
