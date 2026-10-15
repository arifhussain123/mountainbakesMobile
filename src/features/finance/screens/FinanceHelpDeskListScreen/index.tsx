import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FINANCE_TICKET_STATUS_LABELS, useFinanceTicketStats, useFinanceTickets, type FinanceTicket } from '@/api';
import { Routes, type FinanceHelpDeskStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen, SearchBar, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { NewFinanceQuerySheetContent } from './NewFinanceQuerySheetContent';
import { styles } from './styles';

const QUEUES = ['queue', 'drafts'] as const;

const STATUS_VARIANT: Record<string, StatusVariant> = {
  draft: 'neutral',
  open: 'info',
  under_review: 'warning',
  waiting_for_finance: 'neutral',
  amended: 'neutral',
  reopened: 'warning',
  resolved: 'success',
  rejected: 'danger',
  closed: 'neutral',
};

/** mountainbakesFinance.html screen 21 — Finance Help Desk. View/report/discuss/request-reopen only (see docs/mobile-finance-plan.md). */
export function FinanceHelpDeskListScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<FinanceHelpDeskStackParamList>>();
  const [queue, setQueue] = useState<(typeof QUEUES)[number]>('queue');
  const [search, setSearch] = useState('');
  const newQueryRef = useRef<BottomSheetModal>(null);

  const stats = useFinanceTicketStats();
  const tickets = useFinanceTickets({ status: queue === 'drafts' ? 'draft' : 'all', search: search.trim() || undefined, pageSize: 50 });

  const list = useMemo(() => (tickets.data?.tickets ?? []).filter((t) => (queue === 'drafts' ? t.status === 'draft' : t.status !== 'draft')), [tickets.data, queue]);

  const statTiles = [
    { label: 'Pending', value: stats.data?.open ?? 0, color: '#608CFF' },
    { label: 'In Review', value: stats.data?.underReview ?? 0, color: '#FF8A5C' },
    { label: 'High Priority', value: stats.data?.highPriority ?? 0, color: '#FF5A5F' },
    { label: 'Waiting Finance', value: stats.data?.waiting ?? 0, color: '#A39A92' },
    { label: 'Resolved', value: stats.data?.resolved ?? 0, color: '#34C38A' },
    { label: 'My Drafts', value: stats.data?.draft ?? 0, color: '#857B73' },
  ];

  return (
    <Screen>
      <AppHeader title="Help Desk" subtitle="Report directly to the Admin" actions={[]} />
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View style={{ marginBottom: theme.spacing.sm }}>
            <View style={{ marginBottom: theme.spacing.sm }}>
              <PrimaryButton label="+ New Query" onPress={() => newQueryRef.current?.present()} />
            </View>
            <View style={styles.statsGrid}>
              {statTiles.map((tile) => (
                <View key={tile.label} style={[styles.statTile, { borderColor: theme.colors.border, backgroundColor: theme.colors.cardFill }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tile.color }} />
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {tile.label}
                    </Text>
                  </View>
                  <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 4 }]}>{tile.value}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface, marginTop: theme.spacing.md }]}>
              {QUEUES.map((option) => {
                const active = option === queue;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setQueue(option)}
                    style={[styles.tab, { backgroundColor: active ? theme.colors.primary : 'transparent' }]}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.textSecondary, fontWeight: '700' }]}>
                      {option === 'queue' ? 'Queue' : 'My Drafts'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: theme.spacing.sm }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search Query ID, reference, subject…" />
            </View>

            {tickets.isLoading ? <LoadingSkeleton height={100} /> : null}
            {tickets.error ? <ErrorState message={mapErrorToMessage(tickets.error)} onRetry={() => void tickets.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !tickets.isLoading && !tickets.error ? <EmptyState title="No Queries Here" message={'Raise one with "New Query".'} /> : undefined
        }
        renderItem={({ item }: { item: FinanceTicket }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate(Routes.FINANCE_TICKET_DETAIL, { ticketId: item.id })}
            style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
            <View style={styles.row}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                {item.subject}
              </Text>
              <StatusBadge label={FINANCE_TICKET_STATUS_LABELS[item.status]} variant={STATUS_VARIANT[item.status] ?? 'neutral'} />
            </View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]} numberOfLines={1}>
              {item.queryNo}
              {item.referenceNo ? ` · ${item.referenceNo}` : ''} · {formatDisplayDate(item.createdAt)}
            </Text>
            {item.amount != null ? (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 4, fontWeight: '600' }]}>{formatCurrency(item.amount)}</Text>
            ) : null}
          </Pressable>
        )}
        refreshing={tickets.isRefetching}
        onRefresh={() => void tickets.refetch()}
      />

      <FormBottomSheet title="New Query" onRequestClose={() => newQueryRef.current?.dismiss()} ref={newQueryRef}>
        <NewFinanceQuerySheetContent onClose={() => newQueryRef.current?.dismiss()} onCreated={() => void tickets.refetch()} />
      </FormBottomSheet>
    </Screen>
  );
}
