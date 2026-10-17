/**
 * Pure sizing/math for the "3D slide-back" drawer — kept separate from the
 * components so it's testable without rendering anything.
 *
 * Unlike the previous pill/divider drawer, row sizes here are FIXED (the
 * brief specifies them literally: 52dp rows, 40dp tiles), not computed to
 * shrink-to-fit — the item list scrolls in its own area instead (see
 * `DrawerContent`), so there's no clamp arithmetic left to test beyond the
 * screen-card transform itself.
 */

export function clamp(min: number, value: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

// ─── Header ──────────────────────────────────────────────────────────────
export const HEADER_LOGO_SIZE = 56;
export const HEADER_TITLE_FONT_SIZE = 22;
export const HEADER_ROLE_FONT_SIZE = 12;
export const BRANCH_LINE_FONT_SIZE = 14;

// ─── Menu content ────────────────────────────────────────────────────────
/** The menu's background (glow + watermark) fills the whole screen, but its header/items/footer never run wider than this — otherwise a long label would sit under the tilted, part-opaque screen card. */
export const MENU_CONTENT_WIDTH_RATIO = 0.66;
export const MENU_CONTENT_HORIZONTAL_PADDING = 20;

// ─── Item rows (icon-tile style) ────────────────────────────────────────
export const ROW_HEIGHT = 52;
export const ROW_TILE_SIZE = 40;
export const ROW_TILE_RADIUS = 12;
export const ROW_ICON_SIZE = 20;
export const ROW_LABEL_FONT_SIZE = 16;
export const ROW_ICON_LABEL_GAP = 16;
export const SECTION_LABEL_FONT_SIZE = 11;

// ─── Footer (profile card) ───────────────────────────────────────────────
export const FOOTER_AVATAR_SIZE = 48;
export const FOOTER_NAME_FONT_SIZE = 15;
export const FOOTER_SUBTEXT_FONT_SIZE = 12;
export const FOOTER_SYNC_FONT_SIZE = 11;
export const FOOTER_PADDING_VERTICAL = 14;

// ─── Screen card transform (the open/close "3D slide-back" effect) ───────
/** Fraction of screen width the card slides right by, fully open. */
export const CARD_TRANSLATE_X_RATIO = 0.68;
/** Fully-open scale (1 = closed/full size). */
export const CARD_SCALE_OPEN = 0.82;
/** Fully-open Y-axis tilt, degrees (negative = top tilts away from the viewer). */
export const CARD_ROTATE_Y_DEG = -12;
export const CARD_BORDER_RADIUS = 28;
export const CARD_PERSPECTIVE = 1000;
/** Blur/tint fully-open opacity — same progress-driven fade as the transform. */
export const CARD_BLUR_AMOUNT = 8;

export interface CardTransform {
  translateX: number;
  scale: number;
  rotateYDeg: number;
  borderRadius: number;
  blurOpacity: number;
}

/**
 * `progress` is the drawer's own 0 (closed) → 1 (open) value. `reduceMotion`
 * collapses this to the brief's required fallback: a plain horizontal slide
 * (half the usual distance — the card never fully leaves the screen's right
 * portion, since there's no scale/tilt shrinking it) with no rotation and no
 * blur, just the progress-driven dark tint every mode already has.
 */
export function computeCardTransform(progress: number, screenWidth: number, reduceMotion: boolean): CardTransform {
  'worklet';
  const p = clamp(0, progress, 1);
  if (reduceMotion) {
    return { translateX: screenWidth * CARD_TRANSLATE_X_RATIO * 0.5 * p, scale: 1, rotateYDeg: 0, borderRadius: 0, blurOpacity: 0 };
  }
  return {
    translateX: screenWidth * CARD_TRANSLATE_X_RATIO * p,
    scale: 1 - (1 - CARD_SCALE_OPEN) * p,
    rotateYDeg: CARD_ROTATE_Y_DEG * p,
    borderRadius: CARD_BORDER_RADIUS * p,
    blurOpacity: p,
  };
}
