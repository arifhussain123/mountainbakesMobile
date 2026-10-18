import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { FINANCE_ROLE_LABELS, type FinanceRole, useFinanceDashboard } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, Screen, StatCard } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { FinanceTrendChart, LedgerEntryRow } from '../../components';
import { styles } from './styles';

/** mountainbakesFinance.html screen 01 — today's composite + trend, not the monthly multi-chart view (see docs/mobile-finance-plan.md). */
export function FinanceDashboardScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, error, refetch, isRefetching } = useFinanceDashboard();

  return (
    <Screen>
      <AppHeader
        title="Finance Dashboard"
        subtitle={user?.role ? (FINANCE_ROLE_LABELS[user.role as FinanceRole] ?? 'Finance') : 'Finance'}
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={theme.colors.primary} />}>
        {isLoading ? (
          <View style={{ gap: theme.spacing.md }}>
            <LoadingSkeleton height={100} />
            <LoadingSkeleton height={160} />
            <LoadingSkeleton height={160} />
          </View>
        ) : error ? (
          <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} />
        ) : data ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.section} contentContainerStyle={{ gap: theme.spacing.sm }}>
              <StatCard label="Today's Income" value={formatCurrency(data.todayIncome, 'todayIncome')} valueColor={theme.colors.success} />
              <StatCard label="Today's Expenses" value={formatCurrency(data.todayExpenses, 'todayExpenses')} valueColor={theme.colors.danger} />
              <StatCard label="Net Cash Balance" value={formatCurrency(data.netCashBalance, 'netCashBalance')} />
              <StatCard label="Company Share" value={formatCurrency(data.companyShare, 'companyShare')} />
              <StatCard label="Branch Share" value={formatCurrency(data.branchShare, 'branchShare')} />
            </ScrollView>

            <Card style={styles.section}>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Cash &amp; Bank</Text>
              <View style={[styles.row, { marginTop: theme.spacing.md }]}>
                <StatCard label="Cash in Hand" value={formatCurrency(data.cashInHand, 'cashInHand')} />
                <StatCard label="Bank" value={formatCurrency(data.bankBalance, 'bankBalance')} />
              </View>
            </Card>

            {data.pendingIncomeApprovals + data.pendingExpenseApprovals > 0 ? (
              <Card style={[styles.section, { borderColor: theme.colors.warning }]}>
                <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Pending Approvals</Text>
                <View style={[styles.row, { marginTop: theme.spacing.md }]}>
                  <StatCard
                    label={`Income (${data.pendingIncomeApprovals})`}
                    value={formatCurrency(data.pendingIncomeAmount, 'pendingIncomeAmount')}
                    valueColor={theme.colors.warning}
                  />
                  <StatCard
                    label={`Expense (${data.pendingExpenseApprovals})`}
                    value={formatCurrency(data.pendingExpenseAmount, 'pendingExpenseAmount')}
                    valueColor={theme.colors.warning}
                  />
                </View>
              </Card>
            ) : null}

            {data.trend.length > 0 ? (
              <View style={styles.section}>
                <FinanceTrendChart data={data.trend} />
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Recent Ledger Entries</Text>
              {data.recentEntries.length > 0 ? (
                <Card style={{ marginTop: theme.spacing.sm }}>
                  {data.recentEntries.map((entry) => (
                    <LedgerEntryRow key={entry.id} entry={entry} />
                  ))}
                </Card>
              ) : (
                <EmptyState title="No Entries Yet" message="Posted ledger entries will appear here." />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
