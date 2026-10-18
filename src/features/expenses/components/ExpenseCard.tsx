import { Pressable, StyleSheet, Text, View } from 'react-native';
import { openNewQuery } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { Expense } from '@/api';

/** Icon-only "Report an issue" (the flag glyph `ReportIssueAction` also uses) — a compact variant for a dense list row, where the labeled-button version would be too tall per card. `expenseNumber` is always present here: `ExpenseCard` only ever renders a synced row, there is no locally-queued/unsynced expense concept in this app yet (Step 0). */
function ReportIssueIconButton({ referenceId }: { referenceId: string }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Report an issue with ${referenceId}`}
      hitSlop={8}
      onPress={() => openNewQuery(referenceId)}
      style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="flag" size={15} color={theme.colors.textFaint} />
    </Pressable>
  );
}

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
      <View style={[styles.row, { marginTop: 6, alignItems: 'center' }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{item.expenseNumber}</Text>
        <ReportIssueIconButton referenceId={item.expenseNumber} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  categoryPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
});
