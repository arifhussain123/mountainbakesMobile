import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { MBIcon } from './MBIcon';

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
          height: theme.layout.inputH,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.space.md,
        },
      ]}>
      <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>⌕</Text>

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
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>…</Text>
      ) : value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear search">
          <MBIcon name="close" size="action" color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1 },
  input: { flex: 1, padding: 0 },
});
