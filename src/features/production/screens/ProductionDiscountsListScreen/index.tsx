import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProductionDiscountSummary, useProductionDiscounts } from '@/api';
import { Routes, type ProductionDiscountsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { MonthlyDiscountSummaryCard } from '@/features/discounts/components';
import { useSummaryFocusRefresh } from '@/features/discounts/hooks';
import { ProductionDiscountCard } from '../../components';
import { styles } from './styles';

const TABS = ['all', 'pending', 'approved', 'rejected'] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  all: 'All',
  pending: 'Awaiting Review',
  approved: 'Approved',
  rejected: 'Rejected',
};
const REJECTED_STATUSES = ['rejected', 'returned'];

/** mountainbakesProduction.html screen 11 — Discounts: approve, reject, or send back a branch's claim. */
export function ProductionDiscountsListScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ProductionDiscountsStackParamList>>();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]>('all');

  const { data, isLoading, error, refetch, isRefetching } = useProductionDiscounts();
  const summaryQ = useProductionDiscountSummary(null);
  // Coming back from a claim's detail (or to the tab) refreshes the month's figures.
  useSummaryFocusRefresh(summaryQ);
  const discounts = useMemo(() => data?.discounts ?? [], [data]);

  const counts = useMemo(
    () => ({
      all: discounts.length,
      pending: discounts.filter((d) => d.status === 'pending').length,
      approved: discounts.filter((d) => d.status === 'approved').length,
      rejected: discounts.filter((d) => REJECTED_STATUSES.includes(d.status)).length,
    }),
    [discounts],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return discounts.filter((d) => {
      if (tab === 'rejected' ? !REJECTED_STATUSES.includes(d.status) : tab !== 'all' && d.status !== tab) return false;
      if (!term) return true;
      return (
        d.demandNumber.toLowerCase().includes(term) ||
        d.branchName.toLowerCase().includes(term) ||
        d.reason.toLowerCase().includes(term)
      );
    });
  }, [discounts, tab, search]);

  return (
    <Screen>
      <AppHeader title="Discounts" subtitle="Last 30 days" actions={[]} />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <View style={{ marginBottom: theme.spacing.md }}>
              <MonthlyDiscountSummaryCard
                summary={summaryQ.data}
                isLoading={summaryQ.isLoading}
                error={summaryQ.error}
                onRetry={() => void summaryQ.refetch()}
                isFetching={summaryQ.isFetching}
                updatedAt={summaryQ.dataUpdatedAt}
                showBranches
              />
            </View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search demand #, reason or branch…" />
            <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
              {TABS.map((option) => {
                const active = option === tab;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setTab(option)}
                    style={[styles.tab, { backgroundColor: active ? theme.colors.primary : 'transparent', borderRadius: theme.radii.sm }]}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>
                      {TAB_LABEL[option]} ({counts[option]})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="Nothing Here" message="No discount claims in this queue right now." /> : undefined
        }
        renderItem={({ item }) => (
          <ProductionDiscountCard item={item} onPress={() => navigation.navigate(Routes.PRODUCTION_DISCOUNT_DETAIL, { discountId: item.id })} />
        )}
        refreshing={isRefetching}
        onRefresh={() => {
          void refetch();
          void summaryQ.refetch();
        }}
      />
    </Screen>
  );
}
