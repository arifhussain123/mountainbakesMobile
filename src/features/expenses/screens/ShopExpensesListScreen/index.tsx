import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getBusinessDate, getBusinessMonthStart, useExpensesData, useExpensesTotal } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { useSummaryFocusRefresh } from '@/features/discounts/hooks';
import { openDrawer } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { ACCENT_GLOW, AccentFill, AppHeader, EmptyState, ErrorState, FormBottomSheet, HeroSurface, Icon, LoadingSkeleton, Screen, SearchBar } from '@/shared/ui';
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

  // White on the violet hero (light); the accent's own on-colour on dark mode's flat accent hero.
  const onHero = theme.isDark ? theme.colors.primaryText : '#FFFFFF';
  const countText = count !== undefined ? ` · ${count} ${count === 1 ? 'expense' : 'expenses'}` : '';

  return (
    <Screen>
      <AppHeader
        title="Shop Expenses"
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: theme.spacing.xs, paddingBottom: 112 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <HeroSurface
              accessible
              accessibilityLabel={`Total ${term ? 'matching, ' : ''}this month: ${totalText}`}
              style={styles.hero}>
              <Text style={[styles.eyebrow, { color: onHero, opacity: 0.8 }]}>
                {windowText}
                {countText}
                {term ? ' · matching' : ''}
              </Text>
              <Text style={[styles.heroValue, { color: onHero }]} numberOfLines={1} adjustsFontSizeToFit>
                {totalText}
              </Text>
              {totalQ.isError ? (
                <Pressable accessibilityRole="button" onPress={() => void totalQ.refetch()} disabled={totalQ.isFetching} hitSlop={8}>
                  <Text style={[styles.heroSub, { color: onHero, textDecorationLine: 'underline' }]}>
                    {totalQ.isFetching ? 'Retrying…' : 'Could not load the total · Retry'}
                  </Text>
                </Pressable>
              ) : null}
            </HeroSurface>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search expense #, description, remarks…" />
            {list.isLoading ? <LoadingSkeleton height={100} /> : null}
            {list.error && expenses.length === 0 ? <ErrorState message={mapErrorToMessage(list.error)} onRetry={() => void list.refetch()} /> : null}
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
        renderItem={({ item, index }) => <ExpenseCard item={item} index={index} isLast={index === expenses.length - 1} />}
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

      {/* B16's floating "+ Expense" button (saffron gradient pill, bottom-right). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New shop expense"
        onPress={() => sheetRef.current?.present()}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.colors.primary, borderRadius: 20, opacity: pressed ? 0.88 : 1 },
          theme.isDark ? null : ACCENT_GLOW,
        ]}>
        <AccentFill borderRadius={20} />
        <Icon name="plus" size={20} color={theme.colors.primaryText} />
        <Text style={[styles.fabLabel, { color: theme.colors.primaryText }]}>Expense</Text>
      </Pressable>

      <FormBottomSheet ref={sheetRef} title="New Expense" onRequestClose={() => sheetRef.current?.dismiss()}>
        <NewShopExpenseSheetContent onClose={() => sheetRef.current?.dismiss()} />
      </FormBottomSheet>
    </Screen>
  );
}
