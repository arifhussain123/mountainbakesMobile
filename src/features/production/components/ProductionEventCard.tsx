import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import type { SpecialEvent } from '@/api';

export interface ProductionEventCardProps {
  event: SpecialEvent;
  /** `branchesSubmitted` / total participating branches — only known for the soonest event (the summary endpoint only resolves one). */
  branchProgress?: { submitted: number; total: number };
  readinessPercentage?: number;
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

/** mountainbakesProduction.html screen 12 — one event, with the branch/readiness rows Branch's own card doesn't need. */
export function ProductionEventCard({ event, branchProgress, readinessPercentage, onPress }: ProductionEventCardProps) {
  const theme = useAppTheme();
  const urgent = event.daysRemaining != null && event.daysRemaining <= 3;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: urgent ? `${theme.colors.primary}14` : theme.colors.cardFill,
          borderColor: urgent ? theme.colors.primary : theme.colors.cardBorder,
          borderWidth: urgent ? 1.5 : 1,
          borderRadius: theme.radii.lg,
        },
      ]}>
      <View style={styles.topRow}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
          {event.name}
        </Text>
        <StatusBadge label={STATUS_LABEL[event.status] ?? event.status} variant={STATUS_VARIANT[event.status] ?? 'neutral'} />
      </View>

      {event.eventDate ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 6, fontWeight: '700' }]}>
          {formatDisplayDate(event.eventDate)}
          {event.dateIsEstimated ? ' · estimated' : ''}
        </Text>
      ) : (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 6 }]}>Date not yet resolved</Text>
      )}

      <View style={[styles.footerRow, { marginTop: 8, borderTopColor: theme.colors.border }]}>
        <Text style={[theme.typography.label, { color: event.daysRemaining != null && event.daysRemaining < 0 ? theme.colors.textSecondary : theme.colors.warning, fontWeight: '700' }]}>
          {event.daysRemaining == null ? '—' : event.daysRemaining >= 0 ? `in ${event.daysRemaining} days` : 'Past'}
        </Text>
        {branchProgress ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '600' }]}>
            {branchProgress.submitted}/{branchProgress.total} branches
          </Text>
        ) : null}
      </View>

      {readinessPercentage != null ? (
        <View style={[styles.footerRow, { marginTop: 4, borderTopWidth: 0, paddingTop: 0 }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>Readiness</Text>
          <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{readinessPercentage}%</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1 },
});
