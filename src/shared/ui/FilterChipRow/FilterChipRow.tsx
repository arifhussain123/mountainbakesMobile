import { ScrollView, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface FilterChipOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional trailing count, e.g. "Pending (4)" — omit when no count is available. */
  count?: number;
}

export interface FilterChipRowProps<T extends string = string> {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * A generic horizontally-scrolling row of single-select filter chips — status
 * filters, payment-method filters, or any other small enum. Not tied to any
 * one feature's vocabulary; callers supply their own `value`/`label` pairs.
 */
export function FilterChipRow<T extends string = string>({ options, value, onChange }: FilterChipRowProps<T>) {
  const theme = useAppTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.colors.primary : theme.colors.cardFill,
                borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
                borderRadius: theme.radii.pill,
              },
            ]}>
            <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>
              {option.label}
              {option.count !== undefined ? <Text style={{ opacity: 0.7 }}> {option.count}</Text> : null}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: { height: 32, paddingHorizontal: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
