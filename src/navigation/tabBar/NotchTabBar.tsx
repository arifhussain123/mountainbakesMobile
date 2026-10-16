import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { openDrawer } from '../helpers';
import { TAB_ITEMS } from '../tabItems';
import { useNavBadges } from '../useNavBadges';
import { useOfflineQueueStore } from '@/state';
import { useAppTheme } from '@/shared/theme';
import { buildNotchBarPath, clampNotchX } from './notchPath';
import { ActiveBubble } from './ActiveBubble';
import { TabItem } from './TabItem';
import { useTabBarVisibility } from './useTabBarVisibility';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const BAR_HEIGHT = 68;
const SIDE_MARGIN = 12;
const NOTCH_WIDTH = 80;
const NOTCH_DEPTH = 30;
const CORNER_RADIUS = 24;

/**
 * Custom `tabBar` for the bottom tab navigator — a notch cut into the bar's
 * top edge that slides to the active tab, with a raised orange bubble sitting
 * in it. No third-party tab-bar library; the whole bar is one SVG path plus
 * absolutely-positioned tab slots.
 */
export function NotchTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const badges = useNavBadges();
  const failedSync = useOfflineQueueStore((s) => s.failedCount > 0);
  const visible = useTabBarVisibility();

  const [barWidth, setBarWidth] = useState(0);
  const slotWidth = barWidth / TAB_ITEMS.length;
  const focusedRouteName = state.routes[state.index]?.name;
  const focusedTabIndex = TAB_ITEMS.findIndex((t) => t.route === focusedRouteName);
  const activeIndex = focusedTabIndex >= 0 ? focusedTabIndex : 0;

  const notchX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (barWidth === 0) return;
    const target = clampNotchX(slotWidth * (activeIndex + 0.5), barWidth, NOTCH_WIDTH, CORNER_RADIUS);
    notchX.value = reduceMotion ? target : withSpring(target, { damping: 18, stiffness: 180, overshootClamping: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, barWidth]);

  useEffect(() => {
    const target = visible ? 0 : BAR_HEIGHT + insets.bottom + 24;
    translateY.value = reduceMotion ? target : withTiming(target, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animatedProps = useAnimatedProps(() => ({
    d: buildNotchBarPath({
      width: barWidth || 1,
      height: BAR_HEIGHT,
      notchX: notchX.value,
      notchWidth: NOTCH_WIDTH,
      notchDepth: NOTCH_DEPTH,
      cornerRadius: CORNER_RADIUS,
    }),
  }));

  const containerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const handlePress = (index: number) => {
    const item = TAB_ITEMS[index]!;
    if (item.route === null) {
      // "More" — opens the drawer, never becomes the active tab.
      openDrawer();
      return;
    }
    const event = navigation.emit({ type: 'tabPress', target: state.routes[index]?.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      // Pressing the already-active tab resets its stack to the initial
      // screen — @react-navigation/bottom-tabs' own default `navigate`
      // behavior, not something this bar has to implement itself.
      navigation.navigate(item.route);
    }
  };

  const handlePressIn = () => {
    ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: false, ignoreAndroidSystemSettings: false });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
        { marginHorizontal: SIDE_MARGIN, marginBottom: Math.max(insets.bottom, 8) },
      ]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
      {barWidth > 0 ? (
        <Svg width={barWidth} height={BAR_HEIGHT} style={StyleSheet.absoluteFill}>
          <AnimatedPath animatedProps={animatedProps} fill={theme.colors.surface} stroke={theme.colors.border} strokeWidth={1} />
        </Svg>
      ) : null}

      <View style={styles.row}>
        {TAB_ITEMS.map((item, index) => {
          const isActive = index === activeIndex && item.route !== null;
          const label = descriptors[state.routes[index]?.key ?? '']?.options.title ?? item.label;
          return (
            <TabItem
              key={item.key}
              label={label}
              icon={item.icon}
              active={isActive}
              badgeCount={item.badgeSource ? badges[item.badgeSource] : undefined}
              isMore={item.route === null}
              onPress={() => handlePress(index)}
              onPressIn={handlePressIn}
            />
          );
        })}
      </View>

      {barWidth > 0 ? (
        <ActiveBubble notchX={notchX} icon={TAB_ITEMS[activeIndex]!.icon} showDot={failedSync && TAB_ITEMS[activeIndex]!.key === 'orders'} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BAR_HEIGHT,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  row: { flex: 1, flexDirection: 'row' },
});
