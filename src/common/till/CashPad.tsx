import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBInput, MBMoney, MBPressable } from '@/common/ui';
import { formatAmount } from '@/common/utils/money';
import { radius } from '@/common/theme/radius';
import { layout, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

/**
 * Denominations the pad offers.
 *
 * The notes a customer actually hands over at a bakery counter. They **add** to
 * the amount received rather than replacing it, because tendering is cumulative
 * — two five-hundreds and a hundred is three taps, not a mental sum typed in.
 */
export const CASH_NOTES = [50, 100, 500, 1000, 5000] as const;

export interface CashPadProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Adds a note's worth to what has been received so far. */
  onAddNote: (amount: number) => void;
  /** Sets the amount received to the grand total exactly. */
  onExact: () => void;
  /** Change owed. Only meaningful when something has been entered. */
  returned: number;
  /** What the tender does not cover. Non-zero blocks both finishes. */
  stillDue: number;
  currencySymbol?: string;
  disabled?: boolean;
}

/**
 * Taking cash: a typed amount, the notes that were handed over, and what goes
 * back.
 *
 * ---------------------------------------------------------------------------
 * The notes ADD, and Exact SETS
 * ---------------------------------------------------------------------------
 * Tendering is cumulative — two five-hundreds and a hundred is three taps, not a
 * sum done in the head and typed in — so each note button adds its value to what
 * is already there. `Exact` is the opposite operation and is the reason it is a
 * separate control rather than another note: it means "the customer gave the
 * amount", which is a *replacement*, and the commonest single case at a counter.
 *
 * ---------------------------------------------------------------------------
 * An empty field is not a short payment
 * ---------------------------------------------------------------------------
 * Blank means the tender was not recorded, which is a normal thing to skip. The
 * key is then omitted from the payload entirely and the server does not ask.
 * Only an amount that has been entered and does not cover the total is short,
 * and that is what shows **Still due** and blocks both save paths — a sale saved
 * with money missing is a till that will not reconcile at close, and nobody will
 * know which sale it was.
 */
export function CashPad({
  value,
  onChangeText,
  onAddNote,
  onExact,
  returned,
  stillDue,
  currencySymbol,
  disabled = false,
}: CashPadProps): React.ReactElement {
  const theme = useTheme();
  const entered = value.trim() !== '';

  return (
    <View style={styles.root}>
      <MBInput
        label="Cash received"
        numeric
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChangeText}
        {...(stillDue > 0 ? { error: 'Less than the grand total' } : {})}
        editable={!disabled}
        testID="cash-received"
      />

      <View style={styles.pad}>
        {CASH_NOTES.map(note => (
          <PadKey
            key={note}
            label={`+${formatAmount(note)}`}
            accessibilityLabel={`Add ${formatAmount(note)} to the cash received`}
            onPress={() => onAddNote(note)}
            disabled={disabled}
            testID={`cash-note-${note}`}
          />
        ))}
        <PadKey
          label="Exact"
          accessibilityLabel="Set the cash received to the grand total"
          onPress={onExact}
          disabled={disabled}
          emphasis
          testID="cash-exact"
        />
      </View>

      {/* One line, never both, and never a signed number: "give back 752" and
          "still due 250" are two different sentences at a counter, and a
          negative change figure makes the cashier do the sign in their head
          while somebody waits. */}
      {entered ? (
        stillDue > 0 ? (
          <View style={styles.result}>
            <Text
              accessibilityRole="alert"
              style={[theme.type.bodyStrong, { color: theme.colors.danger }]}>
              Still due
            </Text>
            <MBMoney
              value={stillDue}
              size="md"
              color={theme.colors.danger}
              symbol={currencySymbol}
              testID="cash-still-due"
            />
          </View>
        ) : (
          <View style={styles.result}>
            <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
              Cash returned
            </Text>
            <MBMoney
              value={returned}
              size="md"
              symbol={currencySymbol}
              testID="cash-returned"
            />
          </View>
        )
      ) : null}
    </View>
  );
}

/**
 * One key on the pad.
 *
 * `layout.stepperSize` tall — 44, the height the notes ask for and the height
 * the steppers already use, so the two rows of controls on this screen agree.
 * `Exact` is drawn as the emphasised one because it is the key most often
 * wanted, and a row of seven identical chips gives the eye nothing to aim at.
 */
function PadKey({
  label,
  accessibilityLabel,
  onPress,
  disabled,
  emphasis = false,
  testID,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled: boolean;
  emphasis?: boolean;
  testID: string;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <MBPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      restOpacity={disabled ? 0.5 : 1}
      testID={testID}
      style={[
        styles.key,
        {
          borderRadius: radius.sm,
          borderColor: emphasis ? theme.colors.accent : theme.colors.borderControl,
          backgroundColor: emphasis ? theme.colors.accentSoft : theme.colors.surface,
        },
      ]}>
      <Text
        style={[
          theme.type.label,
          { color: emphasis ? theme.colors.accent : theme.colors.text },
        ]}>
        {label}
      </Text>
    </MBPressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  key: {
    minWidth: 68,
    height: layout.stepperSize,
    paddingHorizontal: space.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  result: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
