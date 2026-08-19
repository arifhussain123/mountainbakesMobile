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
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, formatQty, toNumber } from '@/utils/money';

/**
 * Branch dashboard.
 *
 * Every figure comes from the server's own report calculation — nothing is
 * recomputed here. The server already handles the parts that are easy to get
 * subtly wrong: excluding cancelled orders, excluding unpaid `staff` sales from
 * revenue, and applying the 2 AM business-day boundary to the range.
 */

const PERIODS: ReadonlyArray<{ key: ReportPeriod; label: string }> = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This week' },
  { key: 'monthly', label: 'This month' },
];

export function BranchDashboardScreen(): React.ReactElement {
  const theme = useTheme();
  const branchName = useAuthStore(s => s.claims?.branchName);
  const { currencySymbol } = useCatalogSettings();
  const [period, setPeriod] = useState<ReportPeriod>('daily');

  const summary = useQuery({
    queryKey: ['reports', 'summary', period],
    queryFn: () => getReportSummary({ period }),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const data = summary.data;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Dashboard" subtitle={branchName ?? undefined} right={<MBSyncStatus />} />

      <View style={{ padding: theme.layout.screenPad }}>
        <View style={styles.chips}>
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
        </View>
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
                label="Sales"
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
              <MBStatCard
                label="Orders"
                value={toNumber(data?.totalOrders)}
                currency={false}
              />
            </View>
          </View>

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Breakdown</Text>
            <DetailRow
              label="Average order"
              value={formatCurrency(data?.averageOrderValue, currencySymbol)}
            />
            <DetailRow
              label="Discount given"
              value={formatCurrency(data?.totalDiscount, currencySymbol)}
            />
            <DetailRow label="Pending orders" value={String(toNumber(data?.totalPending))} />
            <DetailRow label="Cancelled" value={String(toNumber(data?.totalCancelled))} />
            {/* Unpaid staff sales are excluded from revenue and profit by the
                server; shown separately so the numbers reconcile. */}
            {toNumber(data?.staffTotal) > 0 ? (
              <DetailRow
                label="Staff (unpaid)"
                value={formatCurrency(data?.staffTotal, currencySymbol)}
              />
            ) : null}
          </MBCard>

          {(data?.topProducts ?? []).length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Top products</Text>
              {(data?.topProducts ?? []).slice(0, 5).map(product => (
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
                  label={entry.method}
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
      <Text style={[theme.type.body, styles.flex, { color: theme.colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[theme.type.mono, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { flexGrow: 1, flexBasis: '46%' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 10,
  },
});
