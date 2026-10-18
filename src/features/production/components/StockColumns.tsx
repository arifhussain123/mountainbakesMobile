import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ProductionCurrentStockRow } from '@/api';
import { useAppTheme } from '@/shared/theme';
import {
  COLUMN_PLOT_HEIGHT,
  STOCK_COLUMN_WIDTH,
  columnHeight,
  columnScaleMax,
  dashboardChartColors,
  describeStockColumn,
  stockColumnLabel,
  stockColumnParts,
} from '../dashboardColumns';

export interface StockColumnsProps {
  /** Products, largest stock first — drawn left to right in that order. */
  rows: ProductionCurrentStockRow[];
  /** Below this total a product is low (the server's threshold, shown in the legend). */
  threshold: number;
}

const LABEL_ROOM = 18;

/**
 * The web dashboard's Current stock as upright columns: products along the
 * bottom, production stock stacked under branch stock, the exact total above.
 * Low stock repaints the whole column amber (the split stays in the
 * accessibility label); out of stock is a ● and the word "Out". Past what the
 * screen holds the chart scrolls sideways; the screen itself never does.
 */
export function StockColumns({ rows, threshold }: StockColumnsProps) {
  const theme = useAppTheme();
  const colors = dashboardChartColors(theme.isDark);
  const max = columnScaleMax(rows.map((r) => r.total));
  const legend = [
    { key: 'production', label: 'Production stock', color: colors.productionStock },
    { key: 'branch', label: 'Branch stock', color: colors.branchStock },
    { key: 'low', label: `Low (< ${threshold})`, color: colors.lowStock },
    { key: 'out', label: 'Out', color: colors.outOfStock },
  ];

  return (
    <View>
      <View style={styles.legend}>
        {legend.map((l) => (
          <View key={l.key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: l.color }]} />
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{l.label}</Text>
          </View>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {rows.map((row) => {
          const parts = stockColumnParts(row);
          const total = parts.production + parts.branch;
          const totalHeight = columnHeight(total, max);
          // Split the drawn height in proportion, so the two parts always add up to the column.
          const prodHeight = total > 0 ? Math.round((parts.production / total) * totalHeight) : 0;
          const branchHeight = totalHeight - prodHeight;
          const low = row.state === 'low';
          const label = stockColumnLabel(row);
          return (
            <View
              key={row.productId}
              testID={`stock-column-${row.productId}`}
              accessible
              accessibilityLabel={describeStockColumn(row)}
              style={[styles.group, { width: STOCK_COLUMN_WIDTH }]}>
              <View style={[styles.plot, { height: COLUMN_PLOT_HEIGHT + LABEL_ROOM, borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.valueLabel, { bottom: totalHeight + 3, color: theme.colors.text }]} numberOfLines={1}>
                  {label.mark === 'out' ? <Text style={{ color: colors.outOfStock }}>● </Text> : null}
                  {label.mark === 'low' ? <Text style={{ color: colors.lowStock }}>▲ </Text> : null}
                  <Text style={label.mark === 'out' ? { color: theme.colors.textSecondary } : undefined}>{label.text}</Text>
                </Text>
                <View style={styles.stack}>
                  {branchHeight > 0 ? (
                    <View
                      testID={`stock-column-${row.productId}-branch`}
                      style={[
                        styles.segment,
                        styles.top,
                        { height: branchHeight, backgroundColor: low ? colors.lowStock : colors.branchStock, opacity: low ? 0.65 : 1 },
                      ]}
                    />
                  ) : null}
                  {prodHeight > 0 ? (
                    <View
                      testID={`stock-column-${row.productId}-production`}
                      style={[
                        styles.segment,
                        branchHeight === 0 && styles.top,
                        { height: prodHeight, backgroundColor: low ? colors.lowStock : colors.productionStock },
                      ]}
                    />
                  ) : null}
                </View>
              </View>
              <Text style={[theme.typography.label, styles.name, { color: theme.colors.text }]} numberOfLines={2}>
                {row.productName}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 9, height: 9, borderRadius: 2 },
  row: { alignItems: 'flex-start' },
  group: { alignItems: 'center' },
  plot: { alignSelf: 'stretch', justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  valueLabel: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  stack: { width: 26 },
  segment: { width: '100%' },
  top: { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  name: { marginTop: 6, textAlign: 'center', paddingHorizontal: 2, fontSize: 10.5 },
});
