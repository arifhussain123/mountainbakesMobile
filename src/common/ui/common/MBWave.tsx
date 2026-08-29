import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/common/theme';

/**
 * The v6 masthead — two overlapping plum shapes with mirrored curves.
 *
 * ---------------------------------------------------------------------------
 * Why two layers and not one
 * ---------------------------------------------------------------------------
 * v5's masthead was a flat brown rectangle, so one `backgroundColor` described
 * it. v6's is the design's whole visual signature and it cannot be a fill: two
 * shapes of different heights, each with a different elliptical bottom-left and
 * bottom-right, sit on top of one another so the deeper plum shows only as a
 * crescent under the lighter one. The curves are **mirrored** — the back layer
 * is deep on the right, the front layer is deep on the left — and it is that
 * crossing, not the colour, that reads as a wave.
 *
 * Collapsing it to a single rounded rect is the obvious simplification and it
 * loses the design: what you get is a header with a rounded bottom, which is a
 * 2019 shape. The 22px offset between the two heights is the whole effect.
 *
 * ---------------------------------------------------------------------------
 * The geometry is v6's CSS, transcribed
 * ---------------------------------------------------------------------------
 * v6 draws each layer with a CSS elliptical `border-radius`, whose horizontal
 * radii are percentages of the width and whose vertical radii are absolute px:
 *
 *   back   height 148   `border-radius: 0 0 60% 28% / 0 0 42px 20px`
 *   front  height 126   `border-radius: 0 0 22% 62% / 0 0 20px 50px`
 *
 * CSS orders those corners TL, TR, BR, BL — so the back layer's bottom-RIGHT
 * ellipse is 60% wide and 42px deep and its bottom-LEFT is 28% by 20px, and the
 * front layer's are the other way round. React Native's `borderRadius` takes a
 * single number per corner and cannot express an ellipse at all, which is why
 * this is SVG rather than two `View`s.
 *
 * The viewBox is the trick that keeps the transcription honest: it is
 * `0 0 100 h` with `preserveAspectRatio="none"`, so x units ARE percentages of
 * the rendered width while y units stay real pixels. That is precisely CSS's
 * `<percentage> / <length>` semantics, so the radii below are v6's own numbers
 * with no conversion — and the curve holds its shape from a 320pt phone to a
 * tablet without the vertical depth stretching with it.
 */

/**
 * How far the back layer falls below the header's content box, and the gap
 * between the two layers.
 *
 * v6's pair is 148 and 126 over a content area that starts at a 16px status bar
 * — so the tail is what remains once the row is laid out, and the offset between
 * the layers is 22. Both are carried as the offsets they are rather than as
 * absolute heights, because this header's height is `insets.top + headerH` and
 * varies by device where v6's mock is a fixed 844pt canvas.
 */
export const WAVE_TAIL = 46;
const WAVE_LAYER_OFFSET = 22;

/** Bottom-right rx/ry then bottom-left rx/ry, in viewBox units. v6's values. */
const BACK = { brx: 60, bry: 42, blx: 28, bly: 20 };
const FRONT = { brx: 22, bry: 20, blx: 62, bly: 50 };

/**
 * A rectangle 100 wide and `h` tall whose two bottom corners are elliptical.
 *
 * Drawn clockwise from the top-left, so both arcs take `sweep-flag: 1`. The
 * radii are clamped to `h` because a short header — a compact device with no
 * notch — would otherwise ask for a 50px curve on a 40px shape, which renders as
 * a straight edge on iOS and drops the path entirely on some Android drivers.
 */
function layerPath(h: number, r: typeof BACK): string {
  const bry = Math.min(r.bry, h);
  const bly = Math.min(r.bly, h);
  return [
    'M0 0',
    'H100',
    `V${h - bry}`,
    `A${r.brx} ${bry} 0 0 1 ${100 - r.brx} ${h}`,
    `H${r.blx}`,
    `A${r.blx} ${bly} 0 0 1 0 ${h - bly}`,
    'Z',
  ].join(' ');
}

export interface MBWaveProps {
  /**
   * The full height of the back layer — normally `insets.top + headerH +
   * WAVE_TAIL`. The front layer is drawn `WAVE_LAYER_OFFSET` shorter.
   */
  height: number;
}

/**
 * Purely decorative, and marked so: the masthead carries no information a
 * screen reader needs, and the title sitting on it is announced by the header
 * itself. Left in the tree as a sibling under the header's content rather than a
 * background image, because `backgroundImage` cannot draw this and a
 * `position: absolute` sibling is what lets the tail bleed past the row.
 */
export function MBWave({ height }: MBWaveProps): React.ReactElement {
  const theme = useTheme();
  const front = Math.max(0, height - WAVE_LAYER_OFFSET);

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.root]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none">
        {/* Back first, so the deeper plum shows as the trailing crescent.
            The testIDs exist for `__tests__/MBWave.test.tsx`, which pins the two
            layers apart — their heights and their mirrored radii are the whole
            shape, and both are invisible in review. */}
        <Path
          testID="wave-back"
          d={layerPath(height, BACK)}
          fill={theme.colors.secondary}
        />
        <Path
          testID="wave-front"
          d={layerPath(front, FRONT)}
          fill={theme.colors.secondaryWave}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Pinned to the top rather than stretched. `absoluteFill` would make the SVG
   * as tall as the header's content box, and the whole point of the tail is that
   * it is taller than that.
   */
  root: { bottom: undefined },
});
