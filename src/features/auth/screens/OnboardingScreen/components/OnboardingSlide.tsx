import { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { images } from '@/assets';
import { useAppTheme } from '@/shared/theme';
import type { OnboardingSlideContent } from '../onboardingContent';
import { FeatureStrip } from './FeatureStrip';

export interface OnboardingSlideProps {
  content: OnboardingSlideContent;
  /** The pager page's width — this slide must fill it exactly for horizontal paging to land cleanly. */
  width: number;
  /** Only the currently-focused slide animates in — keeps off-screen slides from firing their entrance mid-swipe. */
  active: boolean;
}

/**
 * One onboarding page's content — logo, headline, body, optional feature
 * strip. Pure/presentational: paging, the CTA button, dots and Skip live in
 * `OnboardingScreen` so they stay pinned to the bottom, outside the
 * horizontally-scrolling pager, while only this content area flexes.
 */
export function OnboardingSlide({ content, width, active }: OnboardingSlideProps) {
  const theme = useAppTheme();
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

  return (
    <View style={[styles.slide, { width }]}>
      <Image source={images.logo} style={styles.logo} resizeMode="contain" />
      <View style={styles.spacer} />
      <Animated.View style={animatedStyle}>
        <Text
          accessibilityLabel={accessibleHeadline}
          style={[theme.typography.screenTitle, styles.headline, { color: theme.colors.text, fontSize: 32, lineHeight: 36 }]}>
          {content.headline.map((line, i) => (
            <Text key={i} style={line.accent ? { color: theme.colors.primary } : undefined}>
              {line.text.toUpperCase()}
              {i < content.headline.length - 1 ? '\n' : ''}
            </Text>
          ))}
        </Text>
        <Text style={[theme.typography.body, styles.body, { color: theme.colors.textSecondary }]}>{content.body}</Text>
        {content.features ? (
          <View style={styles.featureStrip}>
            <FeatureStrip features={content.features} />
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const isSmallDevice = SCREEN_WIDTH <= 375;

const styles = StyleSheet.create({
  slide: { flex: 1, paddingHorizontal: 26, paddingTop: 8 },
  logo: { width: 110, height: 110, borderRadius: 55, alignSelf: 'center', marginTop: 24 },
  spacer: { flex: 1 },
  headline: {
    fontSize: isSmallDevice ? 26 : 32,
    lineHeight: isSmallDevice ? 29 : 35,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  body: { textAlign: 'center', marginTop: 16, alignSelf: 'center', maxWidth: 300 },
  featureStrip: { marginTop: 20 },
});
