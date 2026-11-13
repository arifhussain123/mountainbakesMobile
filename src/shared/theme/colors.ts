import { ACCENTS, type AccentId } from './accents';

export interface ThemeColors {
  background: string;
  /** Solid card fallback — prefer `cardFill`/`cardBorder` for the translucent glass-card look. */
  surface: string;
  /** Translucent card fill over the background glow — `rgba(255,255,255,.05)` in the design files. */
  cardFill: string;
  /** Translucent card border — `rgba(255,255,255,.08)` in the design files. */
  cardBorder: string;
  /** Accent-driven — see `accents.ts`. The only tokens that change when the user picks a different accent. */
  primary: string;
  primaryText: string;
  /** Darker accent for a pressed pill-button state. */
  primaryPressed: string;
  text: string;
  /**
   * `#A39A92` (dark) — the existing one-tier-down text color, used everywhere
   * already built (subtitles, helper text, captions). Left AS IS rather than
   * remapped to the design files' own `secondary` (`#CFC6BE`) tier, so no
   * existing screen's text shifts tone from this rename alone.
   */
  textSecondary: string;
  /** Alias of `textSecondary` — same value, named for the design files' own "muted" tier. */
  textMuted: string;
  /** One tier dimmer than `textSecondary`/`textMuted` (ids, timestamps). */
  textFaint: string;
  /** The dimmest label text (section eyebrows, screen numbers). */
  textLabel: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  /** Chart/series purple — secondary data series (e.g. Easypaisa vs Cash). Accent-independent — see `accents.ts`'s header note. */
  secondary: string;
  /** Informational banners/badges, distinct from `primary`. */
  info: string;
  /** Second info/blue series color used alongside `info` in multi-series charts. */
  infoAlt: string;
  violet: string;
  orange: string;
  /** Light lavender — distinct from `secondary`'s chart purple; the Stock grid's "Previous" tile dot. */
  lavender: string;
  overlay: string;
}

/** Everything EXCEPT the three accent-driven tokens — see `buildColors`. */
type BaseTokens = Omit<ThemeColors, 'primary' | 'primaryText' | 'primaryPressed'>;

/**
 * 2026 redesign — "lavender 3D" light theme (Figma file dTwAoYFfccfAV8o3fjwq9m;
 * generator + mockups in `design UIandUX/redesign-2026/`, tokens from its
 * common.py "v5 colour" block). Lavender canvas, white cards with a faint
 * violet border, midnight-navy text, violet accent for data series. The hero
 * gradient, pastel stat tiles and 3D shapes live in `design.ts`.
 */
const lightBase: BaseTokens = {
  background: '#F5F3FE',
  surface: '#FFFFFF',
  cardFill: '#FFFFFF',
  cardBorder: '#ECE8FB',
  text: '#171A35',
  textSecondary: '#5B6080',
  textMuted: '#5B6080',
  textFaint: '#8E92AD',
  textLabel: '#A9ACC4',
  border: '#E6E1FA',
  success: '#12A26B',
  warning: '#C27A0A',
  danger: '#E5484D',
  secondary: '#6C5CE7',
  info: '#3D7BFA',
  infoAlt: '#5B8DEF',
  violet: '#8E7CFF',
  orange: '#FF8A3D',
  lavender: '#C9BFF0',
  overlay: 'rgba(23, 26, 53, 0.45)',
};

/**
 * 2026 redesign, dark — the same lavender-3D screens on a midnight canvas
 * (`design UIandUX/redesign-2026/common.py` DARK_CSS; build the mockups with
 * `MB_THEME=dark python3 branch.py branch.html`). Deep-violet cards, light
 * lavender-white text, brighter status colours; the violet hero, saffron
 * buttons and 3D shapes are shared with light (see `design.ts`). Mirrors the
 * web's phone-width `:root.dark` block in frontend/src/app/globals.css.
 */
const darkBase: BaseTokens = {
  background: '#0E0F1F',
  surface: '#1A1B33',
  cardFill: '#1A1B33',
  cardBorder: '#2A2B4D',
  text: '#F3F2FF',
  textSecondary: '#B7B9D6',
  textMuted: '#B7B9D6',
  textFaint: '#8A8EB3',
  textLabel: '#6E7299',
  border: '#2D2F52',
  success: '#3DD68C',
  warning: '#F5B544',
  danger: '#FF6B70',
  secondary: '#8E7CFF',
  info: '#7AA5FF',
  infoAlt: '#608CFF',
  violet: '#B3A6FF',
  orange: '#FF8A5C',
  lavender: '#C9BFF0',
  overlay: 'rgba(0, 0, 0, 0.62)',
};

export type ThemeMode = 'light' | 'dark';

/** Merges the mode's fixed base palette with the chosen accent's primary/primaryPressed/primaryText. The one function every theme in this app is built from. */
export function buildColors(mode: ThemeMode, accent: AccentId): ThemeColors {
  const base = mode === 'dark' ? darkBase : lightBase;
  const a = ACCENTS[accent];
  return { ...base, primary: a.hex, primaryPressed: a.pressedHex, primaryText: a.onAccentText };
}

/** Default-accent (orange) palettes — kept for any call site that still wants a fixed theme object rather than going through `useTheme()`/`buildColors`. */
export const lightColors: ThemeColors = buildColors('light', 'orange');
export const darkColors: ThemeColors = buildColors('dark', 'orange');

/**
 * Several Hero cards (Dashboard/Branch Closing/Daily Sale Record/Sales) nest
 * a small dark "chip" tile INSIDE their accent-colored hero background —
 * `mountainbakesBranch.html`'s own design, a fixed near-black fill regardless
 * of theme mode or accent (it's a contrast device against the hero's own
 * background, not a themed surface). Before light mode existed, those tiles'
 * own text safely read `theme.colors.text`/`textSecondary`, because dark
 * mode's `text` tokens are light-on-dark already — the same code would have
 * put light-mode's DARK `text` token on this same dark fill, illegible. These
 * three values are what that text actually needs: fixed, light, independent
 * of `mode` — not a 4th mode-driven tier.
 */
export const ON_DARK_CHIP = {
  // 2026 redesign: frosted white instead of a near-black chip — heroes are now a violet
  // gradient (light) or the flat accent (dark), and white-on-frosted reads on both.
  fill: 'rgba(255, 255, 255, 0.16)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.80)',
} as const;
