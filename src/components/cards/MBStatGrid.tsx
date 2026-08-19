import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The dashboard stat grid — two-up on a phone, four-up on a wide screen.
 *
 * Declared once because it was declared four times: every dashboard carried its
 * own byte-identical `grid` / `gridItem: { flexGrow: 1, flexBasis: '46%' }`
 * pair. Four copies of a layout is four places a responsive change has to be
 * remembered, and the fourth is the one that gets missed.
 *
 * ---------------------------------------------------------------------------
 * Why the basis changes rather than the cap alone
 * ---------------------------------------------------------------------------
 * Capping the dashboard's width stops the tiles stretching, but it leaves a
 * tablet showing a phone's 2×2 block with empty space either side — technically
 * not stretched, still obviously a phone layout. Going four-up uses the width
 * for something: the whole day's figures land on one line, which is what a
 * manager opens a dashboard on a tablet to see.
 *
 * `flexGrow: 1` with a basis under the exact fraction (46% not 50%, 22% not 25%)
 * absorbs the gap without a fifth tile being pushed to its own row by a
 * sub-pixel rounding error.
 */
/** Replaces any `<>…</>` in the list with its own children, one level deep. */
function flattenFragments(nodes: React.ReactNode[]): React.ReactNode[] {
  return nodes.flatMap(node =>
    React.isValidElement(node) && node.type === React.Fragment
      ? React.Children.toArray((node.props as { children?: React.ReactNode }).children)
      : [node],
  );
}

export function MBStatGrid({ children }: { children: React.ReactNode }): React.ReactElement {
  const theme = useTheme();
  const { isWide } = useBreakpoint();

  // `toArray` drops nulls and assigns stable keys, so a dashboard can render a
  // tile conditionally without leaving a hole in the row.
  //
  // It deliberately does NOT descend into fragments, which is a trap here: a
  // caller writing `<MBStatGrid><>{a}{b}</></MBStatGrid>` — the natural shape
  // once one tile is conditional — would hand this a single child, and all the
  // tiles would end up stacked inside one grid cell. It fails as a layout, not
  // as an error, so nothing would catch it. One level of unwrap covers the case
  // that actually occurs.
  const tiles = flattenFragments(React.Children.toArray(children));

  return (
    <View style={[styles.grid, { gap: theme.space.md }]}>
      {tiles.map((tile, i) => (
        <View
          key={i}
          testID="stat-grid-item"
          style={[styles.item, isWide ? styles.itemWide : styles.itemNarrow]}>
          {tile}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  item: { flexGrow: 1 },
  // Two-up and four-up. Each basis sits just under the exact fraction so the
  // row absorbs its own gap rather than wrapping the last tile onto a line of
  // its own over a rounding error.
  itemNarrow: { flexBasis: '46%' },
  itemWide: { flexBasis: '22%' },
});
