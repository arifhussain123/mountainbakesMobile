import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export interface GlowLayerProps {
  rgb: readonly [number, number, number];
  alpha: number;
  corner: 'topRight' | 'bottomLeft' | 'topLeft';
}

/** `rgb(a)` triple → the same color at zero alpha, for a gradient's transparent end stop. */
function transparentVariant(rgb: readonly [number, number, number]): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`;
}

/**
 * `LinearGradient` only draws linear gradients, not true radial ones — the
 * design files' radial glows are approximated here with a diagonal gradient
 * anchored at the glow's corner and fading to transparent toward the opposite
 * corner, which reads the same on a screen-sized surface.
 *
 * Extracted out of `Screen.tsx` (where it started private) so the Drawer can
 * reuse the exact same warm glow Splash/Login use, just dimmer — see
 * `DrawerContent`'s own glow usage.
 */
const CORNER_POINTS: Record<GlowLayerProps['corner'], { start: { x: number; y: number }; end: { x: number; y: number } }> = {
  topRight: { start: { x: 1, y: 0 }, end: { x: 0.15, y: 0.55 } },
  bottomLeft: { start: { x: 0, y: 1 }, end: { x: 0.6, y: 0.3 } },
  // Mirror of `topRight` across the vertical axis.
  topLeft: { start: { x: 0, y: 0 }, end: { x: 0.85, y: 0.55 } },
};

export function GlowLayer({ rgb, alpha, corner }: GlowLayerProps) {
  const { start, end } = CORNER_POINTS[corner];
  return (
    <LinearGradient
      colors={[`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`, transparentVariant(rgb)]}
      start={start}
      end={end}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

/** The warm orange/brown glow Splash/Login/the Drawer share — `rgba(120,52,30,…)`. */
export const WARM_GLOW_RGB: readonly [number, number, number] = [120, 52, 30];
