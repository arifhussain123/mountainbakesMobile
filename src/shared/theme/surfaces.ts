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

/**
 * The mockup's `card tint` / `background:T['tint']` lavender inset panel in
 * light mode; in dark mode `darkFill` (default: a faint glass layer).
 */
export function tintFill(theme: ThemeLike, darkFill: string = theme.colors.border): string {
  return theme.isDark ? darkFill : TINT_FILL;
}

/** The selected-chip / active-page fill: midnight (light), the accent (dark). */
export function midnightFill(theme: ThemeLike): string {
  return theme.isDark ? theme.colors.primary : MIDNIGHT_FILL;
}

/** `card flat` — a Card without its lift, for rows in a list. */
export const FLAT_CARD: ViewStyle = { shadowOpacity: 0, elevation: 0 };

/** The soft violet lift under round icon buttons and pastel tiles (light mode). */
export const SOFT_LIFT: ViewStyle = { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 };
