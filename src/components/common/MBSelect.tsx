import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBPressable } from './MBPressable';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';

/**
 * A labelled single-select field, drawn as a wrapping row of chips.
 *
 * ---------------------------------------------------------------------------
 * Why chips and not a dropdown
 * ---------------------------------------------------------------------------
 * Every select in this app picks from a **short, fixed, known** set — four
 * payment methods, six expense categories — and all of them are values of a
 * shared enum rather than a fetched list. A dropdown hides those behind a tap
 * and a modal for no gain: the options fit on screen, and one tap sets the
 * value instead of three. It also means the current value is readable without
 * interacting at all, which is what someone glancing at a half-filled form
 * needs.
 *
 * If a select ever has to carry an unbounded set — every product, every branch
 * — that is a different control (a searchable sheet), not a taller version of
 * this one. Do not grow this into that.
 *
 * ---------------------------------------------------------------------------
 * Why it is its own component
 * ---------------------------------------------------------------------------
 * This markup existed **twice, identically**: the payment method on the sale
 * form and the category on the expense form. Both hand-rolled the same
 * `MBPressable` in a pill, the same selected/unselected token pair, and the
 * same `accessibilityState`. That is the state a duplicated control is in right
 * up until one of them forgets `selected` and stops announcing itself to a
 * screen reader while the other keeps working — the exact drift
 * `MBFilterChips` was extracted to stop for *filters*.
 *
 * `MBFilterChips` is the neighbouring component and deliberately not this one:
 * a filter narrows what is already on screen and carries no field label, while
 * a select is a form input with a label, a value, and a validation error to
 * show. They look similar and mean different things.
 */

export interface MBSelectProps<T extends string> {
  /** The field label, e.g. "Payment method". */
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /**
   * How an option reads. Defaults to the raw value, which is correct for the
   * enums here — they are already words ("cash", "utilities"), not codes.
   */
  renderLabel?: (option: T) => string;
  /** Validation message, shown under the row in the danger token. */
  error?: string;
  testIDPrefix?: string;
}

export function MBSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  renderLabel,
  error,
  testIDPrefix,
}: MBSelectProps<T>): React.ReactElement {
  const theme = useTheme();

  return (
    <View style={styles.group}>
      <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>{label}</Text>

      <View style={styles.chips}>
        {options.map(option => {
          const selected = option === value;
          return (
            <MBPressable
              key={option}
              testID={testIDPrefix ? `${testIDPrefix}-${option}` : undefined}
              onPress={() => onChange(option)}
              accessibilityRole="button"
              // Not decoration: without it a screen reader reads six identical
              // buttons and never says which one is chosen.
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                {
                  borderRadius: theme.radius.sm, // a chip is chosen, not read — v4 keeps the pill for status
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                },
              ]}>
              <Text
                style={[
                  theme.type.label,
                  { color: selected ? theme.colors.onPrimary : theme.colors.text },
                ]}>
                {renderLabel ? renderLabel(option) : option}
              </Text>
            </MBPressable>
          );
        })}
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={[theme.type.caption, { color: theme.colors.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    height: 40,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
