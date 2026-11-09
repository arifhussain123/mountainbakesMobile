import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '../Icon';

export interface PillButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  /** Replaces the arrow chip with a spinner and blocks presses — a second tap can never double-submit. */
  loading?: boolean;
  disabled?: boolean;
  /** The dark circular chip with the up-right arrow at the right end of the pill. On by default. */
  arrow?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT = 54;
const CHIP_INSET = 5;
const CHIP_SIZE = HEIGHT - CHIP_INSET * 2;

/**
 * The full-width orange pill of the brand screens (mountainbakesBranch.html
 * screens 02/02b/02c): accent fill, ink label, and a dark round chip holding
 * an up-right arrow. Press feedback is a 0.97 scale (no haptics — the repo has
 * no haptics library and must not grow one for this).
 */
export function PillButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  arrow = true,
  testID,
  accessibilityLabel,
  accessibilityHint,
  style,
}: PillButtonProps) {
  const { colors, typography, radii } = useAppTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const blocked = disabled || loading;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: blocked, busy: loading }}
        testID={testID}
        onPress={blocked ? undefined : onPress}
        onPressIn={blocked ? undefined : () => animateTo(0.97)}
        onPressOut={blocked ? undefined : () => animateTo(1)}
        disabled={blocked}
        style={({ pressed }) => [
          styles.base,
          {
            backgroundColor:
              pressed && !blocked ? colors.accentPressed : colors.accent,
            borderRadius: radii.button,
            opacity: disabled && !loading ? 0.5 : 1,
          },
        ]}
      >
        <Text
          style={[
            typography.brandButton,
            styles.label,
            { color: colors.primaryText },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {arrow || loading ? (
          <View
            style={[
              styles.chip,
              { backgroundColor: colors.surface, borderRadius: CHIP_SIZE / 2 },
            ]}
            testID={testID ? `${testID}-chip` : undefined}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={colors.accent}
                testID={testID ? `${testID}-spinner` : undefined}
              />
            ) : (
              <Icon
                name="arrow-up-right"
                size={16}
                color={colors.accent}
                strokeWidth={2.6}
              />
            )}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps the centred label clear of the chip on narrow screens.
    paddingHorizontal: CHIP_SIZE + CHIP_INSET * 2,
  },
  label: {
    textAlign: 'center',
  },
  chip: {
    position: 'absolute',
    right: CHIP_INSET,
    top: CHIP_INSET,
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
