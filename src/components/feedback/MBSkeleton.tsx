import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

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
 * exists to suppress.
 */
export function MBSkeleton({
  width = '100%',
  height = 16,
  radius,
  style,
}: MBSkeletonProps): React.ReactElement {
  const theme = useTheme();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then(reduceMotion => {
      if (cancelled || reduceMotion) return;
      opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    });

    return () => {
      cancelled = true;
      cancelAnimation(opacity);
    };
  }, [opacity]);

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
  row: { gap: 8 },
});
