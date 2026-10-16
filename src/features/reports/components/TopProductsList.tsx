import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { SalesAnalyticsTopProduct } from '@/api';
import { sortTopProducts, type TopProductSort } from '../calculations';

export interface TopProductsListProps {
  products: SalesAnalyticsTopProduct[];
}

/**
 * design UIandUX/mountainbakesBranch.html screen 23 calls for a donut, but
 * per the brief a donut is hard to read at phone width — this is the ranked
 * list instead: rank, name, category, qty, revenue, and a thin bar showing
 * each product's share of the top-10's own revenue (not of total branch
 * revenue), toggleable between Revenue and Qty sort.
 */
export function TopProductsList({ products }: TopProductsListProps) {
  const theme = useAppTheme();
  const [sort, setSort] = useState<TopProductSort>('revenue');

  const sorted = useMemo(() => sortTopProducts(products, sort), [products, sort]);
  const maxRevenue = Math.max(1, ...products.map((p) => p.totalRevenue));
  const maxQty = Math.max(1, ...products.map((p) => p.totalQty));

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 }]}>
          Top Products
        </Text>
        <View style={[styles.sortToggle, { backgroundColor: theme.colors.border, borderRadius: theme.radii.sm }]}>
          {(['revenue', 'qty'] as const).map((option) => {
            const active = option === sort;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSort(option)}
                style={[styles.sortOption, { backgroundColor: active ? theme.colors.primary : 'transparent' }]}>
                <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.textSecondary, fontWeight: '700' }]}>
                  {option === 'revenue' ? 'Revenue' : 'Qty'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {sorted.map((product, index) => {
        const shareOfTop = sort === 'revenue' ? (product.totalRevenue / maxRevenue) * 100 : (product.totalQty / maxQty) * 100;
        return (
          <View
            key={product.productId || product.productName}
            style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.cardBorder }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textFaint, width: 20 }]}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                  {product.productName}
                </Text>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(product.totalRevenue)}</Text>
              </View>
              {product.categoryName ? (
                <Text style={[theme.typography.label, { color: theme.colors.textFaint }]} numberOfLines={1}>
                  {product.categoryName}
                </Text>
              ) : null}
              <View style={[styles.barRow, { marginTop: 6 }]}>
                <View style={[styles.barTrack, { backgroundColor: theme.colors.border, borderRadius: 3 }]}>
                  <View
                    style={[styles.barFill, { width: `${Math.max(2, shareOfTop)}%`, backgroundColor: theme.colors.primary, borderRadius: 3 }]}
                  />
                </View>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{product.totalQty} sold</Text>
              </View>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sortToggle: { flexDirection: 'row', padding: 2 },
  sortOption: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 10 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barTrack: { flex: 1, height: 6, overflow: 'hidden' },
  barFill: { height: '100%' },
});
