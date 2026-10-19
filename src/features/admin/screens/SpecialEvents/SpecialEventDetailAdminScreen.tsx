import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, useSpecialEvent } from '@/api';
import { Routes, type SuperAdminEventsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, FilterChipRow, LoadingSkeleton, Screen, SecondaryButton, type FilterChipOption } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { EventCategoryBadge, EventCountdown, EventDateLabel, EventPriorityBadge, EventStatusBadge, InfoLine, ProgressBar } from './EventBits';
import { BranchDemandsTab, ConsolidatedTab, ReadinessTab, RemindersTab } from './EventDetailTabs';

type Tab = 'demands' | 'consolidated' | 'readiness' | 'reminders';
const TAB_OPTIONS: FilterChipOption<Tab>[] = [
  { value: 'demands', label: 'Branch Demands' },
  { value: 'consolidated', label: 'Consolidated' },
  { value: 'readiness', label: 'Production Readiness' },
  { value: 'reminders', label: 'Reminders' },
];

const STATUS_LABEL = { upcoming: 'Upcoming', active: 'Active', completed: 'Completed', cancelled: 'Cancelled' } as const;

/**
 * Web /special-events/[id] for Super Admin, read-only: header with badges,
 * Schedule / Branch Participation / Admin Controls cards (the controls shown
 * as their current state, no Confirm / Clear / status change), the
 * description, then the four tabs.
 */
export function SpecialEventDetailAdminScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { eventId } = useRoute<RouteProp<SuperAdminEventsStackParamList, typeof Routes.SUPER_ADMIN_EVENT_DETAIL>>().params;
  const [tab, setTab] = useState<Tab>('demands');
  const q = useSpecialEvent(eventId);
  const event = q.data?.event;

  const back = { icon: 'chevron-left' as const, onPress: () => navigation.goBack(), accessibilityLabel: 'Back to Special Events' };

  const onRefresh = () => {
    void q.refetch();
    void queryClient.invalidateQueries({ queryKey: queryKeys.eventDemands(eventId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.consolidatedDemand(eventId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.eventProductionStatus(eventId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.eventNotifications(eventId) });
  };

  if (q.isLoading || q.error || !event) {
    return (
      <Screen>
        <AppHeader title="Special Events" actions={[back]} />
        <View style={{ padding: theme.spacing.lg, gap: 12 }}>
          {q.isLoading ? (
            <LoadingSkeleton height={240} />
          ) : q.error ? (
            <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} />
          ) : (
            <>
              <EmptyState title="Event not found" message="It may have been removed." />
              <SecondaryButton label="Back to Special Events" onPress={() => navigation.goBack()} />
            </>
          )}
        </View>
      </Screen>
    );
  }

  const s = event.demandSummary;
  const muted = { color: theme.colors.textSecondary };
  const duration = event.durationDays ?? 1;

  return (
    <Screen>
      <AppHeader title={event.name} subtitle={event.eventNumber} actions={[back]} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0, paddingBottom: theme.spacing.xl * 3, gap: 12 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        <View style={styles.badges}>
          <EventCategoryBadge category={event.category} />
          <EventPriorityBadge priority={event.priority} />
          <EventStatusBadge status={event.status} />
        </View>

        <Card style={{ padding: theme.spacing.md, gap: 6 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>Schedule</Text>
          <EventDateLabel event={event} />
          <EventCountdown daysRemaining={event.daysRemaining} />
          <View style={{ gap: 4, paddingTop: 6 }}>
            <InfoLine label="Demand due" value={event.demandDueDate ? formatDisplayDate(event.demandDueDate) : '—'} />
            <InfoLine label="Preparation starts" value={event.preparationStartDate ? formatDisplayDate(event.preparationStartDate) : '—'} />
            <InfoLine label="Duration" value={`${duration} day${duration === 1 ? '' : 's'}`} />
            <InfoLine label="Branches" value={event.appliesToAllBranches ? 'All' : `${event.branchIds?.length ?? 0} selected`} />
          </View>
        </Card>

        <Card style={{ padding: theme.spacing.md, gap: 8 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>Branch Participation</Text>
          {s ? (
            <>
              <Text style={[theme.typography.kpi, { color: theme.colors.text }]}>
                {s.submittedBranches}
                <Text style={[theme.typography.body, muted]}>/{s.totalBranches}</Text>
              </Text>
              <ProgressBar value={s.totalBranches === 0 ? 0 : Math.round((s.submittedBranches / s.totalBranches) * 100)} />
              <Text style={[theme.typography.label, muted]}>
                {s.pendingBranches} pending · {s.draftBranches} in draft · {s.totalItems} line{s.totalItems === 1 ? '' : 's'}
              </Text>
            </>
          ) : (
            <Text style={[theme.typography.bodySmall, muted]}>No demand recorded yet.</Text>
          )}
        </Card>

        <Card style={{ padding: theme.spacing.md, gap: 6 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>Admin Controls</Text>
          <InfoLine label="Confirmed date" value={event.dateIsEstimated ? 'Not confirmed' : formatDisplayDate(event.eventDate ?? '')} />
          <Text style={[theme.typography.label, muted]}>
            {event.dateIsEstimated
              ? 'Currently using the calculated estimate. Confirming reschedules the reminders.'
              : 'A confirmed date is in use and overrides the estimate.'}
          </Text>
          <InfoLine label="Status" value={STATUS_LABEL[event.status] ?? event.status} />
        </Card>

        {event.description ? <Text style={[theme.typography.bodySmall, muted]}>{event.description}</Text> : null}

        <FilterChipRow options={TAB_OPTIONS} value={tab} onChange={setTab} />
        {tab === 'demands' ? <BranchDemandsTab eventId={eventId} /> : null}
        {tab === 'consolidated' ? <ConsolidatedTab eventId={eventId} /> : null}
        {tab === 'readiness' ? <ReadinessTab eventId={eventId} /> : null}
        {tab === 'reminders' ? <RemindersTab eventId={eventId} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
