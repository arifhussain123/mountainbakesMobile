import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { usePartnerLedger, usePartnerLedgerTransactions, type LedgerCellState } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, Screen, StatCard, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { styles } from './styles';

const TABS = ['summary', 'transactions'] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = { summary: 'Summary', transactions: 'Transactions' };
const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function cellColor(state: LedgerCellState, theme: ReturnType<typeof useAppTheme>): string {
  return state === 'paid' ? theme.colors.success : theme.colors.border;
}

/** mountainbakesFinance.html screen 15 — Company Transaction Details: the partner ledger, approved partner tx per month, strictly read-only. */
export function FinanceCompanyTransactionDetailsScreen() {
  const theme = useAppTheme();
  const [tab, setTab] = useState<(typeof TABS)[number]>('summary');

  const ledger = usePartnerLedger({});
  const transactions = usePartnerLedgerTransactions({ year: ledger.data?.year, limit: 50 });

  return (
    <Screen>
      <AppHeader title="Company Transaction Details" subtitle={ledger.data ? `${ledger.data.year} · Read-only` : 'Read-only'} actions={[]} />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
          {TABS.map((option) => {
            const active = option === tab;
            return (
              <Pressable
                key={option}
                onPress={() => setTab(option)}
                style={[styles.tab, { backgroundColor: active ? theme.colors.primary : 'transparent', borderRadius: theme.radii.sm }]}>
                <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>{TAB_LABEL[option]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {tab === 'summary' ? (
        <FlatList
          data={ledger.data?.rows ?? []}
          keyExtractor={(item) => item.partnerId}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          ListHeaderComponent={
            <View style={{ marginBottom: theme.spacing.sm }}>
              {ledger.isLoading ? <LoadingSkeleton height={120} /> : null}
              {ledger.error ? <ErrorState message={mapErrorToMessage(ledger.error)} onRetry={() => void ledger.refetch()} /> : null}
              {ledger.data ? (
                <View style={styles.statsRow}>
                  <StatCard label="Year Total" value={formatCurrency(ledger.data.summary.yearTotal)} />
                  <StatCard label="Transactions" value={String(ledger.data.summary.transactionCount)} />
                  <StatCard label="Partners" value={String(ledger.data.summary.partners)} />
                  <StatCard
                    label="Highest Month"
                    value={ledger.data.summary.highestMonth ? formatCurrency(ledger.data.summary.highestMonth.amount) : '—'}
                  />
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={!ledger.isLoading && !ledger.error ? <EmptyState title="No Activity" message="No partner transactions this year." /> : undefined}
          renderItem={({ item }) => (
            <Card style={{ marginTop: theme.spacing.sm }}>
              <View style={styles.row}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{item.partnerName}</Text>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(item.total)}</Text>
              </View>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{item.partnerCode} · {item.sharePct}%</Text>
              <View style={[styles.cellsRow, { marginTop: 8 }]}>
                {item.cells.map((cell) => (
                  <View key={cell.month} style={styles.cellColumn}>
                    <View style={[styles.cell, { backgroundColor: cellColor(cell.state, theme) }]} />
                    <Text style={[theme.typography.label, { color: theme.colors.textFaint, fontSize: 9, marginTop: 2 }]}>{MONTH_LABELS[cell.month - 1]}</Text>
                  </View>
                ))}
              </View>
              {item.hasPending ? <StatusBadge label="Has Pending" variant="warning" /> : null}
            </Card>
          )}
        />
      ) : null}

      {tab === 'transactions' ? (
        <FlatList
          data={transactions.data?.transactions ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          ListHeaderComponent={
            <View style={{ marginBottom: theme.spacing.sm }}>
              {transactions.isLoading ? <LoadingSkeleton height={100} /> : null}
              {transactions.error ? <ErrorState message={mapErrorToMessage(transactions.error)} onRetry={() => void transactions.refetch()} /> : null}
              {transactions.data ? (
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                  {transactions.data.countedCount} counted · {formatCurrency(transactions.data.countedTotal)}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={!transactions.isLoading && !transactions.error ? <EmptyState title="No Transactions" message="Nothing this year yet." /> : undefined}
          renderItem={({ item }) => (
            <Card style={{ marginTop: theme.spacing.sm }}>
              <View style={styles.row}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{item.partnerName}</Text>
                <Text style={[theme.typography.body, { color: theme.colors.danger, fontWeight: '700' }]}>{formatCurrency(item.amount)}</Text>
              </View>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                {item.expenseNo} · {item.txnKind} · {formatDisplayDate(item.businessDate)}
              </Text>
            </Card>
          )}
        />
      ) : null}
    </Screen>
  );
}
