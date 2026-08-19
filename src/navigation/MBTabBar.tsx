import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useKeyboardState } from 'react-native-keyboard-controller';
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';

import { MBIcon } from '@/components';
import { MBBadge } from '@/components/feedback/MBBadge';
import { useSyncStore } from '@/store/syncStore';
import { iconSize, iconStroke } from '@/theme/iconSizes';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/theme/ThemeProvider';
import type { BadgeSource, TabConfig } from './roleConfig';
import { space } from '@/theme/spacing';
import { weight } from '@/theme/typography';

/**
 * The bottom tab bar.
 *
 * ---------------------------------------------------------------------------
 * Why this is drawn by hand rather than configured
 * ---------------------------------------------------------------------------
 * React Navigation's own bar renders each tab independently, which is what makes
 * a *moving* selection indicator impossible to express through options: a pill
 * that belongs to one tab can only appear and disappear, it cannot travel. Three
 * other things also stop at the options boundary — the badge cannot be styled to
 * the token set, the touch target cannot be guaranteed to clear 48dp once a
 * label wraps, and the keyboard rule is Android-only.
 *
 * So the bar is one component that owns the whole row. Everything that varies
 * between roles still arrives as data (`tabs`, from `roleConfig`); there is no
 * role name in this file.
 *
 * ---------------------------------------------------------------------------
 * What this is not
 * ---------------------------------------------------------------------------
 * A tab that is not drawn is not a tab that is protected. The API re-authorises
 * every request against the JWT; this only decides what is convenient to reach.
 */

/**
 * The indicator's ceiling width. It shrinks to fit a narrow slot (see
 * `indicatorWidth`), so this is the widest it is ever drawn — comfortably around
 * a 24dp glyph without turning into a bar under the label.
 */
const INDICATOR_MAX_W = 56;
/** Tall enough to clear the 24dp glyph with a hair of padding above and below. */
const INDICATOR_H = 30;
/** Distance from the top of the row to the top of the indicator and the glyph. */
const ROW_PAD_TOP = 5;

/**
 * The bar never sits flush against the screen edge on a device that reports no
 * bottom inset (Android 3-button navigation), or the labels touch the bezel.
 */
const MIN_BOTTOM_PAD = 8;

/**
 * Five is the ceiling — four daily-operations tabs plus More. `roleConfig` is
 * where that is enforced and `navigationSurface.test.ts` asserts it; this is the
 * runtime tripwire for a sixth tab arriving from somewhere else, because the
 * first symptom would otherwise be truncated labels on a 360dp phone.
 */
const MAX_TABS = 5;

interface Badge {
  count: number;
  tone: 'accent' | 'danger';
}

export interface MBTabBarProps extends BottomTabBarProps {
  /** The role's tab configs, in the order they were registered. */
  tabs: readonly TabConfig[];
}

export function MBTabBar({
  state,
  descriptors,
  navigation,
  insets,
  tabs,
}: MBTabBarProps): React.ReactElement | null {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);

  const pending = useSyncStore(s => s.pending);
  const needsAttention = useSyncStore(s => s.needsAttention);

  /**
   * Hidden while the keyboard is up, **on Android only**.
   *
   * This is the platform convention, and it is the behaviour the `tabBarHideOnKeyboard`
   * option used to give this app before the bar was drawn here (that option is
   * documented as Android-only and is implemented by the default bar, so it does
   * nothing once a custom `tabBar` is supplied). Android resizes the window to
   * make room for the keyboard, so a bar left visible lands directly on top of
   * it and eats the space a form's submit button needs. iOS does not resize —
   * the keyboard simply covers the bar — so hiding it there would move content
   * for no reason.
   */
  const keyboardVisible = useKeyboardState(s => s.isVisible);
  const hidden = keyboardVisible && Platform.OS === 'android';

  const [width, setWidth] = useState(0);

  const tabCount = state.routes.length;
  useEffect(() => {
    if (__DEV__ && tabCount > MAX_TABS) {
      console.warn(
        `[navigation] ${tabCount} tabs registered; ${MAX_TABS} is the ceiling. ` +
          'Labels truncate and targets get too narrow to hit one-handed past that.',
      );
    }
  }, [tabCount]);

  const configByName = useMemo(() => {
    return new Map(tabs.map(t => [t.name as string, t]));
  }, [tabs]);

  /**
   * Badges read live state and nothing else. Failures outrank queue depth — a
   * parked row needs a person, a pending row only needs a network — and both
   * clear themselves when the store clears, which is the property that keeps a
   * badge worth believing.
   */
  const badgeFor = useCallback(
    (source: BadgeSource | undefined): Badge | null => {
      if (source !== 'syncAttention') return null;
      if (needsAttention > 0) return { count: needsAttention, tone: 'danger' };
      if (pending > 0) return { count: pending, tone: 'accent' };
      return null;
    },
    [needsAttention, pending],
  );

  // ---------------------------------------------------------------------------
  // The moving indicator
  // ---------------------------------------------------------------------------

  /**
   * Position is computed from the measured row width rather than from each
   * tab's own layout: every item is `flex: 1`, so the slots are equal by
   * construction and one division beats five `onLayout` callbacks racing to
   * report during the first frames.
   */
  const slotWidth = width / Math.max(state.routes.length, 1);
  const indicatorWidth = Math.max(0, Math.min(INDICATOR_MAX_W, slotWidth - theme.space.md));
  const targetX = slotWidth * state.index + (slotWidth - indicatorWidth) / 2;

  const x = useSharedValue(0);
  const placed = useRef(false);
  const lastWidth = useRef(0);

  useEffect(() => {
    if (width === 0) return;

    // Three cases jump rather than travel: the first paint (an indicator must
    // not slide in from the left edge on launch), a width change (rotation or a
    // split-screen resize is not a tab change), and Reduce Motion — where the
    // tab still becomes active, it simply does not travel to get there.
    const jump = !placed.current || reduceMotion || width !== lastWidth.current;
    placed.current = true;
    lastWidth.current = width;

    if (jump) {
      x.value = targetX;
      return;
    }
    // A spring rather than a curve: tapping a third tab mid-travel picks up from
    // where the indicator actually is instead of restarting the journey.
    x.value = withSpring(targetX, theme.motion.spring.press);
  }, [targetX, width, reduceMotion, x, theme.motion.spring.press]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  /**
   * Report the drawn height so `useBottomTabBarHeight()` is truthful for
   * anything that insets itself above the bar. Zero while hidden — a screen
   * padding by a stale height would leave a gap where the keyboard is.
   */
  const onBarLayout = useCallback(
    (e: LayoutChangeEvent) => onHeightChange?.(e.nativeEvent.layout.height),
    [onHeightChange],
  );
  useEffect(() => {
    if (hidden) onHeightChange?.(0);
  }, [hidden, onHeightChange]);

  if (hidden) return null;

  return (
    <View
      onLayout={onBarLayout}
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          // The navigator hands down the resolved insets, which honour a
          // `safeAreaInsets` override on the navigator itself — `useSafeAreaInsets()`
          // here would quietly ignore one. Left/right matter in landscape, where
          // a notch eats into the row.
          paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_PAD),
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <View
        accessibilityRole="tablist"
        onLayout={onLayout}
        style={[styles.row, { height: theme.layout.tabH }]}>
        {width > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                width: indicatorWidth,
                height: INDICATOR_H,
                top: ROW_PAD_TOP,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.primarySoft,
              },
              indicatorStyle,
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const config = configByName.get(route.name);
          const label = options?.title ?? route.name;
          const badge = badgeFor(config?.badge);
          const color = focused ? theme.colors.primary : theme.colors.textMuted;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (focused || event.defaultPrevented) return;
            // `merge: true` keeps the tab's existing params, and targeting the
            // navigator's own key stops the action escaping to a parent when the
            // bar is rendered inside the drawer.
            navigation.dispatch({
              ...CommonActions.navigate({ name: route.name, merge: true }),
              target: state.key,
            });
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              // Without the count folded in, the reader announces "More" on a
              // tab that is visibly carrying a number.
              accessibilityLabel={
                badge
                  ? `${label}, ${badge.count} ${
                      badge.tone === 'danger' ? 'need attention' : 'waiting to sync'
                    }`
                  : label
              }
              testID={`tab-${route.name}`}
              // Borderless ripple reads as native on Android; iOS tab bars have
              // no press state of their own, so it gets a dim instead.
              android_ripple={{
                color: theme.colors.primarySoft,
                borderless: true,
                radius: INDICATOR_MAX_W / 2,
              }}
              style={({ pressed }) => [
                styles.item,
                {
                  minHeight: theme.layout.tapMin,
                  opacity: pressed && Platform.OS === 'ios' ? 0.6 : 1,
                },
              ]}>
              <View style={[styles.glyph, { height: INDICATOR_H }]}>
                {config ? (
                  <MBIcon
                    name={config.icon}
                    size="tab"
                    color={color}
                    // Lucide is one outline family with no filled variants.
                    // Rather than mix in a second icon set to get a filled
                    // active state, the active tab is three signals at once:
                    // colour, stroke weight, and the pill behind it.
                    strokeWidth={focused ? iconStroke.active : iconStroke.inactive}
                  />
                ) : (
                  // A route with no config still gets its slot, so the indicator
                  // maths and the row never disagree about how many tabs there are.
                  <View style={styles.glyphFallback} />
                )}
                {badge ? (
                  <View style={styles.badge} pointerEvents="none">
                    {/* The tab already announces the count, so the badge stays
                        out of the reader rather than saying it twice. */}
                    <MBBadge count={badge.count} tone={badge.tone} label="" />
                  </View>
                ) : null}
              </View>

              {/* Labels stay visible. An icon-only bar fails new staff, who have
                  not yet learned which glyph is which. Font scaling is capped
                  rather than switched off: past ~1.2 a five-tab row cannot fit a
                  second line, and a truncated label is worse than a small one. */}
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={[
                  theme.type.caption,
                  styles.label,
                  focused ? styles.labelFocused : styles.labelIdle,
                  { color },
                ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  indicator: { position: 'absolute', left: 0 },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: ROW_PAD_TOP,
    // No horizontal padding: the whole slot is the target, and the icon and
    // label centre themselves inside it.
    gap: space.hair,
  },
  glyph: { alignItems: 'center', justifyContent: 'center' },
  glyphFallback: { width: iconSize.tab, height: iconSize.tab },
  badge: { position: 'absolute', top: 0, right: -6 },
  label: { textAlign: 'center' },
  labelFocused: { fontWeight: weight.semibold },
  labelIdle: { fontWeight: weight.regular },
});
