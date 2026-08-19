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
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { getFinanceDashboard } from '@/services/api/financeApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, toNumber } from '@/utils/money';

/**
 * Finance Ledger dashboard.
 *
 * Read-only. Finance writes go through an approval chain with its own audit
 * trail and Postgres-function-backed posting; putting a write path on a phone
 * without that chain would be the wrong place to start.
 *
 * A `super_admin` may always view this. Whether they may WRITE depends on the
 * `allowSuperAdminWrite` setting, which is off by default — another reason this
 * screen reads only.
 */
export function FinanceDashboardScreen(): React.ReactElement {
  const theme = useTheme();
  const role = useAuthStore(s => s.claims?.role);
  const { currencySymbol } = useCatalogSettings();

  const dashboard = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: () => getFinanceDashboard(),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const data = dashboard.data;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Finance"
        subtitle={data?.businessDate ? `Business day ${data.businessDate}` : role}
        right={<MBSyncStatus />}
      />

      {dashboard.isPending ? (
        <MBSkeletonList rows={5} />
      ) : dashboard.isError ? (
        <MBErrorState
          error={dashboard.error}
          onRetry={() => dashboard.refetch()}
          retrying={dashboard.isFetching}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.md }}
          refreshControl={
            <RefreshControl
              refreshing={dashboard.isFetching && !dashboard.isPending}
              onRefresh={() => dashboard.refetch()}
              tintColor={theme.colors.primary}
            />
          }>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <MBStatCard
                label="Income today"
                value={toNumber(data?.todayIncome)}
                currencySymbol={currencySymbol}
              />
            </View>
            <View style={styles.gridItem}>
              <MBStatCard
                label="Expenses today"
                value={toNumber(data?.todayExpenses)}
                currencySymbol={currencySymbol}
              />
            </View>
            <View style={styles.gridItem}>
              <MBStatCard
                label="Cash in hand"
                value={toNumber(data?.cashInHand)}
                currencySymbol={currencySymbol}
              />
            </View>
            <View style={styles.gridItem}>
              <MBStatCard
                label="Bank"
                value={toNumber(data?.bankBalance)}
                currencySymbol={currencySymbol}
              />
            </View>
          </View>

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Position</Text>
            <DetailRow
              label="Net cash balance"
              value={formatCurrency(data?.netCashBalance, currencySymbol)}
            />
            {/* Company/branch split resolves per-branch first, then the global
                setting — never read the raw field. */}
            <DetailRow
              label="Company share"
              value={formatCurrency(data?.companyShare, currencySymbol)}
            />
            <DetailRow
              label="Branch share"
              value={formatCurrency(data?.branchShare, currencySymbol)}
            />
          </MBCard>

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Awaiting approval</Text>
            <DetailRow
              label={`Income (${toNumber(data?.pendingIncomeApprovals)})`}
              value={formatCurrency(data?.pendingIncomeAmount, currencySymbol)}
            />
            <DetailRow
              label={`Expenses (${toNumber(data?.pendingExpenseApprovals)})`}
              value={formatCurrency(data?.pendingExpenseAmount, currencySymbol)}
            />
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              Approvals are made on the web — this app is read-only for Finance.
            </Text>
          </MBCard>

          {(data?.trend ?? []).length > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Recent days</Text>
              {/* Oldest first from the server, so no reversing here. */}
              {(data?.trend ?? []).slice(-7).map(day => (
                <DetailRow
                  key={day.businessDate}
                  label={day.businessDate}
                  value={formatCurrency(day.net, currencySymbol)}
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
