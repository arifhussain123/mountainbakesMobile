import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import type { StockRow } from '@/api';

export interface ClosingStockTableProps {
  rows: StockRow[];
}

const COLLAPSED_COUNT = 6;

/**
 * Design lines 966-972 ("CLOSING STOCK" card) — PRODUCT/OPEN/RECV/SOLD/RET/BAL
 * grid with a Total footer row and a show-more/less toggle. The existing
 * `StockRow` (src/features/stock/components/StockRow.tsx) is a full card
 * shaped for the Stock screen's own list, not this compact table row, so this
 * renders the grid directly.
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

  const cellStyle = [theme.typography.label, { color: theme.colors.textFaint, textAlign: 'right' as const }];

  return (
    <View>
      <View style={[styles.headerRow, { borderBottomColor: theme.colors.cardBorder }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textFaint, flex: 1 }]}>PRODUCT</Text>
        <Text style={[...cellStyle, styles.col]}>OPEN</Text>
        <Text style={[...cellStyle, styles.col]}>RECV</Text>
        <Text style={[...cellStyle, styles.col]}>SOLD</Text>
        <Text style={[...cellStyle, styles.col]}>RET</Text>
        <Text style={[...cellStyle, styles.col]}>BAL</Text>
      </View>

      {visibleRows.map((row) => (
        <View key={row.productId} style={[styles.dataRow, { borderTopColor: theme.colors.cardBorder }]}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
            {row.productName}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'right' }, styles.col]}>
            {row.opening}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'right' }, styles.col]}>
            {row.newQty}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'right' }, styles.col]}>
            {row.sold}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'right' }, styles.col]}>
            {row.returned}
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', textAlign: 'right' }, styles.col]}>
            {row.balance}
          </Text>
        </View>
      ))}

      <View style={[styles.dataRow, { borderTopColor: theme.colors.border, borderTopWidth: 1.5 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700' }]}>
            Total <Text style={[theme.typography.label, { color: theme.colors.textFaint, fontWeight: '500' }]}>{rows.length} products</Text>
          </Text>
        </View>
        <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700', textAlign: 'right' }, styles.col]}>
          {totals.opening}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700', textAlign: 'right' }, styles.col]}>
          {totals.newQty}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700', textAlign: 'right' }, styles.col]}>
          {totals.sold}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700', textAlign: 'right' }, styles.col]}>
          {totals.returned}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700', textAlign: 'right' }, styles.col]}>
          {totals.balance}
        </Text>
      </View>

      {canToggle ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((e) => !e)}
          style={[styles.toggle, { backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginTop: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>
            {expanded ? 'Show less' : `Show all ${rows.length} products`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1 },
  dataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1 },
  col: { width: 32 },
  toggle: { height: 38, alignItems: 'center', justifyContent: 'center' },
});
