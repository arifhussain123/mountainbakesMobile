import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * A daily trend, drawn as bars.
 *
 * ---------------------------------------------------------------------------
 * Why `react-native-svg`
 * ---------------------------------------------------------------------------
 * `victory-native` and `@shopify/react-native-skia` used to be installed for
 * this and were removed: `librnskia.so` was the single largest thing in the
 * release APK — 52 MB across four ABIs, about a third of it — for a library
 * nothing imported. `react-native-svg` already draws every icon and
 * illustration here, renders under Jest (Skia is JSI-backed and has no Jest
 * runtime), and is more than enough for a fourteen-bar trend.
 *
 * If a chart ever genuinely needs Skia — a large scatter, a gesture-driven
 * crosshair, 60fps redraws — that is the moment to weigh 52 MB against the
 * feature, not before.
 *
 * ---------------------------------------------------------------------------
 * Bars, not a line
 * ---------------------------------------------------------------------------
 * Each value is one closed business day — a discrete quantity, not a continuous
 * signal. A line implies the value existed between the points, and it invites
 * reading a slope between two days that are simply two separate days. Bars
 * compare, which is the actual question ("was Tuesday better than Monday").
 */

export interface TrendPoint {
  /** Bucket key. Used for the React key and the accessible summary. */
  label: string;
  value: number;
}

export interface MBTrendChartProps {
  data: readonly TrendPoint[];
  /** Drawn height in dp. Width fills the parent. */
  height?: number;
  /**
   * Announced to a screen reader in place of the bars.
   *
   * Required, because a chart with no summary is invisible to anyone not
   * looking at it: fourteen individually-labelled bars are noise, and the shape
   * they make is the whole content. The caller knows the units, so the caller
   * writes the sentence.
   */
  accessibilityLabel: string;
}

const VIEW_W = 300;
const GAP_RATIO = 0.28;

export function MBTrendChart({
  data,
  height = 120,
  accessibilityLabel,
}: MBTrendChartProps): React.ReactElement | null {
  const theme = useTheme();

  const bars = useMemo(() => {
    if (data.length === 0) return [];
    // Negatives are not meaningful for revenue and would draw upside down;
    // clamping is honest here because the axis starts at zero.
    const values = data.map(d => (Number.isFinite(d.value) ? Math.max(0, d.value) : 0));
    const max = Math.max(...values);
    const slot = VIEW_W / data.length;
    const width = slot * (1 - GAP_RATIO);

    return data.map((point, i) => ({
      key: point.label,
      x: i * slot + (slot - width) / 2,
      width,
      // A day with no sales still gets a visible stub rather than nothing, so
      // "closed" and "off the end of the data" do not look identical. When
      // every value is zero, max is 0 — every bar is the stub and none is
      // implied to be larger than another.
      ratio: max > 0 ? values[i]! / max : 0,
    }));
  }, [data]);

  if (bars.length === 0) return null;

  const baseline = height - 1;

  return (
    <View
      /*
       * `accessible` alone is what collapses the bars into one focusable element
       * carrying the summary. This deliberately does NOT also set
       * `importantForAccessibility="no-hide-descendants"`: that hides the view
       * *and* its descendants, which silenced the entire chart and made the
       * summary unreachable. The bars carry no text, so grouping is enough.
       */
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VIEW_W} ${height}`}
        preserveAspectRatio="none"
        testID="trend-chart">
        <G>
          {bars.map(bar => {
            const barHeight = Math.max(2, bar.ratio * (height - 4));
            return (
              <Rect
                key={bar.key}
                x={bar.x}
                y={baseline - barHeight}
                width={bar.width}
                height={barHeight}
                rx={2}
                fill={theme.colors.primary}
                opacity={bar.ratio === 0 ? 0.25 : 1}
              />
            );
          })}
          {/* A zero line, so a run of empty days reads as a floor rather than
              as missing data. */}
          <Line
            x1={0}
            y1={baseline}
            x2={VIEW_W}
            y2={baseline}
            stroke={theme.colors.border}
            strokeWidth={1}
          />
        </G>
      </Svg>
    </View>
  );
}
