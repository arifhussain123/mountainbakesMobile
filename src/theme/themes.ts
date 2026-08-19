import {
  darkColors,
  lightColors,
  statusColors,
  type SemanticColors,
  type StatusColorKey,
} from './colors';
import { iconSize, iconStroke } from './iconSizes';
import { darkShadows, lightShadows, type Shadows } from './shadows';
import { motion, type Motion } from './motion';
import { radius } from './radius';
import { layout, space } from './spacing';
import { fontFamily, type, weight } from './typography';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

export interface Theme {
  scheme: ResolvedScheme;
  colors: SemanticColors;
  shadows: Shadows;
  type: typeof type;
  fontFamily: typeof fontFamily;
  weight: typeof weight;
  space: typeof space;
  radius: typeof radius;
  layout: typeof layout;
  motion: Motion;
  /**
   * Icon sizes and stroke weights. On the theme beside `space` and `radius`
   * because that is where a reader looks for a token, even though neither
   * varies by scheme. `theme/iconSizes.ts` still exports both directly, which is
   * what module-scope `StyleSheet.create` calls need — a hook cannot run there.
   */
  iconSize: typeof iconSize;
  iconStroke: typeof iconStroke;
  statusColors: typeof statusColors;
}

const base = {
  type,
  fontFamily,
  weight,
  space,
  radius,
  layout,
  motion,
  iconSize,
  iconStroke,
  statusColors,
} as const;

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  shadows: lightShadows,
  ...base,
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  shadows: darkShadows,
  ...base,
};

export function themeFor(scheme: ResolvedScheme): Theme {
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export type { SemanticColors, StatusColorKey };
