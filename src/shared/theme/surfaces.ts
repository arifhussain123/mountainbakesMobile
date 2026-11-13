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

/**
 * Dark mode's extra surface tiers — straight from the mockups' DARK_CSS
 * (`design UIandUX/redesign-2026/common.py`, build: `MB_THEME=dark python3
 * branch.py branch.html`). Light mode doesn't need these: its inputs, sheets
 * and bars are plain white/lavender `ThemeColors` values.
 */
export const DARK_SURFACES = {
  /** `.input`, `.search`, `.stepper`, `.check`, `.photo` — a recessed well, darker than the card. */
  input: '#15162B',
  /** Border of the checkbox / dashed photo box. */
  control: '#3A3C66',
  /** `.iconbtn`, `.btn.secondary` — one step lighter than the card. */
  raised: '#1F2040',
  /** `.seg .on` — the raised option inside a segmented control. */
  segOn: '#2E2F5C',
  /** `.sheet` — bottom sheets and pop-up panels. */
  sheet: '#13142A',
  /** `.drawer` — the side menu panel. */
  drawer: '#15162B',
  /** `.tabbar` — the bottom tab bar. */
  tabbar: '#16172D',
  /** `.footer` — sticky form footers. */
  footer: 'rgba(23, 24, 46, 0.94)',
  /** `berrySoft` — idle chart bars, `pill.brand`, the brand tooltip pill. */
  brandSoft: '#2B2557',
  /** Ink on `brandSoft`. */
  brandInk: '#C9BEFF',
  /** `primarySoft` — the avatar circle, `btn.soft`. */
  primarySoft: '#3A2219',
  /** `.card.tint` — tinted inset card (gradient + border). */
  tintCard: ['#2A2556', '#211D47'] as readonly [string, string],
  tintCardBorder: '#332D66',
  /** `.navi.on` — the active drawer row. */
  navOn: ['#2E2766', '#251F57'] as readonly [string, string],
  /** `.btn.dark` — the violet "dark" button. */
  darkButton: ['#4A418F', '#2E2766'] as readonly [string, string],
} as const;

/** An input / search / stepper well: white (light), recessed midnight (dark). */
export function inputFill(theme: ThemeLike): string {
  return theme.isDark ? DARK_SURFACES.input : theme.colors.cardFill;
}

/** Bottom sheets and pop-up panels: soft lavender (light), deep midnight (dark). */
export function sheetFill(theme: ThemeLike): string {
  return theme.isDark ? DARK_SURFACES.sheet : '#F7F5FF';
}
