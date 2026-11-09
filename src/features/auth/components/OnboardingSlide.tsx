import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { images } from '@/assets';
import { useAppTheme } from '@/shared/theme';
import type { OnboardingPage } from '../onboardingContent';
import { FeatureStrip } from './FeatureStrip';

export interface OnboardingSlideProps {
  page: OnboardingPage;
  /** The pager's page width — the slide fills exactly one page. */
  width: number;
  /** Plays the enter animation the first time it becomes true. */
  active?: boolean;
  /** Skips the fade/translate when the OS asks for reduced motion. */
  reduceMotion?: boolean;
  testID?: string;
}

const ENTER_DURATION_MS = 320;

/**
 * One onboarding page: logo, three-line headline, body copy and — when the page
 * has `features` — the feature strip. The button, pager dots and Skip live in
 * the screen, pinned to the bottom, so every page shares them.
 *
 * Scales itself for small devices (iPhone SE class): a smaller logo and a
 * 27sp headline instead of 32sp, so nothing scrolls.
 */
export function OnboardingSlide({
  page,
  width,
  active = true,
  reduceMotion = false,
  testID,
}: OnboardingSlideProps) {
  const { colors, typography } = useAppTheme();
  const { height } = useWindowDimensions();
  const compact = height < 700 || width < 360;

  const logoSize = Math.round(page.logoSize * (compact ? 0.82 : 1));
  const headlineSize = compact ? 27 : typography.brandHeadline.fontSize;
  const headlineLineHeight = Math.round(headlineSize * 1.1);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!active || entered) return;
    setEntered(true);
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ENTER_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: ENTER_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, entered, reduceMotion, opacity, translateY]);

  const lastLine = page.headline.length - 1;

  return (
    <View style={[styles.slide, { width }]} testID={testID}>
      <Image
        source={images.logo}
        style={[
          styles.logo,
          { width: logoSize, height: logoSize, borderRadius: logoSize / 2 },
        ]}
        resizeMode="contain"
        accessible
        accessibilityLabel="Mountain Bakes"
      />
      {/* The flexible gap lets the content block sit lower on the last page (no feature strip to fill the space). */}
      <View style={styles.spacer} />
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Text
          accessibilityRole="header"
          accessibilityLabel={page.headlineLabel}
          style={[
            typography.brandHeadline,
            styles.headline,
            {
              color: colors.textPrimary,
              fontSize: headlineSize,
              lineHeight: headlineLineHeight,
            },
          ]}
          maxFontSizeMultiplier={1.3}
          testID={testID ? `${testID}-headline` : undefined}
        >
          {page.headline.map((line, index) => (
            <Text
              key={line.text}
              style={line.accent ? { color: colors.accent } : undefined}
            >
              {line.text}
              {index < lastLine ? '\n' : ''}
            </Text>
          ))}
        </Text>
        <Text
          style={[
            typography.brandBody,
            styles.body,
            { color: colors.textMuted },
          ]}
          maxFontSizeMultiplier={1.3}
          testID={testID ? `${testID}-body` : undefined}
        >
          {page.body}
        </Text>
        {page.features ? (
          <FeatureStrip
            features={page.features}
            testID={testID ? `${testID}-features` : undefined}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 24,
  },
  logo: {
    alignSelf: 'center',
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
  headline: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    alignSelf: 'center',
    maxWidth: 300,
    marginTop: 16,
    marginBottom: 20,
  },
});
