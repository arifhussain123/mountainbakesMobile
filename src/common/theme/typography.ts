import type { TextStyle } from 'react-native';

/**
 * Type scale, set to the v4 design.
 *
 * Money, quantities and IDs use tabular figures so digits align in columns —
 * without it, totals in a list visibly jitter as values change.
 *
 * `family` names are the PostScript names the fonts register under once linked.
 * Until the font files are added to the project they fall back to the platform
 * default, which changes metrics but not layout. **v4 names two faces this
 * project does not yet ship** — Plus Jakarta Sans and Playfair Display — so
 * every screen currently renders in the platform sans and the design's
 * character is not fully visible on device. Adding the files is a separate,
 * purely additive step; nothing below changes when they land.
 */

export const fontFamily = {
  /** v4's serif: the wordmark, the splash tagline, a hero figure. */
  display: 'PlayfairDisplay',
  /** v4's UI face, and everything else. */
  body: 'PlusJakartaSans',
  /**
   * v4 has no monospace face — it never draws an identifier. This app does
   * (order numbers, voucher numbers, operation ids), so the mono family is
   * carried over from the previous scale unchanged. See `mono` below.
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
