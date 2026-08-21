import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface StackedSegment {
  label: string;
  value: number;
}

export interface MBStackedBarProps {
  segments: readonly StackedSegment[];
  /**
   * How many segments get their own colour and a legend entry before the rest
   * are folded into one "Others" tail. Four is v4's, and the ramp only holds
   * four load-bearing steps.
   */
  named?: number;
  /** The word for the folded tail. */
  othersLabel?: string;
  /**
   * Announced in place of the bar. Required for the same reason it is on the
   * charts: the shape is the content, and it is invisible without a sentence.
   */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * One bar showing how a total splits, with a named legend under it.
 *
 * ---------------------------------------------------------------------------
 * The tail is folded, not truncated
 * ---------------------------------------------------------------------------
 * A share bar drawn from sixty products is sixty slivers, most of them a
 * fraction of a pixel wide, and the legend under it is unreadable. So the top
 * `named` segments keep their own colour and everything else becomes a single
 * "Others" band in the ramp's pale tail.
 *
 * Folding rather than dropping matters: the bar still adds to the whole, so a
 * long tail of small sellers shows up as the wide pale band it actually is
 * instead of silently vanishing and making the top four look like the entire
 * business. `MBShareList` next door answers the other question — how the named
 * ones compare with each other — and the two are usually stacked.
 *
 * Segments are ordered as given. The caller sorts; sorting here would silently
 * disagree with the list beside it.
 */
export function MBStackedBar({
  segments,
  named = 4,
  othersLabel = 'Others',
  accessibilityLabel,
  testID,
}: MBStackedBarProps): React.ReactElement | null {
  const theme = useTheme();

  const bands = useMemo(() => {
    const safe = segments.map(s => ({
      ...s,
      value: Number.isFinite(s.value) ? Math.max(0, s.value) : 0,
    }));
    const head = safe.slice(0, named);
    const tail = safe.slice(named).reduce((sum, s) => sum + s.value, 0);
    const total = safe.reduce((sum, s) => sum + s.value, 0);
    if (total <= 0) return [];

    const out = head.map((s, i) => ({
      key: s.label,
      label: s.label,
      ratio: s.value / total,
      // The ramp's last step is reserved for the tail, so the head never
      // reaches it however many named segments are asked for.
      fill: theme.colors.series[Math.min(i, theme.colors.series.length - 2)]!,
    }));
    if (tail > 0) {
      out.push({
        key: '__others__',
        label: othersLabel,
        ratio: tail / total,
        fill: theme.colors.series[theme.colors.series.length - 1]!,
      });
    }
    return out;
  }, [segments, named, othersLabel, theme.colors.series]);

  if (bands.length === 0) return null;

  return (
    <View style={{ gap: theme.space.md }} testID={testID}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={[styles.bar, { borderRadius: theme.radius.pill }]}>
        {bands.map(band => (
          <View
            key={band.key}
            // A named band never disappears entirely: at 0.5% it would be
            // sub-pixel, and a legend entry pointing at nothing is worse than a
            // band one pixel wider than the truth.
            style={{ flexGrow: Math.max(band.ratio, 0.005), backgroundColor: band.fill }}
          />
        ))}
      </View>

      <View style={[styles.legend, { rowGap: theme.space.sm, columnGap: theme.space.lg }]}>
        {bands.map(band => (
          <View key={band.key} style={[styles.item, { gap: theme.space.tight }]}>
            <View
              style={[styles.swatch, { backgroundColor: band.fill, borderRadius: theme.radius.xs }]}
            />
            <Text
              numberOfLines={1}
              style={[theme.type.caption, { color: theme.colors.textSubtle }]}>
              {band.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 12, flexDirection: 'row', overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap' },
  item: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 9, height: 9 },
});
