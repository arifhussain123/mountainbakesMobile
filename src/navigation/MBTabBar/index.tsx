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

import { MBIcon } from '@/common/ui';
import { MBBadge } from '@/common/ui/feedback/MBBadge';
import { useSyncStore } from '@/state/syncStore';
import { iconSize, iconStroke } from '@/common/theme/iconSizes';
import { useReducedMotion } from '@/common/hooks/useReducedMotion';
import { useTheme } from '@/common/theme/ThemeProvider';
import type { BadgeSource, TabConfig } from '../roleConfig';
import { space } from '@/common/theme/spacing';
import { weight } from '@/common/theme/typography';

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
 * The active underline — v5's selection mark.
 *
 * v4 tinted the **whole cell** with `primarySoft`. v5 replaces that with a short
 * bar under the label: 16 long, 3 thick, `radius.pill`, in the ember. It is a
 * smaller mark doing a bigger job, so it does not carry the selection alone —
 * see the colour note at the render site.
 */
const INDICATOR_W = 16;
const INDICATOR_H = 3;

/** Horizontal padding inside the bar, so the end cells are not flush. */
const PILL_PAD_H = 6;

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
 *
 * v5 calls this a "five-tab bar" and it is the same five: the count did not
 * change, the **centre action button between them** did — it is gone, and with
 * it the notch the row used to flow around.
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
  /**
   * Five equal slots and nothing between them.
   *
   * v4 took a fixed-width notch out of the row before dividing the remainder,
   * because the centre action button sat in it. v5 has no such button, so the
   * arithmetic is one division — and the indicator is a fixed 16 rather than a
   * width derived from the slot, because it is now a mark under the label
   * rather than a tint behind the cell.
   */
  const slotWidth = width / Math.max(state.routes.length, 1);
  const targetX = slotWidth * state.index + (slotWidth - INDICATOR_W) / 2;

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
    /* Two views, and the split is the v4 shape: the outer one is the gutter
       the bar floats in, the inner one is the bar. The outer must stay
       transparent — painting it would put a cream band across the bottom of
       every screen and the bar would stop reading as floating over content. */
    <View
      onLayout={onBarLayout}
      style={[
        styles.gutter,
        {
          // The navigator hands down the resolved insets, which honour a
          // `safeAreaInsets` override on the navigator itself — `useSafeAreaInsets()`
          // here would quietly ignore one. Left/right matter in landscape, where
          // a notch eats into the row.
          paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_PAD) + theme.layout.navInset,
          paddingLeft: insets.left + theme.layout.navInset,
          paddingRight: insets.right + theme.layout.navInset,
        },
      ]}>
      <View
        style={[
          styles.pill,
          theme.shadows.e2,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.xxl,
          },
        ]}>
        <View
          accessibilityRole="tablist"
          onLayout={onLayout}
          style={[styles.row, { height: theme.layout.navPillH }]}>
          {width > 0 ? (
            /* The one place the ember is allowed near the selection.
               `primary` is a FILL — 3.04:1 on a card, which clears the 3:1 bar
               WCAG 1.4.11 sets for a graphical object and falls well short of
               the 4.5:1 a label needs. So the brand lives in this 3dp bar and
               the glyph and label above it stay in the ink; see the colour note
               in the cell below for what v5 asks for and why this departs. */
            <Animated.View
              pointerEvents="none"
              style={[
                styles.indicator,
                {
                  width: INDICATOR_W,
                  height: INDICATOR_H,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.primary,
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
          /**
           * `accent`, not `primary` — and this is the one place the build
           * deliberately departs from v5.
           *
           * v5 draws the active glyph and its 10px label in `#FB6D34`. Measured
           * against the bar's own white, that is **2.88:1**; the ember this app
           * actually ships (`ember500`, v4's hue walked down 6%) is 3.04:1.
           * Either way it is a fill value, and a fill value is not type: the bar
           * asks for 4.5:1, and at 10dp the miss is not academic — it is the
           * label a new staff member is relying on to learn which glyph is
           * which.
           *
           * So the ember goes where it can carry information honestly — the
           * 3dp underline above, a graphical object held to 3:1 — and the glyph
           * and label take the ink. The selection is then three signals rather
           * than one: the mark, the colour shift from `textMuted` to `accent`,
           * and the weight step below.
           */
          const color = focused ? theme.colors.accent : theme.colors.textMuted;

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
              ...CommonActions.navigate(route.name, undefined, { merge: true }),
              target: state.key,
            });
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          const cell = (
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
              /* Sized to the cell, not to the indicator. v4 derived this from
                 the indicator's width because the indicator *was* the cell;
                 v5's is a 16dp mark, and a ripple that small reads as a
                 rendering fault rather than as a touch. */
              android_ripple={{
                color: theme.colors.primarySoft,
                borderless: true,
                radius: theme.layout.tapMin / 2,
              }}
              style={({ pressed }) => [
                styles.item,
                {
                  minHeight: theme.layout.tapMin,
                  opacity: pressed && Platform.OS === 'ios' ? 0.6 : 1,
                },
              ]}>
              <View style={styles.glyph}>
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

          return cell;
        })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Transparent. See the comment at the render site. */
  gutter: { backgroundColor: 'transparent' },
  pill: {
    borderWidth: 1,
    paddingHorizontal: PILL_PAD_H,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  /**
   * Pinned to the BOTTOM of the row, not stretched through it.
   *
   * v4's indicator was a full-height tint behind the cell and had to pin both
   * edges. v5's is a mark under the label, so it takes a height of its own and
   * sits `xs` clear of the bar's lower edge — flush against it would read as
   * the bar's border thickening rather than as a selection.
   */
  indicator: { position: 'absolute', left: 0, bottom: space.xs },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // No horizontal padding: the whole slot is the target, and the icon and
    // label centre themselves inside it.
    gap: space.xs,
  },
  // Sized by the glyph itself now that the indicator is the full cell — it no
  // longer has to match a separate pill's height.
  glyph: { alignItems: 'center', justifyContent: 'center', height: iconSize.tab },
  glyphFallback: { width: iconSize.tab, height: iconSize.tab },
  badge: { position: 'absolute', top: 0, right: -6 },
  label: { textAlign: 'center' },
  // v4 sets the active label two steps above the idle one — 800 against 600 —
  // which is what carries the selection for anyone who cannot separate the
  // tint from the surface behind it.
  labelFocused: { fontWeight: weight.extrabold },
  labelIdle: { fontWeight: weight.semibold },
});
