import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useBreakpoint } from '@/common/hooks/useBreakpoint';
import { useTheme } from '@/common/theme/ThemeProvider';
import { layout, space } from '@/common/theme/spacing';

/**
 * The dashboard's summary row, scrolled sideways.
 *
 * ---------------------------------------------------------------------------
 * Why this exists beside `MBStatGrid` rather than replacing it
 * ---------------------------------------------------------------------------
 * They answer different questions. `MBStatGrid` lays four equal tiles out 2×2
 * so a whole day is on screen at once — nothing hidden, nothing to discover.
 * This lays **wider** cards in a row you push through, which is what v5 asks for
 * at the top of the branch dashboard, and it buys one thing the grid cannot: a
 * card wide enough for a figure *and* the line that qualifies it ("↑ 12% vs
 * yesterday", "6 entries today"). In a 2×2 block at 390dp that second line
 * wraps or truncates.
 *
 * The cost is real and worth stating: content off the right edge is content
 * some people never see. That is why the last card is **partly visible at
 * rest** — a card cut by the screen edge is the only honest signal that the row
 * continues, and a row that ends flush reads as a row that ended. `CARD_W` is
 * set against a 390dp screen so three cards leave a sliver of the third
 * showing.
 *
 * ---------------------------------------------------------------------------
 * On a wide screen it stops scrolling
 * ---------------------------------------------------------------------------
 * Past `tabletMin` the cards fit, so the row lays them out with `flex` and the
 * scroll never engages. A horizontal scroller on a tablet is a gesture with
 * nothing behind it.
 */

/**
 * One card's width on a phone.
 *
 * Chosen so a 390dp screen shows two whole cards and the edge of a third:
 * `screenPad` + 156 + gap + 156 = 344, leaving 46dp of the next one. Wide
 * enough for a money figure at `type.money` plus a caption under it.
 */
const CARD_W = 156;

export interface MBStatScrollerProps {
  children: React.ReactNode;
  /**
   * Announced before the row. The cards each announce themselves, so this only
   * has to say what the row *is* — without it a screen reader gives no clue
   * that there is anything to the right.
   */
  accessibilityLabel?: string;
  testID?: string;
}

/** Replaces any `<>…</>` in the list with its own children, one level deep. */
function flattenFragments(nodes: React.ReactNode[]): React.ReactNode[] {
  return nodes.flatMap(node =>
    React.isValidElement(node) && node.type === React.Fragment
      ? React.Children.toArray((node.props as { children?: React.ReactNode }).children)
      : [node],
  );
}

export function MBStatScroller({
  children,
  accessibilityLabel,
  testID,
}: MBStatScrollerProps): React.ReactElement {
  const theme = useTheme();
  const { isWide } = useBreakpoint();

  /**
   * `toArray` drops nulls and assigns stable keys, so a dashboard can render a
   * card conditionally without leaving a hole. It does not descend into
   * fragments, which is the trap `MBStatGrid` documents: a caller writing
   * `<><Card/><Card/></>` would hand this one child and stack them all in the
   * first slot — a layout failure, not an error, so nothing would catch it.
   */
  const cards = flattenFragments(React.Children.toArray(children));

  if (isWide) {
    return (
      <View
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        style={[styles.wideRow, { gap: theme.space.md }]}>
        {cards.map((card, i) => (
          <View key={i} testID="stat-scroller-item" style={styles.wideItem}>
            {card}
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      showsHorizontalScrollIndicator={false}
      /* Snapping to the card pitch rather than free-scrolling: the row is a
         small number of discrete things, and a card left half-cut by a flick
         reads as a rendering fault rather than as a position. */
      snapToInterval={CARD_W + space.md}
      decelerationRate="fast"
      contentContainerStyle={[styles.row, { gap: theme.space.md }]}>
      {cards.map((card, i) => (
        <View key={i} testID="stat-scroller-item" style={styles.item}>
          {card}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  item: { width: CARD_W },
  wideRow: { flexDirection: 'row' },
  // `flexBasis` under the exact fraction, as in MBStatGrid: it absorbs the gap
  // without a rounding error pushing the last card onto its own line.
  wideItem: { flexGrow: 1, flexBasis: 0, minWidth: layout.maxContentWidth / 6 },
});
