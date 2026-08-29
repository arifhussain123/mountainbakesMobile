import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import {
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBListCard,
  MBListRow,
  MBMonthCalendar,
  MBSectionHeader,
  MBSkeletonList,
  MBModal,
} from '@/common/ui';
import { isBranchRole } from '@/navigation/roleNavigation';
import { useAuthStore } from '@/state/authStore';
import { EventDemandSheet } from '../components/EventDemandSheet';
import { getEventCalendar, getSpecialEvents } from '@/api/services/eventsService';
import { qk } from '@/api/queryKeys';
import type { SpecialEventView } from '@/shared/types/special-event.types';
import { businessDateStr } from '@/shared/utils/timezone';
import { useTheme } from '@/common/theme/ThemeProvider';
import { formatBusinessDate } from '@/common/helpers/businessDay';
import { contentColumn, space } from '@/common/theme/spacing';

/**
 * The bakery's calendar: Eid, Ramadan, a wedding order, a market day.
 *
 * ---------------------------------------------------------------------------
 * Why a branch sees this at all
 * ---------------------------------------------------------------------------
 * An event is not an admin's planning artefact — it is the reason a branch is
 * asked for three hundred extra loaves and the reason production starts two days
 * early. `GET /api/special-events` is open to every signed-in role and scoped
 * server-side: a branch sees events that apply to all branches plus any that
 * name it, and nothing else. So this is a More row for everyone rather than an
 * admin screen, and nothing on it is a write — a branch's part in an event is
 * its demand, which goes through the normal production-order path.
 *
 * ---------------------------------------------------------------------------
 * An estimated date is marked, every time it is shown
 * ---------------------------------------------------------------------------
 * Hijri events are anchored to a moon sighting. The server computes an
 * `estimatedDate`, an admin may later confirm one, and `dateIsEstimated` says
 * which of the two is being looked at. That flag is on every row here, because
 * "the 21st" and "probably the 21st" are different instructions to someone
 * ordering flour, and the difference disappears the moment the date is printed
 * without it.
 *
 * ---------------------------------------------------------------------------
 * Two requests, and the calendar is not a filter of the list
 * ---------------------------------------------------------------------------
 * The month grid reads `/calendar?year&month`, which range-filters on both ends
 * of an event so a three-day Eid starting on the 31st still appears in the month
 * it mostly falls in. Deriving the grid from the year list by string-matching
 * the month prefix would lose exactly those. The list below reads the year, and
 * splits it by status rather than by date.
 */

/**
 * `EventStatus` → what the tag says.
 *
 * `active` is the one worth spelling out: the server means "the event is running
 * now", which reads as "enabled" if it is printed as-is beside `upcoming`.
 */
const STATUS_LABEL: Record<string, string> = {
  upcoming: 'Upcoming',
  active: 'On now',
  completed: 'Done',
  cancelled: 'Cancelled',
};

export function EventsScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();

  const today = businessDateStr();
  const [month, setMonth] = useState(() => ({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)),
  }));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  /**
   * Which event's advance demand is open, if any.
   *
   * Branch roles only, and the gate is here rather than inside the sheet: the
   * three demand routes are `BRANCH_ROLES`, so opening it for an admin would
   * offer a form whose every button 403s. An admin's view of who has demanded
   * what is a different screen against a different endpoint.
   */
  const role = useAuthStore(s2 => s2.claims?.role);
  const canDemand = role ? isBranchRole(role) : false;
  const [demandFor, setDemandFor] = useState<SpecialEventView | null>(null);

  const calendar = useQuery({
    queryKey: qk.events.calendar(month.year, month.month),
    queryFn: () => getEventCalendar(month),
    // The month stays drawn while the next one loads. Stepping a month is not
    // opening a new screen, and an empty grid mid-step reads as "nothing here".
    placeholderData: previous => previous,
  });

  const year = useQuery({
    queryKey: qk.events.list(month.year),
    queryFn: () => getSpecialEvents({ year: month.year }),
    placeholderData: previous => previous,
  });

  /**
   * Every business date any event in the month touches.
   *
   * Spans, not start dates: a three-day event marks all three, which is what
   * makes the grid answer "is anything on that day" rather than "does anything
   * begin that day".
   */
  const marked = useMemo(() => spannedDates(calendar.data?.events ?? []), [calendar.data?.events]);

  const events = useMemo(() => year.data?.events ?? [], [year.data?.events]);

  const shown = useMemo(() => {
    if (!selectedDate) return null;
    return (calendar.data?.events ?? []).filter(e => coversDate(e, selectedDate));
  }, [calendar.data?.events, selectedDate]);

  const upcoming = useMemo(
    () =>
      events
        .filter(e => e.status === 'upcoming' || e.status === 'active')
        .sort((a, b) => (a.eventDate ?? '9999').localeCompare(b.eventDate ?? '9999')),
    [events],
  );

  const past = useMemo(
    () =>
      events
        .filter(e => e.status === 'completed')
        .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? '')),
    [events],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Events"
        subtitle="What the bakery is baking for"
        onBack={() => navigation.goBack()}
      />

      {year.isPending && calendar.isPending ? (
        <MBSkeletonList rows={6} />
      ) : year.isError ? (
        <MBErrorState error={year.error} onRetry={() => year.refetch()} retrying={year.isFetching} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            contentColumn,
            { padding: theme.layout.screenPad, gap: theme.space.md },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={year.isFetching && !year.isPending}
              onRefresh={() => {
                year.refetch();
                calendar.refetch();
              }}
              tintColor={theme.colors.primary}
            />
          }>
          <MBMonthCalendar
            year={month.year}
            month={month.month}
            onMonthChange={next => {
              setMonth(next);
              // The selection belongs to the month it was made in. Carrying it
              // across would leave a filter applied to a day that is no longer
              // on screen, and an empty list with no visible cause.
              setSelectedDate(null);
            }}
            markedDates={marked}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            testID="events-calendar"
          />

          {calendar.isError ? (
            <MBCard>
              <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                Could not load this month&apos;s grid. The lists below are unaffected.
              </Text>
            </MBCard>
          ) : null}

          {shown ? (
            <>
              <MBSectionHeader
                title={formatBusinessDate(selectedDate!)}
                actionLabel="Clear"
                onAction={() => setSelectedDate(null)}
                actionAccessibilityLabel="Show the whole month again"
              />
              {shown.length === 0 ? (
                <MBEmptyState
                  title="Nothing on this day"
                  message="The day is marked because an event spans it — it may have started earlier."
                />
              ) : (
                <MBListCard testID="events-on-day">
                  {shown.map(event => (
                    <EventRow
                      key={event.id}
                      event={event}
                      {...(canDemand ? { onPress: () => setDemandFor(event) } : {})}
                    />
                  ))}
                </MBListCard>
              )}
            </>
          ) : (
            <>
              <MBSectionHeader title="Coming up" subtitle={`${month.year}`} />
              {upcoming.length === 0 ? (
                <MBEmptyState
                  title="Nothing scheduled"
                  message={`No events are set for ${month.year} that this branch takes part in.`}
                />
              ) : (
                <MBListCard testID="events-upcoming">
                  {upcoming.map(event => (
                    <EventRow
                      key={event.id}
                      event={event}
                      {...(canDemand ? { onPress: () => setDemandFor(event) } : {})}
                    />
                  ))}
                </MBListCard>
              )}

              {past.length > 0 ? (
                <>
                  <MBSectionHeader title="Done" />
                  <MBListCard testID="events-past">
                    {past.map(event => (
                      <EventRow
                      key={event.id}
                      event={event}
                      {...(canDemand ? { onPress: () => setDemandFor(event) } : {})}
                    />
                    ))}
                  </MBListCard>
                </>
              ) : null}
            </>
          )}

          <Text style={[theme.type.caption, styles.note, { color: theme.colors.textMuted }]}>
            A date marked “approx.” is computed from the Hijri calendar and moves with the moon
            sighting until an administrator confirms it.
          </Text>
        </ScrollView>
      )}

      {/* The demand form, over the calendar it was opened from. Mounted only
          while an event is chosen, so its query does not fire for every row. */}
      <MBModal
        visible={demandFor !== null}
        onRequestClose={() => setDemandFor(null)}
        testID="event-demand-modal">
        {demandFor ? (
          <EventDemandSheet event={demandFor} onClose={() => setDemandFor(null)} />
        ) : null}
      </MBModal>
    </View>
  );
}

/**
 * One event, as a row.
 *
 * The countdown is the subtitle rather than the title's suffix because it is the
 * part that changes: a reader scanning for "which one is next" reads down the
 * left edge, and a title that ends in a moving number breaks that column.
 */
function EventRow({
  event,
  onPress,
}: {
  event: SpecialEventView;
  onPress?: () => void;
}): React.ReactElement {
  const when = event.eventDate ? formatBusinessDate(event.eventDate) : 'Date not set';
  const approx = event.dateIsEstimated ? ' · approx.' : '';
  const countdown =
    event.daysRemaining === null
      ? ''
      : event.daysRemaining > 0
      ? ` · in ${event.daysRemaining} ${event.daysRemaining === 1 ? 'day' : 'days'}`
      : event.daysRemaining === 0
      ? ' · today'
      : '';

  return (
    <MBListRow
      title={event.name}
      subtitle={`${when}${approx}${countdown}`}
      icon="orders"
      iconTone={event.priority === 'critical' || event.priority === 'high' ? 'warning' : 'brand'}
      tag={{ label: STATUS_LABEL[event.status] ?? event.status }}
      {...(onPress ? { onPress } : {})}
      accessibilityLabel={[
        event.name,
        when,
        event.dateIsEstimated ? 'date is an estimate' : '',
        STATUS_LABEL[event.status] ?? event.status,
        onPress ? 'opens the advance demand' : '',
      ]
        .filter(Boolean)
        .join(', ')}
    />
  );
}

/** Whether an event covers a given business date, start and end inclusive. */
function coversDate(event: SpecialEventView, date: string): boolean {
  const start = event.eventDate;
  if (!start) return false;
  const end = event.eventEndDate ?? start;
  return start <= date && date <= end;
}

/** Every date any event touches, de-duplicated. */
function spannedDates(events: readonly SpecialEventView[]): string[] {
  const out = new Set<string>();
  for (const event of events) {
    const start = event.eventDate;
    if (!start) continue;
    const end = event.eventEndDate ?? start;
    // Walked rather than ranged: an event is at most a handful of days, and
    // generating a calendar month per event to intersect it would cost more
    // than stepping the two or three dates it actually covers.
    let cursor = start;
    // The bound is a guard against a bad `eventEndDate`, not a business rule —
    // an event longer than a month would otherwise loop through the year.
    for (let i = 0; i < 40 && cursor <= end; i += 1) {
      out.add(cursor);
      const [y, m, d] = cursor.split('-').map(Number) as [number, number, number];
      const at = new Date(Date.UTC(y, m - 1, d, 12));
      at.setUTCDate(at.getUTCDate() + 1);
      cursor = at.toISOString().slice(0, 10);
    }
  }
  return [...out];
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  note: { paddingHorizontal: space.xs },
});
