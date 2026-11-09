import {
  forwardRef,
  useEffect,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useAppTheme } from '@/shared/theme';

/** The imperative handle of a mounted `TextInput` (`focus()`, `blur()`, …) — what a `ref` to a field resolves to. */
export type TextFieldHandle = ComponentRef<typeof TextInput>;

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Adds the accent asterisk and announces the field as required. */
  required?: boolean;
  /** Validation message — turns the border red and is announced when it appears. */
  error?: string | null;
  /** Small muted text under the input (hidden while an error shows). */
  helper?: string;
  /** Rendered inside the field at the right edge (e.g. the password Show/Hide toggle). */
  rightAccessory?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const FIELD_HEIGHT = 52;

/**
 * The labelled input of the login/forgot-password forms: `surface` fill, 1px
 * `border` that switches to `accent` on focus and `danger` on error, 12px
 * radius, 52dp tall. The error text sits under the field and is read out by
 * screen readers when it appears.
 */
export const TextField = forwardRef<TextFieldHandle, TextFieldProps>(
  function TextFieldInner(
    {
      label,
      required = false,
      error,
      helper,
      rightAccessory,
      containerStyle,
      onFocus,
      onBlur,
      accessibilityLabel,
      testID,
      ...inputProps
    },
    ref,
  ) {
    const { colors, typography, radii } = useAppTheme();
    const [focused, setFocused] = useState(false);

    useEffect(() => {
      // Android reads the live region below on its own; iOS needs an explicit announcement.
      if (error && Platform.OS === 'ios')
        AccessibilityInfo.announceForAccessibility(`${label}: ${error}`);
    }, [error, label]);

    const borderColor = error
      ? colors.danger
      : focused
      ? colors.accent
      : colors.border;

    return (
      <View style={containerStyle}>
        <Text
          style={[typography.brandLabel, { color: colors.textMuted }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {label}
          {required ? <Text style={{ color: colors.accent }}> *</Text> : null}
        </Text>
        <View
          style={[
            styles.box,
            {
              backgroundColor: colors.surface,
              borderColor,
              borderRadius: radii.input,
            },
          ]}
        >
          <TextInput
            ref={ref}
            {...inputProps}
            testID={testID}
            accessibilityLabel={
              accessibilityLabel ?? (required ? `${label}, required` : label)
            }
            accessibilityHint={error ?? inputProps.accessibilityHint}
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            onFocus={event => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={event => {
              setFocused(false);
              onBlur?.(event);
            }}
            style={[
              typography.brandInput,
              styles.input,
              { color: colors.text },
            ]}
          />
          {rightAccessory ? (
            <View style={styles.accessory}>{rightAccessory}</View>
          ) : null}
        </View>
        {error ? (
          <Text
            style={[
              typography.brandCaption,
              styles.message,
              { color: colors.danger },
            ]}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            testID={testID ? `${testID}-error` : undefined}
          >
            {error}
          </Text>
        ) : helper ? (
          <Text
            style={[
              typography.brandCaption,
              styles.message,
              { color: colors.textMuted },
            ]}
          >
            {helper}
          </Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  box: {
    marginTop: 8,
    height: FIELD_HEIGHT,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    height: FIELD_HEIGHT,
    paddingVertical: 0,
    paddingRight: 16,
  },
  accessory: {
    height: FIELD_HEIGHT,
    justifyContent: 'center',
  },
  message: {
    marginTop: 6,
  },
});
