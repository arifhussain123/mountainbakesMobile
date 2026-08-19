/**
 * Mountain Bakes palette — shared with the web app.
 *
 * These values are the mobile half of ONE brand. `mountainbakes-frontend`
 * defines the same palette as CSS custom properties in `src/app/globals.css`
 * (Tailwind v4 keeps its theme in CSS, so there is no tailwind.config to read),
 * written in oklch. React Native has no oklch, so every token below is the sRGB
 * hex conversion of the web's oklch value — not an approximation by eye.
 *
 * The three anchors, and the web token each one IS:
 *
 *   orange500  #FB6E31   --primary     oklch(0.702 0.187 41.5)
 *   brown600   #5F2807   --secondary   oklch(0.35  0.09  47)
 *   cream50    #FDF7EA   --background  oklch(0.978 0.018 88)
 *
 * The ramps around them are generated along the web's own oklch axes — same
 * hue, chroma tapering at the ends — so an intermediate step is on-brand rather
 * than an invented tint. Where a ramp entry coincides with a web token it is
 * marked, and those entries are exact: change one and the two apps drift.
 *
 * Note the web's `globals.css` comment block lists the brand as #F97316 /
 * #6B3B1E / #FDF5E6. Those are the *intended* values and are a shade off what
 * the oklch actually renders; the hex here matches what a browser paints.
 *
 * Raw palette values are referenced ONLY by the semantic token maps below.
 * Screens and components must never import `palette` directly — they read
 * `colors.surface`, `colors.textMuted`, etc. from the active theme, so light and
 * dark stay two token sets behind one interface with no `isDark ? a : b` in
 * component code.
 */

export const palette = {
  // Toasted orange — brand, primary actions. Hue 41.5, the web's --primary hue.
  orange50: '#FFF2EC',
  orange100: '#FFDFD1',
  orange200: '#FFBEA3',
  orange300: '#FF9C74',
  orange400: '#FF8554',
  orange500: '#FB6E31', // = web --primary / --ring / --chart-1
  orange600: '#D9581D',
  orange700: '#AC4310',
  orange800: '#782C08',
  orange900: '#481703',

  // Crust brown — headings, chrome, the dark end of the app. Hue 47.
  brown50: '#FAEFEA',
  brown100: '#F0D9CE',
  brown200: '#D6AD9A',
  brown300: '#B27E65',
  brown400: '#8C5235',
  brown500: '#743C1D',
  brown600: '#5F2807', // = web --secondary
  brown700: '#401E0C', // = web dark --secondary / --accent
  brown750: '#35190B', // = web dark --muted
  brown800: '#280D02', // = web dark --card / --popover
  brown900: '#160400', // = web dark --background
  /** Web light --foreground. Warmer and lighter than brown900 — body text, not a surface. */
  ink: '#1F0B03',
  /** Web light --sidebar. The one mid-brown chrome fill. */
  sidebar: '#3B1400',

  // Cream neutrals — page, cards, borders, muted text. Hue 88.
  cream0: '#FFFFFF', // = web --card / --popover (light)
  cream25: '#FDFAF1',
  cream50: '#FDF7EA', // = web --background (light)
  cream100: '#F8F3E8', // = web --muted (light)
  cream200: '#E3DECF', // = web --border (light)
  cream300: '#CAC4B4',
  cream400: '#9F9885',
  cream500: '#79715D',
  cream600: '#5A523D',
  /** Web light --muted-foreground. */
  creamMutedFg: '#775D50',
  /** Web dark --foreground and --muted-foreground. */
  creamFgDark: '#F3EEE1',
  creamMutedFgDark: '#978E7B',

  /**
   * Semantic hues.
   *
   * The web has no --success / --warning / --info tokens; those states are raw
   * Tailwind classes applied per component. The recurring vocabulary there is
   * emerald / amber / blue / red (NOT green / yellow), at `-700` for light text,
   * `-400` for dark text, and `-100` / `-950` for the tint behind them. These
   * are the exact Tailwind v4 values for those shades, so a badge here matches
   * the same badge on the web.
   */
  emerald100: '#D0FAE5',
  emerald400: '#00D492',
  emerald700: '#007A55',
  emerald950: '#002C22',

  amber100: '#FEF3C6',
  amber400: '#FFB900',
  amber700: '#BB4D00',
  amber950: '#461901',

  blue100: '#DBEAFE',
  blue400: '#51A2FF',
  blue700: '#1447E6',
  blue950: '#162456',

  red100: '#FFE2E2',
  red400: '#FF6467', // = web dark --destructive
  red600: '#E7000B', // = web light --destructive
  red700: '#C10007',
  red950: '#460809',
} as const;

export type SemanticColors = {
  bg: string;
  surface: string;
  surfaceSunken: string;
  surfaceDocket: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  /**
   * A tint of `primary` for the surface behind an active affordance — the pill
   * under the selected tab icon. A real token rather than `primary + '1F'`:
   * eight-digit hex alpha is unreliable on older Android, and a literal alpha
   * suffix is exactly the kind of value that must not appear in a component.
   */
  primarySoft: string;
  accent: string;
  focusRing: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
  /** Connectivity + sync affordances. Offline is a warning, not an error. */
  offline: string;
  syncing: string;
  syncFailed: string;
};

export const lightColors: SemanticColors = {
  bg: palette.cream50,
  surface: palette.cream0,
  surfaceSunken: palette.cream100,
  surfaceDocket: palette.cream25,
  border: palette.cream200,
  borderStrong: palette.cream300,
  text: palette.ink,
  textMuted: palette.creamMutedFg,
  textInverse: palette.cream0,
  primary: palette.orange500,
  primaryPressed: palette.orange600,
  primarySoft: palette.orange50,
  /**
   * Dark brown on orange, not white.
   *
   * The web pairs --primary with --primary-foreground: white, which is 2.85:1 —
   * under the 4.5:1 AA floor. That is survivable on a desktop monitor and is not
   * on a phone held under a shop light. The fill is the web's orange to the
   * byte; only the label differs, and it uses the web's own --foreground, so the
   * pairing stays inside the brand. 7.02:1.
   */
  onPrimary: palette.brown900,
  /**
   * Links, selection, and anything orange-as-text. The web uses --primary itself
   * here, but orange500 on cream is 2.67:1 — invisible as body text. Same hue,
   * two steps down, 5.52:1.
   */
  accent: palette.orange700,
  /** A ring is a UI affordance, not text, so it can be the brand orange exactly. */
  focusRing: palette.orange500,
  success: palette.emerald700,
  successBg: palette.emerald100,
  warning: palette.amber700,
  warningBg: palette.amber100,
  danger: palette.red700,
  dangerBg: palette.red100,
  info: palette.blue700,
  infoBg: palette.blue100,
  offline: palette.amber700,
  syncing: palette.blue700,
  syncFailed: palette.red700,
};

export const darkColors: SemanticColors = {
  bg: palette.brown900,
  surface: palette.brown800,
  surfaceSunken: palette.brown750,
  surfaceDocket: palette.brown700,
  // The web uses white at 10% / 12% alpha for --border / --input in dark. RN
  // borders sit on cards more often than on the page, so these are those alphas
  // already composited over --card.
  border: '#3E251B',
  borderStrong: '#533D35',
  text: palette.creamFgDark,
  textMuted: palette.creamMutedFgDark,
  textInverse: palette.brown900,
  // The web keeps --primary identical in dark. So does this.
  primary: palette.orange500,
  primaryPressed: palette.orange400,
  primarySoft: '#4E1E0A',
  onPrimary: palette.brown900,
  accent: palette.orange300,
  focusRing: palette.orange500,
  // Semantic hues lighten to the -400 step in dark, matching the web's
  // `dark:text-emerald-400` convention, over the -950 tint.
  success: palette.emerald400,
  successBg: palette.emerald950,
  warning: palette.amber400,
  warningBg: palette.amber950,
  danger: palette.red400,
  dangerBg: palette.red950,
  info: palette.blue400,
  infoBg: palette.blue950,
  offline: palette.amber400,
  syncing: palette.blue400,
  syncFailed: palette.red400,
};

/**
 * Status colours keyed to the REAL backend status values.
 *
 * `BranchProductionOrderStatus` and `OrderStatus` are separate enums in
 * @/shared/types that happen to share the `pending`/`cancelled` members, so both
 * are covered here. Never add a key that is not an actual server status value.
 *
 * Hues follow the web's status badges: amber = waiting on somebody, blue = in
 * flight, violet = verified but not yet approved, emerald = done, red =
 * refused, neutral = settled. The web spells these across three competing
 * vocabularies (legacy orders use yellow/green/gray; production demands use
 * amber/violet/emerald/neutral); this map follows the production one, which is
 * the most current and is duplicated verbatim in three web components.
 *
 * Unlike the maps above, `statusColors` is shared by BOTH themes — it lives in
 * `base` in theme.ts, so one value has to carry on cream AND on near-black.
 * Each is the lightness that maximises the worse of those two contrasts, which
 * lands them all at ~4.3:1 either way. That is the ceiling for a single value
 * serving both; a per-theme split is what it would take to clear 4.5:1.
 */
export const statusColors = {
  // OrderStatus
  pending: '#B55D00', // amber — waiting
  preparing: '#336FE5', // blue — in flight
  ready: '#008656', // emerald — done, awaiting collection
  delivered: '#7A7567', // neutral — settled
  cancelled: '#D93733', // red
  // BranchProductionOrderStatus (adds to the above)
  awaiting_verification: '#336FE5',
  verified: '#835AE4', // violet — verified, not yet approved
  approved: '#008656',
  rejected: '#D93733',
} as const;

export type StatusColorKey = keyof typeof statusColors;
