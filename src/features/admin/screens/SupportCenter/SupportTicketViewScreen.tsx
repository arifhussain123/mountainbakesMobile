import { Alert, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useArchiveSupportTicket, useCachedAdminSupportTicket, useSupportLiveReference } from '@/api';
import { Routes, type SuperAdminSupportStackParamList } from '@/navigation';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, Screen, StatusBadge } from '@/shared/ui';
import { ActionChip } from '../../components';
import { canRefreshReference, isPoolStockTicket, supportTicketActions } from '../../utils/supportActions';
import { ReferenceDetail, SaleItemsList, TextBlock } from './components';
import { OPS_STATUS_LABEL, OPS_STATUS_VARIANT, TYPE_LABEL, formatQueryDate } from './labels';
import { useSupportTicketSheet } from './supportSheets';

/**
 * Web Support Center's View dialog plus the row's actions: ticket number +
 * status, the reference re-read live (`/support/lookup`, scoped to the
 * raiser's branch or the production pool — falls back to the snapshot frozen
 * on the ticket), the sale's lines, the Issue and the Resolution. Mark
 * Resolved / Edit / Change figures / Reject / Delete record (cash deposits) /
 * Archive call the same `/api/support` endpoints the web does; each one that
 * succeeds returns to the queue, as the web's dialog closes and reloads it.
 */
export function SupportTicketViewScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<SuperAdminSupportStackParamList, typeof Routes.SUPER_ADMIN_SUPPORT_TICKET>>();
  const ticket = useCachedAdminSupportTicket(route.params.ticketId);
  const archive = useArchiveSupportTicket();
  const sheet = useSupportTicketSheet(ticket, () => navigation.goBack());

  const snapshot = ticket?.referenceSnapshot ?? null;
  // Web `isPoolStockTicket` + `useLiveReference.canRefresh`.
  const isPool = ticket ? isPoolStockTicket(ticket) : false;
  const canRefresh = ticket ? canRefreshReference(ticket) : false;
  const live = useSupportLiveReference(ticket?.referenceId ?? '', { branchId: ticket?.branchId ?? null, pool: isPool }, canRefresh);
  const reference = live.data ?? snapshot;

  const close = [{ icon: 'close' as const, onPress: () => navigation.goBack(), accessibilityLabel: 'Close' }];

  if (!ticket) {
    return (
      <Screen>
        <AppHeader title="Query" actions={close} />
        <View style={{ padding: theme.spacing.lg }}>
          <EmptyState title="Query not available" message="Go back to the Support Center and open it again." />
        </View>
      </Screen>
    );
  }

  const can = supportTicketActions(ticket);

  // Archives rather than deletes (migration 76) — the row is the only record of what was asked and answered.
  const onArchive = () =>
    Alert.alert('Archive Query', `Archive query ${ticket.ticketNumber}? It leaves the list but is kept on record.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () =>
          archive.mutate(ticket.id, {
            onSuccess: () => {
              Alert.alert('Archived', 'Query archived');
              navigation.goBack();
            },
            onError: (e) => Alert.alert('Could Not Archive', mapErrorToMessage(e)),
          }),
      },
    ]);

  return (
    <Screen>
      <AppHeader title={ticket.ticketNumber} subtitle={`${ticket.referenceId} · from ${ticket.branchName || ticket.raisedByName || '—'}`} actions={close} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge label={OPS_STATUS_LABEL[ticket.status]} variant={OPS_STATUS_VARIANT[ticket.status]} />
          <StatusBadge label={TYPE_LABEL[ticket.referenceType]} variant="neutral" />
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{formatQueryDate(ticket.createdAt)}</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {can.resolve ? <ActionChip icon="check" label="Mark Resolved" primary onPress={() => sheet.open({ kind: 'resolve' })} /> : null}
          <ActionChip icon="pencil" label="Edit" onPress={() => sheet.open({ kind: 'edit' })} />
          <ActionChip icon="scales" label="Change figures" disabled={!can.change} onPress={() => sheet.open({ kind: 'change' })} />
          <ActionChip icon="flag" label="Reject" danger onPress={() => sheet.open({ kind: 'reject' })} />
          {can.deleteDeposit ? <ActionChip icon="trash" label="Delete record" danger onPress={() => sheet.open({ kind: 'deleteDeposit' })} /> : null}
          <ActionChip icon="box" label="Archive" danger loading={archive.isPending} onPress={onArchive} />
        </View>
        {!can.change ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Nothing to correct — answer it with Mark Resolved or Reject.</Text>
        ) : null}

        {reference ? <ReferenceDetail reference={reference} /> : null}
        {reference?.saleItems && reference.saleItems.length > 0 ? <SaleItemsList items={reference.saleItems} /> : null}
        {canRefresh && live.isLoading ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Re-reading the live record…</Text>
        ) : null}

        <TextBlock label="Issue" text={ticket.message} />
        <TextBlock label="Resolution" text={ticket.resolutionNote} />
        {ticket.resolvedByName || ticket.resolvedAt ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {ticket.status === 'rejected' ? 'Rejected' : 'Resolved'}
            {ticket.resolvedByName ? ` by ${ticket.resolvedByName}` : ''}
            {ticket.resolvedAt ? ` · ${formatQueryDate(ticket.resolvedAt)}` : ''}
          </Text>
        ) : null}
      </ScrollView>
      {sheet.element}
    </Screen>
  );
}
