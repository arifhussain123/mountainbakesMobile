import { useEffect, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSupportTickets } from '@/api';
import { goBack, Routes, type RootStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, ErrorState, Icon, LoadingSkeleton, Screen, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { RecordPreview, ReplyThread } from '../../components';
import { useSeenQueriesStore } from '../../store/seenQueriesStore';

const STATUS_LABEL: Record<'open' | 'resolved' | 'rejected', string> = { open: 'Open', resolved: 'Resolved', rejected: 'Rejected' };
const STATUS_VARIANT: Record<'open' | 'resolved' | 'rejected', StatusVariant> = { open: 'warning', resolved: 'success', rejected: 'danger' };

/**
 * No single-ticket GET endpoint exists server-side (Step 0: only list, lookup,
 * and the three admin-only PATCH routes) — the ticket is read straight out of
 * `useSupportTickets()`'s already-fetched cache by id, the same zero-extra-
 * request approach the rest of this feature uses, and it works from the
 * offline cache for free too.
 */
export function QueryDetailScreen() {
  const theme = useAppTheme();
  const route = useRoute<RouteProp<RootStackParamList, typeof Routes.QUERY_DETAIL>>();
  const { data, isLoading, error, refetch } = useSupportTickets();
  const markSeen = useSeenQueriesStore((s) => s.markSeen);

  const ticket = useMemo(() => data?.tickets.find((t) => t.id === route.params.ticketId) ?? null, [data, route.params.ticketId]);

  useEffect(() => {
    if (ticket?.resolutionNote && ticket.resolvedAt) markSeen(ticket.id, ticket.resolvedAt);
  }, [ticket, markSeen]);

  if (isLoading && !ticket) {
    return (
      <Screen>
        <AppHeader title="Query" actions={[{ icon: 'close', onPress: goBack, accessibilityLabel: 'Close' }]} />
        <LoadingSkeleton height={120} />
      </Screen>
    );
  }

  if (!ticket) {
    return (
      <Screen>
        <AppHeader title="Query" actions={[{ icon: 'close', onPress: goBack, accessibilityLabel: 'Close' }]} />
        {error ? (
          <ErrorState message="Couldn't load this query." onRetry={() => void refetch()} />
        ) : (
          <ErrorState message="This query isn't available — it may have been archived, or the list hasn't loaded yet." onRetry={() => void refetch()} />
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title={ticket.ticketNumber} subtitle={ticket.referenceId} actions={[{ icon: 'close', onPress: goBack, accessibilityLabel: 'Close' }]} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <StatusBadge label={STATUS_LABEL[ticket.status]} variant={STATUS_VARIANT[ticket.status]} />
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textFaint }]}>
            Raised {formatDisplayDate(ticket.createdAt.slice(0, 10))} · {formatDisplayTime(ticket.createdAt)}
          </Text>
        </View>

        {ticket.referenceSnapshot ? <RecordPreview reference={ticket.referenceSnapshot} showOpenRecord /> : null}

        <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginTop: theme.spacing.lg }]}>Conversation</Text>
        <View style={{ marginTop: theme.spacing.sm }}>
          <ReplyThread ticket={ticket} />
        </View>

        {/* No reopen/withdraw action — Step 0 confirmed neither endpoint exists server-side. */}
        {ticket.status !== 'open' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.lg }}>
            <Icon name="info" size={14} color={theme.colors.textFaint} />
            <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginLeft: 6, flex: 1 }]}>
              This query is {STATUS_LABEL[ticket.status].toLowerCase()}. Raise a new query if the issue isn't fixed.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
