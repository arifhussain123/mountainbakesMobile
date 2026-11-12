import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAppTheme, useResponsive } from '@/shared/theme';
import type { OnboardingSlideContent } from '../onboardingContent';
import { FeatureStrip } from './FeatureStrip';
import { OnboardingArt } from './OnboardingArt';

export interface OnboardingSlideProps {
  content: OnboardingSlideContent;
  /** The pager page's width — this slide must fill it exactly for horizontal paging to land cleanly. */
  width: number;
  /** Only the currently-focused slide animates in — keeps off-screen slides from firing their entrance mid-swipe. */
  active: boolean;
}

/**
 * One onboarding page (redesign B02/B02b): the rounded tinted art panel, then
 * a big sentence-case headline, the body and the feature chips. Paging, the
 * CTA, the dots and Skip live in `OnboardingScreen`, outside the pager.
 *
 * Sized from `useResponsive()`: the art panel is 340pt on a roomy phone and
 * gives way first on a short screen; if text still doesn't fit (large system
 * font), the slide scrolls rather than overlapping the pinned CTA.
 */
export function OnboardingSlide({ content, width, active }: OnboardingSlideProps) {
  const theme = useAppTheme();
  const { size, clamp, usableHeight } = useResponsive();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? 0 : 12);

  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    opacity.value = withTiming(1, { duration: 320 });
    translateY.value = withTiming(0, { duration: 320 });
  }, [active, opacity, reduceMotion, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const accessibleHeadline = `${content.headline.map((line) => line.text).join(' ')}.`;
  const artHeight = clamp(200, usableHeight * 0.42, 340);
  const headlineSize = size(36, 30, 42);

  return (
    <View style={{ width, flex: 1 }}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.slide} showsVerticalScrollIndicator={false} bounces={false}>
        <OnboardingArt art={content.art} height={artHeight} />
        <Animated.View style={[styles.text, animatedStyle]}>
          <Text
            accessibilityRole="header"
            accessibilityLabel={accessibleHeadline}
            maxFontSizeMultiplier={1.2}
            style={[styles.headline, { color: theme.colors.text, fontSize: headlineSize, lineHeight: Math.round(headlineSize * 1.17) }]}>
            {content.headline.map((line, i) => (
              <Text key={i} style={line.accent ? { color: theme.colors.primary } : undefined}>
                {line.text}
                {i < content.headline.length - 1 ? '\n' : ''}
              </Text>
            ))}
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={[styles.body, { color: theme.colors.textSecondary }]}>
            {content.body}
          </Text>
          {content.features ? <FeatureStrip features={content.features} /> : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  slide: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  text: { gap: 14, paddingTop: 28 },
  headline: { fontWeight: '600', letterSpacing: -1 },
  body: { fontSize: 15, lineHeight: 22 },
});
