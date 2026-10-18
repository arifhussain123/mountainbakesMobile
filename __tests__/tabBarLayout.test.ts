/**
 * @format
 */
import {
  clamp,
  getTabBarLayout,
  computeTabBarHideOffset,
  BAR_CONTENT_HEIGHT,
  CORNER_RADIUS,
  BUBBLE_RAISE,
} from '@/navigation/tabBar/tabBarLayout';
import { buildNotchBarPath, clampNotchX } from '@/navigation/tabBar/notchPath';

const TAB_COUNT = 5;

// The five device widths the task calls out: small Android, Samsung S-series,
// Pixel, iPhone SE, and a 6.1" iPhone.
const WIDTHS = [360, 393, 412, 375, 390];

describe('clamp', () => {
  it('passes a value already inside the range through untouched', () => {
    expect(clamp(48, 55, 60)).toBe(55);
  });

  it('floors to the minimum', () => {
    expect(clamp(48, 10, 60)).toBe(48);
  });

  it('ceils to the maximum', () => {
    expect(clamp(48, 1000, 60)).toBe(60);
  });
});

describe('getTabBarLayout', () => {
  it.each(WIDTHS)('divides width %dpx evenly across all 5 tabs', (width) => {
    const { tabWidth } = getTabBarLayout(width, TAB_COUNT);
    expect(tabWidth).toBeCloseTo(width / TAB_COUNT);
  });

  it.each(WIDTHS)('keeps bubbleSize clamped to [48, 60] at %dpx', (width) => {
    const { bubbleSize } = getTabBarLayout(width, TAB_COUNT);
    expect(bubbleSize).toBeGreaterThanOrEqual(48);
    expect(bubbleSize).toBeLessThanOrEqual(60);
  });

  it('clamps bubbleSize to the 48 floor on a narrow phone (360px * 0.14 = 50.4, still within range)', () => {
    // A width where 14% would fall BELOW 48 if the floor didn't apply.
    const { bubbleSize } = getTabBarLayout(300, TAB_COUNT);
    expect(bubbleSize).toBe(48);
  });

  it('clamps bubbleSize to the 60 ceiling on a tablet-wide bar', () => {
    const { bubbleSize } = getTabBarLayout(900, TAB_COUNT);
    expect(bubbleSize).toBe(60);
  });

  it.each(WIDTHS)('derives iconSize as exactly 42%% of bubbleSize at %dpx', (width) => {
    const { bubbleSize, iconSize } = getTabBarLayout(width, TAB_COUNT);
    expect(iconSize).toBeCloseTo(bubbleSize * 0.42);
  });

  it.each(WIDTHS)('derives notchWidth as bubbleSize + 28 and notchDepth as 55%% of bubbleSize at %dpx', (width) => {
    const { bubbleSize, notchWidth, notchDepth } = getTabBarLayout(width, TAB_COUNT);
    expect(notchWidth).toBe(bubbleSize + 28);
    expect(notchDepth).toBeCloseTo(bubbleSize * 0.55);
  });
});

describe('notch clamping at every tab position, for each required device width', () => {
  it.each(WIDTHS)('keeps every one of the 5 tabs — including first and last — clear of the rounded corners at %dpx', (width) => {
    const { tabWidth, notchWidth } = getTabBarLayout(width, TAB_COUNT);
    for (let index = 0; index < TAB_COUNT; index += 1) {
      const target = tabWidth * (index + 0.5);
      const clamped = clampNotchX(target, width, notchWidth, CORNER_RADIUS);
      // Never past the corner radius on either edge.
      expect(clamped).toBeGreaterThanOrEqual(CORNER_RADIUS + notchWidth / 2);
      expect(clamped).toBeLessThanOrEqual(width - CORNER_RADIUS - notchWidth / 2);
      // The resulting path is still well-formed (closed, flush to the given height).
      const height = BAR_CONTENT_HEIGHT + 24;
      const d = buildNotchBarPath({ width, height, notchX: target, notchWidth, notchDepth: 1, cornerRadius: CORNER_RADIUS });
      expect(d.trim().endsWith('Z')).toBe(true);
      expect(d).toContain(`L ${width} ${height}`);
    }
  });

  it.each(WIDTHS)('first tab (index 0) clamps to the left, last tab clamps to the right at %dpx', (width) => {
    const { tabWidth, notchWidth } = getTabBarLayout(width, TAB_COUNT);
    const first = clampNotchX(tabWidth * 0.5, width, notchWidth, CORNER_RADIUS);
    const last = clampNotchX(tabWidth * (TAB_COUNT - 0.5), width, notchWidth, CORNER_RADIUS);
    expect(first).toBe(CORNER_RADIUS + notchWidth / 2);
    expect(last).toBe(width - CORNER_RADIUS - notchWidth / 2);
  });
});

describe('exported constants used by useTabBarHeight and the bar itself', () => {
  it('matches the spec values', () => {
    expect(BAR_CONTENT_HEIGHT).toBe(64);
    expect(CORNER_RADIUS).toBe(20);
    expect(BUBBLE_RAISE).toBe(6);
  });
});

describe('computeTabBarHideOffset', () => {
  it.each(WIDTHS)('fully clears the active bubble\'s own extent above the bar at %dpx (regression: a flat +24 did not)', (width) => {
    const totalBarHeight = BAR_CONTENT_HEIGHT + 24;
    const { bubbleSize } = getTabBarLayout(width, TAB_COUNT);
    const offset = computeTabBarHideOffset(totalBarHeight, bubbleSize);
    // The bubble's top edge sits (BUBBLE_RAISE + bubbleSize/2) above the bar
    // container's own top edge — the hide offset must exceed that, or the
    // bubble's tip still peeks above the screen's bottom edge once hidden.
    expect(offset).toBeGreaterThan(BUBBLE_RAISE + bubbleSize / 2);
  });

  it('is exactly totalBarHeight + BUBBLE_RAISE + bubbleSize/2 + 8', () => {
    expect(computeTabBarHideOffset(88, 60)).toBe(88 + BUBBLE_RAISE + 30 + 8);
  });

  it('a bigger bubble needs a bigger hide offset', () => {
    expect(computeTabBarHideOffset(88, 60)).toBeGreaterThan(computeTabBarHideOffset(88, 48));
  });
});
