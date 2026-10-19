import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  EVENT_CATEGORY_LABELS,
  EVENT_PRIORITY_LABELS,
  type EventCategory,
  type EventDemandStatus,
  type EventNotificationStatus,
  type EventPriority,
  type EventStatus,
  type SpecialEvent,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { clampPercent, eventCountdown, progressTone } from './eventModel';

/**
 * The web's EventBits for the phone: status / priority / category pills, the
 * date + Hijri label, the countdown and the readiness bar. One file because all
 * of them appear together on every row, card and header.
 */

const STATUS: Record<EventStatus, { label: string; variant: StatusVariant }> = {
  upcoming: { label: 'Upcoming', variant: 'info' },
  active: { label: 'Active', variant: 'success' },
  completed: { label: 'Completed', variant: 'neutral' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const s = STATUS[status] ?? STATUS.upcoming;
  return <StatusBadge label={s.label} variant={s.variant} />;
}

const PRIORITY_VARIANT: Record<EventPriority, StatusVariant> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  critical: 'danger',
};

/** Expected demand level — the label says "Very High", the enum says `critical`. */
export function EventPriorityBadge({ priority }: { priority: EventPriority }) {
  return <StatusBadge label={EVENT_PRIORITY_LABELS[priority] ?? priority} variant={PRIORITY_VARIANT[priority] ?? 'neutral'} />;
}

/** Category pill. Web hues (emerald / teal / green / pink / primary) mapped onto the theme's palette. */
export function EventCategoryBadge({ category }: { category: EventCategory }) {
  const theme = useAppTheme();
  const color: Record<EventCategory, string> = {
    islamic: theme.colors.success,
    ahlul_bayt: theme.colors.infoAlt,
    national: theme.colors.success,
    international: theme.colors.violet,
    company: theme.colors.primary,
  };
  const c = color[category] ?? theme.colors.textSecondary;
  return (
    <View style={[styles.pill, { backgroundColor: `${c}1A`, borderRadius: theme.radii.pill }]}>
      <Text style={[styles.pillText, { color: c }]}>{EVENT_CATEGORY_LABELS[category] ?? category}</Text>
    </View>
  );
}

const DEMAND_STATUS: Record<EventDemandStatus, { label: string; variant: StatusVariant }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  submitted: { label: 'Submitted', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  fulfilled: { label: 'Fulfilled', variant: 'success' },
};

export function DemandStatusBadge({ status }: { status: EventDemandStatus }) {
  const s = DEMAND_STATUS[status] ?? DEMAND_STATUS.draft;
  return <StatusBadge label={s.label} variant={s.variant} />;
}

const REMINDER_STATUS: Record<EventNotificationStatus, { label: string; variant: StatusVariant }> = {
  pending: { label: 'Scheduled', variant: 'info' },
  sending: { label: 'Sending', variant: 'warning' },
  sent: { label: 'Sent', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  skipped: { label: 'Skipped', variant: 'neutral' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
};

export function ReminderStatusBadge({ status }: { status: EventNotificationStatus }) {
  const s = REMINDER_STATUS[status] ?? REMINDER_STATUS.pending;
  return <StatusBadge label={s.label} variant={s.variant} />;
}

/**
 * The event's date (range when multi-day) with the server's Hijri label under
 * it. An estimate is dashed-underlined and suffixed " · estimated" — a
 * calculated Hijri date must never read as announced.
 */
export function EventDateLabel({
  event,
}: {
  event: Pick<SpecialEvent, 'eventDate' | 'eventEndDate' | 'durationDays' | 'dateIsEstimated' | 'hijriLabel'>;
}) {
  const theme = useAppTheme();
  if (!event.eventDate) {
    return <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Date not resolved</Text>;
  }
  const multiDay = (event.durationDays ?? 1) > 1 && event.eventEndDate;
  return (
    <View>
      <Text
        style={[
          theme.typography.bodySmall,
          { color: theme.colors.text, fontWeight: '600' },
          event.dateIsEstimated ? { textDecorationLine: 'underline', textDecorationStyle: 'dashed', textDecorationColor: theme.colors.textSecondary } : null,
        ]}>
        {formatDisplayDate(event.eventDate)}
        {multiDay && event.eventEndDate ? ` – ${formatDisplayDate(event.eventEndDate)}` : ''}
      </Text>
      {event.hijriLabel || event.dateIsEstimated ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          {event.hijriLabel ?? ''}
          {event.dateIsEstimated ? `${event.hijriLabel ? ' · ' : ''}estimated` : ''}
        </Text>
      ) : null}
    </View>
  );
}

/** "in 23 days" / "Today" / "12 days ago" — red ≤3, amber ≤14, grey once past. */
export function EventCountdown({ daysRemaining }: { daysRemaining: number | null | undefined }) {
  const theme = useAppTheme();
  const { text, tone } = eventCountdown(daysRemaining);
  const color = { danger: theme.colors.danger, warning: theme.colors.warning, muted: theme.colors.textSecondary, normal: theme.colors.text }[tone];
  return <Text style={[theme.typography.bodySmall, { color, fontWeight: '600' }]}>{text}</Text>;
}

/** Labelled bar shifting amber → primary → green as it fills (web ProgressBar). */
export function ProgressBar({ value, label, style }: { value: number | null | undefined; label?: string; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  const v = clampPercent(value);
  const fill = { success: theme.colors.success, primary: theme.colors.primary, warning: theme.colors.warning, empty: 'transparent' }[progressTone(v)];
  return (
    <View style={[{ gap: 4 }, style]}>
      {label ? (
        <View style={styles.barLabel}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
          <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{v}%</Text>
        </View>
      ) : null}
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: v }}
        accessibilityLabel={label ?? 'Progress'}
        style={[styles.track, { backgroundColor: theme.colors.border, borderRadius: theme.radii.pill }]}>
        <View style={{ width: `${v}%`, height: '100%', backgroundColor: fill, borderRadius: theme.radii.pill }} />
      </View>
    </View>
  );
}

/** A two-column "label … value" line, used by the detail cards. */
export function InfoLine({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.infoLine}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700', flexShrink: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  pillText: { fontSize: 10, fontWeight: '700' },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, width: '100%', overflow: 'hidden' },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
});
