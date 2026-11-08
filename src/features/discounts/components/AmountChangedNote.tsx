import { Text, View } from 'react-native';
import type { BranchDiscount } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';

/**
 * "Branch claimed Rs X — changed by Production" under a claim's amount, on both
 * the Branch and Production discount detail screens, once Production has
 * corrected the figure. Nothing while the amount is still the branch's own.
 */
export function AmountChangedNote({ item }: { item: BranchDiscount }) {
  const theme = useAppTheme();
  if (item.originalAmount == null) return null;
  const when = item.amountChangedAt
    ? ` · ${formatDisplayDate(item.amountChangedAt.slice(0, 10))} ${formatDisplayTime(item.amountChangedAt)}`
    : '';
  return (
    <View style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Branch claimed</Text>
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, textDecorationLine: 'line-through' }]}>
          {formatCurrency(item.originalAmount)}
        </Text>
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: 2, textAlign: 'right' }]}>
        Changed by Production{item.amountChangedByName ? ` · ${item.amountChangedByName}` : ''}
        {when}
      </Text>
    </View>
  );
}
