import { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/shared/theme';

export interface LoadingSkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
}

/** A pulsing placeholder box — CLAUDE.md Section 38, never a blank screen while loading. */
export function LoadingSkeleton({ width = '100%', height = 16, borderRadius }: LoadingSkeletonProps) {
  const theme = useAppTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 700 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        style,
        {
          width,
          height,
          borderRadius: borderRadius ?? theme.radii.sm,
          backgroundColor: theme.colors.border,
        },
      ]}
    />
  );
}
