/**
 * The selectable accent — v4's "Theme colour" swatch row in Settings.
 *
 * ---------------------------------------------------------------------------
 * What an accent may and may not change
 * ---------------------------------------------------------------------------
 * An accent replaces the **fill axis only**: `primary`, its pressed step, the
 * label that sits on it, and the soft tint behind an active affordance. It does
 * not touch the field, the cards, the borders, the text ramp or the status
 * colours. The palette is a fill and a mark (see `colors.ts`), and only the fill
 * is a preference — recolouring the mark would recolour every word in the app.
 *
 * ---------------------------------------------------------------------------
 * `onPrimary` is per-accent, and that is not a detail
 * ---------------------------------------------------------------------------
 * The v4 brief states one contrast rule — "text and icons placed on #FB6D34 are
 * #3E1B00, never white" — and then offers `#3E1B00` itself as swatch two. Ink
 * type on an ink fill is **1.00:1**: an invisible button label. So the rule is
 * true of the ember and not of the set, and `onPrimary` is carried per accent,
 * chosen as whichever of ink or white is more readable on that fill. Ember keeps
 * ink at 4.78:1; every other swatch takes white.
 *
 * ---------------------------------------------------------------------------
 * Each value is contrast-corrected per scheme, not shared between them
 * ---------------------------------------------------------------------------
 * A fill carries information here — the meter on the stock card, the trend line
 * on the dashboard — so it is held to the 3:1 of WCAG 1.4.11 against the surface
 * it actually sits on, exactly as `ember500` is. Two swatches cannot meet that
 * with one value:
 *
 * - **Ember** is v4's `#FB6D34` walked down 6% in light (2.73:1 → 3.04:1) and
 *   used verbatim in dark, where it is already 6.43:1.
 * - **Ink** is the extreme case. `#3E1B00` is 14.56:1 on the cream field and
 *   **1.19:1** on the near-black one — a black button on a black screen. Its
 *   dark variant is lifted 32% toward white, which lands on a taupe that is no
 *   longer ink in any meaningful sense. That is the honest consequence of
 *   offering the ink as a *fill*, and it is why the swatch is labelled by name
 *   rather than by its hex.
 *
 * Emerald and indigo clear both schemes unmodified. Violet needs a lift in dark
 * to clear a card.
 *
 * ---------------------------------------------------------------------------
 * A press moves *away* from its label
 * ---------------------------------------------------------------------------
 * The pressed step darkens where the label is white and lightens where the label
 * is ink, rather than always darkening. Always-darken is the habit, and on the
 * dark-scheme accents whose label is ink it drops that label to 2.8:1 for the
 * length of the press. Moving away from the label instead keeps every pressed
 * state at or above 4.8:1 — with one exception, Ember in light at 3.94:1, which
 * is the value that already shipped and is left alone rather than "fixed" into a
 * different default.
 *
 * There is no assertion on the pressed step, deliberately: it is a ~120ms
 * transient under `MBPressable`'s scale, not a state anything is read in. The
 * rule is here so the next swatch is picked the same way.
 *
 * `__tests__/contrast.test.ts` asserts all of this across every accent and both
 * schemes, so a new swatch cannot be added without meeting the same bars.
 */

export type AccentKey = 'ember' | 'ink' | 'emerald' | 'indigo' | 'violet';

/** The fill group an accent replaces. */
export interface AccentColors {
  primary: string;
  primaryPressed: string;
  /** Ink or white — whichever is readable on this fill. See the note above. */
  onPrimary: string;
}

export interface Accent {
  key: AccentKey;
  /** Shown in Settings. v4 names the default "Ember". */
  label: string;
  /**
   * The circle drawn in the swatch row.
   *
   * v4's own hex, NOT the corrected `primary` below — the swatch is a brand
   * choice being offered, and showing a value 6% off the one the user is picking
   * would make the row disagree with itself. Nothing is ever set in this colour;
   * it is a 32px circle with no text on it, so 1.4.11 does not apply.
   */
  swatch: string;
  light: AccentColors;
  dark: AccentColors;
}

const INK = '#3E1B00';
const WHITE = '#FFFFFF';

export const ACCENTS: Record<AccentKey, Accent> = {
  ember: {
    key: 'ember',
    label: 'Ember',
    swatch: '#FB6D34',
    /*
     * The default, and byte-identical to what shipped before accents existed —
     * `ember500` / `ember600` / ink, one value across both schemes. Choosing
     * Ember must leave the app exactly as it was, so this is not recomputed
     * alongside the other four; it is copied.
     */
    light: { primary: '#EC6631', primaryPressed: '#D65A28', onPrimary: INK },
    dark: { primary: '#EC6631', primaryPressed: '#D65A28', onPrimary: INK },
  },
  ink: {
    key: 'ink',
    label: 'Ink',
    swatch: INK,
    // 14.56:1 on the field. White label at 15.42:1 — never ink on ink.
    light: { primary: INK, primaryPressed: '#2E1400', onPrimary: WHITE },
    // Lifted 32% toward white: 3.33:1 on the dark field, where the ink is 1.19:1.
    dark: { primary: '#7C6452', primaryPressed: '#846D5C', onPrimary: WHITE },
  },
  emerald: {
    key: 'emerald',
    label: 'Pine',
    swatch: '#1F7A47',
    light: { primary: '#1F7A47', primaryPressed: '#1C6E40', onPrimary: WHITE },
    dark: { primary: '#2E9E5B', primaryPressed: '#43A86B', onPrimary: INK },
  },
  indigo: {
    key: 'indigo',
    label: 'Indigo',
    swatch: '#3D63C4',
    light: { primary: '#3D63C4', primaryPressed: '#3759B0', onPrimary: WHITE },
    dark: { primary: '#6B8CE0', primaryPressed: '#7A98E3', onPrimary: INK },
  },
  violet: {
    key: 'violet',
    label: 'Violet',
    swatch: '#6B4FBB',
    light: { primary: '#6B4FBB', primaryPressed: '#6047A8', onPrimary: WHITE },
    dark: { primary: '#9B83DC', primaryPressed: '#A58FE0', onPrimary: INK },
  },
};

/** Declaration order, which is the order the swatch row draws them in. */
export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

export const DEFAULT_ACCENT: AccentKey = 'ember';

export function isAccentKey(value: unknown): value is AccentKey {
  return typeof value === 'string' && value in ACCENTS;
}

/** Never throws — an unrecognised stored value falls back to the default. */
export function accentFor(key: unknown): Accent {
  return isAccentKey(key) ? ACCENTS[key] : ACCENTS[DEFAULT_ACCENT];
}
