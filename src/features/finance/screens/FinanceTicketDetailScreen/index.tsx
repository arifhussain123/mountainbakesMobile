import { useRef, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  FINANCE_TICKET_STATUS_LABELS,
  generateIdempotencyKey,
  useFinanceTicket,
  usePostFinanceTicketMessage,
  useRequestReopenFinanceTicket,
  useSubmitFinanceTicket,
} from '@/api';
import type { FinanceHelpDeskStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, LoadingSkeleton, PrimaryButton, Screen, SecondaryButton, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { styles } from '../FinanceHelpDeskListScreen/styles';

const TERMINAL_STATUSES = ['resolved', 'rejected', 'closed'];

function Row({ label, value }: { label: string; value: string | null }) {
  const theme = useAppTheme();
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 5 }}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', textAlign: 'right', flexShrink: 1 }]}>{value}</Text>
    </View>
  );
}

/** mountainbakesFinance.html Help Desk's own detail — messages thread, draft submit, and a reopen REQUEST (not a true reopen — that's super_admin-only). */
export function FinanceTicketDetailScreen() {
  const theme = useAppTheme();
  const route = useRoute<RouteProp<FinanceHelpDeskStackParamList, 'FinanceTicketDetail'>>();
  const { ticketId } = route.params;

  const { data: ticket, isLoading, error, refetch } = useFinanceTicket(ticketId);
  const submit = useSubmitFinanceTicket();
  const postMessage = usePostFinanceTicketMessage();
  const requestReopen = useRequestReopenFinanceTicket();

  const [reply, setReply] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const messageKeyRef = useRef(generateIdempotencyKey('finance_ticket_message'));
  const submitKeyRef = useRef(generateIdempotencyKey('finance_ticket_submit'));
  const reopenKeyRef = useRef(generateIdempotencyKey('finance_ticket_reopen'));

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Query" />
        <View style={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton height={200} />
        </View>
      </Screen>
    );
  }

  if (error || !ticket) {
    return (
      <Screen>
        <AppHeader title="Query" />
        <View style={{ padding: theme.spacing.lg }}>
          <ErrorState message={error ? mapErrorToMessage(error) : 'Not found'} onRetry={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  const handleSubmitDraft = () => {
    submit.mutate({ id: ticket.id, idempotencyKey: submitKeyRef.current }, { onError: (e) => Alert.alert('Could Not Submit', mapErrorToMessage(e)) });
  };

  const handleReply = () => {
    if (reply.trim().length < 1) return;
    postMessage.mutate(
      { id: ticket.id, input: { body: reply.trim() }, idempotencyKey: messageKeyRef.current },
      {
        onSuccess: () => {
          setReply('');
          messageKeyRef.current = generateIdempotencyKey('finance_ticket_message');
        },
        onError: (e) => Alert.alert('Could Not Send', mapErrorToMessage(e)),
      },
    );
  };

  const handleRequestReopen = () => {
    if (reopenReason.trim().length < 3) {
      Alert.alert('Reason Required', 'Say why this should be reopened (at least 3 characters).');
      return;
    }
    requestReopen.mutate(
      { id: ticket.id, input: { reason: reopenReason.trim() }, idempotencyKey: reopenKeyRef.current },
      {
        onSuccess: () => {
          setReopenReason('');
          Alert.alert('Request Sent', 'The admin has been notified.');
        },
        onError: (e) => Alert.alert('Could Not Request Reopen', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <Screen>
      <AppHeader title={ticket.queryNo} subtitle={ticket.subject} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <Card>
          <View style={styles.row}>
            <StatusBadge label={FINANCE_TICKET_STATUS_LABELS[ticket.status]} variant="neutral" />
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{formatDisplayDate(ticket.createdAt)}</Text>
          </View>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 8 }]}>{ticket.message}</Text>
          <View style={{ marginTop: theme.spacing.sm }}>
            <Row label="Reference" value={ticket.referenceNo} />
            <Row label="Amount" value={ticket.amount != null ? formatCurrency(ticket.amount) : null} />
            <Row label="Branch" value={ticket.branchName} />
            <Row label="Raised By" value={ticket.raisedByName} />
            <Row label="Assigned To" value={ticket.assignedToName} />
          </View>
        </Card>

        {ticket.adminResponse || ticket.resolutionNote ? (
          <Card style={{ marginTop: theme.spacing.md }}>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Admin Response</Text>
            <Row label="Response" value={ticket.adminResponse} />
            <Row label="Resolution" value={ticket.resolutionNote} />
          </Card>
        ) : null}

        {ticket.status === 'draft' ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            <PrimaryButton label="Submit to Admin" onPress={handleSubmitDraft} loading={submit.isPending} />
          </View>
        ) : (
          <View style={{ marginTop: theme.spacing.lg }}>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Conversation</Text>
            {(ticket.messages ?? []).map((msg) => (
              <View
                key={msg.id}
                style={{
                  marginTop: theme.spacing.sm,
                  alignSelf: msg.authorSide === 'admin' ? 'flex-start' : 'flex-end',
                  maxWidth: '85%',
                  borderRadius: theme.radii.md,
                  padding: 10,
                  backgroundColor: msg.authorSide === 'admin' ? theme.colors.surface : theme.colors.primary,
                }}>
                <Text style={[theme.typography.bodySmall, { color: msg.authorSide === 'admin' ? theme.colors.text : theme.colors.primaryText }]}>{msg.body}</Text>
                <Text
                  style={[
                    theme.typography.label,
                    { color: msg.authorSide === 'admin' ? theme.colors.textSecondary : theme.colors.primaryText, marginTop: 4, opacity: 0.8 },
                  ]}>
                  {msg.authorName} · {formatDisplayDate(msg.createdAt)}
                </Text>
              </View>
            ))}
            {(ticket.messages ?? []).length === 0 ? (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>No messages yet.</Text>
            ) : null}

            {!TERMINAL_STATUSES.includes(ticket.status) ? (
              <View style={{ marginTop: theme.spacing.md }}>
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  placeholder="Write a reply…"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  style={[styles.input, { height: 70, paddingTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
                />
                <View style={{ marginTop: theme.spacing.sm }}>
                  <PrimaryButton label="Send" onPress={handleReply} loading={postMessage.isPending} disabled={!reply.trim()} />
                </View>
              </View>
            ) : null}

            {TERMINAL_STATUSES.includes(ticket.status) ? (
              <Card style={{ marginTop: theme.spacing.md }}>
                <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Request Reopen</Text>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                  Only the Admin can truly reopen a query — this sends them a request.
                </Text>
                <TextInput
                  value={reopenReason}
                  onChangeText={setReopenReason}
                  placeholder="Why should this be reopened?"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  style={[styles.input, { marginTop: theme.spacing.sm, height: 60, paddingTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
                />
                <View style={{ marginTop: theme.spacing.sm }}>
                  <SecondaryButton label="Request Reopen" onPress={handleRequestReopen} loading={requestReopen.isPending} />
                </View>
              </Card>
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
