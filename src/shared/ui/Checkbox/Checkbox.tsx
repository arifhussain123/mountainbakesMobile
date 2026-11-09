import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '../Icon';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Small muted text under the label. */
  helper?: string;
  /** Rendered at the right end of the label row (e.g. a "Forgot password?" link) — outside the checkbox's own touch target. */
  trailing?: ReactNode;
  testID?: string;
}

/**
 * A custom checkbox (no native checkbox exists in bare React Native): a 20dp
 * rounded box that fills with the accent and a check mark when on. The whole
 * label + helper block toggles it, giving a comfortably large target.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  helper,
  trailing,
  testID,
}: CheckboxProps) {
  const { colors, typography, font } = useAppTheme();
  const boxColors = checked
    ? { borderColor: colors.accent, backgroundColor: colors.accent }
    : { borderColor: colors.border, backgroundColor: colors.bg };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={helper ? `${label}. ${helper}` : label}
        onPress={() => onChange(!checked)}
        hitSlop={8}
        testID={testID}
        style={styles.target}
      >
        <View style={[styles.box, boxColors]}>
          {checked ? (
            <Icon
              name="check"
              size={13}
              color={colors.primaryText}
              strokeWidth={3}
            />
          ) : null}
        </View>
        <View style={styles.textBlock}>
          <Text
            style={[
              font('medium'),
              styles.label,
              { color: colors.textPrimary },
            ]}
          >
            {label}
          </Text>
          {helper ? (
            <Text
              style={[
                typography.brandCaption,
                styles.helper,
                { color: colors.textMuted },
              ]}
            >
              {helper}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  target: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44,
    gap: 12,
  },
  box: {
    marginTop: 1,
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
  helper: {
    marginTop: 4,
  },
  trailing: {
    marginLeft: 8,
  },
});
