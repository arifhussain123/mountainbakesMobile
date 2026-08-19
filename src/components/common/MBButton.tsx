import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export type MBButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type MBButtonSize = 'lg' | 'md' | 'sm';

export interface MBButtonProps {
  label: string;
  onPress?: () => void;
  variant?: MBButtonVariant;
  size?: MBButtonSize;
  disabled?: boolean;
  /** Shows a spinner and blocks presses. Use for in-flight submits. */
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * Primary action control.
 *
 * `loading` blocks the press itself rather than only dimming the button — a
 * double-tap on a submitting sale is exactly how a duplicate transaction gets
 * created, and it is the cheapest place to prevent one.
 */
export function MBButton({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  accessibilityHint,
  testID,
}: MBButtonProps): React.ReactElement {
  const theme = useTheme();
  const isInactive = disabled || loading;

  const palette = useMemo(() => {
    switch (variant) {
      case 'secondary':
        return {
          bg: theme.colors.surface,
          pressedBg: theme.colors.surfaceSunken,
          fg: theme.colors.text,
          border: theme.colors.borderStrong,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          pressedBg: theme.colors.surfaceSunken,
          fg: theme.colors.accent,
          border: 'transparent',
        };
      case 'danger':
        return {
          bg: theme.colors.danger,
          pressedBg: theme.colors.danger,
          fg: theme.colors.onPrimary,
          border: 'transparent',
        };
      default:
        return {
          bg: theme.colors.primary,
          pressedBg: theme.colors.primaryPressed,
          fg: theme.colors.onPrimary,
          border: 'transparent',
        };
    }
  }, [variant, theme]);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: theme.layout.btnH[size],
          minWidth: theme.layout.tapMin,
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? palette.pressedBg : palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'secondary' ? 1 : 0,
          opacity: isInactive ? 0.5 : 1,
          paddingHorizontal: size === 'sm' ? theme.space.md : theme.space.xl,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            numberOfLines={1}
            style={[size === 'sm' ? theme.type.label : theme.type.bodyStrong, { color: palette.fg }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
