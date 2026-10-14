import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { SalesAnalyticsTopProduct } from '@/api';

export interface TopProductsDonutProps {
  products: SalesAnalyticsTopProduct[];
}

const SLICE_COLORS = ['#FF6B35', '#F5B800', '#2E7D32', '#4EA8DE', '#9D91E8', '#8A7A6D'];
const SIZE = 120;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** CLAUDE.md Section 15 — a donut chart + ranked list, tap deferred to a later phase. */
export function TopProductsDonut({ products }: TopProductsDonutProps) {
  const theme = useAppTheme();
  const total = products.reduce((sum, p) => sum + p.totalRevenue, 0) || 1;
  let cumulative = 0;

  return (
    <Card>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Top Products</Text>
      <View style={[styles.row, { marginTop: theme.spacing.md }]}>
        <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={theme.colors.border} strokeWidth={STROKE} fill="none" />
          {products.map((product, index) => {
            const fraction = product.totalRevenue / total;
            const dash = fraction * CIRCUMFERENCE;
            const offset = -cumulative * CIRCUMFERENCE;
            cumulative += fraction;
            return (
              <Circle
                key={product.productId || product.productName}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={SLICE_COLORS[index % SLICE_COLORS.length]}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={offset}
                fill="none"
              />
            );
          })}
        </Svg>
        <View style={styles.list}>
          {products.map((product, index) => (
            <View key={product.productId || product.productName} style={styles.listRow}>
              <View style={[styles.dot, { backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }]} />
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                {product.productName}
              </Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                {Math.round((product.totalRevenue / total) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
      {products.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
          No sales in this period yet.
        </Text>
      ) : null}
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
        Total: {formatCurrency(total)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  list: { flex: 1, gap: 8, minWidth: 0 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
