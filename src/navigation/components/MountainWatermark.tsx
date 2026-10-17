import { StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

/**
 * A single mountain-outline tile, repeated via one SVG `<Pattern>` (not many
 * `<Image>`s) across the drawer's full-screen background at ~4% opacity,
 * rotated diagonally — "lightweight: one SVG pattern" per the brief.
 */
export function MountainWatermark() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="mountainTile" width={64} height={64} patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">
          <Path d="M4 52 L20 24 L28 36 L40 12 L60 52 Z" fill="#FFFFFF" fillOpacity={0.04} stroke="none" />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#mountainTile)" />
    </Svg>
  );
}
