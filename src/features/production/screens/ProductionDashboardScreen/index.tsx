import { useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useProductionOrders, useProductionStock } from '@/api';
import { openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, LoadingSkeleton, Screen } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { styles } from './styles';

/**
 * mountainbakesProduction.html screen 01 — Production Dashboard. Composited
 * from real endpoints already consumed elsewhere (production-orders,
 * production-stock) — `/api/reports/*` is `branch_manager`/`super_admin` only
 * and refuses `production_user`, so no dashboard-summary endpoint exists for
 * this role; nothing here is computed beyond what the server already returns.
 */
export function ProductionDashboardScreen() {
  const theme = useAppTheme();
  const user = useAuthStore((state) => state.user);

  const orders = useProductionOrders();
  const stock = useProductionStock();

  const orderCounts = useMemo(() => {
    const rows = orders.data?.orders ?? [];
    return {
      pending: rows.filter((o) => o.status === 'pending').length,
      awaitingVerification: rows.filter((o) => o.status === 'awaiting_verification').length,
      verified: rows.filter((o) => o.status === 'verified').length,
    };
  }, [orders.data]);

  const stockTotals = useMemo(() => {
    const rows = stock.data?.rows ?? [];
    return {
      balance: rows.reduce((sum, r) => sum + r.balance, 0),
      branchDemand: rows.reduce((sum, r) => sum + r.branchDemand, 0),
      shortages: rows.filter((r) => r.status === 'out' || r.status === 'shortage').length,
    };
  }, [stock.data]);

  const isLoading = orders.isLoading || stock.isLoading;
  const error = orders.error ?? stock.error;
  const refreshing = orders.isRefetching || stock.isRefetching;
  const onRefresh = () => {
    void orders.refetch();
    void stock.refetch();
  };

  return (
    <Screen>
      <AppHeader
        title="Production Dashboard"
        subtitle={user?.displayName ?? user?.email ?? undefined}
        actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        {isLoading ? <LoadingSkeleton height={160} /> : null}
        {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={onRefresh} /> : null}

        {!isLoading && !error ? (
          <View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>BRANCH DEMANDS</Text>
            <View style={[styles.statsGrid, { marginTop: 8 }]}>
              <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Pending Review</Text>
                <Text style={[theme.typography.sectionTitle, { color: theme.colors.warning, marginTop: 4 }]}>{orderCounts.pending}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Awaiting Branch Verify</Text>
                <Text style={[theme.typography.sectionTitle, { color: theme.colors.info, marginTop: 4 }]}>{orderCounts.awaitingVerification}</Text>
              </View>
            </View>

            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>
              PRODUCTION STOCK ({stock.data?.date ?? '—'})
            </Text>
            <Card style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Pool Balance</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 2, fontWeight: '700' }]}>{stockTotals.balance}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Outstanding Demand</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.danger, marginTop: 2, fontWeight: '700' }]}>
                    {stockTotals.branchDemand}
                  </Text>
                </View>
              </View>
              {stockTotals.shortages > 0 ? (
                <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 10 }]}>
                  {stockTotals.shortages} product{stockTotals.shortages === 1 ? '' : 's'} short or out of stock
                </Text>
              ) : null}
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
