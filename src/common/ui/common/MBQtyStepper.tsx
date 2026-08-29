import React, { useCallback } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { MBIcon } from './MBIcon';
import { MBPressable } from './MBPressable';
import { radius } from '@/common/theme/radius';
import { layout } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

/**
 * The typed field between the two buttons.
 *
 * Wide enough for three digits at `type.number`, which is more than a bakery
 * line is ever ordered or sold in one go.
 */
const FIELD_W = 44;

/**
 * The control's full width, exported because it is a **column**: the new-order
 * table and the till's cart both line their steppers up down a list, and a table
 * whose rows each compute their own columns is a table that lines up until
 * someone changes one of them.
 *
 * Derived, never written as a literal — `136` would silently stop matching the
 * day `layout.stepperSize` moves off 44, and `spacing.ts` records that as a live
 * question rather than a settled one (44 is the iOS minimum; this app's
 * `tapMin` is 48).
 */
export const QTY_STEPPER_WIDTH = layout.stepperSize * 2 + FIELD_W;

/**
 * A typed quantity, as a non-negative integer.
 *
 * Anything that is not a run of digits is nothing: a stepper field that accepted
 * '3.5' or '-2' would send a quantity the server's Zod refuses
 * (`z.number().int().positive()`), and the operator would find out at drain time
 * rather than at the keyboard.
 */
export function toQty(text: string): number {
  const digits = text.replace(/[^0-9]/g, '');
  if (digits === '') return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

export interface MBQtyStepperProps {
  value: number;
  onChange: (qty: number) => void;
  /**
   * What is being counted — the product name. Used to build the accessible
   * names, so a screen reader says "Increase Milk Rusk" rather than "Increase".
   */
  label: string;
  disabled?: boolean;
  testID?: string;
}

/**
 * − / typed field / + , as one control.
 *
 * ---------------------------------------------------------------------------
 * Why the field is typed and not just stepped
 * ---------------------------------------------------------------------------
 * A branch ordering 60 trays does not tap + sixty times. The steppers are for
 * the correction ("make that 13") and the field is for the quantity — both are
 * the same control because splitting them puts two ways to change one number on
 * screen, and the one that is faster is the one that gets missed.
 *
 * The three parts share one border rather than drawing three, so the control
 * reads as a single field with buttons on it. `borderControl` is the 3:1 edge
 * WCAG 1.4.11 asks of an interactive boundary — `border` is the 1.25:1 hairline
 * for dividing cards and disappears on a control.
 *
 * Both buttons are `layout.stepperSize` (44) square. That is below this app's
 * `tapMin` of 48 — a known, tokenised departure rather than an oversight here
 * (see `spacing.ts`) — so both carry `hitSlop`, because a stepper is tapped
 * repeatedly and in a hurry.
 *
 * Used by the new-order table and by both tills' cart lines, which is why it is
 * here rather than inside a feature: three places drew a stepper by hand before
 * this existed, and two of them had no typed field at all.
 */
export function MBQtyStepper({
  value,
  onChange,
  label,
  disabled = false,
  testID,
}: MBQtyStepperProps): React.ReactElement {
  const theme = useTheme();

  const decrease = useCallback(() => onChange(value - 1), [onChange, value]);
  const increase = useCallback(() => onChange(value + 1), [onChange, value]);
  const type = useCallback((text: string) => onChange(toQty(text)), [onChange]);

  return (
    <View
      style={[
        styles.root,
        {
          width: QTY_STEPPER_WIDTH,
          height: layout.stepperSize,
          borderRadius: radius.md,
          borderColor: theme.colors.borderControl,
          backgroundColor: theme.colors.surface,
        },
        disabled && styles.disabled,
      ]}>
      <MBPressable
        onPress={decrease}
        disabled={disabled || value === 0}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        restOpacity={disabled || value === 0 ? 0.4 : 1}
        style={styles.button}>
        <MBIcon name="remove" size="action" color={theme.colors.text} />
      </MBPressable>

      {/*
        Empty rather than '0' when nothing is picked. A field pre-filled with 0
        has to be cleared before a quantity can be typed, and on a numeric
        keypad that is the one key that is not there.
      */}
      <TextInput
        value={value > 0 ? String(value) : ''}
        onChangeText={type}
        editable={!disabled}
        keyboardType="number-pad"
        selectTextOnFocus
        placeholder="0"
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={`${label} quantity`}
        testID={testID}
        style={[
          theme.type.number,
          styles.field,
          {
            width: FIELD_W,
            color: theme.colors.text,
            borderLeftColor: theme.colors.borderControl,
            borderRightColor: theme.colors.borderControl,
          },
        ]}
      />

      <MBPressable
        onPress={increase}
        disabled={disabled}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        restOpacity={disabled ? 0.4 : 1}
        style={styles.button}>
        <MBIcon name="add" size="action" color={theme.colors.text} />
      </MBPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  button: {
    width: layout.stepperSize,
    height: layout.stepperSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* No vertical padding: the field is the control's full height, so the two
     internal rules run edge to edge and the three parts read as one box. */
  field: {
    height: '100%',
    textAlign: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 0,
  },
  disabled: { opacity: 0.5 },
});
