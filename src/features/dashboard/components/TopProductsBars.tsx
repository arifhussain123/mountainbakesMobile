import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCount, formatCurrency } from '@/shared/utils';
import type { SalesAnalyticsTopProduct } from '@/api';
import { barScalePct } from '../calculations';

export interface TopProductsBarsProps {
  products: SalesAnalyticsTopProduct[];
}

/**
 * Design lines 148-152 — "Top Selling Products" dual-bar list: a purple bar
 * for sales value and an orange bar + qty number for quantity, per product.
 */
export function TopProductsBars({ products }: TopProductsBarsProps) {
  const theme = useAppTheme();
  const maxSales = Math.max(1, ...products.map((p) => p.sales));
  const maxQty = Math.max(1, ...products.map((p) => p.qty));

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 }]}>
          Top Selling Products
        </Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.secondary }]} />
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Sales</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Qty</Text>
          </View>
        </View>
      </View>
      {products.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
          No sales in this period yet.
        </Text>
      ) : (
        <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.md }}>
          {products.map((product) => (
            <View key={product.productId || product.productName}>
              <View style={styles.nameRow}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
                  {product.productName}
                </Text>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(product.sales, 'topProducts.sales')}</Text>
              </View>
              <View style={{ marginTop: 7, gap: 4 }}>
                <View style={[styles.bar, { width: `${Math.max(2, barScalePct(product.sales, maxSales))}%`, backgroundColor: theme.colors.secondary }]} />
                <View style={styles.qtyRow}>
                  <View style={[styles.bar, { width: `${Math.max(2, barScalePct(product.qty, maxQty))}%`, backgroundColor: theme.colors.primary }]} />
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {formatCount(product.qty, 'topProducts.qty')}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legend: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 2 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { height: 6, borderRadius: 3, maxWidth: '100%' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
});
