import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Animated, {
  runOnJS,
  useAnimatedReaction,
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
import { BAR_CONTENT_HEIGHT, computeTabBarHideOffset, CORNER_RADIUS, getTabBarLayout } from './tabBarLayout';
import { ActiveBubble } from './ActiveBubble';
import { TabItem } from './TabItem';
import { useTabBarVisibility } from './useTabBarVisibility';

/**
 * Custom `tabBar` for the bottom tab navigator — a notch cut into the bar's
 * top edge that slides to the active tab, with a raised orange bubble sitting
 * in it. No third-party tab-bar library; the whole bar is one SVG path plus
 * absolutely-positioned tab slots.
 *
 * Full-bleed, edge-to-edge overlay: `position: 'absolute'`, flush to all
 * three screen edges, no side margins, no floating shadow. Its own height is
 * `BAR_CONTENT_HEIGHT + insets.bottom` and the SVG fill extends the whole way
 * down, so the bar's own background — not any other color — sits behind the
 * Android 3-button/gesture nav area and the iOS home indicator. Because it's
 * an overlay (not a normal flex sibling reserving its own space). a tab-root
 * screen's scrollable content must pad itself by `useTabBarHeight()` or its
 * last item would sit behind the bar.
 */
export function NotchTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const badges = useNavBadges();
  const failedSync = useOfflineQueueStore((s) => s.failedCount > 0);
  const visible = useTabBarVisibility();

  const tabCount = TAB_ITEMS.length;
  const { tabWidth, bubbleSize, iconSize, notchWidth, notchDepth } = getTabBarLayout(width, tabCount);
  const totalBarHeight = BAR_CONTENT_HEIGHT + insets.bottom;

  const focusedRouteName = state.routes[state.index]?.name;
  const focusedTabIndex = TAB_ITEMS.findIndex((t) => t.route === focusedRouteName);
  const activeIndex = focusedTabIndex >= 0 ? focusedTabIndex : 0;

  const initialNotchX = clampNotchX(tabWidth * (activeIndex + 0.5), width, notchWidth, CORNER_RADIUS);
  const notchX = useSharedValue(initialNotchX);
  const translateY = useSharedValue(0);

  // The bar's `d` is plain React state, not `useAnimatedProps` on an
  // `Animated.createAnimatedComponent(Path)` — this bar used to drive it that
  // way and the notch silently never rendered on a real device (the bubble
  // still moved correctly, since that's a transform on an Animated.View, but
  // the SVG path's own cut never appeared): an AnimatedProps `d` string update
  // on a native SVG element isn't reliably applied through Reanimated on this
  // react-native-svg/reanimated/Fabric combination. `useAnimatedReaction` +
  // `runOnJS` sidesteps that native-prop interop entirely — the path string is
  // computed on the UI thread (worklet) every time `notchX` changes and handed
  // to a normal JS-thread `setState`, so the `<Path d={...}>` re-render uses
  // the same plain prop-setting React already reconciles correctly everywhere
  // else. The spring only runs for ~300ms on an infrequent tab switch, so the
  // extra JS-thread re-renders during that window cost nothing noticeable.
  const [pathD, setPathD] = useState(() =>
    buildNotchBarPath({ width, height: totalBarHeight, notchX: initialNotchX, notchWidth, notchDepth, cornerRadius: CORNER_RADIUS }),
  );

  useEffect(() => {
    const target = clampNotchX(tabWidth * (activeIndex + 0.5), width, notchWidth, CORNER_RADIUS);
    notchX.value = reduceMotion ? target : withSpring(target, { damping: 18, stiffness: 180, overshootClamping: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, width, tabWidth, notchWidth]);

  useAnimatedReaction(
    () => notchX.value,
    (current, previous) => {
      if (current === previous) return;
      const d = buildNotchBarPath({ width, height: totalBarHeight, notchX: current, notchWidth, notchDepth, cornerRadius: CORNER_RADIUS });
      runOnJS(setPathD)(d);
    },
    [width, totalBarHeight, notchWidth, notchDepth],
  );

  useEffect(() => {
    // See `computeTabBarHideOffset`'s own doc comment — a flat `+24` left the
    // active bubble's tip visibly peeking above the screen's bottom edge even
    // while "hidden", since the bubble always pokes >= 30dp above the bar.
    const target = visible ? 0 : computeTabBarHideOffset(totalBarHeight, bubbleSize);
    translateY.value = reduceMotion ? target : withTiming(target, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, totalBarHeight, bubbleSize]);

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
    <Animated.View style={[styles.container, containerStyle, { height: totalBarHeight }]} pointerEvents="box-none">
      <Svg width={width} height={totalBarHeight} style={StyleSheet.absoluteFill}>
        <Path d={pathD} fill={theme.colors.surface} stroke={theme.colors.border} strokeWidth={1} />
      </Svg>

      <View style={[styles.row, { height: BAR_CONTENT_HEIGHT }]}>
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

      <ActiveBubble
        notchX={notchX}
        icon={TAB_ITEMS[activeIndex]!.icon}
        diameter={bubbleSize}
        iconSize={iconSize}
        showDot={failedSync && TAB_ITEMS[activeIndex]!.key === 'orders'}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'visible',
  },
  row: { flexDirection: 'row' },
});
