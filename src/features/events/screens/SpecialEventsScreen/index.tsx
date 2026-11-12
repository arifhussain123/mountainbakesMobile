import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getBusinessDate, useSpecialEvents } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { Routes, openDrawer, type EventsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import {
  ACCENT_GLOW,
  AccentFill,
  AppHeader,
  EmptyState,
  ErrorState,
  HeroSurface,
  Icon,
  LoadingSkeleton,
  Screen,
  SegmentedControl,
  StatCard,
  type SegmentedOption,
} from '@/shared/ui';
import { EventCard, EventMonthCalendar } from '../../components';
import { mapErrorToMessage } from '@/shared/helpers';
import { styles } from './styles';

type EventsView = 'list' | 'calendar';

const VIEW_OPTIONS: SegmentedOption<EventsView>[] = [
  { value: 'list', label: 'List' },
  { value: 'calendar', label: 'Calendar' },
];

/** "Fri 16 Oct 2026". */
function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(',', '');
}

/** "12 Oct". */
function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * branchApp.md screen 18 — Special Events (redesign B18): a violet "Next
 * event" hero with a shortcut into its advance demand, Upcoming / Due soon /
 * Days to next tiles, and a List / Calendar switch. The calendar is the month
 * grid of the same `/api/special-events` list (event days filled), with that
 * month's events listed beneath it.
 */
export function SpecialEventsScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const navigation = useNavigation<NativeStackNavigationProp<EventsStackParamList>>();
  const today = useMemo(() => getBusinessDate(), []);
  const [view, setView] = useState<EventsView>('list');
  const [calMonth, setCalMonth] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));

  const { data, isLoading, error, refetch, isRefetching } = useSpecialEvents();
  const events = useMemo(() => data?.events ?? [], [data]);

  const stats = useMemo(() => {
    const upcoming = events.filter((e) => e.status === 'upcoming').length;
    const dueSoon = events.filter(
      (e) => e.status === 'upcoming' && e.demandDueDate && e.daysRemaining != null && e.daysRemaining <= 7,
    ).length;
    const next = events
      .filter((e) => e.daysRemaining != null && e.daysRemaining >= 0)
      .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))[0];
    return { upcoming, dueSoon, nextDays: next?.daysRemaining ?? null, next };
  }, [events]);

  const monthPrefix = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}`;
  const eventDates = useMemo(() => new Set(events.flatMap((e) => (e.eventDate ? [e.eventDate] : []))), [events]);
  const shown = useMemo(
    () => (view === 'calendar' ? events.filter((e) => e.eventDate?.startsWith(monthPrefix)) : events),
    [events, view, monthPrefix],
  );

  const shiftMonth = (delta: number) =>
    setCalMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const next = stats.next;
  // White on the violet hero (light); the accent's own on-colour on dark mode's flat accent hero.
  const onHero = theme.isDark ? theme.colors.primaryText : '#FFFFFF';
  const openDemand = (eventId: string) => navigation.navigate(Routes.EVENT_DEMAND, { eventId });

  return (
    <Screen>
      <AppHeader
        title="Special Events"
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <FlatList
        data={shown}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: theme.spacing.xs, paddingBottom: theme.spacing.xxl }}
        ListHeaderComponent={
          <View style={styles.header}>
            {next ? (
              <HeroSurface style={styles.hero}>
                <View style={styles.between}>
                  <Text style={[styles.eyebrow, { color: onHero, opacity: 0.8 }]}>
                    Next event · {next.daysRemaining === 0 ? 'today' : `in ${next.daysRemaining} days`}
                  </Text>
                  <Icon name="sparkle" size={20} color={theme.isDark ? onHero : '#FFD36E'} />
                </View>
                <Text style={[styles.heroTitle, { color: onHero }]} numberOfLines={2}>
                  {next.name}
                </Text>
                {next.eventDate ? (
                  <Text style={[styles.heroSub, { color: onHero, opacity: 0.84 }]}>
                    {longDate(next.eventDate)}
                    {next.demandDueDate ? ` · advance demand due ${next.demandDueDate === today ? 'today' : shortDate(next.demandDueDate)}` : ''}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openDemand(next.id)}
                  style={({ pressed }) => [
                    styles.heroButton,
                    { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.2)' : theme.colors.primary, opacity: pressed ? 0.85 : 1 },
                    theme.isDark ? null : ACCENT_GLOW,
                  ]}>
                  <AccentFill borderRadius={14} />
                  <Icon name="plus" size={18} color="#FFFFFF" />
                  <Text style={styles.heroButtonText}>Add advance demand</Text>
                </Pressable>
              </HeroSurface>
            ) : null}

            <View style={styles.grid3}>
              <StatCard label="Upcoming" value={String(stats.upcoming)} tone={0} />
              <StatCard label="Due soon" value={String(stats.dueSoon)} valueColor={theme.colors.warning} tone={1} />
              <StatCard label="Days to next" value={stats.nextDays == null ? '—' : String(stats.nextDays)} tone={2} />
            </View>

            <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} />

            {view === 'calendar' ? (
              <EventMonthCalendar year={calMonth.year} month={calMonth.month} eventDates={eventDates} today={today} onShiftMonth={shiftMonth} />
            ) : null}

            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? (
            view === 'calendar' ? (
              <EmptyState title="No Events This Month" message="Events falling in this month will appear here." />
            ) : (
              <EmptyState title="No Events" message="Events for this year will appear here." />
            )
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <EventCard event={item} index={index} isLast={index === shown.length - 1} onPress={() => openDemand(item.id)} />
        )}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
    </Screen>
  );
}
