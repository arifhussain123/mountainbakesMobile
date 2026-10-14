import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export type DatePeriod = 'daily' | 'weekly' | 'monthly';

export interface DateFilterProps {
  value: DatePeriod;
  onChange: (period: DatePeriod) => void;
}

const OPTIONS: { value: DatePeriod; label: string }[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
];

/**
 * CLAUDE.md Section 6 asks for Today/Yesterday/Custom/Week/Month; Phase 1 wires
 * the three that map directly onto the backend's `reports/summary?period=`
 * values (Yesterday/Custom are a later phase — the backend has no such period).
 */
export function DateFilter({ value, onChange }: DateFilterProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.colors.border, borderRadius: theme.radii.md, padding: 4 }]}>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              {
                backgroundColor: active ? theme.colors.surface : 'transparent',
                borderRadius: theme.radii.sm,
              },
            ]}>
            <Text style={[theme.typography.label, { color: active ? theme.colors.text : theme.colors.textSecondary, textAlign: 'center' }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  segment: { flex: 1, height: 32, alignItems: 'center', justifyContent: 'center' },
});
