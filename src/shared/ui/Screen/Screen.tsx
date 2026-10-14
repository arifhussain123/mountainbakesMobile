import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useAppTheme } from '@/shared/theme';

export interface ScreenProps extends Omit<ViewProps, 'style'> {
  /**
   * 'default' — violet top-right + teal bottom-left, used on every app screen.
   * 'warm' — warm orange/brown top-right only, used on Splash/Login per the
   * design files (`rgba(120,52,30,.55)` instead of the violet glow).
   */
  glow?: 'default' | 'warm' | 'none';
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  /** Styles the outer safe-area container (background, edge padding overrides). */
  style?: ViewProps['style'];
  /** Styles the content wrapper that holds `children` — use this to center/pad content. */
  contentStyle?: ViewProps['style'];
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
 */
function GlowLayer({ rgb, alpha, corner }: { rgb: readonly [number, number, number]; alpha: number; corner: 'topRight' | 'bottomLeft' }) {
  const isTopRight = corner === 'topRight';
  return (
    <LinearGradient
      colors={[`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`, transparentVariant(rgb)]}
      start={isTopRight ? { x: 1, y: 0 } : { x: 0, y: 1 }}
      end={isTopRight ? { x: 0.15, y: 0.55 } : { x: 0.6, y: 0.3 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

/**
 * The dark background + radial-glow chrome every screen in the design files
 * shares. A drop-in replacement for a plain `SafeAreaView` — same children
 * API, so existing screens adopt it without restructuring their layout.
 */
export function Screen({ glow = 'default', edges, style, contentStyle, children, ...rest }: ScreenProps) {
  const theme = useAppTheme();

  return (
    <SafeAreaView edges={edges} style={[styles.container, { backgroundColor: theme.colors.background }, style]} {...rest}>
      {glow === 'default' ? (
        <>
          <GlowLayer rgb={[88, 70, 210]} alpha={0.3} corner="topRight" />
          <GlowLayer rgb={[24, 110, 140]} alpha={0.22} corner="bottomLeft" />
        </>
      ) : null}
      {glow === 'warm' ? <GlowLayer rgb={[120, 52, 30]} alpha={0.55} corner="topRight" /> : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
