import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { SupportTicket } from '@/api';

export interface ReplyThreadProps {
  ticket: SupportTicket;
}

/**
 * Not a real conversation thread — Step 0 confirmed `support_tickets` has
 * exactly one reply slot (`resolutionNote`, admin-only; no branch-reply-back
 * endpoint exists at all). This renders the branch's own raised message and,
 * once there is one, Admin's single reply as two bubbles, so it reads like a
 * thread without pretending there is back-and-forth the server doesn't have.
 */
export function ReplyThread({ ticket }: ReplyThreadProps) {
  const theme = useAppTheme();

  return (
    <View>
      <View style={[styles.bubble, { backgroundColor: theme.colors.cardFill, alignSelf: 'flex-start' }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' }]}>
          {ticket.raisedByName ?? 'You'} · {formatDisplayDate(ticket.createdAt.slice(0, 10))} {formatDisplayTime(ticket.createdAt)}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{ticket.message}</Text>
      </View>

      {ticket.resolutionNote ? (
        <View style={[styles.bubble, { backgroundColor: `${theme.colors.success}1A`, alignSelf: 'flex-end', marginTop: 10 }]}>
          <Text style={[theme.typography.label, { color: theme.colors.success, fontWeight: '700' }]}>
            {ticket.resolvedByName ?? 'Admin'}
            {ticket.resolvedAt ? ` · ${formatDisplayDate(ticket.resolvedAt.slice(0, 10))} ${formatDisplayTime(ticket.resolvedAt)}` : ''}
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{ticket.resolutionNote}</Text>
        </View>
      ) : (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textFaint, marginTop: 10 }]}>
          Waiting for Admin to reply.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '88%', borderRadius: 14, padding: 12 },
});
