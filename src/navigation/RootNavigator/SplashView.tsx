import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View, Image as RNImage } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { HERO_GRADIENT, useAppTheme, useResponsive } from '@/shared/theme';
import { Screen, Sphere3D } from '@/shared/ui';
import { useAuthStore } from '@/state';
import { images } from '@/assets';

/**
 * Shown while `authStore.bootstrap()` checks the keychain for a session —
 * mountainbakesBranch.html screen 01: warm top-right glow, logo, title,
 * tagline, pulsing loader dot.
 *
 * Native-to-JS handoff: regenerated via `react-native-bootsplash generate
 * --logo-width 200 ...` for iOS (confirmed in `BootSplash.storyboard`: a
 * 200x200pt image, screen-centered) and `--logo-width 192` for Android — the
 * CLI itself refuses anything above 192dp there ("Logo exceeds 192x192dp and
 * will be cropped by Android"), and the generated `drawable-mdpi/
 * bootsplash_logo.png` is a consistent 1.5x of whatever width is requested
 * (288px for a 192dp request — a quirk of this CLI's Android output, not a
 * bug in this file), so 288 is Android's real effective native size, not
 * 192. Neither platform scales with device size or responds to this
 * screen's `useResponsive()` sizing — so the very first JS frame must render
 * the logo at that same native size and position, or there's a visible jump
 * the instant `App.tsx` calls `BootSplash.hide()`. The logo's animated style
 * below starts at that native size/scale and tweens to the responsive final
 * size over 300ms, per this task's own spec.
 *
 * 2026 redesign (B01, light mode): a violet gradient with 3D spheres, white
 * title and a honey tagline. The native splash is plain lavender, so the
 * violet layer fades in over the same 300ms handoff instead of cutting in.
 * Dark mode keeps the earlier warm-glow look.
 */
const NATIVE_BOOTSPLASH_LOGO_SIZE = Platform.select({ ios: 200, android: 288, default: 200 });
const HANDOFF_DURATION_MS = 300;

export function SplashView() {
  const theme = useAppTheme();
  const { width, size, clamp, isShort, usableHeight } = useResponsive();
  const bootstrapMessage = useAuthStore((state) => state.bootstrapMessage);
  const reduceMotion = useReducedMotion();

  const logoSize = clamp(160, Math.min(width * 0.5, usableHeight * 0.25), 240);
  // The whole block sits slightly above true center — 45% of usable height —
  // rather than dead center, per the design. The native splash's logo is
  // screen-centered (see note above), so the block animates up into place
  // alongside the logo's size change, instead of starting there.
  const blockCenterY = usableHeight * (isShort ? 0.4 : 0.45);
  const nativeCenterY = usableHeight / 2;

  const logoScale = useSharedValue(reduceMotion ? 1 : NATIVE_BOOTSPLASH_LOGO_SIZE / logoSize);
  const blockTranslateY = useSharedValue(reduceMotion ? 0 : nativeCenterY - blockCenterY);
  const textOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const violet = !theme.isDark;

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

  const titleColor = violet ? '#FFFFFF' : theme.colors.text;
  const taglineColor = violet ? '#FFD36E' : theme.colors.textMuted;
  const loaderColor = violet ? '#FFD36E' : theme.colors.primary;

  return (
    <Screen glow={violet ? undefined : 'warm'} contentStyle={styles.container}>
      {violet ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, textStyle]}>
          <LinearGradient colors={[...HERO_GRADIENT]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
          <Sphere3D size={220} tone="saffron" style={{ right: -60, top: 90 }} />
          <Sphere3D size={64} tone="lilac" style={{ left: 46, top: 170 }} />
          <Sphere3D size={140} tone="gold" style={{ left: -40, bottom: 140 }} />
          <Sphere3D size={34} tone="mint" style={{ right: 54, bottom: 230 }} />
        </Animated.View>
      ) : null}
      <Animated.View style={blockStyle}>
        <Animated.View style={logoStyle}>
          <RNImage
            source={images.logo}
            style={[{ width: logoSize, height: logoSize, borderRadius: logoSize / 2 }, violet ? styles.logoRing : null]}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={textStyle}>
          <Text
            style={[
              theme.typography.screenTitle,
              violet ? styles.titleViolet : styles.title,
              { color: titleColor, fontSize: size(violet ? 34 : 30, 24, 38), marginTop: size(24, 16, 32) },
            ]}
            maxFontSizeMultiplier={1.2}>
            {violet ? 'Mountain Bakes' : 'MOUNTAIN BAKES'}
          </Text>
          {violet ? (
            <Text style={[styles.taglineViolet, { color: taglineColor, fontSize: size(12, 11, 14), marginTop: size(8, 6, 12) }]} maxFontSizeMultiplier={1.2}>
              FRESH · QUALITY · EVERY DAY
            </Text>
          ) : (
            <Text
              style={[theme.typography.bodySmall, styles.tagline, { color: taglineColor, fontSize: size(15, 13, 18), marginTop: size(8, 6, 12) }]}
              maxFontSizeMultiplier={1.2}>
              Fresh <Text style={{ color: theme.colors.primary }}>•</Text> Quality <Text style={{ color: theme.colors.primary }}>•</Text> Every Day
            </Text>
          )}

          <View style={{ marginTop: size(40, 28, 56), alignItems: 'center' }}>
            <PulsingDot color={loaderColor} size={size(10, 8, 12)} reduceMotion={reduceMotion} />
            {/* "Loading…" until a step has run 1.5s+ (authStore's
                `timeBootstrapStep`), then a friendly message for what's
                actually taking a while — never a raw step name like
                "sessionRefresh" (dev builds log that to the console instead,
                see authStore.ts). Never blank: a normal, fast boot still
                reads "Loading…" the whole time it's on screen. */}
            <Text
              style={[theme.typography.label, { color: violet ? 'rgba(255,255,255,0.6)' : theme.colors.textFaint, marginTop: 10, fontSize: size(13, 12, 15) }]}
              maxFontSizeMultiplier={1.2}>
              {bootstrapMessage ?? 'Loading…'}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Screen>
  );
}

/** The pulsing orange dot from the original spec — a plain `ActivityIndicator` reads as a generic "loading fragment", not this screen's own loader. */
function PulsingDot({ color, size, reduceMotion }: { color: string; size: number; reduceMotion: boolean }) {
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
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', letterSpacing: 2, fontWeight: '700' },
  tagline: { textAlign: 'center' },
  titleViolet: { textAlign: 'center', letterSpacing: -0.5, fontWeight: '600' },
  taglineViolet: { textAlign: 'center', letterSpacing: 2.4, fontWeight: '600' },
  logoRing: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
});
