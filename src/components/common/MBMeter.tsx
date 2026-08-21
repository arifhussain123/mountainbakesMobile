import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** Which hue the fill takes. See the note on the prop. */
export type MeterTone = 'brand' | 'success' | 'warning' | 'danger';

export interface MBMeterProps {
  /** Where the bar is now. Clamped to `0…max`; a negative reads as empty. */
  value: number;
  /**
   * What a full bar means. A `max` of zero or less renders an empty track
   * rather than dividing by it — "no reorder level set" is a real state, and it
   * is not the same as "nothing left".
   */
  max: number;
  /**
   * **Decorative, and the caller decides it.**
   *
   * The meter has no opinion about whether a number is good: 8 units is a
   * crisis for bread and a full shelf for wedding cakes. The screen knows the
   * reorder level, so the screen picks the tone — and, crucially, prints the
   * word too. A meter's colour is never the only place a state is reported;
   * v4 puts a "Low" / "Watch" / "Good" tag on the same row.
   */
  tone?: MeterTone;
  /**
   * What a screen reader says. Omit it when the meter sits inside a row that
   * already announces the same numbers — the default hides the bar entirely,
   * which is right for the common case where it is a picture of the text above
   * it.
   */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A horizontal progress track — stock against its reorder level.
 *
 * ---------------------------------------------------------------------------
 * Why the track matters as much as the fill
 * ---------------------------------------------------------------------------
 * A bar drawn as a fill alone tells you a length, not a proportion: 8 units is
 * a sliver whether the shelf holds 20 or 200. The track is what makes a short
 * bar read as "a small share of what there should be" rather than as a
 * rendering that gave up halfway. It is `surfaceSunken`, one step warmer than
 * the field, because a track the same colour as the card has no empty half to
 * see.
 *
 * A fill of at least two per cent is drawn for any non-zero value, so a product
 * down to its last unit is visibly *present* rather than indistinguishable from
 * one that is out. Zero draws nothing at all, which is the one case where an
 * empty track is the honest picture.
 */
export function MBMeter({
  value,
  max,
  tone = 'brand',
  accessibilityLabel,
  testID,
}: MBMeterProps): React.ReactElement {
  const theme = useTheme();

  const TONES: Record<MeterTone, string> = {
    brand: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
  };

  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const ratio = max > 0 ? Math.min(1, safe / max) : 0;
  /**
   * No fill when there is no denominator, even though there is a balance.
   *
   * A bar is a **proportion**, and with `max` unset the proportion is unknown —
   * not small. Drawing the two-per-cent stub here would say "nearly out" about a
   * product nobody has set a reorder level for, which is the one reading that
   * would send someone to reorder it. The figure beside the bar still carries
   * the quantity.
   */
  const pct = max > 0 && safe > 0 ? Math.max(2, ratio * 100) : 0;

  const a11y = accessibilityLabel
    ? {
        accessible: true,
        accessibilityRole: 'progressbar' as const,
        accessibilityLabel,
        accessibilityValue: { min: 0, max: Math.max(0, max), now: safe },
      }
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
      };

  return (
    <View
      {...a11y}
      testID={testID}
      style={[
        styles.track,
        { backgroundColor: theme.colors.surfaceSunken, borderRadius: theme.radius.pill },
      ]}>
      {pct > 0 ? (
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: TONES[tone], borderRadius: theme.radius.pill },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // 6dp is v4's. Thin enough to sit under a figure without competing with it,
  // thick enough that a 2% fill is a visible mark rather than a hairline.
  track: { height: 6, overflow: 'hidden' },
  fill: { height: '100%' },
});
