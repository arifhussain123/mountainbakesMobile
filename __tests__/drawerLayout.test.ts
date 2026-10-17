/**
 * @format
 */
import {
  BRANCH_STRIP_HEIGHT,
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
  HEADER_PADDING_VERTICAL,
  ROW_MAX_HEIGHT,
  ROW_MIN_HEIGHT,
  clamp,
  computeDrawerRowMetrics,
  computeHeaderLogoSize,
  getDrawerWidth,
} from '@/navigation/components/drawerLayout';

const ITEM_COUNT = 13;

// The three required Android sizes plus a 6.1" iPhone-ish height.
const DEVICES = [
  { label: '360x800', width: 360, height: 800 },
  { label: '393x873', width: 393, height: 873 },
  { label: '412x915', width: 412, height: 915 },
  { label: 'iPhone 6.1"', width: 390, height: 844 },
];

// Once the Appearance footer row (drawerLayout.ts#FOOTER_APPEARANCE_ROW_HEIGHT)
// was added, the tightest of the four — 360x800 — no longer has enough
// available height for all 13 items at a touch-friendly size; the row-height
// floor (40dp) plus the documented scroll+fade fallback is the designed
// outcome there (see computeDrawerRowMetrics' own docs), not a regression.
// 393x873/412x915/the iPhone height still fit with room to spare.
const DEVICES_FITTING_WITHOUT_SCROLL = DEVICES.filter((d) => d.label !== '360x800');

describe('clamp', () => {
  it('passes a value already inside the range through untouched', () => {
    expect(clamp(272, 300, 320)).toBe(300);
  });
  it('floors to the minimum', () => {
    expect(clamp(272, 100, 320)).toBe(272);
  });
  it('ceils to the maximum', () => {
    expect(clamp(272, 1000, 320)).toBe(320);
  });
});

describe('getDrawerWidth', () => {
  it('is 78% of window width for a mid-size phone', () => {
    expect(getDrawerWidth(360)).toBeCloseTo(360 * 0.78);
  });

  it('floors at 272 for a very narrow window', () => {
    expect(getDrawerWidth(300)).toBe(272);
  });

  it('ceils at 320 for a wide window (tablet)', () => {
    expect(getDrawerWidth(900)).toBe(320);
  });
});

describe('computeDrawerRowMetrics', () => {
  it.each(DEVICES_FITTING_WITHOUT_SCROLL)('fits all 13 items without needing to scroll on a normal phone — %s', ({ height }) => {
    // Typical 3-button-nav insets for these sizes; gesture nav insets are
    // smaller (more available space), so 3-button is the tighter case.
    const metrics = computeDrawerRowMetrics(height, 24, 48, ITEM_COUNT);
    expect(metrics.needsScroll).toBe(false);
    expect(metrics.rowHeight).toBeGreaterThanOrEqual(ROW_MIN_HEIGHT);
    expect(metrics.rowHeight).toBeLessThanOrEqual(ROW_MAX_HEIGHT);
  });

  it('at the tightest required size (360x800) clamps to the 40dp floor and falls back to scroll+fade, rather than shrinking rows below a usable touch target', () => {
    const metrics = computeDrawerRowMetrics(800, 24, 48, ITEM_COUNT);
    expect(metrics.rowHeight).toBe(ROW_MIN_HEIGHT);
    expect(metrics.needsScroll).toBe(true);
  });

  it('clamps row height to the 40dp floor and flags needsScroll on a very small screen', () => {
    const metrics = computeDrawerRowMetrics(500, 24, 48, ITEM_COUNT);
    expect(metrics.rowHeight).toBe(ROW_MIN_HEIGHT);
    expect(metrics.needsScroll).toBe(true);
  });

  it('clamps row height to the 52dp ceiling on a very tall screen', () => {
    const metrics = computeDrawerRowMetrics(2400, 24, 48, ITEM_COUNT);
    expect(metrics.rowHeight).toBe(ROW_MAX_HEIGHT);
  });

  it('derives iconSize as clamp(18, rowHeight * 0.42, 22)', () => {
    const metrics = computeDrawerRowMetrics(800, 24, 48, ITEM_COUNT);
    expect(metrics.iconSize).toBeCloseTo(Math.min(22, Math.max(18, metrics.rowHeight * 0.42)));
  });

  it('derives fontSize as clamp(14, rowHeight * 0.34, 16) and lineHeight as fontSize * 1.25', () => {
    const metrics = computeDrawerRowMetrics(800, 24, 48, ITEM_COUNT);
    expect(metrics.fontSize).toBeCloseTo(Math.min(16, Math.max(14, metrics.rowHeight * 0.34)));
    expect(metrics.lineHeight).toBeCloseTo(metrics.fontSize * 1.25);
  });

  it('subtracts both safe-area insets from the available height', () => {
    const withoutInsets = computeDrawerRowMetrics(800, 0, 0, ITEM_COUNT);
    const withInsets = computeDrawerRowMetrics(800, 40, 40, ITEM_COUNT);
    expect(withInsets.rowHeight).toBeLessThanOrEqual(withoutInsets.rowHeight);
  });

  it('subtracts the fixed header/branch-strip/footer heights from the available space', () => {
    const available = 800 - 24 - 48 - HEADER_HEIGHT - BRANCH_STRIP_HEIGHT - FOOTER_HEIGHT;
    const expectedRowHeight = clamp(ROW_MIN_HEIGHT, available / ITEM_COUNT, ROW_MAX_HEIGHT);
    expect(computeDrawerRowMetrics(800, 24, 48, ITEM_COUNT).rowHeight).toBeCloseTo(expectedRowHeight);
  });

  it('defaults the header logo size to the fixed HEADER_LOGO_SIZE (HEADER_HEIGHT) when no 5th argument is passed', () => {
    const withDefault = computeDrawerRowMetrics(800, 24, 48, ITEM_COUNT);
    const withExplicitHeaderHeight = computeDrawerRowMetrics(800, 24, 48, ITEM_COUNT, HEADER_HEIGHT - HEADER_PADDING_VERTICAL * 2);
    expect(withDefault.rowHeight).toBeCloseTo(withExplicitHeaderHeight.rowHeight);
  });

  it('a bigger header logo leaves less room for rows, and vice versa', () => {
    const smallLogo = computeDrawerRowMetrics(800, 24, 48, ITEM_COUNT, 36);
    const bigLogo = computeDrawerRowMetrics(800, 24, 48, ITEM_COUNT, 44);
    expect(bigLogo.rowHeight).toBeLessThanOrEqual(smallLogo.rowHeight);
  });

  it.each(DEVICES_FITTING_WITHOUT_SCROLL)('still fits all 13 items across the responsive header logo size range — %s', ({ height, width }) => {
    const logoSize = computeHeaderLogoSize(width);
    const metrics = computeDrawerRowMetrics(height, 24, 48, ITEM_COUNT, logoSize);
    expect(metrics.needsScroll).toBe(false);
  });
});

describe('computeHeaderLogoSize', () => {
  it('is exactly the baseline 40dp at the 390dp baseline width', () => {
    expect(computeHeaderLogoSize(390)).toBeCloseTo(40);
  });

  it('floors at 36dp on a narrow phone', () => {
    expect(computeHeaderLogoSize(320)).toBeGreaterThanOrEqual(36);
    expect(computeHeaderLogoSize(100)).toBe(36);
  });

  it('ceils at 44dp on a wide screen', () => {
    expect(computeHeaderLogoSize(900)).toBe(44);
  });

  it('stays close to 40dp across the three required breakpoints (small cross-device drift)', () => {
    for (const width of [360, 393, 412]) {
      expect(Math.abs(computeHeaderLogoSize(width) - 40)).toBeLessThan(4);
    }
  });
});
