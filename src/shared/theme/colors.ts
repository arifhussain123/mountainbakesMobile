export interface ThemeColors {
  /** The screen background — "Charcoal" mood: a near-black charcoal, not pure black. */
  background: string;
  /** Alias of `background`, named as the design tokens name it. */
  bg: string;
  /** Solid card/input fill, one step lighter than `background`. */
  surface: string;
  /** Translucent card fill over the background glow — `rgba(255,255,255,.05)` in the design files. */
  cardFill: string;
  /** Translucent card border — `rgba(255,255,255,.08)` in the design files. */
  cardBorder: string;
  /** The brand accent (orange). `accent` is the design-token name; `primary` is the older alias every built screen uses. */
  accent: string;
  /** `accent`, darkened — pressed state of accent-filled controls. */
  accentPressed: string;
  primary: string;
  /** Ink-dark text/icon color placed ON an accent fill (button labels). */
  primaryText: string;
  /** Pure white — headlines on the brand screens (splash/onboarding/login). */
  textPrimary: string;
  /** Off-white body text everywhere else. */
  text: string;
  /**
   * `#A39A92` — the existing one-tier-down text color, used everywhere already
   * built (subtitles, helper text, captions). Left AS IS rather than remapped
   * to the design files' own `secondary` (`#CFC6BE`) tier, so no existing
   * screen's text shifts tone from this rename alone.
   */
  textSecondary: string;
  /** Alias of `textSecondary` — same value, named for the design files' own "muted" tier. */
  textMuted: string;
  /** `#857B73` — one tier dimmer than `textSecondary`/`textMuted` (ids, timestamps). */
  textFaint: string;
  /** `#6E655E` — the dimmest label text (section eyebrows, screen numbers). */
  textLabel: string;
  /** Subtle 1px borders on inputs and cards. */
  border: string;
  /** The warm brown/amber of the top-right radial glow on splash/onboarding/login (hex; alpha applied by `SplashGlow`). */
  glowWarm: string;
  success: string;
  warning: string;
  /** Errors — validation messages, error borders, the login error banner. */
  danger: string;
  /** Chart/series purple — secondary data series (e.g. Easypaisa vs Cash). */
  secondary: string;
  /** Informational banners/badges, distinct from `primary`. */
  info: string;
  /** Second info/blue series color used alongside `info` in multi-series charts. */
  infoAlt: string;
  violet: string;
  orange: string;
  overlay: string;
}

/**
 * Unused since the branchApp.md rebuild fixed the app to a single dark theme
 * (see `darkColors` below) — kept only in case a future non-Branch-role surface
 * wants CLAUDE.md's original light cream bakery look.
 */
export const lightColors: ThemeColors = {
  background: '#FAF6F0',
  bg: '#FAF6F0',
  surface: '#FFFFFF',
  cardFill: '#FFFFFF',
  cardBorder: '#EFE6DC',
  accent: '#FF6B35',
  accentPressed: '#E25A27',
  primary: '#FF6B35',
  primaryText: '#FFFFFF',
  textPrimary: '#2E1A12',
  text: '#2E1A12',
  textSecondary: '#8A7A6D',
  textMuted: '#8A7A6D',
  textFaint: '#A3927F',
  textLabel: '#B6A696',
  border: '#EFE6DC',
  glowWarm: '#F2C9A8',
  success: '#2E7D32',
  warning: '#B8860B',
  danger: '#C62828',
  secondary: '#7B6CD9',
  info: '#1565C0',
  infoAlt: '#3D7BD9',
  violet: '#9D91E8',
  orange: '#FF8A5C',
  overlay: 'rgba(46, 26, 18, 0.4)',
};

/**
 * The selected design settings — accent = Orange, mood = Charcoal, font =
 * Grotesk — ported from mountainbakesBranch.html: charcoal near-black
 * background, glass-card surface, warm orange accent. This is the ONLY theme
 * the app renders (see `useAppTheme`) — not an OS-driven alternate to
 * `lightColors`.
 */
export const darkColors: ThemeColors = {
  background: '#0B0C10',
  bg: '#0B0C10',
  surface: '#14161B',
  cardFill: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  accent: '#FF6B35',
  accentPressed: '#E25A27',
  primary: '#FF6B35',
  primaryText: '#1C1917',
  textPrimary: '#FFFFFF',
  text: '#F5F1EC',
  textSecondary: '#A39A92',
  textMuted: '#A39A92',
  textFaint: '#857B73',
  textLabel: '#6E655E',
  border: '#262932',
  glowWarm: '#78341E',
  success: '#34C38A',
  warning: '#F5B800',
  danger: '#FF5A5F',
  secondary: '#7B6CD9',
  info: '#4EA8DE',
  infoAlt: '#608CFF',
  violet: '#9D91E8',
  orange: '#FF8A5C',
  overlay: 'rgba(0, 0, 0, 0.55)',
};
