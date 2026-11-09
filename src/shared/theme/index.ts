import { darkColors, type ThemeColors } from './colors';
import { withAlpha } from './colorUtils';
import { font, fonts } from './fonts';
import { radii } from './radii';
import { cardShadow } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

export { lightColors, darkColors } from './colors';
export type { ThemeColors } from './colors';
export { withAlpha } from './colorUtils';
export { fonts, font } from './fonts';
export type { FontToken } from './fonts';
export { spacing } from './spacing';
export { radii } from './radii';
export { typography } from './typography';
export { cardShadow } from './shadows';

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  fonts: typeof fonts;
  font: typeof font;
  withAlpha: typeof withAlpha;
  cardShadow: typeof cardShadow;
  isDark: boolean;
}

/**
 * The single theme accessor every screen/component uses — never import
 * `lightColors`/`darkColors` directly outside this file. branchApp.md fixes
 * this app to one dark "Branch" theme (mountainbakesBranch.html's Charcoal
 * mood with the Orange accent) rather than following the OS light/dark
 * setting — there is no toggle.
 */
export function useAppTheme(): Theme {
  return {
    colors: darkColors,
    spacing,
    radii,
    typography,
    fonts,
    font,
    withAlpha,
    cardShadow,
    isDark: true,
  };
}
