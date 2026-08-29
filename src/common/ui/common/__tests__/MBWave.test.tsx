import React from 'react';
import { render } from '@testing-library/react-native';

import { MBWave } from '@/common/ui';
import { ThemeProvider } from '@/common/theme/ThemeProvider';
import { lightColors } from '@/common/theme/colors';

/**
 * The v6 masthead, pinned where it makes a **judgement** rather than where it
 * draws a box.
 *
 * Nothing here asserts a colour value — `contrast.test.ts` owns the palette and
 * `check-theme-tokens.sh` owns the literals. What is worth a test is the small
 * set of things that make this a wave rather than a rounded rectangle, because
 * each is invisible in review and each degrades silently into the shape v6
 * replaced:
 *
 *   - there are TWO layers, and the deeper one is painted first
 *   - they are different heights, which is what shows the trailing crescent
 *   - their curves are MIRRORED, which is what reads as a wave
 *   - the radii clamp on a short header rather than emitting an arc taller than
 *     its own shape, which some Android drivers drop entirely
 */

function drawWave(height: number) {
  return render(
    <ThemeProvider mode="light">
      <MBWave height={height} />
    </ThemeProvider>,
  );
}

/**
 * A layer's props.
 *
 * `includeHiddenElements` is required and is the point rather than a workaround:
 * the wave is `accessibilityElementsHidden`, and Testing Library excludes hidden
 * elements from `getByTestId` by default. That default is right for a query
 * asking "can a user reach this"; here the question is "what did it draw", which
 * is a different one — so the hiddenness is relied on in one test and opted past
 * in the others.
 */
function pathOf(
  screen: {
    getByTestId: (
      id: string,
      options?: { includeHiddenElements?: boolean },
    ) => { props: unknown };
  },
  id: string,
): { d: string; fill: unknown } {
  return screen.getByTestId(id, { includeHiddenElements: true }).props as {
    d: string;
    fill: unknown;
  };
}

/**
 * `react-native-svg` normalises a `fill` into `{type, payload}`, where the
 * payload is a packed ARGB integer — so a colour assertion compares against
 * `4283047280` rather than `#4A1D70` unless it is decoded first. Decoded here so
 * the expectation reads as the token it is checking.
 */
function fillHex(fill: unknown): string {
  const payload = (fill as { payload?: number })?.payload;
  if (typeof payload !== 'number') return String(fill);
  // Drop the alpha byte by arithmetic rather than `& 0xffffff`: the packed value
  // exceeds 2^31, and JS bitwise operators coerce to a SIGNED 32-bit int, so the
  // mask returns a negative number for every colour whose alpha is 0xFF — which
  // is all of them.
  return `#${(payload % 0x1000000).toString(16).padStart(6, '0')}`;
}

describe('MBWave', () => {
  it('paints the deeper plum first, so it reads as the trailing crescent', async () => {
    // Order is as load-bearing as the values: SVG paints in document order, so
    // drawing the front layer first would bury the layer it should sit under and
    // the masthead would be one flat colour.
    const screen = await drawWave(140);

    expect(fillHex(pathOf(screen, 'wave-back').fill)).toBe(
      lightColors.secondary.toLowerCase(),
    );
    expect(fillHex(pathOf(screen, 'wave-front').fill)).toBe(
      lightColors.secondaryWave.toLowerCase(),
    );
  });

  it('draws the front layer shorter than the back', async () => {
    const screen = await drawWave(140);

    // Each layer's height is where its first arc LANDS, not the vertical it
    // drops to beforehand — that vertical is `h - ry`, and the two layers have
    // different `ry`, so at 140 they both happen to read 98. Asserting on it
    // passes for the wrong reason on some heights and fails on others.
    const endY = (d: string) =>
      Number(/A[\d.]+ [\d.]+ 0 0 1 [\d.]+ ([\d.]+)/.exec(d)![1]);

    const back = endY(pathOf(screen, 'wave-back').d);
    const front = endY(pathOf(screen, 'wave-front').d);

    // Equal heights would stack the two exactly and hide one of them entirely.
    expect(front).toBeLessThan(back);
  });

  it('mirrors the two curves rather than repeating one', async () => {
    // v6's back layer is deep on the right (60% wide) and shallow on the left
    // (28%); the front is the other way round (22% right, 62% left). Repeating
    // one curve on both gives two concentric rounded rects, which reads as a
    // thick border rather than as a wave.
    const screen = await drawWave(140);

    // The first arc on each path is the bottom-RIGHT corner; its first number is
    // that corner's horizontal radius as a percentage of the width.
    const backRight = Number(/A([\d.]+) /.exec(pathOf(screen, 'wave-back').d)![1]);
    const frontRight = Number(/A([\d.]+) /.exec(pathOf(screen, 'wave-front').d)![1]);

    expect(backRight).toBeGreaterThan(frontRight);
  });

  it('clamps a curve deeper than the header instead of emitting an invalid arc', async () => {
    // The front layer's bottom-left ellipse is 50px deep. On a compact device
    // with no notch the layer can be shorter than that, and an arc taller than
    // its own shape drops the whole path on some Android drivers — a screen with
    // no masthead at all rather than a slightly wrong one.
    const screen = await drawWave(30);
    const d = pathOf(screen, 'wave-front').d;

    const verticals = [...d.matchAll(/V([\d.-]+)/g)].map(m => Number(m[1]));
    const radii = [...d.matchAll(/A[\d.]+ ([\d.]+)/g)].map(m => Number(m[1]));

    // No coordinate above the shape, and no radius deeper than it.
    expect(Math.min(...verticals)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...radii)).toBeLessThanOrEqual(30);
  });

  it('is hidden from the accessibility tree', async () => {
    // The masthead carries no information a reader needs; the title sitting on
    // it is announced by the header itself. It must also not swallow a tap
    // meant for the back arrow underneath.
    const screen = await drawWave(140);

    // Present when hidden elements are included...
    expect(
      screen.getByTestId('wave-back', { includeHiddenElements: true }),
    ).toBeTruthy();
    // ...and absent from the tree a reader or a tap actually walks.
    expect(screen.queryByTestId('wave-back')).toBeNull();
  });
});
