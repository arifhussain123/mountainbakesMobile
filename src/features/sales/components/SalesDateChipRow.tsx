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
 * The business-date stepper under the Sales title (the title's eyebrow names
 * the date shown): a calendar chip that steps
 * the business date back one day per tap, and a "Today" chip that jumps
 * straight back (also the way "forward" works, since most browsing is
 * backward from today). Styled as the 2026 redesign's filter chips — white
 * pill, faint lavender border; the active "Today" chip is the midnight pill.
 * TODO: swap the calendar chip's tap for a real calendar picker.
 */
export function SalesDateChipRow({ dateLabel, isToday, onPrevDay, onToday }: SalesDateChipRowProps) {
  const theme = useAppTheme();
  const activeFill = theme.isDark ? theme.colors.primary : '#1E1B4B';
  const activeInk = theme.isDark ? theme.colors.primaryText : '#FFFFFF';

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Previous day, showing ${dateLabel}`}
        onPress={onPrevDay}
        style={[styles.chip, styles.dateChip, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
        <Icon name="chevron-left" size={16} color={theme.colors.textSecondary} />
        <Icon name="calendar" size={16} color={theme.colors.textSecondary} />
        <Text style={[styles.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          Previous day
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isToday }}
        onPress={onToday}
        style={[
          styles.chip,
          { backgroundColor: isToday ? activeFill : theme.colors.cardFill, borderColor: isToday ? activeFill : theme.colors.cardBorder },
        ]}>
        <Text style={[styles.label, { color: isToday ? activeInk : theme.colors.textSecondary }]}>Today</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: { height: 36, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dateChip: { paddingLeft: 10 },
  label: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
});
