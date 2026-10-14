import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { Expense } from '@/api';

export interface ExpenseCardProps {
  item: Expense;
}

const PAYMENT_LABEL: Record<Expense['paymentMethod'], string> = { cash: 'Cash', easypaisa: 'Easypaisa' };

/** branchApp.md screen 16 — one shop expense row. */
export function ExpenseCard({ item }: ExpenseCardProps) {
  const theme = useAppTheme();

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.categoryPill, { backgroundColor: `${theme.colors.primary}1A` }]}>
              <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>{item.category}</Text>
            </View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{formatDisplayDate(item.date)}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{formatCurrency(item.amount)}</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{PAYMENT_LABEL[item.paymentMethod]}</Text>
        </View>
      </View>
      {item.remarks ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 8 }]} numberOfLines={2}>
          <Text style={{ color: theme.colors.textSecondary }}>Remarks · </Text>
          {item.remarks}
        </Text>
      ) : null}
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>{item.expenseNumber}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  categoryPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
});
