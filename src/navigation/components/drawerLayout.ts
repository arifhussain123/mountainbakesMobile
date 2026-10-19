/**
 * Pure sizing math for the drawer — kept separate from the components so the
 * "does everything fit without scrolling" arithmetic is testable without
 * rendering anything.
 *
 * The header/branch strip/footer components build their styles from the same
 * constants used in `computeDrawerRowMetrics`'s subtraction, so the fixed
 * heights subtracted there always match what those components render.
 * `insets.top`/`insets.bottom` are added by the components on top of these
 * heights, never folded into them.
 */

export function clamp(min: number, value: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** `Math.min(windowWidth * 0.78, 300)` — recomputed on every render, so rotation updates it. */
export function getDrawerWidth(windowWidth: number): number {
  return Math.min(windowWidth * 0.78, 300);
}

// ─── Header ──────────────────────────────────────────────────────────────
export const HEADER_LOGO_SIZE = 44;
export const HEADER_PADDING_VERTICAL = 12;
export const HEADER_TITLE_FONT_SIZE = 17;
export const HEADER_ROLE_FONT_SIZE = 13;
/** The logo is taller than the two stacked text lines, so the row is `padding * 2 + logo`. */
export const HEADER_HEIGHT = HEADER_PADDING_VERTICAL * 2 + HEADER_LOGO_SIZE;

// ─── Branch strip ────────────────────────────────────────────────────────
export const BRANCH_STRIP_HEIGHT = 40;
export const BRANCH_STRIP_FONT_SIZE = 14;

// ─── Footer ──────────────────────────────────────────────────────────────
export const FOOTER_NAME_FONT_SIZE = 14;
export const FOOTER_EMAIL_FONT_SIZE = 12;
export const FOOTER_SYNC_FONT_SIZE = 11;
export const FOOTER_SYNC_LINE_HEIGHT = 14;
export const FOOTER_ROW_HEIGHT = 36;
export const FOOTER_BUTTON_SIZE = 36;
export const FOOTER_PADDING_TOP = 10;
export const FOOTER_PADDING_BOTTOM = 8;
export const FOOTER_ROW_TO_SYNC_GAP = 6;
export const FOOTER_HEIGHT = FOOTER_PADDING_TOP + FOOTER_ROW_HEIGHT + FOOTER_ROW_TO_SYNC_GAP + FOOTER_SYNC_LINE_HEIGHT + FOOTER_PADDING_BOTTOM;
/** Below this drawer width the Sign out button is icon-only. */
export const FOOTER_SIGN_OUT_LABEL_MIN_WIDTH = 296;

// ─── Item rows ───────────────────────────────────────────────────────────
export const ROW_MIN_HEIGHT = 40;
export const ROW_MAX_HEIGHT = 52;
export const ROW_HORIZONTAL_PADDING = 16;
export const ROW_ICON_LABEL_GAP = 14;
export const ROW_ICON_MIN = 18;
export const ROW_ICON_MAX = 22;
export const ROW_FONT_MIN = 14;
export const ROW_FONT_MAX = 16;
export const ROW_CHEVRON_SIZE = 16;
export const ROW_ACTIVE_BAR_WIDTH = 3;
/** System font scale is respected but capped here so a long label can't wrap or outgrow its row. */
export const ROW_LABEL_MAX_FONT_SCALE = 1.2;

// ─── Section labels ──────────────────────────────────────────────────────
export const SECTION_LABEL_FONT_SIZE = 11;
export const SECTION_LABEL_LINE_HEIGHT = 14;
export const SECTION_LABEL_MARGIN_TOP = 10;
export const SECTION_LABEL_MARGIN_BOTTOM = 4;
export const SECTION_LABEL_HEIGHT = SECTION_LABEL_MARGIN_TOP + SECTION_LABEL_LINE_HEIGHT + SECTION_LABEL_MARGIN_BOTTOM;

export interface DrawerRowMetrics {
  rowHeight: number;
  iconSize: number;
  fontSize: number;
  lineHeight: number;
  /** Labels are shown only when every row still gets at least `ROW_MIN_HEIGHT` with them in place. */
  showSectionLabels: boolean;
  /** True once rows would have to drop below `ROW_MIN_HEIGHT` — the cue to scroll the item list instead. */
  needsScroll: boolean;
}

/** Space left for the item list once the header, branch strip, footer and both safe-area insets are taken out. */
export function computeAvailableListHeight(windowHeight: number, insetTop: number, insetBottom: number): number {
  return windowHeight - insetTop - insetBottom - HEADER_HEIGHT - BRANCH_STRIP_HEIGHT - FOOTER_HEIGHT;
}

/**
 * `rowHeight = clamp(40, available / itemCount, 52)`, with the icon and font
 * sizes derived from it. `available` is the list area's height — measured by
 * `DrawerMenu` once laid out, `computeAvailableListHeight` before that.
 * Section labels (`sectionCount` of them) are kept only if the rows still
 * reach 40dp after paying for the labels' height; otherwise they're dropped
 * and the rows get the whole list area.
 */
export function computeDrawerRowMetrics(available: number, itemCount: number, sectionCount = 0): DrawerRowMetrics {
  const count = Math.max(itemCount, 1);
  const withLabels = (available - sectionCount * SECTION_LABEL_HEIGHT) / count;
  const showSectionLabels = sectionCount > 0 && withLabels >= ROW_MIN_HEIGHT;
  const perItem = showSectionLabels ? withLabels : available / count;
  const rowHeight = clamp(ROW_MIN_HEIGHT, perItem, ROW_MAX_HEIGHT);
  const iconSize = clamp(ROW_ICON_MIN, rowHeight * 0.42, ROW_ICON_MAX);
  const fontSize = clamp(ROW_FONT_MIN, rowHeight * 0.34, ROW_FONT_MAX);
  return {
    rowHeight,
    iconSize,
    fontSize,
    lineHeight: fontSize * 1.2,
    showSectionLabels,
    needsScroll: perItem < ROW_MIN_HEIGHT,
  };
}

/** How many section labels a grouped list renders: one at each change of group (a group that comes back later gets a second label). */
export function countSections(groups: readonly string[]): number {
  return groups.filter((group, i) => i === 0 || group !== groups[i - 1]).length;
}

// ─── Collapsible sections (Super Admin) ─────────────────────────────────
export const COLLAPSIBLE_ROW_MAX_HEIGHT = 50;
/** A section header costs this fraction of a row in the height budget. */
export const SECTION_HEADER_ROW_FRACTION = 0.6;
export const SECTION_HEADER_MIN_HEIGHT = 28;
/** The "Go to…" field: a 44dp search bar plus 4dp below. */
export const SEARCH_FIELD_HEIGHT = 48;
/** Menus longer than this get the "Go to…" field. */
export const SEARCH_MIN_ITEMS = 15;

export interface CollapsibleRowMetrics extends Omit<DrawerRowMetrics, 'showSectionLabels'> {
  headerHeight: number;
}

/**
 * `rowHeight = clamp(40, available / (rows + 0.6 × headers), 50)` for the
 * rows currently visible. Headers get 0.6 of a row, never under 28dp. Past the
 * 40dp floor the list scrolls.
 */
export function computeCollapsibleRowMetrics(available: number, visibleRows: number, headerCount: number): CollapsibleRowMetrics {
  const units = Math.max(visibleRows + headerCount * SECTION_HEADER_ROW_FRACTION, 1);
  const rowHeight = clamp(ROW_MIN_HEIGHT, available / units, COLLAPSIBLE_ROW_MAX_HEIGHT);
  const headerHeight = Math.max(SECTION_HEADER_MIN_HEIGHT, Math.round(rowHeight * SECTION_HEADER_ROW_FRACTION));
  const iconSize = clamp(ROW_ICON_MIN, rowHeight * 0.42, ROW_ICON_MAX);
  const fontSize = clamp(ROW_FONT_MIN, rowHeight * 0.34, ROW_FONT_MAX);
  return {
    rowHeight,
    headerHeight,
    iconSize,
    fontSize,
    lineHeight: fontSize * 1.2,
    needsScroll: visibleRows * rowHeight + headerCount * headerHeight > available + 0.5,
  };
}

/** Whether `visibleRows` under `headerCount` headers fit `available` at the 40dp floor — the test `expandSection` folds against. */
export function fitsAtMinimum(available: number, visibleRows: number, headerCount: number): boolean {
  return visibleRows * ROW_MIN_HEIGHT + headerCount * SECTION_HEADER_MIN_HEIGHT <= available;
}
