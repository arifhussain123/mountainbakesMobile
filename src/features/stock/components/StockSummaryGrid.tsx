import { StyleSheet, Text, View } from 'react-native';
import { PASTEL_INK, PastelTile } from '@/shared/ui';
import { useAppTheme, useResponsive, type PastelTone } from '@/shared/theme';
import { formatSigned } from '@/shared/utils';
import type { StockTotals } from '../calculations';

export interface StockSummaryGridProps {
  totals: StockTotals;
  /** Count of products currently listed (after the listing rule, before any sort) — the grid's own "Products" tile. */
  productCount: number;
}

interface Tile {
  key: string;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

/**
 * 2026 redesign B11 — the Stock screen's pastel KPI tiles. Top: Balance and
 * Expected balance (with the waiting demand under it) side by side; below:
 * Opening / New / Sold / Returned / Adjustment / Products, three a row. Every
 * figure is still visible at once, no swiping. Signed figures go through
 * `formatSigned` so a zero movement always reads as plain "0", never "+0"/"-0";
 * movements keep their green/red sign colours.
 */
export function StockSummaryGrid({ totals, productCount }: StockSummaryGridProps) {
  const theme = useAppTheme();
  const { clamp, ms } = useResponsive();
  const bigFont = clamp(20, ms(22), 26);
  const smallFont = clamp(17, ms(19), 22);
  /** Same rule as the product cards: positive green, negative red, zero in the plain text color. */
  const signColor = (n: number) => (n > 0 ? theme.colors.success : n < 0 ? theme.colors.danger : undefined);
  const labelColor = theme.isDark ? theme.colors.textSecondary : PASTEL_INK.muted;

  const top: Tile[] = [
    { key: 'balance', label: 'Balance', value: String(totals.balance), sub: 'units on hand', color: signColor(Math.min(0, totals.balance)) },
    {
      key: 'expectedBalance',
      label: 'Expected balance',
      value: String(totals.expectedBalance),
      sub: `${totals.waitingDemand} waiting demand`,
    },
  ];
  const movements: Tile[] = [
    { key: 'opening', label: 'Opening', value: String(totals.opening) },
    { key: 'newQty', label: 'New', value: formatSigned(totals.newQty), color: totals.newQty === 0 ? undefined : theme.colors.success },
    { key: 'sold', label: 'Sold', value: formatSigned(-totals.sold), color: totals.sold === 0 ? undefined : theme.colors.danger },
    { key: 'returned', label: 'Returned', value: formatSigned(-totals.returned), color: totals.returned === 0 ? undefined : theme.colors.danger },
    { key: 'adjustment', label: 'Adjustment', value: formatSigned(totals.adjustment), color: signColor(totals.adjustment) },
    { key: 'productCount', label: 'Products', value: String(productCount) },
  ];

  const renderTile = (tile: Tile, tone: PastelTone, fontSize: number, wide: boolean) => (
    <PastelTile
      key={tile.key}
      tone={tone}
      accessible
      accessibilityLabel={`${tile.label}: ${tile.value}${tile.sub ? `, ${tile.sub}` : ''}`}
      style={[wide ? styles.wideTile : styles.tile, theme.isDark ? null : styles.lift]}>
      <Text style={[styles.k, { color: labelColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {tile.label}
      </Text>
      <Text
        style={[styles.v, { fontSize, lineHeight: Math.round(fontSize * 1.27), color: tile.color ?? theme.colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {tile.value}
      </Text>
      {tile.sub ? (
        <Text style={[styles.s, { color: labelColor }]} numberOfLines={1}>
          {tile.sub}
        </Text>
      ) : null}
    </PastelTile>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>{top.map((tile, i) => renderTile(tile, (i % 5) as PastelTone, bigFont, true))}</View>
      <View style={styles.grid}>{movements.map((tile, i) => renderTile(tile, (i % 5) as PastelTone, smallFont, false))}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wideTile: { flex: 1, minWidth: 0, borderRadius: 24, padding: 14, gap: 4 },
  tile: { flexBasis: '30%', flexGrow: 1, minWidth: 0, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 11, gap: 2 },
  lift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 2 },
  k: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  v: { fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  s: { fontSize: 11, lineHeight: 15, fontWeight: '500' },
});
