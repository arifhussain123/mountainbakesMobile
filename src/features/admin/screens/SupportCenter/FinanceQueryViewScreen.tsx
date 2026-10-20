import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFinanceTicket, usePostFinanceTicketMessage } from '@/api';
import { Routes, type SuperAdminSupportStackParamList } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, LoadingSkeleton, PrimaryButton, Screen, StatusBadge, TextField } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { ActionChip } from '../../components';
import { FINANCE_RESOLUTION_TYPE_LABELS, financeQueryActions, isFinanceRecordAmendable, statusActionLabel } from '../../utils/financeQueryActions';
import { Caption, FieldRow, TextBlock } from './components';
import { useFinanceQuerySheet } from './financeQuerySheets';
import {
  FIN_PRIORITY_LABEL,
  FIN_PRIORITY_VARIANT,
  FIN_QUERY_TYPE_LABEL,
  FIN_REFERENCE_LABEL,
  FIN_STATUS_LABEL,
  FIN_STATUS_VARIANT,
  formatQueryDate,
  recordRows,
} from './labels';

/**
 * Web `FinanceQueryDetailDialog` as an Admin opens it: the query, the record
 * it is about (as raised, and as it stands now), the admin's answer and the
 * conversation — with the admin's actions: Edit / Amend / Recreate the query,
 * Assign, Correct or Delete the record behind it, Delete / Restore the query,
 * Reopen, every legal status move, the Admin Response and a reply. Same
 * `/api/finance/tickets` endpoints; the Help Desk is not gated by "Allow Super
 * Admin to modify". View History and photo attachments stay on the web.
 */
export function FinanceQueryViewScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SuperAdminSupportStackParamList>>();
  const route = useRoute<RouteProp<SuperAdminSupportStackParamList, typeof Routes.SUPER_ADMIN_FINANCE_TICKET>>();
  const q = useFinanceTicket(route.params.ticketId);
  const ticket = q.data;
  const figures = useMemo(() => recordRows(ticket?.referenceSnapshot), [ticket?.referenceSnapshot]);
  const liveFigures = useMemo(() => recordRows(ticket?.liveRecord), [ticket?.liveRecord]);
  const sheet = useFinanceQuerySheet(ticket, () => q.refetch(), (id) => navigation.push(Routes.SUPER_ADMIN_FINANCE_TICKET, { ticketId: id }));
  const post = usePostFinanceTicketMessage();
  const [reply, setReply] = useState('');
  const close = [{ icon: 'close' as const, onPress: () => navigation.goBack(), accessibilityLabel: 'Close' }];
  const muted = [theme.typography.label, { color: theme.colors.textSecondary }];

  if (q.isLoading || q.error || !ticket) {
    return (
      <Screen>
        <AppHeader title="Finance Query" actions={close} />
        <View style={{ padding: theme.spacing.lg }}>
          {q.isLoading ? <LoadingSkeleton height={220} /> : <ErrorState message={q.error ? mapErrorToMessage(q.error) : 'Not found'} onRetry={() => void q.refetch()} />}
        </View>
      </Screen>
    );
  }

  const recordDeleted = Boolean(ticket.liveRecord?.deletedAt);
  const can = financeQueryActions(ticket, recordDeleted);
  const informational = Boolean(ticket.referenceType) && !isFinanceRecordAmendable(ticket.referenceType);

  const sendReply = () => {
    const body = reply.trim();
    if (!body) return;
    post.mutate(
      { id: ticket.id, input: { body } },
      {
        onSuccess: () => setReply(''),
        onError: (e) => Alert.alert('Could Not Post the Message', mapErrorToMessage(e)),
      },
    );
  };

  const byline = [
    `${ticket.raisedByName || '—'} · ${formatQueryDate(ticket.createdAt)}`,
    ticket.branchName,
    ticket.assignedToName ? `Assigned to ${ticket.assignedToName}` : null,
    ticket.recreatedFromQueryNo ? `Recreated from ${ticket.recreatedFromQueryNo}` : null,
    ticket.recreatedAsQueryNo ? `Recreated as ${ticket.recreatedAsQueryNo}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen>
      <AppHeader title={ticket.queryNo} subtitle={byline} actions={close} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {ticket.deletedAt ? (
            <StatusBadge label="Deleted" variant="danger" />
          ) : (
            <StatusBadge label={FIN_STATUS_LABEL[ticket.status]} variant={FIN_STATUS_VARIANT[ticket.status]} />
          )}
          <StatusBadge label={FIN_PRIORITY_LABEL[ticket.priority]} variant={FIN_PRIORITY_VARIANT[ticket.priority]} />
          <StatusBadge label={`v${ticket.version}`} variant="neutral" />
          <StatusBadge label="FINANCE" variant="violet" />
        </View>

        {/* The web detail's action bar: the query's own actions first, then the status moves. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {can.restore ? <ActionChip icon="rotate-ccw" label="Restore" primary onPress={() => sheet.open({ kind: 'restore' })} /> : null}
          {!ticket.deletedAt ? (
            <>
              <ActionChip icon="pencil" label="Edit" disabled={!can.edit} onPress={() => sheet.open({ kind: 'edit' })} />
              <ActionChip icon="sparkle" label="Amend" disabled={!can.amend} onPress={() => sheet.open({ kind: 'amend' })} />
              <ActionChip icon="file-list" label="Recreate" disabled={!can.recreate} onPress={() => sheet.open({ kind: 'recreate' })} />
              <ActionChip icon="user" label="Assign" disabled={!can.assign} onPress={() => sheet.open({ kind: 'assign' })} />
              <ActionChip icon="scales" label="Correct record" disabled={!can.correctRecord} onPress={() => sheet.open({ kind: 'correct' })} />
              <ActionChip icon="trash" label="Delete record" danger disabled={!can.deleteRecord} onPress={() => sheet.open({ kind: 'deleteRecord' })} />
              <ActionChip icon="trash" label="Delete" danger disabled={!can.deleteQuery} onPress={() => sheet.open({ kind: 'deleteQuery' })} />
            </>
          ) : null}
        </View>
        {can.reopen || can.statuses.length > 0 || can.respond ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {can.reopen ? <ActionChip icon="rotate-ccw" label="Reopen" onPress={() => sheet.open({ kind: 'reopen' })} /> : null}
            {can.statuses.map((s) => (
              <ActionChip
                key={s}
                icon={s === 'resolved' ? 'check' : s === 'rejected' ? 'flag' : 'clock'}
                label={statusActionLabel(s, FIN_STATUS_LABEL)}
                primary={s === 'resolved'}
                danger={s === 'rejected'}
                onPress={() => sheet.open({ kind: 'status', target: s })}
              />
            ))}
            {can.respond ? <ActionChip icon="send" label="Admin Response" onPress={() => sheet.open({ kind: 'respond' })} /> : null}
          </View>
        ) : null}
        {ticket.recreatedAsQueryNo ? <Text style={muted}>Already recreated as {ticket.recreatedAsQueryNo}.</Text> : null}

        {ticket.deletedAt ? (
          <Card style={{ padding: 14, borderColor: theme.colors.danger }}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, fontWeight: '700' }]}>
              Deleted{ticket.deletedByName ? ` by ${ticket.deletedByName}` : ''} on {formatQueryDate(ticket.deletedAt)}
            </Text>
            <Text style={muted}>Reason: {ticket.deleteReason ?? '—'}</Text>
            <Text style={muted}>Restore it to edit or answer it again.</Text>
          </Card>
        ) : null}
        {(ticket.amendCount ?? 0) > 0 ? <Text style={muted}>Amended {ticket.amendCount}× — every version is in View History on the web.</Text> : null}

        <Card style={{ padding: 14, gap: 2 }}>
          <Caption>Query</Caption>
          <FieldRow label="Query type" value={FIN_QUERY_TYPE_LABEL[ticket.queryType]} />
          <FieldRow label="Subject" value={ticket.subject} />
          <FieldRow label="Reference" value={ticket.referenceNo ?? ticket.voucherRef ?? null} />
          <FieldRow label="Record type" value={ticket.referenceType ? FIN_REFERENCE_LABEL[ticket.referenceType] : null} />
          <FieldRow label="Amount" value={ticket.amount === null ? '—' : formatCurrency(ticket.amount)} />
          <FieldRow label="Branch" value={ticket.branchName} />
          <FieldRow label="Date" value={ticket.businessDate ? formatDisplayDate(ticket.businessDate) : null} />
          <FieldRow label="Transaction ID" value={ticket.transactionRef} />
          <FieldRow label="Expense ID" value={ticket.expenseRef} />
          <FieldRow label="Income ID" value={ticket.incomeRef} />
          <FieldRow label="Updated" value={formatQueryDate(ticket.updatedAt)} />
        </Card>
        <TextBlock label="Description" text={ticket.message} />
        <TextBlock label="Remarks" text={ticket.remarks} />

        {ticket.referenceNo ? (
          <Card style={{ padding: 14, gap: 2 }}>
            <Caption>Referenced record</Caption>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', marginVertical: 4 }]}>As raised · {ticket.referenceNo}</Text>
            {figures.length > 0 ? figures.map(([k, v]) => <FieldRow key={k} label={k} value={v} />) : <Text style={muted}>No figures were captured.</Text>}
            {liveFigures.length > 0 ? (
              <>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', marginTop: 10, marginBottom: 4 }]}>Now · {ticket.referenceNo}</Text>
                {liveFigures.map(([k, v]) => (
                  <FieldRow key={`now-${k}`} label={k} value={v} />
                ))}
              </>
            ) : null}
            {informational && ticket.referenceType ? (
              <Text style={[muted, { marginTop: 8 }]}>
                Shown for reference. A {FIN_REFERENCE_LABEL[ticket.referenceType].toLowerCase()} is corrected in the Support Center, where its line items, totals and
                branch stock are reconciled together.
              </Text>
            ) : null}
            <Text style={[muted, { marginTop: 8 }]}>Changing the Amount on the query above never changes this record. Use Correct record for that.</Text>
          </Card>
        ) : null}

        <TextBlock label="Admin response" text={ticket.adminResponse} />
        <TextBlock label="Resolution" text={ticket.resolutionNote} />
        {ticket.resolutionType || (ticket.resolutionAmount !== null && ticket.resolutionAmount !== undefined) ? (
          <Text style={muted}>
            {ticket.resolutionType ? FINANCE_RESOLUTION_TYPE_LABELS[ticket.resolutionType] : ''}
            {ticket.resolutionType && ticket.resolutionAmount !== null && ticket.resolutionAmount !== undefined ? ' · ' : ''}
            {ticket.resolutionAmount !== null && ticket.resolutionAmount !== undefined ? `Resolution amount ${formatCurrency(ticket.resolutionAmount)}` : ''}
          </Text>
        ) : null}
        {ticket.resolvedByName || ticket.resolvedAt ? (
          <Text style={muted}>
            {ticket.resolvedByName ?? '—'} · {formatQueryDate(ticket.resolvedAt)}
          </Text>
        ) : null}
        {ticket.internalNote ? <TextBlock label="Internal notes" text={ticket.internalNote} /> : null}
        {ticket.reopenReason ? <TextBlock label="Reopen reason" text={ticket.reopenReason} /> : null}

        <Card style={{ padding: 14, gap: 8 }}>
          <Caption>Conversation</Caption>
          {(ticket.messages ?? []).length === 0 ? <Text style={muted}>Nothing yet. Ask the raiser for anything you need.</Text> : null}
          {(ticket.messages ?? []).map((m) => (
            <View key={m.id} style={{ gap: 2 }}>
              <Text style={muted}>
                {m.authorName} · {m.authorSide === 'admin' ? 'Admin' : 'Finance'} · {formatQueryDate(m.createdAt)}
              </Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{m.body}</Text>
            </View>
          ))}
          {can.reply ? (
            <View>
              <TextField label="Reply to the raiser" value={reply} onChangeText={setReply} multiline placeholder="What you found, or what you need from them" />
              <View style={{ marginTop: 10 }}>
                <PrimaryButton label="Send" onPress={sendReply} loading={post.isPending} disabled={!reply.trim()} />
              </View>
            </View>
          ) : (
            <Text style={muted}>
              {ticket.deletedAt
                ? 'This query has been deleted. The conversation is kept on record.'
                : ticket.status === 'draft'
                  ? 'The conversation starts once the query is submitted.'
                  : 'This query is closed. Raise a new query for anything further.'}
            </Text>
          )}
        </Card>
      </ScrollView>
      {sheet.element}
    </Screen>
  );
}
