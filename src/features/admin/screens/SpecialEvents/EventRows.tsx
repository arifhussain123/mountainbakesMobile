import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SpecialEvent } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { EventCategoryBadge, EventCountdown, EventDateLabel, EventPriorityBadge, EventStatusBadge, InfoLine, ProgressBar } from './EventBits';

/** One web EventTimeline row: dot, name + date, three badges, countdown / demand-due / branches line, readiness bar. */
export function EventTimelineRow({ event, onPress }: { event: SpecialEvent; onPress: () => void }) {
  const theme = useAppTheme();
  const s = event.demandSummary;
  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineDot, { backgroundColor: event.color ?? theme.colors.primary, borderColor: theme.colors.background }]} />
      <Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
        <Card style={{ padding: theme.spacing.md, gap: 6 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={2}>
            {event.name}
          </Text>
          <EventDateLabel event={event} />
          <View style={styles.badges}>
            <EventCategoryBadge category={event.category} />
            <EventPriorityBadge priority={event.priority} />
            <EventStatusBadge status={event.status} />
          </View>
          <View style={styles.metaRow}>
            <EventCountdown daysRemaining={event.daysRemaining} />
            {event.demandDueDate ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Demand due {formatDisplayDate(event.demandDueDate)}</Text>
            ) : null}
            {s ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                {s.submittedBranches}/{s.totalBranches} branches submitted
              </Text>
            ) : null}
          </View>
          {typeof event.readinessPercentage === 'number' ? <ProgressBar value={event.readinessPercentage} label="Production readiness" /> : null}
        </Card>
      </Pressable>
    </View>
  );
}

/** One web EventListTable row as a card — every column the table shows. */
export function EventListCard({ event, onPress }: { event: SpecialEvent; onPress: () => void }) {
  const theme = useAppTheme();
  const s = event.demandSummary;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card style={{ padding: theme.spacing.md, gap: 8 }}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={2}>
              {event.name}
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{event.eventNumber}</Text>
          </View>
          <EventStatusBadge status={event.status} />
        </View>
        <EventDateLabel event={event} />
        <View style={styles.badges}>
          <EventCategoryBadge category={event.category} />
          <EventPriorityBadge priority={event.priority} />
        </View>
        <View style={{ gap: 4 }}>
          <View style={styles.infoRow}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Days Remaining</Text>
            <EventCountdown daysRemaining={event.daysRemaining} />
          </View>
          <InfoLine label="Demand Due" value={event.demandDueDate ? formatDisplayDate(event.demandDueDate) : '—'} />
          <InfoLine label="Branches" value={s ? `${s.submittedBranches}/${s.totalBranches}` : '—'} />
        </View>
        <ProgressBar value={event.readinessPercentage ?? 0} label="Readiness" />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineDot: { position: 'absolute', left: -22, top: 20, width: 10, height: 10, borderRadius: 5, borderWidth: 2, zIndex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
