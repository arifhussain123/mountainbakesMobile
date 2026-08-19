import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import {
  MBCard,
  MBErrorState,
  MBHeader,
  MBSkeletonList,
  MBStatCard,
  MBSyncStatus,
} from '@/components';
import { getProductionOverview } from '@/services/api/productionApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { useTheme } from '@/theme/ThemeProvider';
import { formatQty, toNumber } from '@/utils/money';

/**
 * Production dashboard.
 *
 * Counts, not money: the production floor works in quantities. Every figure is
 * the server's own aggregate — nothing is recomputed here.
 */
export function ProductionDashboardScreen(): React.ReactElement {
  const theme = useTheme();

  const overview = useQuery({
    queryKey: ['production', 'overview'],
    queryFn: getProductionOverview,
    staleTime: LIVE_STALE_TIME_MS,
  });

  const cards = overview.data?.cards;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Production" right={<MBSyncStatus />} />

      {overview.isPending ? (
        <MBSkeletonList rows={5} />
      ) : overview.isError ? (
        <MBErrorState
          error={overview.error}
          onRetry={() => overview.refetch()}
          retrying={overview.isFetching}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.md }}
          refreshControl={
            <RefreshControl
              refreshing={overview.isFetching && !overview.isPending}
              onRefresh={() => overview.refetch()}
              tintColor={theme.colors.primary}
            />
          }>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <MBStatCard label="Waiting" value={toNumber(cards?.waitingOrders)} currency={false} />
            </View>
            <View style={styles.gridItem}>
              <MBStatCard
                label="Approved"
                value={toNumber(cards?.approvedOrders)}
                currency={false}
              />
            </View>
            <View style={styles.gridItem}>
              <MBStatCard
                label="Delivered"
                value={toNumber(cards?.deliveredOrders)}
                currency={false}
              />
            </View>
            <View style={styles.gridItem}>
              <MBStatCard label="Changed" value={toNumber(cards?.changedOrders)} currency={false} />
            </View>
          </View>

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Production</Text>
            <DetailRow label="Today" value={formatQty(cards?.todayProduction)} />
            <DetailRow label="This week" value={formatQty(cards?.weeklyProduction)} />
            <DetailRow label="This month" value={formatQty(cards?.monthlyProduction)} />
            <DetailRow label="Returned" value={formatQty(cards?.returnedProducts)} />
            <DetailRow
              label="Available production stock"
              value={formatQty(cards?.availableProductionStock)}
            />
            <DetailRow label="Open demand" value={formatQty(cards?.totalDemandQty)} />
          </MBCard>

          {(overview.data?.branchDemand ?? []).length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Demand by branch</Text>
              {(overview.data?.branchDemand ?? []).map(branch => (
                <DetailRow
                  key={branch.branchId}
                  label={branch.branchName}
                  value={formatQty(branch.qty)}
                />
              ))}
            </MBCard>
          ) : null}

          {(overview.data?.topProducts ?? []).length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Most demanded</Text>
              {(overview.data?.topProducts ?? []).slice(0, 8).map(product => (
                <DetailRow
                  key={product.productId}
                  label={product.productName}
                  value={formatQty(product.qty)}
                />
              ))}
            </MBCard>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text
        style={[theme.type.body, styles.flex, { color: theme.colors.textMuted }]}
        numberOfLines={1}>
        {label}
      </Text>
      <Text style={[theme.type.mono, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { flexGrow: 1, flexBasis: '46%' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 10 },
});
