/**
 * Pure sizing math for the Drawer — kept separate from the components so the
 * "does everything fit without scrolling" arithmetic is testable without
 * rendering anything, and so every component that needs a number (the
 * content's own row-height calc, `DrawerNavigator`'s `drawerStyle` width)
 * reads it from one place instead of a hand-copied literal.
 *
 * Every size below is a LOGO/AVATAR/FONT constant the header/branch
 * strip/footer components also import and build their own styles from —
 * never duplicated as a bare number in a component file — so the exact
 * fixed heights used in `computeAvailableRowSpace`'s subtraction always
 * match what those components actually render (the brief's "use measured
 * heights … or fixed constants matching the styles" — the latter, made exact
 * by sharing the constant instead of copying its value).
 */

export function clamp(min: number, value: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** `clamp(272, windowWidth * 0.78, 320)`. */
export function getDrawerWidth(windowWidth: number): number {
  return clamp(272, windowWidth * 0.78, 320);
}

// ─── Header ──────────────────────────────────────────────────────────────
export const HEADER_LOGO_SIZE = 40;
export const HEADER_PADDING_VERTICAL = 12;
export const HEADER_NAME_FONT_SIZE = 17;
export const HEADER_ROLE_FONT_SIZE = 12;
/** Logo height dominates the row (40 ≥ the two stacked text lines), so this is just `paddingVertical * 2 + logo size` — not a measured/guessed number. */
export const HEADER_HEIGHT = HEADER_PADDING_VERTICAL * 2 + HEADER_LOGO_SIZE;

// ─── Branch strip ────────────────────────────────────────────────────────
export const BRANCH_STRIP_HEIGHT = 40;
export const BRANCH_STRIP_FONT_SIZE = 14;

// ─── Footer ──────────────────────────────────────────────────────────────
export const FOOTER_AVATAR_SIZE = 32;
export const FOOTER_NAME_FONT_SIZE = 14;
export const FOOTER_EMAIL_FONT_SIZE = 12;
export const FOOTER_SYNC_FONT_SIZE = 11;
export const FOOTER_ROW_HEIGHT = 36;
export const FOOTER_PADDING_TOP = 10;
export const FOOTER_PADDING_BOTTOM = 8;
export const FOOTER_ROW_TO_SYNC_GAP = 8;
/** `paddingTop + row + gap + sync-line height (11sp * 1.25) + paddingBottom` — `insets.bottom` is added on top of this separately, never folded in, since it's a safe-area inset, not a drawer-content measurement. */
export const FOOTER_HEIGHT = Math.round(
  FOOTER_PADDING_TOP + FOOTER_ROW_HEIGHT + FOOTER_ROW_TO_SYNC_GAP + FOOTER_SYNC_FONT_SIZE * 1.25 + FOOTER_PADDING_BOTTOM,
);

// ─── Item rows ───────────────────────────────────────────────────────────
export const ROW_MIN_HEIGHT = 40;
export const ROW_MAX_HEIGHT = 52;
export const ROW_HORIZONTAL_PADDING = 16;
export const ROW_ICON_LABEL_GAP = 14;
export const ROW_ICON_MIN = 18;
export const ROW_ICON_MAX = 22;
export const ROW_FONT_MIN = 14;
export const ROW_FONT_MAX = 16;
/** System font scale is respected but capped here so a long label ("Daily Sale Record") can't wrap at 1.3x+ scale. */
export const ROW_LABEL_MAX_FONT_SCALE = 1.2;

export interface DrawerRowMetrics {
  rowHeight: number;
  iconSize: number;
  fontSize: number;
  lineHeight: number;
  /** True once `rowHeight` has hit the 40dp floor — the caller's cue to let the item list scroll instead of continuing to shrink below a usable touch target. */
  needsScroll: boolean;
}

/**
 * `available = windowHeight - insets.top - insets.bottom - headerHeight -
 * branchHeight - footerHeight`, then `rowHeight = clamp(40, available /
 * itemCount, 52)` and the icon/font sizes derived from it.
 */
export function computeDrawerRowMetrics(windowHeight: number, insetTop: number, insetBottom: number, itemCount: number): DrawerRowMetrics {
  const available = windowHeight - insetTop - insetBottom - HEADER_HEIGHT - BRANCH_STRIP_HEIGHT - FOOTER_HEIGHT;
  const perItem = itemCount > 0 ? available / itemCount : ROW_MAX_HEIGHT;
  const rowHeight = clamp(ROW_MIN_HEIGHT, perItem, ROW_MAX_HEIGHT);
  const iconSize = clamp(ROW_ICON_MIN, rowHeight * 0.42, ROW_ICON_MAX);
  const fontSize = clamp(ROW_FONT_MIN, rowHeight * 0.34, ROW_FONT_MAX);
  return {
    rowHeight,
    iconSize,
    fontSize,
    lineHeight: fontSize * 1.25,
    needsScroll: perItem < ROW_MIN_HEIGHT,
  };
}
