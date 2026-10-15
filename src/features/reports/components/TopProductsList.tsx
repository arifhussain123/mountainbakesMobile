import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { SalesAnalyticsTopProduct } from '@/api';

export interface TopProductsListProps {
  products: SalesAnalyticsTopProduct[];
}

/**
 * design UIandUX/mountainbakesBranch.html screen 23, lines 1133-1137 — the
 * Reports screen's own "Top Products" tab shape: name + revenue on top, then
 * a SINGLE orange progress bar + qty text underneath. Deliberately not
 * `TopProductsBars` (the Home dashboard's dual purple/orange-bar shape) —
 * the design uses a different, simpler shape here.
 */
export function TopProductsList({ products }: TopProductsListProps) {
  const theme = useAppTheme();
  const maxRevenue = Math.max(1, ...products.map((p) => p.totalRevenue));

  return (
    <Card>
      {products.map((product, index) => (
        <View
          key={product.productId || product.productName}
          style={[
            styles.row,
            { paddingVertical: theme.spacing.sm },
            index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.cardBorder },
          ]}>
          <View style={styles.nameRow}>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
              {product.productName}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(product.totalRevenue)}</Text>
          </View>
          <View style={[styles.barRow, { marginTop: 6 }]}>
            <View style={[styles.barTrack, { backgroundColor: theme.colors.border, borderRadius: 3 }]}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max(2, (product.totalRevenue / maxRevenue) * 100)}%`, backgroundColor: theme.colors.primary, borderRadius: 3 },
                ]}
              />
            </View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{product.totalQty}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {},
  nameRow: { flexDirection: 'row', justifyContent: 'space-between' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barTrack: { flex: 1, height: 6, overflow: 'hidden' },
  barFill: { height: '100%' },
});
