import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export interface MBInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Server or Zod message. Its presence puts the field in an error state. */
  error?: string;
  hint?: string;
  required?: boolean;
  /** Renders a show/hide toggle and starts obscured. */
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  /** Right-aligned tabular figures, for money and quantity entry. */
  numeric?: boolean;
}

/**
 * Text field.
 *
 * The error message is bound to the field rather than shown in a toast, because
 * the server returns Zod field errors as `[{field, message}]` and a staff member
 * mid-entry needs to see which input is wrong, not a floating banner.
 */
export const MBInput = forwardRef<TextInput, MBInputProps>(function MBInputInner(
  {
    label,
    error,
    hint,
    required = false,
    isPassword = false,
    containerStyle,
    numeric = false,
    ...inputProps
  },
  ref,
): React.ReactElement {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [obscured, setObscured] = useState(isPassword);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.focusRing
      : theme.colors.border;

  // Built outside JSX so the dynamic values stay in one place and the style prop
  // is a plain reference.
  const fieldStyle = {
    height: theme.layout.inputH,
    borderRadius: theme.radius.md,
    borderColor,
    borderWidth: focused || error ? 2 : 1,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.space.md,
  } as const;

  const requiredMark = { color: theme.colors.danger } as const;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
          {label}
          {required ? <Text style={requiredMark}> *</Text> : null}
        </Text>
      ) : null}

      <View style={[styles.field, fieldStyle]}>
        <TextInput
          ref={ref}
          {...inputProps}
          secureTextEntry={obscured}
          onFocus={e => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel={label}
          // Announce the error to a screen reader, not just visually.
          accessibilityHint={error ?? hint}
          style={[
            theme.type.body,
            styles.input,
            numeric && [theme.type.mono, styles.numeric],
            { color: theme.colors.text },
          ]}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setObscured(v => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={obscured ? 'Show password' : 'Hide password'}>
            <Text style={[theme.type.label, { color: theme.colors.accent }]}>
              {obscured ? 'Show' : 'Hide'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={[theme.type.caption, { color: theme.colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, padding: 0 },
  numeric: { textAlign: 'right' },
});
