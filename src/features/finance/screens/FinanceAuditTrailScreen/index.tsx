import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useFinanceAudit } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, Screen } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { getFinanceDateRange, type FinanceDateRangePreset } from '../../utils/dateRange';
import { FinanceDateRangeFilter } from '../../components/FinanceDateRangeFilter';
import { styles } from './styles';

const ACTION_LABEL: Record<string, string> = {
  created: 'Created',
  updated: 'Updated',
  submitted: 'Submitted',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
  posted: 'Posted',
  reversed: 'Reversed',
  adjusted: 'Adjusted',
  locked: 'Locked',
  imported: 'Imported',
  settings_updated: 'Settings Updated',
  salary_revised: 'Salary Revised',
  resigned: 'Resignation Recorded',
  resignation_cancelled: 'Resignation Cancelled',
  resolved: 'Resolved',
  reopened: 'Reopened',
  reopen_requested: 'Reopen Requested',
  deleted: 'Deleted',
  amended: 'Amended',
  restored: 'Restored',
  recreated: 'Recreated',
};

const ENTITY_LABEL: Record<string, string> = {
  ledger_entry: 'Ledger Entry',
  ledger_head: 'Ledger Head',
  finance_transaction: 'Income/Expense Entry',
  income_approval: 'Branch Income',
  salary_payment: 'Payslip',
  employee_advance: 'Employee Advance',
  partner_expense: 'Partner Advance/Draw',
  employee: 'Employee',
  day_closing: 'Daily Closing',
  settings: 'Settings',
  branch_share_payment: 'Branch Share Payment',
  finance_partner: 'Partner',
  finance_ticket: 'Help Desk Query',
  cash_transfer: 'Cash Transfer',
};

/** mountainbakesFinance.html screen 20 — every write across the module (ledger, heads, settings, closings), read-only. */
export function FinanceAuditTrailScreen() {
  const theme = useAppTheme();
  const [preset, setPreset] = useState<FinanceDateRangePreset>('week');
  const range = getFinanceDateRange(preset);

  const { data, isLoading, error, refetch, isRefetching } = useFinanceAudit({ from: range.from, to: range.to, limit: 100 });

  return (
    <Screen>
      <AppHeader title="Audit Trail" subtitle="Every write across the module" actions={[]} />
      <FlatList
        data={data?.logs ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <FinanceDateRangeFilter value={preset} onChange={setPreset} />
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={!isLoading && !error ? <EmptyState title="No Activity" message="Nothing was written in this window." /> : undefined}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 8 }}>
            <View style={styles.row}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>
                {ACTION_LABEL[item.action] ?? item.action}
              </Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{formatDisplayDate(item.createdAt)}</Text>
            </View>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 4 }]}>
              {ENTITY_LABEL[item.entity] ?? item.entity}
              {item.entityRef ? ` · ${item.entityRef}` : ''}
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>{item.actorName}</Text>
          </Card>
        )}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
    </Screen>
  );
}
