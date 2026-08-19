import React from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { MBIcon } from './MBIcon';
import { MBPressable } from './MBPressable';
import { space } from '@/theme/spacing';

export interface MBSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Shown while a debounced query is in flight. */
  searching?: boolean;
  autoFocus?: boolean;
  testID?: string;
}

export function MBSearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  searching = false,
  autoFocus = false,
  testID,
}: MBSearchBarProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          // See MBInput: the token is a floor, not a fixed height, or the
          // query clips at large type.
          minHeight: theme.layout.inputH,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surface,
          // Same rule as MBInput: a control edge, not a divider.
          borderColor: theme.colors.borderControl,
          paddingHorizontal: theme.space.md,
        },
      ]}>
      <MBIcon name="search" size="action" color={theme.colors.textMuted} />

      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        // 'search' gives iOS the clear button and the right keyboard affordances.
        clearButtonMode="while-editing"
        style={[theme.type.body, styles.input, { color: theme.colors.text }]}
      />

      {searching ? (
        // A real indicator rather than a typed ellipsis: this one actually spins,
        // so a slow query looks like work in progress instead of a stuck field.
        <ActivityIndicator size="small" color={theme.colors.textMuted} />
      ) : value.length > 0 ? (
        <MBPressable
          onPress={() => onChangeText('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear search">
          <MBIcon name="close" size="action" color={theme.colors.textMuted} />
        </MBPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1 },
  input: { flex: 1, padding: 0 },
});
