import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export type StockFilter = 'all' | 'inStock' | 'zero' | 'hasMovement' | 'waitingDemand' | 'adjusted';

const OPTIONS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'inStock', label: 'In stock' },
  { value: 'zero', label: 'Zero' },
  { value: 'hasMovement', label: 'Has movement' },
  { value: 'waitingDemand', label: 'Waiting demand' },
  { value: 'adjusted', label: 'Adjusted' },
];

export interface StockFilterChipsProps {
  value: StockFilter;
  onChange: (filter: StockFilter) => void;
  /** Hides the "Waiting demand" chip on a past date, where that figure doesn't exist. */
  showWaitingDemand: boolean;
}

export function StockFilterChips({ value, onChange, showWaitingDemand }: StockFilterChipsProps) {
  const theme = useAppTheme();
  const options = showWaitingDemand ? OPTIONS : OPTIONS.filter((option) => option.value !== 'waitingDemand');

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
              { backgroundColor: active ? theme.colors.primary : theme.colors.cardFill, borderColor: active ? theme.colors.primary : theme.colors.cardBorder },
            ]}>
            <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderWidth: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
