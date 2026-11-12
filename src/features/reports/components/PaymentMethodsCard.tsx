import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PRIMARY_GRADIENT, useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { SalesAnalyticsPaymentMethod } from '@/api';
import { sumPaymentMethodRevenue } from '../calculations';

export interface PaymentMethodsCardProps {
  methods: SalesAnalyticsPaymentMethod[];
  /** Reports-only: tap a method to open the Sales list pre-filtered to it. Omitted while that cross-screen navigation isn't wired (see ReportsScreen's own note). */
  onPressMethod?: (method: string) => void;
}

/** The redesign's second chart colour ("honey"), used for the runner-up method's bar. */
const HONEY = '#FFD36E';

/**
 * 2026 redesign B23 — Payment methods card: per method, "Cash · N orders"
 * against its amount, then a progress bar of its share of revenue (saffron
 * gradient for the biggest, honey for the next). Each row stays tappable
 * when `onPressMethod` is wired. Deliberately a Reports-local component, not
 * a reuse of the Dashboard's `PaymentMethodsCard` (that one has no tap action).
 */
export function PaymentMethodsCard({ methods, onPressMethod }: PaymentMethodsCardProps) {
  const theme = useAppTheme();
  const palette = [theme.colors.primary, theme.isDark ? theme.colors.secondary : HONEY, theme.colors.secondary, theme.colors.success, theme.colors.info, theme.colors.violet];
  const track = theme.isDark ? theme.colors.border : '#EEF0F8';
  const total = sumPaymentMethodRevenue(methods);
  const sorted = [...methods].sort((a, b) => b.total - a.total);

  return (
    <Card style={styles.card}>
      <Text style={[styles.h3, { color: theme.colors.text }]}>Payment methods</Text>
      {sorted.length === 0 ? (
        <Text style={[styles.sm, { color: theme.colors.textSecondary }]}>No sales recorded for this period yet.</Text>
      ) : (
        <View style={styles.list}>
          {sorted.map((method, index) => {
            const pct = total > 0 ? (method.total / total) * 100 : 0;
            const color = palette[index % palette.length];
            const gradient = index === 0 && !theme.isDark && theme.accent === 'orange';
            return (
              <Pressable
                key={method.method}
                accessibilityRole={onPressMethod ? 'button' : undefined}
                accessibilityLabel={`${method.method}, ${method.count} orders, ${formatCurrency(method.total)}, ${pct.toFixed(1)} percent of revenue`}
                disabled={!onPressMethod}
                onPress={() => onPressMethod?.(method.method)}
                style={styles.row}>
                <View style={styles.between}>
                  <Text style={[styles.sm, styles.grow, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    <Text style={styles.capitalize}>{method.method}</Text> · {method.count} {method.count === 1 ? 'order' : 'orders'} · {pct.toFixed(1)}%
                  </Text>
                  <Text style={[styles.amt, { color: theme.colors.text }]}>{formatCurrency(method.total)}</Text>
                </View>
                <View style={[styles.track, { backgroundColor: track }]}>
                  {pct > 0 ? (
                    gradient ? (
                      <LinearGradient colors={[...PRIMARY_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fill, { width: `${pct}%` }]} />
                    ) : (
                      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
                    )
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  list: { gap: 10 },
  row: { gap: 8, minHeight: 44, justifyContent: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  grow: { flex: 1 },
  sm: { fontSize: 13, lineHeight: 18 },
  capitalize: { textTransform: 'capitalize' },
  amt: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', width: '100%' },
  fill: { height: 8, borderRadius: 4 },
});
