import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

export interface SalesDateChipRowProps {
  /** Already-formatted label, e.g. "Mon 12 Oct 2026". */
  dateLabel: string;
  isToday: boolean;
  onPrevDay: () => void;
  onToday: () => void;
}

/**
 * Design `09 Sales` lines 439-441 — the calendar-icon date chip + "Today"
 * toggle chip (exactly two chips, no arrows in the mock). The project has no
 * date-picker dependency yet, so the calendar chip itself steps the business
 * date back one day per tap rather than opening a calendar sheet; "Today"
 * jumps straight back to the current business date (also the way "forward"
 * works, since most browsing is backward from today). TODO: swap the chip's
 * tap handler for a real calendar picker if/when one is added to the app.
 */
export function SalesDateChipRow({ dateLabel, isToday, onPrevDay, onToday }: SalesDateChipRowProps) {
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
        style={[
          styles.todayChip,
          { backgroundColor: isToday ? theme.colors.primary : theme.colors.border, borderRadius: theme.radii.md },
        ]}>
        <Text style={[theme.typography.label, { color: isToday ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>Today</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 16, flexDirection: 'row', gap: 8 },
  dateChip: { flex: 1, height: 42, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  todayChip: { height: 42, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});
