import { StyleSheet, Text, View } from 'react-native';
import { ON_DARK_CHIP, useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { SalesAnalyticsPaymentMethod } from '@/api';
import { sharePct } from '../calculations';

export interface PaymentMethodsCardProps {
  methods: SalesAnalyticsPaymentMethod[];
}

/** Design lines 161-166 — proportion bar + a dot/label/sub/amount row per payment method. */
export function PaymentMethodsCard({ methods }: PaymentMethodsCardProps) {
  const theme = useAppTheme();
  // Theme data colors, not a fixed hex list — accent-independent (per
  // accents.ts's own rule) but still mode-aware, same as every other chart
  // in this app already reads them.
  const palette = [theme.colors.secondary, theme.colors.lavender, theme.colors.success, theme.colors.infoAlt, theme.colors.orange, theme.colors.violet];
  const total = methods.reduce((sum, m) => sum + m.total, 0);
  const sorted = [...methods].sort((a, b) => b.total - a.total);

  return (
    <Card>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 }]}>
        Payment Methods
      </Text>
      {sorted.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
          No sales recorded for this period yet.
        </Text>
      ) : (
        <>
          <View style={[styles.bar, { marginTop: theme.spacing.md, backgroundColor: theme.colors.border, borderRadius: theme.radii.sm }]}>
            {sorted.map((method, index) => {
              const pct = sharePct(method.total, total) ?? 0;
              if (pct <= 0) return null;
              return (
                <View
                  key={method.method}
                  style={[
                    styles.barSegment,
                    {
                      width: `${pct}%`,
                      backgroundColor: palette[index % palette.length],
                      paddingLeft: index === 0 ? 8 : 6,
                    },
                  ]}>
                  <Text style={[theme.typography.label, { color: ON_DARK_CHIP.fill, fontWeight: '700' }]} numberOfLines={1}>
                    {pct.toFixed(1)}%
                  </Text>
                </View>
              );
            })}
          </View>
          {sorted.map((method, index) => {
            const pct = sharePct(method.total, total) ?? 0;
            return (
              <View
                key={method.method}
                style={[
                  styles.row,
                  { paddingVertical: theme.spacing.sm },
                  index < sorted.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                ]}>
                <View style={[styles.dot, { backgroundColor: palette[index % palette.length] }]} />
                <View style={styles.left}>
                  <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', textTransform: 'capitalize' }]}>
                    {method.method}
                  </Text>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                    {method.count} sales · {pct.toFixed(1)}%
                  </Text>
                </View>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(method.total)}</Text>
              </View>
            );
          })}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: 26, overflow: 'hidden' },
  barSegment: { justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  left: { flex: 1 },
  dot: { width: 9, height: 9, borderRadius: 2 },
});
