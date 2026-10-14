import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { getBusinessDate, useSalesAnalytics, usePackingUsage } from '@/api';
import { SalesChart, TopProductsDonut } from '@/features/dashboard/components';
import { getAnalyticsWindow } from '@/features/dashboard/utils';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, DateFilter, EmptyState, ErrorState, LoadingSkeleton, Screen, StatCard, type DatePeriod } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { PackingUsageCard } from '../../components';
import { styles } from './styles';

const TABS = ['trend', 'topProducts', 'packing'] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = { trend: 'Trend', topProducts: 'Top Products', packing: 'Packing' };

/** branchApp.md screen 23 — Reports & Analytics. Trend/Top Products reuse the dashboard's own analytics; Packing is new. */
export function ReportsScreen() {
  const theme = useAppTheme();
  const [tab, setTab] = useState<(typeof TABS)[number]>('trend');
  const [period, setPeriod] = useState<DatePeriod>('daily');

  const today = useMemo(() => getBusinessDate(), []);
  const window = useMemo(() => getAnalyticsWindow(period, today), [period, today]);

  const analytics = useSalesAnalytics(window.from, window.to);
  const packing = usePackingUsage(window.from, window.to);

  const activeQuery = tab === 'packing' ? packing : analytics;

  return (
    <Screen>
      <AppHeader title="Reports" subtitle="Branch analytics" actions={[]} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        refreshControl={<RefreshControl refreshing={activeQuery.isRefetching} onRefresh={() => void activeQuery.refetch()} />}>
        <DateFilter value={period} onChange={setPeriod} />

        <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md, marginTop: theme.spacing.md }]}>
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
                  {TAB_LABEL[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: theme.spacing.lg }}>
          {activeQuery.isLoading ? <LoadingSkeleton height={160} /> : null}
          {activeQuery.error ? (
            <ErrorState message={mapErrorToMessage(activeQuery.error)} onRetry={() => void activeQuery.refetch()} />
          ) : null}

          {tab === 'trend' && analytics.data ? <SalesChart data={analytics.data.daily} /> : null}

          {tab === 'topProducts' && analytics.data ? (
            analytics.data.topProducts.length > 0 ? (
              <TopProductsDonut products={analytics.data.topProducts} />
            ) : (
              <EmptyState title="No Sales Yet" message="Top products for this window will appear here." />
            )
          ) : null}

          {tab === 'packing' && packing.data ? (
            <View>
              <Card style={{ marginBottom: theme.spacing.md }}>
                <View style={styles.totalsRow}>
                  <StatCard label="Requested" value={String(packing.data.totals.requested)} />
                  <StatCard label="Approved" value={String(packing.data.totals.approved)} valueColor={theme.colors.success} />
                  <StatCard label="Delivered" value={String(packing.data.totals.delivered)} valueColor={theme.colors.primary} />
                </View>
              </Card>
              {packing.data.usage.length === 0 ? (
                <EmptyState title="No Packing Usage" message="Packing material usage for this window will appear here." />
              ) : (
                packing.data.usage.map((row) => (
                  <PackingUsageCard key={`${row.date}-${row.packingMaterialId ?? row.materialName}`} row={row} />
                ))
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
