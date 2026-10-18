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
      <Card style={{ marginBottom: 10 }}>
        <View style={styles.row}>
          <View style={styles.titleRow}>
            {referenceType ? <Icon name={referenceType.icon} size={16} color={theme.colors.textSecondary} /> : null}
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginLeft: 6 }]}>{ticket.referenceId}</Text>
          </View>
          <StatusBadge label={STATUS_LABEL[ticket.status]} variant={STATUS_VARIANT[ticket.status]} />
        </View>

        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]} numberOfLines={1}>
          {recordSummary}
        </Text>

        <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 8 }]} numberOfLines={2}>
          {ticket.message}
        </Text>

        <View style={[styles.row, { marginTop: 10 }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>
            Raised {formatDisplayDate(dateStr)} · {formatDisplayTime(ticket.createdAt)}
          </Text>
          {ticket.resolutionNote ? (
            <View style={styles.repliedRow}>
              {unread ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
              <Text style={[theme.typography.label, { color: theme.colors.success, fontWeight: '700' }]}>Admin replied</Text>
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: { minHeight: 44 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  repliedRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
});
