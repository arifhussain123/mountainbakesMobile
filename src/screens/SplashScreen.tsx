import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

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
 * on the theme background and is torn down with a fade once bootstrap settles.
 *
 * This one renders underneath it and takes over the moment it lifts. It exists
 * because the native splash cannot show anything conditional: it is a static
 * drawable, so it cannot carry the wordmark in the right scheme, cannot animate,
 * and cannot become a retry button when startup fails.
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
      style={[styles.root, { backgroundColor: theme.colors.bg }]}
      accessible
      accessibilityRole="header"
      // One announcement for the whole screen. A reader walking a logo, a
      // wordmark and a tagline as three nodes says the brand name twice.
      accessibilityLabel={`Mountain Bakes. ${TAGLINE}. Starting.`}>
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
        {/* `accent`, not `primary`: primary is the fill orange at 2.85:1 on this
            background, which is under the bar for large text. */}
        <Text style={[theme.type.display, styles.center, { color: theme.colors.accent }]}>
          Mountain Bakes
        </Text>
        <Text style={[theme.type.label, styles.center, { color: theme.colors.textMuted }]}>
          {TAGLINE}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xxl },
  logo: { width: 112, height: 112 },
  words: { alignItems: 'center', gap: space.sm },
  center: { textAlign: 'center' },
});
