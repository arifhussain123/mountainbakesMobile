import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { SalesAnalyticsPaymentMethod } from '@/api';
import { sumPaymentMethodRevenue } from '../calculations';

export interface PaymentMethodsCardProps {
  methods: SalesAnalyticsPaymentMethod[];
  /** Reports-only: tap a method to open the Sales list pre-filtered to it. Omitted while that cross-screen navigation isn't wired (see ReportsScreen's own note). */
  onPressMethod?: (method: string) => void;
}

/**
 * design UIandUX/mountainbakesBranch.html screen 23, lines 1113-1117 —
 * Reports' own Payment Methods card: a stacked proportion bar, then
 * label+count/amount rows, each tappable to filter Sales by that method and
 * the current range. Deliberately a Reports-local component, not a reuse of
 * the Dashboard's `PaymentMethodsCard` (that one has no tap action and this
 * screen's brief explicitly lists `PaymentMethodsCard` as its own file).
 */
export function PaymentMethodsCard({ methods, onPressMethod }: PaymentMethodsCardProps) {
  const theme = useAppTheme();
  const palette = [theme.colors.secondary, theme.colors.lavender, theme.colors.success, theme.colors.infoAlt, theme.colors.orange, theme.colors.violet];
  const total = sumPaymentMethodRevenue(methods);
  const sorted = [...methods].sort((a, b) => b.total - a.total);

  if (sorted.length === 0) {
    return (
      <Card>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 }]}>
          Payment Methods
        </Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
          No sales recorded for this period yet.
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 }]}>
        Payment Methods
      </Text>
      <View style={[styles.bar, { marginTop: theme.spacing.md, backgroundColor: theme.colors.border, borderRadius: theme.radii.sm }]}>
        {sorted.map((method, index) => {
          const pct = total > 0 ? (method.total / total) * 100 : 0;
          if (pct <= 0) return null;
          return <View key={method.method} style={{ width: `${pct}%`, backgroundColor: palette[index % palette.length], height: '100%' }} />;
        })}
      </View>
      {sorted.map((method, index) => {
        const pct = total > 0 ? (method.total / total) * 100 : 0;
        return (
          <Pressable
            key={method.method}
            accessibilityRole={onPressMethod ? 'button' : undefined}
            disabled={!onPressMethod}
            onPress={() => onPressMethod?.(method.method)}
            style={[
              styles.row,
              { paddingVertical: theme.spacing.sm },
              index < sorted.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
            ]}>
            <View style={[styles.dot, { backgroundColor: palette[index % palette.length] }]} />
            <View style={styles.left}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', textTransform: 'capitalize' }]}>
                {method.method} ({method.count} orders)
              </Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{pct.toFixed(1)}% of revenue</Text>
            </View>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(method.total)}</Text>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  left: { flex: 1 },
  dot: { width: 9, height: 9, borderRadius: 2 },
});
