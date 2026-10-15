import { Pressable, Text, View } from 'react-native';
import { PrimaryButton, SecondaryButton, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { useAppTheme } from '@/shared/theme';
import type { EmployeeAdvance, FinanceDocStatus, FinanceEmployee, SalaryPayment } from '@/api';
import { styles } from './styles';

const STATUS_VARIANT: Record<FinanceDocStatus, StatusVariant> = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved: 'success',
  posted: 'success',
  locked: 'neutral',
  rejected: 'danger',
};

export function SalaryPaymentRow({
  item,
  canApprove,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  item: SalaryPayment;
  canApprove: boolean;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
      <View style={styles.row}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
          {item.employeeName}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(item.netSalary)}</Text>
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
        {item.department} · {item.designation}
      </Text>
      <View style={[styles.row, { marginTop: 6 }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {item.salaryNo} · {item.salaryMonth}
          {item.paymentDate ? ` · Paid ${item.paymentDate}` : ''}
        </Text>
        <StatusBadge label={item.status} variant={STATUS_VARIANT[item.status]} />
      </View>
      {item.status === 'pending_approval' && canApprove ? (
        <View style={[styles.actionsRow, { marginTop: 8 }]}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Reject" onPress={onReject} loading={rejecting} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Approve" onPress={onApprove} loading={approving} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function EmployeeAdvanceRow({
  item,
  canApprove,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  item: EmployeeAdvance;
  canApprove: boolean;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
      <View style={styles.row}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
          {item.employeeName}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(item.totalAmount)}</Text>
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
        {item.department} · {item.designation}
        {item.isRecovered ? ' · Recovered' : ''}
      </Text>
      <View style={[styles.row, { marginTop: 6 }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {item.advanceNo} · {item.businessDate}
        </Text>
        <StatusBadge label={item.status} variant={STATUS_VARIANT[item.status]} />
      </View>
      {item.status === 'pending_approval' && canApprove ? (
        <View style={[styles.actionsRow, { marginTop: 8 }]}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Reject" onPress={onReject} loading={rejecting} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Approve" onPress={onApprove} loading={approving} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function EmployeeRow({ item, onPress }: { item: FinanceEmployee; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, opacity: item.isActive ? 1 : 0.5 }]}>
      <View style={styles.row}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.text }]}>{formatCurrency(item.baseSalary)}</Text>
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
        {item.department} · {item.designation}{item.branchName ? ` · ${item.branchName}` : ''}
      </Text>
      <View style={[styles.row, { marginTop: 6 }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{item.employeeCode}</Text>
        <StatusBadge label={item.isActive ? 'Active' : 'Resigned'} variant={item.isActive ? 'success' : 'neutral'} />
      </View>
    </Pressable>
  );
}
