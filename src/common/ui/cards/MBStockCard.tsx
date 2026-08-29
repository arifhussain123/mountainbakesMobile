import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBCard } from '../common/MBCard';
import { MBIcon } from '../common/MBIcon';
import { MBMeter, type MeterTone } from '../common/MBMeter';
import { MBPressable } from '../common/MBPressable';
import { useTheme } from '@/common/theme/ThemeProvider';
import { space } from '@/common/theme/spacing';
import { stockLevel, type StockLevel } from '@/shared/utils/stock';
import type { StockRow } from '@/shared/types/stock.types';
import { formatQty, signedQty } from '@/common/utils/money';

/**
 * One product's stock for a business day, with its working foldable underneath.
 *
 * ---------------------------------------------------------------------------
 * Why the breakdown is collapsed
 * ---------------------------------------------------------------------------
 * The headline is the whole tap target, and it is all that is drawn until
 * asked. Product, balance and level answer the question this screen is opened
 * for — "what have I got, and what is about to run out" — while opening /
 * received / sold / returned / adjusted explain *how* the balance got there,
 * which is a second question and a rarer one.
 *
 * Drawing the working under every row cost more than it looks: the five cells
 * roughly double a card's height, so a phone showed about four products at a
 * time instead of seven, and finding the one that is out of stock in a 90-line
 * catalogue meant twice the scrolling.
 *
 * The level is a **word as well as a colour**, because a stock warning that can
 * only be read by distinguishing red from green is not a warning for everyone.
 * The disclosure chevron points right when closed and down when open: the
 * direction is the state, so nothing has to animate to report it.
 *
 * `expanded` is owned by the list, not the card. One product open at a time is
 * a list-level decision, and a card that held its own state could not be told
 * to close when another opened.
 */

/**
 * Where the meter reads full.
 *
 * `stockLevel` puts the boundary between `moderate` and `healthy` at 20, so a
 * bar that fills at 20 means "clear of every warning band". Anything above it
 * clamps rather than shrinking the rest of the list's bars — the question this
 * card answers is how close a product is to running out, not how large the
 * largest pile in the shop is.
 */
const FULL_BAR = 20;

export interface MBStockCardProps {
  row: StockRow;
  expanded: boolean;
  onToggle: (productId: string) => void;
  /**
   * Units Production has approved and not yet delivered, and the reason this is
   * a THREE-state prop rather than a number defaulting to 0.
   *
   * - `undefined` — this screen does not show the figure at all (a back-dated
   *   day, or a caller that never asked for it). Neither cell is drawn.
   * - `null` — the figure was asked for and could not be had: offline, or the
   *   request failed. Both cells read "—".
   * - a number — the answer, including a genuine `0`.
   *
   * Zero and unknown must not collapse into each other. `0` means Production
   * owes this branch nothing, which is a real and useful thing to be told; "—"
   * means nobody could ask. Rendering the second as the first tells a shop
   * nothing is coming when the truth is that nothing is known — and Expected
   * would silently equal the balance, which is the one wrong number this whole
   * addition exists to avoid.
   */
  waiting?: number | null;
}

export const MBStockCard = React.memo(function MBStockCardView({
  row,
  expanded,
  onToggle,
  waiting,
}: MBStockCardProps): React.ReactElement {
  const theme = useTheme();
  const level = stockLevel(row.balance);
  const toggle = useCallback(() => onToggle(row.productId), [onToggle, row.productId]);

  const levelColor: Record<StockLevel, string> = {
    out: theme.colors.danger,
    critical: theme.colors.danger,
    moderate: theme.colors.warning,
    healthy: theme.colors.success,
  };

  const levelLabel: Record<StockLevel, string> = {
    out: 'Out of stock',
    critical: 'Critical',
    moderate: 'Low',
    healthy: 'In stock',
  };

  const levelTone: Record<StockLevel, MeterTone> = {
    out: 'danger',
    critical: 'danger',
    moderate: 'warning',
    healthy: 'success',
  };

  return (
    <MBCard>
      {/*
        The headline is the whole tap target, and it is all that is drawn until
        asked. Product, balance and level answer the question this screen is
        opened for — "what have I got, and what is about to run out" — while
        opening / received / sold / returned / adjusted explain *how* the
        balance got there, which is a second question and a rarer one.

        Drawing the working under every row cost more than it looks: the five
        cells roughly double a card's height, so a phone showed about four
        products at a time instead of seven, and finding the one that is out of
        stock in a 90-line catalogue meant twice the scrolling.
      */}
      <MBPressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${row.productName}, balance ${formatQty(row.balance)}, ${
          levelLabel[level]
        }`}
        accessibilityHint={expanded ? 'Hides the movement breakdown' : 'Shows the movement breakdown'}
        testID={`stock-row-${row.productId}`}>
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
              {row.productName}
            </Text>
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              {row.stockCode}
            </Text>
          </View>

          <View style={styles.balance}>
            <Text style={[theme.type.money, { color: theme.colors.text }]}>
              {formatQty(row.balance)}
            </Text>
            {/* A word as well as a colour — the level must be readable without
                distinguishing red from green. */}
            <Text style={[theme.type.caption, { color: levelColor[level] }]}>
              {levelLabel[level]}
            </Text>
          </View>

          {/* Right when closed, down when open. The direction is the state, so
              nothing has to animate to report it. Hidden from the screen reader
              — the pressable around it already announces both the action and
              whether it is expanded. */}
          <View style={styles.disclosure}>
            <MBIcon
              name={expanded ? 'chevronDown' : 'chevron'}
              size="action"
              color={theme.colors.textMuted}
            />
          </View>
        </View>

        {/*
          The band, as a picture.

          A balance of 8 is a crisis for bread and a full shelf for wedding
          cakes, and the figure alone cannot say which — the word beside it can,
          and the bar is what makes the *distance* to the next band visible at a
          glance down a ninety-line catalogue. `FULL_BAR` is `stockLevel`'s own
          healthy boundary, so a full bar means exactly "out of the warning
          bands" rather than a number picked to look right.

          Decorative, and hidden from the reader: the pressable above already
          announces the balance and the level in words. Colour is never the only
          signal here — the label is.
        */}
        <View style={styles.meter}>
          <MBMeter value={row.balance} max={FULL_BAR} tone={levelTone[level]} />
        </View>
      </MBPressable>

      {/* opening + newQty − sold − returned + adjustment = balance */}
      {expanded ? (
        <View style={[styles.movements, { borderTopColor: theme.colors.border }]}>
          <Movement label="Opening" value={row.opening} />
          <Movement label="Received" value={row.newQty} />
          <Movement label="Sold" value={row.sold} />
          <Movement label="Returned" value={row.returned} />
          <Movement label="Adjusted" value={row.adjustment} signed />
          {/*
            What is still owed, and what the shelf reaches if it all arrives.

            `Expected` is derived here and is never sent by the server: it is
            `balance + waiting` and nothing else, so there is no second answer to
            disagree with. Both cells are omitted entirely when `waiting` is
            undefined — a screen that cannot ask the question should not draw a
            blank where the answer goes.
          */}
          {waiting !== undefined ? (
            <>
              <Movement label="Waiting" value={waiting} />
              <Movement
                label="Expected"
                value={waiting === null ? null : row.balance + waiting}
              />
            </>
          ) : null}
        </View>
      ) : null}
    </MBCard>
  );
});

function Movement({
  label,
  value,
  signed = false,
}: {
  label: string;
  /** `null` is "not known", and is the only thing that draws a dash. */
  value: number | null;
  signed?: boolean;
}): React.ReactElement {
  const theme = useTheme();
  // `adjustment` is deliberately signed — the direction is the point, and it is
  // what makes the row reconcile.
  const display =
    value === null ? '\u2014' : signed ? signedQty(value) : formatQty(value);

  return (
    <View style={styles.movement}>
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{label}</Text>
      {/*
        A dash is muted because it is the absence of a figure; a real zero is
        not. `0 waiting` is an answer — Production owes nothing — and it is set
        in the same ink as every other number so it reads as one.
      */}
      <Text
        style={[
          theme.type.mono,
          { color: value === null ? theme.colors.textMuted : theme.colors.text },
        ]}>
        {display}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  headerMain: { flex: 1, gap: space.hair },
  balance: { alignItems: 'flex-end', gap: space.hair },
  // Centred against the balance rather than pinned to the top of the row.
  disclosure: { alignSelf: 'center' },
  meter: { marginTop: space.snug },
  movements: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
  },
  movement: { alignItems: 'center', gap: space.hair, minWidth: 56 },
});
