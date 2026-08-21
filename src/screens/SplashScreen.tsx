import React, { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import RNBootSplash from 'react-native-bootsplash';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { logoFor } from '@/assets/logo';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme, useThemeContext } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';

/**
 * The splash the app itself draws, behind the native one.
 *
 * ---------------------------------------------------------------------------
 * Two splashes, and why
 * ---------------------------------------------------------------------------
 * `react-native-bootsplash` owns the first frames — the window is up before any
 * JavaScript has run, so nothing React draws can appear there. It shows the logo
 * on a flat background, because that is all the platform allows: on API 31+ the
 * splash background is `android:windowSplashScreenBackground`, which takes a
 * colour and not a drawable.
 *
 * This one renders underneath it and takes over the moment it lifts. It exists
 * because the native splash cannot show anything conditional: it is a static
 * drawable, so it cannot carry the wordmark in the right scheme, cannot hold a
 * gradient, cannot animate, and cannot become a retry button when startup fails.
 *
 * ---------------------------------------------------------------------------
 * It dismisses the native splash itself, and that is the point
 * ---------------------------------------------------------------------------
 * `hide()` used to be called at the END of bootstrap, from `App.tsx`. Everything
 * below was therefore drawn and thrown away without ever reaching a screen: the
 * app became ready and the native splash lifted in the same tick, so what the
 * fade revealed was the dashboard. The gradient, the bloom and the animation
 * were all invisible on every successful launch.
 *
 * Hiding on mount instead means the native splash comes down as soon as React
 * can draw, and this screen carries the rest of boot — which is the only reason
 * any of it is worth drawing.
 *
 * There is no minimum display time here on purpose. Holding the brand up for a
 * fixed beat would put a delay in front of someone who opened the app to ring up
 * a sale; a fast boot showing this briefly is the correct outcome, not a bug.
 *
 * ---------------------------------------------------------------------------
 * The animation
 * ---------------------------------------------------------------------------
 * A slow rise and settle — the mark lifts a few points as it fades in, and the
 * words follow. It is meant to read as proving rather than as a UI transition,
 * and it is deliberately under half a second: this sits in front of someone who
 * opened the app to ring up a sale, and a splash that performs is a splash that
 * is in the way.
 *
 * It is skipped entirely under Reduce Motion, which is not a nicety — a scale
 * animation is a common migraine and nausea trigger, and this one is unavoidable
 * because it happens before the app can be used.
 */

const TAGLINE = 'Fresh • Quality • Every Day';

export function SplashScreen(): React.ReactElement {
  const theme = useTheme();
  const { scheme } = useThemeContext();
  const reduceMotion = useReducedMotion();

  // Start at the finished value when motion is reduced, so nothing moves and
  // there is no frame where the screen is blank.
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const words = useSharedValue(reduceMotion ? 1 : 0);

  // Bring the native splash down as soon as this has something to show. The
  // fade is ~220ms and the entrance below runs 440ms, so the two overlap and
  // what the fade reveals is the wordmark still arriving rather than a screen
  // that already finished moving.
  //
  // Failure is ignored: `App.tsx` calls this again as a backstop, and "already
  // hidden" is the expected rejection rather than a fault.
  useEffect(() => {
    RNBootSplash.hide({ fade: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      words.value = 1;
      return;
    }
    progress.value = withTiming(1, theme.motion.timing.sheet);
    // The wordmark follows the logo rather than arriving with it: the two
    // landing together reads as one block appearing, which is a page load. Read
    // in sequence it reads as an introduction.
    words.value = withDelay(120, withTiming(1, theme.motion.timing.sheet));
  }, [reduceMotion, progress, words, theme.motion.timing.sheet]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: 0.94 + progress.value * 0.06 },
      { translateY: (1 - progress.value) * 10 },
    ],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: words.value,
    transform: [{ translateY: (1 - words.value) * 6 }],
  }));

  return (
    <View
      // `splashTop` under the SVG as well, so the frame between this View
      // mounting and the SVG's first paint is the gradient's own top colour
      // rather than a white flash.
      style={[styles.root, { backgroundColor: theme.colors.splashTop }]}
      accessible
      accessibilityRole="header"
      // One announcement for the whole screen. A reader walking a logo, a
      // wordmark and a tagline as three nodes says the brand name twice.
      accessibilityLabel={`Mountain Bakes. ${TAGLINE}. Starting.`}>
      {/*
        The wash. A vertical gradient with a warm bloom centred behind the mark —
        the bloom is what stops the gradient reading as a flat panel, and sitting
        it slightly above centre puts the brightest point under the logo rather
        than under the words.

        Static, both of them. Nothing here animates: an animated background is
        decoration, and on this screen it would also be competing with the one
        thing that is meant to be read.
      */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="splashWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.splashTop} />
            <Stop offset="1" stopColor={theme.colors.splashBottom} />
          </LinearGradient>
          <RadialGradient id="splashBloom" cx="50%" cy="42%" r="62%">
            <Stop offset="0" stopColor={theme.colors.splashGlow} stopOpacity={0.24} />
            <Stop offset="1" stopColor={theme.colors.splashGlow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#splashWash)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#splashBloom)" />
      </Svg>

      <Animated.View style={markStyle}>
        <Image
          source={logoFor(scheme)}
          style={styles.logo}
          resizeMode="contain"
          // Android's default 300ms cross-fade is for an image arriving over a
          // network. This one ships in the APK, and fading it in on the launch
          // screen puts a delay in front of the first thing the user sees.
          fadeDuration={0}
          // The wordmark below already says it; the image is decorative here.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Animated.View>

      <Animated.View style={[styles.words, wordStyle]}>
        {/* `accent` rather than `primary` — both are readable here now that the
            brand is brown, and accent is the darker of the two, which is what
            the wordmark wants against a wash it sits directly on. */}
        <Text style={[theme.type.display, styles.center, { color: theme.colors.accent }]}>
          Mountain Bakes
        </Text>
        {/* v4 sets the tagline in the serif, italic, in the brand brown — the
            one italic in the app. See `type.tagline`. */}
        <Text style={[theme.type.tagline, styles.center, { color: theme.colors.accent }]}>
          {TAGLINE}
        </Text>
      </Animated.View>

      {/*
        The progress ring.

        It reports that boot is genuinely in flight and stops the moment this
        screen unmounts, which is the condition `theme/motion.ts` puts on the
        only two loops in the app. `ActivityIndicator` rather than a hand-rolled
        rotation: the platform indicator already honours Reduce Motion and the
        system animator scale, and a Reanimated loop here would have to
        reimplement both — on the one screen where a dropped frame is most
        visible, because nothing else is moving.

        Inside the screen's single `accessible` wrapper, so it adds nothing to
        the announcement; the label already ends with "Starting."
      */}
      <Animated.View style={[styles.progress, wordStyle]}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={[theme.type.label, styles.center, { color: theme.colors.textMuted }]}>
          Loading…
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xxl },
  /**
   * 171, and it is the **native** splash that sets this number, not v4.
   *
   * v4 draws the mark at 196. This screen cannot: it takes over from the Android
   * boot splash mid-boot, and if the two draw the badge at different sizes the
   * hand-off is a visible jump in scale — the same defect
   * `scripts/check-splash-colour.sh` exists to prevent on the background colour.
   *
   * The native side is capped. Android 12 masks the splash icon to a 192dp
   * circle on a 288dp canvas, and `assets/bootsplash_logo.png` spends ~11% of
   * its width on the pale rim, so the largest badge the boot splash can draw is
   * 192 × 0.889 ≈ **170.8dp** — measured, not derived from the spec. Rounding to
   * 171 makes the two sides equal and the hand-off invisible.
   *
   * Raising this to v4's 196 means the badge grows ~15% the instant this screen
   * mounts. Lowering the native side instead is worse: it was 112dp before, and
   * that was an 84% jump.
   */
  logo: { width: 171, height: 171 },
  words: { alignItems: 'center', gap: space.sm },
  progress: { alignItems: 'center', gap: space.md },
  center: { textAlign: 'center' },
});
