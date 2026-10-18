/**
 * @format
 */
import {
  CARD_BORDER_RADIUS,
  CARD_ROTATE_Y_DEG,
  CARD_SCALE_OPEN,
  CARD_TRANSLATE_X_RATIO,
  ROW_HEIGHT,
  clamp,
  computeCardTransform,
  shouldShowSectionLabels,
} from '@/navigation/components/drawerLayout';

// The three required Android sizes plus a 6.1" iPhone-ish width.
const WIDTHS = [360, 393, 412, 390];

describe('clamp', () => {
  it('passes a value already inside the range through untouched', () => {
    expect(clamp(0, 0.5, 1)).toBe(0.5);
  });
  it('floors to the minimum', () => {
    expect(clamp(0, -1, 1)).toBe(0);
  });
  it('ceils to the maximum', () => {
    expect(clamp(0, 2, 1)).toBe(1);
  });
});

describe('computeCardTransform — full motion (reduceMotion = false)', () => {
  it('is a no-op at progress 0 (closed): no translate, full scale, no tilt, square corners', () => {
    for (const width of WIDTHS) {
      const t = computeCardTransform(0, width, false);
      expect(t.translateX).toBe(0);
      expect(t.scale).toBe(1);
      expect(t.rotateYDeg).toBeCloseTo(0); // `-12 * 0` is `-0`, not `0` — toBeCloseTo treats them as equal, toBe doesn't.
      expect(t.borderRadius).toBe(0);
      expect(t.blurOpacity).toBe(0);
    }
  });

  it('reaches the fully-open values at progress 1', () => {
    for (const width of WIDTHS) {
      const t = computeCardTransform(1, width, false);
      expect(t.translateX).toBeCloseTo(width * CARD_TRANSLATE_X_RATIO);
      expect(t.scale).toBeCloseTo(CARD_SCALE_OPEN);
      expect(t.rotateYDeg).toBeCloseTo(CARD_ROTATE_Y_DEG);
      expect(t.borderRadius).toBeCloseTo(CARD_BORDER_RADIUS);
      expect(t.blurOpacity).toBeCloseTo(1);
    }
  });

  it('interpolates linearly at a midpoint', () => {
    const width = 393;
    const t = computeCardTransform(0.5, width, false);
    expect(t.translateX).toBeCloseTo((width * CARD_TRANSLATE_X_RATIO) / 2);
    expect(t.scale).toBeCloseTo(1 - (1 - CARD_SCALE_OPEN) / 2);
    expect(t.rotateYDeg).toBeCloseTo(CARD_ROTATE_Y_DEG / 2);
    expect(t.borderRadius).toBeCloseTo(CARD_BORDER_RADIUS / 2);
    expect(t.blurOpacity).toBeCloseTo(0.5);
  });

  it('clamps progress values outside [0, 1]', () => {
    const width = 393;
    expect(computeCardTransform(-0.5, width, false)).toEqual(computeCardTransform(0, width, false));
    expect(computeCardTransform(1.5, width, false)).toEqual(computeCardTransform(1, width, false));
  });
});

describe('computeCardTransform — reduceMotion fallback', () => {
  it('never rotates, never scales, never blurs, at any progress', () => {
    for (const progress of [0, 0.3, 0.7, 1]) {
      const t = computeCardTransform(progress, 393, true);
      expect(t.rotateYDeg).toBe(0);
      expect(t.scale).toBe(1);
      expect(t.borderRadius).toBe(0);
      expect(t.blurOpacity).toBe(0);
    }
  });

  it('still slides, but only half the usual distance when fully open', () => {
    const width = 412;
    const full = computeCardTransform(1, width, false);
    const reduced = computeCardTransform(1, width, true);
    expect(reduced.translateX).toBeCloseTo(full.translateX / 2);
    expect(reduced.translateX).toBeGreaterThan(0);
  });
});

describe('shouldShowSectionLabels', () => {
  // Production: 10 menu rows + Appearance + Logout.
  const rows = 12;

  it('keeps labels when every row already fits the list area', () => {
    expect(shouldShowSectionLabels(rows * ROW_HEIGHT, rows)).toBe(true);
    expect(shouldShowSectionLabels(900, rows)).toBe(true);
  });

  it('drops them once the rows alone overflow — a label would only push another row out of view', () => {
    expect(shouldShowSectionLabels(rows * ROW_HEIGHT - 1, rows)).toBe(false);
    expect(shouldShowSectionLabels(480, rows)).toBe(false);
  });

  it('treats the unmeasured first frame as tall, so labels do not flicker in on a tall screen', () => {
    expect(shouldShowSectionLabels(0, rows)).toBe(true);
  });
});
