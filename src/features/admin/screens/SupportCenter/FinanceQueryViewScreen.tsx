import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useFinanceTicket } from '@/api';
import { Routes, type SuperAdminSupportStackParamList } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, LoadingSkeleton, Screen, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { Caption, FieldRow, TextBlock } from './components';
import {
  FIN_PRIORITY_LABEL,
  FIN_PRIORITY_VARIANT,
  FIN_QUERY_TYPE_LABEL,
  FIN_REFERENCE_LABEL,
  FIN_STATUS_LABEL,
  FIN_STATUS_VARIANT,
  formatQueryDate,
} from './labels';

/** Web `RecordFigures`'s filter: no ids, no bookkeeping stamps, no nested objects, first 18. */
const NOISE_KEYS = new Set(['id', 'createdAt', 'updatedAt', 'deletedBy', 'deletedQueryId']);

function recordRows(record: Record<string, unknown> | null | undefined): [string, string][] {
  if (!record) return [];
  return Object.entries(record)
    .filter(([k, v]) => !k.endsWith('Id') && !NOISE_KEYS.has(k) && v !== null && v !== '' && typeof v !== 'object')
    .slice(0, 18)
    .map(([k, v]) => [k.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), String(v)]);
}

/**
 * Web `FinanceQueryDetailDialog`, read-only: the query, the record it is about
 * as raised, the admin's answer and the conversation. Feed / amend / resolve /
 * reject / delete / restore / recreate / reply all stay on the web this phase.
 */
export function FinanceQueryViewScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<SuperAdminSupportStackParamList, typeof Routes.SUPER_ADMIN_FINANCE_TICKET>>();
  const q = useFinanceTicket(route.params.ticketId);
  const ticket = q.data;
  const figures = useMemo(() => recordRows(ticket?.referenceSnapshot), [ticket?.referenceSnapshot]);
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
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 10 }}>
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

        {ticket.deletedAt ? (
          <Card style={{ padding: 14, borderColor: theme.colors.danger }}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, fontWeight: '700' }]}>Deleted on {formatQueryDate(ticket.deletedAt)}</Text>
            <Text style={muted}>Reason: {ticket.deleteReason ?? '—'}</Text>
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
          </Card>
        ) : null}

        <TextBlock label="Admin response" text={ticket.adminResponse} />
        <TextBlock label="Resolution" text={ticket.resolutionNote} />
        {ticket.resolvedByName || ticket.resolvedAt ? (
          <Text style={muted}>
            {ticket.resolvedByName ?? '—'} · {formatQueryDate(ticket.resolvedAt)}
          </Text>
        ) : null}
        {ticket.reopenReason ? <TextBlock label="Reopen reason" text={ticket.reopenReason} /> : null}

        {(ticket.messages ?? []).length > 0 ? (
          <Card style={{ padding: 14, gap: 8 }}>
            <Caption>Conversation</Caption>
            {(ticket.messages ?? []).map((m) => (
              <View key={m.id} style={{ gap: 2 }}>
                <Text style={muted}>
                  {m.authorName} · {m.authorSide === 'admin' ? 'Admin' : 'Finance'} · {formatQueryDate(m.createdAt)}
                </Text>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{m.body}</Text>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
