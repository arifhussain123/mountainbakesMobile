import { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { Routes, type AuthStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { PillButton, Screen } from '@/shared/ui';
import { OnboardingSlide } from './components/OnboardingSlide';
import { PagerDots } from './components/PagerDots';
import { ONBOARDING_SLIDES, type OnboardingSlideContent } from './onboardingContent';

export const ONBOARDING_SEEN_KEY = 'mountainbakes.onboardingSeen';

const SLIDE_WIDTH = Dimensions.get('window').width;
const SLIDE_COUNT = ONBOARDING_SLIDES.length;

/**
 * branchApp.md screens 02/02b — shown once, behind an AsyncStorage "seen"
 * flag. 3-page swipeable pager (see onboardingContent.ts for which slides are
 * real design-file copy vs. placeholder).
 */
export function OnboardingScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [index, setIndex] = useState(0);
  const listRef = useRef<Animated.FlatList<OnboardingSlideContent>>(null);
  const scrollProgress = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollProgress.value = event.contentOffset.x / SLIDE_WIDTH;
  });

  const finish = useCallback(() => {
    void AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    navigation.replace(Routes.LOGIN);
  }, [navigation]);

  const announcePage = useCallback((page: number) => {
    AccessibilityInfo.announceForAccessibility(`Page ${page + 1} of ${SLIDE_COUNT}`);
  }, []);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      listRef.current?.scrollToOffset({ offset: nextIndex * SLIDE_WIDTH, animated: true });
      setIndex(nextIndex);
      announcePage(nextIndex);
    },
    [announcePage],
  );

  const handleNext = useCallback(() => {
    if (index < SLIDE_COUNT - 1) goToIndex(index + 1);
    else finish();
  }, [index, goToIndex, finish]);

  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH);
      setIndex(nextIndex);
      announcePage(nextIndex);
    },
    [announcePage],
  );

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (index > 0) {
          goToIndex(index - 1);
          return true;
        }
        return false;
      });
      return () => subscription.remove();
    }, [index, goToIndex]),
  );

  const currentSlide = ONBOARDING_SLIDES[index];

  return (
    <Screen glow="warm" contentStyle={styles.container}>
      <Animated.FlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item, index: slideIndex }) => (
          <OnboardingSlide content={item} width={SLIDE_WIDTH} active={slideIndex === index} />
        )}
        style={styles.list}
      />

      <View style={styles.footer}>
        <PillButton label={currentSlide.cta} onPress={handleNext} showArrow testID="onboarding-next" />

        <View style={styles.pagerRow} accessibilityLabel={`Page ${index + 1} of ${SLIDE_COUNT}`}>
          <PagerDots count={SLIDE_COUNT} scrollProgress={scrollProgress} />
        </View>

        {currentSlide.showSkip ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Skip onboarding" onPress={finish} style={styles.skip}>
            <Text style={[styles.skipLabel, { color: theme.colors.primary }]}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skip} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  list: { flex: 1 },
  footer: { paddingHorizontal: 26, paddingBottom: 12 },
  pagerRow: { marginTop: 16, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  skip: { marginTop: 4, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skipLabel: { fontSize: 14, fontWeight: '700' },
});
