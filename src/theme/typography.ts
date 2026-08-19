import type { TextStyle } from 'react-native';

/**
 * Type scale. Money, quantities and IDs use tabular figures so digits align in
 * columns — without it, totals in a list visibly jitter as values change.
 *
 * `family` names are the PostScript names the fonts register under once linked.
 * Until the font files are added to the project they fall back to the platform
 * default, which changes metrics but not layout.
 */

export const fontFamily = {
  display: 'Archivo',
  body: 'Inter',
  mono: 'IBMPlexMono',
} as const;

/**
 * The four weights the type scale uses, named rather than numbered.
 *
 * A `type` token carries its own weight, so this exists only for the handful of
 * places that must vary weight *on top of* a token — the tab bar's active label
 * sitting over `type.caption`, and the badge, whose digits are bolder than any
 * caption. Those were `fontWeight: '600'` literals, which is how a fifth weight
 * eventually appears in the app without anyone deciding on it.
 */
export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
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
  display: token({
    fontFamily: fontFamily.display,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.4,
  }),
  h1: token({
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.2,
  }),
  h2: token({
    fontFamily: fontFamily.body,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '600',
  }),
  h3: token({
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
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
  label: token({
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.1,
  }),
  caption: token({
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  }),
  money: token({
    fontFamily: fontFamily.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    tabular: true,
  }),
  moneyLg: token({
    fontFamily: fontFamily.display,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    tabular: true,
  }),
  /**
   * A figure in a row: quantities, counts, and the secondary money amounts
   * `MBMoney size="sm"` draws.
   *
   * Tabular and one weight heavier than `body`, because a financial value has to
   * outrank the label beside it — a breakdown row used to put a 15px label
   * against a 13px number, which reads as the label being the point.
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
    fontWeight: '600',
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
