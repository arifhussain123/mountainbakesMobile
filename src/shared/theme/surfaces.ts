import type { ViewStyle } from 'react-native';
import type { ThemeColors } from './colors';

/** Just what these helpers read — avoids importing `Theme` from the provider (no cycle). */
interface ThemeLike {
  isDark: boolean;
  colors: ThemeColors;
}

/** Lavender for the mockup's `card tint` / tinted inner box (light mode). */
export const TINT_FILL = '#EFEBFF';

/** Midnight navy for selected chips and the current pager page (light mode). */
export const MIDNIGHT_FILL = '#1E1B4B';

/** Dark mode's tinted inset panel and its selected-chip violet. */
export const TINT_FILL_DARK = '#24254A';
export const VIOLET_FILL = '#5B48D8';

/**
 * The mockup's `card tint` / `background:T['tint']` lavender inset panel in
 * light mode; in dark mode `darkFill` (default: the deep-violet tint).
 */
export function tintFill(theme: ThemeLike, darkFill: string = TINT_FILL_DARK): string {
  return theme.isDark ? darkFill : TINT_FILL;
}

/** The selected-chip / active-page fill: midnight (light), violet (dark). White text on both. */
export function midnightFill(theme: ThemeLike): string {
  return theme.isDark ? VIOLET_FILL : MIDNIGHT_FILL;
}

/** `card flat` — a Card without its lift, for rows in a list. */
export const FLAT_CARD: ViewStyle = { shadowOpacity: 0, elevation: 0 };

/** The soft violet lift under round icon buttons and pastel tiles (light mode). */
export const SOFT_LIFT: ViewStyle = { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 };
