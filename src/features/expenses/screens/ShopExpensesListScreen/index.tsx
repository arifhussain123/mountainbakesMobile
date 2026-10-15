import { useMemo, useRef, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useExpenses } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen, SearchBar } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { ExpenseCard } from '../../components';
import { NewShopExpenseSheetContent } from '../NewShopExpenseScreen';
import { styles } from './styles';

/** branchApp.md screen 16 — Shop Expenses: last 7 business days. */
export function ShopExpensesListScreen() {
  const theme = useAppTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useExpenses();
  const expenses = useMemo(() => data?.expenses ?? [], [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return expenses;
    return expenses.filter((e) => e.description.toLowerCase().includes(term) || e.category.toLowerCase().includes(term));
  }, [expenses, search]);

  const total = useMemo(() => filtered.reduce((sum, e) => sum + e.amount, 0), [filtered]);

  return (
    <Screen>
      <AppHeader title="Shop Expenses" subtitle={`Last 7 days · ${expenses.length} expenses`} actions={[]} />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <PrimaryButton label="+ Shop Expense" onPress={() => sheetRef.current?.present()} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <View style={[styles.totalCard, { backgroundColor: theme.colors.primary, marginBottom: theme.spacing.md }]}>
              <Text style={[theme.typography.label, { color: theme.colors.primaryText }]}>TOTAL (FILTERED)</Text>
              <Text style={[theme.typography.screenTitle, { color: theme.colors.primaryText, marginTop: 4 }]}>{formatCurrency(total)}</Text>
            </View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search expenses…" />
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
            <View style={{ height: theme.spacing.md }} />
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="No Expenses Yet" message="Expenses for this window will appear here." /> : undefined
        }
        renderItem={({ item }) => <ExpenseCard item={item} />}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />

      <FormBottomSheet ref={sheetRef} title="New Expense" onRequestClose={() => sheetRef.current?.dismiss()}>
        <NewShopExpenseSheetContent onClose={() => sheetRef.current?.dismiss()} />
      </FormBottomSheet>
    </Screen>
  );
}
