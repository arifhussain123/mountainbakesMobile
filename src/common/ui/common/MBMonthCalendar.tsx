import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBIcon } from '@/common/ui/common/MBIcon';
import { MBPressable } from '@/common/ui/common/MBPressable';
import { useTheme } from '@/common/theme/ThemeProvider';
import { businessDateStr } from '@/shared/utils/timezone';
import { formatBusinessDate } from '@/common/helpers/businessDay';
import { radius } from '@/common/theme/radius';

/** Monday-first, which is how a bakery week is planned and how the API rolls up. */
const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface MBMonthCalendarProps {
  /** The month on show. 1-based, matching the API's `month` parameter. */
  year: number;
  month: number;
  onMonthChange: (next: { year: number; month: number }) => void;
  /**
   * Business dates (`YYYY-MM-DD`) that have something on them. Marked, and
   * tappable; every other day is drawn but inert.
   */
  markedDates: readonly string[];
  /** The selected day, or `null` for "the whole month". */
  selectedDate: string | null;
  /** Tapping the selected day again clears it — hence the nullable argument. */
  onSelectDate: (date: string | null) => void;
  testID?: string;
}

/**
 * A month grid with the days that have something on them marked.
 *
 * ---------------------------------------------------------------------------
 * Only marked days are tappable
 * ---------------------------------------------------------------------------
 * A calendar in this app is a **filter over a list**, not a date picker: the
 * events are the content and the grid is a way of finding one by when it falls.
 * Making every cell tappable would mean twenty-eight of thirty-one taps
 * emptying the list, which teaches people that the calendar does not work.
 *
 * Tapping the selected day again clears the filter, so there is a way back to
 * the whole month without hunting for a "show all" control.
 *
 * ---------------------------------------------------------------------------
 * Today is marked, and it is the *business* day
 * ---------------------------------------------------------------------------
 * The day rolls at 02:00 Karachi. At 01:00 the bakery is still working
 * yesterday, and a calendar that highlighted the calendar date would put the
 * ring on a day the shift has not reached. `businessDateStr()` is the same clock
 * every other date in the app is on.
 *
 * The month arrows are **not** clamped: an event can be scheduled a year out,
 * and unlike a ledger — which is derived by walking backwards from today and
 * genuinely cannot reach further — nothing here stops the calendar going where
 * the user wants.
 */
export function MBMonthCalendar({
  year,
  month,
  onMonthChange,
  markedDates,
  selectedDate,
  onSelectDate,
  testID,
}: MBMonthCalendarProps): React.ReactElement {
  const theme = useTheme();

  const marked = useMemo(() => new Set(markedDates), [markedDates]);
  const today = businessDateStr();

  /**
   * The grid, including the leading blanks.
   *
   * Built from UTC parts rather than a local `new Date(y, m, d)`: the latter
   * reads the *device's* timezone, so a phone west of Karachi renders a month
   * that starts on the wrong weekday for a bakery in Karachi.
   */
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(year, month - 1, 1));
    // getUTCDay is Sunday-first; the grid is Monday-first.
    const lead = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const out: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      out.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return out;
  }, [year, month]);

  const step = (delta: number) => {
    const at = new Date(Date.UTC(year, month - 1 + delta, 1));
    onMonthChange({ year: at.getUTCFullYear(), month: at.getUTCMonth() + 1 });
  };

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.layout.cardPad,
          gap: theme.space.md,
        },
        theme.shadows.e1,
      ]}>
      <View style={styles.head}>
        <Text
          accessibilityRole="header"
          style={[theme.type.h3, { color: theme.colors.text }]}>
          {MONTH_NAMES[month - 1]} {year}
        </Text>
        <View style={[styles.arrows, { gap: theme.space.lg }]}>
          <MBPressable
            onPress={() => step(-1)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            testID={testID ? `${testID}-prev` : undefined}>
            <MBIcon name="back" size="action" color={theme.colors.textSubtle} />
          </MBPressable>
          <MBPressable
            onPress={() => step(1)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            testID={testID ? `${testID}-next` : undefined}>
            <MBIcon name="chevron" size="action" color={theme.colors.textSubtle} />
          </MBPressable>
        </View>
      </View>

      <View style={styles.grid}>
        {WEEKDAY_INITIALS.map((initial, i) => (
          <View key={i} style={styles.cell}>
            {/* Hidden from the reader: "M T W T F S S" read aloud is seven
                letters with no meaning, and each day cell already announces its
                own full date. */}
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[theme.type.caption, styles.centre, { color: theme.colors.textMuted }]}>
              {initial}
            </Text>
          </View>
        ))}

        {cells.map((date, i) => {
          if (!date) return <View key={`blank-${i}`} style={styles.cell} />;

          const day = Number(date.slice(8));
          const isToday = date === today;
          const isMarked = marked.has(date);
          const isSelected = date === selectedDate;

          const fill = isSelected
            ? theme.colors.secondary
            : isMarked
            ? theme.colors.primarySoft
            : theme.colors.transparent;
          const fg = isSelected
            ? theme.colors.onSecondary
            : isMarked
            ? theme.colors.text
            : theme.colors.textMuted;

          const body = (
            <View
              style={[
                styles.day,
                {
                  backgroundColor: fill,
                  borderRadius: theme.radius.sm,
                  borderColor: isToday ? theme.colors.primary : theme.colors.transparent,
                },
                // Today keeps a ring whether or not anything is on it — it is
                // where the reader is standing, not a piece of content.
                isToday ? styles.todayRing : null,
              ]}>
              <Text style={[theme.type.caption, styles.centre, { color: fg }]}>{day}</Text>
            </View>
          );

          if (!isMarked) {
            return (
              <View key={date} style={styles.cell} accessible accessibilityLabel={dayLabel(date, isToday, false)}>
                {body}
              </View>
            );
          }

          return (
            <MBPressable
              key={date}
              onPress={() => onSelectDate(isSelected ? null : date)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={dayLabel(date, isToday, true)}
              feedback="opacity"
              style={styles.cell}
              testID={testID ? `${testID}-day-${date}` : undefined}>
              {body}
            </MBPressable>
          );
        })}
      </View>
    </View>
  );
}

function dayLabel(date: string, isToday: boolean, hasEvents: boolean): string {
  const parts = [formatBusinessDate(date)];
  if (isToday) parts.push('today');
  parts.push(hasEvents ? 'has events' : 'nothing scheduled');
  return parts.join(', ');
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrows: { flexDirection: 'row', alignItems: 'center' },
  // A seven-column grid by `flexBasis`, not by measuring: `14.2857%` is one
  // seventh, and letting flexbox do the division keeps the columns aligned at
  // any width without an onLayout pass.
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', paddingVertical: 3 },
  day: { minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  centre: { textAlign: 'center' },
  todayRing: { borderWidth: 1.5 },
});
