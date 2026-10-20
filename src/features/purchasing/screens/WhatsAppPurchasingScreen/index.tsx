import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  PURCHASE_BUCKETS,
  PURCHASE_BUCKET_LABEL,
  usePurchaseDemandPages,
  usePurchasingStatus,
  usePurchasingSummary,
  type PurchaseBucket,
  type PurchaseDemandSort,
} from '@/api';
import { Routes, openDrawer, type ProductionWhatsAppStackParamList } from '@/navigation';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FilterChipRow, LoadingSkeleton, PrimaryButton, Screen, SearchBar, type FilterChipOption } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { ChoiceChips, ConnectionStatusCard, DemandCard } from '../../components';
import { styles } from './styles';

type Nav = NativeStackNavigationProp<ProductionWhatsAppStackParamList>;

const SORT_OPTIONS: { value: PurchaseDemandSort; label: string }[] = [
  { value: 'created_at', label: 'Newest' },
  { value: 'required_date', label: 'Needed by' },
  { value: 'updated_at', label: 'Recently updated' },
];

/**
 * WhatsApp Purchasing — Production's control centre for buying from outside
 * suppliers. The bucket counts, the list and its filters are all the API's
 * (`/purchasing/summary`, `/purchasing/demands?bucket=…`), so the chips
 * always count exactly what they show.
 */
export function WhatsAppPurchasingScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<Nav>();
  const [bucket, setBucket] = useState<PurchaseBucket>('pending');
  const [sortBy, setSortBy] = useState<PurchaseDemandSort>('created_at');
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search).trim();

  const statusQ = usePurchasingStatus();
  const summaryQ = usePurchasingSummary();
  const pagesQ = usePurchaseDemandPages({
    bucket,
    search: term || undefined,
    sortBy,
    sortDir: sortBy === 'required_date' ? 'asc' : 'desc',
  });

  const rows = useMemo(() => pagesQ.data?.pages.flatMap((p) => p.demands) ?? [], [pagesQ.data]);
  const summary = summaryQ.data;
  const bucketOptions = useMemo<FilterChipOption<PurchaseBucket>[]>(
    () => PURCHASE_BUCKETS.map((b) => ({ value: b, label: PURCHASE_BUCKET_LABEL[b], count: summary?.buckets[b] })),
    [summary],
  );
  const attention = (summary?.failedMessages ?? 0) + (summary?.unmatchedMessages ?? 0);

  const refresh = () => {
    void pagesQ.refetch();
    void summaryQ.refetch();
    void statusQ.refetch();
  };

  const counters = [
    { key: 'failed', label: 'Failed messages', value: summary ? String(summary.failedMessages) : '–', tone: summary?.failedMessages ? theme.colors.danger : theme.colors.text, onPress: () => navigation.navigate(Routes.PRODUCTION_WHATSAPP_CONVERSATIONS, { tab: 'failed' }) },
    { key: 'unmatched', label: 'Unmatched', value: summary ? String(summary.unmatchedMessages) : '–', tone: summary?.unmatchedMessages ? theme.colors.warning : theme.colors.text, onPress: () => navigation.navigate(Routes.PRODUCTION_WHATSAPP_CONVERSATIONS, { tab: 'unmatched' }) },
    { key: 'payments', label: 'Payments with Finance', value: summary ? String(summary.pendingSupplierPayments) : '–', tone: theme.colors.text, onPress: () => setBucket('unpaid') },
    { key: 'credit', label: 'Credit outstanding', value: summary ? formatCurrency(summary.outstandingSupplierCredit) : '–', tone: theme.colors.text, onPress: () => setBucket('unpaid') },
  ];

  return (
    <Screen>
      <AppHeader
        title="WhatsApp Purchasing"
        subtitle="Demands to outside suppliers"
        actions={[
          { icon: 'message-circle', onPress: () => navigation.navigate(Routes.PRODUCTION_WHATSAPP_CONVERSATIONS), accessibilityLabel: 'Conversations', badgeCount: attention || undefined },
          { icon: 'refresh', onPress: refresh, accessibilityLabel: 'Refresh' },
          { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' },
        ]}
      />
      <FlatList
        data={rows}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (pagesQ.hasNextPage && !pagesQ.isFetchingNextPage) void pagesQ.fetchNextPage();
        }}
        refreshing={pagesQ.isRefetching && !pagesQ.isFetchingNextPage}
        onRefresh={refresh}
        ListHeaderComponent={
          <View style={{ marginBottom: theme.spacing.md }}>
            <ConnectionStatusCard status={statusQ.data} loading={statusQ.isLoading} error={statusQ.isError} />

            <View style={styles.counters}>
              {counters.map((c) => (
                <Pressable
                  key={c.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.label}: ${c.value}`}
                  onPress={c.onPress}
                  style={[styles.counter, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {c.label}
                  </Text>
                  <Text style={[theme.typography.cardTitle, { color: c.tone, marginTop: 2 }]} numberOfLines={1}>
                    {c.value}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ marginVertical: theme.spacing.md }}>
              <PrimaryButton label="+ New Demand" onPress={() => navigation.navigate(Routes.PRODUCTION_WHATSAPP_DEMAND_FORM)} />
            </View>

            <SearchBar value={search} onChangeText={setSearch} placeholder="Demand #, supplier or note…" />
            <View style={{ marginTop: 10 }}>
              <FilterChipRow options={bucketOptions} value={bucket} onChange={setBucket} />
            </View>
            <View style={{ marginTop: 10 }}>
              <ChoiceChips options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} accessibilityLabel="Sort" />
            </View>
            {pagesQ.isLoading ? (
              <View style={{ marginTop: theme.spacing.md, gap: 10 }}>
                <LoadingSkeleton height={110} />
                <LoadingSkeleton height={110} />
              </View>
            ) : null}
            {pagesQ.error ? (
              <View style={{ marginTop: theme.spacing.md }}>
                <ErrorState message={mapErrorToMessage(pagesQ.error)} onRetry={refresh} />
              </View>
            ) : null}
            {pagesQ.data && !pagesQ.isLoading ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
                {pagesQ.data.pages[0]?.total ?? 0} in {PURCHASE_BUCKET_LABEL[bucket]}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !pagesQ.isLoading && !pagesQ.error ? (
            <EmptyState
              icon="message-circle"
              title={term || bucket !== 'all' ? 'Nothing Here' : 'No Demands Yet'}
              message={term ? `No demand matches “${term}” in ${PURCHASE_BUCKET_LABEL[bucket]}.` : 'Purchase demands sent to suppliers over WhatsApp appear here.'}
              actionLabel={term ? 'Clear search' : bucket !== 'all' ? 'Show all' : 'New Demand'}
              onAction={() => {
                if (term) setSearch('');
                else if (bucket !== 'all') setBucket('all');
                else navigation.navigate(Routes.PRODUCTION_WHATSAPP_DEMAND_FORM);
              }}
            />
          ) : undefined
        }
        ListFooterComponent={pagesQ.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined}
        renderItem={({ item }) => <DemandCard demand={item} onPress={() => navigation.navigate(Routes.PRODUCTION_WHATSAPP_DEMAND_DETAIL, { demandId: item.id })} />}
      />
    </Screen>
  );
}
