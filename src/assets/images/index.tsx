import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Stand-in for a product with no photograph.
 *
 * Square, unlike the 4:3 illustrations, because it fills an image slot in a
 * product row or grid tile rather than sitting above text — it has to match the
 * shape of the real photo it replaces or the layout jumps when one loads.
 *
 * A drawn placeholder rather than a grey box: a grey box reads as "image
 * failed to load", and this is the ordinary state for most of the catalogue.
 * Same rules as `assets/illustrations` — vector, theme tokens, no literals, so
 * it works on `surface` in both schemes. Memoised for the same reason they are:
 * this is a static drawing that would otherwise be redrawn every time the row
 * or grid tile around it re-rendered.
 */
export const ProductPlaceholder = React.memo(function ProductPlaceholderView({
  size = 64,
  testID = 'product-placeholder',
}: {
  size?: number;
  testID?: string;
}): React.ReactElement {
  const theme = useTheme();
  const wash = theme.colors.surfaceSunken;
  const line = theme.colors.borderStrong;
  const muted = theme.colors.textMuted;
  const accent = theme.colors.primary;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Rect x={0} y={0} width={100} height={100} rx={14} fill={wash} />
      {/* Cupcake: case, then frosting, then a cherry for the one accent. */}
      <Path
        d="M32 56h36l-4.5 26a7 7 0 01-7 6H43.5a7 7 0 01-7-6Z"
        fill="none"
        stroke={line}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <Path d="M42 58l-2 28M50 58v28M58 58l2 28" stroke={muted} strokeWidth={3} strokeLinecap="round" />
      <Path
        d="M30 56a13 13 0 019-21 15 15 0 0122 0 13 13 0 019 21Z"
        fill="none"
        stroke={line}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <Circle cx={50} cy={26} r={5} fill={accent} />
    </Svg>
  );
});

export const IMAGES = {
  'product-placeholder': ProductPlaceholder,
} as const;

export type ImageKey = keyof typeof IMAGES;
