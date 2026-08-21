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

import { MBIcon, MBPressable } from '@/components';
import { MBBadge } from '@/components/feedback/MBBadge';
import type { IconKey } from '@/constants/navigationIcons';
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
 * The indicator's ceiling width.
 *
 * v4 lifts the indicator from a pill behind the glyph to a rounded rectangle
 * behind the **whole cell** — glyph and label together — so this is now wide
 * enough to hold a label rather than sized to a 24dp icon. It still shrinks to
 * fit a narrow slot (see `indicatorWidth`).
 */
const INDICATOR_MAX_W = 88;

/**
 * The gap between the indicator and its neighbours.
 *
 * Small on purpose: v4's active cell nearly fills its slot, which is what makes
 * the tint read as "this tab" rather than as a badge sitting under it.
 */
const INDICATOR_INSET = 4;

/** Vertical padding inside the floating bar, above and below the row. */
const PILL_PAD_V = 8;
/** Horizontal padding inside the floating bar, so the end cells are not flush. */
const PILL_PAD_H = 6;

/**
 * The bar never sits flush against the screen edge on a device that reports no
 * bottom inset (Android 3-button navigation), or the labels touch the bezel.
 */
const MIN_BOTTOM_PAD = 8;

/**
 * The notch the centre action button sits in.
 *
 * Wider than the 56dp button so the ring around it has clear air on both sides
 * — v4 wears a `navFabRing` band in the field colour, and a slot sized to the
 * button alone puts that band on top of the neighbouring tab's label.
 */
const CENTRE_SLOT = 60;

/**
 * How far the button rides above the bar's top edge.
 *
 * Two thirds proud, one third overlapping. Fully clear reads as a corner FAB
 * that wandered into the middle; fully inside is a tab that happens to be
 * round.
 */
const CENTRE_RISE = 22;

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
  /**
   * The one create action the bar carries in its centre, or nothing.
   *
   * Resolved by `RoleTabs` from `centreActionFor(profile)`, so this component
   * still has no role name in it. When it is absent the row is laid out exactly
   * as it was before the button existed — the notch is not reserved "just in
   * case", because an empty 60dp hole in the middle of four tabs looks like a
   * control that failed to load.
   */
  centreAction?: { label: string; icon: IconKey; onPress: () => void } | undefined;
}

export function MBTabBar({
  state,
  descriptors,
  navigation,
  insets,
  tabs,
  centreAction,
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
   * The notch is a fixed-width cell the tabs flow around, so it comes out of
   * the row before the remainder is divided. `notchAt` is where it sits:
   * `floor(n / 2)`, which puts it dead centre for an even count and one cell
   * left of centre for an odd one — v4's own split for four tabs.
   */
  const notch = centreAction ? CENTRE_SLOT : 0;
  const notchAt = Math.floor(state.routes.length / 2);
  const slotWidth = (width - notch) / Math.max(state.routes.length, 1);
  const indicatorWidth = Math.max(0, Math.min(INDICATOR_MAX_W, slotWidth - INDICATOR_INSET));
  const targetX =
    slotWidth * state.index +
    (state.index >= notchAt ? notch : 0) +
    (slotWidth - indicatorWidth) / 2;

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
      {centreAction ? (
        /* In the gutter, not in the bar: it has to overflow the pill's top
           edge, and the pill clips its children so the indicator cannot escape
           the rounded corners. `box-none` on the layer keeps the rest of the
           gutter transparent to touches. */
        <View pointerEvents="box-none" style={[styles.centreLayer, { top: -CENTRE_RISE }]}>
          <MBPressable
            onPress={centreAction.onPress}
            accessibilityRole="button"
            accessibilityLabel={centreAction.label}
            testID="tab-centre-action"
            style={[
              styles.centre,
              theme.shadows.e3,
              {
                width: theme.layout.fabSize,
                height: theme.layout.fabSize,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.primary,
                /* The ring is the field colour, not the bar's. It reads as the
                   button punching through the bar rather than as a second
                   border drawn on it — which is what makes the notch look like
                   a notch on a screen that is scrolling underneath. */
                borderWidth: theme.layout.navFabRing,
                borderColor: theme.colors.bg,
              },
            ]}>
            <MBIcon name={centreAction.icon} size="header" color={theme.colors.onPrimary} />
          </MBPressable>
        </View>
      ) : null}

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
          style={[styles.row, { height: theme.layout.tabH }]}>
          {width > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.indicator,
                {
                  width: indicatorWidth,
                  borderRadius: theme.radius.lg,
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
          // `accent`, not `primary`: this paints the glyph AND the label, and
          // the ember is 3.2:1 — a fill colour, unreadable as type. v4 draws
          // the active tab in the ink and lets the pill behind it carry the
          // brand.
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

          /* The notch is a sibling of the cells rather than padding on one of
             them, so the row's flex maths and the indicator's arithmetic agree
             about where each slot starts. */
          return index === notchAt && notch > 0 ? (
            <React.Fragment key={`${route.key}-notched`}>
              <View style={{ width: notch }} pointerEvents="none" />
              {cell}
            </React.Fragment>
          ) : (
            cell
          );
        })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Transparent. See the comment at the render site. */
  gutter: { backgroundColor: 'transparent' },
  centreLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    // Above the bar in paint order as well as in position, or the pill's own
    // elevation on Android draws over the button's lower half.
    zIndex: 1,
    elevation: 1,
  },
  centre: { alignItems: 'center', justifyContent: 'center' },
  pill: {
    borderWidth: 1,
    paddingVertical: PILL_PAD_V,
    paddingHorizontal: PILL_PAD_H,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  /** Top *and* bottom pinned: the indicator is the full height of the cell,
      not a pill above the label — v4 tints the whole cell. */
  indicator: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  item: {
    flex: 1,
    alignItems: 'center',
    // Centred rather than top-aligned: the indicator is now the full height of
    // the cell, so glyph and label sit in the middle of the tint rather than
    // hanging from its top edge.
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
