import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getBusinessDate, useCashTransfers } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { useOfflineQueueStore } from '@/state';
import { Routes, openDrawer, type CashStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  DateRangeSheet,
  EmptyState,
  ErrorState,
  FilterChipRow,
  FormBottomSheet,
  LoadingSkeleton,
  PhotoViewer,
  PillButton,
  SearchBar,
  Screen,
  type FilterChipOption,
} from '@/shared/ui';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatDisplayTime } from '@/shared/utils';
import { resolveDateRangePreset, type DateRange } from '@/shared/utils';
import type { CashTransfer, CashTransferStatus } from '@/api';
import { CASH_TRANSFERS_MAX_PAGE_SIZE, type ListCashTransfersParams } from '@/api/services/cashTransferService';
import type { CashTransferChannel } from '../../calculations';
import { computeCashTransferTotals, matchesChannel } from '../../calculations';
import { TransferCard, TransferSummaryStrip } from '../../components';
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

const CHANNEL_OPTIONS: FilterChipOption<CashTransferChannel | 'all'>[] = [
  { value: 'all', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'bank_account', label: 'Bank' },
];

/** branchApp.md screen 15 — Cash Transfers: the branch's own deposit history. */
export function CashTransfersScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const navigation = useNavigation<NativeStackNavigationProp<CashStackParamList>>();
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
  const rawTransfers = useMemo(() => data?.transfers ?? [], [data]);
  const totalMatching = data?.total ?? 0;

  const pendingWrites = useOfflineQueueStore((state) => state.writes.filter((w) => w.endpoint === '/cash-transfers' && w.method === 'post'));

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
    if (rawTransfers.length > 0) void setCachedResponse(cacheKey, { transfers: rawTransfers });
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

  const totals = useMemo(() => computeCashTransferTotals(filtered), [filtered]);
  const mayBeIncomplete = totalMatching > CASH_TRANSFERS_MAX_PAGE_SIZE;

  const openPhoto = (transfer: CashTransfer) => {
    const photo = transfer.attachments[0];
    setPhotoUri(photo?.url ?? null);
    setPhotoLabel(`Payment photo for ${transfer.transferNo}`);
  };

  const dateRangeLabel = dateRange.from === dateRange.to ? dateRange.from : `${dateRange.from} to ${dateRange.to}`;

  return (
    <Screen>
      <AppHeader
        title="Cash Transfers"
        subtitle="Money handed to the company · last 90 days. Finance approves each transfer and posts the receipt."
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />

      <View style={styles.headerPad}>
        <PillButton label="Cash Deposit" onPress={() => depositSheetRef.current?.present()} showArrow />

        {pendingWrites.length > 0 ? (
          <View style={{ marginTop: 10 }}>
            {pendingWrites.map((write) => (
              <View
                key={write.id}
                style={[
                  styles.queuedCard,
                  { borderColor: write.status === 'failed' ? theme.colors.danger : theme.colors.warning, backgroundColor: theme.colors.cardFill },
                ]}>
                <Text style={[theme.typography.label, { color: write.status === 'failed' ? theme.colors.danger : theme.colors.warning, fontWeight: '700' }]}>
                  {write.status === 'failed' ? 'Sync failed · Fix' : 'Waiting to sync'}
                </Text>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                  Submitted {formatDisplayTime(new Date(write.createdAt).toISOString())}
                </Text>
              </View>
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
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg }}
        ListHeaderComponent={
          <View style={{ marginBottom: theme.spacing.md }}>
            <TransferSummaryStrip totals={totals} mayBeIncomplete={mayBeIncomplete} />

            <View style={{ marginTop: 12 }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search transfer ID, voucher or note…" />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => dateRangeSheetRef.current?.present()}
              style={[styles.dateChip, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill, marginTop: 10 }]}>
              <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{dateRangeLabel}</Text>
            </Pressable>

            <View style={{ marginTop: 10 }}>
              <FilterChipRow options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
            </View>
            <View style={{ marginTop: 8 }}>
              <FilterChipRow options={CHANNEL_OPTIONS} value={channelFilter} onChange={setChannelFilter} />
            </View>

            {isLoading ? <View style={{ marginTop: 12 }}><LoadingSkeleton height={100} /></View> : null}
            {error && !showingCache ? (
              <View style={{ marginTop: 12 }}>
                <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="No Deposits Yet" message="Cash deposits you raise will appear here." /> : undefined
        }
        renderItem={({ item }) => (
          <TransferCard
            item={item}
            onPress={() => navigation.navigate(Routes.CASH_TRANSFER_DETAIL, { transferId: item.id })}
            onPressPhoto={() => openPhoto(item)}
          />
        )}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

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
