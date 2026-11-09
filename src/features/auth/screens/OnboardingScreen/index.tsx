import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Routes } from '@/navigation/routes';
import type { AuthStackParamList } from '@/navigation/types';
import { useAppTheme } from '@/shared/theme';
import { PillButton } from '@/shared/ui/PillButton';
import { Screen } from '@/shared/ui/Screen';
import { useAuthStore } from '@/state';
import { OnboardingSlide, PagerDots } from '../../components';
import {
  ONBOARDING_PAGES,
  ONBOARDING_PAGE_COUNT,
  type OnboardingPage,
} from '../../onboardingContent';
import { SKIP_SLOT_HEIGHT, styles } from './styles';

/**
 * branchApp.md screens 02 / 02b — a three-page horizontal pager shown once
 * (behind `authStore.onboardingCompleted`). Swiping and Next both move pages;
 * Skip (pages 1–2) and Get Started (page 3) persist the flag and reset the
 * Auth stack to Login, so Back cannot return here.
 */
export function OnboardingScreen() {
  const { colors, typography } = useAppTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { width } = useWindowDimensions();
  const completeOnboarding = useAuthStore(state => state.completeOnboarding);

  const listRef = useRef<FlatList<OnboardingPage>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const finishing = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  const isLast = index === ONBOARDING_PAGE_COUNT - 1;
  const page = ONBOARDING_PAGES[index]!;

  const goTo = useCallback(
    (next: number) => {
      listRef.current?.scrollToIndex({ index: next, animated: !reduceMotion });
      setIndex(next);
    },
    [reduceMotion],
  );

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    await completeOnboarding();
    navigation.reset({ index: 0, routes: [{ name: Routes.LOGIN }] });
  }, [completeOnboarding, navigation]);

  const handleNext = useCallback(() => {
    if (isLast) void finish();
    else goTo(index + 1);
  }, [finish, goTo, index, isLast]);

  // Android hardware back: previous page on pages 2–3; on page 1 let the OS exit the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (index === 0) return false;
        goTo(index - 1);
        return true;
      },
    );
    return () => subscription.remove();
  }, [goTo, index]);

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const next = Math.round(
      event.nativeEvent.contentOffset.x / Math.max(width, 1),
    );
    if (next !== index)
      setIndex(Math.min(Math.max(next, 0), ONBOARDING_PAGE_COUNT - 1));
  };

  // Skip fades out and its slot collapses on the way to the last page, so the
  // last page has neither a Skip link nor a blank gap where it used to be.
  const lastPageStart = (ONBOARDING_PAGE_COUNT - 2) * Math.max(width, 1);
  const lastPageEnd = (ONBOARDING_PAGE_COUNT - 1) * Math.max(width, 1);
  const skipOpacity = scrollX.interpolate({
    inputRange: [lastPageStart, lastPageEnd],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const skipSlotHeight = scrollX.interpolate({
    inputRange: [lastPageStart, lastPageEnd],
    outputRange: [SKIP_SLOT_HEIGHT, 0],
    extrapolate: 'clamp',
  });

  return (
    <Screen glow="warm" edges={['top', 'bottom']}>
      <FlatList
        ref={listRef}
        data={ONBOARDING_PAGES}
        keyExtractor={item => item.key}
        renderItem={({ item, index: itemIndex }) => (
          <OnboardingSlide
            page={item}
            width={width}
            active={itemIndex === index}
            reduceMotion={reduceMotion}
            testID={`onboarding-page-${itemIndex + 1}`}
          />
        )}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={ONBOARDING_PAGE_COUNT}
        removeClippedSubviews={false}
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        style={styles.pager}
        testID="onboarding-pager"
      />

      <View style={styles.bottom}>
        <PillButton
          label={page.cta}
          onPress={handleNext}
          testID="onboarding-next"
          accessibilityHint={
            isLast
              ? 'Finishes the introduction and opens sign in'
              : 'Shows the next page'
          }
        />
        <PagerDots
          count={ONBOARDING_PAGE_COUNT}
          scrollX={scrollX}
          pageWidth={width}
          activeIndex={index}
          testID="onboarding-dots"
        />
        <Animated.View
          style={[
            styles.skipSlot,
            { height: skipSlotHeight, opacity: skipOpacity },
          ]}
          pointerEvents={isLast ? 'none' : 'auto'}
          importantForAccessibility={isLast ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={isLast}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
            onPress={() => void finish()}
            hitSlop={8}
            style={styles.skip}
            testID="onboarding-skip"
          >
            <Text style={[typography.brandLink, { color: colors.accent }]}>
              Skip
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Screen>
  );
}
