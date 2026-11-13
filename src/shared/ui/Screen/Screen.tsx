import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/shared/theme';
import { GlowLayer } from '../GlowLayer';

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

/**
 * The dark background + radial-glow chrome every screen in the design files
 * shares. A drop-in replacement for a plain `SafeAreaView` — same children
 * API, so existing screens adopt it without restructuring their layout.
 */
export function Screen({ glow = 'default', edges, style, contentStyle, children, ...rest }: ScreenProps) {
  const theme = useAppTheme();

  return (
    <SafeAreaView edges={edges} style={[styles.container, { backgroundColor: theme.colors.background }, style]} {...rest}>
      {glow === 'default' && theme.isDark ? (
        <>
          {/* 2026 redesign, dark: violet light top-right, a faint saffron one top-left. */}
          <GlowLayer rgb={[127, 107, 242]} alpha={0.28} corner="topRight" />
          <GlowLayer rgb={[255, 138, 61]} alpha={0.12} corner="topLeft" />
        </>
      ) : null}
      {glow === 'default' && !theme.isDark ? (
        // 2026 redesign: faint violet (top-right) and peach (top-left) light on the lavender canvas.
        <>
          <GlowLayer rgb={[169, 145, 255]} alpha={0.3} corner="topRight" />
          <GlowLayer rgb={[255, 195, 107]} alpha={0.18} corner="topLeft" />
        </>
      ) : null}
      {glow === 'warm' && theme.isDark ? (
        <>
          <GlowLayer rgb={[127, 107, 242]} alpha={0.35} corner="topRight" />
          <GlowLayer rgb={[255, 138, 61]} alpha={0.16} corner="bottomLeft" />
        </>
      ) : null}
      {glow === 'warm' && !theme.isDark ? (
        // 2026 redesign: on lavender, the splash/login glow is violet + saffron light instead of warm brown.
        <>
          <GlowLayer rgb={[142, 124, 255]} alpha={0.35} corner="topRight" />
          <GlowLayer rgb={[255, 138, 61]} alpha={0.22} corner="bottomLeft" />
        </>
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
