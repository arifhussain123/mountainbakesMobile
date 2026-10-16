import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  required?: boolean;
  error?: string;
  /** Rendered inside the input's right edge (e.g. PasswordField's Show/Hide toggle). */
  rightAccessory?: React.ReactNode;
  /**
   * A plain ref object rather than `forwardRef` — the only real use here is
   * `passwordField.current?.focus()` from "next" on email. Typed `any`: RN
   * 0.87's generated `TextInput` ref type and its own class-based instance
   * type (which actually has `.focus`/`.blur`) disagree with each other.
   */
  inputRef?: React.RefObject<any>;
  testID?: string;
}

/**
 * The glass-card text input from mountainbakesBranch.html's Login screen:
 * `rgba(255,255,255,.04)` fill, `rgba(255,255,255,.18)` border, radius 16, 52dp
 * tall — border switches to `primary` on focus and `danger` on error.
 */
export function TextField({ label, required, error, rightAccessory, inputRef, onFocus, onBlur, testID, ...inputProps }: TextFieldProps) {
  const theme = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error ? theme.colors.danger : isFocused ? theme.colors.primary : theme.colors.border;

  return (
    <View style={styles.container}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>
        {label}
        {required ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.inputRow,
          {
            marginTop: theme.spacing.sm,
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.cardFill,
            borderColor,
          },
        ]}>
        <TextInput
          ref={inputRef}
          testID={testID}
          accessibilityLabel={required ? `${label}, required` : label}
          accessibilityState={{ disabled: inputProps.editable === false }}
          placeholderTextColor={theme.colors.textFaint}
          style={[styles.input, { color: theme.colors.text }]}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />
        {rightAccessory}
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[theme.typography.label, { color: theme.colors.danger, marginTop: theme.spacing.xs }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
});
