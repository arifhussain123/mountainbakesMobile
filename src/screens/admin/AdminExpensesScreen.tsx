import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';

import {
  MBEmptyState,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBSkeletonList,
  MBSyncStatus,
  MBExpenseCard,
} from '@/components';
import { useBranches, useSettings } from '@/hooks/useCatalog';
import { getExpenses } from '@/services/api/expensesApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import type { Expense } from '@/shared/types/expense.types';
import { useTheme } from '@/theme/ThemeProvider';
import { contentColumn, space } from '@/theme/spacing';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { formatCurrency, round2, toNumber } from '@/utils/money';

/**
 * Shop expenses, across every branch.
 *
 * ---------------------------------------------------------------------------
 * Read-only, and that is not an omission
 * ---------------------------------------------------------------------------
 * `POST /api/expenses` records an expense **for the acting branch**, taking the
 * branch from the caller's own JWT. A super_admin carries no `branchId`, so
 * there is no branch for an admin-entered expense to belong to — the write would
 * either fail or land somewhere nobody chose. Recording an expense is a branch
 * act; this screen is the audit of it.
 *
 * ---------------------------------------------------------------------------
 * The window is the server's, and it is seven business days
 * ---------------------------------------------------------------------------
 * `GET /api/expenses` applies `business_date >= businessDaysAgoStr(6)` as an
 * indexed predicate — the last seven business days, always, whatever this screen
 * asks for. That is stated in the subtitle rather than left to be discovered by
 * an admin who scrolls to the bottom and concludes the shop stopped spending.
 */

const ALL_BRANCHES = 'all';

export function AdminExpensesScreen(): React.ReactElement {
  const theme = useTheme();
  const [branchId, setBranchId] = useState(ALL_BRANCHES);

  const branches = useBranches();
  const settings = useSettings();
  const currencySymbol = settings.data?.currencySymbol;

  const filters = useMemo(
    () => (branchId === ALL_BRANCHES ? {} : { branchId }),
    [branchId],
  );

  const expenses = useQuery({
    queryKey: qk.expenses.list(filters),
    queryFn: () => getExpenses(filters),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const rows = useMemo(() => expenses.data ?? [], [expenses.data]);
  const total = useMemo(
    // See AdminSalesScreen: `toNumber` cannot return NaN, `Number` can.
    () => round2(rows.reduce((sum, e) => sum + toNumber(e.amount), 0)),
    [rows],
  );

  const branchOptions = useMemo(
    () => [
      { key: ALL_BRANCHES, label: 'All branches' },
      ...(branches.data ?? []).map(b => ({ key: b.id, label: b.name })),
    ],
    [branches.data],
  );

  const renderItem = useCallback(
    ({ item }: { item: Expense }) => (
      <MBExpenseCard expense={item} currencySymbol={currencySymbol} />
    ),
    [currencySymbol],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Expenses"
        dataAsOf={dataAsOfFrom(expenses.dataUpdatedAt)}
        subtitle={
          expenses.data
            ? `${formatCurrency(total, currencySymbol)} over the last 7 business days`
            : undefined
        }
        right={<MBSyncStatus />}
      />

      <View style={{ padding: theme.layout.screenPad }}>
        <MBFilterChips
          options={branchOptions}
          selectedKey={branchId}
          onSelect={setBranchId}
          scroll
          testIDPrefix="expense-branch"
        />
      </View>

      {expenses.isPending ? (
        <MBSkeletonList rows={8} />
      ) : expenses.isError ? (
        <MBErrorState
          error={expenses.error}
          onRetry={expenses.refetch}
          retrying={expenses.isFetching}
        />
      ) : rows.length === 0 ? (
        <MBEmptyState
          title="No expenses recorded"
          message="Nothing in the last seven business days for this branch."
        />
      ) : (
        <FlashList
          data={rows}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={expenses.refetch} />
          }
        />
      )}
    </View>
  );
}

/**
 * Memoised. This list re-renders whenever the screen does — a filter chip, a
 * refetch, a keystroke — and with props that do not change, none of the visible
 * rows re-render with it. Theme changes still reach it: context bypasses `memo`.
 */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.tight,
  },
});
