/**
 * Corner radii, set to the v4 design.
 *
 * The one place that decides how round this app is. The values are deliberately
 * generous — soft corners are most of what makes a dense operations screen read
 * as "bakery" rather than "spreadsheet" — and v4 pushes them further than the
 * scale that preceded it: its chips are 10 where they were 8, its stat tiles 18,
 * and its floating navigation bar 22.
 *
 * Nothing in the app should use a literal radius. `pill` is what a fully-rounded
 * chip, badge or FAB asks for, rather than someone computing `height / 2` at the
 * call site.
 *
 * The names are unchanged from the previous scale on purpose: every call site
 * keeps working and simply moves to the v4 value. Only `icon` and `xxl` are new.
 */
export const radius = {
  none: 0,
  /**
   * The smallest curve in the app: the top of a chart column, a legend swatch,
   * a segment of a stacked bar. v4 draws these at 3–5.
   *
   * Deliberately far below `sm`. A chart column rounded to 10 loses most of its
   * top edge, and the eye reads the shortest columns as shorter than they are —
   * which is the one thing a bar chart must not do.
   */
  xs: 5,
  /** A filter chip or a small button. v4: 10. */
  sm: 10,
  /**
   * The tinted square behind a glyph — a stat tile's leading icon, a list row's
   * thumbnail. v4 draws these at 9–11 depending on the glyph's size; 11 is the
   * 36px case, which is the common one.
   */
  icon: 11,
  /** A text field, a select, a small card. v4: 13–14. */
  md: 14,
  /** A list card — an order, an expense, a return. v4: 16. */
  lg: 16,
  /** A stat tile, and the chart card beside it. v4: 18. */
  xl: 18,
  /** The floating navigation bar. v4: 22. */
  xxl: 22,
  pill: 999,
} as const;

export type Radius = keyof typeof radius;
