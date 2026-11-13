import { View, type ViewProps } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { pastelTiles, useAppTheme, type PastelTone } from '@/shared/theme';

export interface PastelTileProps extends ViewProps {
  tone: PastelTone;
  /** Render a plain View with the caller's own style instead (e.g. a solid-accent highlight tile). */
  off?: boolean;
}

/** Navy-on-pastel text colours for a tile's label/sub-line (light mode). Dark tiles: `tileInk(true)`. */
export const PASTEL_INK = { text: '#171A35', muted: 'rgba(23, 26, 53, 0.62)' } as const;

/**
 * A 2026-redesign stat tile: a pastel gradient (mint / aqua / amber / lilac /
 * pink) with no border; dark mode uses the deep versions of the same hues
 * (`PASTEL_TILES_DARK`). Text inside should use `tileInk(theme.isDark)`.
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
  const t = pastelTiles(theme.isDark)[tone];
  return (
    <LinearGradient colors={[t.from, t.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 20 }, style, { borderWidth: 0 }]} {...rest}>
      {children}
    </LinearGradient>
  );
}
