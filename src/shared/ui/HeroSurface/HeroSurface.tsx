import { StyleSheet, View, type ViewProps } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAppTheme } from '@/shared/theme';
import { HERO_GRADIENT } from '@/shared/theme/design';
import { Sphere3D } from '../Sphere3D';

export interface HeroSurfaceProps extends ViewProps {
  /** Hide the decorative 3D balls (e.g. a very short hero). */
  plain?: boolean;
}

/**
 * The 2026 redesign's hero/total card: violet gradient, a glossy saffron
 * sphere peeking out of the top-right corner and a small lilac ball at the
 * bottom-right. Text on it is white (`HERO_CHIP` for nested tiles).
 *
 * In dark mode it falls back to the old flat accent fill, so the dark theme
 * keeps its own look.
 */
export function HeroSurface({ plain, style, children, ...rest }: HeroSurfaceProps) {
  const theme = useAppTheme();
  const radius = 28;

  if (theme.isDark) {
    return (
      <View style={[{ backgroundColor: theme.colors.primary, borderRadius: radius, padding: theme.spacing.lg }, style]} {...rest}>
        {children}
      </View>
    );
  }

  const { outer, inner } = splitStyle(style);
  return (
    <View style={[styles.shadow, { borderRadius: radius }, outer]} {...rest}>
      <LinearGradient
        colors={[...HERO_GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.clip, { borderRadius: radius, padding: theme.spacing.lg }, inner]}>
        {plain ? null : (
          <>
            <Sphere3D size={118} tone="saffron" style={{ right: -38, top: -44 }} />
            <Sphere3D size={40} tone="lilac" style={{ right: -10, bottom: -12 }} />
          </>
        )}
        {children}
      </LinearGradient>
    </View>
  );
}

/**
 * Callers style a hero like a plain View. Padding and child layout (gap, direction,
 * alignment) belong on the inner gradient that holds the children; size, margins and
 * position stay on the outer shadow wrapper. A background colour is ignored (the
 * gradient is the background).
 */
const INNER_KEYS = new Set([
  'padding', 'paddingHorizontal', 'paddingVertical', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'paddingStart', 'paddingEnd', 'gap', 'rowGap', 'columnGap', 'flexDirection', 'flexWrap', 'alignItems', 'justifyContent', 'alignContent',
]);

function splitStyle(style: ViewProps['style']) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (k === 'backgroundColor' || v == null) continue;
    (INNER_KEYS.has(k) ? inner : outer)[k] = v;
  }
  return { outer, inner };
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#5B48D8',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 8,
  },
  clip: { overflow: 'hidden' },
});
