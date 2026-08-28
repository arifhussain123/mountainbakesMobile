import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/common/theme/ThemeProvider';

export interface ColumnGroup {
  /** The axis label under the group — an hour, a week number, a weekday. */
  label: string;
  /** One value per series, in the same order as `series`. */
  values: readonly number[];
  /**
   * Draws this group's label at full weight and lets its columns keep the full
   * series colour, dimming the rest.
   *
   * For "the one you are looking at" — today's hour, the current week — not for
   * "the biggest", which the columns already show by being taller.
   */
  emphasis?: boolean;
}

export interface MBColumnChartProps {
  /**
   * One or two series. Two is the ceiling and it is a real limit, not a
   * placeholder: three columns per group on a 360dp phone across eight groups
   * is a 13dp bar, and at that width a column stops being a shape and becomes a
   * tick.
   */
  series: readonly [string] | readonly [string, string];
  groups: readonly ColumnGroup[];
  /** Drawn height of the columns, in dp. Labels sit under it. */
  height?: number;
  /**
   * Announced in place of the columns.
   *
   * Required, because a chart with no summary is invisible to anyone not
   * looking at it — ten individually-labelled columns are noise, and the shape
   * they make is the whole content. The caller knows the units, so the caller
   * writes the sentence.
   */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * Grouped columns with an axis label under each group.
 *
 * ---------------------------------------------------------------------------
 * Why this is flexbox and `MBTrendChart` is SVG
 * ---------------------------------------------------------------------------
 * They answer different questions. `MBTrendChart` is a dense fourteen-day
 * sparkline with no labels, where the shape is the content and SVG's viewBox
 * scaling is exactly right. This one carries a **labelled axis** and up to two
 * series per group — v4's "By hour" and "August, by week" — and text inside an
 * SVG does not scale with the OS font setting, wrap, or get measured by the
 * layout engine. A user on a large font size would get a chart whose labels
 * stayed 9pt.
 *
 * So: flexbox, real `Text`, and the columns are views with a percentage height.
 * The cost is that this cannot draw a hundred bars; it is not meant to.
 *
 * ---------------------------------------------------------------------------
 * The colours come from the theme's series ramp
 * ---------------------------------------------------------------------------
 * `colors.series[0]` and `[1]` — the same two a share list starts with, so a
 * screen that draws both does not introduce a third "sales colour". The ramp is
 * asserted for separation in `theme/__tests__/contrast.test.ts`.
 *
 * A zero value still draws a two-pixel stub. "Closed" and "off the end of the
 * data" must not look identical, which is the same rule `MBTrendChart` follows.
 */
export function MBColumnChart({
  series,
  groups,
  height = 96,
  accessibilityLabel,
  testID,
}: MBColumnChartProps): React.ReactElement | null {
  const theme = useTheme();

  const max = useMemo(() => {
    let m = 0;
    for (const g of groups) {
      for (const v of g.values) {
        if (Number.isFinite(v) && v > m) m = v;
      }
    }
    return m;
  }, [groups]);

  if (groups.length === 0) return null;

  const fills = [theme.colors.series[0], theme.colors.series[1]] as const;
  /* Computed once for the whole chart rather than per column: whether anything
     is emphasised is a property of the data, not of the column being drawn. */
  const anyEmphasis = groups.some(g => g.emphasis);

  return (
    <View style={{ gap: theme.space.md }} testID={testID}>
      {series.length > 1 ? (
        <View style={[styles.legend, { gap: theme.space.lg }]}>
          {series.map((name, i) => (
            <View key={name} style={[styles.legendItem, { gap: theme.space.tight }]}>
              <View
                style={[styles.swatch, { backgroundColor: fills[i], borderRadius: theme.radius.xs }]}
              />
              <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* One accessibility node. Ten columns read out individually is noise;
          the sentence the caller wrote is the content. */}
      <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
        <View style={[styles.plot, { height, gap: theme.space.tight }]}>
          {groups.map(group => (
            <View key={group.label} style={styles.group}>
              <View style={[styles.columns, { gap: theme.space.xs }]}>
                {group.values.map((value, i) => {
                  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
                  const pct = max > 0 ? Math.max(2, (safe / max) * 100) : 2;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.column,
                        {
                          height: `${pct}%`,
                          backgroundColor: fills[i] ?? fills[0],
                          borderTopLeftRadius: theme.radius.xs,
                          borderTopRightRadius: theme.radius.xs,
                        },
                        /* Dimming the rest is what makes `emphasis` read as
                           "this one" rather than as "these are a different
                           series". A second hue would say the latter. */
                        anyEmphasis && !group.emphasis ? styles.dimmed : null,
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.axis, { gap: theme.space.tight, marginTop: theme.space.tight }]}>
          {groups.map(group => (
            <Text
              key={group.label}
              numberOfLines={1}
              style={[
                theme.type.caption,
                styles.axisLabel,
                {
                  color: group.emphasis ? theme.colors.text : theme.colors.textMuted,
                },
              ]}>
              {group.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 9, height: 9 },
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  group: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  columns: { flexDirection: 'row', alignItems: 'flex-end', height: '100%' },
  column: { flex: 1 },
  dimmed: { opacity: 0.35 },
  axis: { flexDirection: 'row' },
  axisLabel: { flex: 1, textAlign: 'center' },
});
