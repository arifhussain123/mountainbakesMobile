import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import {
  MBCard,
  MBErrorState,
  MBHeader,
  MBSkeletonList,
  MBStatCard,
  MBSyncStatus,
} from '@/components';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { getReportSummary } from '@/services/api/reportsApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import type { ReportPeriod } from '@/shared/types/report.types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, formatQty, toNumber } from '@/utils/money';

/**
 * Company-wide dashboard.
 *
 * Same server calculation as the branch dashboard, unscoped: an admin sends no
 * `branchId`, so the figures cover every branch and `branchData` carries the
 * per-branch comparison.
 */

const PERIODS: ReadonlyArray<{ key: ReportPeriod; label: string }> = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This week' },
  { key: 'monthly', label: 'This month' },
  { key: 'yearly', label: 'This year' },
];

export function AdminDashboardScreen(): React.ReactElement {
  const theme = useTheme();
  const { currencySymbol } = useCatalogSettings();
  const [period, setPeriod] = useState<ReportPeriod>('daily');

  const summary = useQuery({
    queryKey: ['reports', 'summary', 'company', period],
    queryFn: () => getReportSummary({ period }),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const data = summary.data;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Dashboard" subtitle="All branches" right={<MBSyncStatus />} />

      <View style={{ padding: theme.layout.screenPad }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.space.sm }}>
          {PERIODS.map(option => {
            const selected = option.key === period;
            return (
              <Pressable
                key={option.key}
                onPress={() => setPeriod(option.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radius.pill,
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}>
                <Text
                  style={[
                    theme.type.label,
                    { color: selected ? theme.colors.onPrimary : theme.colors.text },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {summary.isPending ? (
        <MBSkeletonList rows={5} />
      ) : summary.isError ? (
        <MBErrorState
          error={summary.error}
          onRetry={() => summary.refetch()}
          retrying={summary.isFetching}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.md }}
          refreshControl={
            <RefreshControl
              refreshing={summary.isFetching && !summary.isPending}
              onRefresh={() => summary.refetch()}
              tintColor={theme.colors.primary}
            />
          }>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <MBStatCard
                label="Revenue"
                value={toNumber(data?.totalRevenue)}
                currencySymbol={currencySymbol}
              />
            </View>
            <View style={styles.gridItem}>
              <MBStatCard
                label="Expenses"
                value={toNumber(data?.totalExpenses)}
                currencySymbol={currencySymbol}
              />
            </View>
            <View style={styles.gridItem}>
              <MBStatCard
                label="Profit"
                value={toNumber(data?.totalProfit)}
                currencySymbol={currencySymbol}
              />
            </View>
            <View style={styles.gridItem}>
              <MBStatCard label="Orders" value={toNumber(data?.totalOrders)} currency={false} />
            </View>
          </View>

          {(data?.branchData ?? []).length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>By branch</Text>
              {(data?.branchData ?? []).map(branch => (
                <DetailRow
                  key={branch.branchId}
                  label={`${branch.branchName} · ${branch.totalOrders}`}
                  value={formatCurrency(branch.totalRevenue, currencySymbol)}
                />
              ))}
            </MBCard>
          ) : null}

          {(data?.topProducts ?? []).length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Top products</Text>
              {(data?.topProducts ?? []).slice(0, 8).map(product => (
                <DetailRow
                  key={product.productId}
                  label={`${product.productName} · ${formatQty(product.totalQty)}`}
                  value={formatCurrency(product.totalRevenue, currencySymbol)}
                />
              ))}
            </MBCard>
          ) : null}

          {(data?.paymentMethodBreakdown ?? []).length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Payment methods</Text>
              {(data?.paymentMethodBreakdown ?? []).map(entry => (
                <DetailRow
                  key={entry.method}
                  label={`${entry.method} · ${entry.count}`}
                  value={formatCurrency(entry.total, currencySymbol)}
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
  chip: {
    height: 36,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { flexGrow: 1, flexBasis: '46%' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 10 },
});
