import { View, type ViewProps } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PASTEL_TILES, useAppTheme, type PastelTone } from '@/shared/theme';

export interface PastelTileProps extends ViewProps {
  tone: PastelTone;
  /** Render a plain View with the caller's own style instead (e.g. a solid-accent highlight tile). */
  off?: boolean;
}

/** Navy-on-pastel text colours for a tile's label/sub-line (light mode). */
export const PASTEL_INK = { text: '#171A35', muted: 'rgba(23, 26, 53, 0.62)' } as const;

/**
 * A 2026-redesign stat tile: a pastel gradient (mint / aqua / amber / lilac /
 * pink) with no border. In dark mode it is the ordinary glass card instead, so
 * callers can use it unconditionally. Text inside should use `theme.colors.text`
 * / `PASTEL_INK.muted` in light mode.
 */
export function PastelTile({ tone, off, style, children, ...rest }: PastelTileProps) {
  const theme = useAppTheme();
  if (off) {
    return (
      <View style={style} {...rest}>
        {children}
      </View>
    );
  }
  if (theme.isDark) {
    return (
      <View
        style={[{ backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderWidth: 1, borderRadius: theme.radii.lg }, style]}
        {...rest}>
        {children}
      </View>
    );
  }
  const t = PASTEL_TILES[tone];
  return (
    <LinearGradient colors={[t.from, t.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 20 }, style, { borderWidth: 0 }]} {...rest}>
      {children}
    </LinearGradient>
  );
}
