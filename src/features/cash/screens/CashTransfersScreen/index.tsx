import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getBusinessDate, useCashTransfers, useMonthlyCashTransferSummary } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { useSummaryFocusRefresh } from '@/features/discounts/hooks';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { useAuthStore, useOfflineQueueStore } from '@/state';
import { Routes, openDrawer, type CashStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import {
  DateRangeSheet,
  EmptyState,
  ErrorState,
  FilterChipRow,
  FormBottomSheet,
  Icon,
  InfoBanner,
  LoadingSkeleton,
  PhotoViewer,
  SearchBar,
  Screen,
  SegmentedControl,
  type FilterChipOption,
  type SegmentedOption,
} from '@/shared/ui';
import { ExtendedFab, PageTitle, TopBar } from '@/features/sales/components';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatDisplayTime } from '@/shared/utils';
import { resolveDateRangePreset, type DateRange } from '@/shared/utils';
import type { CashTransfer, CashTransferStatus } from '@/api';
import { CASH_TRANSFERS_MAX_PAGE_SIZE, type ListCashTransfersParams } from '@/api/services/cashTransferService';
import type { CashTransferChannel } from '../../calculations';
import { matchesChannel } from '../../calculations';
import { MonthlyCashTransferSummaryCard, TransferCard } from '../../components';
import { CashDepositSheetContent } from '../CashDepositScreen';
import { styles } from './styles';

interface CashTransfersCachePayload {
  transfers: CashTransfer[];
}

const STATUS_OPTIONS: FilterChipOption<CashTransferStatus | 'all'>[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const CHANNEL_OPTIONS: SegmentedOption<CashTransferChannel | 'all'>[] = [
  { value: 'all', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'bank_account', label: 'Bank' },
];

/** Redesign `15 Cash Transfers` — the branch's own deposit history, with a "Cash deposit" FAB. */
export function CashTransfersScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const navigation = useNavigation<NativeStackNavigationProp<CashStackParamList>>();
  const branchName = useAuthStore((state) => state.user?.branchName ?? null);
  const depositSheetRef = useRef<BottomSheetModal>(null);
  const dateRangeSheetRef = useRef<BottomSheetModal>(null);

  const today = getBusinessDate();
  const [dateRange, setDateRange] = useState<DateRange>(() => resolveDateRangePreset('last90', today));
  const [statusFilter, setStatusFilter] = useState<CashTransferStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<CashTransferChannel | 'all'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoLabel, setPhotoLabel] = useState<string | undefined>(undefined);

  const queryParams: ListCashTransfersParams = useMemo(
    () => ({
      from: dateRange.from,
      to: dateRange.to,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: debouncedSearch.trim() || undefined,
      sortBy: 'date',
      sortDir: 'desc',
      limit: CASH_TRANSFERS_MAX_PAGE_SIZE,
    }),
    [dateRange, statusFilter, debouncedSearch],
  );

  const { data, isLoading, error, refetch, isRefetching } = useCashTransfers(queryParams);
  // The month to date, summed on the server — the web's monthly block. It never
  // follows the filters below, which only change the list.
  const summaryQ = useMonthlyCashTransferSummary();
  useSummaryFocusRefresh(summaryQ);
  const rawTransfers = useMemo(() => data?.transfers ?? [], [data]);
  const totalMatching = data?.total ?? 0;

  // Select the stable `writes` array itself and filter in a `useMemo`, not
  // inside the selector — zustand v5's hook re-invokes the selector on every
  // render to check for tears, and a selector returning a brand-new array
  // each time (`.filter()`) makes React think the store changed every single
  // render, which is an infinite re-render loop ("Maximum update depth
  // exceeded"), not just a missed memoization.
  const writes = useOfflineQueueStore((state) => state.writes);
  const pendingWrites = useMemo(() => writes.filter((w) => w.endpoint === '/cash-transfers' && w.method === 'post'), [writes]);

  const cacheKey = `cashTransfers:${dateRange.from}:${dateRange.to}:${statusFilter}`;
  const [cached, setCached] = useState<{ data: CashTransfersCachePayload; updatedAt: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCachedResponse<CashTransfersCachePayload>(cacheKey).then((result) => {
      if (!cancelled) setCached(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  useEffect(() => {
    // `Attachment.url` is a short-lived signed URL, re-minted on every real
    // read — "never cache past a page load" (see its own doc comment).
    // Persisting it to the offline cache would mean a later offline view
    // shows a thumbnail that's silently expired/broken instead of the
    // (honest) placeholder `TransferCard` already renders for "no photo".
    if (rawTransfers.length > 0) {
      void setCachedResponse(cacheKey, { transfers: rawTransfers.map((t) => ({ ...t, attachments: [] })) });
    }
  }, [cacheKey, rawTransfers]);

  const showingCache = rawTransfers.length === 0 && !isLoading && !!cached;
  const sourceTransfers = useMemo(
    () => (rawTransfers.length > 0 ? rawTransfers : showingCache ? cached!.data.transfers : []),
    [rawTransfers, showingCache, cached],
  );

  const filtered = useMemo(
    () => (channelFilter === 'all' ? sourceTransfers : sourceTransfers.filter((t) => matchesChannel(t, channelFilter))),
    [sourceTransfers, channelFilter],
  );


  const openPhoto = (transfer: CashTransfer) => {
    const photo = transfer.attachments[0];
    setPhotoUri(photo?.url ?? null);
    setPhotoLabel(`Payment photo for ${transfer.transferNo}`);
  };

  const dateRangeLabel = dateRange.from === dateRange.to ? dateRange.from : `${dateRange.from} to ${dateRange.to}`;

  return (
    <Screen>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <TopBar onMenu={openDrawer} subtitle={branchName ?? undefined} actions={[...appearanceActions, bellAction]} />
            <PageTitle title="Cash transfers" sub="Cash, Easypaisa and bank money handed to the company · last 90 days. Finance approves each transfer and posts the receipt." />

            {pendingWrites.length > 0 ? (
              <View style={styles.queued}>
                {pendingWrites.map((write) => (
                  <InfoBanner key={write.id} kind={write.status === 'failed' ? 'bad' : 'warn'} icon={write.status === 'failed' ? 'warning' : 'clock'}>
                    <Text style={[styles.queuedTitle, { color: write.status === 'failed' ? theme.colors.danger : theme.colors.warning }]}>
                      {write.status === 'failed' ? 'Sync failed · Fix' : 'Waiting to sync'}
                    </Text>
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                      Submitted {formatDisplayTime(new Date(write.createdAt).toISOString())}
                    </Text>
                  </InfoBanner>
                ))}
              </View>
            ) : null}

            {showingCache ? (
              <View style={[styles.offlinePill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                  Offline · Last updated {formatDisplayTime(new Date(cached!.updatedAt).toISOString())}
                </Text>
              </View>
            ) : null}

            <MonthlyCashTransferSummaryCard
              summary={summaryQ.data}
              isLoading={summaryQ.isLoading}
              error={summaryQ.error}
              onRetry={() => void summaryQ.refetch()}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Date range, ${dateRangeLabel}. Change`}
              onPress={() => dateRangeSheetRef.current?.present()}>
              <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Date range</Text>
              <View style={[styles.fieldInput, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.border }]}>
                <Icon name="calendar" size={20} color={theme.colors.textFaint} />
                <Text style={[styles.fieldValue, { color: theme.colors.text }]} numberOfLines={1}>
                  {dateRangeLabel}
                </Text>
                <Icon name="chevron-down" size={18} color={theme.colors.textFaint} />
              </View>
            </Pressable>

            <FilterChipRow options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
            <SegmentedControl options={CHANNEL_OPTIONS} value={channelFilter} onChange={setChannelFilter} />
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search transfer ID, voucher or note…" />

            {totalMatching > CASH_TRANSFERS_MAX_PAGE_SIZE ? (
              <InfoBanner kind="warn">
                {`Showing the latest ${CASH_TRANSFERS_MAX_PAGE_SIZE} of ${totalMatching.toLocaleString('en-US')} transfers — narrow the dates to see the rest.`}
              </InfoBanner>
            ) : null}
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error && !showingCache ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState icon="transfer" title="No Deposits Yet" message="Cash deposits you raise will appear here." /> : undefined
        }
        renderItem={({ item }) => (
          <TransferCard
            item={item}
            onPress={() => navigation.navigate(Routes.CASH_TRANSFER_DETAIL, { transferId: item.id })}
            onPressPhoto={() => openPhoto(item)}
          />
        )}
        refreshing={isRefetching}
        onRefresh={() => {
          void refetch();
          void summaryQ.refetch();
        }}
      />

      <ExtendedFab label="Cash deposit" bottom={20} onPress={() => depositSheetRef.current?.present()} />

      <FormBottomSheet
        ref={depositSheetRef}
        title="Cash Deposit"
        subtitle="Finance approves it and posts the receipt"
        onRequestClose={() => depositSheetRef.current?.dismiss()}>
        <CashDepositSheetContent onClose={() => depositSheetRef.current?.dismiss()} />
      </FormBottomSheet>

      <DateRangeSheet
        ref={dateRangeSheetRef}
        today={today}
        value={dateRange}
        onApply={setDateRange}
        onRequestClose={() => dateRangeSheetRef.current?.dismiss()}
      />

      <PhotoViewer visible={photoUri !== null} uri={photoUri} accessibilityLabel={photoLabel} onClose={() => setPhotoUri(null)} />
    </Screen>
  );
}
