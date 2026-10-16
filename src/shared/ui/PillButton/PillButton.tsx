import { ActivityIndicator, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '../Icon';

export interface PillButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  /** Shows a dark circular chip with a white/accent up-right arrow on the right side of the pill — mountainbakesBranch.html's onboarding/splash CTA. */
  showArrow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Full-width orange pill CTA with an optional arrow chip — the shared button
 * shape mountainbakesBranch.html's onboarding/login screens use, distinct from
 * `PrimaryButton`'s plain rounded-rect (kept as-is for every other screen).
 */
export function PillButton({ label, onPress, showArrow, loading, disabled, testID, accessibilityLabel }: PillButtonProps) {
  const theme = useAppTheme();
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: 80 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 80 });
  };

  const handlePress = (event: GestureResponderEvent) => {
    ReactNativeHapticFeedback.trigger('impactLight', { enableVibrateFallback: false, ignoreAndroidSystemSettings: false });
    onPress(event);
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        testID={testID}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={isDisabled ? undefined : handlePress}
        style={[styles.base, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.pill, opacity: isDisabled ? 0.5 : 1 }]}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primaryText} />
        ) : (
          <>
            <Text style={[styles.label, { color: theme.colors.primaryText }]}>{label}</Text>
            {showArrow ? (
              <View style={[styles.chip, { backgroundColor: theme.colors.background }]}>
                <Icon name="arrow-up-right" size={16} color={theme.colors.primary} />
              </View>
            ) : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  chip: {
    position: 'absolute',
    right: 5,
    top: 5,
    bottom: 5,
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
