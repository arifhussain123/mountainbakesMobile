import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSpecialEvents } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { Routes, openDrawer, type EventsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, Screen } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { EventCard } from '../../components';
import { styles } from './styles';

/**
 * branchApp.md screen 18 — Special Events. List view only: the HTML reference
 * also shows a Calendar tab, but there is no existing month-calendar
 * component in this app, so that is an explicit follow-up (see the
 * implementation plan), not built here.
 */
export function SpecialEventsScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const navigation = useNavigation<NativeStackNavigationProp<EventsStackParamList>>();

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
    return { upcoming, dueSoon, nextDays: next?.daysRemaining ?? null };
  }, [events]);

  return (
    <Screen>
      <AppHeader
        title="Special Events"
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Upcoming</Text>
                <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4, fontWeight: '700' }]}>{stats.upcoming}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Demand due soon</Text>
                <Text style={[theme.typography.body, { color: theme.colors.danger, marginTop: 4, fontWeight: '700' }]}>{stats.dueSoon}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Days to next</Text>
                <Text style={[theme.typography.body, { color: theme.colors.info, marginTop: 4, fontWeight: '700' }]}>
                  {stats.nextDays ?? '—'}
                </Text>
              </View>
            </View>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
            <View style={{ height: theme.spacing.md }} />
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="No Events" message="Events for this year will appear here." /> : undefined
        }
        renderItem={({ item }) => <EventCard event={item} onPress={() => navigation.navigate(Routes.EVENT_DEMAND, { eventId: item.id })} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
    </Screen>
  );
}
