import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBranches, useProductionReturns, useProductionReturnsSummary } from '@/api';
import { MonthlyReturnsSummaryCard } from '@/features/stock';
import { Routes, type ProductionReturnsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, Screen, SearchBar } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { FilterChip, ProductionReturnCard } from '../../components';
import { styles } from './styles';

const TABS = ['all', 'pending', 'accepted', 'rejected'] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  all: 'All',
  pending: 'Awaiting Review',
  accepted: 'Approved',
  rejected: 'Rejected',
};
const REJECTED_STATUSES = ['rejected', 'returned'];
// Same wording as ProductionReturnCard's status badges.
const SUMMARY_STATUS_LABEL = { pending: 'Awaiting Review', accepted: 'Approved', rejected: 'Rejected', returned: 'Sent Back' };

/** mountainbakesProduction.html screen 10 — Product Returns: approve, reject, or send back. */
export function ProductionReturnsListScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ProductionReturnsStackParamList>>();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]>('all');
  const [branchId, setBranchId] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useProductionReturns();
  const branches = useBranches();
  // The branch chip narrows both the month-to-date summary (server-side) and
  // the queue below. The queue is filtered here rather than re-requested so
  // the Detail screen's lookup in this same cached list keeps finding its row.
  const summary = useProductionReturnsSummary(branchId);
  const returns = useMemo(
    () => (data?.returns ?? []).filter((r) => branchId === null || r.branchId === branchId),
    [data, branchId],
  );
  const onRefresh = () => {
    void refetch();
    void summary.refetch();
  };

  const counts = useMemo(
    () => ({
      all: returns.length,
      pending: returns.filter((r) => r.status === 'pending').length,
      accepted: returns.filter((r) => r.status === 'accepted').length,
      rejected: returns.filter((r) => REJECTED_STATUSES.includes(r.status)).length,
    }),
    [returns],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return returns.filter((r) => {
      if (tab === 'rejected' ? !REJECTED_STATUSES.includes(r.status) : tab !== 'all' && r.status !== tab) return false;
      if (!term) return true;
      return r.productName.toLowerCase().includes(term) || r.branchName.toLowerCase().includes(term) || r.reason.toLowerCase().includes(term);
    });
  }, [returns, tab, search]);

  return (
    <Screen>
      <AppHeader title="Product Returns" subtitle="Last 30 days" actions={[]} />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <PrimaryButton label="+ Record Return" onPress={() => navigation.navigate(Routes.PRODUCTION_NEW_RETURN)} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <FilterChip label="All Branches" active={branchId === null} onPress={() => setBranchId(null)} />
                {(branches.data?.branches ?? []).map((b) => (
                  <FilterChip key={b.id} label={b.name.replace('Mountain Bakes ', '')} active={branchId === b.id} onPress={() => setBranchId(b.id)} />
                ))}
              </View>
            </ScrollView>
            <View style={{ height: theme.spacing.md }} />
            <MonthlyReturnsSummaryCard
              summary={summary.data}
              isLoading={summary.isLoading}
              error={summary.error}
              onRetry={() => void summary.refetch()}
              statusLabels={SUMMARY_STATUS_LABEL}
              showBranches
            />
            <View style={{ height: theme.spacing.md }} />
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search reason, product or branch…" />
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
          !isLoading && !error ? <EmptyState title="Nothing Here" message="No returns in this queue right now." /> : undefined
        }
        renderItem={({ item }) => (
          <ProductionReturnCard item={item} onPress={() => navigation.navigate(Routes.PRODUCTION_RETURN_DETAIL, { returnId: item.id })} />
        )}
        refreshing={isRefetching || summary.isRefetching}
        onRefresh={onRefresh}
      />
    </Screen>
  );
}
