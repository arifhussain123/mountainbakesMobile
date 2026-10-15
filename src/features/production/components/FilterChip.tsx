import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  dotColor?: string;
}

/** The pill-chip pattern already used by screen 05/07's filter rows — generalised for the Dashboard's period/branch/plan chip rows. */
export function FilterChip({ label, active, onPress, dotColor }: FilterChipProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.colors.primary : theme.colors.surface,
          borderColor: active ? theme.colors.primary : theme.colors.border,
        },
      ]}>
      {dotColor ? <Pressable pointerEvents="none" style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
