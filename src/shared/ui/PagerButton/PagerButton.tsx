import { Pressable, StyleSheet, Text } from 'react-native';
import { midnightFill, useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '../Icon';

export interface PagerButtonProps {
  /** A page number — or pass `icon` for the prev/next arrows. */
  label?: string;
  icon?: IconName;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

/** One square of the redesign's `.pager`: 36pt, white with a hairline; the current page is midnight. */
export function PagerButton({ label, icon, active, disabled, onPress, accessibilityLabel }: PagerButtonProps) {
  const theme = useAppTheme();
  const on = midnightFill(theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.page,
        active ? { backgroundColor: on, borderColor: on } : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        disabled ? styles.disabled : null,
      ]}>
      {icon ? (
        <Icon name={icon} size={16} color={theme.colors.textSecondary} />
      ) : (
        <Text style={[styles.text, { color: active ? '#FFFFFF' : theme.colors.textSecondary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 13, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
