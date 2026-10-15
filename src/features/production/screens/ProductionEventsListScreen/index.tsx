import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEventsSummary, useSpecialEvents } from '@/api';
import { Routes, type ProductionEventsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, Screen, StatCard } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { ProductionEventCard } from '../../components';
import { styles } from './styles';

/** mountainbakesProduction.html screen 12 — Special Events: upcoming events plus consolidated demand (once more than one event has submissions, a per-event roll-up is opened from its card). */
export function ProductionEventsListScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ProductionEventsStackParamList>>();

  const events = useSpecialEvents();
  const summary = useEventsSummary();

  const upcoming = useMemo(
    () => (events.data?.events ?? []).filter((e) => e.status === 'upcoming' || e.status === 'active'),
    [events.data],
  );

  const isLoading = events.isLoading || summary.isLoading;
  const firstError = events.error ?? summary.error;
  const refreshing = events.isRefetching || summary.isRefetching;
  const onRefresh = () => {
    void events.refetch();
    void summary.refetch();
  };

  const nextEvent = summary.data?.nextEvent ?? null;
  const nextEventTotalBranches = nextEvent ? (summary.data?.branchesSubmitted ?? 0) + (summary.data?.branchesPending ?? 0) : 0;

  return (
    <Screen>
      <AppHeader title="Special Events" subtitle="Advance demand from every branch" actions={[]} />
      <FlatList
        data={upcoming}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {firstError ? <ErrorState message={mapErrorToMessage(firstError)} onRetry={onRefresh} /> : null}
            {summary.data ? (
              <View style={{ gap: theme.spacing.sm }}>
                <View style={styles.statsRow}>
                  <StatCard label="Upcoming" value={String(summary.data.upcomingEvents)} />
                  <StatCard label="Days to next" value={nextEvent?.daysRemaining != null ? String(nextEvent.daysRemaining) : '—'} />
                </View>
                <View style={styles.statsRow}>
                  <StatCard label="Demands received" value={String(summary.data.branchesSubmitted)} />
                  <StatCard label="Readiness" value={`${nextEvent?.readinessPercentage ?? 0}%`} valueColor={theme.colors.primary} />
                </View>
              </View>
            ) : null}
            {upcoming.length > 0 ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg, letterSpacing: 1.2 }]}>
                UPCOMING
              </Text>
            ) : null}
          </View>
        }
        ListFooterComponent={
          !isLoading ? (
            <Card style={{ marginTop: theme.spacing.md, borderStyle: 'dashed' }}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>
                {nextEvent ? 'Open an event to review branch demand' : 'Nothing to consolidate yet'}
              </Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                Once branches submit their advance demand it is rolled up here, product by product.
              </Text>
            </Card>
          ) : undefined
        }
        ListEmptyComponent={!isLoading && !firstError ? <EmptyState title="No Upcoming Events" message="Nothing scheduled right now." /> : undefined}
        renderItem={({ item }) => (
          <ProductionEventCard
            event={item}
            branchProgress={item.id === nextEvent?.id ? { submitted: summary.data?.branchesSubmitted ?? 0, total: nextEventTotalBranches } : undefined}
            readinessPercentage={item.id === nextEvent?.id ? nextEvent?.readinessPercentage : undefined}
            onPress={() => navigation.navigate(Routes.PRODUCTION_EVENT_DEMAND, { eventId: item.id, eventName: item.name })}
          />
        )}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </Screen>
  );
}
