import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { useClosingStockHistogram } from '../hooks';
import type { StockRow } from '@/api';

export interface ClosingStockHistogramProps {
  rows: StockRow[];
}

/**
 * Design lines 974-979 ("CLOSING STOCK HISTOGRAM") — a wrapped row of
 * clickable product filter chips (dot + name + balance), then a mini
 * two-bar-per-day sparkline per selected product (or the first few products
 * when nothing is selected). The underlying per-product daily series isn't
 * available yet (see `useClosingStockHistogram`), so this renders the chips
 * from the real closing-stock rows and an empty state below until that data
 * exists, rather than fabricating bars.
 */
export function ClosingStockHistogram({ rows }: ClosingStockHistogramProps) {
  const theme = useAppTheme();
  const dotPalette = [theme.colors.secondary, theme.colors.lavender, theme.colors.success, theme.colors.infoAlt, theme.colors.orange, theme.colors.violet];
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (productId: string) => {
    setSelected((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  };

  const activeRows = useMemo(
    () => (selected.length > 0 ? rows.filter((r) => selected.includes(r.productId)) : rows.slice(0, 5)),
    [rows, selected],
  );

  const { data: series } = useClosingStockHistogram(activeRows.map((r) => r.productId));
  const hasSeries = Object.keys(series).length > 0;

  if (rows.length === 0) return null;

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint, letterSpacing: 1.2 }]}>CLOSING STOCK HISTOGRAM</Text>
      <View style={[styles.chipRow, { marginTop: theme.spacing.sm }]}>
        {rows.map((row, index) => {
          const active = selected.includes(row.productId);
          const dot = dotPalette[index % dotPalette.length];
          return (
            <Pressable
              key={row.productId}
              accessibilityRole="button"
              onPress={() => toggle(row.productId)}
              style={[
                styles.chip,
                {
                  borderRadius: theme.radii.pill,
                  backgroundColor: active ? theme.colors.primary : theme.colors.cardFill,
                  borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
                },
              ]}>
              <View style={[styles.dot, { backgroundColor: dot }]} />
              <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
                {row.productName}
              </Text>
              <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.textSecondary, opacity: 0.7 }]}>
                {row.balance}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: theme.spacing.md }}>
        {hasSeries ? (
          activeRows.map((row) => (
            <View key={row.productId} style={{ marginBottom: theme.spacing.sm }}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{row.productName}</Text>
              <View style={{ marginTop: 5, gap: 3 }}>
                {(series[row.productId] ?? []).map((bar) => (
                  <View key={bar.date} style={styles.barRow}>
                    <View style={[styles.bar, { width: `${Math.min(100, bar.value)}%`, backgroundColor: theme.colors.secondary }]} />
                    <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{bar.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        ) : (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            Daily stock history per product isn&apos;t available yet.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { height: 30, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bar: { height: 6, borderRadius: 3 },
});
