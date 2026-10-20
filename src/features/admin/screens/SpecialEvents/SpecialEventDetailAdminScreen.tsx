import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, useConfirmEventDate, useSpecialEvent, useUpdateEventStatus, type AdminSpecialEvent, type EventStatus } from '@/api';
import { Routes, type SuperAdminEventsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  Card,
  DateField,
  Dropdown,
  EmptyState,
  ErrorState,
  FilterChipRow,
  LoadingSkeleton,
  Screen,
  SecondaryButton,
  type FilterChipOption,
} from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { ActionChip } from '../../components';
import { EVENT_STATUSES, canClearConfirmation, confirmDateMessage, confirmDateProblem, statusChangeMessage } from '../../utils/eventActions';
import { EventCategoryBadge, EventCountdown, EventDateLabel, EventPriorityBadge, EventStatusBadge, InfoLine, ProgressBar } from './EventBits';
import { BranchDemandsTab, ConsolidatedTab, ReadinessTab, RemindersTab } from './EventDetailTabs';
import { useEventSheet } from './eventSheets';

type Tab = 'demands' | 'consolidated' | 'readiness' | 'reminders';
const TAB_OPTIONS: FilterChipOption<Tab>[] = [
  { value: 'demands', label: 'Branch Demands' },
  { value: 'consolidated', label: 'Consolidated' },
  { value: 'readiness', label: 'Production Readiness' },
  { value: 'reminders', label: 'Reminders' },
];

const STATUS_LABEL: Record<EventStatus, string> = { upcoming: 'Upcoming', active: 'Active', completed: 'Completed', cancelled: 'Cancelled' };
const STATUS_OPTIONS = EVENT_STATUSES.map((value) => ({ value, label: STATUS_LABEL[value] }));

/**
 * Web /special-events/[id] for Super Admin: header with badges and Edit,
 * Schedule / Branch Participation / Admin Controls cards, the description,
 * then the four tabs. Admin Controls work as on the web — confirm the
 * moon-sighting date (or clear it back to the estimate; both reschedule the
 * reminders) and change the status (cancelling stops the pending reminders,
 * so it asks first). The tabs carry the review, stage and reminder actions.
 */
export function SpecialEventDetailAdminScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { eventId } = useRoute<RouteProp<SuperAdminEventsStackParamList, typeof Routes.SUPER_ADMIN_EVENT_DETAIL>>().params;
  const [tab, setTab] = useState<Tab>('demands');
  const q = useSpecialEvent(eventId);
  // The detail view carries every column, the anchor fields included.
  const event = q.data?.event as AdminSpecialEvent | undefined;
  const confirmDate = useConfirmEventDate();
  const updateStatus = useUpdateEventStatus();
  const eventSheet = useEventSheet();

  // Seeded from the event and re-seeded whenever the server's value changes —
  // not read through on every render, or clearing the field would snap back.
  const [confirmInput, setConfirmInput] = useState('');
  const [seededFrom, setSeededFrom] = useState<string | null>(null);
  const confirmVersion = event ? `${event.id}:${event.confirmedDate ?? ''}` : null;
  if (event && confirmVersion !== seededFrom) {
    setSeededFrom(confirmVersion);
    setConfirmInput(event.confirmedDate ?? '');
  }

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

  const onConfirmDate = (date: string | null) => {
    if (date !== null) {
      const problem = confirmDateProblem(date);
      if (problem) {
        Alert.alert('Check the Date', problem);
        return;
      }
    }
    confirmDate.mutate(
      { id: eventId, confirmedDate: date === null ? null : date.trim() },
      {
        onSuccess: () => {
          Alert.alert(date ? 'Date Confirmed' : 'Confirmation Cleared', confirmDateMessage(date));
          setConfirmInput('');
        },
        onError: (e) => Alert.alert('Could Not Confirm the Date', mapErrorToMessage(e)),
      },
    );
  };

  const applyStatus = (status: EventStatus) =>
    updateStatus.mutate(
      { id: eventId, status },
      {
        onSuccess: () => Alert.alert('Status Updated', statusChangeMessage(status)),
        onError: (e) => Alert.alert('Could Not Update the Status', mapErrorToMessage(e)),
      },
    );

  const onStatusChange = (status: EventStatus) => {
    if (status === event.status) return;
    if (status !== 'cancelled') {
      applyStatus(status);
      return;
    }
    Alert.alert('Cancel Event', `Cancel "${event.name}"? Pending reminders will be stopped.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Event', style: 'destructive', onPress: () => applyStatus(status) },
    ]);
  };

  const busy = confirmDate.isPending || updateStatus.isPending;
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
        <View style={styles.badges}>
          <ActionChip icon="pencil" label="Edit" onPress={() => eventSheet.open({ kind: 'edit', eventId })} />
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
          <DateField label="Confirmed date" value={confirmInput} onChange={setConfirmInput} onClear={() => setConfirmInput('')} />
          <View style={styles.badges}>
            <ActionChip
              icon="calendar-check"
              label="Confirm"
              primary
              onPress={() => onConfirmDate(confirmInput)}
              disabled={busy || !confirmInput.trim()}
              loading={confirmDate.isPending && confirmDate.variables?.confirmedDate !== null}
            />
            {canClearConfirmation(event) ? (
              <ActionChip
                icon="rotate-ccw"
                label="Clear confirmation"
                onPress={() => onConfirmDate(null)}
                disabled={busy}
                loading={confirmDate.isPending && confirmDate.variables?.confirmedDate === null}
              />
            ) : null}
          </View>
          <Text style={[theme.typography.label, muted]}>
            {event.dateIsEstimated
              ? 'Currently using the calculated estimate. Confirming reschedules the reminders.'
              : 'A confirmed date is in use and overrides the estimate.'}
          </Text>
          <Text style={[theme.typography.label, muted, { marginTop: 6 }]}>Status</Text>
          <Dropdown options={STATUS_OPTIONS} value={event.status} onChange={onStatusChange} />
        </Card>

        {event.description ? <Text style={[theme.typography.bodySmall, muted]}>{event.description}</Text> : null}

        <FilterChipRow options={TAB_OPTIONS} value={tab} onChange={setTab} />
        {tab === 'demands' ? <BranchDemandsTab eventId={eventId} /> : null}
        {tab === 'consolidated' ? <ConsolidatedTab eventId={eventId} /> : null}
        {tab === 'readiness' ? <ReadinessTab eventId={eventId} onEditStage={(stage) => eventSheet.open({ kind: 'stage', eventId, stage })} /> : null}
        {tab === 'reminders' ? <RemindersTab eventId={eventId} /> : null}
      </ScrollView>
      {eventSheet.element}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
