import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBIcon } from '@/common/ui/common/MBIcon';
import { MBPressable } from '@/common/ui/common/MBPressable';
import { layout, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

export interface MBCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The visible text beside the box. It is also the accessible name. */
  label: string;
  /** One quiet line under the label — what ticking it will actually do. */
  hint?: string;
  disabled?: boolean;
  testID?: string;
}

/**
 * A checkbox.
 *
 * ---------------------------------------------------------------------------
 * Why not `Switch`
 * ---------------------------------------------------------------------------
 * React Native ships one, and it would have been free. A switch reads as
 * *"this takes effect now"* — the thing it controls changes the moment it moves.
 * This is a **form field**: it is read when the form is submitted and does
 * nothing on its own. Getting that wrong is how someone toggles "Remember me"
 * and walks away believing it saved something.
 *
 * ---------------------------------------------------------------------------
 * The whole row is the target
 * ---------------------------------------------------------------------------
 * The box is 22dp, which is far under `tapMin`. Rather than pad the box into a
 * 48dp square with a mysterious dead zone beside it, the label is inside the
 * pressable and the row carries the minimum height — so the obvious thing to
 * tap (the words) is the thing that works.
 *
 * The label is the accessible name and the box is not separately focusable;
 * `accessibilityRole="checkbox"` plus `state.checked` is what a screen reader
 * announces, so the tick glyph stays decorative.
 */

/** Big enough to read a tick in, small enough not to outweigh its label. */
const BOX = 22;

export function MBCheckbox({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
  testID,
}: MBCheckboxProps): React.ReactElement {
  const theme = useTheme();

  return (
    <MBPressable
      testID={testID}
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      restOpacity={disabled ? 0.5 : 1}
      style={[styles.row, { minHeight: layout.tapMin, gap: space.md }]}>
      <View
        style={[
          styles.box,
          {
            width: BOX,
            height: BOX,
            borderRadius: theme.radius.sm,
            borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
            backgroundColor: checked ? theme.colors.primary : theme.colors.transparent,
          },
        ]}>
        {checked ? <MBIcon name="ruleMet" size="action" color={theme.colors.onPrimary} /> : null}
      </View>

      <View style={styles.text}>
        <Text style={[theme.type.body, { color: theme.colors.text }]}>{label}</Text>
        {hint ? (
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{hint}</Text>
        ) : null}
      </View>
    </MBPressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  // 2, not the hairline used elsewhere: an unticked box is only its outline,
  // so a hairline one disappears against a cream background in daylight.
  box: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  text: { flex: 1 },
});
