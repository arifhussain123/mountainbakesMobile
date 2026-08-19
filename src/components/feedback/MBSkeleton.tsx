import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';

export interface MBSkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shimmer placeholder.
 *
 * Honours Reduce Motion: the pulse is replaced by a static block rather than
 * being merely slowed, since a repeating animation is exactly what that setting
 * exists to suppress. The setting is read through `useReducedMotion`, which
 * subscribes rather than sampling once — turning it on used to require killing
 * the app before the shimmer stopped.
 */
export function MBSkeleton({
  width = '100%',
  height = 16,
  radius,
  style,
}: MBSkeletonProps): React.ReactElement {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      // Left at the resting value rather than 1, so a suppressed skeleton still
      // reads as a placeholder and not as a filled block.
      opacity.value = 0.55;
      return;
    }

    opacity.value = withRepeat(
      withTiming(1, { duration: theme.motion.pulse }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion, theme.motion.pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.surfaceSunken,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Placeholder matching the shape of a list row. */
export function MBSkeletonList({ rows = 6 }: { rows?: number }): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space.md, padding: theme.layout.screenPad }}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[styles.row, { gap: theme.space.sm }]}>
          <MBSkeleton width="60%" height={18} />
          <MBSkeleton width="35%" height={14} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { overflow: 'hidden' },
  row: { gap: space.sm },
});
