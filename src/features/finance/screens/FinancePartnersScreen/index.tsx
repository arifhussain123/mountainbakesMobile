import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  financeCan,
  useApprovePartnerExpense,
  useFinancePartners,
  usePartnerExpenses,
  usePartnerShareSummary,
  useRejectPartnerExpense,
  type FinancePartner,
  type PartnerExpense,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen, SecondaryButton, StatCard, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { EditPartnerProfileSheetContent } from './EditPartnerProfileSheetContent';
import { NewPartnerExpenseSheetContent } from './NewPartnerExpenseSheetContent';
import { styles } from './styles';

const TABS = ['advance', 'draw', 'share', 'partners'] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = { advance: 'Advances', draw: 'Draws', share: 'Share Summary', partners: 'Partners' };

const STATUS_VARIANT: Record<string, StatusVariant> = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved: 'success',
  posted: 'success',
  locked: 'neutral',
  rejected: 'danger',
};

/** mountainbakesFinance.html screen 12 — Partner Transactions: advances/draws, the profit-share summary, and the partner master. */
export function FinancePartnersScreen() {
  const theme = useAppTheme();
  const role = useAuthStore((state) => state.user?.role);
  const canCreate = financeCan(role, 'create');
  const canApprove = financeCan(role, 'approve');
  const canConfigure = financeCan(role, 'configure');

  const [tab, setTab] = useState<(typeof TABS)[number]>('advance');
  const [editingPartner, setEditingPartner] = useState<FinancePartner | null>(null);
  const newExpenseRef = useRef<BottomSheetModal>(null);
  const editPartnerRef = useRef<BottomSheetModal>(null);

  const expenses = usePartnerExpenses({ txnKind: tab === 'advance' || tab === 'draw' ? tab : undefined, limit: 100 });
  const shareSummary = usePartnerShareSummary();
  const partners = useFinancePartners();

  const approve = useApprovePartnerExpense();
  const reject = useRejectPartnerExpense();

  const expenseList = useMemo(() => expenses.data?.expenses ?? [], [expenses.data]);
  const partnerList = useMemo(() => partners.data?.partners ?? [], [partners.data]);

  const openEditPartner = (partner: FinancePartner) => {
    setEditingPartner(partner);
    editPartnerRef.current?.present();
  };

  const handleApprove = (item: PartnerExpense) => {
    approve.mutate({ id: item.id }, { onError: (e) => Alert.alert('Could Not Approve', mapErrorToMessage(e)) });
  };
  const handleReject = (item: PartnerExpense) => {
    Alert.alert('Reject', `Reject ${item.partnerName}'s ${item.txnKind} (${formatCurrency(item.amount)})?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => reject.mutate({ id: item.id, reason: 'Rejected from Partner Transactions' }, { onError: (e) => Alert.alert('Could Not Reject', mapErrorToMessage(e)) }) },
    ]);
  };

  return (
    <Screen>
      <AppHeader title="Partner Transactions" subtitle="Advances, draws & profit-share" actions={[]} />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <View style={[styles.tabsRow, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
          {TABS.map((option) => {
            const active = option === tab;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setTab(option)}
                style={[styles.tab, { backgroundColor: active ? theme.colors.primary : 'transparent', borderRadius: theme.radii.sm }]}>
                <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]} numberOfLines={1}>
                  {TAB_LABEL[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {(tab === 'advance' || tab === 'draw') ? (
        <FlatList
          data={expenseList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          ListHeaderComponent={
            <View style={{ marginBottom: theme.spacing.sm }}>
              {canCreate ? (
                <View style={{ alignSelf: 'flex-end' }}>
                  <PrimaryButton label={`+ New ${tab === 'advance' ? 'Advance' : 'Draw'}`} onPress={() => newExpenseRef.current?.present()} />
                </View>
              ) : null}
              {expenses.isLoading ? <LoadingSkeleton height={100} /> : null}
              {expenses.error ? <ErrorState message={mapErrorToMessage(expenses.error)} onRetry={() => void expenses.refetch()} /> : null}
            </View>
          }
          ListEmptyComponent={!expenses.isLoading && !expenses.error ? <EmptyState title="Nothing Here" message={`No ${tab}s raised yet.`} /> : undefined}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
              <View style={styles.row}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
                  {item.partnerName}
                </Text>
                <Text style={[theme.typography.body, { color: theme.colors.danger, fontWeight: '700' }]}>{formatCurrency(item.amount)}</Text>
              </View>
              <View style={[styles.row, { marginTop: 6 }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {item.expenseNo} · {item.businessDate} · {item.paymentMethod}
                </Text>
                <StatusBadge label={item.status} variant={STATUS_VARIANT[item.status] ?? 'neutral'} />
              </View>
              {item.status === 'pending_approval' && canApprove ? (
                <View style={[styles.actionsRow, { marginTop: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton label="Reject" onPress={() => handleReject(item)} loading={reject.isPending} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Approve" onPress={() => handleApprove(item)} loading={approve.isPending} />
                  </View>
                </View>
              ) : null}
            </View>
          )}
          refreshing={expenses.isRefetching}
          onRefresh={() => void expenses.refetch()}
        />
      ) : null}

      {tab === 'share' ? (
        <FlatList
          data={shareSummary.data?.partners ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          ListHeaderComponent={
            <View style={{ marginBottom: theme.spacing.sm }}>
              {shareSummary.isLoading ? <LoadingSkeleton height={120} /> : null}
              {shareSummary.error ? <ErrorState message={mapErrorToMessage(shareSummary.error)} onRetry={() => void shareSummary.refetch()} /> : null}
              {shareSummary.data ? (
                <View style={styles.statsRow}>
                  <StatCard label="Total Expenses" value={formatCurrency(shareSummary.data.totalExpense)} valueColor={theme.colors.danger} />
                  <StatCard label="Balance" value={formatCurrency(shareSummary.data.ledgerBalance)} valueColor={theme.colors.success} />
                  <StatCard label="Grand Total" value={formatCurrency(shareSummary.data.grandTotal)} />
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
              <View style={styles.row}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{item.name}</Text>
                <Text style={[theme.typography.body, { color: item.balance >= 0 ? theme.colors.success : theme.colors.danger, fontWeight: '700' }]}>
                  {formatCurrency(item.balance)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <View>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{item.sharePct}% Share</Text>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{formatCurrency(item.sharePctAmount)}</Text>
                </View>
                <View>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Advance</Text>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{formatCurrency(item.advancePaid)}</Text>
                </View>
                <View>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Draw</Text>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{formatCurrency(item.drawPaid)}</Text>
                </View>
              </View>
            </View>
          )}
        />
      ) : null}

      {tab === 'partners' ? (
        <FlatList
          data={partnerList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          ListHeaderComponent={
            <View style={{ marginBottom: theme.spacing.sm }}>
              {partners.isLoading ? <LoadingSkeleton height={100} /> : null}
              {partners.error ? <ErrorState message={mapErrorToMessage(partners.error)} onRetry={() => void partners.refetch()} /> : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => (canConfigure ? openEditPartner(item) : undefined)}
              style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
              <View style={styles.row}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{item.name}</Text>
                {item.partnerType ? <StatusBadge label={item.partnerType === 'founder' ? 'Founder' : 'Co-Founder'} variant="info" /> : null}
              </View>
              {item.fatherName || item.contactNumber ? (
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>
                  {item.fatherName ? `Father ${item.fatherName}` : ''}
                  {item.contactNumber ? ` · Contact ${item.contactNumber}` : ''}
                </Text>
              ) : (
                <Text style={[theme.typography.label, { color: theme.colors.primary, marginTop: 6, fontWeight: '700' }]}>No details on file — tap to add</Text>
              )}
            </Pressable>
          )}
        />
      ) : null}

      <FormBottomSheet title={`New ${tab === 'draw' ? 'Draw' : 'Advance'}`} onRequestClose={() => newExpenseRef.current?.dismiss()} ref={newExpenseRef}>
        <NewPartnerExpenseSheetContent
          initialKind={tab === 'draw' ? 'draw' : 'advance'}
          onClose={() => newExpenseRef.current?.dismiss()}
          onCreated={() => void expenses.refetch()}
        />
      </FormBottomSheet>
      <FormBottomSheet title="Partner Detail" onRequestClose={() => editPartnerRef.current?.dismiss()} ref={editPartnerRef}>
        {editingPartner ? <EditPartnerProfileSheetContent partner={editingPartner} onClose={() => editPartnerRef.current?.dismiss()} /> : null}
      </FormBottomSheet>
    </Screen>
  );
}
