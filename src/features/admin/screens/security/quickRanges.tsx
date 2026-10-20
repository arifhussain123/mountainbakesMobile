import { Pressable, StyleSheet, Text, View } from 'react-native';
import { format, parseISO, subDays } from 'date-fns';
import { useAppTheme } from '@/shared/theme';
import type { DateRange } from '@/shared/utils';

/**
 * The web's quick filters: business dates (2 AM cutoff), "Last 7 days" is
 * today plus the six before it. A quick range only sets the Date filter;
 * tapping the active one again clears it.
 */
export const QUICK_RANGES: ReadonlyArray<readonly [label: string, days: number]> = [
  ['Today', 0],
  ['Last 7 days', 6],
  ['Last 30 days', 29],
];

export function quickRange(days: number, today: string): DateRange {
  return { from: days === 0 ? today : format(subDays(parseISO(today), days), 'yyyy-MM-dd'), to: today };
}

export function isQuickRange(range: DateRange | null, days: number, today: string): boolean {
  const q = quickRange(days, today);
  return !!range && range.from === q.from && range.to === q.to;
}

/** A row of toggle buttons — selected ones filled with the accent. */
export function ToggleRow({ items }: { items: { label: string; active: boolean; onPress: () => void }[] }) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="button"
          accessibilityState={{ selected: item.active }}
          onPress={item.onPress}
          style={[
            styles.chip,
            {
              backgroundColor: item.active ? theme.colors.primary : theme.colors.cardFill,
              borderColor: item.active ? theme.colors.primary : theme.colors.cardBorder,
              borderRadius: theme.radii.pill,
            },
          ]}>
          <Text style={[theme.typography.label, { color: item.active ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { height: 34, paddingHorizontal: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
