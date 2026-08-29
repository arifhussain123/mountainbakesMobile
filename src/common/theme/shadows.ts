import { Platform, type ViewStyle } from 'react-native';
import { palette } from './colors';

/**
 * Three elevation levels, plum-tinted rather than neutral black.
 *
 * Android `elevation` is always paired with the iOS shadow props — setting
 * elevation alone gives a shadow on one platform only. In dark mode a shadow on
 * a dark surface is invisible, so `darkShadows` drops them entirely and layers
 * are separated with `borderStrong` / `surfaceSunken` instead.
 *
 * ---------------------------------------------------------------------------
 * Three levels, and v6 uses exactly three things
 * ---------------------------------------------------------------------------
 * v6 puts a soft lift on **every** card — `0 2px 8px rgba(58,20,90,0.07)`,
 * eighty-odd times — while keeping the `#F0E7F5` hairline underneath it. The
 * border still does the separating; the shadow only stops a white card from
 * looking pasted onto the lilac wash.
 *
 * So the three levels map one-to-one onto what v6 draws:
 *
 *   e1  every card                 0 2px 8px  rgba(58,20,90,0.07)
 *   e2  the floating nav bar       0 10px 24px -16px rgba(58,20,90,0.5)
 *   e3  the centre action button   0 12px 24px -12px rgba(251,109,52,0.9)
 *
 * The geometry is unchanged from v4 — only the hue moved, from a brown-black to
 * a plum-black. That hue is `palette.shadow` and deliberately not the ink: v6
 * writes with `#2E1440` and shadows with `#3A145A`, and at 7% opacity the ink's
 * browner cast reads as a grey smudge on the lilac field rather than as depth.
 *
 * `e1` is deliberately far below the other two: it is a lift, not a float.
 * Reaching for `e2` on a card is still how the lilac field turns grey.
 *
 * On Android these become `elevation`, which has no separate blur or opacity —
 * the platform derives both from the value. The numbers below are the closest
 * the two models get: 1 for the card lift, 8 and 12 for the two floating
 * things. `elevation: level * 2` used to compute them, which gave the card the
 * same 2 that a raised dialog gets.
 */

type Elevation = 1 | 2 | 3;

const spec: Record<Elevation, { opacity: number; y: number; blur: number; android: number }> = {
  /** Every card. v6: 0 2px 8px rgba(58,20,90,0.07). */
  1: { opacity: 0.07, y: 2, blur: 8, android: 1 },
  /** The floating navigation bar. */
  2: { opacity: 0.12, y: 10, blur: 24, android: 8 },
  /** The centre action button, which sits proud of the bar itself. */
  3: { opacity: 0.2, y: 12, blur: 24, android: 12 },
};

function build(level: Elevation): ViewStyle {
  const { opacity, y, blur, android } = spec[level];
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.shadow,
      shadowOpacity: opacity,
      shadowOffset: { width: 0, height: y },
      shadowRadius: blur / 2,
    },
    android: {
      shadowColor: palette.shadow,
      elevation: android,
    },
    default: {},
  }) as ViewStyle;
}

export const lightShadows = {
  e1: build(1),
  e2: build(2),
  e3: build(3),
} as const;

/** Dark mode separates layers with borders, not shadows. */
export const darkShadows = {
  e1: {} as ViewStyle,
  e2: {} as ViewStyle,
  e3: {} as ViewStyle,
} as const;

export type Shadows = typeof lightShadows;
