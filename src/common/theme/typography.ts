import type { TextStyle } from 'react-native';

/**
 * Type scale, set to the v4 design.
 *
 * Money, quantities and IDs use tabular figures so digits align in columns —
 * without it, totals in a list visibly jitter as values change.
 *
 * ---------------------------------------------------------------------------
 * The faces ship, and the `family` strings are a contract with Kotlin
 * ---------------------------------------------------------------------------
 * v6 names the same two faces v4 did — Plus Jakarta Sans and Playfair Display —
 * and both are now in the tree, with IBM Plex Mono for the identifiers v6 never
 * draws. They are **Android font resources**, not `assets/fonts/`, and they are
 * registered by name in `MainApplication.registerFonts()`.
 *
 * That means the strings below are matched against Kotlin, not against a file.
 * Nothing checks it at build time and a mismatch fails silently: the lookup
 * misses ReactFontManager's custom-font cache, falls through to
 * `Typeface.create(name, style)`, and Android hands back the system sans. The
 * app renders and only the letterforms say anything is wrong.
 * `scripts/check-fonts.sh` — `npm run fonts:check`, part of `verify` — is what
 * holds the three artefacts together.
 *
 * The asset route was not an option. ReactFontManager resolves an asset font by
 * filename and knows exactly four variants (`""`, `_bold`, `_italic`,
 * `_bold_italic`), collapsing every numeric weight to NORMAL or BOLD on the way.
 * This scale uses 400, 600, 700 and 800 as four distinct steps, so through that
 * path 600 and 800 would both render as plain bold. Its own docstring names the
 * way out: "To support multiple font styles or weights, you must provide a font
 * in XML format."
 *
 * **One caveat, and it is the OS rather than this project.** `minSdkVersion` is
 * 24, and `TypefaceStyle.apply` only calls `Typeface.create(typeface, weight,
 * italic)` from API 28. Below that it falls back to `nearestStyle`, which is
 * NORMAL or BOLD — so on Android 7.0 through 8.1 the five weights collapse to
 * two. The 400-vs-800 contrast that carries v6's hierarchy still reads there
 * (regular against bold); what is lost is the finer 500 and 600 steps. Nothing
 * below changes for it, and the faces themselves are correct on every version.
 */

export const fontFamily = {
  /**
   * v6's serif: the wordmark, the splash tagline, a hero figure. Ships as
   * `res/font/playfairdisplay.xml` in two cuts only — 700 upright and 400
   * italic — because those are the two the app draws.
   */
  display: 'PlayfairDisplay',
  /** v6's UI face, and everything else. Five weights, 400 through 800. */
  body: 'PlusJakartaSans',
  /**
   * v6 has no monospace face — it never draws an identifier. This app does
   * (order numbers, voucher numbers, operation ids), so the mono family is
   * carried over from the previous scale unchanged, at one weight. See `mono`
   * below.
   */
  mono: 'IBMPlexMono',
} as const;

/**
 * The five weights the type scale uses, named rather than numbered.
 *
 * A `type` token carries its own weight, so this exists only for the handful of
 * places that must vary weight *on top of* a token — the tab bar's active label
 * sitting over `type.caption`, and the badge, whose digits are bolder than any
 * caption.
 *
 * **`extrabold` is new with v4, and it is not decoration.** v4 sets every
 * heading, every KPI figure and every card title at 800 and drops body copy to
 * 400–600; the gap between those two is what gives the design its hierarchy on
 * a dense screen. Rendering the headings at 700 collapses it. Note this makes
 * five weights available where the file previously capped at four — the rule
 * that no single *screen* uses more than three of them still stands.
 */
export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const satisfies Record<string, TextStyle['fontWeight']>;

type TypeToken = TextStyle & { tabular?: boolean };

const tabularVariant: TextStyle = {
  fontVariant: ['tabular-nums'],
};

function token(style: TypeToken): TextStyle {
  const { tabular, ...rest } = style;
  return tabular ? { ...rest, ...tabularVariant } : rest;
}

export const type = {
  /** The wordmark and the splash. v4's Playfair, at its canvas heading size. */
  display: token({
    fontFamily: fontFamily.display,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.3,
  }),
  /**
   * The splash tagline, and the only italic in the app.
   *
   * v4 sets it in Playfair at 19 italic — the one place the serif appears as a
   * *sentence* rather than as a wordmark. It is a brand moment on a screen with
   * nothing to operate, which is why nothing else may use it: an italic serif
   * anywhere in the operations screens reads as an editorial pull-quote.
   */
  tagline: token({
    fontFamily: fontFamily.display,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '400',
    fontStyle: 'italic',
  }),
  /**
   * A screen title — v4's "Orders", "Reports", "Expenses" at 21/800.
   *
   * Sans, not serif. v4 reserves Playfair for the brand and sets every screen
   * title in the UI face; a serif title on an operations list reads as an
   * article rather than a tool.
   */
  h1: token({
    fontFamily: fontFamily.body,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.2,
  }),
  /** A title inside the brown header block, and the login heading. */
  h2: token({
    fontFamily: fontFamily.body,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  }),
  /** A section heading over a group of cards — "Today Overview". */
  h3: token({
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  }),
  body: token({
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  }),
  bodyStrong: token({
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  }),
  /**
   * A card's own title — an order number, a product name in a row.
   *
   * v4 draws this at 15/800, the same size as `bodyStrong` and two steps
   * heavier. That is the pairing the list rows are built on: the identifier
   * outranks the detail beside it by weight rather than by size, so the row
   * stays one line tall.
   */
  cardTitle: token({
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  }),
  label: token({
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.1,
  }),
  caption: token({
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  }),
  /** A KPI figure on a stat tile. v4's 21/800. */
  money: token({
    fontFamily: fontFamily.body,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    tabular: true,
  }),
  /** The one dominant total on a screen. */
  moneyLg: token({
    fontFamily: fontFamily.body,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    tabular: true,
  }),
  /**
   * A figure in a row: quantities, counts, and the secondary money amounts
   * `MBMoney size="sm"` draws.
   *
   * Tabular and heavier than `body`, because a financial value has to outrank
   * the label beside it — a breakdown row used to put a 15px label against a
   * 13px number, which reads as the label being the point.
   *
   * Distinct from `mono`, and the split is what each is for: `mono` is a
   * **monospace** face for identifiers a person reads character by character
   * (order numbers, voucher numbers, operation ids). `number` is the body face
   * with tabular figures, for quantities that sit in a column and must align.
   */
  number: token({
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    tabular: true,
  }),
  mono: token({
    fontFamily: fontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    tabular: true,
  }),
} as const;

export type TypeToken_ = keyof typeof type;

// ---------------------------------------------------------------------------
// The selectable typeface
// ---------------------------------------------------------------------------

/**
 * The three typefaces v6 offers, as whole moods rather than a body-font swap.
 *
 * The design file's `fonts` map pairs a UI face with a display face, and for two
 * of the three they are the **same family**: picking Space Grotesk or
 * Baskerville means the serif goes away entirely, because those faces are meant
 * to carry the wordmark themselves. Only Jakarta keeps a separate Playfair for
 * the display slot. Modelling this as one `body` token with a fixed serif beside
 * it would quietly keep Playfair on a screen the design says has no Playfair.
 *
 * The mono family does NOT move. v6 has no monospace — it never draws an
 * identifier — so the choice says nothing about what an order number should be
 * set in, and swapping it would put a voucher number in a serif.
 *
 * ---------------------------------------------------------------------------
 * The alternates do not carry every weight, and that is not a defect
 * ---------------------------------------------------------------------------
 * The scale uses 400/600/700/800 plus a 400 italic. Neither alternate has an
 * 800, and Space Grotesk has no italic at all:
 *
 *   Space Grotesk      400 500 600 700          no 800, no italic
 *   Libre Baskerville  400     600 700 + italic no 800
 *
 * Android resolves an undeclared weight to the nearest declared one, so 800
 * renders at 700 in both. A two-weight Baskerville IS what a Baskerville is;
 * flattening the heading step is the typeface's design rather than a gap in the
 * app. `scripts/check-fonts.sh` therefore holds only the DEFAULT face to
 * declaring every weight, and checks the alternates for registration and file
 * presence alone.
 */
export type TypefaceKey = 'jakarta' | 'grotesk' | 'baskerville';

export interface Typeface {
  key: TypefaceKey;
  /** Shown in Settings. v6's own names. */
  label: string;
  /** A sentence for the specimen tile — the face's character, not its metrics. */
  note: string;
  /** Registered family names. See `MainApplication.registerFonts`. */
  body: string;
  display: string;
}

export const TYPEFACES: Record<TypefaceKey, Typeface> = {
  jakarta: {
    key: 'jakarta',
    label: 'Jakarta Sans',
    note: 'The default. A sans for the UI, a serif for the wordmark.',
    body: 'PlusJakartaSans',
    display: 'PlayfairDisplay',
  },
  grotesk: {
    key: 'grotesk',
    label: 'Space Grotesk',
    note: 'One face throughout. No italic, so the tagline sits upright.',
    body: 'SpaceGrotesk',
    display: 'SpaceGrotesk',
  },
  baskerville: {
    key: 'baskerville',
    label: 'Baskerville',
    note: 'One serif throughout, headings a step lighter than elsewhere.',
    body: 'LibreBaskerville',
    display: 'LibreBaskerville',
  },
};

/** Declaration order, which is the order the picker draws them in. */
export const TYPEFACE_KEYS = Object.keys(TYPEFACES) as TypefaceKey[];

export const DEFAULT_TYPEFACE: TypefaceKey = 'jakarta';

export function isTypefaceKey(value: unknown): value is TypefaceKey {
  return typeof value === 'string' && value in TYPEFACES;
}

/** Never throws — an unrecognised stored value falls back to the default. */
export function typefaceFor(key: unknown): Typeface {
  return isTypefaceKey(key) ? TYPEFACES[key] : TYPEFACES[DEFAULT_TYPEFACE];
}

export type TypeScale = typeof type;

/**
 * The scale set in a chosen typeface.
 *
 * Swaps the family on each token rather than rebuilding the scale, so sizes,
 * line heights, weights and tabular figures are defined **once** — a second
 * literal copy per face is how a 15pt body becomes 15.5 on one of them and
 * nobody notices for a year.
 *
 * Returns the base `type` object **by identity** for the default face, exactly
 * as `withAccent` does in `colors.ts`. That matters beyond tidiness: the scale
 * goes onto the theme, the theme is a context value, and handing back a fresh
 * object for the unchanged case would re-render every consumer on any provider
 * re-evaluation.
 */
export function typeFor(key: TypefaceKey): TypeScale {
  if (key === DEFAULT_TYPEFACE) return type;
  const face = TYPEFACES[key];

  const swap = (style: TextStyle): TextStyle => {
    if (style.fontFamily === fontFamily.display) {
      return { ...style, fontFamily: face.display };
    }
    if (style.fontFamily === fontFamily.body) {
      return { ...style, fontFamily: face.body };
    }
    // `mono` and anything unfamilied is left alone. See the note above.
    return style;
  };

  return Object.fromEntries(
    Object.entries(type).map(([name, style]) => [name, swap(style)]),
  ) as TypeScale;
}

/**
 * The family names a chosen typeface resolves to.
 *
 * On the theme beside `type` because a handful of places need the family
 * *without* a size — a `StyleSheet.create` at module scope, or a component
 * composing its own text style — and reading it off `theme.type.body.fontFamily`
 * would make those depend on the body token happening to carry one.
 *
 * `mono` is the default's, always. See the note on TYPEFACES.
 */
export interface FontFamilies {
  display: string;
  body: string;
  mono: string;
}

export function familiesFor(key: TypefaceKey): FontFamilies {
  if (key === DEFAULT_TYPEFACE) return fontFamily;
  const face = TYPEFACES[key];
  return { display: face.display, body: face.body, mono: fontFamily.mono };
}
