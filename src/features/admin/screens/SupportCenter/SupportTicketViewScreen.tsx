import { ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useCachedAdminSupportTicket, useSupportLiveReference } from '@/api';
import { Routes, type SuperAdminSupportStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, Screen, StatusBadge } from '@/shared/ui';
import { ReferenceDetail, SaleItemsList, TextBlock } from './components';
import { OPS_STATUS_LABEL, OPS_STATUS_VARIANT, TYPE_LABEL, formatQueryDate } from './labels';

/**
 * Web Support Center's View dialog, read-only: ticket number + status, the
 * reference re-read live (`/support/lookup`, scoped to the raiser's branch or
 * the production pool — falls back to the snapshot frozen on the ticket), the
 * sale's lines, the Issue and the Resolution. "Mark Resolved" is not offered
 * in this phase.
 */
export function SupportTicketViewScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<SuperAdminSupportStackParamList, typeof Routes.SUPER_ADMIN_SUPPORT_TICKET>>();
  const ticket = useCachedAdminSupportTicket(route.params.ticketId);

  const snapshot = ticket?.referenceSnapshot ?? null;
  // Web `isPoolStockTicket` + `useLiveReference.canRefresh`.
  const isPool = ticket?.referenceType === 'stock' && (snapshot?.isProductionPool === true || ticket.raisedByRole === 'production_user');
  const canRefresh = Boolean(snapshot) && (snapshot?.readOnly !== true || isPool || ticket?.referenceType === 'cash_transfer');
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

  return (
    <Screen>
      <AppHeader title={ticket.ticketNumber} subtitle={`${ticket.referenceId} · from ${ticket.branchName || ticket.raisedByName || '—'}`} actions={close} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge label={OPS_STATUS_LABEL[ticket.status]} variant={OPS_STATUS_VARIANT[ticket.status]} />
          <StatusBadge label={TYPE_LABEL[ticket.referenceType]} variant="neutral" />
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{formatQueryDate(ticket.createdAt)}</Text>
        </View>

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
    </Screen>
  );
}
