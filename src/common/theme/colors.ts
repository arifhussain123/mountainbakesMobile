import { accentFor, type AccentColors, type AccentKey } from './accents';

/**
 * Mountain Bakes palette — the mobile brand, set to the v6 design.
 *
 * ---------------------------------------------------------------------------
 * What v6 changed, and why the values below are not its hexes verbatim
 * ---------------------------------------------------------------------------
 * v4 and v5 ran a warm system: a cream field, deep brown `#3E1B00` as the mark,
 * and a brown masthead. v6 replaces the whole neutral axis with a **purple**
 * one and puts a two-layer wave across the top of every screen:
 *
 *   `#7A3EA1`  plum — the FRONT wave layer, 126px, and the top of the screen.
 *   `#4A1D70`  deep plum — the BACK layer, 148px, so it reads as the wave's
 *              trailing edge below the front one. Also the hero block.
 *   `#F6EFFA`  lilac wash — the page.
 *   `#FFFFFF`  white — the cards that float over the wave.
 *   `#FB6D34`  ember — held back for ACTIONS: buttons, the centre FAB, the
 *              active chip, and data marks.
 *
 * `Mountain Bakes Mobile v6.dc.html` carries three named moods and defaults to
 * **Purple wave**; the values above are that mood's. Read the file's inline
 * fallbacks with suspicion — most screens still carry the stale warm hexes from
 * the v5 pass (`--ink, #3E1B00` appears 153 times against the purple `#2E1440`'s
 * 85), but the `moods` map at the end of the file is the authoritative theme and
 * every one of those fallbacks is overridden by it at render. This file follows
 * the mood map, not the fallbacks.
 *
 * ---------------------------------------------------------------------------
 * The fill/mark split survives the re-skin — but the mark is now the plum
 * ---------------------------------------------------------------------------
 * v4's discipline was that `primary` is a **fill** and `accent` is the **mark**,
 * because the ember is 2.86:1 on a card and cannot carry type. That is still
 * true, so the split stays. What changed is which colour plays the mark: v4 had
 * to use the ink itself, which made `accent` equal `text` in light and the token
 * look redundant. **v6 gives the mark a real colour.** `accent` is now the deep
 * plum `#4A1D70` — 12.35:1 on a card, visibly a brand colour, and distinct from
 * `text` in both schemes for the first time.
 *
 * ---------------------------------------------------------------------------
 * Every value is contrast-checked, and three of v6's are corrected
 * ---------------------------------------------------------------------------
 * `__tests__/contrast.test.ts` holds this. v6's own hexes are used verbatim
 * wherever they clear the bar and walked along their own hue where they do not.
 * Three needed it, and each failure is the same one v4 had in its warm palette:
 *
 * - **The ember, as a graphic.** v6's `#FB6D34` is 2.54:1 on the lilac wash,
 *   under the 3:1 WCAG 1.4.11 asks of a graphical object carrying information —
 *   and that bar is not academic, because the same value paints the stock meter
 *   and the trend line. Note the wash is a *harder* surface than v4's cream was:
 *   the old `ember500` `#EC6631`, tuned to clear 3:1 on `#FBF8F3`, is only
 *   2.86:1 here. So the ember is walked one step further than it was in v4.
 * - **The muted text level.** v6's `--muted` `#7B6C88` is 4.29:1 on the wash.
 * - **A control's edge.** v6's `--border` `#E7DCEF` is 1.32:1, the identical
 *   figure v4's `#EADFCD` scored, and invisible for the same reason.
 *
 * ---------------------------------------------------------------------------
 * Dark mode is derived, not designed
 * ---------------------------------------------------------------------------
 * v6 draws twenty-one light screens and no dark ones. The dark map keeps v6's
 * *relationships* rather than inventing a second design: the same purple hue
 * axis, the same three-level text hierarchy, the same wave.
 *
 * The wave is the one thing that cannot carry across unchanged. `#7A3EA1` on a
 * near-black field is 2.44:1 — a masthead you cannot see the edge of — so the
 * dark wave steps to raised purple-greys that separate from the page the way
 * every other raised surface in the map does. The ember `primary` holds across
 * both schemes, as it did in v4: a mid-orange is legible on lilac and on
 * near-black alike, so a button screenshots the same either way.
 *
 * Raw palette values are referenced ONLY by the semantic token maps below.
 * Screens and components must never import `palette` directly — they read
 * `colors.surface`, `colors.textMuted`, etc. from the active theme, so light
 * and dark stay two token sets behind one interface with no `isDark ? a : b` in
 * component code.
 */

export const palette = {
  /**
   * Ember orange — the v6 action axis. Buttons, the centre FAB, the active
   * filter chip, the meter fill, the chart line.
   *
   * `ember500` is **not** v6's `#FB6D34` verbatim. v6's orange is 2.54:1 on the
   * lilac wash and 2.86:1 on a white card, under the 3:1 of WCAG 1.4.11. This is
   * that hue walked down 9% until it clears — 3.04:1 on the wash, 3.43:1 on a
   * card — and it is indistinguishable from v6's at a glance. It is a deeper
   * walk than v4 needed (6%) because the lilac wash is a lighter, cooler field
   * than the cream was, and an orange has less room on it.
   */
  ember100: '#FCE0D2', // the pale remainder of a share bar
  ember300: '#FFA477', // dark-mode brand-as-text. No v6 counterpart.
  ember500: '#E4632F', // v6's #FB6D34 at 3.04:1 on the wash rather than 2.54:1
  ember600: '#CE5829', // pressed
  ember950: '#3A1608',

  /**
   * Plum — the v6 brand axis: the wave, the hero block, and the mark.
   *
   * `plum500` is the front wave layer and the top of every screen; `plum700` is
   * the deeper layer behind it, which shows as the wave's trailing edge, and is
   * also the block a dominant KPI sits on. Both are v6's own hexes: white is
   * 6.93:1 on the front layer and 12.35:1 on the back one, so the wave carries
   * white type at any weight.
   */
  plum400: '#9B6BC2', // dark-mode brand-as-text. No v6 counterpart.
  plum500: '#7A3EA1', // v6 --brand — the front wave layer, and the splash
  plum700: '#4A1D70', // v6 --brand2 — the trailing wave edge, and the hero block
  plum800: '#3F2B5C', // dark-mode wave front. No v6 counterpart.
  plum900: '#33234A', // dark-mode hero block. No v6 counterpart.
  plum950: '#221830', // dark-mode card. No v6 counterpart.
  plum990: '#171021', // dark-mode field. No v6 counterpart.
  /** v6's ink. 14.45:1 on the wash, 16.28:1 on a card. */
  ink: '#2E1440',
  /**
   * The shadow hue, and NOT the ink.
   *
   * v6 tints every elevation `rgba(58,20,90,…)` — a more saturated, bluer purple
   * than the ink it writes with, used 81 times for the card lift alone. Carried
   * as its own value because a shadow is the one colour in the file that is
   * never seen at full strength: it exists at 7% and 50% opacity, where the
   * ink's browner cast reads as a grey smudge rather than as depth. See
   * `shadows.ts`.
   */
  shadow: '#3A145A',

  /**
   * Lilac neutrals — the field, cards, borders, and the text hierarchy.
   *
   * v6 runs four text levels: `#2E1440` -> `#4F4359` -> `#7B6C88` -> `#A79BB2`.
   * Only the first two clear 4.5:1 on the wash. `lilacMutedFg` below is v6's
   * `--muted` walked down its own hue until it did (4.29:1 -> 4.51:1), and v6's
   * faintest level is not carried as text at all — see `textMuted` in the light
   * map for why.
   *
   * The three border steps are three different jobs and v6 keeps them apart:
   * `lilac100` divides two rows **inside** one card, `lilac200` is the card's
   * own edge against the wash, `lilac300` is the edge of a chip or a field.
   * Collapsing them is how a list of rows starts looking like a list of cards.
   */
  lilac0: '#FFFFFF', // v6 — every card, floating over the wave
  lilac25: '#FCFAFD', // v6 --field
  lilac50: '#F6EFFA', // v6 --wash — the screen field
  lilac100: '#F4EDF8', // v6 --divider — between rows inside one card
  lilac150: '#F2EAF6', // v6 --divider2 — a meter track, a chart gridline
  lilac200: '#F0E7F5', // v6 --border2 — the card hairline
  lilac300: '#E7DCEF', // v6 --border — a chip or input edge (1.32:1; see below)
  lilac400: '#C9BFD6', // a chevron, a disabled stepper; dark-mode subtle text
  lilac500: '#A79BB2', // v6 --faint; dark-mode muted here
  lilac600: '#7B6C88', // v6 --muted; 4.29:1 on the wash, see below
  /** v6's `--muted` at 4.51:1 instead of 4.29:1. Same hue, three steps down. */
  lilacMutedFg: '#776984',
  /** v6's `--body`, used as-is. 8.18:1 on the wash. */
  lilacSubtleFg: '#4F4359',
  /**
   * The caption level **on a hero block**, where v6 writes
   * `rgba(255,255,255,0.75)`. Flattened against `#4A1D70` rather than left as an
   * alpha: eight-digit hex is unreliable on older Android, and a hero card is
   * often stacked over the wave, where a translucent caption would pick up
   * whatever is behind it.
   *
   * Lifted 10% off that flattened value, and the reason is the splash rather
   * than the hero card. v6's splash is a `secondary` surface whose gradient runs
   * from `plum500` to `plum700`, so this caption has to clear 4.5:1 on the
   * **lighter** plum as well — and the raw 75%-white is 4.27:1 there. At
   * `#D7CDDF` it is 4.52:1 on the wave front and 8.05:1 on the block.
   */
  heroMutedFg: '#D7CDDF',
  /**
   * The same 75%-white caption flattened against the FRONT wave layer
   * `#7A3EA1`, which is lighter and so needs its own value. 4.68:1 — this is a
   * caption on the masthead, not a hero block, and it is the tightest of the
   * on-brand levels.
   */
  waveMutedFg: '#DECFE8',
  lilacFgDark: '#EFE9F5',
  lilacMutedFgDark: '#A79BB2',
  lilacSubtleFgDark: '#C9BFD6',

  /**
   * Honey gold. Carried across from v4 unchanged — v6 uses `#B4820D` for its
   * amber affordances and the same `#FFD9A0` highlight on a hero block, which is
   * 9.22:1 on the plum. `gold600` is v6's amber at 5.37:1 on its own tint, where
   * `#B4820D` is 3.04:1.
   */
  gold100: '#FDF0DC', // v6 — the amber tint
  gold200: '#FFD9A0', // v6 — the highlight on a hero block
  gold300: '#F0C868',
  gold500: '#D69C2F', // v6
  gold600: '#8A6410',
  gold900: '#33260A',

  /**
   * Semantic hues, from v6's own status palette — which is v4's unchanged.
   *
   * v6 draws each status as dark text on a pastel tint, and uses the identical
   * hexes: `#1F7A47`, `#B4820D`, `#3D63C4`, `#C33B3B`, `#6B4FBB` over the same
   * five tints. Three of the four pairs clear 4.5:1 as drawn; amber does not
   * (`#B4820D` on `#FDF0DC` is 3.04:1) and red only just does, so both are
   * walked down their own hue. The `-400` entries are the dark-mode steps and
   * have no v6 counterpart.
   *
   * These sit on their own tints rather than on the page, so the neutral axis
   * going purple does not move them.
   */
  emerald100: '#E7F6EC', // v6
  emerald400: '#5FD08D',
  emerald500: '#2E9E5B', // v6 — its success glyph
  emerald700: '#1F7A47', // v6 — 4.78:1 on its tint
  emerald950: '#12301E',

  amber100: '#FDF0DC', // v6
  amber400: '#F0BE4A',
  amber700: '#87620A', // v6's #B4820D at 4.94:1 rather than 3.04:1
  amber950: '#33260A',

  blue100: '#E8EEFB', // v6
  blue400: '#8FAEF5',
  blue700: '#3D63C4', // v6 — 4.78:1 on its tint
  blue950: '#16233F',

  red100: '#FDEAEA', // v6
  red400: '#F08585',
  red500: '#D94A4A', // v6 — its notification dot
  red700: '#B83535', // v6's #C33B3B at 5.04:1 rather than 4.52:1
  red950: '#3A1616',

  violet100: '#EFEAFB', // v6
  violet400: '#B49BE8',
  violet700: '#6B4FBB', // v6 — 5.15:1 on its tint
  violet950: '#241A3D',
} as const;

export type SemanticColors = {
  bg: string;
  surface: string;
  surfaceSunken: string;
  surfaceDocket: string;
  /**
   * The card's own edge against the wash. Decorative — it separates a card from
   * the field, so it takes no contrast bar.
   */
  border: string;
  /**
   * The hairline between two rows **inside** one card — a transaction list, a
   * settings group, an expense ledger.
   *
   * Separate from `border` because v6 draws them at different weights and the
   * difference is what makes a list of rows read as one object: its card edge is
   * `#F0E7F5` and its internal rule is `#F4EDF8`, a step lighter. Using `border`
   * for both makes every row look like its own card, which is the single most
   * common way a dense operations screen turns into a stack of boxes.
   */
  divider: string;
  borderStrong: string;
  /**
   * The edge of an **interactive control** — a text field, a search bar.
   *
   * Separate from `border` because the two have different jobs and different
   * bars to clear. `border` divides a card from the field and is decorative, so
   * a hairline is right. A field's edge is the only thing telling you where the
   * control begins: WCAG 1.4.11 asks for 3:1 against the adjacent surface.
   *
   * **v6 draws this edge as `#E7DCEF`, which is 1.32:1 and invisible to anyone
   * with low vision** — the same figure v4's `#EADFCD` scored, arrived at
   * independently in a different hue. The value below is that edge at 3.43:1 on
   * a card and 3.05:1 on the wash. This is one of two places the implementation
   * visibly departs from the mockup, and it is the departure to keep: v6's own
   * field is marked by nothing else — its fill is white on a `#F6EFFA` wash, a
   * further 1.12:1.
   */
  borderControl: string;
  text: string;
  /**
   * The second of three text levels — v6's `--body` `#4F4359`. Drawer rows, chip
   * labels, the value in a labelled field, "Remember me". Sits between `text` (a
   * heading or a figure) and `textMuted` (a timestamp or a caption).
   */
  textSubtle: string;
  textMuted: string;
  textInverse: string;
  /**
   * The action **fill**: a button, the active filter chip, the centre FAB, a
   * meter, a chart line. Never type — see `accent`.
   */
  primary: string;
  primaryPressed: string;
  /**
   * The label on a `primary` fill. v6's ink, not white — 4.75:1 on the ember,
   * where white would be 3.06:1 and fail.
   */
  onPrimary: string;
  /**
   * A tint for the surface behind an active affordance — the pill under the
   * selected tab, the totals box on the sale sheet, the date badge on an event.
   * v6 draws it as `--border2` `#F0E7F5`.
   *
   * A real token rather than `primary + '1F'`: eight-digit hex alpha is
   * unreliable on older Android, and a literal alpha suffix is exactly the kind
   * of value that must not appear in a component. Note it is a **lilac**, not a
   * tint of the ember — v6's soft active surface is a neutral step off the wash,
   * and washing it orange is what makes an operations screen look like a
   * promotion.
   */
  primarySoft: string;
  /**
   * The deep plum **block**: the hero card a screen's dominant KPI sits on, and
   * the trailing layer of the masthead wave. One step past a primary button in
   * the hierarchy, which is why a primary button can sit inside it and still
   * read as the action.
   */
  secondary: string;
  secondaryPressed: string;
  onSecondary: string;
  /** The caption level on a `secondary` block — v6's 75%-white. */
  onSecondaryMuted: string;
  /** The one highlight v6 allows on a `secondary` block: a margin, a delta. */
  onSecondaryAccent: string;
  /**
   * The presence dot on a `secondary` block — the drawer's profile header.
   *
   * `success` and `offline` cannot be used there and it is not a near miss:
   * both are tuned to carry 4.5:1 as *text on their own light tint*
   * (`emerald700`, `amber700`), and against the plum they land near 1.5:1 —
   * a dot the size of a full stop, invisible. These are the 400 steps, which
   * clear the 3:1 WCAG 1.4.11 asks of a graphical object: 6.40:1 and 7.15:1
   * on `secondary`.
   *
   * One value per token rather than one per scheme, because `secondary` is
   * `plum700` in **both** maps — the hero block does not invert, so neither
   * does what is legible on it.
   */
  onSecondarySuccess: string;
  onSecondaryOffline: string;
  /**
   * The FRONT layer of the masthead wave — v6's `--brand` `#7A3EA1`.
   *
   * New in v6, and the only token the v5 masthead had no equivalent for. v5's
   * masthead was one flat brown block, so `secondary` alone described it. v6
   * draws **two** overlapping shapes with different curves: this one covers the
   * top of the screen, and `secondary` sits 22px taller behind it so its deeper
   * plum reads as the wave's trailing edge. One token cannot carry that, and
   * approximating the pair with a single fill is what makes the header read flat
   * — the whole visual signature of v6 is the gap between these two curves.
   *
   * Held to the text bar rather than the graphic one: white type sits directly
   * on it in every screen of the spec.
   */
  secondaryWave: string;
  /** The caption level on the front wave layer. Lighter block, own value. */
  onSecondaryWaveMuted: string;
  /**
   * The brand as **text or an icon**, as opposed to `primary`, which is what a
   * surface is painted with.
   *
   * **v6 finally gives this token a colour of its own.** In v4 it had to be the
   * ink — that design set "View all", "All reports" and every money figure in
   * `#3E1B00` and carried their link-ness with weight instead of hue, so `accent`
   * equalled `text` in light and the token read as redundant. v6's plum is a
   * real brand colour that is also genuinely readable (12.35:1 on a card), so
   * the mark and the body text are now different colours in both schemes.
   *
   * It is still the token a component must reach for instead of `primary` when
   * the thing is a word rather than a shape. `contrast.test.ts` asserts it is at
   * least as readable as `primary`, which is the property that matters.
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
   * surface goes is this file. v6 draws it as `rgba(58,20,90,0.5)`.
   */
  overlay: string;
  /** So a component never needs a bare 'transparent' colour literal. */
  transparent: string;

  /**
   * The four-step ramp v6 draws a share-of-total bar with, plus the pale
   * remainder that closes it.
   *
   * A ramp rather than four tokens because the only thing that reads it is a
   * chart, which needs "the nth series" and not "the wages colour" — a series
   * has no semantics, it is just distinguishable from its neighbour. Ordered
   * strongest-first, which is the order v6 draws them in and therefore the order
   * that puts the largest slice in the strongest colour.
   */
  series: readonly [string, string, string, string, string];

  /**
   * The splash background wash — a vertical gradient with a bloom behind the
   * mark. Only `screens/SplashScreen.tsx` reads these.
   *
   * **`splashTop` is not free.** Android draws the native boot splash before a
   * line of JavaScript runs, and its background can only be a flat colour
   * (`android:windowSplashScreenBackground` on API 31+ takes a colour, not a
   * drawable — so the gradient cannot live there). The JS splash then replaces
   * it mid-boot. If `splashTop` and the native colour differ, that swap is a
   * visible step change in the background at the top of the screen.
   *
   * So `splashTop` MUST equal `bootsplash_background` in
   * `android/app/src/main/res/values{,-night}/colors.xml`. **v6 moves this
   * value**: its splash is not a cream but the wave itself, 700px of plum over
   * the whole screen, so `splashTop` is `plum500` — the front layer, which is
   * what the top of the screen actually shows. Change one and you have to change
   * the other. `scripts/check-splash-colour.sh` is what enforces the pair, and
   * it resolves `splashTop: palette.<name>` by name, so this must stay a palette
   * reference and not become a literal.
   */
  splashTop: string;
  /** The far end of the wash. Carries the wordmark, so it is contrast-checked. */
  splashBottom: string;
  /** Centre of the radial bloom behind the logo. Drawn at low opacity. */
  splashGlow: string;
};

export const lightColors: SemanticColors = {
  bg: palette.lilac50,
  surface: palette.lilac0,
  /**
   * A recessed control on a card — the quantity stepper's tray, a meter's track,
   * a read-only field inside the sale sheet.
   *
   * v6 draws this two ways, `--field` for a tray and `--divider2` for a track,
   * and this takes the darker of the two. A tray one step off the card is
   * imperceptible; a track the same colour as the card is a meter with no empty
   * half.
   */
  surfaceSunken: palette.lilac150,
  surfaceDocket: palette.lilac25,
  border: palette.lilac200,
  divider: palette.lilac100,
  borderStrong: palette.lilac300,
  // v6's #E7DCEF field edge is 1.32:1. This is 3.43:1 on a card, 3.05:1 on the
  // wash. See `borderControl` on the type.
  borderControl: '#8F8894',
  text: palette.ink, // 14.45:1 on bg
  textSubtle: palette.lilacSubtleFg, // 8.18:1 on bg
  /**
   * v6's third text level, made readable — and its fourth level folded into this
   * one.
   *
   * v6 runs `#7B6C88` for captions and `#A79BB2` for placeholders, chart axis
   * labels and **inactive tab labels**. `#A79BB2` is 2.34:1 on the wash: fine
   * for a mockup viewed on a desktop monitor, unreadable on a phone in a shop.
   * Rather than ship a token nothing may legally use, the two levels collapse
   * here at 4.51:1. The visible cost is that v6's faintest tier is gone and the
   * hierarchy is three deep instead of four; the alternative was an inactive tab
   * label nobody can read.
   */
  textMuted: palette.lilacMutedFg,
  textInverse: palette.lilac0,
  primary: palette.ember500, // v6's ember, at 3.04:1 on the wash
  primaryPressed: palette.ember600,
  primarySoft: palette.lilac200, // v6's active pill
  /** v6 pairs its ember with the ink, not white: 4.75:1 against 3.06:1. */
  onPrimary: palette.ink,
  secondary: palette.plum700, // v6's hero block and the wave's trailing edge
  secondaryPressed: '#3C1759',
  onSecondary: palette.lilac0, // 12.35:1
  onSecondaryMuted: palette.heroMutedFg, // 8.05:1 on the block, 4.52:1 on the wave
  onSecondaryAccent: palette.gold200, // 9.22:1
  onSecondarySuccess: palette.emerald400, // 6.40:1 on the block
  onSecondaryOffline: palette.amber400, // 7.15:1 on the block
  secondaryWave: palette.plum500, // the front wave layer; white is 6.93:1
  onSecondaryWaveMuted: palette.waveMutedFg, // 4.68:1
  /** The plum. Distinct from `text` for the first time — see the type. */
  accent: palette.plum700,
  accentSoft: palette.lilac200,
  honey: palette.gold600,
  honeySoft: palette.gold100,
  /**
   * A focus ring is the only thing showing which field the keyboard is in, so it
   * takes the 3:1 non-text bar (WCAG 1.4.11). The ember clears it at 3.43:1 on a
   * card — which is the whole reason `ember500` is not v6's own orange.
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
  overlay: 'rgba(58, 20, 90, 0.5)', // v6 exactly
  transparent: 'transparent',
  series: [
    palette.ember500,
    palette.plum700,
    palette.plum500,
    palette.plum400,
    palette.ember100,
  ],
  // = bootsplash_background in values/colors.xml, and NOT = bg. See the type.
  splashTop: palette.plum500,
  // The wash deepens into the back wave layer, which is how v6's splash reads:
  // the same two plums as every masthead, at full height. White wordmark is
  // 12.35:1 at the far end and 6.93:1 at the near one.
  splashBottom: palette.plum700,
  // The bloom. Gold rather than a plum step, so it reads as warmth coming off
  // the mark rather than as the screen dimming. Drawn at low opacity.
  splashGlow: palette.gold300,
};

export const darkColors: SemanticColors = {
  bg: palette.plum990,
  surface: palette.plum950,
  surfaceSunken: '#120D1A',
  surfaceDocket: '#2B2039',
  border: '#332748',
  divider: '#2C2140',
  borderStrong: '#40325A',
  // 3.73:1 on a card, 4.09:1 on the page.
  borderControl: '#7D7288',
  text: palette.lilacFgDark, // 14.21:1 on a card
  textSubtle: palette.lilacSubtleFgDark, // 9.59:1
  // v6's faintest light-mode value, which on a dark card is 6.42:1 — the one
  // place it is genuinely readable.
  textMuted: palette.lilacMutedFgDark,
  textInverse: palette.plum990,
  /**
   * The primary **holds** across schemes.
   *
   * A mid-orange is legible on lilac and on near-black alike — 3.43:1 on a white
   * card, 5.25:1 on a dark one — so light and dark share one action fill and a
   * button screenshots the same either way. `onPrimary` holds with it: the ink
   * is the label in both, at 5.05:1 here.
   */
  primary: palette.ember500,
  primaryPressed: palette.ember600,
  primarySoft: palette.ember950,
  onPrimary: palette.ink,
  /**
   * The wave is v6's own plums in dark, exactly as in light — and that is a
   * deliberate reversal of how this map was first written.
   *
   * The first pass stepped both layers down to muted purple-greys, reasoning
   * that `#4A1D70` on a `#171021` field is 1.50:1 and so a masthead whose edge
   * you cannot find. On a phone that turned out to be the wrong trade: the
   * greys read as **grey**, the one screen-wide element carrying the brand
   * stopped carrying it, and a user in night mode saw an app that did not look
   * like the design at all.
   *
   * The bar that actually applies here is the text bar, not 1.4.11's 3:1. The
   * masthead is a large block whose job is to be the brand and to hold a title;
   * what has to be legible is the title, and white is 12.35:1 on the back layer
   * and 6.93:1 on the front. Its boundary is not "visual information required to
   * identify a component" — the title, the back arrow and the curve all say
   * where the header is. So the plums hold across both schemes, the way
   * `primary` already does, and a screenshot of the masthead is the same
   * masthead either way.
   *
   * The honest cost, stated because it is real: `secondary` is also the hero
   * block, and at 1.50:1 on the dark page that card is *subtle* where in light
   * it is 10.96:1 and unmissable. It still reads — it is a large field of solid
   * colour with white type on it — but it no longer announces itself. Splitting
   * the hero block from the wave would fix that and cost a token whose two uses
   * are the same colour in the design; if a dark-mode hero ever needs to shout,
   * that is the change to make.
   */
  secondary: palette.plum700,
  secondaryPressed: '#3C1759',
  onSecondary: palette.lilacFgDark, // 10.37:1
  onSecondaryMuted: palette.heroMutedFg, // 8.05:1
  onSecondaryAccent: palette.gold200, // 9.22:1
  onSecondarySuccess: palette.emerald400, // 6.40:1 on the block
  onSecondaryOffline: palette.amber400, // 7.15:1 on the block
  secondaryWave: palette.plum500, // 5.82:1 for the title
  onSecondaryWaveMuted: palette.heroMutedFg, // 4.52:1
  /** Brand-as-text lifts to a light plum: 7.91:1 on a card, against primary's 5.25:1. */
  accent: '#C9A2E8',
  accentSoft: '#2A1E3D',
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
   * The light ramp's deep plums go muddy on a near-black card, so dark keeps the
   * ember at the head and reaches for the *pale* ends of both hue families
   * rather than the deep ones.
   *
   * The order alternates warm and cool rather than descending in lightness, and
   * that is the whole reason it is not simply the light ramp re-sorted. A
   * monotone ramp on a dark card puts its two nearest steps side by side at
   * 1.16:1 — which is what the first draft of this ramp did, and what
   * `contrast.test.ts` caught. Alternating holds the tightest adjacent pair at
   * 2.73:1 against a 1.3:1 bar.
   */
  series: [
    palette.ember500,
    palette.ember100,
    palette.plum400,
    palette.gold200,
    palette.plum500,
  ],
  // = bootsplash_background in values-night/colors.xml.
  //
  // The same two plums as light, and for the same reason the wave above is: the
  // splash IS the masthead at full height, so a dark splash that was not the
  // brand would disagree with the header the app opens on. It also means the
  // boot splash is one colour on every device regardless of night setting, which
  // removes a whole class of hand-off flash.
  splashTop: palette.plum500,
  splashBottom: palette.plum700,
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
 * Hues follow v6's order list, which is v4's unchanged and the same vocabulary
 * the web uses on its production demands: amber = waiting on somebody, blue = in
 * flight, violet = verified but not yet approved, emerald = done, red = refused,
 * neutral = settled.
 *
 * Unlike the maps above, `statusColors` is shared by BOTH themes — it lives in
 * `base` in themes.ts, so one value has to carry on lilac AND on near-black.
 * Each is the lightness that maximises the worse of those two contrasts, which
 * lands them all at ~4.3:1 either way. That is the ceiling for a single value
 * serving both; a per-theme split is what it would take to clear 4.5:1.
 *
 * `delivered` is the one value the re-skin moves: it was a warm grey chosen
 * against a cream field, and on the lilac wash it read as a stain. It is the
 * same lightness rotated onto the neutral purple axis.
 */
export const statusColors = {
  // OrderStatus
  pending: '#B55D00', // amber — waiting
  preparing: '#336FE5', // blue — in flight
  ready: '#008656', // emerald — done, awaiting collection
  delivered: '#75707F', // neutral — settled
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
 * Only three keys move — `primary`, `primaryPressed` and `onPrimary`.
 * Everything else is the scheme's own map, shared by reference: the field, the
 * cards, the borders, the text ramp, the wave and the status colours are not
 * preferences, and an accent that could reach them would be a second theme
 * rather than a swatch. See `accents.ts`.
 *
 * **The wave is deliberately out of reach.** v6 offers its accent and its mood
 * as two independent controls, and the mood is what owns the plum — so a swatch
 * recolours the buttons and leaves the masthead alone, exactly as the design
 * file does.
 *
 * `primarySoft` stays the scheme's neutral rather than becoming a tint of the
 * chosen hue. v6's soft active surface is `#F0E7F5` — a lilac, not a wash of the
 * ember — and `text` is asserted readable on it. Tinting it per accent would put
 * five new surfaces under that assertion for no visible gain: the pill under an
 * active tab reads as "active" from its shape, not its hue.
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
