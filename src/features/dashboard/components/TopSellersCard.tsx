import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, ListThumb } from '@/shared/ui';
import { formatCount, formatCurrency } from '@/shared/utils';
import type { SalesAnalyticsTopProduct } from '@/api';
import { dashType } from './dashType';

export type TopSellersMetric = 'sales' | 'qty';

export interface TopSellersCardProps {
  products: SalesAnalyticsTopProduct[];
  /** Rank and show by sales value or by quantity (the section's Sales / Qty switch). */
  metric: TopSellersMetric;
}

/** "Cream Puff" → "CP", "Banana" → "BA". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

/** Redesign B03 "Top sellers" — one row per product: pastel initials thumb, name, units sold, value. */
export function TopSellersCard({ products, metric }: TopSellersCardProps) {
  const theme = useAppTheme();
  const rows = [...products].sort((a, b) => (metric === 'qty' ? b.qty - a.qty : b.sales - a.sales));

  return (
    <Card style={styles.card}>
      {rows.length === 0 ? (
        <Text style={[dashType.sm, styles.empty, { color: theme.colors.textSecondary }]}>No sales in this period yet.</Text>
      ) : (
        rows.map((p, i) => (
          <View key={p.productId || p.productName} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
            <ListThumb text={initials(p.productName)} index={i} />
            <View style={styles.mid}>
              <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                {p.productName}
              </Text>
              <Text style={[dashType.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
                {metric === 'qty' ? formatCurrency(p.sales, 'topProducts.sales') : `${formatCount(p.qty, 'topProducts.qty')} sold`}
              </Text>
            </View>
            <Text style={[dashType.amt, { color: theme.colors.text }]} numberOfLines={1}>
              {metric === 'qty' ? `${formatCount(p.qty, 'topProducts.qty')} sold` : formatCurrency(p.sales, 'topProducts.sales')}
            </Text>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 4, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  mid: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  empty: { paddingVertical: 14 },
});
