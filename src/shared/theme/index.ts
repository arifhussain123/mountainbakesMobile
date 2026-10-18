export { lightColors, darkColors, buildColors, ON_DARK_CHIP } from './colors';
export type { ThemeColors, ThemeMode } from './colors';
export { ACCENTS, ACCENT_LIST, DEFAULT_ACCENT, isAccentId } from './accents';
export type { AccentId, AccentDef } from './accents';
export { useThemeStore } from './themeStore';
export type { ThemeModeSetting } from './themeStore';
export { ThemeProvider, useTheme } from './ThemeProvider';
export type { Theme } from './ThemeProvider';
export { spacing } from './spacing';
export { radii } from './radii';
export { typography } from './typography';
export { cardShadow } from './shadows';
export { useResponsive, computeResponsiveMetrics, clamp as responsiveClamp, type ResponsiveMetrics } from './responsive';

/**
 * Compatibility wrapper — every screen built before this task calls
 * `useAppTheme()`, expecting the shape `{ colors, spacing, radii, typography,
 * cardShadow, isDark }`. `useTheme()` returns a superset of that (adds
 * `mode`/`resolvedMode`/`accent`/`accentOptions`/the setters), so this is a
 * same-reference passthrough, not a second theme system — there's exactly
 * one source of truth (`ThemeProvider`), just two hook names onto it.
 */
export { useTheme as useAppTheme } from './ThemeProvider';
