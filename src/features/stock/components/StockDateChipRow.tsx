import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

export interface StockDateChipRowProps {
  /** Already-formatted label, e.g. "Fri 16 Oct 2026". */
  dateLabel: string;
  isToday: boolean;
  onPrevDay: () => void;
  onToday: () => void;
  onInfo: () => void;
}

/**
 * Same pattern as sales' `SalesDateChipRow` — no date-picker dependency exists
 * in this app, so the calendar chip steps the business date back one day per
 * tap rather than opening a calendar sheet; "Today" jumps back to the current
 * business date. Stock additionally carries an info chip opening the column
 * explainer sheet.
 */
export function StockDateChipRow({ dateLabel, isToday, onPrevDay, onToday, onInfo }: StockDateChipRowProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        onPress={onPrevDay}
        style={[styles.dateChip, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
        <Icon name="calendar" size={15} color={theme.colors.textSecondary} />
        <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={1}>
          {dateLabel}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isToday }}
        onPress={onToday}
        style={[styles.todayChip, { backgroundColor: isToday ? theme.colors.primary : theme.colors.border, borderRadius: theme.radii.md }]}>
        <Text style={[theme.typography.label, { color: isToday ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>Today</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="What do these columns mean?"
        onPress={onInfo}
        style={[styles.infoChip, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
        <Icon name="info" size={15} color={theme.colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 16, flexDirection: 'row', gap: 8 },
  dateChip: { flex: 1, height: 42, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  todayChip: { height: 42, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  infoChip: { width: 42, height: 42, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
