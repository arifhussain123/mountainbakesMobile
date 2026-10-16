export interface ThemeColors {
  background: string;
  /** Solid card fallback — prefer `cardFill`/`cardBorder` for the translucent glass-card look. */
  surface: string;
  /** Translucent card fill over the background glow — `rgba(255,255,255,.05)` in the design files. */
  cardFill: string;
  /** Translucent card border — `rgba(255,255,255,.08)` in the design files. */
  cardBorder: string;
  primary: string;
  primaryText: string;
  /** Darker orange for a pressed pill-button state. */
  primaryPressed: string;
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
  border: string;
  success: string;
  warning: string;
  danger: string;
  /** Chart/series purple — secondary data series (e.g. Easypaisa vs Cash). */
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
  /** The Drawer's own deep-brown chrome — distinct from the app's charcoal `surface`, per the Drawer visual spec. */
  drawer: {
    bg: string;
    divider: string;
    text: string;
    textMuted: string;
    /** Active item pill — same value as `primary`, named for where it's used. */
    activeBg: string;
    /** The branch-name strip's background band. */
    branchBg: string;
  };
}

/**
 * Unused since the branchApp.md rebuild fixed the app to a single dark theme
 * (see `darkColors` below) — kept only in case a future non-Branch-role surface
 * wants CLAUDE.md's original light cream bakery look.
 */
export const lightColors: ThemeColors = {
  background: '#FAF6F0',
  surface: '#FFFFFF',
  cardFill: '#FFFFFF',
  cardBorder: '#EFE6DC',
  primary: '#FF6B35',
  primaryPressed: '#E65A2B',
  primaryText: '#FFFFFF',
  text: '#2E1A12',
  textSecondary: '#8A7A6D',
  textMuted: '#8A7A6D',
  textFaint: '#A3927F',
  textLabel: '#B6A696',
  border: '#EFE6DC',
  success: '#2E7D32',
  warning: '#B8860B',
  danger: '#C62828',
  secondary: '#7B6CD9',
  info: '#1565C0',
  infoAlt: '#3D7BD9',
  violet: '#9D91E8',
  orange: '#FF8A5C',
  lavender: '#C9BFF0',
  overlay: 'rgba(46, 26, 18, 0.4)',
  drawer: {
    bg: '#2A170C',
    divider: 'rgba(255, 255, 255, 0.08)',
    text: '#FFFFFF',
    textMuted: '#C9B8AC',
    activeBg: '#FF6B35',
    branchBg: '#3A2010',
  },
};

/**
 * branchApp.md's "Branch" dark theme — ported from mountainbakesBranch.html's
 * default "Midnight" mood: near-black background, glass-card surface, warm
 * orange accent. This is the ONLY theme the app renders (see `useAppTheme`) —
 * not an OS-driven alternate to `lightColors`.
 */
export const darkColors: ThemeColors = {
  background: '#0B0C12',
  surface: '#15161D',
  cardFill: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  primary: '#FF6B35',
  primaryPressed: '#E65A2B',
  primaryText: '#1C1917',
  text: '#F5F1EC',
  textSecondary: '#A39A92',
  textMuted: '#A39A92',
  textFaint: '#857B73',
  textLabel: '#6E655E',
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#34C38A',
  warning: '#F5B800',
  danger: '#FF5A5F',
  secondary: '#7B6CD9',
  info: '#4EA8DE',
  infoAlt: '#608CFF',
  violet: '#9D91E8',
  orange: '#FF8A5C',
  lavender: '#C9BFF0',
  overlay: 'rgba(0, 0, 0, 0.55)',
  drawer: {
    bg: '#2A170C',
    divider: 'rgba(255, 255, 255, 0.08)',
    text: '#FFFFFF',
    textMuted: '#C9B8AC',
    activeBg: '#FF6B35',
    branchBg: '#3A2010',
  },
};
