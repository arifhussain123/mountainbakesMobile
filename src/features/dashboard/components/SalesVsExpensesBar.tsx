import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { barScalePct } from '../calculations';

export interface SalesVsExpensesBarProps {
  dayLabel: string;
  sales: number;
  discounts: number;
  expenses: number;
  net: number;
}

/**
 * Design lines 122-128 — "Sales vs Deductions" per-row bar list: Sales,
 * Discounts, Expenses and Net all sharing one scale, so a deduction that is
 * small against sales draws small.
 */
export function SalesVsExpensesBar({ dayLabel, sales, discounts, expenses, net }: SalesVsExpensesBarProps) {
  const theme = useAppTheme();
  const max = Math.max(1, sales, discounts, expenses, Math.abs(net));

  const rows = [
    { label: 'Sales', kind: 'TOTAL', value: sales, color: theme.colors.primary },
    { label: 'Discounts', kind: 'DEDUCTION', value: discounts, color: theme.colors.secondary },
    { label: 'Expenses', kind: 'DEDUCTION', value: expenses, color: theme.colors.danger },
    { label: 'Net', kind: 'RESULT', value: net, color: theme.colors.success },
  ];

  return (
    <Card>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 }]}>
        Sales vs Deductions · {dayLabel}
      </Text>
      <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.md }}>
        {rows.map((row) => (
          <View key={row.label}>
            <View style={styles.labelRow}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>
                {row.label} <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{row.kind}</Text>
              </Text>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(row.value)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.colors.border, borderRadius: theme.radii.pill, marginTop: 6 }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${barScalePct(Math.abs(row.value), max)}%`, backgroundColor: row.color, borderRadius: theme.radii.pill },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textFaint, marginTop: theme.spacing.md }]}>
        Bars share one scale, so a deduction that is small against sales draws small.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 8, overflow: 'hidden' },
  fill: { height: '100%' },
});
