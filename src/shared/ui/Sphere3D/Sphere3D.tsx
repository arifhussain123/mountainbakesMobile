import { useId } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { SPHERES, type SphereTone } from '@/shared/theme/design';

export interface Sphere3DProps {
  size: number;
  tone?: SphereTone;
  /** A gold ring (torus look) instead of a solid ball. */
  ring?: boolean;
  /** Absolute placement inside the parent, e.g. `{ right: -30, top: -36 }`. */
  style?: ViewStyle;
}

/**
 * The glossy 3D balls/rings of the 2026 redesign — a radial gradient with its
 * highlight offset to the upper-left, so it reads as lit from above.
 * Purely decorative: no touches, hidden from screen readers.
 */
export function Sphere3D({ size, tone = 'saffron', ring, style }: Sphere3DProps) {
  const id = `s${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [hi, body, shade, deep] = SPHERES[ring ? 'gold' : tone];
  const r = size / 2;
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.abs, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%" fx="34%" fy="30%">
            <Stop offset="0" stopColor={hi} />
            <Stop offset="0.3" stopColor={body} />
            <Stop offset="0.72" stopColor={shade} />
            <Stop offset="1" stopColor={deep} />
          </RadialGradient>
        </Defs>
        {ring ? (
          <Circle cx={r} cy={r} r={r * 0.74} stroke={`url(#${id})`} strokeWidth={r * 0.46} fill="none" />
        ) : (
          <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
