import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';
import { TabBadge } from './TabBadge';

export interface ActiveBubbleProps {
  /** Bar-local x center the bubble sits at — the same (clamped) value driving the notch cut. */
  notchX: SharedValue<number>;
  icon: IconName;
  showDot?: boolean;
  diameter?: number;
}

const DIAMETER = 56;

/** The raised orange circle sitting in the notch — icon crossfades/scales when the active tab changes; position follows `notchX` on the UI thread. */
export function ActiveBubble({ notchX, icon, showDot, diameter = DIAMETER }: ActiveBubbleProps) {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const iconOpacity = useSharedValue(1);
  const scale = useSharedValue(1);

  // Crossfade + scale pulse whenever the icon itself changes (the active tab switched).
  useEffect(() => {
    if (reduceMotion) return;
    iconOpacity.value = 0;
    scale.value = 0.9;
    iconOpacity.value = withTiming(1, { duration: 180 });
    scale.value = withTiming(1, { duration: 180 });
    // icon is a primitive string — safe effect dependency, and the only thing that should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icon]);

  const translateX = useDerivedValue(() => notchX.value - diameter / 2);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({ opacity: iconOpacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        containerStyle,
        {
          top: -diameter / 2,
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.background,
          shadowColor: theme.colors.primary,
        },
      ]}>
      <Animated.View style={iconStyle}>
        <Icon name={icon} size={24} color={theme.colors.background} />
      </Animated.View>
      {showDot ? <TabBadge dot /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
