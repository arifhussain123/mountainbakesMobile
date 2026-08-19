import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import {
  MBCard,
  MBMoney,
  MBDataRow,
  MBErrorState,
  MBHeader,
  MBSkeletonList,
  MBStatCard,
  MBStatGrid,
  MBSyncStatus,
} from '@/components';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { getFinanceDashboard } from '@/services/api/financeApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { toNumber } from '@/utils/money';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { contentColumnWide, space } from '@/theme/spacing';

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
    queryKey: qk.finance.dashboard(),
    queryFn: () => getFinanceDashboard(),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const data = dashboard.data;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Finance"
        dataAsOf={dataAsOfFrom(dashboard.dataUpdatedAt)}
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
          /* Wide cap, not the single-column one: the stat grid is genuinely
             several measures side by side, and capping it at 640 would leave a
             tablet showing a phone's 2x2 block in the middle of the screen. */
          contentContainerStyle={[
            contentColumnWide,
            { padding: theme.layout.screenPad, gap: theme.space.md },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={dashboard.isFetching && !dashboard.isPending}
              onRefresh={() => dashboard.refetch()}
              tintColor={theme.colors.primary}
            />
          }>
          <MBStatGrid>
            <MBStatCard
              label="Income today"
              value={toNumber(data?.todayIncome)}
              currencySymbol={currencySymbol}
            />
            <MBStatCard
              label="Expenses today"
              value={toNumber(data?.todayExpenses)}
              currencySymbol={currencySymbol}
            />
            <MBStatCard
              label="Cash in hand"
              value={toNumber(data?.cashInHand)}
              currencySymbol={currencySymbol}
            />
            <MBStatCard
              label="Bank"
              value={toNumber(data?.bankBalance)}
              currencySymbol={currencySymbol}
            />
          </MBStatGrid>

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Position</Text>
            <MBDataRow
              label="Net cash balance"
              value={<MBMoney value={data?.netCashBalance} size="sm" symbol={currencySymbol} />}
            />
            {/* Company/branch split resolves per-branch first, then the global
                setting — never read the raw field. */}
            <MBDataRow
              label="Company share"
              value={<MBMoney value={data?.companyShare} size="sm" symbol={currencySymbol} />}
            />
            <MBDataRow
              label="Branch share"
              value={<MBMoney value={data?.branchShare} size="sm" symbol={currencySymbol} />}
            />
          </MBCard>

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Awaiting approval</Text>
            <MBDataRow
              label={`Income (${toNumber(data?.pendingIncomeApprovals)})`}
              value={
                <MBMoney value={data?.pendingIncomeAmount} size="sm" symbol={currencySymbol} />
              }
            />
            <MBDataRow
              label={`Expenses (${toNumber(data?.pendingExpenseApprovals)})`}
              value={
                <MBMoney value={data?.pendingExpenseAmount} size="sm" symbol={currencySymbol} />
              }
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
                <MBDataRow
                  key={day.businessDate}
                  label={day.businessDate}
                  value={<MBMoney value={day.net} size="sm" symbol={currencySymbol} />}
                />
              ))}
            </MBCard>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    paddingTop: space.snug,
  },
});
