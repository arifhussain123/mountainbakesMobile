import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getBusinessDate,
  useBranches,
  useFinanceCashTransferPages,
  useFinanceCashTransferSummary,
  useFinanceCashTransfers,
  useFinanceDailySales,
  type BranchSummary,
  type CashTransfer,
  type CashTransferMethod,
  type CashTransferStatus,
  type FinanceDailySaleDay,
} from '@/api';
import { TransferCard, TransferSummaryStrip, type TransferCardBadge } from '@/features/cash/components';
import { BranchPickerModal } from '@/features/production/components';
import { Routes, openDrawer, useTabBarHeight, type FinanceCashTransfersStackParamList } from '@/navigation';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  DateRangeSheet,
  EmptyState,
  ErrorState,
  FilterChipRow,
  Icon,
  LoadingSkeleton,
  PhotoViewer,
  SearchBar,
  Screen,
  type FilterChipOption,
} from '@/shared/ui';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatDisplayTime, resolveDateRangePreset, type DateRange } from '@/shared/utils';
import { NOTE_CHANNEL_LABEL, noteMentionsUnrecorded, parseTransferNote } from '../../utils/cashTransferNote';
import { dailySalesWindow, findShareMatch, shareMatchLabel, shortDay, submittedAt, type ShareMatch } from '../../utils/cashTransferMatch';
import { styles } from './styles';

/**
 * mountainbakesFinance.html screen 03 — Cash Transfers: Finance's review side
 * of the Branch app's Cash Deposit, across every branch.
 *
 * WHAT IS THE SERVER'S AND WHAT IS NOT. The rows, their filters and the
 * summary strip's figures are all the API's (`/api/finance/cash-transfers` and
 * its `/summary`, which take the same filters, so the strip always describes
 * exactly the list under it). The match badge is Daily Closing's own pairing
 * (`/api/finance/daily-sales`) read per card — see `cashTransferMatch.ts`. The
 * one thing worked out here is the note check, and it is labelled a hint.
 *
 * PENDING FIRST. Under "All", the undecided transfers are fetched on their own
 * (the API puts no date floor on the pending queue) and shown above the rest,
 * each with an orange edge; the paged list below skips them so none appears
 * twice.
 *
 * THE CHIPS ARE THE FILTER. Every active filter is a removable chip, and the
 * chips are built from the same state the query is — there is no "All" value
 * that still counts as a filter, which is what the web page's status chip got
 * wrong.
 */

type StatusFilter = CashTransferStatus | 'all';
type ChannelFilter = CashTransferMethod | 'all';

const STATUS_OPTIONS: FilterChipOption<StatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const CHANNEL_OPTIONS: FilterChipOption<ChannelFilter>[] = [
  { value: 'all', label: 'All channels' },
  { value: 'cash', label: 'Cash' },
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'bank_account', label: 'Bank' },
];

const STATUS_WORD: Record<CashTransferStatus, string> = { pending: 'pending', approved: 'approved', rejected: 'rejected' };
const CHANNEL_WORD: Record<CashTransferMethod, string> = { cash: 'Cash', easypaisa: 'Easypaisa', bank_account: 'Bank' };

/** Daily Closing data older than this is not fetched for badges — a long-forgotten pending row gets no match badge rather than a wrong one. */
const MATCH_WINDOW_DAYS = 92;

interface CachePayload {
  transfers: CashTransfer[];
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MATCH_VARIANT: Record<ShareMatch['kind'], TransferCardBadge['variant']> = {
  matches: 'success',
  over: 'warning',
  short: 'danger',
  none: 'neutral',
};

/** The card's spoken summary, per the brief: ID, branch, amounts by channel, fuel, status, match. */
function cardLabel(t: CashTransfer, match: ShareMatch | null, noteFlags: string[]): string {
  const channels = [
    t.cashAmount > 0 ? `${t.cashAmount.toLocaleString('en-US')} rupees cash` : null,
    t.easypaisaAmount > 0 ? `${t.easypaisaAmount.toLocaleString('en-US')} rupees Easypaisa` : null,
    t.bankAmount > 0 ? `${t.bankAmount.toLocaleString('en-US')} rupees bank` : null,
  ].filter(Boolean);
  return [
    `Transfer ${t.transferNo}`,
    t.branchName,
    channels.length > 0 ? channels.join(', ') : 'no amount',
    t.fuelCharges > 0 ? `fuel ${t.fuelCharges.toLocaleString('en-US')} separate` : null,
    STATUS_WORD[t.status],
    match ? shareMatchLabel(match).toLowerCase() : null,
    ...noteFlags.map((f) => f.toLowerCase()),
  ]
    .filter(Boolean)
    .join(', ');
}

export function FinanceCashTransfersListScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<FinanceCashTransfersStackParamList>>();
  const dateSheetRef = useRef<BottomSheetModal>(null);
  const today = getBusinessDate();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [branch, setBranch] = useState<BranchSummary | null>(null);
  const [channel, setChannel] = useState<ChannelFilter>('all');
  // null = the API's own window: the last 30 business days, and no floor at all for pending.
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search).trim();
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [photo, setPhoto] = useState<{ uri: string | null; label: string } | null>(null);

  const branches = useBranches();

  const filters = useMemo(
    () => ({
      branchId: branch?.id,
      paymentMethod: channel === 'all' ? undefined : channel,
      from: dateRange?.from,
      to: dateRange?.to,
      search: debouncedSearch || undefined,
    }),
    [branch, channel, dateRange, debouncedSearch],
  );

  const summaryQ = useFinanceCashTransferSummary({ ...filters, status: status === 'all' ? undefined : status });
  const pagesQ = useFinanceCashTransferPages({ ...filters, status: status === 'all' ? undefined : status, sortBy: 'date', sortDir: 'desc' });
  // Under "All" the API's window is the last 30 business days for every status;
  // the pending query would otherwise have no floor, so it is given the same one
  // and "All" stays exactly the rows the summary counts (and the web lists).
  const showPendingFirst = status === 'all';
  const pendingQ = useFinanceCashTransfers(
    { ...filters, from: filters.from ?? addDays(today, -29), status: 'pending', sortBy: 'date', sortDir: 'desc', limit: 200 },
    { enabled: showPendingFirst },
  );

  const pending = useMemo(() => (showPendingFirst ? (pendingQ.data?.transfers ?? []) : []), [showPendingFirst, pendingQ.data]);
  const paged = useMemo(() => {
    const rows = pagesQ.data?.pages.flatMap((p) => p.transfers) ?? [];
    return showPendingFirst ? rows.filter((t) => t.status !== 'pending') : rows;
  }, [pagesQ.data, showPendingFirst]);
  const liveRows = useMemo(() => [...pending, ...paged], [pending, paged]);

  // ── Offline: the last loaded first screenful for these filters, photos stripped
  // (their signed urls expire within the hour, so a cached one would only break).
  const cacheKey = `financeCashTransfers:${JSON.stringify({ ...filters, status })}`;
  const [cached, setCached] = useState<{ data: CachePayload; updatedAt: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getCachedResponse<CachePayload>(cacheKey).then((result) => {
      if (!cancelled) setCached(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);
  useEffect(() => {
    if (liveRows.length > 0) void setCachedResponse(cacheKey, { transfers: liveRows.slice(0, 100).map((t) => ({ ...t, attachments: [] })) });
  }, [cacheKey, liveRows]);

  const isLoading = pagesQ.isLoading || (showPendingFirst && pendingQ.isLoading);
  const error = pagesQ.error ?? (showPendingFirst ? pendingQ.error : null);
  const showingCache = liveRows.length === 0 && !isLoading && !!error && !!cached;
  const rows = showingCache ? cached!.data.transfers : liveRows;

  // ── Match badges: one Daily Closing request for the whole loaded set.
  const salesWindow = useMemo(() => {
    const w = dailySalesWindow(rows);
    if (!w) return null;
    const floor = addDays(w.to, -MATCH_WINDOW_DAYS);
    return { from: w.from < floor ? floor : w.from, to: w.to, ...(branch ? { branchId: branch.id } : {}) };
  }, [rows, branch]);
  const salesQ = useFinanceDailySales(showingCache ? null : salesWindow);
  const salesDays: FinanceDailySaleDay[] | undefined = salesQ.data?.records;
  // A transfer can pay for a day up to two before its own; below this date the
  // data does not reach far enough back to say "no share found" honestly.
  const coveredFrom = salesWindow ? addDays(salesWindow.from, 2) : null;

  const hasActiveFilters = status !== 'all' || !!branch || channel !== 'all' || !!dateRange || !!debouncedSearch;
  const activeChips: { key: string; label: string; clear: () => void }[] = [
    ...(status !== 'all' ? [{ key: 'status', label: `Status: ${STATUS_OPTIONS.find((o) => o.value === status)!.label}`, clear: () => setStatus('all') }] : []),
    ...(branch ? [{ key: 'branch', label: branch.name, clear: () => setBranch(null) }] : []),
    ...(channel !== 'all' ? [{ key: 'channel', label: CHANNEL_WORD[channel], clear: () => setChannel('all') }] : []),
    ...(dateRange
      ? [{ key: 'date', label: dateRange.from === dateRange.to ? shortDay(dateRange.from) : `${shortDay(dateRange.from)} – ${shortDay(dateRange.to)}`, clear: () => setDateRange(null) }]
      : []),
    ...(debouncedSearch ? [{ key: 'search', label: `“${debouncedSearch}”`, clear: () => setSearch('') }] : []),
  ];

  const refresh = () => {
    void pagesQ.refetch();
    if (showPendingFirst) void pendingQ.refetch();
    void summaryQ.refetch();
    void salesQ.refetch();
  };

  const s = summaryQ.data;
  const summaryUnavailable = !s && summaryQ.isError;

  return (
    <Screen>
      <AppHeader
        title="Cash Transfers"
        subtitle="Money branches hand to the company. Approving posts RV- receipts to the Daily Ledger."
        actions={[
          { icon: 'refresh', onPress: refresh, accessibilityLabel: 'Refresh' },
          { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' },
        ]}
      />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg + tabBarHeight }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (pagesQ.hasNextPage && !pagesQ.isFetchingNextPage && !showingCache) void pagesQ.fetchNextPage();
        }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: theme.spacing.md }}>
            {/* The API without /summary yet answers 404: no strip, rather than zeros posing as totals. */}
            {s ? (
              <TransferSummaryStrip
                totals={{
                  totalTransferred: s.totals.amount,
                  cash: s.totals.cash,
                  easypaisa: s.totals.easypaisa,
                  bank: s.totals.bank,
                  fuelCharges: s.totals.fuel,
                  pendingAmount: s.pending.amount,
                  pendingCount: s.pending.count,
                }}
                mayBeIncomplete={false}
              />
            ) : summaryUnavailable ? null : (
              <LoadingSkeleton height={58} />
            )}

            {showingCache ? (
              <View style={[styles.offlinePill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                  Offline · Last updated {formatDisplayTime(new Date(cached!.updatedAt).toISOString())}
                </Text>
              </View>
            ) : null}

            <SearchBar value={search} onChangeText={setSearch} placeholder="Transfer ID, voucher, branch or note…" />
            <FilterChipRow options={STATUS_OPTIONS} value={status} onChange={setStatus} />
            <View style={styles.pickerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={branch ? `Branch: ${branch.name}. Change branch` : 'Filter by branch'}
                onPress={() => setBranchPickerOpen(true)}
                style={[styles.picker, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.pill }]}>
                <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700', flexShrink: 1 }]} numberOfLines={1}>
                  {branch ? branch.name.replace('Mountain Bakes ', '') : 'All branches'}
                </Text>
                <Icon name="chevron-down" size={12} color={theme.colors.textSecondary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter by date range"
                onPress={() => dateSheetRef.current?.present()}
                style={[styles.picker, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.pill }]}>
                <Icon name="calendar" size={12} color={theme.colors.textSecondary} />
                <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>
                  {dateRange ? (dateRange.from === dateRange.to ? shortDay(dateRange.from) : `${shortDay(dateRange.from)} – ${shortDay(dateRange.to)}`) : 'Last 30 days'}
                </Text>
              </Pressable>
            </View>
            <FilterChipRow options={CHANNEL_OPTIONS} value={channel} onChange={setChannel} />

            {hasActiveFilters ? (
              <View style={styles.activeRow}>
                {activeChips.map((chip) => (
                  <Pressable
                    key={chip.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove filter ${chip.label}`}
                    onPress={chip.clear}
                    style={[styles.activeChip, { backgroundColor: `${theme.colors.primary}1A`, borderRadius: theme.radii.pill }]}>
                    <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={1}>
                      {chip.label}
                    </Text>
                    <Icon name="close" size={12} color={theme.colors.textSecondary} />
                  </Pressable>
                ))}
                {activeChips.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setStatus('all');
                      setBranch(null);
                      setChannel('all');
                      setDateRange(null);
                      setSearch('');
                    }}
                    style={styles.activeChip}>
                    <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>Clear all</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {isLoading ? <LoadingSkeleton height={120} /> : null}
            {error && !showingCache ? <ErrorState message={mapErrorToMessage(error)} onRetry={refresh} /> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            <EmptyState
              title="No Transfers"
              message={hasActiveFilters ? 'Nothing matches these filters.' : 'Branch cash transfers will appear here.'}
              actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
              onAction={
                hasActiveFilters
                  ? () => {
                      setStatus('all');
                      setBranch(null);
                      setChannel('all');
                      setDateRange(null);
                      setSearch('');
                    }
                  : undefined
              }
            />
          ) : undefined
        }
        ListFooterComponent={pagesQ.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined}
        renderItem={({ item }) => {
          const match = salesDays && coveredFrom && item.date >= coveredFrom ? findShareMatch(item, salesDays) : null;
          const noteFlags = noteMentionsUnrecorded(item, parseTransferNote(item.note)).map((c) => `Note mentions ${NOTE_CHANNEL_LABEL[c]}`);
          const badges: TransferCardBadge[] = [
            ...(match ? [{ label: shareMatchLabel(match), variant: MATCH_VARIANT[match.kind] }] : []),
            ...noteFlags.map((label) => ({ label, variant: 'warning' as const })),
          ];
          return (
            <TransferCard
              item={item}
              showBranch
              highlight={item.status === 'pending'}
              dateLine={`${shortDay(item.date)} · business day · submitted ${submittedAt(item.createdAt)}`}
              badges={badges}
              accessibilityLabel={cardLabel(item, match, noteFlags)}
              onPress={() => navigation.navigate(Routes.FINANCE_CASH_TRANSFER_DETAIL, { transferId: item.id })}
              onPressPhoto={() => setPhoto({ uri: item.attachments[0]?.url ?? null, label: `Payment photo for ${item.transferNo}` })}
            />
          );
        }}
        refreshing={pagesQ.isRefetching && !pagesQ.isFetchingNextPage}
        onRefresh={refresh}
      />

      <DateRangeSheet
        ref={dateSheetRef}
        today={today}
        value={dateRange ?? resolveDateRangePreset('last7', today)}
        onApply={setDateRange}
        onRequestClose={() => dateSheetRef.current?.dismiss()}
      />
      <BranchPickerModal
        visible={branchPickerOpen}
        branches={branches.data?.branches ?? []}
        onSelect={(b) => {
          setBranch(b);
          setBranchPickerOpen(false);
        }}
        onClose={() => setBranchPickerOpen(false)}
      />
      <PhotoViewer visible={photo !== null} uri={photo?.uri ?? null} accessibilityLabel={photo?.label} onClose={() => setPhoto(null)} />
    </Screen>
  );
}
