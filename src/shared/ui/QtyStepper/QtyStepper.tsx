import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '../Icon';

export interface QtyStepperProps {
  /** `null` renders "-" (not counted) rather than 0 — a real count of zero is a different, valid state. */
  value: number | null;
  /** `null` means the field was cleared back to "not counted" — the caller decides what that means (e.g. drop the count). */
  onChange: (value: number | null) => void;
  min?: number;
  accessibilityLabel?: string;
  /** Numeric-keypad "Next"/"Done" handoff — Stock Check wires this to move focus to the next row. */
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  /** A plain ref object, not `forwardRef` — same reasoning as `TextField`'s `inputRef`: RN 0.87's generated `TextInput` ref type and its own class-based instance type (which actually has `.focus`) disagree with each other. */
  inputRef?: React.RefObject<any>;
  testID?: string;
}

/**
 * `-`/`+` buttons flanking a numeric field — used wherever a quantity is
 * entered by hand (Stock Check counts, order/sale line quantities). Typing
 * directly in the field is the primary input; the buttons are a one-tap
 * nudge for small corrections.
 */
export function QtyStepper({ value, onChange, min = 0, accessibilityLabel, returnKeyType, onSubmitEditing, inputRef, testID }: QtyStepperProps) {
  const theme = useAppTheme();

  const current = value ?? 0;
  const decrementDisabled = value !== null && current <= min;

  const handleDecrement = () => onChange(Math.max(min, current - 1));
  const handleIncrement = () => onChange(current + 1);

  const handleChangeText = (text: string) => {
    if (text === '') {
      onChange(null);
      return;
    }
    const parsed = Number(text.replace(/[^0-9-]/g, ''));
    if (Number.isFinite(parsed)) onChange(Math.max(min, parsed));
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        disabled={decrementDisabled}
        onPress={handleDecrement}
        style={[styles.button, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, opacity: decrementDisabled ? 0.4 : 1 }]}>
        <Icon name="minus" size={14} color={theme.colors.text} />
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value === null ? '' : String(value)}
        onChangeText={handleChangeText}
        placeholder="-"
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType="number-pad"
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase"
        onPress={handleIncrement}
        style={[styles.button, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <Icon name="plus" size={14} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  button: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { width: 56, height: 36, borderRadius: 10, borderWidth: 1.5, textAlign: 'center', fontWeight: '700' },
});
