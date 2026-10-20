import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getBusinessDate, type SpecialEvent } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon } from '@/shared/ui';
import { EventCategoryBadge, EventCountdown, EventDateLabel } from './EventBits';
import { MONTH_NAMES, WEEKDAY_LABELS, buildMonthGrid, eventsByDate, formatHijriFor, longDateLabel, monthLabel, shiftMonth, toDateKey } from './eventModel';

export interface EventCalendarViewProps {
  events: SpecialEvent[];
  year: number;
  /** 1–12 */
  month: number;
  onMonthChange: (year: number, month: number) => void;
  onSelectEvent: (id: string) => void;
  loading?: boolean;
}

/**
 * Web EventCalendar on a phone: month header with its Hijri label, Today /
 * previous / next, a Monday-start grid with up to three colour dots per day,
 * and a panel below that lists the month's events — narrowed to one day once a
 * day is tapped.
 */
export function EventCalendarView({ events, year, month, onMonthChange, onSelectEvent, loading }: EventCalendarViewProps) {
  const theme = useAppTheme();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const today = getBusinessDate();

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const byDate = useMemo(() => eventsByDate(events), [events]);
  const monthEvents = useMemo(() => [...events].sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? '')), [events]);
  const listed = selectedDate ? (byDate.get(selectedDate) ?? []) : monthEvents;
  const monthHijri = formatHijriFor(toDateKey(year, month, 15));

  const goToMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setSelectedDate(null);
    onMonthChange(next.year, next.month);
  };
  const goToToday = () => {
    const [y, m] = today.split('-').map(Number);
    setSelectedDate(null);
    onMonthChange(y ?? year, m ?? month);
  };

  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={{ gap: 12 }}>
      <Card style={{ padding: theme.spacing.md }}>
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {monthLabel(year, month)}
            </Text>
            {monthHijri ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {monthHijri}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={goToToday}
            style={[styles.todayBtn, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.sm }]}>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Today</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => goToMonth(-1)} style={styles.iconBtn}>
            <Icon name="chevron-left" color={theme.colors.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => goToMonth(1)} style={styles.iconBtn}>
            <Icon name="chevron-right" color={theme.colors.text} />
          </Pressable>
        </View>

        <View style={styles.week}>
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={[theme.typography.label, styles.weekday, { color: theme.colors.textSecondary }]}>
              {label.charAt(0)}
            </Text>
          ))}
        </View>

        <View style={{ opacity: loading ? 0.5 : 1 }}>
          {rows.map((row) => (
            <View key={row[0]?.key} style={styles.week}>
              {row.map((cell) => {
                const dayEvents = byDate.get(cell.key) ?? [];
                const selected = selectedDate === cell.key;
                const isToday = cell.key === today;
                return (
                  <Pressable
                    key={cell.key}
                    accessibilityRole="button"
                    accessibilityLabel={longDateLabel(cell.key)}
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedDate(selected ? null : cell.key)}
                    style={[
                      styles.cell,
                      { borderRadius: theme.radii.sm, opacity: cell.outside ? 0.4 : 1 },
                      selected ? { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}14` } : null,
                    ]}>
                    <View style={[styles.dayNum, isToday ? { backgroundColor: theme.colors.primary } : null]}>
                      <Text style={[theme.typography.label, { color: isToday ? theme.colors.primaryText : theme.colors.text, fontWeight: isToday ? '700' : '500' }]}>
                        {cell.day}
                      </Text>
                    </View>
                    <View style={styles.dots}>
                      {dayEvents.slice(0, 3).map((event) => (
                        <View key={event.id} style={[styles.dot, { backgroundColor: event.color ?? theme.colors.primary }]} />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        {loading ? <ActivityIndicator style={StyleSheet.absoluteFill} color={theme.colors.primary} /> : null}
      </Card>

      <Card style={{ padding: theme.spacing.md, gap: 10 }}>
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>
              {selectedDate ? longDateLabel(selectedDate) : `Events in ${MONTH_NAMES[month - 1] ?? ''}`}
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              {selectedDate
                ? (formatHijriFor(selectedDate) ?? '')
                : `${monthEvents.length} event${monthEvents.length === 1 ? '' : 's'} · auto-detected`}
            </Text>
          </View>
          {selectedDate ? (
            <Pressable accessibilityRole="button" onPress={() => setSelectedDate(null)} style={styles.todayBtn}>
              <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>Show all</Text>
            </Pressable>
          ) : null}
        </View>

        {listed.length === 0 ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {selectedDate ? 'No events on this day.' : 'No events this month.'}
          </Text>
        ) : null}
        {listed.map((event) => (
          <Pressable
            key={`${event.id}:${event.eventDate ?? ''}`}
            accessibilityRole="button"
            onPress={() => onSelectEvent(event.id)}
            style={[
              styles.eventRow,
              { borderColor: theme.colors.cardBorder, borderLeftColor: event.color ?? theme.colors.primary, borderRadius: theme.radii.md },
            ]}>
            <View style={styles.eventTop}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={2}>
                {event.name}
              </Text>
              <EventCategoryBadge category={event.category} />
            </View>
            <EventDateLabel event={event} />
            <EventCountdown daysRemaining={event.daysRemaining} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  todayBtn: { minHeight: 36, paddingHorizontal: 10, justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: 4 },
  cell: { flex: 1, minHeight: 48, alignItems: 'center', paddingVertical: 4, gap: 3, borderWidth: 1, borderColor: 'transparent' },
  dayNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  eventRow: { borderWidth: 1, borderLeftWidth: 3, padding: 12, gap: 4 },
  eventTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
});
