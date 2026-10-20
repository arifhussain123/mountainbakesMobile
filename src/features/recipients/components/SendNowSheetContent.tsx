import { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useDispatchClosingSummaries, type NotificationRecipient } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { DateField, PrimaryButton } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatDisplayDate } from '@/shared/utils';
import { lastClosedBusinessDay, messagesPerRun } from '../utils/recipientRules';

export interface SendNowSheetContentProps {
  live: boolean;
  recipients: NotificationRecipient[];
  activeBranchCount: number;
  /** Today's business date (2 AM cutoff). */
  today: string;
  onClose: () => void;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Generate one business date's closing summaries and send them now. The
 * server sends to EVERY active recipient — it has no per-branch or
 * per-person send — and skips anyone already sent that date's summary unless
 * "Send again" is on.
 */
export function SendNowSheetContent({ live, recipients, activeBranchCount, today, onClose }: SendNowSheetContentProps) {
  const theme = useAppTheme();
  const dispatch = useDispatchClosingSummaries();
  const [date, setDate] = useState(lastClosedBusinessDay(today));
  const [resend, setResend] = useState(false);

  const dateOk = DATE_RE.test(date) && date < today;
  const count = messagesPerRun(recipients, activeBranchCount);
  const people = recipients.filter((r) => r.active).length;
  const action = live ? `Send ${count} ${count === 1 ? 'message' : 'messages'}` : `Log a test send (${count})`;

  const run = () =>
    dispatch.mutate(
      { businessDate: date, resend },
      {
        onSuccess: (r) => {
          onClose();
          Alert.alert(
            r.skipped ? 'Nothing Sent' : live ? 'Summaries Sent' : 'Test Send Logged',
            r.skipped
              ? `The server skipped this run: ${r.skipped}.`
              : `${r.reportsGenerated} summaries for ${formatDisplayDate(r.businessDate)}. ${r.messagesSent} ${live ? 'sent' : 'logged'}, ${r.messagesFailed} failed.` +
                  (r.messagesSent === 0 && r.messagesFailed === 0 && !resend ? ' Everyone already had this date’s summary — turn on “Send again” to repeat it.' : ''),
          );
        },
        onError: (e) => Alert.alert('Could Not Send', mapErrorToMessage(e)),
      },
    );

  const confirm = () => {
    if (!dateOk || people === 0) return;
    Alert.alert(
      live ? 'Send Closing Summaries' : 'Log a Test Send',
      `${action} for ${formatDisplayDate(date)} to ${people} active ${people === 1 ? 'recipient' : 'recipients'}.` +
        (live ? '' : ' Test mode: nothing reaches a phone, but each message is recorded in the log as sent.'),
      [{ text: 'Cancel', style: 'cancel' }, { text: live ? 'Send' : 'Log', onPress: run }],
    );
  };

  return (
    <View>
      {!live ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.warning, fontWeight: '700' }]}>
          Test mode: messages are logged but not delivered.
        </Text>
      ) : null}
      <View style={{ marginTop: theme.spacing.md }}>
        {/* Only days that have already closed can be picked: today's summary does not exist until 2:00 AM. */}
        <DateField
          label="Business date"
          value={date}
          onChange={setDate}
          maximumDate={lastClosedBusinessDay(today)}
          error={DATE_RE.test(date) && !dateOk ? 'Pick a day that has already closed.' : undefined}
        />
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>RECIPIENTS</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>
        All {people} active {people === 1 ? 'recipient' : 'recipients'} · {count} {count === 1 ? 'message' : 'messages'}
      </Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
        The server sends to everyone at once; one branch or one person can't be picked yet.
      </Text>

      <View style={[styles.row, { marginTop: theme.spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text }]}>Send again</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Also to people already sent this date's summary</Text>
        </View>
        <Switch value={resend} onValueChange={setResend} accessibilityLabel="Send again to people already sent this date" trackColor={{ true: theme.colors.primary, false: theme.colors.cardBorder }} />
      </View>

      <View style={{ marginTop: theme.spacing.xl }}>
        <PrimaryButton label={action} onPress={confirm} loading={dispatch.isPending} disabled={!dateOk || people === 0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
});
