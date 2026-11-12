import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PRIMARY_GRADIENT, useAppTheme } from '@/shared/theme';
import { Card, ListThumb, SegmentedControl, type SegmentedOption } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { SalesAnalyticsTopProduct } from '@/api';
import { sortTopProducts, type TopProductSort } from '../calculations';

export interface TopProductsListProps {
  products: SalesAnalyticsTopProduct[];
}

const SORT_OPTIONS: SegmentedOption<TopProductSort>[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'qty', label: 'Qty' },
];

/**
 * The "Top products" tab — a ranked list instead of a donut (a donut is hard
 * to read at phone width): a pastel rank thumb, name, category, revenue, and
 * a thin bar showing each product's share of the top-10's own revenue (not of
 * total branch revenue), toggleable between Revenue and Qty sort.
 */
export function TopProductsList({ products }: TopProductsListProps) {
  const theme = useAppTheme();
  const [sort, setSort] = useState<TopProductSort>('revenue');

  const sorted = useMemo(() => sortTopProducts(products, sort), [products, sort]);
  const maxRevenue = Math.max(1, ...products.map((p) => p.sales));
  const maxQty = Math.max(1, ...products.map((p) => p.qty));
  const track = theme.isDark ? theme.colors.border : '#EEF0F8';
  const gradient = !theme.isDark && theme.accent === 'orange';

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.h3, { color: theme.colors.text }]}>Top products</Text>
        <SegmentedControl options={SORT_OPTIONS} value={sort} onChange={setSort} style={styles.seg} />
      </View>

      <View>
        {sorted.map((product, index) => {
          const shareOfTop = sort === 'revenue' ? (product.sales / maxRevenue) * 100 : (product.qty / maxQty) * 100;
          const width = `${Math.max(2, shareOfTop)}%` as const;
          return (
            <View
              key={product.productId || product.productName}
              style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
              <ListThumb text={String(index + 1)} index={index} />
              <View style={styles.body}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                    {product.productName}
                  </Text>
                  <Text style={[styles.amt, { color: theme.colors.text }]}>{formatCurrency(product.sales)}</Text>
                </View>
                <View style={styles.nameRow}>
                  <Text style={[styles.xs, { color: theme.colors.textFaint, flex: 1 }]} numberOfLines={1}>
                    {product.categoryName ?? ' '}
                  </Text>
                  <Text style={[styles.xs, { color: theme.colors.textSecondary }]}>{product.qty} sold</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: track }]}>
                  {gradient ? (
                    <LinearGradient colors={[...PRIMARY_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.barFill, { width }]} />
                  ) : (
                    <View style={[styles.barFill, { width, backgroundColor: theme.colors.primary }]} />
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  h3: { flexShrink: 1, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  seg: { width: 160 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  amt: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  barFill: { height: 6, borderRadius: 3 },
});
