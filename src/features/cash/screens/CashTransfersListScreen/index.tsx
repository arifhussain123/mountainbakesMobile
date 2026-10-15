import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCashTransfers } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen, StatCard } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatCurrency } from '@/shared/utils';
import { CashTransferCard } from '../../components';
import { CashDepositSheetContent } from '../CashDepositScreen';
import { styles } from './styles';

const STATUS_FILTERS = ['All', 'pending', 'approved', 'rejected'] as const;
const STATUS_LABEL: Record<(typeof STATUS_FILTERS)[number], string> = {
  All: 'All',
  pending: 'Awaiting',
  approved: 'Approved',
  rejected: 'Rejected',
};

/** branchApp.md screen 15 — Cash Transfers: the branch's own deposit history. */
export function CashTransfersListScreen() {
  const theme = useAppTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');

  const { data, isLoading, error, refetch, isRefetching } = useCashTransfers();
  const transfers = useMemo(() => data?.transfers ?? [], [data]);

  const summary = useMemo(() => {
    const awaiting = transfers.filter((t) => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
    const approved = transfers.filter((t) => t.status === 'approved').reduce((sum, t) => sum + t.amount, 0);
    return { awaiting, approved };
  }, [transfers]);

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return transfers;
    return transfers.filter((t) => t.status === statusFilter);
  }, [transfers, statusFilter]);

  return (
    <Screen>
      <AppHeader title="Cash Transfers" subtitle="Last 90 days" actions={[]} />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <PrimaryButton label="+ Cash Deposit" onPress={() => sheetRef.current?.present()} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            {!isLoading && !error ? (
              <Card style={{ marginBottom: theme.spacing.md }}>
                <View style={styles.summaryRow}>
                  <StatCard label="Awaiting" value={formatCurrency(summary.awaiting)} valueColor={theme.colors.warning} />
                  <StatCard label="Approved" value={formatCurrency(summary.approved)} valueColor={theme.colors.success} />
                </View>
              </Card>
            ) : null}
            <View style={styles.filterRow}>
              {STATUS_FILTERS.map((option) => {
                const active = option === statusFilter;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setStatusFilter(option)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border },
                    ]}>
                    <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>
                      {STATUS_LABEL[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="No Deposits Yet" message="Cash deposits you raise will appear here." /> : undefined
        }
        renderItem={({ item }) => <CashTransferCard item={item} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <FormBottomSheet ref={sheetRef} title="Cash Deposit" subtitle="Finance approves it and posts the receipt" onRequestClose={() => sheetRef.current?.dismiss()}>
        <CashDepositSheetContent onClose={() => sheetRef.current?.dismiss()} />
      </FormBottomSheet>
    </Screen>
  );
}
