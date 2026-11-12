import { ActivityIndicator, Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { ACCENT_GLOW, AccentFill } from '../AccentFill';

export interface PrimaryButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  /**
   * Looks and announces disabled, but still takes the press — for a Save that
   * answers a tap by pointing at what is missing instead of doing nothing.
   */
  inactive?: boolean;
  testID?: string;
}

/** The one filled, high-emphasis action per screen (design skill: "no more than 1 primary CTA"). */
export function PrimaryButton({ label, onPress, loading, disabled, inactive, testID }: PrimaryButtonProps) {
  const theme = useAppTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled || inactive, busy: loading }}
      testID={testID}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: theme.colors.primary,
          // 2026 redesign: a full pill with the saffron gradient and a soft glow (light mode).
          borderRadius: theme.isDark ? theme.radii.md : theme.radii.pill,
          opacity: isDisabled || inactive ? 0.5 : pressed ? 0.85 : 1,
        },
        theme.isDark || isDisabled || inactive ? null : ACCENT_GLOW,
      ]}>
      <AccentFill borderRadius={theme.isDark ? theme.radii.md : 999} />
      {loading ? (
        <ActivityIndicator color={theme.colors.primaryText} />
      ) : (
        <Text style={[styles.label, { color: theme.colors.primaryText }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
