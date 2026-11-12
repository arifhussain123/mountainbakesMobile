import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SOFT_LIFT, useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '../Icon';

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  /** A number badge in the top-right corner (9+ above nine). */
  badgeCount?: number;
  /** A small accent dot instead of a number (e.g. a non-default sort is on). */
  dot?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Diameter; the mockup's `.iconbtn` is 42. */
  size?: number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** The redesign's `.iconbtn`: a round white button with a soft violet lift (light); a flat glass circle in dark. */
export function IconButton({ icon, onPress, onLongPress, accessibilityLabel, badgeCount, dot, disabled, loading, size = 42, iconColor, style }: IconButtonProps) {
  const theme = useAppTheme();
  const ink = iconColor ?? theme.colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={onLongPress ? 350 : undefined}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        { backgroundColor: theme.isDark ? theme.colors.border : theme.colors.surface, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        theme.isDark ? null : SOFT_LIFT,
        style,
      ]}>
      {loading ? <ActivityIndicator size="small" color={ink} /> : <Icon name={icon} size={20} color={ink} />}
      {badgeCount ? (
        <View style={[styles.badge, { backgroundColor: theme.colors.primary, borderColor: theme.isDark ? theme.colors.background : theme.colors.surface }]}>
          <Text style={[styles.badgeText, { color: theme.colors.primaryText }]}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
        </View>
      ) : dot ? (
        <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { fontSize: 8, fontWeight: '700' },
  dot: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4 },
});
