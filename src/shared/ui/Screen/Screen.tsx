import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/shared/theme';
import { GlowLayer, WARM_GLOW_RGB } from '../GlowLayer';

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
      {glow === 'default' ? (
        <>
          <GlowLayer rgb={[88, 70, 210]} alpha={0.3} corner="topRight" />
          <GlowLayer rgb={[24, 110, 140]} alpha={0.22} corner="bottomLeft" />
        </>
      ) : null}
      {glow === 'warm' ? <GlowLayer rgb={WARM_GLOW_RGB} alpha={0.55} corner="topRight" /> : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
