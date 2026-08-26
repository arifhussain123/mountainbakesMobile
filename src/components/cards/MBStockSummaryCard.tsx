import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MBCard } from '../common/MBCard';
import { MBMoney } from '../common/MBMoney';
import { useTheme } from '@/theme/ThemeProvider';
import type { BranchStockHistoryRow } from '@/shared/types/stock.types';
import { space } from '@/theme/spacing';
import { formatQty, toNumber } from '@/utils/money';

/**
 * One business day of the branch ledger, folded into a strip.
 *
 * ---------------------------------------------------------------------------
 * The same five columns as the ledger, and the same caveat
 * ---------------------------------------------------------------------------
 * Opening · New · Sold · Adjust · Remain, which is exactly
 * `BranchStockHistoryRow` — one row of `GET /api/stock/history`, or the single
 * row `GET /api/stock/history/day` returns. Drawing it here rather than sending
 * someone to the ledger is v5's call: the dashboard answers "did today
 * reconcile", and the ledger answers "on which day did it stop".
 *
 * **The money figure is stock at today's prices, not the day's takings.** Every
 * amount on that row — `soldAmount` included — is valued at the product's
 * *current* `products.price`, because that is what makes
 * `opening + new − sold − returned + adjustment = balance` hold on a day
 * carrying a discount or a since-changed price. So the headline here is the
 * **closing value of what is on the shelf**, and nothing on this card is ever
 * labelled Sales or Revenue. `stockHistoryApi.ts` and the type's own doc say the
 * same thing from the other two sides; this is the third.
 *
 * ---------------------------------------------------------------------------
 * Returns and adjustments share a cell
 * ---------------------------------------------------------------------------
 * v5 draws five cells and the ledger has six figures: `returnedQty` and
 * `adjustmentQty` are folded into one "Adjust" column, signed, so the row still
 * reconciles left to right. A return is stock leaving and an adjustment is
 * stock being corrected — different events — so the full ledger keeps them
 * apart and this summary says `Ret/Adj` rather than pretending they are one
 * thing.
 */

export interface MBStockSummaryCardProps {
  row: BranchStockHistoryRow;
  /** Tenant symbol from AppSettings; falls back to "Rs.". */
  currencySymbol?: string;
  /** Opens the full ledger. Omitted where there is nowhere to go. */
  onPress?: () => void;
  testID?: string;
}

interface Cell {
  label: string;
  qty: number;
  /** Which token paints the quantity. The label carries the meaning either way. */
  tone: 'muted' | 'success' | 'danger' | 'warning' | 'text';
}

export function MBStockSummaryCard({
  row,
  currencySymbol,
  onPress,
  testID,
}: MBStockSummaryCardProps): React.ReactElement {
  const theme = useTheme();

  // Signed on purpose: a net correction that took stock away must read as
  // negative rather than as "3 units of adjustment happened".
  const retAdj = toNumber(row.adjustmentQty) - toNumber(row.returnedQty);

  const cells: Cell[] = [
    { label: 'Opening', qty: toNumber(row.openingQty), tone: 'muted' },
    { label: 'New', qty: toNumber(row.newQty), tone: 'success' },
    { label: 'Sold', qty: toNumber(row.soldQty), tone: 'danger' },
    { label: 'Ret/Adj', qty: retAdj, tone: 'warning' },
    { label: 'Remain', qty: toNumber(row.balanceQty), tone: 'text' },
  ];

  const toneColor: Record<Cell['tone'], string> = {
    muted: theme.colors.textMuted,
    success: theme.colors.success,
    danger: theme.colors.danger,
    warning: theme.colors.warning,
    text: theme.colors.text,
  };

  /**
   * One announcement for the strip.
   *
   * Five cells walked one at a time is ten stops for a sentence that only means
   * anything read across, and the last of them is the number that matters.
   */
  const spoken = `Branch stock. ${cells
    .map(c => `${c.label} ${formatQty(c.qty)}`)
    .join(', ')}. Closing value on the card.`;

  return (
    <MBCard
      testID={testID}
      accessibilityLabel={spoken}
      {...(onPress ? { onPress } : {})}>
      <View style={styles.head}>
        <Text style={[theme.type.cardTitle, { color: theme.colors.text }]}>Branch Stock</Text>
        <View style={styles.headValue}>
          {/* The closing VALUE of what is on the shelf — see the caveat above.
              Never "Sales": these amounts are priced at today's list. */}
          <MBMoney value={row.balanceAmount} symbol={currencySymbol} />
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {formatQty(row.balanceQty)} on hand
          </Text>
        </View>
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.strip, { paddingTop: theme.space.md, gap: theme.space.sm }]}>
        {cells.map(cell => (
          <View key={cell.label} style={[styles.cell, { gap: theme.space.hair }]}>
            <Text
              numberOfLines={1}
              style={[theme.type.number, { color: toneColor[cell.tone] }]}>
              {formatQty(cell.qty)}
            </Text>
            <Text
              numberOfLines={1}
              style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              {cell.label}
            </Text>
          </View>
        ))}
      </View>
    </MBCard>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
  },
  headValue: { alignItems: 'flex-end', gap: space.hair },
  strip: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center' },
});
