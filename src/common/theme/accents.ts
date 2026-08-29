/**
 * The selectable accent — v6's "Feel > accent" swatch row, surfaced in Settings.
 *
 * ---------------------------------------------------------------------------
 * What an accent may and may not change
 * ---------------------------------------------------------------------------
 * An accent replaces the **fill axis only**: `primary`, its pressed step, and
 * the label that sits on it. It does not touch the field, the cards, the
 * borders, the text ramp, the status colours, or — new in v6 — **the masthead
 * wave**. The palette is a fill and a mark (see `colors.ts`), and only the fill
 * is a preference; recolouring the mark would recolour every word in the app.
 *
 * That the wave is out of reach is v6's own arrangement, not a restriction
 * invented here. The design file exposes `accent` and `mood` as two independent
 * controls: the mood owns the plum and the accent owns the buttons, and picking
 * a new swatch in the mockup leaves the purple header exactly where it was.
 *
 * ---------------------------------------------------------------------------
 * The set, against v6's own options
 * ---------------------------------------------------------------------------
 * v6 offers five: `#FB6D34`, `#1F7A47`, `#3D63C4`, `#6B4FBB`, `#C2412E`. Four
 * are already here as Ember, Pine, Indigo and Violet. The fifth — v6's brick red
 * — is **not** carried, because this app has always offered the brand mark
 * itself as a fill and that swatch is the more useful of the two. See Plum.
 *
 * ---------------------------------------------------------------------------
 * "Ink" became "Plum", and that is a correction rather than a rename
 * ---------------------------------------------------------------------------
 * The v4 swatch named Ink was `#3E1B00`: the mark, offered as a fill. With the
 * neutral axis gone purple a brown button is simply off-palette, so the swatch
 * moves onto the new axis — and it must move to **`#4A1D70`, the mark**, not to
 * `#2E1440`, the ink.
 *
 * That distinction is load-bearing. v4's ink and v4's mark were the same hex, so
 * choosing Ink made the fill *be* the mark and the two coincided; that
 * coincidence is the whole reason `contrast.test.ts` asserts the accent-vs-mark
 * ordering as `>=` rather than `>`. In v6 they are different colours — the ink
 * is 16.28:1 on a card and the mark is 12.35:1 — so a fill set to the ink would
 * be *more readable than the mark* and break the ordering outright. Setting the
 * swatch to the mark restores the coincidence exactly as before.
 *
 * ---------------------------------------------------------------------------
 * `onPrimary` is per-accent, and that is not a detail
 * ---------------------------------------------------------------------------
 * v6 states one contrast rule — text on `#FB6D34` is the ink, never white — and
 * then offers four more swatches the rule is simply false of. Ink type on the
 * deep plum is 1.79:1: an unreadable button label. So `onPrimary` is carried per
 * accent, chosen as whichever of ink or white is more readable on that fill.
 * Ember keeps the ink at 4.75:1; Plum, Pine and Indigo take white in light.
 *
 * ---------------------------------------------------------------------------
 * Each value is contrast-corrected per scheme, not shared between them
 * ---------------------------------------------------------------------------
 * A fill carries information here — the meter on the stock card, the trend line
 * on the dashboard — so it is held to the 3:1 of WCAG 1.4.11 against the surface
 * it actually sits on, exactly as `ember500` is.
 *
 * Two swatches cannot meet that with one value. **Plum** is the extreme case:
 * `#4A1D70` is 12.35:1 on a white card and **1.72:1** on the near-black field —
 * a purple button on a purple-black screen. Its dark variant is lifted well
 * toward lilac and lands somewhere that is no longer the mark in any meaningful
 * sense, which is the honest consequence of offering the mark as a *fill*.
 * **Pine**, **Indigo** and **Violet** each lighten a step in dark for the same
 * reason, at less cost. **Ember** holds one value across both schemes.
 *
 * ---------------------------------------------------------------------------
 * A press moves *away* from its label
 * ---------------------------------------------------------------------------
 * The pressed step darkens where the label is white and lightens where the label
 * is ink, rather than always darkening. Always-darken is the habit, and on the
 * dark-scheme accents whose label is ink it drops that label to 2.8:1 for the
 * length of the press.
 *
 * There is no assertion on the pressed step, deliberately: it is a ~120ms
 * transient under `MBPressable`'s scale, not a state anything is read in. The
 * rule is here so the next swatch is picked the same way.
 *
 * `__tests__/contrast.test.ts` asserts all of this across every accent and both
 * schemes, so a new swatch cannot be added without meeting the same bars.
 */

export type AccentKey = 'ember' | 'plum' | 'emerald' | 'indigo' | 'violet';

/** The fill group an accent replaces. */
export interface AccentColors {
  primary: string;
  primaryPressed: string;
  /** Ink or white — whichever is readable on this fill. See the note above. */
  onPrimary: string;
}

export interface Accent {
  key: AccentKey;
  /** Shown in Settings. v6 names the default "Ember". */
  label: string;
  /**
   * The circle drawn in the swatch row.
   *
   * v6's own hex, NOT the corrected `primary` below — the swatch is a brand
   * choice being offered, and showing a value 9% off the one the user is picking
   * would make the row disagree with itself. Nothing is ever set in this colour;
   * it is a 32px circle with no text on it, so 1.4.11 does not apply.
   */
  swatch: string;
  light: AccentColors;
  dark: AccentColors;
}

/** v6's ink — the purple one. Not v4's `#3E1B00`. */
const INK = '#2E1440';
const WHITE = '#FFFFFF';

export const ACCENTS: Record<AccentKey, Accent> = {
  ember: {
    key: 'ember',
    label: 'Ember',
    swatch: '#FB6D34',
    /*
     * The default, and v6's own default accent.
     *
     * `#E4632F` is v6's `#FB6D34` walked down 9% to clear 3:1 on the lilac wash,
     * where the raw hex is 2.54:1. Note this is a deeper walk than v4 needed:
     * the old `#EC6631`, tuned against the cream field, is only 2.86:1 here.
     *
     * The pressed step darkens even though the label is ink, which is the one
     * standing exception to the rule above — it keeps the pair consistent with
     * `ember500`/`ember600` in the palette, and the label holds at 4.03:1.
     */
    light: { primary: '#E4632F', primaryPressed: '#CE5829', onPrimary: INK },
    dark: { primary: '#E4632F', primaryPressed: '#CE5829', onPrimary: INK },
  },
  plum: {
    key: 'plum',
    label: 'Plum',
    swatch: '#4A1D70',
    // The mark, offered as a fill. 12.35:1 on a card — identical to the mark's
    // own figure, which is what keeps the accent-vs-fill ordering an equality.
    light: { primary: '#4A1D70', primaryPressed: '#3C1759', onPrimary: WHITE },
    // 1.72:1 on the dark field, so lifted to a mid-lilac at 5.12:1. The label
    // flips to ink with it, at 4.92:1 where white would be 3.31:1.
    dark: { primary: '#A87ACF', primaryPressed: '#B389D6', onPrimary: INK },
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
