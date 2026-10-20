import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  generateIdempotencyKey,
  useApproveFinanceTransaction,
  useFinanceTransactions,
  useRejectFinanceTransaction,
  type FinanceDocStatus,
  type FinanceTransaction,
} from '@/api';
import { useTabBarHeight } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen, SecondaryButton, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useFinanceCan } from '../../hooks/useFinanceCan';
import { FinanceTransactionDetailSheet } from './FinanceTransactionDetailSheet';
import { NewFinanceTransactionSheetContent } from './NewFinanceTransactionSheetContent';
import { styles } from './styles';

const TABS = ['all', 'pending_approval', 'posted', 'draft', 'rejected'] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = {
  all: 'All',
  pending_approval: 'Pending Approval',
  posted: 'Posted',
  draft: 'Draft',
  rejected: 'Rejected',
};

const STATUS_VARIANT: Record<FinanceDocStatus, StatusVariant> = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved: 'success',
  posted: 'success',
  locked: 'neutral',
  rejected: 'danger',
};

const STATUS_LABEL: Record<FinanceDocStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  posted: 'Posted',
  locked: 'Locked',
  rejected: 'Rejected',
};

/** mountainbakesFinance.html screen 04 — Income & Expense: manual documents only. Branch Income's own 3-step approval queue is a separate thing, not shown in this mockup frame, and is deferred (see docs/mobile-finance-plan.md). */
export function FinanceIncomeExpenseListScreen() {
  const theme = useAppTheme();
  const tabBarHeight = useTabBarHeight();
  const can = useFinanceCan();
  const canCreate = can('create');
  const canApprove = can('approve');

  const [tab, setTab] = useState<(typeof TABS)[number]>('all');
  const [selected, setSelected] = useState<FinanceTransaction | null>(null);
  // Which record's detail has been read to the end — the Approve gate's "scrolled to the end".
  const [endSeenFor, setEndSeenFor] = useState<string | null>(null);
  const newSheetRef = useRef<BottomSheetModal>(null);
  const detailSheetRef = useRef<BottomSheetModal>(null);
  // One key per record, not per hook instance — this screen's quick-approve acts on a
  // different entry each time, so a single mount-time ref would reuse the same key
  // across genuinely different approvals.
  const approveKeysRef = useRef(new Map<string, string>());

  const { data, isLoading, error, refetch, isRefetching } = useFinanceTransactions(tab === 'all' ? { limit: 100 } : { status: tab, limit: 100 });
  const entries = useMemo(() => data?.entries ?? [], [data]);

  const approve = useApproveFinanceTransaction();
  const reject = useRejectFinanceTransaction();

  const openDetail = (entry: FinanceTransaction) => {
    setSelected(entry);
    detailSheetRef.current?.present();
  };

  const quickApprove = (entry: FinanceTransaction) => {
    if (!approveKeysRef.current.has(entry.id)) {
      approveKeysRef.current.set(entry.id, generateIdempotencyKey('finance_transaction_approve'));
    }
    approve.mutate(
      { id: entry.id, idempotencyKey: approveKeysRef.current.get(entry.id) },
      { onError: (e) => Alert.alert('Could Not Approve', mapErrorToMessage(e)) },
    );
  };

  const quickReject = (entry: FinanceTransaction) => {
    Alert.alert('Reject Entry', `Reject ${formatCurrency(entry.amount)} — ${entry.description}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open to Reject', onPress: () => openDetail(entry) },
    ]);
  };

  return (
    <Screen>
      <AppHeader title="Income & Expense" subtitle="Manual documents" actions={[]} />
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.lg + tabBarHeight }}
        ListHeaderComponent={
          <View>
            {canCreate ? (
              <View style={{ marginBottom: theme.spacing.md }}>
                <PrimaryButton label="+ New Entry" onPress={() => newSheetRef.current?.present()} />
              </View>
            ) : null}
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Nothing here reaches the ledger until it is approved.</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={TABS}
              keyExtractor={(t) => t}
              style={{ marginTop: theme.spacing.sm, flexGrow: 0 }}
              contentContainerStyle={{ gap: 6 }}
              renderItem={({ item: option }) => {
                const active = option === tab;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setTab(option)}
                    style={[styles.chip, { backgroundColor: active ? theme.colors.primary : 'transparent', borderColor: theme.colors.border }]}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.textSecondary, fontWeight: '700' }]} numberOfLines={1}>
                      {TAB_LABEL[option]}
                    </Text>
                  </Pressable>
                );
              }}
            />
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={!isLoading && !error ? <EmptyState title="Nothing Here" message="No entries in this queue right now." /> : undefined}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
            <View style={styles.row}>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {item.ledgerHeadName}{' '}
                <Text style={{ color: item.txnType === 'income' ? theme.colors.success : theme.colors.danger, fontSize: 11 }}>{item.txnType}</Text>
              </Text>
              <Text style={[theme.typography.body, { color: item.txnType === 'income' ? theme.colors.success : theme.colors.danger, fontWeight: '700' }]}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 3 }]} numberOfLines={1}>
              {item.description}
            </Text>
            <View style={[styles.row, { marginTop: 6 }]}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {item.txnNo} · {formatDisplayDate(item.businessDate)} · {item.branchName ?? 'Company-wide'}
              </Text>
              <StatusBadge label={STATUS_LABEL[item.status]} variant={STATUS_VARIANT[item.status]} />
            </View>
            <View style={[styles.actionsRow, { marginTop: 8 }]}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="View" onPress={() => openDetail(item)} />
              </View>
              {item.status === 'pending_approval' && canApprove ? (
                <>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Approve" onPress={() => quickApprove(item)} loading={approve.isPending} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton label="Reject" onPress={() => quickReject(item)} loading={reject.isPending} />
                  </View>
                </>
              ) : null}
            </View>
          </View>
        )}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <FormBottomSheet title="New Entry" onRequestClose={() => newSheetRef.current?.dismiss()} ref={newSheetRef}>
        <NewFinanceTransactionSheetContent onClose={() => newSheetRef.current?.dismiss()} onCreated={() => void refetch()} />
      </FormBottomSheet>

      <FormBottomSheet
        title="Entry Detail"
        onRequestClose={() => detailSheetRef.current?.dismiss()}
        ref={detailSheetRef}
        onScrollEnd={() => setEndSeenFor(selected?.id ?? null)}>
        {selected ? (
          <FinanceTransactionDetailSheet entry={selected} onClose={() => detailSheetRef.current?.dismiss()} reachedEnd={endSeenFor === selected.id} />
        ) : null}
      </FormBottomSheet>
    </Screen>
  );
}
