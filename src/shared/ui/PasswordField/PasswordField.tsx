import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { TextField, type TextFieldProps } from '../TextField';

export interface PasswordFieldProps extends Omit<TextFieldProps, 'secureTextEntry' | 'rightAccessory'> {}

/** `TextField` with the Show/Hide reveal toggle from mountainbakesBranch.html's Login screen. */
export function PasswordField(props: PasswordFieldProps) {
  const theme = useAppTheme();
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      secureTextEntry={!visible}
      rightAccessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={8}
          style={{ height: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}
          onPress={() => setVisible((v) => !v)}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>{visible ? 'Hide' : 'Show'}</Text>
        </Pressable>
      }
    />
  );
}
