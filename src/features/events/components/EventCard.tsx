import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { EVENT_CATEGORY_LABELS, type SpecialEvent } from '@/api';
import { Pill } from './Pill';

export interface EventCardProps {
  event: SpecialEvent;
  onPress: () => void;
  /** Row position — the first row rounds the grouped card's top, the last its bottom. */
  index: number;
  isLast: boolean;
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

/** "16 Oct" → day "16", month "OCT" for the date block. */
function dateParts(iso: string | null): { day: string; month: string } {
  if (!iso) return { day: '—', month: 'TBD' };
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { day: '—', month: 'TBD' };
  return { day: String(d.getDate()), month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() };
}

/** "12 Oct" — the short form for the "Due …" pill. */
function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * branchApp.md screen 18 — one Special Event, as a row of the redesign's
 * grouped list card (B18): a soft date block, the name, the Hijri/estimated
 * line, category + demand-due pills, and the countdown on the right. The
 * status badge only shows when the event is no longer simply upcoming.
 */
export function EventCard({ event, onPress, index, isLast }: EventCardProps) {
  const theme = useAppTheme();
  const isFirst = index === 0;
  const { day, month } = dateParts(event.eventDate);
  const blockFill = theme.isDark ? `${theme.colors.primary}1F` : '#FFEDE5';

  const subParts = event.eventDate
    ? [event.hijriLabel ?? formatDisplayDate(event.eventDate), event.dateIsEstimated ? 'estimated' : null].filter(Boolean)
    : ['Date not yet resolved'];
  const days = event.daysRemaining;
  const countdown = days == null ? '—' : days >= 0 ? `in ${days} days` : 'Past';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.segment,
        {
          backgroundColor: theme.colors.cardFill,
          borderColor: theme.colors.cardBorder,
          borderTopWidth: isFirst ? 1 : 0,
          borderBottomWidth: isLast ? 1 : 0,
          borderTopLeftRadius: isFirst ? theme.radii.lg : 0,
          borderTopRightRadius: isFirst ? theme.radii.lg : 0,
          borderBottomLeftRadius: isLast ? theme.radii.lg : 0,
          borderBottomRightRadius: isLast ? theme.radii.lg : 0,
          paddingTop: isFirst ? 4 : 0,
          paddingBottom: isLast ? 4 : 0,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={[styles.row, !isFirst && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
        <View style={[styles.dateBlock, { backgroundColor: blockFill }]}>
          <Text style={[styles.day, { color: theme.colors.primary }]}>{day}</Text>
          <Text style={[styles.month, { color: theme.colors.primary }]}>{month}</Text>
        </View>
        <View style={styles.body}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
            {event.name}
          </Text>
          <Text style={[styles.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {subParts.join(' · ')}
          </Text>
          <View style={styles.pills}>
            <Pill label={EVENT_CATEGORY_LABELS[event.category] ?? event.category} />
            {event.demandDueDate ? <Pill label={`Due ${shortDate(event.demandDueDate)}`} kind="warn" /> : null}
            {event.status !== 'upcoming' ? (
              <StatusBadge label={STATUS_LABEL[event.status] ?? event.status} variant={STATUS_VARIANT[event.status] ?? 'neutral'} />
            ) : null}
          </View>
        </View>
        <Text style={[styles.xs, { color: days != null && days >= 0 && days <= 3 ? theme.colors.danger : theme.colors.textFaint }]}>{countdown}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segment: { borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dateBlock: { width: 52, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  day: { fontSize: 20, lineHeight: 24, fontWeight: '600' },
  month: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  body: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
});
