import React from 'react';
import { ICONS, type IconKey } from '@/constants/navigationIcons';
import { iconSize, iconStroke, type IconSize } from '@/theme/iconSizes';
import { useTheme } from '@/theme/ThemeProvider';

export interface MBIconProps {
  name: IconKey;
  /** A size token, never a number. */
  size?: IconSize;
  /** Any colour from `theme.colors`. Defaults to body text. */
  color?: string;
  strokeWidth?: number;
}

/**
 * The only place an icon component is rendered.
 *
 * Screens pass a key and a size token; they never import from
 * `lucide-react-native` and never pass a pixel number. That is what keeps the
 * family and the scale consistent, and it means the day the icon set changes,
 * `navigationIcons.ts` is the only file that moves.
 *
 * Icons here are decorative by default — `accessibilityElementsHidden` keeps
 * them out of the screen reader, because a meaningful icon is always inside a
 * control that carries its own `accessibilityLabel`. An icon that announces
 * itself next to a label that says the same thing reads everything twice.
 */
export function MBIcon({
  name,
  size = 'action',
  color,
  strokeWidth = iconStroke.regular,
}: MBIconProps): React.ReactElement {
  const theme = useTheme();
  const Glyph = ICONS[name];

  return (
    <Glyph
      size={iconSize[size]}
      color={color ?? theme.colors.text}
      strokeWidth={strokeWidth}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
