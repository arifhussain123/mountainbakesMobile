import { Pressable, StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '../Icon';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accessibilityLabel?: string;
  testID?: string;
}

/** The 20x20 rounded checkbox from mountainbakesBranch.html's Login "Remember me" row. */
export function Checkbox({ checked, onChange, accessibilityLabel, testID }: CheckboxProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      hitSlop={10}
      onPress={() => onChange(!checked)}
      style={styles.hitArea}>
      <View
        style={[
          styles.box,
          {
            borderRadius: theme.radii.sm - 2,
            borderColor: checked ? theme.colors.primary : theme.colors.border,
            backgroundColor: checked ? theme.colors.primary : 'transparent',
          },
        ]}>
        {checked ? <Icon name="check" size={12} color={theme.colors.primaryText} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  box: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
