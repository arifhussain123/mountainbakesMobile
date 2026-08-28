import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { MBIcon } from '@/common/ui/common/MBIcon';
import { MBPressable } from '@/common/ui/common/MBPressable';
import type { IconKey } from '@/common/constants/navigationIcons';
import { useReducedMotion } from '@/common/hooks/useReducedMotion';
import { useNetworkStore } from '@/state/networkStore';
import { useSyncStore } from '@/state/syncStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { layout, space } from '@/common/theme/spacing';
import { radius } from '@/common/theme/radius';

/**
 * Header pill showing sync state, tappable through to the Sync Center.
 *
 * ---------------------------------------------------------------------------
 * Why there is no green check
 * ---------------------------------------------------------------------------
 * The brief lists a `synced` state. This renders **nothing** when online, idle
 * and empty, which is the same information carried better: a permanent "all
 * good" tick is on screen so constantly that nobody sees it, and once it is
 * furniture its absence stops registering either. Showing the pill only when
 * there is something to say is what makes its appearance mean something — the
 * same reasoning as `MBBadge` rendering nothing at zero.
 *
 * That argument is about a **permanent** tick, not about silence. A drain that
 * actually moved work is an event, and it is the one moment the pill has
 * something worth confirming — so `✓ 5 transactions synchronized` appears for a
 * few seconds and then the pill goes back to nothing. It is deliberately the
 * only success state, and it is bounded three ways so it never becomes the
 * furniture the paragraph above warns about:
 *
 *   - a drain that synced **nothing** says nothing. Reconnecting and
 *     foregrounding both trigger a drain, and most find an empty queue; a
 *     "0 synchronized" every time the radio comes back is exactly the notice
 *     staff learn to swipe away without reading.
 *   - the same result is never announced twice, however often the component
 *     re-renders or remounts.
 *   - it outranks nothing. A parked row still wins the pill, because
 *     "5 synchronized" over the top of "2 need attention" reads as all-clear.
 *
 * It is inline chrome, not a toast, a modal or an OS notification: it interrupts
 * nothing, needs no dismissal, and cannot stack.
 *
 * ---------------------------------------------------------------------------
 * The glyph is not decoration
 * ---------------------------------------------------------------------------
 * Each state has its own icon rather than one shape in four colours: a
 * colourblind user cannot separate "syncing" from "needs attention" by hue, and
 * the text label is the only other carrier. Pending keeps the plain dot,
 * because a queue is a quantity rather than an event.
 *
 * The spinner turns **only while a drain is actually running** — it is started
 * by the phase going to `syncing` and cancelled the moment it leaves. An
 * indicator that spins at rest is the animation staff learn to stop reading,
 * and it keeps the UI thread's animation loop alive for no reason on a cheap
 * handset. Reduce Motion swaps the rotation for the static glyph; the label
 * still says "Syncing…", so nothing is lost but the movement.
 */
export function MBSyncStatus(): React.ReactElement | null {
  const theme = useTheme();
  /**
   * Typed to the one call it makes, and typed as the **nested** form on purpose.
   *
   * Sync Center lives inside More's stack, not at the top level (it moved there
   * when the loose screens were folded into More). `navigate('SyncCenter')`
   * resolves only against *ancestor* navigators, so from any tab but More it
   * matched nothing and React Navigation dropped it with a console warning —
   * the pill sits in the header of fourteen screens and did nothing on thirteen
   * of them. Naming the tab and the screen is the same shape
   * `routeForNotification` returns.
   */
  const navigation = useNavigation<{
    navigate: (tab: 'More', params: { screen: 'SyncCenter' }) => void;
  }>();
  const reduceMotion = useReducedMotion();
  const isOnline = useNetworkStore(s => s.isOnline);
  const phase = useSyncStore(s => s.phase);
  const pending = useSyncStore(s => s.pending);
  const needsAttention = useSyncStore(s => s.needsAttention);
  const lastResult = useSyncStore(s => s.lastResult);

  /**
   * The confirmation, held just long enough to be read and not long enough to
   * become part of the header. `lastResult` is compared by reference: the store
   * replaces the object on every drain, so a re-render cannot re-announce one
   * that has already been shown.
   */
  const [justSynced, setJustSynced] = useState<number | null>(null);
  const announced = useRef(lastResult);

  useEffect(() => {
    if (lastResult === announced.current) return;
    announced.current = lastResult;
    if (!lastResult || lastResult.synced === 0) return;

    setJustSynced(lastResult.synced);
    const timer = setTimeout(() => setJustSynced(null), CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [lastResult]);

  const syncing = phase === 'syncing';
  const spin = useSharedValue(0);

  useEffect(() => {
    if (syncing && !reduceMotion) {
      spin.value = withRepeat(
        withTiming(360, { duration: theme.motion.spin, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      // Cancel before resetting: leaving the repeat running would keep driving
      // the value even though the glyph it belongs to is no longer on screen.
      cancelAnimation(spin);
      spin.value = 0;
    }
    return () => cancelAnimation(spin);
  }, [syncing, reduceMotion, spin, theme.motion.spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const quiet =
    isOnline && !syncing && pending === 0 && needsAttention === 0 && justSynced === null;
  if (quiet) return null;

  const { label, color, icon } = describe({
    isOnline,
    syncing,
    pending,
    needsAttention,
    justSynced,
    theme,
  });

  return (
    <MBPressable
      onPress={() => navigation.navigate('More', { screen: 'SyncCenter' })}
      accessibilityRole="button"
      accessibilityLabel={`${label}. Open Sync Center.`}
      hitSlop={8}
      style={[
        styles.pill,
        {
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surfaceSunken,
        },
      ]}>
      {icon ? (
        <Animated.View style={syncing ? spinStyle : undefined}>
          <MBIcon name={icon} size="action" color={color} />
        </Animated.View>
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Text style={[theme.type.caption, { color: theme.colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </MBPressable>
  );
}

/**
 * State → what is shown, in strict precedence.
 *
 * Failure outranks everything below it: a parked row needs a person, and the
 * queue depth behind it can wait. `icon: undefined` means the plain dot.
 */
function describe({
  isOnline,
  syncing,
  pending,
  needsAttention,
  justSynced,
  theme,
}: {
  isOnline: boolean;
  syncing: boolean;
  pending: number;
  needsAttention: number;
  justSynced: number | null;
  theme: ReturnType<typeof useTheme>;
}): { label: string; color: string; icon?: IconKey } {
  if (syncing) return { label: 'Syncing…', color: theme.colors.syncing, icon: 'sync' };
  if (needsAttention > 0) {
    return {
      label: `${needsAttention} ${needsAttention === 1 ? 'transaction needs' : 'transactions need'} attention`,
      color: theme.colors.syncFailed,
      icon: 'failed',
    };
  }
  // Below a parked row, above the queue depth: the drain that just finished is
  // the newer news, and whatever is still waiting is reported the moment it
  // clears.
  if (justSynced !== null) {
    return {
      label: `${justSynced} ${justSynced === 1 ? 'transaction' : 'transactions'} synchronized`,
      color: theme.colors.success,
      icon: 'synced',
    };
  }
  if (!isOnline) {
    return {
      label: pending > 0 ? `${pending} waiting` : 'Offline',
      color: theme.colors.offline,
      icon: 'offline',
    };
  }
  return { label: `${pending} waiting`, color: theme.colors.warning };
}

/**
 * How long the success confirmation stays up.
 *
 * Not a `motion.ts` token: that file is animation durations, and this is a
 * reading time. Long enough to notice and read six words after looking up from
 * a counter; short enough that it is gone before it becomes header furniture.
 */
const CONFIRMATION_MS = 4000;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.tight,
    paddingHorizontal: space.snug,
    paddingVertical: space.tight,
  },
  dot: { width: layout.dotSize, height: layout.dotSize, borderRadius: radius.pill },
});
