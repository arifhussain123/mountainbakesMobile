import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  EVENT_CATEGORY_LABELS,
  EVENT_PRIORITY_LABELS,
  getBusinessDate,
  useAdminSpecialEvents,
  useEventCalendar,
  useEventsSummary,
  type EventCategory,
  type EventStatus,
} from '@/api';
import { openDrawer, Routes, type SuperAdminEventsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, FilterChipRow, LoadingSkeleton, Screen, SearchBar, type FilterChipOption } from '@/shared/ui';
import { formatCount, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { SummaryTiles } from '../../components';
import { EventCalendarView } from './EventCalendarView';
import { EventListCard, EventTimelineRow } from './EventRows';
import { groupTimeline, matchesEventSearch } from './eventModel';

type Tab = 'calendar' | 'timeline' | 'list';
const TAB_OPTIONS: FilterChipOption<Tab>[] = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'list', label: 'List' },
];

const ALL = 'all';
const CATEGORY_OPTIONS: FilterChipOption<EventCategory | typeof ALL>[] = [
  { value: ALL, label: 'All categories' },
  ...(Object.entries(EVENT_CATEGORY_LABELS) as [EventCategory, string][]).map(([value, label]) => ({ value, label })),
];
const STATUS_OPTIONS: FilterChipOption<EventStatus | typeof ALL>[] = [
  { value: ALL, label: 'All statuses' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Web /special-events for Super Admin: eight summary tiles, the "Next up"
 * strip, Year / Category / Status filters, then Calendar / Timeline / List
 * views of the same event set. Read-only this phase — no add, edit or delete.
 */
export function SpecialEventsAdminScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SuperAdminEventsStackParamList>>();
  const today = getBusinessDate();
  const [thisYear, thisMonth] = today.split('-').map(Number) as [number, number];

  const [year, setYear] = useState(thisYear);
  const [category, setCategory] = useState<EventCategory | typeof ALL>(ALL);
  const [status, setStatus] = useState<EventStatus | typeof ALL>(ALL);
  const [tab, setTab] = useState<Tab>('calendar');
  const [calendarMonth, setCalendarMonth] = useState({ year: thisYear, month: thisMonth });
  const [search, setSearch] = useState('');

  const summaryQ = useEventsSummary();
  const eventsQ = useAdminSpecialEvents(year, category === ALL ? null : category, status === ALL ? null : status);
  const calendarQ = useEventCalendar(calendarMonth.year, calendarMonth.month);

  const events = useMemo(() => eventsQ.data?.events ?? [], [eventsQ.data]);
  const timeline = useMemo(() => groupTimeline(events), [events]);
  const listed = useMemo(
    () => events.filter((e) => matchesEventSearch(e, search, EVENT_CATEGORY_LABELS[e.category] ?? '', EVENT_PRIORITY_LABELS[e.priority] ?? '')),
    [events, search],
  );

  const yearOptions = useMemo<FilterChipOption<string>[]>(
    () => [year - 1, year, year + 1].map((y) => ({ value: String(y), label: String(y) })),
    [year],
  );

  const s = summaryQ.data;
  const goToEvent = (eventId: string) => navigation.navigate(Routes.SUPER_ADMIN_EVENT_DETAIL, { eventId });
  const refreshing = summaryQ.isRefetching || eventsQ.isRefetching || calendarQ.isRefetching;
  const onRefresh = () => {
    void summaryQ.refetch();
    void eventsQ.refetch();
    void calendarQ.refetch();
  };

  const muted = { color: theme.colors.textSecondary };

  return (
    <Screen>
      <AppHeader title="Special Events" actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        {summaryQ.isLoading ? (
          <LoadingSkeleton height={220} />
        ) : summaryQ.error ? (
          <ErrorState message={mapErrorToMessage(summaryQ.error)} onRetry={() => void summaryQ.refetch()} />
        ) : (
          <SummaryTiles
            tiles={[
              { label: 'Upcoming Events', value: formatCount(s?.upcomingEvents ?? 0) },
              { label: 'Active Preparations', value: formatCount(s?.activeEvents ?? 0) },
              { label: 'Branches Submitted', value: formatCount(s?.branchesSubmitted ?? 0), tone: 'success' },
              { label: 'Branches Pending', value: formatCount(s?.branchesPending ?? 0), tone: 'danger' },
              { label: 'Days to Next Event', value: s?.nextEvent?.daysRemaining != null ? String(s.nextEvent.daysRemaining) : '—' },
              { label: 'Next Event Readiness', value: `${s?.nextEvent?.readinessPercentage ?? 0}%`, tone: 'success' },
              { label: 'Reminders Sent', value: formatCount(s?.notificationsSent ?? 0) },
              { label: 'Reminders Pending', value: formatCount(s?.notificationsPending ?? 0), tone: 'warning' },
            ]}
          />
        )}

        {s?.nextEvent ? (
          <Card style={{ padding: theme.spacing.md }}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>
              Next up: <Text style={{ fontWeight: '700' }}>{s.nextEvent.name}</Text>
              {s.nextEvent.eventDate ? ` on ${formatDisplayDate(s.nextEvent.eventDate)}` : ''}
            </Text>
          </Card>
        ) : null}

        <View style={{ gap: 8 }}>
          <FilterChipRow options={yearOptions} value={String(year)} onChange={(v) => setYear(Number(v))} />
          <FilterChipRow options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          <FilterChipRow options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        </View>
        <Text style={[theme.typography.label, muted]}>
          Islamic, national and international events are detected automatically — Hijri dates are resolved from the Umm al-Qura calendar for
          whichever year you select, and shift with it each year. Dates shown with a dashed underline are estimates until confirmed against
          the moon-sighting announcement.
        </Text>

        <FilterChipRow options={TAB_OPTIONS} value={tab} onChange={setTab} />

        {tab === 'calendar' ? (
          calendarQ.error ? (
            <ErrorState message={mapErrorToMessage(calendarQ.error)} onRetry={() => void calendarQ.refetch()} />
          ) : (
            <EventCalendarView
              events={calendarQ.data ?? []}
              year={calendarMonth.year}
              month={calendarMonth.month}
              onMonthChange={(y, m) => setCalendarMonth({ year: y, month: m })}
              onSelectEvent={goToEvent}
              loading={calendarQ.isLoading}
            />
          )
        ) : eventsQ.isLoading ? (
          <LoadingSkeleton height={200} />
        ) : eventsQ.error ? (
          <ErrorState message={mapErrorToMessage(eventsQ.error)} onRetry={() => void eventsQ.refetch()} />
        ) : tab === 'timeline' ? (
          events.length === 0 ? (
            <EmptyState title="No events to show" message="Adjust the filters, or add an event to start planning." />
          ) : (
            timeline.map((group) => (
              <View key={group.monthKey ?? 'undated'} style={{ gap: 8 }}>
                <Text style={[theme.typography.bodySmall, muted, { fontWeight: '700' }]}>{group.label}</Text>
                {group.monthKey === null ? (
                  <Text style={[theme.typography.label, muted]}>These have no Gregorian date yet. Run Refresh Estimates, or set a confirmed date.</Text>
                ) : null}
                <View style={[styles.rail, { borderLeftColor: theme.colors.border, borderStyle: group.monthKey === null ? 'dashed' : 'solid' }]}>
                  {group.events.map((event) => (
                    <EventTimelineRow key={event.id} event={event} onPress={() => goToEvent(event.id)} />
                  ))}
                </View>
              </View>
            ))
          )
        ) : (
          <View style={{ gap: 8 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search events…" />
            {listed.length === 0 ? (
              <EmptyState title="No events found" message="Adjust the filters, or add an event to start planning." />
            ) : (
              listed.map((event) => <EventListCard key={event.id} event={event} onPress={() => goToEvent(event.id)} />)
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rail: { borderLeftWidth: 2, paddingLeft: 16, gap: 8 },
});
