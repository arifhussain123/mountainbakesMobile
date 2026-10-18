/**
 * Pure sizing math for the notch tab bar — kept separate from `NotchTabBar.tsx`
 * so it's testable without rendering anything and so every number the bar
 * uses (and `useTabBarHeight`, which screens use for their own bottom
 * padding) comes from one place instead of being duplicated/hand-copied.
 *
 * Driven entirely by `useWindowDimensions()`'s width at the call site, never
 * a hard-coded screen size and never a `View.onLayout` value (which starts at
 * 0 on mount and only updates after the first paint) — see `NotchTabBar.tsx`'s
 * own notes on why that onLayout timing was one of this bar's real bugs.
 */

/** Icons/labels live in this top slice of the bar; the rest of the bar's total height is just background under the device's safe-area inset. */
export const BAR_CONTENT_HEIGHT = 64;

/** Top-left/top-right corner radius. Bottom corners are always square — the bar sits flush with the screen's bottom edge. */
export const CORNER_RADIUS = 20;

/** How far above the bar's flat top edge the active bubble's *center* sits — most of the circle nests inside the notch; only a small cap pokes above the edge. */
export const BUBBLE_RAISE = 6;

export function clamp(min: number, value: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * How far to slide the bar+bubble container down so it's fully off-screen
 * when hidden. Must clear the bubble's own upward extent (`BUBBLE_RAISE +
 * bubbleSize/2` above the container's top edge), not just the bar's own
 * height — a flat `totalBarHeight + 24` left the bubble peeking above the
 * screen's bottom edge whenever `bubbleSize` exceeded 36 (it never doesn't:
 * `bubbleSize` is always >= 48), since BUBBLE_RAISE + bubbleSize/2 is then
 * always >= 30, more than that fixed 24dp margin.
 */
export function computeTabBarHideOffset(totalBarHeight: number, bubbleSize: number): number {
  return totalBarHeight + BUBBLE_RAISE + bubbleSize / 2 + 8;
}

export interface TabBarLayout {
  tabWidth: number;
  bubbleSize: number;
  iconSize: number;
  notchWidth: number;
  notchDepth: number;
}

/** `tabCount` is the shell's `tabItems.length`, not a hard-coded 5, so this stays correct if a tab is ever added/removed. */
export function getTabBarLayout(width: number, tabCount: number): TabBarLayout {
  const tabWidth = width / tabCount;
  const bubbleSize = clamp(48, width * 0.14, 60);
  return {
    tabWidth,
    bubbleSize,
    iconSize: bubbleSize * 0.42,
    notchWidth: bubbleSize + 28,
    notchDepth: bubbleSize * 0.55,
  };
}
