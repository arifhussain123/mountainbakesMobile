import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import type { SpecialEvent } from '@/api';

export interface EventCardProps {
  event: SpecialEvent;
  onPress: () => void;
}

const STATUS_VARIANT: Record<SpecialEvent['status'], StatusVariant> = {
  upcoming: 'info',
  active: 'success',
  completed: 'neutral',
  cancelled: 'danger',
};

const STATUS_LABEL: Record<SpecialEvent['status'], string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** branchApp.md screen 18 — one Special Event list card. */
export function EventCard({ event, onPress }: EventCardProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}>
      <View style={styles.topRow}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={2}>
          {event.name}
        </Text>
        <StatusBadge label={STATUS_LABEL[event.status] ?? event.status} variant={STATUS_VARIANT[event.status] ?? 'neutral'} />
      </View>
      {event.eventDate ? (
        <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 6, fontWeight: '700' }]}>
          {formatDisplayDate(event.eventDate)}
          {event.dateIsEstimated ? ' · estimated' : ''}
        </Text>
      ) : (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 6 }]}>Date not yet resolved</Text>
      )}
      <View style={[styles.footerRow, { marginTop: 10, borderTopColor: theme.colors.border }]}>
        <Text
          style={[
            theme.typography.label,
            { color: event.daysRemaining != null && event.daysRemaining <= 3 ? theme.colors.danger : theme.colors.primary, fontWeight: '700' },
          ]}>
          {event.daysRemaining == null ? '—' : event.daysRemaining >= 0 ? `In ${event.daysRemaining} days` : 'Past'}
        </Text>
        {event.demandDueDate ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Due {formatDisplayDate(event.demandDueDate)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, padding: 14, marginBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
});
