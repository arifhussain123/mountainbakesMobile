import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Image as RNImage,
  StyleSheet,
  Text,
} from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Screen } from '@/shared/ui/Screen';
import { images } from '@/assets';

/**
 * Shown while `authStore.bootstrap()` checks the keychain for a session —
 * mountainbakesBranch.html screen 01 on the Charcoal/Orange tokens: the warm
 * top-right glow, the logo, the Space Grotesk wordmark, the tagline with
 * accent bullets, a spinner and a softly pulsing "Loading…" caption. The
 * native bootsplash uses the same `colors.bg`, so the hand-off is seamless.
 */
export function SplashView() {
  const { colors, typography } = useAppTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotion => {
        if (cancelled || reduceMotion) return;
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 0.35,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        ).start();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      pulse.stopAnimation();
    };
  }, [pulse]);

  return (
    <Screen glow="warm" contentStyle={styles.container}>
      <RNImage
        source={images.logo}
        style={styles.logo}
        resizeMode="contain"
        accessible
        accessibilityLabel="Mountain Bakes"
      />
      <Text
        style={[
          typography.brandWordmark,
          styles.wordmark,
          { color: colors.textPrimary },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.3}
      >
        Mountain Bakes
      </Text>
      <Text
        style={[
          typography.brandBody,
          styles.tagline,
          { color: colors.textMuted },
        ]}
        maxFontSizeMultiplier={1.3}
      >
        Fresh <Text style={{ color: colors.accent }}>•</Text> Quality{' '}
        <Text style={{ color: colors.accent }}>•</Text> Every Day
      </Text>
      <ActivityIndicator style={styles.spinner} color={colors.accent} />
      <Animated.Text
        style={[
          typography.brandCaption,
          styles.caption,
          { color: colors.textMuted, opacity: pulse },
        ]}
        accessibilityLiveRegion="polite"
      >
        Loading…
      </Animated.Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  logo: { width: 160, height: 160, borderRadius: 80 },
  wordmark: { marginTop: 28, textAlign: 'center' },
  tagline: { marginTop: 14, textAlign: 'center' },
  spinner: { marginTop: 30 },
  caption: { marginTop: 14 },
});
