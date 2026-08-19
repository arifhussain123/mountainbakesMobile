import { Platform, type ViewStyle } from 'react-native';
import { palette } from './colors';

/**
 * Three elevation levels, warm-tinted rather than neutral black.
 *
 * Android `elevation` is always paired with the iOS shadow props — setting
 * elevation alone gives a shadow on one platform only. In dark mode a shadow on
 * a dark surface is invisible, so `darkShadows` drops them entirely and layers
 * are separated with `borderStrong` / `surfaceSunken` instead.
 */

type Elevation = 1 | 2 | 3;

const spec: Record<Elevation, { opacity: number; y: number; blur: number }> = {
  1: { opacity: 0.06, y: 1, blur: 3 },
  2: { opacity: 0.1, y: 4, blur: 10 },
  3: { opacity: 0.16, y: 10, blur: 24 },
};

function build(level: Elevation): ViewStyle {
  const { opacity, y, blur } = spec[level];
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.brown900,
      shadowOpacity: opacity,
      shadowOffset: { width: 0, height: y },
      shadowRadius: blur / 2,
    },
    android: {
      shadowColor: palette.brown900,
      elevation: level * 2,
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
