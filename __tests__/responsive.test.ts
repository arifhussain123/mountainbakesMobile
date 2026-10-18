/**
 * @format
 */
import {
  BASE_HEIGHT,
  BASE_WIDTH,
  SCALE_BASE_HEIGHT,
  SCALE_BASE_WIDTH,
  clamp,
  computeResponsiveMetrics,
  computeScale,
  moderateScale,
  scaleByHeight,
  scaleByWidth,
} from '@/shared/theme/responsive';

// This task's own required coverage: 320x568 (iPhone SE), 360x800, 393x873
// (the Samsung this was reported on), 412x915, 430x932, and a 600dp-wide tablet.
const SCALE_SIZES: Array<{ width: number; height: number }> = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 393, height: 873 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 600, height: 960 },
];

// The task's required coverage: 320x640 (smallest supported Android), 360x800
// and 393x873 (the Samsung this was reported on), 412x915 and 430x932 (large
// Android/iPhone), and a 1024-tall tablet.
const SIZES: Array<{ width: number; height: number }> = [
  { width: 320, height: 640 },
  { width: 360, height: 800 },
  { width: 393, height: 873 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
];

describe('clamp', () => {
  it('passes a value already inside the range through untouched', () => {
    expect(clamp(96, 120, 168)).toBe(120);
  });

  it('floors to the minimum', () => {
    expect(clamp(96, 10, 168)).toBe(96);
  });

  it('ceils to the maximum', () => {
    expect(clamp(96, 500, 168)).toBe(168);
  });
});

describe('scaleByWidth / scaleByHeight', () => {
  it('returns the input unchanged at the baseline size', () => {
    expect(scaleByWidth(100, BASE_WIDTH)).toBe(100);
    expect(scaleByHeight(100, BASE_HEIGHT)).toBe(100);
  });

  it('scales down on a narrower/shorter device than baseline', () => {
    expect(scaleByWidth(100, 320)).toBeLessThan(100);
    expect(scaleByHeight(100, 600)).toBeLessThan(100);
  });

  it('scales up on a wider/taller device than baseline', () => {
    expect(scaleByWidth(100, 768)).toBeGreaterThan(100);
    expect(scaleByHeight(100, 1024)).toBeGreaterThan(100);
  });
});

describe('moderateScale', () => {
  it('returns the input unchanged at the baseline width', () => {
    expect(moderateScale(28, BASE_WIDTH)).toBe(28);
  });

  it('moves only halfway to the full linear scale by default', () => {
    const n = 28;
    const width = 320;
    const full = scaleByWidth(n, width);
    const moderate = moderateScale(n, width);
    // Halfway between `n` and the full linear scale, in either direction.
    expect(moderate).toBeCloseTo(n + (full - n) * 0.5);
    expect(Math.abs(moderate - n)).toBeLessThan(Math.abs(full - n));
  });

  it('factor 0 returns the input unchanged; factor 1 returns the full linear scale', () => {
    expect(moderateScale(28, 320, 0)).toBe(28);
    expect(moderateScale(28, 320, 1)).toBeCloseTo(scaleByWidth(28, 320));
  });
});

describe('computeResponsiveMetrics', () => {
  it.each(SIZES)('computes finite, positive sw/sh/ms at $widthx$heightpx', ({ width, height }) => {
    const m = computeResponsiveMetrics(width, height, 0, 0);
    for (const value of [m.sw(100), m.sh(100), m.ms(28)]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });

  it.each(SIZES)('subtracts insets from usableHeight at $widthx$heightpx', ({ width, height }) => {
    const insetTop = 44;
    const insetBottom = 34;
    const m = computeResponsiveMetrics(width, height, insetTop, insetBottom);
    expect(m.usableHeight).toBe(height - insetTop - insetBottom);
  });

  it('flags a short screen (320x640, no insets: usableHeight 640 < 700)', () => {
    const m = computeResponsiveMetrics(320, 640, 0, 0);
    expect(m.isShort).toBe(true);
  });

  it('does not flag 393x873 as short even with realistic insets (usableHeight 873-24-34=815 >= 700)', () => {
    const m = computeResponsiveMetrics(393, 873, 24, 34);
    expect(m.isShort).toBe(false);
  });

  it('flags a screen as short once insets push usableHeight under the threshold', () => {
    const shortBecauseOfInsets = computeResponsiveMetrics(390, 750, 44, 34);
    expect(shortBecauseOfInsets.usableHeight).toBeLessThan(700);
    expect(shortBecauseOfInsets.isShort).toBe(true);
  });

  it('does not flag any phone width (<=430) as a tablet', () => {
    for (const { width, height } of SIZES.filter((s) => s.width <= 430)) {
      expect(computeResponsiveMetrics(width, height, 0, 0).isTablet).toBe(false);
    }
  });

  it('flags 768px as a tablet', () => {
    expect(computeResponsiveMetrics(768, 1024, 0, 0).isTablet).toBe(true);
  });

  it('contentWidth matches device width on phones (untouched, not capped)', () => {
    const m = computeResponsiveMetrics(393, 873, 0, 0);
    expect(m.contentWidth()).toBe(393);
    expect(m.contentWidth(420)).toBe(393);
  });

  it('contentWidth caps to the given max on a tablet, never exceeding device width', () => {
    const m = computeResponsiveMetrics(768, 1024, 0, 0);
    expect(m.contentWidth(480)).toBe(480);
    expect(m.contentWidth(420)).toBe(420);
  });

  it('contentWidth never exceeds device width even if max is larger (e.g. a 600px tablet border case)', () => {
    const m = computeResponsiveMetrics(600, 960, 0, 0);
    expect(m.contentWidth(480)).toBeLessThanOrEqual(600);
  });
});

describe('computeScale', () => {
  it('is exactly 1 at the 393x852 reference size', () => {
    expect(computeScale(SCALE_BASE_WIDTH, SCALE_BASE_HEIGHT)).toBeCloseTo(1);
  });

  it('is the smaller of the width ratio and the usable-height ratio (never stretches past either dimension)', () => {
    // Wide and short — height ratio should win.
    expect(computeScale(900, 400)).toBeCloseTo(400 / SCALE_BASE_HEIGHT);
    // Narrow and tall — width ratio should win.
    expect(computeScale(200, 2000)).toBeCloseTo(200 / SCALE_BASE_WIDTH);
  });

  it.each(SCALE_SIZES)('is finite and positive at $widthx$heightpx', ({ width, height }) => {
    const scale = computeScale(width, height);
    expect(Number.isFinite(scale)).toBe(true);
    expect(scale).toBeGreaterThan(0);
  });
});

describe('useResponsive() metrics — scale/size', () => {
  it('exposes scale computed the same way as computeScale, given the same insets', () => {
    const m = computeResponsiveMetrics(SCALE_BASE_WIDTH, SCALE_BASE_HEIGHT, 0, 0);
    expect(m.scale).toBeCloseTo(computeScale(SCALE_BASE_WIDTH, SCALE_BASE_HEIGHT));
  });

  it('size(base, min, max) matches base*scale at the reference size (scale=1)', () => {
    const m = computeResponsiveMetrics(SCALE_BASE_WIDTH, SCALE_BASE_HEIGHT, 0, 0);
    expect(m.size(30, 24, 36)).toBeCloseTo(30);
  });

  it('size() floors at min and ceils at max', () => {
    const tiny = computeResponsiveMetrics(100, 200, 0, 0);
    expect(tiny.size(30, 24, 36)).toBe(24);
    const huge = computeResponsiveMetrics(2000, 3000, 0, 0);
    expect(huge.size(30, 24, 36)).toBe(36);
  });

  it.each(SCALE_SIZES)('size() stays within [min, max] at $widthx$heightpx', ({ width, height }) => {
    const m = computeResponsiveMetrics(width, height, 0, 0);
    const value = m.size(30, 24, 36);
    expect(value).toBeGreaterThanOrEqual(24);
    expect(value).toBeLessThanOrEqual(36);
  });
});
