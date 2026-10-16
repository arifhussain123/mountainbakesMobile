import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, type IconName } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';

export interface KpiItem {
  id: string;
  label: string;
  value: string;
  icon: IconName;
  valueColor?: string;
  muted?: boolean;
  /** Only set for Revenue, from `sales_analytics`'s own aggregate comparison — no other KPI has previous-period data available (see calculations.ts). */
  delta?: { pct: number; direction: 'up' | 'down' | 'stable' };
}

export interface KpiGridProps {
  items: KpiItem[];
}

/** branchApp.md screen 23 — 2-column KPI grid: Total orders, Revenue, Avg. order value, Cancelled, Expenses, Net. */
export function KpiGrid({ items }: KpiGridProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Card
          key={item.id}
          style={[styles.cell, { borderColor: theme.colors.cardBorder, padding: theme.spacing.md, opacity: item.muted ? 0.6 : 1 }]}>
          <View style={styles.topRow}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{item.label}</Text>
            <Icon name={item.icon} size={15} color={theme.colors.textSecondary} />
          </View>
          <Text style={[theme.typography.cardTitle, { color: item.valueColor ?? theme.colors.text, marginTop: 6, fontSize: 18 }]} numberOfLines={1}>
            {item.value}
          </Text>
          {item.delta ? (
            <Text
              accessibilityLabel={`${item.delta.direction === 'up' ? 'up' : item.delta.direction === 'down' ? 'down' : 'flat'} ${Math.abs(item.delta.pct).toFixed(1)} percent vs previous period`}
              style={[
                theme.typography.label,
                { color: item.delta.direction === 'down' ? theme.colors.danger : item.delta.direction === 'up' ? theme.colors.success : theme.colors.textFaint, marginTop: 2 },
              ]}>
              {item.delta.direction === 'down' ? '▼' : item.delta.direction === 'up' ? '▲' : '–'} {Math.abs(item.delta.pct).toFixed(1)}% vs previous
            </Text>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

export function formatMoney(value: number): string {
  return formatCurrency(value);
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '47%', borderWidth: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
