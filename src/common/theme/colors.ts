import { accentFor, type AccentColors, type AccentKey } from './accents';

/**
 * Mountain Bakes palette — the mobile brand, set to the v4 design.
 *
 * ---------------------------------------------------------------------------
 * This file was retuned when v4 was revised. Read this before "fixing" it.
 * ---------------------------------------------------------------------------
 * An earlier pass read a draft of `Mountain Bakes Mobile v4.dc.html` in which
 * warm brown `#6B4226` was the primary — the button fill, the active tab, the
 * money figure. **That revision is gone.** The file now contains that hex zero
 * times. What it draws instead is a two-colour system:
 *
 *   `#FB6D34`  ember orange — every **fill**: buttons, the active chip, the
 *              centre action button, the meter, the chart line. 47 uses.
 *   `#3E1B00`  deep brown — every **mark**: type, icons, links, and the hero
 *              blocks a KPI sits on. 225 uses.
 *
 * The split is the design: v4 never sets a link or a figure in orange, and it
 * never paints a surface in the brown except when that surface is meant to
 * outrank the whole page. Carrying that split honestly is what `primary` and
 * `accent` are for below, and it is why `accent` is the ink rather than a
 * brand-tinted brown — see the comment on the token.
 *
 * Going orange also **re-aligns the phone with the web app**, which the brown
 * draft had deliberately broken: `--primary` in
 * `mountainbakes-frontend/src/app/globals.css` is toasted orange `#FB6E31`, a
 * shade off the value here for the reason in the next paragraph. This file is
 * still not a mirror of the web's and no script diffs the two — but a button on
 * the phone and the same button in the browser now read as the same brand.
 *
 * The one thing v4 does NOT change is the discipline: every value below is
 * contrast-checked against the surface it actually sits on, and
 * `__tests__/contrast.test.ts` is what holds that. v4's own hexes are used
 * verbatim wherever they clear the bar and adjusted along their own hue where
 * they do not — each adjustment is marked with the ratio it was failing at.
 *
 * ---------------------------------------------------------------------------
 * Dark mode is derived, not designed
 * ---------------------------------------------------------------------------
 * v4 draws twenty-one light screens and no dark ones. The dark map below keeps
 * v4's *relationships* rather than inventing a second design: the same warm hue
 * axis, the same three-level text hierarchy.
 *
 * One thing got simpler when the primary went orange. The brown draft had to
 * **invert** its primary in dark — `#6B4226` on near-black is 1.6:1, a button
 * you cannot find — so light and dark had different brand fills. A mid-orange
 * works on cream *and* on near-black, so `primary` is now one value in both
 * schemes and a screenshot of a button is the same button either way.
 *
 * Raw palette values are referenced ONLY by the semantic token maps below.
 * Screens and components must never import `palette` directly — they read
 * `colors.surface`, `colors.textMuted`, etc. from the active theme, so light
 * and dark stay two token sets behind one interface with no `isDark ? a : b` in
 * component code.
 */

export const palette = {
  /**
   * Ember orange — the v4 fill axis. Buttons, the active filter chip, the
   * centre action button, the meter fill, the chart line.
   *
   * `ember500` is **not** v4's `#FB6D34` verbatim, and this is the one
   * adjustment in the file that changes a colour anybody will look at. v4's
   * orange is 2.73:1 against its own field and 2.86:1 against a card, which is
   * under the 3:1 that WCAG 1.4.11 asks of a graphical object carrying
   * information. That bar is not academic here: the same value paints the meter
   * fill on the stock card and the trend line on the dashboard, and both are
   * pure graphics with no label to fall back on. `ember500` is that hue walked
   * down 6% until it clears — 3.04:1 on the field, 3.22:1 on a card — and it is
   * indistinguishable from v4's at a glance.
   */
  ember100: '#FCE0D2', // v4 — the pale column, the remainder of a share bar
  ember300: '#FFA477', // dark-mode brand-as-text. No v4 counterpart.
  ember500: '#EC6631', // v4's #FB6D34 at 3.04:1 on the field rather than 2.73:1
  ember600: '#D65A28', // pressed
  ember950: '#3A1608',

  /**
   * Crust brown — the v4 mark axis, and the warm ramp its charts run on.
   *
   * `brown800` is v4's `#3E1B00` exactly: the ink for every piece of type, the
   * fill of a hero block, and the **label on an ember button** (4.78:1). The
   * 300–500 steps are the series colours v4 draws a share bar with; they are
   * decorative fills, so they are carried verbatim.
   */
  brown300: '#C29A63', // v4 — share ramp, 4th series
  brown400: '#A8763F', // v4 — share ramp, 3rd series
  brown500: '#8A5A33', // v4 — share ramp, 2nd series
  brown700: '#4A2C18', // v4 — its link-hover brown
  brown800: '#3E1B00', // v4 — THE ink, and the hero block
  brown900: '#261A11', // dark-mode card. No v4 counterpart.
  brown950: '#1C120B', // dark-mode field. No v4 counterpart.

  /**
   * Cream neutrals — the field, cards, borders, and the text hierarchy.
   *
   * v4 runs four text levels: `#3E1B00` → `#5C4B3C` → `#8A7866` → `#A99884`.
   * Only the first two clear 4.5:1 on the cream field. `creamMutedFg` below is
   * v4's `#8A7866` walked down its own hue until it did (4.05:1 → 5.22:1), and
   * v4's faintest level is not carried as text at all — see `textMuted` in the
   * light map for why.
   *
   * The three border steps are three different jobs and v4 keeps them apart:
   * `cream100` divides two rows **inside** one card, `cream200` is the card's
   * own edge against the field, `cream300` is the edge of a chip or a field.
   * Collapsing them is how a list of rows starts looking like a list of cards.
   */
  cream0: '#FFFFFF', // v4 — every card
  cream25: '#FDFAF3',
  cream50: '#FBF8F3', // v4 — the screen field
  cream75: '#FDF7EA', // v4 — the splash, the active-tab pill, a soft brand tint
  cream100: '#F5EEE2', // v4 — the divider between rows inside one card
  cream150: '#F3EBDD', // v4 — a meter track, a chart gridline
  cream200: '#F0E7D9', // v4 — the card hairline
  cream300: '#EADFCD', // v4 — a chip or input edge (1.32:1; see borderControl)
  cream400: '#C6B7A4', // v4 — a chevron, a disabled stepper
  cream500: '#A99884', // v4 — its faintest level; dark-mode muted here
  cream600: '#8A7866', // v4 — its muted level; 4.05:1 on the field, see below
  /** v4's `#8A7866` at 5.22:1 instead of 4.05:1. Same hue, three steps down. */
  creamMutedFg: '#756657',
  /** v4's second text level, used as-is. 7.85:1 on the field. */
  creamSubtleFg: '#5C4B3C',
  /** v4's ink. 14.56:1 on the field, 15.42:1 on a card. */
  ink: '#3E1B00',
  /**
   * The caption level **on a hero block**, where v4 writes
   * `rgba(255,255,255,0.78)`. Flattened against `#3E1B00` rather than left as
   * an alpha: eight-digit hex is unreliable on older Android, and a hero card
   * is often stacked over another surface where a translucent caption would
   * pick up whatever is behind it. 9.83:1 on the block.
   */
  heroMutedFg: '#D5CDC7',
  creamFgDark: '#F5EEE2',
  creamMutedFgDark: '#A99884',
  creamSubtleFgDark: '#C6B7A4',

  /**
   * Honey gold. v4 uses `#B4820D` for its amber affordances and `#D69C2F` for
   * the profit glyph; neither clears 4.5:1 on the `#FDF0DC` tint it sits on
   * (3.04:1). `gold600` is that hue at 5.37:1. `gold200` is v4's `#FFD9A0`,
   * which it uses once — the margin figure on a hero block — and which is
   * 11.52:1 there.
   */
  gold100: '#FDF0DC', // v4 — the amber tint
  gold200: '#FFD9A0', // v4 — the highlight on a hero block
  gold300: '#F0C868',
  gold500: '#D69C2F', // v4
  gold600: '#8A6410',
  gold900: '#33260A',

  /**
   * Semantic hues, from v4's own status palette.
   *
   * v4 draws each status as dark text on a pastel tint. Three of the four pairs
   * clear 4.5:1 as drawn; amber does not (`#B4820D` on `#FDF0DC` is 3.04:1) and
   * red only just does, so both are walked down their own hue. The `-400`
   * entries are the dark-mode steps and have no v4 counterpart.
   */
  emerald100: '#E7F6EC', // v4
  emerald400: '#5FD08D',
  emerald500: '#2E9E5B', // v4 — its success glyph
  emerald700: '#1F7A47', // v4 — 4.78:1 on its tint
  emerald950: '#12301E',

  amber100: '#FDF0DC', // v4
  amber400: '#F0BE4A',
  amber700: '#87620A', // v4's #B4820D at 4.94:1 rather than 3.04:1
  amber950: '#33260A',

  blue100: '#E8EEFB', // v4
  blue400: '#8FAEF5',
  blue700: '#3D63C4', // v4 — 4.78:1 on its tint
  blue950: '#16233F',

  red100: '#FDEAEA', // v4
  red400: '#F08585',
  red500: '#D94A4A', // v4 — its notification dot
  red700: '#B83535', // v4's #C33B3B at 5.04:1 rather than 4.52:1
  red950: '#3A1616',

  violet100: '#EFEAFB', // v4
  violet400: '#B49BE8',
  violet700: '#6B4FBB', // v4 — 5.15:1 on its tint
  violet950: '#241A3D',
} as const;

export type SemanticColors = {
  bg: string;
  surface: string;
  surfaceSunken: string;
  surfaceDocket: string;
  /**
   * The card's own edge against the field. Decorative — it separates a card
   * from a card, so it takes no contrast bar.
   */
  border: string;
  /**
   * The hairline between two rows **inside** one card — a transaction list, a
   * settings group, an expense ledger.
   *
   * Separate from `border` because v4 draws them at different weights and the
   * difference is what makes a list of rows read as one object: its card edge
   * is `#F0E7D9` and its internal rule is `#F5EEE2`, a step lighter. Using
   * `border` for both makes every row look like its own card, which is the
   * single most common way a dense operations screen turns into a stack of
   * boxes.
   */
  divider: string;
  borderStrong: string;
  /**
   * The edge of an **interactive control** — a text field, a search bar.
   *
   * Separate from `border` because the two have different jobs and different
   * bars to clear. `border` divides a card from a card and is decorative, so a
   * hairline is right. A field's edge is the only thing telling you where the
   * control begins: WCAG 1.4.11 asks for 3:1 against the adjacent surface.
   *
   * **v4 draws this edge as `#EADFCD`, which is 1.32:1 and invisible to anyone
   * with low vision.** The value below is that edge at 3.31:1. This is one of
   * two places the implementation visibly departs from the mockup, and it is
   * the departure to keep: v4's own field is marked by nothing else — its fill
   * is white on a `#FBF8F3` field, a further 1.05:1.
   */
  borderControl: string;
  text: string;
  /**
   * The second of three text levels — v4's `#5C4B3C`. Drawer rows, chip labels,
   * the value in a labelled field, "Remember me". Sits between `text` (a
   * heading or a figure) and `textMuted` (a timestamp or a caption).
   */
  textSubtle: string;
  textMuted: string;
  textInverse: string;
  /**
   * The brand **fill**: a button, the active filter chip, the centre action
   * button, a meter, a chart line. Never type — see `accent`.
   */
  primary: string;
  primaryPressed: string;
  /**
   * The label on a `primary` fill. v4's deep brown, not white — 4.78:1 on the
   * ember, where white would be 2.90:1 and fail.
   */
  onPrimary: string;
  /**
   * A tint for the surface behind an active affordance — the pill under the
   * selected tab, the totals box on the sale sheet, the date badge on an event.
   * v4 draws it as `#FDF7EA`.
   *
   * A real token rather than `primary + '1F'`: eight-digit hex alpha is
   * unreliable on older Android, and a literal alpha suffix is exactly the kind
   * of value that must not appear in a component. Note it is a **cream**, not a
   * tint of the ember — v4's soft brand surface is warm neutral, and washing it
   * orange is what makes an operations screen look like a promotion.
   */
  primarySoft: string;
  /**
   * The deep brown **block**: a brand header, and the hero card a screen's
   * dominant KPI sits on. One step past a primary button in the hierarchy,
   * which is why a primary button can sit inside it and still read as the
   * action.
   */
  secondary: string;
  secondaryPressed: string;
  onSecondary: string;
  /** The caption level on a `secondary` block — v4's 78%-white. */
  onSecondaryMuted: string;
  /** The one highlight v4 allows on a `secondary` block: a margin, a delta. */
  onSecondaryAccent: string;
  /**
   * The brand as **text or an icon**, as opposed to `primary`, which is what a
   * surface is painted with.
   *
   * **In light this is the ink, and that is v4's design rather than an
   * oversight.** v4 sets "View all", "All reports", "Forgot Password?", "42
   * today" and every money figure in `#3E1B00` — the same colour as body copy —
   * and carries their link-ness with **weight** instead, 700 against 400. It
   * never sets type in the ember, and it cannot: `#FB6D34` is 2.86:1 on a card.
   *
   * So the token is not redundant even though it currently equals `text`. It is
   * the answer to "what colour is a brand-coloured thing that has to be read",
   * and it is the one a component must reach for instead of `primary` when the
   * thing is a word rather than a shape. In dark it separates from `text`
   * outright. `contrast.test.ts` asserts it is strictly more readable than
   * `primary`, which is the property that matters.
   */
  accent: string;
  /** Tint behind `accent`, mirroring `primarySoft`. */
  accentSoft: string;
  /** Honey gold. Premium/celebratory highlight, never a call to action. */
  honey: string;
  honeySoft: string;
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
  /**
   * Scrim behind a modal, drawer or bottom sheet. An rgba() string rather than
   * eight-digit hex, which is unreliable on older Android — and a token rather
   * than an inline alpha, so the one place that decides how dark a dismissable
   * surface goes is this file. v4 draws it as `rgba(28,18,11,0.5)`.
   */
  overlay: string;
  /** So a component never needs a bare 'transparent' colour literal. */
  transparent: string;

  /**
   * The four-step warm ramp v4 draws a share-of-total bar with, plus the pale
   * remainder that closes it.
   *
   * A ramp rather than four tokens because the only thing that reads it is a
   * chart, which needs "the nth series" and not "the wages colour" — a series
   * has no semantics, it is just distinguishable from its neighbour. Ordered
   * darkest-brand-first, which is the order v4 draws them in and therefore the
   * order that puts the largest slice in the strongest colour.
   */
  series: readonly [string, string, string, string, string];

  /**
   * The splash background wash — a vertical gradient with a warm bloom behind
   * the mark. Only `screens/SplashScreen.tsx` reads these.
   *
   * **`splashTop` is not free.** Android draws the native boot splash before a
   * line of JavaScript runs, and its background can only be a flat colour
   * (`android:windowSplashScreenBackground` on API 31+ takes a colour, not a
   * drawable — so the gradient cannot live there). The JS splash then replaces
   * it mid-boot. If `splashTop` and the native colour differ, that swap is a
   * visible step change in the background at the top of the screen.
   *
   * So `splashTop` MUST equal `bootsplash_background` in
   * `android/app/src/main/res/values{,-night}/colors.xml`. v4 draws its splash
   * on `#FDF7EA` rather than on the `#FBF8F3` field, so this is `cream75` and
   * not `bg` — change one and you have to change the other.
   * `scripts/check-splash-colour.sh` is what enforces the pair, and it resolves
   * `splashTop: palette.<name>` by name, so this must stay a palette reference
   * and not become a literal.
   */
  splashTop: string;
  /** The far end of the wash. Carries the wordmark, so it is contrast-checked. */
  splashBottom: string;
  /** Centre of the radial bloom behind the logo. Drawn at low opacity. */
  splashGlow: string;
};

export const lightColors: SemanticColors = {
  bg: palette.cream50,
  surface: palette.cream0,
  /**
   * A recessed control on a card — the quantity stepper's tray, a meter's
   * track, a read-only field inside the sale sheet.
   *
   * v4 draws this two ways, `#FBF8F3` for a tray and `#F3EBDD` for a track, and
   * this takes the darker of the two. A tray one step warmer than the field is
   * imperceptible; a track the same colour as the field is a meter with no
   * empty half.
   */
  surfaceSunken: palette.cream150,
  surfaceDocket: palette.cream25,
  border: palette.cream200,
  divider: palette.cream100,
  borderStrong: palette.cream300,
  // v4's #EADFCD field edge is 1.32:1. This is 3.31:1 on a card, 3.12:1 on the
  // page. See `borderControl` on the type.
  borderControl: '#9C8B72',
  text: palette.ink, // 14.56:1 on bg
  textSubtle: palette.creamSubtleFg, // 7.85:1 on bg
  /**
   * v4's third text level, made readable — and its fourth level folded into
   * this one.
   *
   * v4 runs `#8A7866` for captions and `#A99884` for placeholders, chart axis
   * labels and **inactive tab labels**. `#A99884` is 2.62:1 on the field: fine
   * for a mockup viewed on a desktop monitor, unreadable on a phone in a shop.
   * Rather than ship a token nothing may legally use, the two levels collapse
   * here at 5.22:1. The visible cost is that v4's faintest tier is gone and the
   * hierarchy is three deep instead of four; the alternative was an inactive
   * tab label nobody can read.
   */
  textMuted: palette.creamMutedFg,
  textInverse: palette.cream0,
  primary: palette.ember500, // v4's ember, at 3.04:1 on the field
  primaryPressed: palette.ember600,
  primarySoft: palette.cream75, // v4's active-tab pill
  /** v4 pairs its ember with the deep brown, not white: 4.78:1 against 2.90:1. */
  onPrimary: palette.ink,
  secondary: palette.ink, // v4's hero block and brand header are the ink itself
  secondaryPressed: palette.brown700,
  onSecondary: palette.cream0, // 15.42:1
  onSecondaryMuted: palette.heroMutedFg, // 9.83:1
  onSecondaryAccent: palette.gold200, // 11.52:1
  /** The ink. See the long note on `accent` in the type — this is deliberate. */
  accent: palette.ink,
  accentSoft: palette.cream75,
  honey: palette.gold600,
  honeySoft: palette.gold100,
  /**
   * A focus ring is the only thing showing which field the keyboard is in, so
   * it takes the 3:1 non-text bar (WCAG 1.4.11). The ember clears it at 3.22:1
   * on a card — which is the whole reason `ember500` is not v4's own orange.
   */
  focusRing: palette.ember500,
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
  overlay: 'rgba(28, 18, 11, 0.5)', // v4 exactly
  transparent: 'transparent',
  series: [
    palette.ember500,
    palette.brown500,
    palette.brown400,
    palette.brown300,
    palette.ember100,
  ],
  // = bootsplash_background in values/colors.xml, and NOT = bg. See the type.
  splashTop: palette.cream75,
  // The wash ends on itself: v4's splash is one flat cream, and deepening the
  // far end to warm it takes the tagline under 4.5:1.
  splashBottom: palette.cream75,
  // The bloom. Gold rather than a cream step, so it reads as warmth coming off
  // the mark rather than as the screen dimming. Drawn at low opacity.
  splashGlow: palette.gold300,
};

export const darkColors: SemanticColors = {
  bg: palette.brown950,
  surface: palette.brown900,
  surfaceSunken: '#20150D',
  surfaceDocket: '#2E2016',
  border: '#3A2A1C',
  divider: '#332417',
  borderStrong: '#4A3728',
  // 3.08:1 on a card, 3.34:1 on the page.
  borderControl: '#7A6553',
  text: palette.creamFgDark, // 14.71:1 on a card
  textSubtle: palette.creamSubtleFgDark, // 8.65:1
  // v4's faintest light-mode value, which on a dark card is 6.07:1 — the one
  // place it is genuinely readable.
  textMuted: palette.creamMutedFgDark,
  textInverse: palette.brown950,
  /**
   * The primary **holds** across schemes, where the brown draft had to invert.
   *
   * A mid-orange is legible on cream and on near-black alike — 3.22:1 on a
   * white card, 5.26:1 on a dark one — so light and dark share one brand fill
   * and a button screenshots the same either way. `onPrimary` holds with it:
   * the deep brown is the label in both.
   */
  primary: palette.ember500,
  primaryPressed: palette.ember600,
  primarySoft: palette.ember950,
  onPrimary: palette.ink,
  /**
   * The hero block cannot be the ink in dark — `#3E1B00` on a `#1C120B` field
   * is 1.5:1, a card you cannot see the edge of. It steps up to the warm
   * neutral that separates a raised surface from the page everywhere else in
   * this map, and the three text levels on it are re-checked against that.
   */
  secondary: '#3A2A1C',
  secondaryPressed: '#4A3728',
  onSecondary: palette.creamFgDark, // 11.92:1
  onSecondaryMuted: palette.creamSubtleFgDark, // 7.01:1
  onSecondaryAccent: palette.gold200, // 10.27:1
  /** Brand-as-text separates from `text` here, where in light the two coincide. */
  accent: palette.ember300, // 8.74:1 on a card, against primary's 5.26:1
  accentSoft: palette.ember950,
  honey: palette.gold300,
  honeySoft: palette.gold900,
  focusRing: palette.ember500,
  // Semantic hues lighten to the -400 step in dark, over the -950 tint.
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
  overlay: 'rgba(0, 0, 0, 0.62)',
  transparent: 'transparent',
  /**
   * The light ramp's browns go muddy on a near-black card, so dark keeps the
   * ember at the head and runs *up* into the warm light steps rather than down
   * into the brown ones.
   *
   * The order alternates light and dark rather than descending, which is what
   * keeps adjacent segments of a stacked bar apart: a monotone ramp on a dark
   * card puts its two brightest steps side by side at 1.2:1.
   */
  series: [
    palette.ember500,
    palette.gold300,
    palette.brown300,
    palette.ember300,
    palette.brown700,
  ],
  // = bg, and = bootsplash_background in values-night/colors.xml. See the type.
  splashTop: palette.brown950,
  // One step up from the field, warm.
  splashBottom: '#2E2016',
  // The ember, so the bloom reads as warmth off the mark rather than a backlight.
  splashGlow: palette.ember500,
};

/**
 * Status colours keyed to the REAL backend status values.
 *
 * `BranchProductionOrderStatus` and `OrderStatus` are separate enums in
 * @/shared/types that happen to share the `pending`/`cancelled` members, so both
 * are covered here. Never add a key that is not an actual server status value.
 *
 * Hues follow v4's order list, which is the same vocabulary the web uses on its
 * production demands: amber = waiting on somebody, blue = in flight, violet =
 * verified but not yet approved, emerald = done, red = refused, neutral =
 * settled.
 *
 * Unlike the maps above, `statusColors` is shared by BOTH themes — it lives in
 * `base` in themes.ts, so one value has to carry on cream AND on near-black.
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

// ---------------------------------------------------------------------------
// The selectable accent
// ---------------------------------------------------------------------------

/**
 * A colour map with the accent's fill group swapped in.
 *
 * Only four keys move — `primary`, `primaryPressed`, `onPrimary`, and the soft
 * tint behind an active affordance. Everything else is the scheme's own map,
 * shared by reference: the field, the cards, the borders, the text ramp and the
 * status colours are not preferences, and an accent that could reach them would
 * be a second theme rather than a swatch. See `accents.ts`.
 *
 * `primarySoft` stays the scheme's warm neutral rather than becoming a tint of
 * the chosen hue. v4's soft brand surface is `#FDF7EA` — a cream, not a wash of
 * the ember — and `text` is asserted readable on it. Tinting it per accent would
 * put five new surfaces under that assertion for no visible gain: the pill under
 * an active tab reads as "active" from its shape, not its hue.
 *
 * Returns the base map unchanged for the default accent, so choosing Ember is
 * not merely equivalent to the old behaviour but literally it.
 */
function withAccent(base: SemanticColors, accent: AccentColors): SemanticColors {
  if (
    base.primary === accent.primary &&
    base.primaryPressed === accent.primaryPressed &&
    base.onPrimary === accent.onPrimary
  ) {
    return base;
  }
  return { ...base, ...accent };
}

export function lightColorsFor(key: AccentKey): SemanticColors {
  return withAccent(lightColors, accentFor(key).light);
}

export function darkColorsFor(key: AccentKey): SemanticColors {
  return withAccent(darkColors, accentFor(key).dark);
}
