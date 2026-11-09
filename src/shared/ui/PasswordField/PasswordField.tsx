import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import {
  TextField,
  FIELD_HEIGHT,
  type TextFieldHandle,
  type TextFieldProps,
} from '../TextField';

export type PasswordFieldProps = Omit<
  TextFieldProps,
  'secureTextEntry' | 'rightAccessory'
>;

/**
 * `TextField` with the password masked by default and a "Show"/"Hide" toggle
 * inside the field. The toggle is a full-height 44dp-wide target and reads as
 * "Show password" / "Hide password" to a screen reader.
 */
export const PasswordField = forwardRef<TextFieldHandle, PasswordFieldProps>(
  function PasswordFieldInner({ testID, ...props }, ref) {
    const { colors, typography } = useAppTheme();
    const [visible, setVisible] = useState(false);

    return (
      <TextField
        ref={ref}
        {...props}
        testID={testID}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        rightAccessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            onPress={() => setVisible(value => !value)}
            hitSlop={4}
            style={styles.toggle}
            testID={testID ? `${testID}-toggle` : undefined}
          >
            <Text style={[typography.brandLink, { color: colors.accent }]}>
              {visible ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        }
      />
    );
  },
);

const styles = StyleSheet.create({
  toggle: {
    minWidth: 44,
    height: FIELD_HEIGHT,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
