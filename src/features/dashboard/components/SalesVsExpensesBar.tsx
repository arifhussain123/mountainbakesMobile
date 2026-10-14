import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';

export interface SalesVsExpensesBarProps {
  sales: number;
  expenses: number;
  net: number;
}

/** CLAUDE.md Section 16 — one scale, so a small deduction visibly draws small. */
export function SalesVsExpensesBar({ sales, expenses, net }: SalesVsExpensesBarProps) {
  const theme = useAppTheme();
  const max = Math.max(1, sales, expenses, Math.abs(net));

  const rows = [
    { label: 'Sales', value: sales, color: theme.colors.primary },
    { label: 'Expenses', value: expenses, color: theme.colors.danger },
    { label: 'Net', value: net, color: theme.colors.success },
  ];

  return (
    <Card>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Sales vs Expenses</Text>
      <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
        {rows.map((row) => (
          <View key={row.label}>
            <View style={styles.labelRow}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{row.label}</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(row.value)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.colors.border, borderRadius: theme.radii.pill }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.min(100, (Math.abs(row.value) / max) * 100)}%`, backgroundColor: row.color, borderRadius: theme.radii.pill },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  track: { height: 8, overflow: 'hidden' },
  fill: { height: '100%' },
});
