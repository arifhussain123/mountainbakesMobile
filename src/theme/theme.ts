import {
  darkColors,
  lightColors,
  statusColors,
  type SemanticColors,
  type StatusColorKey,
} from './colors';
import { darkShadows, lightShadows, type Shadows } from './shadows';
import { layout, motion, radius, space } from './spacing';
import { fontFamily, type } from './typography';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

export interface Theme {
  scheme: ResolvedScheme;
  colors: SemanticColors;
  shadows: Shadows;
  type: typeof type;
  fontFamily: typeof fontFamily;
  space: typeof space;
  radius: typeof radius;
  layout: typeof layout;
  motion: typeof motion;
  statusColors: typeof statusColors;
}

const base = {
  type,
  fontFamily,
  space,
  radius,
  layout,
  motion,
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
