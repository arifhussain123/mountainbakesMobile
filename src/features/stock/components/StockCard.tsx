import { memo, useState } from 'react';
import { PixelRatio, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { openNewQuery } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon } from '@/shared/ui';
import { tintFill } from './redesign';
import type { StockRowWithDemand } from '../calculations';
import { stockBalanceTone, stockCardColumns, type StockFigureTone } from '../stockCardColumns';

/** Icon-only "Report an issue" — see `ExpenseCard`'s identical helper for why this is a compact variant rather than `ReportIssueAction`'s full labeled button. `stockCode` is a per-PRODUCT catalog id (Step 0), never unsynced. */
function ReportIssueIconButton({ referenceId }: { referenceId: string }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Report an issue with ${referenceId}`}
      hitSlop={8}
      onPress={() => openNewQuery(referenceId)}
      style={styles.flagButton}>
      <Icon name="flag" size={15} color={theme.colors.textFaint} />
    </Pressable>
  );
}

/**
 * Narrowest a column may get before the grid scrolls sideways instead of
 * squeezing — the widest single word, "Expected", is ~41px at the 10px label
 * size, so a 360px phone (≈43px columns) still fits all seven without
 * scrolling. Scaled by the system font size so a phone with large text
 * scrolls rather than breaking a word or clipping a number.
 */
const MIN_COLUMN_WIDTH = 42;
/** Column width used when the grid does have to scroll. */
const SCROLL_COLUMN_WIDTH = 56;
const COLUMN_COUNT = 7;

export interface StockCardProps {
  row: StockRowWithDemand;
  /** Kept for the existing call site; the Waiting/Expected columns always show (they read 0 when nothing is outstanding). */
  showDemand?: boolean;
}

/**
 * One product on the Stock screen: name and stock ID on top, then a
 * seven-column strip (Opening Stock, New Stock, Sold, Return, Adjust,
 * Waiting, Expected — label above value), then the live Stock balance.
 * No product imagery. A zero-balance card is muted rather than hidden (the
 * listing rule already dropped no-activity rows upstream).
 */
export const StockCard = memo(function StockCardView({ row }: StockCardProps) {
  const theme = useAppTheme();
  const [gridWidth, setGridWidth] = useState(0);
  const isZero = row.balance === 0;
  const columns = stockCardColumns(row);

  // A barely-there divider between the seven columns inside the lavender strip.
  const columnRule = theme.isDark ? theme.colors.cardBorder : 'rgba(91, 72, 216, 0.12)';
  const toneColor = (tone: StockFigureTone) =>
    tone === 'positive' ? theme.colors.success : tone === 'negative' ? theme.colors.danger : theme.colors.text;

  const minColumn = MIN_COLUMN_WIDTH * Math.max(1, PixelRatio.getFontScale());
  const mustScroll = gridWidth > 0 && gridWidth / COLUMN_COUNT < minColumn;
  const columnWidth = mustScroll ? Math.max(SCROLL_COLUMN_WIDTH, minColumn) : undefined;

  const accessibilityLabel = [
    `${row.productName}, ${row.stockCode}`,
    ...columns.map((column) => `${column.spokenLabel} ${column.value}`),
    `stock ${row.balance}`,
  ].join(', ');

  const grid = (
    <View style={styles.grid}>
      {columns.map((column, index) => (
        <View
          key={column.key}
          style={[
            styles.column,
            columnWidth ? { width: columnWidth } : { flex: 1 },
            index > 0 ? { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: columnRule } : null,
          ]}>
          <Text style={[styles.columnLabel, { color: theme.colors.textFaint }]} numberOfLines={2}>
            {column.label}
          </Text>
          <Text
            style={[
              styles.columnValue,
              { color: toneColor(column.tone), fontWeight: column.value === '0' ? '500' : '700' },
            ]}
            numberOfLines={1}>
            {column.value}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <Card accessible accessibilityLabel={accessibilityLabel} style={[styles.card, isZero ? { opacity: 0.55 } : null]}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
            {row.productName}
          </Text>
          <Text style={[styles.code, { color: theme.colors.textFaint }]}>{row.stockCode}</Text>
        </View>
        <ReportIssueIconButton referenceId={row.stockCode} />
      </View>

      <View
        onLayout={(event: LayoutChangeEvent) => setGridWidth(Math.round(event.nativeEvent.layout.width))}
        style={[styles.gridFrame, { backgroundColor: tintFill(theme) }]}>
        {mustScroll ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            {grid}
          </ScrollView>
        ) : (
          grid
        )}
      </View>

      <View style={styles.stockRow}>
        <Text style={[styles.stockLabel, { color: theme.colors.textFaint }]}>Stock</Text>
        <Text style={[styles.stockValue, { color: isZero ? theme.colors.textSecondary : toneColor(stockBalanceTone(row.balance)) }]}>
          {row.balance}
        </Text>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: 10, paddingHorizontal: 12, paddingVertical: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  code: { fontSize: 12, lineHeight: 16, fontWeight: '500', marginTop: 2 },
  flagButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: -4, marginRight: -6 },
  // The redesign's lavender `grid` strip (radius 12, 8pt vertical padding) — no horizontal padding, so the seven columns keep their full width.
  gridFrame: { marginTop: 10, borderRadius: 12, overflow: 'hidden' },
  grid: { flexDirection: 'row', alignItems: 'stretch' },
  column: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  columnLabel: { fontSize: 10, lineHeight: 12, fontWeight: '600', textAlign: 'center' },
  columnValue: { fontSize: 14, lineHeight: 18, marginTop: 4, fontVariant: ['tabular-nums'] },
  stockRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10 },
  stockLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  stockValue: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
});
