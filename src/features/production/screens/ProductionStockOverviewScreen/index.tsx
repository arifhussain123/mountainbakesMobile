import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProductionStock } from '@/api';
import { Routes, type ProductionStockStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, Screen, SearchBar, SecondaryButton } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { ProductionStockRowCard } from '../../components';
import { styles } from './styles';

/** mountainbakesProduction.html screen 07 — Production Stock: the central pool, today. */
export function ProductionStockOverviewScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ProductionStockStackParamList>>();
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useProductionStock();
  const rows = useMemo(() => data?.rows ?? [], [data]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          opening: acc.opening + r.opening,
          prepared: acc.prepared + r.preparedToday,
          totalStock: acc.totalStock + r.totalStock,
          branchDemand: acc.branchDemand + r.branchDemand,
          sold: acc.sold + r.soldToday,
          fromReturns: acc.fromReturns + r.returnTransferIn,
          adjustment: acc.adjustment + r.adjustment,
          balance: acc.balance + r.balance,
        }),
        { opening: 0, prepared: 0, totalStock: 0, branchDemand: 0, sold: 0, fromReturns: 0, adjustment: 0, balance: 0 },
      ),
    [rows],
  );

  const shortages = useMemo(() => rows.filter((r) => r.status === 'shortage' || r.status === 'out'), [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.productName.toLowerCase().includes(term) || r.stockCode.toLowerCase().includes(term));
  }, [rows, search]);

  return (
    <Screen>
      <AppHeader
        title="Production Stock"
        subtitle={data?.date ? `Central pool — ${formatDisplayDate(data.date)}` : 'Central pool — today'}
        actions={[{ icon: 'refresh', onPress: () => void refetch(), accessibilityLabel: 'Refresh' }]}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <View style={styles.actionsRow}>
              <SecondaryButton label="Adjustment" onPress={() => navigation.navigate(Routes.PRODUCTION_STOCK_ADJUSTMENT)} />
            </View>
            <View style={{ marginTop: 8 }}>
              <PrimaryButton
                label="+ Today's Prepared Products"
                onPress={() => navigation.navigate(Routes.PRODUCTION_PREPARED_PRODUCTS)}
              />
            </View>

            {isLoading ? <LoadingSkeleton height={160} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}

            {!isLoading && !error ? (
              <View style={[styles.statsGrid, { marginTop: theme.spacing.md }]}>
                <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>OPENING</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 3, fontWeight: '700' }]}>{totals.opening}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PREPARED</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.success, marginTop: 3, fontWeight: '700' }]}>+{totals.prepared}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>TOTAL STOCK</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 3, fontWeight: '700' }]}>{totals.totalStock}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>BRANCH DEMAND</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.danger, marginTop: 3, fontWeight: '700' }]}>{totals.branchDemand}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>SOLD</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 3, fontWeight: '700' }]}>{totals.sold}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>FROM RETURNS</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 3, fontWeight: '700' }]}>{totals.fromReturns}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>ADJUSTMENT</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 3, fontWeight: '700' }]}>{totals.adjustment}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>BALANCE</Text>
                  <Text
                    style={[
                      theme.typography.body,
                      { color: totals.balance < 0 ? theme.colors.danger : theme.colors.text, marginTop: 3, fontWeight: '700' },
                    ]}>
                    {totals.balance}
                  </Text>
                </View>
              </View>
            ) : null}

            {shortages.length > 0 ? (
              <View
                style={{
                  marginTop: theme.spacing.md,
                  backgroundColor: `${theme.colors.danger}1A`,
                  borderRadius: theme.radii.md,
                  padding: theme.spacing.md,
                }}>
                <Text style={[theme.typography.body, { color: theme.colors.danger, fontWeight: '700' }]}>
                  Insufficient production stock for {shortages.length} product{shortages.length === 1 ? '' : 's'}
                </Text>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 4 }]} numberOfLines={3}>
                  {shortages
                    .map((r) => `${r.productName} — need ${r.branchDemand}, have ${r.balance}`)
                    .join(' · ')}
                </Text>
              </View>
            ) : null}

            <View style={{ marginTop: theme.spacing.md }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" />
            </View>
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="Nothing Here" message="No products in the production pool yet." /> : undefined
        }
        renderItem={({ item }) => <ProductionStockRowCard row={item} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
    </Screen>
  );
}
