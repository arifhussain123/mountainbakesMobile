import { useRef } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import {
  financeCan,
  generateIdempotencyKey,
  useCloseFinanceDay,
  useDayClosing,
  useDayClosingHistory,
  useFinanceDashboard,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, Screen, StatCard, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { styles } from './styles';

/** mountainbakesFinance.html screen 18 — Daily Closing: close and lock a business date. */
export function FinanceClosingScreen() {
  const theme = useAppTheme();
  const role = useAuthStore((state) => state.user?.role);
  const canClose = financeCan(role, 'approve');

  const dashboard = useFinanceDashboard();
  const businessDate = dashboard.data?.businessDate;

  const today = useDayClosing(businessDate);
  const history = useDayClosingHistory(30);
  const close = useCloseFinanceDay();
  const closeKeyRef = useRef(generateIdempotencyKey('finance_closing'));

  const isLoading = today.isLoading || history.isLoading;
  const firstError = today.error ?? history.error;
  const refetchAll = () => {
    void today.refetch();
    void history.refetch();
  };

  const handleClose = () => {
    if (!businessDate) return;
    Alert.alert('Close Today', `Lock ${formatDisplayDate(businessDate)}? This cannot be undone if pending approvals are clear.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close Day',
        style: 'destructive',
        onPress: () =>
          close.mutate(
            { businessDate, idempotencyKey: closeKeyRef.current },
            { onSuccess: refetchAll, onError: (e) => Alert.alert('Could Not Close', mapErrorToMessage(e)) },
          ),
      },
    ]);
  };

  return (
    <Screen>
      <AppHeader title="Daily Closing" subtitle="Close and lock a business date" actions={[]} />
      <FlatList
        data={history.data ?? []}
        keyExtractor={(item) => item.businessDate}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            {isLoading ? <LoadingSkeleton height={160} /> : null}
            {firstError ? <ErrorState message={mapErrorToMessage(firstError)} onRetry={refetchAll} /> : null}

            {today.data ? (
              <Card>
                <View style={styles.row}>
                  <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{businessDate ? formatDisplayDate(businessDate) : 'Today'}</Text>
                  <StatusBadge label={today.data.status === 'closed' ? 'Closed' : 'Open'} variant={today.data.status === 'closed' ? 'neutral' : 'success'} />
                </View>
                <View style={[styles.statsRow, { marginTop: theme.spacing.md }]}>
                  <StatCard label="Income" value={formatCurrency(today.data.totalIncome)} valueColor={theme.colors.success} />
                  <StatCard label="Expenses" value={formatCurrency(today.data.totalExpenses)} valueColor={theme.colors.danger} />
                </View>
                <View style={[styles.statsRow, { marginTop: theme.spacing.sm }]}>
                  <StatCard label="Cash in Hand" value={formatCurrency(today.data.cashInHand)} />
                  <StatCard label="Bank" value={formatCurrency(today.data.bankBalance)} />
                </View>
                <View style={[styles.statsRow, { marginTop: theme.spacing.sm }]}>
                  <StatCard label="Closing Balance" value={formatCurrency(today.data.closingBalance)} />
                  <StatCard label="Entries" value={String(today.data.entryCount)} />
                </View>

                {today.data.status === 'closed' ? (
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
                    Closed by {today.data.closedByName} · {today.data.closedAt ? formatDisplayDate(today.data.closedAt) : ''}
                  </Text>
                ) : canClose ? (
                  <View style={{ marginTop: theme.spacing.lg }}>
                    <PrimaryButton label="Close Day" onPress={handleClose} loading={close.isPending} />
                  </View>
                ) : null}
              </Card>
            ) : null}

            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginTop: theme.spacing.lg }]}>History</Text>
          </View>
        }
        ListEmptyComponent={!isLoading && !firstError ? <EmptyState title="No Closed Days" message="No business date has been closed yet." /> : undefined}
        renderItem={({ item }) => (
          <Card style={{ marginTop: theme.spacing.sm }}>
            <View style={styles.row}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatDisplayDate(item.businessDate)}</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(item.closingBalance)}</Text>
            </View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
              {item.entryCount} entries · closed by {item.closedByName}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}
