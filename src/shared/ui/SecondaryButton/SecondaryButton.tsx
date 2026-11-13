import { ActivityIndicator, Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';
import { DARK_SURFACES, useAppTheme } from '@/shared/theme';

export interface SecondaryButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function SecondaryButton({ label, onPress, loading, disabled, testID }: SecondaryButtonProps) {
  const theme = useAppTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          borderColor: theme.colors.border,
          // 2026 redesign: a pill with a hairline border — white (light), raised midnight with a 1.5 border (dark).
          borderWidth: theme.isDark ? 1.5 : 1,
          borderRadius: theme.radii.pill,
          backgroundColor: pressed ? theme.colors.border : theme.isDark ? DARK_SURFACES.raised : theme.colors.surface,
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.colors.text} />
      ) : (
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
