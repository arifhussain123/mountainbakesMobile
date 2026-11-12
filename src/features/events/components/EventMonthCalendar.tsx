import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon } from '@/shared/ui';

export interface EventMonthCalendarProps {
  year: number;
  /** 0-based month. */
  month: number;
  /** 'YYYY-MM-DD' days that have at least one event. */
  eventDates: Set<string>;
  /** 'YYYY-MM-DD' — outlined. */
  today: string;
  onShiftMonth: (delta: number) => void;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Redesign B18's month card: Monday-first grid, event days filled with the
 * accent, today outlined, prev/next round buttons. Display only — the events
 * of the shown month are listed beneath it by the screen.
 */
export function EventMonthCalendar({ year, month, eventDates, today, onShiftMonth }: EventMonthCalendarProps) {
  const theme = useAppTheme();
  const label = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const cells = useMemo(() => {
    // getDay(): 0 = Sunday → shift so Monday is column 0.
    const lead = (new Date(year, month, 1).getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    const out: (number | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= count; d++) out.push(d);
    return out;
  }, [year, month]);

  const navStyle = [
    styles.nav,
    { backgroundColor: theme.isDark ? theme.colors.border : theme.colors.surface },
    theme.isDark ? null : styles.navLift,
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{label}</Text>
        <View style={styles.navRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => onShiftMonth(-1)} style={navStyle}>
            <Icon name="chevron-left" size={18} color={theme.colors.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => onShiftMonth(1)} style={navStyle}>
            <Icon name="chevron-right" size={18} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((d, i) => (
          <View key={`w${i}`} style={styles.weekCell}>
            <Text style={[styles.weekday, { color: theme.colors.textFaint }]}>{d}</Text>
          </View>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <View key={`e${i}`} style={styles.cell} />;
          const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
          const hasEvent = eventDates.has(iso);
          const isToday = iso === today;
          return (
            <View key={iso} style={styles.cell}>
              <View
                accessibilityLabel={hasEvent ? `${day}, has an event` : undefined}
                style={[
                  styles.day,
                  hasEvent ? { backgroundColor: theme.colors.primary } : null,
                  !hasEvent && isToday ? { borderWidth: 1.5, borderColor: theme.colors.text } : null,
                ]}>
                <Text style={[styles.dayText, { color: hasEvent ? theme.colors.primaryText : theme.colors.text }]}>{day}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  navRow: { flexDirection: 'row', gap: 6 },
  nav: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  navLift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  weekday: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  cell: { width: `${100 / 7}%`, padding: 2 },
  day: { height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 13, fontWeight: '600' },
});
