import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View, Image as RNImage } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAppTheme, useResponsive } from '@/shared/theme';
import { Screen } from '@/shared/ui';
import { useAuthStore } from '@/state';
import { images } from '@/assets';

/**
 * Shown while `authStore.bootstrap()` checks the keychain for a session —
 * mountainbakesBranch.html screen 01: warm top-right glow, logo, title,
 * tagline, pulsing loader dot.
 *
 * Native-to-JS handoff: `android/.../styles.xml` + `BootTheme`'s
 * `bootSplashLogo` drawable renders the logo at a fixed 288dp (see the
 * generated `drawable-mdpi/bootsplash_logo.png`, 288x288 at 1x), centered on
 * the raw screen. `ios/.../BootSplash.storyboard` renders it at a fixed
 * 192pt, also screen-centered. Neither scales with device size or responds
 * to this screen's `useResponsive()` sizing — so the very first JS frame
 * must render the logo at that same native size and position, or there's a
 * visible jump the instant `App.tsx` calls `BootSplash.hide()`. The logo's
 * animated style below starts at that native size/scale and tweens to the
 * responsive final size over the same ~250ms the native fade itself takes.
 */
const NATIVE_BOOTSPLASH_LOGO_SIZE = Platform.select({ ios: 192, android: 288, default: 192 });
const HANDOFF_DURATION_MS = 250;

export function SplashView() {
  const theme = useAppTheme();
  const { sw, sh, ms, clamp, isShort, usableHeight } = useResponsive();
  const bootstrapMessage = useAuthStore((state) => state.bootstrapMessage);
  const bootstrapStep = useAuthStore((state) => state.bootstrapStep);
  const reduceMotion = useReducedMotion();

  const logoSize = clamp(96, Math.min(sw(140), usableHeight * 0.18), 168);
  // The whole block sits slightly above true center — 45% of usable height —
  // rather than dead center, per the design. The native splash's logo is
  // screen-centered (see note above), so the block animates up into place
  // alongside the logo's size change, instead of starting there.
  const blockCenterY = usableHeight * (isShort ? 0.4 : 0.45);
  const nativeCenterY = usableHeight / 2;

  const logoScale = useSharedValue(reduceMotion ? 1 : NATIVE_BOOTSPLASH_LOGO_SIZE / logoSize);
  const blockTranslateY = useSharedValue(reduceMotion ? 0 : nativeCenterY - blockCenterY);
  const textOpacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    logoScale.value = withTiming(1, { duration: HANDOFF_DURATION_MS });
    blockTranslateY.value = withTiming(0, { duration: HANDOFF_DURATION_MS });
    textOpacity.value = withTiming(1, { duration: HANDOFF_DURATION_MS });
    // Intentionally run once on mount — this animates the native→JS handoff,
    // not a response to size changes (a mid-animation rotation is an edge
    // case not worth chasing: the splash is on-screen for well under a
    // second in the common case).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blockStyle = useAnimatedStyle(() => ({ transform: [{ translateY: blockTranslateY.value }] }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));

  return (
    <Screen glow="warm" contentStyle={styles.container}>
      <Animated.View style={blockStyle}>
        <Animated.View style={logoStyle}>
          <RNImage source={images.logo} style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 2 }} resizeMode="contain" />
        </Animated.View>

        <Animated.View style={textStyle}>
          <Text
            style={[
              theme.typography.screenTitle,
              styles.title,
              { color: theme.colors.text, fontSize: clamp(22, ms(28), 34), marginTop: sh(24) },
            ]}>
            MOUNTAIN BAKES
          </Text>
          <Text style={[theme.typography.bodySmall, styles.tagline, { color: theme.colors.textMuted, fontSize: clamp(12, ms(14), 16), marginTop: sh(8) }]}>
            Fresh <Text style={{ color: theme.colors.primary }}>•</Text> Quality <Text style={{ color: theme.colors.primary }}>•</Text> Every Day
          </Text>

          <View style={{ marginTop: sh(40), alignItems: 'center' }}>
            <PulsingDot color={theme.colors.primary} reduceMotion={reduceMotion} />
            {bootstrapMessage ? (
              <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 10 }]}>{bootstrapMessage}</Text>
            ) : null}
            {/* Dev-only, and only once a step has run 1.5s+ (see authStore's
                `timeBootstrapStep`) — never flashes on a normal, fast boot. */}
            {__DEV__ && bootstrapStep ? (
              <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 4, opacity: 0.6 }]}>[{bootstrapStep}]</Text>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
    </Screen>
  );
}

/** The pulsing orange dot from the original spec — a plain `ActivityIndicator` reads as a generic "loading fragment", not this screen's own loader. */
function PulsingDot({ color, reduceMotion }: { color: string; reduceMotion: boolean }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    const pulse = () => {
      opacity.value = withTiming(0.3, { duration: 650 }, () => {
        opacity.value = withTiming(1, { duration: 650 }, pulse);
      });
    };
    pulse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', letterSpacing: 2, fontWeight: '700' },
  tagline: { textAlign: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
