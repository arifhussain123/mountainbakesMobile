import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { FINANCE_DATE_RANGE_LABELS, FINANCE_DATE_RANGE_PRESETS, type FinanceDateRangePreset } from '../utils/dateRange';

export interface FinanceDateRangeFilterProps {
  value: FinanceDateRangePreset;
  onChange: (preset: FinanceDateRangePreset) => void;
}

/** Same segmented-control shape as Branch's DateFilter, over finance's own fixed presets (no date-picker library in this app). */
export function FinanceDateRangeFilter({ value, onChange }: FinanceDateRangeFilterProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.colors.border, borderRadius: theme.radii.md, padding: 4 }]}>
      {FINANCE_DATE_RANGE_PRESETS.map((preset) => {
        const active = preset === value;
        return (
          <Pressable
            key={preset}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(preset)}
            style={[styles.segment, { backgroundColor: active ? theme.colors.surface : 'transparent', borderRadius: theme.radii.sm }]}>
            <Text style={[theme.typography.label, { color: active ? theme.colors.text : theme.colors.textSecondary, textAlign: 'center' }]} numberOfLines={1}>
              {FINANCE_DATE_RANGE_LABELS[preset]}
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
