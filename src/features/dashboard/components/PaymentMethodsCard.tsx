import { StyleSheet, Text, View } from 'react-native';
import { PASTEL_TILES, useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCount, formatCurrency, formatPercent } from '@/shared/utils';
import type { SalesAnalyticsPaymentMethod } from '@/api';
import { sharePct } from '../calculations';
import { DonutRing } from './DonutRing';
import { dashType } from './dashType';

export interface PaymentMethodsCardProps {
  methods: SalesAnalyticsPaymentMethod[];
}

/** Redesign B03 "Payment methods" — a donut of each method's share (sales count in the middle) beside its legend. */
export function PaymentMethodsCard({ methods }: PaymentMethodsCardProps) {
  const theme = useAppTheme();
  // Saffron + honey first, as the mockup; then theme data colours for any further method.
  const honey = theme.isDark ? theme.colors.warning : PASTEL_TILES[2].to;
  const palette = [theme.colors.primary, honey, theme.colors.secondary, theme.colors.success, theme.colors.infoAlt, theme.colors.violet];
  const total = methods.reduce((sum, m) => sum + m.total, 0);
  const count = methods.reduce((sum, m) => sum + m.count, 0);
  const sorted = [...methods].sort((a, b) => b.total - a.total);

  if (sorted.length === 0) {
    return (
      <Card>
        <Text style={[dashType.sm, { color: theme.colors.textSecondary }]}>No sales recorded for this period yet.</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.row}>
      <DonutRing
        size={112}
        stroke={16}
        parts={sorted.map((m, i) => ({ pct: sharePct(m.total, total) ?? 0, color: palette[i % palette.length] }))}>
        <Text style={[dashType.h3, { color: theme.colors.text }]}>{formatCount(count, 'paymentMethods.count')}</Text>
        <Text style={[dashType.xs, { color: theme.colors.textFaint }]}>sales</Text>
      </DonutRing>
      <View style={styles.legend}>
        {sorted.map((method, index) => {
          const pct = sharePct(method.total, total) ?? 0;
          return (
            <View key={method.method} style={styles.item}>
              <View style={styles.keyRow}>
                <View style={[styles.swatch, { backgroundColor: palette[index % palette.length] }]} />
                <Text style={[dashType.sm, styles.method, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {method.method} · {formatPercent(pct, 'paymentMethods.share')}
                </Text>
              </View>
              <Text style={[dashType.amt, { color: theme.colors.text }]} numberOfLines={1}>
                {formatCurrency(method.total, 'paymentMethods.total')}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  legend: { flex: 1, minWidth: 0, gap: 12 },
  item: { gap: 2 },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  method: { flexShrink: 1, textTransform: 'capitalize' },
});
