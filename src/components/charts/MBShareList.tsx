import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';

/**
 * A ranked breakdown — top products, payment methods — as labelled bars.
 *
 * ---------------------------------------------------------------------------
 * Why this and not `MBTrendChart`
 * ---------------------------------------------------------------------------
 * These answer a different question. A trend asks "which way is it going", and
 * time on the x-axis is the whole point. A breakdown asks "how is this split",
 * where the categories have no order but their sizes are the content. Drawing a
 * split as bars-over-time implies a sequence that is not there.
 *
 * ---------------------------------------------------------------------------
 * The bar is added to the row, not swapped for it
 * ---------------------------------------------------------------------------
 * Each row keeps its exact figure. Staff write these numbers down and read them
 * out; a bar you have to estimate off an axis is not a substitute for "1,240".
 * The bar answers the question the column of numbers is bad at — *is the top
 * seller ahead by a nose or by triple* — which otherwise takes reading every row
 * and doing the division in your head.
 */

export interface ShareItem {
  /** Row label. Also the React key, so it must be unique within a list. */
  label: string;
  /** The number that decides bar length. Negatives and non-finite are clamped to 0. */
  amount: number;
  /** Pre-formatted for display — currency, quantity, whatever the caller means. */
  display: string;
}

export function MBShareList({
  items,
  accessibilityLabel,
}: {
  items: readonly ShareItem[];
  /** Names what the bars measure, e.g. "Top products by revenue". */
  accessibilityLabel: string;
}): React.ReactElement | null {
  const theme = useTheme();

  const rows = useMemo(() => {
    const safe = items.map(i => ({
      ...i,
      amount: Number.isFinite(i.amount) ? Math.max(0, i.amount) : 0,
    }));
    // Share of the LARGEST, not of the total: these lists are a top-N, so the
    // remainder is missing and percentages of a partial total would be a lie.
    // Against the largest, the top bar is full and the rest read as "half of
    // that", which is the true and useful comparison.
    const max = Math.max(...safe.map(i => i.amount), 0);
    return safe.map(i => ({ ...i, ratio: max > 0 ? i.amount / max : 0 }));
  }, [items]);

  if (rows.length === 0) return null;

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.list}>
      {rows.map((row, i) => (
        <View key={row.label} style={styles.row}>
          <View style={styles.labels}>
            <Text
              numberOfLines={1}
              style={[theme.type.body, styles.label, { color: theme.colors.text }]}>
              {row.label}
            </Text>
            <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>{row.display}</Text>
          </View>

          {/* Track then fill. The track is what makes a short bar read as "a
              small share" rather than as a rendering that failed. */}
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.track,
              { backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.radius.pill },
            ]}>
            <View
              style={[
                styles.fill,
                {
                  // A hairline minimum, so a row that sold one unit is still
                  // visibly present rather than looking like a zero.
                  width: `${Math.max(2, row.ratio * 100)}%`,
                  // v4 ranks the ramp: the largest share takes the ember and
                  // each one below it steps into a warmer brown. Rows past the
                  // fourth all share the fourth colour rather than continuing
                  // into the ramp's pale tail, which is reserved for an
                  // "everything else" segment and is 1.3:1 on a card — a bar
                  // drawn in it reads as a row that sold nothing.
                  backgroundColor: theme.colors.series[Math.min(i, theme.colors.series.length - 2)],
                  borderRadius: theme.radius.pill,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  row: { gap: space.tight },
  labels: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md },
  label: { flex: 1 },
  track: { height: 6, overflow: 'hidden' },
  fill: { height: '100%' },
});
