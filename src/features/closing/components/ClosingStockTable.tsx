import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import type { StockRow } from '@/api';

export interface ClosingStockTableProps {
  rows: StockRow[];
}

const COLLAPSED_COUNT = 6;

/**
 * Redesign B20 "Closing stock" — a compact PRODUCT/OPEN/RECV/SOLD/RET/BAL
 * table in a card (uppercase micro header, hairline rows, a semibold Total
 * row), then an orange "Show all N products" link under the card. The
 * existing `StockRow` (src/features/stock/components/StockRow.tsx) is a full
 * card shaped for the Stock screen's own list, not this compact table row, so
 * this renders the grid directly.
 */
export function ClosingStockTable({ rows }: ClosingStockTableProps) {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          opening: acc.opening + row.opening,
          newQty: acc.newQty + row.newQty,
          sold: acc.sold + row.sold,
          returned: acc.returned + row.returned,
          balance: acc.balance + row.balance,
        }),
        { opening: 0, newQty: 0, sold: 0, returned: 0, balance: 0 },
      ),
    [rows],
  );

  const visibleRows = expanded ? rows : rows.slice(0, COLLAPSED_COUNT);
  const canToggle = rows.length > COLLAPSED_COUNT;
  const line = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border };
  const th = [styles.th, { color: theme.colors.textFaint }];
  const td = [styles.td, { color: theme.colors.text }];

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <View style={[styles.tr, styles.thRow]}>
          <Text style={[...th, styles.grow]}>Product</Text>
          <Text style={[...th, styles.c]}>Open</Text>
          <Text style={[...th, styles.c]}>Recv</Text>
          <Text style={[...th, styles.c]}>Sold</Text>
          <Text style={[...th, styles.c]}>Ret</Text>
          <Text style={[...th, styles.c]}>Bal</Text>
        </View>

        {visibleRows.map((row) => (
          <View key={row.productId} style={[styles.tr, line]}>
            <Text style={[...td, styles.grow]} numberOfLines={1}>
              {row.productName}
            </Text>
            <Text style={[...td, styles.c]}>{row.opening}</Text>
            <Text style={[...td, styles.c]}>{row.newQty}</Text>
            <Text style={[...td, styles.c]}>{row.sold}</Text>
            <Text style={[...td, styles.c]}>{row.returned}</Text>
            <Text style={[...td, styles.c, styles.bold]}>{row.balance}</Text>
          </View>
        ))}

        <View style={[styles.tr, line]}>
          <Text style={[...td, styles.grow, styles.bold]} numberOfLines={1}>
            Total · {rows.length} products
          </Text>
          <Text style={[...td, styles.c, styles.bold]}>{totals.opening}</Text>
          <Text style={[...td, styles.c, styles.bold]}>{totals.newQty}</Text>
          <Text style={[...td, styles.c, styles.bold]}>{totals.sold}</Text>
          <Text style={[...td, styles.c, styles.bold]}>{totals.returned}</Text>
          <Text style={[...td, styles.c, styles.bold]}>{totals.balance}</Text>
        </View>
      </Card>

      {canToggle ? (
        <Pressable accessibilityRole="button" onPress={() => setExpanded((e) => !e)} hitSlop={8} style={styles.link}>
          <Text style={[styles.linkText, { color: theme.colors.primary }]}>{expanded ? 'Show less' : `Show all ${rows.length} products`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  card: { paddingVertical: 8 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10 },
  thRow: { paddingVertical: 6 },
  th: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'right' },
  td: { fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'], textAlign: 'right' },
  grow: { flex: 1, minWidth: 0, textAlign: 'left' },
  c: { width: 36 },
  bold: { fontWeight: '600' },
  link: { alignSelf: 'flex-start' },
  linkText: { fontSize: 13, fontWeight: '600' },
});
