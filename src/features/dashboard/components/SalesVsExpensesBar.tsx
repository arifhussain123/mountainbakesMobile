import { StyleSheet, Text, View } from 'react-native';
import { designType, useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { barScalePct } from '../calculations';

export interface SalesVsExpensesBarProps {
  /** The period the figures cover ("Today", "This Week"…), shown as the card's eyebrow. */
  dayLabel: string;
  sales: number;
  discounts: number;
  expenses: number;
  net: number;
}

/**
 * "Sales vs deductions" (CLAUDE.md §16) — Sales, Discounts, Expenses and Net
 * on one shared scale, so a deduction that is small against sales draws small.
 */
export function SalesVsExpensesBar({ dayLabel, sales, discounts, expenses, net }: SalesVsExpensesBarProps) {
  const theme = useAppTheme();
  const max = Math.max(1, ...[sales, discounts, expenses, Math.abs(net)].filter(Number.isFinite));
  const track = theme.isDark ? theme.colors.border : '#EEEBFD';

  const rows = [
    { label: 'Sales', kind: 'Total', value: sales, color: theme.colors.primary },
    { label: 'Discounts', kind: 'Deduction', value: discounts, color: theme.colors.secondary },
    { label: 'Expenses', kind: 'Deduction', value: expenses, color: theme.colors.danger },
    { label: 'Net', kind: 'Result', value: net, color: theme.colors.success },
  ];

  return (
    <Card style={styles.card}>
      <Text style={[designType.eyebrow, { color: theme.colors.textFaint }]}>{dayLabel}</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.item}>
          <View style={styles.labelRow}>
            <Text style={[designType.sm, { color: theme.colors.text, fontWeight: '600' }]}>
              {row.label} <Text style={[designType.xs, { color: theme.colors.textFaint }]}>{row.kind}</Text>
            </Text>
            <Text style={[designType.amt, { color: theme.colors.text }]}>{formatCurrency(row.value, `salesVsDeductions.${row.label}`)}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: track }]}>
            <View style={[styles.fill, { width: `${barScalePct(Math.abs(row.value), max)}%`, backgroundColor: row.color }]} />
          </View>
        </View>
      ))}
      <Text style={[designType.xs, { color: theme.colors.textFaint }]}>Bars share one scale, so a deduction that is small against sales draws small.</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  item: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
