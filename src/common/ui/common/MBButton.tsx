import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MBPressable } from '@/common/ui/common/MBPressable';
import { useTheme } from '@/common/theme/ThemeProvider';
import { space } from '@/common/theme/spacing';

/**
 * `dangerSoft` is the destructive action drawn as a tint rather than a fill —
 * v4's Logout tile, `dangerBg` behind `danger`. It exists because a solid red
 * bar is the loudest thing on a panel that is otherwise identity and settings,
 * and Sign out is not the most important control there; it is simply the last
 * one. Use `danger` where the action really is the point of the screen.
 */
export type MBButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSoft';
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
      case 'dangerSoft':
        return {
          bg: theme.colors.dangerBg,
          pressedBg: theme.colors.dangerBg,
          fg: theme.colors.danger,
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
    <MBPressable
      testID={testID}
      onPress={onPress}
      disabled={isInactive}
      // Dimming a disabled control belongs to the press layer, not to `style`:
      // the two are the same property, and whichever were applied last would
      // silently win over the other.
      restOpacity={isInactive ? 0.5 : 1}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          // minHeight, not height: at the largest dynamic-type setting a fixed
          // 52dp box clips its own label. The token stays the *floor*, which is
          // what makes it a tap target, and the button grows instead.
          minHeight: theme.layout.btnH[size],
          paddingVertical: theme.space.xs,
          minWidth: theme.layout.tapMin,
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? palette.pressedBg : palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'secondary' ? 1 : 0,
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
    </MBPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
