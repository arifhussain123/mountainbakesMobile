import { useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { images } from '@/assets';
import { useAppTheme, useResponsive } from '@/shared/theme';
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
 *
 * Sized entirely from `useResponsive()` — see that module and the task notes
 * on `OnboardingScreen` for the size ranges. On a very short screen or a
 * large system font, the content scrolls rather than overlapping the bottom
 * button group, which is pinned outside this component.
 */
export function OnboardingSlide({ content, width, active }: OnboardingSlideProps) {
  const theme = useAppTheme();
  const { sw, sh, ms, clamp, isShort, usableHeight } = useResponsive();
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

  const logoSize = clamp(80, Math.min(sw(110), usableHeight * 0.15), 140);
  const headlineSize = isShort ? clamp(26, ms(26), 40) : clamp(26, ms(32), 40);

  return (
    <View style={{ width, flex: 1 }}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.slide, { paddingTop: sh(8) }]}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <Image source={images.logo} style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 2, alignSelf: 'center', marginTop: sh(24) }} resizeMode="contain" />
        <View style={styles.spacer} />
        <Animated.View style={animatedStyle}>
          <Text
            accessibilityLabel={accessibleHeadline}
            style={[theme.typography.screenTitle, styles.headline, { color: theme.colors.text, fontSize: headlineSize, lineHeight: headlineSize * 1.1 }]}>
            {content.headline.map((line, i) => (
              <Text key={i} style={line.accent ? { color: theme.colors.primary } : undefined}>
                {line.text.toUpperCase()}
                {i < content.headline.length - 1 ? '\n' : ''}
              </Text>
            ))}
          </Text>
          <Text
            style={[
              theme.typography.body,
              styles.body,
              { color: theme.colors.textSecondary, fontSize: clamp(13, ms(14), 16), maxWidth: Math.min(width - 48, 340), marginTop: sh(16) },
            ]}>
            {content.body}
          </Text>
          {content.features ? (
            <View style={{ marginTop: sh(20), width: '100%' }}>
              <FeatureStrip features={content.features} />
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  slide: { flexGrow: 1, paddingHorizontal: 26 },
  spacer: { flex: 1 },
  headline: { textTransform: 'uppercase', textAlign: 'center' },
  body: { textAlign: 'center', alignSelf: 'center' },
});
