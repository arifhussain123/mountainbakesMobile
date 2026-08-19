/**
 * Icon sizes, by the role the icon plays — never by a literal at the call site.
 *
 * Lucide takes `size` as a number of density-independent pixels and draws on a
 * 24-unit grid, so 24 is the size where strokes land exactly on the pixel grid
 * and anything else is a scale. That is why `tab` and `header` — the two places
 * an icon carries meaning on its own — are 24, and the smaller sizes are only
 * used where a label sits beside the icon and carries the meaning instead.
 */
export const iconSize = {
  /** Bottom tab bar. Meaning-bearing, so full grid size. */
  tab: 24,
  /** Account drawer rows. One step down: the label is always present. */
  drawer: 22,
  /** Header leading/trailing actions. */
  header: 24,
  /** Inline actions inside rows, chips, and buttons. */
  action: 20,
  /** The icon on a stat card, which is decorative next to the number. */
  statCard: 32,
  /** Empty-state illustration glyph. */
  emptyState: 56,
} as const;

/**
 * Stroke weights for the two tab states.
 *
 * Lucide is a single outline family with no filled variants. Rather than pull in
 * a second icon set to get a filled active state — which would mean two drawing
 * styles in one bar — the active state is expressed as a heavier stroke plus the
 * primary colour plus a pill behind it. Three signals, one family.
 */
export const iconStroke = {
  active: 2.25,
  inactive: 1.75,
  /** Default for non-tab icons. */
  regular: 2,
} as const;

export type IconSize = keyof typeof iconSize;
