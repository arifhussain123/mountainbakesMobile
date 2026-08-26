/**
 * Spacing scale. Every margin, padding and gap in the app comes from here.
 *
 * ---------------------------------------------------------------------------
 * Two ranges, and why the small one exists
 * ---------------------------------------------------------------------------
 * `xs`–`huge` is the 4pt **layout** scale: the distance between cards, rows,
 * sections, and the screen edge. That is the part a designer reasons about.
 *
 * `hair`, `tight` and `snug` are below it, on 2pt steps, and they exist because
 * the file used to claim "every margin/padding comes from here" while 35 gaps in
 * components were bare numbers. They were all the same three things — the gap
 * between a label and the value under it (2), between an icon and its text (6),
 * and the padding inside a pill (10) — and none had a token, so every author
 * reached for a literal. A scale with a hole in it does not get followed; it
 * gets worked around.
 *
 * These are for spacing **inside** one component, where the gap is optical
 * rather than structural. Reaching for `tight` between two cards is the misuse
 * to watch for.
 */
export const space = {
  /** Label to the value directly under it. Reads as one unit, not two. */
  hair: 2,
  xs: 4,
  /** Icon to its adjacent text. Closer than `sm` so the pair reads as one. */
  tight: 6,
  sm: 8,
  /** Padding inside a pill or chip, where `sm` looks cramped and `md` bloats it. */
  snug: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/**
 * Layout constants. `tapMin` is 48 rather than the iOS 44 minimum because branch
 * staff use this one-handed, at speed, often with flour on their hands.
 */
export const layout = {
  /**
   * The gutter down both sides of a screen. v4 draws every one of its nineteen
   * screens at 20, not the 16 this scale used to carry — the extra 4 on each
   * side is what keeps a two-up grid of stat tiles from touching the bezel.
   */
  screenPad: 20,
  cardPad: 16,
  /**
   * A stat tile's padding, which v4 sets tighter than a list card's — the tile
   * holds a glyph, a caption and a figure and would otherwise be mostly air.
   */
  tilePad: 14,
  rowMinH: 64,
  tapMin: 48,
  headerH: 56,
  tabH: 56,
  railH: 72,
  /** v4's field and its primary button are both 56 tall. */
  inputH: 56,
  btnH: { lg: 56, md: 44, sm: 36 },
  /**
   * The status dot — connection, sync state, order status. Four components drew
   * it as `{ width: 8, height: 8, borderRadius: 4 }`, which is both a repeated
   * literal and the `height / 2` that `radius.pill` exists to replace.
   */
  dotSize: 8,
  /**
   * A filter chip — the period selector, the status filter, the category row.
   * Seven screens drew it as a bare `height: 36`.
   *
   * Same caveat as `stepperSize`: 36 is under `tapMin`. A chip row is scanned
   * and tapped repeatedly, so this is the one worth revisiting first — either
   * raise it or give the row `hitSlop`.
   */
  chipH: 36,
  /**
   * A quantity stepper's − / + button, on the sale and new-order screens.
   *
   * **Below `tapMin` on purpose is not what this is** — 44 is what both screens
   * already drew, and it is the iOS minimum rather than this app's 48. It is a
   * token so the two screens cannot drift apart; whether to raise it to `tapMin`
   * or give it `hitSlop` is a live question, not a settled one.
   */
  stepperSize: 44,
  /**
   * Floating action button. 56 is the size a thumb finds without looking, and
   * `fabInset` keeps it clear of the screen edge on a curved display.
   *
   * **One 56 now, not two.** v4 drew this size twice — as a corner FAB and as a
   * centre action button notched into the navigation bar — and v5 removes the
   * second. The bar is five equal cells with nothing rising out of it, so the
   * `navFabRing` token that painted the cream band around that button is gone
   * rather than left behind naming a control the app no longer has.
   */
  fabSize: 56,
  fabInset: 16,
  /**
   * The floating navigation bar: a rounded card inset from all three edges
   * rather than a full-width strip pinned to the bottom.
   *
   * `navInset` is the gap to the screen edge on the left, right and bottom;
   * `navPillH` is the bar's own height. v5 draws it at **62** — four less than
   * v4's 66, which is what the removed notch was paying for. `tabH` above is no
   * longer the row inside it: the cells now fill the bar's own height, so the
   * glyph, the label and the active underline centre in one box.
   *
   * The bar floats, so content beneath it must be padded by
   * `navPillH + navInset` and not by `tabH`.
   */
  navInset: 16,
  navPillH: 62,
  /**
   * The one breakpoint, in **logical dp**, not pixels.
   *
   * 600 is where Android's own `sw600dp` bucket starts, which is the line every
   * Android tablet is already built around — a 7" tablet lands just above it and
   * the largest phone in portrait stays below. One breakpoint rather than a
   * ladder of five: this app has two layouts, a single column and a two-column
   * split, and a second breakpoint would only invite a third layout nobody
   * tests.
   *
   * Compared against **width**, so a phone in landscape counts as wide. That is
   * deliberate — a landscape phone has the same problem a tablet does, a
   * measure far too long to read comfortably.
   */
  tabletMin: 600,
  /**
   * Longest a column of text or form fields may get, whatever the screen.
   *
   * Roughly 70 characters at body size. Past that the eye loses the start of the
   * next line, and on a 10" tablet an unconstrained list stretches a row's label
   * and its value to opposite edges with a hand-span of dead space between —
   * which is the specific "stretched phone layout" that makes an app look
   * unported.
   */
  maxContentWidth: 640,
  /** Wider cap for two-column content, which is two measures side by side. */
  maxWideWidth: 1080,
} as const;

/**
 * Radius moved to `theme/radius.ts` and motion to `theme/motion.ts`.
 *
 * Motion was three bare durations here with a comment saying to respect Reduce
 * Motion before using them, and nothing did — nothing was animated. It now
 * carries the spring and timing curves as well, which is more than a spacing
 * file should own.
 */

export type Space = keyof typeof space;

/**
 * Ready-made content-column styles, for `contentContainerStyle` on a scroll
 * view or list.
 *
 * Plain objects rather than a hook because `StyleSheet.create` runs at module
 * scope, where no hook can. Neither depends on the colour scheme, and neither
 * depends on the current width — the cap simply exceeds a phone's screen, so on
 * a phone it does nothing and there is no `isWide ?` at the call site.
 *
 * Use `contentColumn` for one column of rows or text, `contentColumnWide` for
 * content that is genuinely two measures side by side (a dashboard's tiles).
 */
export const contentColumn = {
  width: '100%',
  alignSelf: 'center',
  maxWidth: layout.maxContentWidth,
} as const;

export const contentColumnWide = {
  width: '100%',
  alignSelf: 'center',
  maxWidth: layout.maxWideWidth,
} as const;
