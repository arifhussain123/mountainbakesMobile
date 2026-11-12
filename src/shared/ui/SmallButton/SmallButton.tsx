import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '../Icon';

export type SmallButtonKind = 'soft' | 'secondary' | 'danger';

export interface SmallButtonProps {
  label: string;
  onPress?: () => void;
  /** soft = pale peach with accent ink, secondary = white with a hairline, danger = pale rose. */
  kind?: SmallButtonKind;
  /** xs = 32pt, sm = 38pt. */
  size?: 'xs' | 'sm';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** The redesign's small `btn(…, 'xs' | 'sm')` buttons for in-card actions (View, Change, Withdraw, Add item…). */
export function SmallButton({ label, onPress, kind = 'secondary', size = 'xs', icon, disabled, loading, accessibilityLabel, style }: SmallButtonProps) {
  const theme = useAppTheme();
  const palette = {
    soft: {
      bg: theme.isDark ? `${theme.colors.primary}24` : '#FFEDE5',
      border: theme.isDark ? 'transparent' : 'rgba(242, 84, 45, 0.15)',
      ink: theme.isDark ? theme.colors.primary : '#E2471F',
    },
    secondary: { bg: theme.isDark ? 'transparent' : theme.colors.surface, border: theme.colors.border, ink: theme.colors.text },
    danger: {
      bg: theme.isDark ? `${theme.colors.danger}24` : '#FDE8E8',
      border: theme.isDark ? 'transparent' : 'rgba(229, 72, 77, 0.15)',
      ink: theme.colors.danger,
    },
  }[kind];
  const sm = size === 'sm';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        sm ? styles.sm : styles.xs,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={palette.ink} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={sm ? 18 : 15} color={palette.ink} /> : null}
          <Text style={[sm ? styles.smText : styles.xsText, { color: palette.ink }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  xs: { height: 32, borderRadius: 11, paddingHorizontal: 12 },
  sm: { height: 38, borderRadius: 14, paddingHorizontal: 14 },
  xsText: { fontSize: 12, fontWeight: '600' },
  smText: { fontSize: 13, fontWeight: '600' },
});
