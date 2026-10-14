import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { SupportTicket } from '@/api';

export interface TicketCardProps {
  ticket: SupportTicket;
}

const STATUS_LABEL: Record<SupportTicket['status'], string> = { open: 'Open', resolved: 'Resolved', rejected: 'Rejected' };
const STATUS_VARIANT: Record<SupportTicket['status'], StatusVariant> = { open: 'warning', resolved: 'success', rejected: 'danger' };

/** branchApp.md screen 24 — one Help Desk query. */
export function TicketCard({ ticket }: TicketCardProps) {
  const theme = useAppTheme();

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={styles.row}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{ticket.ticketNumber}</Text>
        <StatusBadge label={STATUS_LABEL[ticket.status]} variant={STATUS_VARIANT[ticket.status]} />
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        {ticket.referenceId} · {formatDisplayDate(ticket.createdAt.slice(0, 10))} {formatDisplayTime(ticket.createdAt)}
      </Text>
      <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 8 }]} numberOfLines={3}>
        {ticket.message}
      </Text>
      {ticket.resolutionNote ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.success, marginTop: 8 }]} numberOfLines={3}>
          Admin: {ticket.resolutionNote}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
