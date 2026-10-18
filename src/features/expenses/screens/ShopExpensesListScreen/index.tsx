import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getBusinessDate, getBusinessMonthStart, useExpensesData, useExpensesTotal } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { useSummaryFocusRefresh } from '@/features/discounts/hooks';
import { openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen, SearchBar } from '@/shared/ui';
import { useDebouncedValue } from '@/shared/hooks';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { ExpenseCard } from '../../components';
import { describeExpensesWindow } from '../../expensesWindow';
import { NewShopExpenseSheetContent } from '../NewShopExpenseScreen';
import { styles } from './styles';

/**
 * branchApp.md screen 16 — Shop Expenses, as the web's Branch → Shop Expenses
 * now has it: the current month to date (the 1st through today), not the last
 * seven days. The window is worked out from the business date on every render,
 * so it moves to the new month by itself.
 *
 * The total card is the database's sum over exactly the rows the window and
 * search select (Data Engine aggregate), never the loaded pages added up here.
 */
export function ShopExpensesListScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search).trim() || undefined;

  const from = getBusinessMonthStart();
  const today = getBusinessDate();
  const list = useExpensesData({ from, search: term });
  const totalQ = useExpensesTotal({ from, search: term });
  // Back from another screen: refresh a stale total (the list follows on pull).
  useSummaryFocusRefresh(totalQ);

  const expenses = useMemo(() => list.data?.pages.flatMap((p) => p.data) ?? [], [list.data]);
  const windowText = describeExpensesWindow(from, today);
  const count = totalQ.data?.count;

  const totalText = totalQ.data ? formatCurrency(totalQ.data.amount) : totalQ.isError ? '—' : '…';

  return (
    <Screen>
      <AppHeader
        title="Shop Expenses"
        subtitle={`${windowText}${count !== undefined ? ` · ${count} ${count === 1 ? 'expense' : 'expenses'}` : ''}`}
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <PrimaryButton label="+ Shop Expense" onPress={() => sheetRef.current?.present()} />
      </View>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <View
              accessible
              accessibilityLabel={`Total ${term ? 'matching, ' : ''}this month: ${totalText}`}
              style={[styles.totalCard, { backgroundColor: theme.colors.primary, marginBottom: theme.spacing.md }]}>
              <Text style={[theme.typography.label, { color: theme.colors.primaryText }]}>
                {term ? 'TOTAL · THIS MONTH · MATCHING' : 'TOTAL · THIS MONTH'}
              </Text>
              <Text style={[theme.typography.screenTitle, { color: theme.colors.primaryText, marginTop: 4 }]}>{totalText}</Text>
              {totalQ.isError ? (
                <Pressable accessibilityRole="button" onPress={() => void totalQ.refetch()} disabled={totalQ.isFetching} hitSlop={8}>
                  <Text style={[theme.typography.label, { color: theme.colors.primaryText, marginTop: 4, textDecorationLine: 'underline' }]}>
                    {totalQ.isFetching ? 'Retrying…' : 'Could not load the total · Retry'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search expense #, description, remarks…" />
            {list.isLoading ? <LoadingSkeleton height={100} /> : null}
            {list.error && expenses.length === 0 ? <ErrorState message={mapErrorToMessage(list.error)} onRetry={() => void list.refetch()} /> : null}
            <View style={{ height: theme.spacing.md }} />
          </View>
        }
        ListEmptyComponent={
          !list.isLoading && !list.error ? (
            <EmptyState
              title={term ? 'No Matching Expenses' : 'No Expenses Yet'}
              message={term ? 'No expense this month matches that search.' : 'Expenses recorded this month will appear here.'}
            />
          ) : undefined
        }
        renderItem={({ item }) => <ExpenseCard item={item} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => {
          void list.refetch();
          void totalQ.refetch();
        }}
      />

      <FormBottomSheet ref={sheetRef} title="New Expense" onRequestClose={() => sheetRef.current?.dismiss()}>
        <NewShopExpenseSheetContent onClose={() => sheetRef.current?.dismiss()} />
      </FormBottomSheet>
    </Screen>
  );
}
