import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { ReportSummary } from '@/api';

export interface BudgetCardProps {
  budget: ReportSummary['budget'];
  actual: number;
  period: 'daily' | 'weekly' | 'monthly';
}

/** CLAUDE.md Section 8 — never a fabricated budget figure. */
export function BudgetCard({ budget, actual, period }: BudgetCardProps) {
  const theme = useAppTheme();
  const target = budget?.[period];

  return (
    <Card>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Budget vs Actual</Text>
      {target == null ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>No budget set for this period.</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>Ask Admin to configure branch budget.</Text>
        </View>
      ) : (
        <View style={{ marginTop: theme.spacing.md }}>
          <View style={styles.row}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Budget</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(target)}</Text>
          </View>
          <View style={[styles.row, { marginTop: 6 }]}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Actual</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(actual)}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: theme.colors.border, borderRadius: theme.radii.pill, marginTop: theme.spacing.sm }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(100, (actual / target) * 100)}%`,
                  backgroundColor: actual > target ? theme.colors.danger : theme.colors.primary,
                  borderRadius: theme.radii.pill,
                },
              ]}
            />
          </View>
          <View style={[styles.row, { marginTop: theme.spacing.sm }]}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Difference</Text>
            <Text style={[theme.typography.body, { color: actual >= target ? theme.colors.success : theme.colors.danger, fontWeight: '700' }]}>
              {formatCurrency(actual - target)}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, overflow: 'hidden' },
  fill: { height: '100%' },
});
