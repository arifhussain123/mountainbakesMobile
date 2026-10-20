import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';

/**
 * A compact action button — the web's small outline / primary buttons (Add,
 * Edit, Verify, Lock…). Wraps on a row with its siblings; `primary` for the
 * one action that moves the record forward, `danger` for a destructive one.
 */
export function ActionChip({
  icon,
  label,
  onPress,
  primary,
  danger,
  disabled,
  loading,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const theme = useAppTheme();
  const fg = primary ? theme.colors.primaryText : danger ? theme.colors.danger : theme.colors.text;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: theme.radii.md,
          borderColor: primary ? theme.colors.primary : theme.colors.border,
          backgroundColor: primary ? theme.colors.primary : theme.colors.surface,
          opacity: off ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}>
      {loading ? <ActivityIndicator size="small" color={fg} /> : <Icon name={icon} size={14} color={fg} />}
      <Text style={[theme.typography.label, { color: fg, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderWidth: 1 },
});
