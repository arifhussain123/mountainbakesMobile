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

  const mine = theme.isDark
    ? { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }
    : { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder };

  return (
    <View style={styles.thread}>
      <View style={[styles.bubble, styles.mine, mine]}>
        <Text style={[styles.meta, { color: theme.colors.textFaint }]}>
          {ticket.raisedByName ?? 'You'} · {formatDisplayDate(ticket.createdAt.slice(0, 10))} {formatDisplayTime(ticket.createdAt)}
        </Text>
        <Text style={[styles.p, { color: theme.colors.text }]}>{ticket.message}</Text>
      </View>

      {ticket.resolutionNote ? (
        <View style={[styles.bubble, styles.theirs, { backgroundColor: `${theme.colors.success}1A`, borderColor: `${theme.colors.success}33` }]}>
          <Text style={[styles.meta, { color: theme.colors.success }]}>
            {ticket.resolvedByName ?? 'Admin'}
            {ticket.resolvedAt ? ` · ${formatDisplayDate(ticket.resolvedAt.slice(0, 10))} ${formatDisplayTime(ticket.resolvedAt)}` : ''}
          </Text>
          <Text style={[styles.p, { color: theme.colors.text }]}>{ticket.resolutionNote}</Text>
        </View>
      ) : (
        <Text style={[styles.sm, { color: theme.colors.textFaint }]}>Waiting for Admin to reply.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: { gap: 10 },
  bubble: { maxWidth: '88%', borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  mine: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  theirs: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  p: { fontSize: 15, lineHeight: 21 },
  sm: { fontSize: 13, lineHeight: 18 },
});
