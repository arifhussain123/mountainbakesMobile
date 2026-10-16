/**
 * @format
 */
import { buildNotchBarPath, clampNotchX } from '@/navigation/tabBar/notchPath';

const BAR = { width: 360, height: 68 };

describe('clampNotchX', () => {
  it('passes through a center-ish position untouched', () => {
    expect(clampNotchX(180, BAR.width, 80, 24)).toBe(180);
  });

  it('clamps so the notch cut stays clear of the left rounded corner', () => {
    // min = cornerRadius + half = 24 + 40 = 64
    expect(clampNotchX(10, BAR.width, 80, 24)).toBe(64);
  });

  it('clamps so the notch cut stays clear of the right rounded corner', () => {
    // max = width - cornerRadius - half = 360 - 24 - 40 = 296
    expect(clampNotchX(355, BAR.width, 80, 24)).toBe(296);
  });

  it('falls back to center when the bar is too narrow for both constraints', () => {
    expect(clampNotchX(50, 100, 80, 24)).toBe(50);
  });
});

describe('buildNotchBarPath', () => {
  it('starts and ends the path at the bar corners (closed shape)', () => {
    const d = buildNotchBarPath({ ...BAR, notchX: 180 });
    expect(d.startsWith('M 0 24')).toBe(true);
    expect(d.trim().endsWith('Z')).toBe(true);
    expect(d).toContain(`L ${BAR.width} ${BAR.height}`);
  });

  it('centers the dip on the (clamped) notchX for a tab near the middle', () => {
    const d = buildNotchBarPath({ ...BAR, notchX: 180, notchWidth: 80, notchDepth: 30 });
    // The dip's lowest point is the midpoint of the two cubic curves — its
    // control/end coordinates both land on notchX at y = notchDepth.
    expect(d).toContain('180 30');
  });

  it('moves the dip when notchX moves to a different tab position', () => {
    const left = buildNotchBarPath({ ...BAR, notchX: 72 });
    const right = buildNotchBarPath({ ...BAR, notchX: 288 });
    expect(left).not.toBe(right);
    expect(left).toContain('72 30');
    expect(right).toContain('288 30');
  });

  it('clamps the first tab so the cut never reaches past the left corner radius', () => {
    const d = buildNotchBarPath({ ...BAR, notchX: 0, notchWidth: 80, cornerRadius: 24 });
    // left edge of the notch = clamped center - half = 64 - 40 = 24, exactly at the corner's end.
    expect(d).toContain('L 24 0');
  });

  it('clamps the last tab so the cut never reaches past the right corner radius', () => {
    const d = buildNotchBarPath({ ...BAR, notchX: BAR.width, notchWidth: 80, cornerRadius: 24 });
    // right edge of the notch = clamped center + half = 296 + 40 = 336 = width - cornerRadius.
    expect(d).toContain(`L ${BAR.width - 24} 0`);
  });

  it('is deterministic for the same inputs (safe to call every animation frame)', () => {
    const a = buildNotchBarPath({ ...BAR, notchX: 150 });
    const b = buildNotchBarPath({ ...BAR, notchX: 150 });
    expect(a).toBe(b);
  });
});
