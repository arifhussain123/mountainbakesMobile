import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSupportTickets } from '@/api';
import { goBack, Routes, type RootStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, ErrorState, InfoBanner, LoadingSkeleton, Screen, SectionHeader, StatusBadge, type StatusVariant } from '@/shared/ui';
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
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.statusRow}>
          <StatusBadge label={STATUS_LABEL[ticket.status]} variant={STATUS_VARIANT[ticket.status]} />
          <Text style={[styles.xs, { color: theme.colors.textFaint }]}>
            Raised {formatDisplayDate(ticket.createdAt.slice(0, 10))} · {formatDisplayTime(ticket.createdAt)}
          </Text>
        </View>

        {ticket.referenceSnapshot ? <RecordPreview reference={ticket.referenceSnapshot} showOpenRecord /> : null}

        <SectionHeader title="Conversation" />
        <ReplyThread ticket={ticket} />

        {/* No reopen/withdraw action — Step 0 confirmed neither endpoint exists server-side. */}
        {ticket.status !== 'open' ? (
          <InfoBanner kind="info">{`This query is ${STATUS_LABEL[ticket.status].toLowerCase()}. Raise a new query if the issue isn't fixed.`}</InfoBanner>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32, gap: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  xs: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: '500', textAlign: 'right' },
});
