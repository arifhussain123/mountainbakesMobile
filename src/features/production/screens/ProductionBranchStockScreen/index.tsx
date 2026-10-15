import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useProductionBranchStock } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, ErrorState, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { styles } from './styles';

const COL_WIDTH = 72;
const PRODUCT_COL_WIDTH = 150;

/**
 * mountainbakesProduction.html screen 09 — Branch Stock: Product × Branch
 * balance matrix. Wired to `GET /api/production/branch-stock`
 * (`production.routes.ts`) — a different, `production_user`-accessible route
 * from the `super_admin`-only `GET /stock/history/branches` in
 * `stock.routes.ts` that an earlier pass had checked and found blocked.
 */
export function ProductionBranchStockScreen() {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');
  const { data, isLoading, error, refetch, isRefetching } = useProductionBranchStock();

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = data?.rows ?? [];
    return term ? rows.filter((r) => r.productName.toLowerCase().includes(term)) : rows;
  }, [data, search]);

  const branches = data?.branches ?? [];

  const cellColor = (value: number) => {
    if (value <= 0) return theme.colors.danger;
    if (value <= 4) return theme.colors.warning;
    return theme.colors.text;
  };

  return (
    <Screen>
      <AppHeader title="Branch Stock" subtitle="Every branch's balance, one product at a time" />
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm, flex: 1 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" />

        {isLoading ? <LoadingSkeleton height={300} /> : null}
        {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}

        {!isLoading && !error && data ? (
          <View style={{ flex: 1 }}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
              Showing {filteredRows.length} of {data.rows.length} · scroll sideways for branches
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: theme.spacing.sm }}>
              <View>
                <View style={[styles.headerRow, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textFaint, width: PRODUCT_COL_WIDTH }]}>PRODUCT</Text>
                  {branches.map((b) => (
                    <Text
                      key={b.branchId}
                      style={[theme.typography.label, { color: theme.colors.textFaint, width: COL_WIDTH, textAlign: 'right' }]}
                      numberOfLines={1}>
                      {b.branchName.toUpperCase()}
                    </Text>
                  ))}
                </View>
                <ScrollView
                  style={{ maxHeight: 520 }}
                  refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={theme.colors.primary} />}>
                  {filteredRows.map((row) => (
                    <View key={row.productId} style={[styles.dataRow, { borderBottomColor: theme.colors.border }]}>
                      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', width: PRODUCT_COL_WIDTH }]} numberOfLines={1}>
                        {row.productName}
                      </Text>
                      {branches.map((b) => {
                        const value = row.byBranch[b.branchId] ?? 0;
                        return (
                          <Text
                            key={b.branchId}
                            style={[theme.typography.body, { color: cellColor(value), fontWeight: '700', width: COL_WIDTH, textAlign: 'right' }]}>
                            {value}
                          </Text>
                        );
                      })}
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
            <View style={styles.legendRow}>
              <Text style={[theme.typography.label, { color: theme.colors.danger }]}>● 0 stock</Text>
              <Text style={[theme.typography.label, { color: theme.colors.warning }]}>● 1–4</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>● 5+</Text>
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
