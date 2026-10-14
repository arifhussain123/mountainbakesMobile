import { darkColors, type ThemeColors } from './colors';
import { radii } from './radii';
import { cardShadow } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

export { lightColors, darkColors } from './colors';
export type { ThemeColors } from './colors';
export { spacing } from './spacing';
export { radii } from './radii';
export { typography } from './typography';
export { cardShadow } from './shadows';

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  cardShadow: typeof cardShadow;
  isDark: boolean;
}

/**
 * The single theme accessor every screen/component uses — never import
 * `lightColors`/`darkColors` directly outside this file. branchApp.md fixes
 * this app to one dark "Branch" theme (mountainbakesBranch.html's default
 * look) rather than following the OS light/dark setting — there is no toggle.
 */
export function useAppTheme(): Theme {
  return {
    colors: darkColors,
    spacing,
    radii,
    typography,
    cardShadow,
    isDark: true,
  };
}
