import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useBranchDiscounts, useReviseBranchDiscount, useWithdrawBranchDiscount } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen, SearchBar } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import type { BranchDiscount } from '@/api';
import { DiscountCard, ReviseDiscountModal } from '../../components';
import { RequestDiscountSheetContent } from '../RequestDiscountScreen';
import { styles } from './styles';

const STATUS_FILTERS = ['All', 'pending', 'returned', 'approved', 'rejected'] as const;
const STATUS_LABEL: Record<(typeof STATUS_FILTERS)[number], string> = {
  All: 'All',
  pending: 'Pending',
  returned: 'Sent Back',
  approved: 'Approved',
  rejected: 'Rejected',
};

/** branchApp.md screen 14 — Discounts: the branch's own claim history, last 90 days. */
export function DiscountsListScreen() {
  const theme = useAppTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');
  const [editing, setEditing] = useState<BranchDiscount | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useBranchDiscounts();
  const revise = useReviseBranchDiscount();
  const withdraw = useWithdrawBranchDiscount();

  const discounts = useMemo(() => data?.discounts ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return discounts.filter((d) => {
      if (statusFilter !== 'All' && d.status !== statusFilter) return false;
      if (!term) return true;
      return d.demandNumber.toLowerCase().includes(term) || d.reason.toLowerCase().includes(term);
    });
  }, [discounts, statusFilter, search]);

  const handleWithdraw = (item: BranchDiscount) => {
    Alert.alert('Withdraw Claim', `Remove the claim on ${item.demandNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => withdraw.mutate(item.id, { onError: (e) => Alert.alert('Could Not Withdraw', mapErrorToMessage(e)) }) },
    ]);
  };

  const handleReviseSubmit = (amount: number, reason: string) => {
    if (!editing) return;
    revise.mutate({ id: editing.id, input: { amount, reason } }, { onSuccess: () => setEditing(null) });
  };

  return (
    <Screen>
      <AppHeader title="Branch Discounts" subtitle="Claimed against demands · last 90 days" actions={[]} />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <PrimaryButton label="+ Request Discount" onPress={() => sheetRef.current?.present()} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search demand # or reason…" />
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
          !isLoading && !error ? <EmptyState title="No Discount Claims" message="Try another status or search." /> : undefined
        }
        renderItem={({ item }) => <DiscountCard item={item} onChange={() => setEditing(item)} onWithdraw={() => handleWithdraw(item)} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <ReviseDiscountModal
        visible={editing !== null}
        item={editing}
        isSubmitting={revise.isPending}
        error={revise.error ? mapErrorToMessage(revise.error) : null}
        onSubmit={handleReviseSubmit}
        onClose={() => setEditing(null)}
      />

      <FormBottomSheet ref={sheetRef} title="Request Discount" onRequestClose={() => sheetRef.current?.dismiss()}>
        <RequestDiscountSheetContent />
      </FormBottomSheet>
    </Screen>
  );
}
