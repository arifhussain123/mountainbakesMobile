import { ActivityIndicator, Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';
import { useAppTheme } from '@/shared/theme';

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
          // 2026 redesign: white pill with a hairline border (light); dark keeps the outline button.
          borderRadius: theme.isDark ? theme.radii.md : theme.radii.pill,
          backgroundColor: pressed ? theme.colors.border : theme.isDark ? 'transparent' : theme.colors.surface,
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
