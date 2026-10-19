import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SALARY_LEDGER_STATUS_FILTERS, useSalaryLedger, type LedgerCellState, type SalaryLedgerStatusFilter } from '@/api';
import { useTabBarHeight } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, Screen, SearchBar, StatCard, StatusBadge } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { styles } from './styles';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const STATUS_LABEL: Record<SalaryLedgerStatusFilter, string> = {
  all: 'All',
  active: 'Active',
  resigned: 'Resigned',
  unpaid: 'Has Unpaid',
  pending: 'Has Pending',
};

function cellColor(state: LedgerCellState, theme: ReturnType<typeof useAppTheme>): string {
  switch (state) {
    case 'paid':
      return theme.colors.success;
    case 'closed':
      return theme.colors.textFaint;
    case 'unpaid':
      return theme.colors.warning;
    default:
      return theme.colors.border;
  }
}

/** mountainbakesFinance.html screen 11 — Salary Ledger: read-only, approved payslips per employee per month. */
export function FinanceSalaryLedgerScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SalaryLedgerStatusFilter>('all');

  const { data, isLoading, error, refetch, isRefetching } = useSalaryLedger({ search: search.trim() || undefined, status });

  return (
    <Screen>
      <AppHeader title="Salary Ledger" subtitle={data ? `${data.year} · Read-only` : 'Read-only'} actions={[]} />
      <FlatList
        data={data?.rows ?? []}
        keyExtractor={(item) => item.employeeId}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg + tabBarHeight }}
        ListHeaderComponent={
          <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search employee…" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: theme.spacing.sm }}>
              {SALARY_LEDGER_STATUS_FILTERS.map((option) => {
                const active = option === status;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setStatus(option)}
                    style={{
                      height: 30,
                      paddingHorizontal: 10,
                      borderRadius: 15,
                      borderWidth: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? theme.colors.primary : 'transparent',
                      borderColor: theme.colors.border,
                    }}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.textSecondary }]}>{STATUS_LABEL[option]}</Text>
                  </Pressable>
                );
              })}
            </View>
            {isLoading ? <LoadingSkeleton height={120} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
            {data ? (
              <View style={{ marginTop: theme.spacing.md }}>
                <View style={styles.statsRow}>
                  <StatCard label="Total Approved" value={formatCurrency(data.summary.totalApproved)} />
                  <StatCard label="Employees" value={`${data.summary.activeEmployees}/${data.summary.employees}`} />
                </View>
                <View style={[styles.statsRow, { marginTop: theme.spacing.sm }]}>
                  <StatCard label="Unpaid Months" value={String(data.summary.unpaidEmployeeMonths)} valueColor={theme.colors.warning} />
                  <StatCard label="Flagged" value={String(data.summary.flaggedMonths)} valueColor={data.summary.flaggedMonths > 0 ? theme.colors.danger : undefined} />
                </View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={!isLoading && !error ? <EmptyState title="No Employees" message="Nothing matches this filter." /> : undefined}
        renderItem={({ item }) => (
          <Card style={{ marginTop: theme.spacing.sm }}>
            <View style={styles.row}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
                {item.employeeName}
              </Text>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(item.total)}</Text>
            </View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
              {item.employeeCode} · {item.department}
            </Text>
            <View style={[styles.cellsRow, { marginTop: 8 }]}>
              {item.cells.map((cell) => (
                <View key={cell.month} style={styles.cellColumn}>
                  <View style={[styles.cell, { backgroundColor: cellColor(cell.state, theme) }]} />
                  <Text style={[theme.typography.label, { color: theme.colors.textFaint, fontSize: 9, marginTop: 2 }]}>{MONTH_LABELS[cell.month - 1]}</Text>
                </View>
              ))}
            </View>
            {item.hasPending || item.flaggedMonths > 0 ? (
              <View style={{ marginTop: 6, flexDirection: 'row', gap: 6 }}>
                {item.hasPending ? <StatusBadge label="Has Pending" variant="warning" /> : null}
                {item.flaggedMonths > 0 ? <StatusBadge label={`${item.flaggedMonths} Flagged`} variant="danger" /> : null}
              </View>
            ) : null}
          </Card>
        )}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
    </Screen>
  );
}
