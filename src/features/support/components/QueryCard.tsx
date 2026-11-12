import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { useSeenQueriesStore, hasUnseenReply } from '../store/seenQueriesStore';
import { referenceTypeFor } from '../referenceTypes';
import type { SupportTicket } from '@/api';

export interface QueryCardProps {
  ticket: SupportTicket;
  onPress: () => void;
}

const STATUS_LABEL: Record<SupportTicket['status'], string> = { open: 'Open', resolved: 'Resolved', rejected: 'Rejected' };
const STATUS_VARIANT: Record<SupportTicket['status'], StatusVariant> = { open: 'warning', resolved: 'success', rejected: 'danger' };

/** A long month name for the a11y label ("raised 16 October") — `formatDisplayDate` is the short "16 Oct 2026" form used everywhere else visually. */
function spokenDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

/** branchApp.md screen 24 — one Help Desk query. */
export function QueryCard({ ticket, onPress }: QueryCardProps) {
  const theme = useAppTheme();
  const seenAt = useSeenQueriesStore((s) => s.seenAt);
  const referenceType = referenceTypeFor(ticket.referenceId);
  const dateStr = ticket.createdAt.slice(0, 10);
  const unread = hasUnseenReply(ticket.id, ticket.resolutionNote, ticket.resolvedAt, seenAt);

  const recordSummary = ticket.referenceSnapshot?.title ?? ticket.referenceId;

  const accessibilityLabel = [
    `Query on ${referenceType?.label.toLowerCase() ?? 'record'} ${ticket.referenceId}`,
    STATUS_LABEL[ticket.status].toLowerCase(),
    ticket.resolutionNote ? 'admin replied' : null,
    `raised ${spokenDate(dateStr)}`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.touchTarget}>
      {/* 2026 redesign B24: a flat card — "SUP-… · REF-…" over "Type · date · time", the status pill, then the message. */}
      <Card style={[styles.card, theme.isDark ? null : styles.flat]}>
        <View style={styles.row}>
          <View style={styles.titleBlock}>
            <Text style={[styles.h3, { color: theme.colors.text }]} numberOfLines={1}>
              {ticket.ticketNumber} · {ticket.referenceId}
            </Text>
            <Text style={[styles.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
              {[referenceType?.label, formatDisplayDate(dateStr), formatDisplayTime(ticket.createdAt)].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <StatusBadge label={STATUS_LABEL[ticket.status]} variant={STATUS_VARIANT[ticket.status]} />
        </View>

        {recordSummary !== ticket.referenceId ? (
          <View style={styles.summaryRow}>
            {referenceType ? <Icon name={referenceType.icon} size={14} color={theme.colors.textSecondary} /> : null}
            <Text style={[styles.sm, { color: theme.colors.textSecondary, flex: 1 }]} numberOfLines={1}>
              {recordSummary}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.p, { color: theme.colors.text }]} numberOfLines={2}>
          {ticket.message}
        </Text>

        {ticket.resolutionNote ? (
          <View style={styles.repliedRow}>
            {unread ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
            <Icon name="message-circle" size={14} color={theme.colors.success} />
            <Text style={[styles.replied, { color: theme.colors.success }]}>Admin replied</Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: { minHeight: 44, marginBottom: 12 },
  card: { gap: 10 },
  flat: { shadowOpacity: 0, elevation: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  titleBlock: { flex: 1, minWidth: 0, gap: 2 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  sm: { fontSize: 13, lineHeight: 18 },
  p: { fontSize: 15, lineHeight: 21 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  repliedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replied: { fontSize: 12, fontWeight: '700' },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
