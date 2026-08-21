import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import {
  MBEmptyState,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBLedgerTable,
  MBPressable,
  MBSkeletonList,
  type LedgerRow,
} from '@/components';
import { getBranchStockHistory } from '@/services/api/stockHistoryApi';
import { LIVE_STALE_TIME_MS } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import type { BranchStockHistoryRow } from '@/shared/types/stock.types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatBusinessDate } from '@/utils/businessDay';
import { formatAmount, formatQty } from '@/utils/money';
import { contentColumn, space } from '@/theme/spacing';

/**
 * The branch's stock ledger, one row per business day.
 *
 * ---------------------------------------------------------------------------
 * Five columns on a phone, and how they fit
 * ---------------------------------------------------------------------------
 * Previous, New, Sold, Returns & adjustments, Remaining — and each carries a
 * quantity *and* a money figure. Ten numbers per row on a 360dp screen is not a
 * table anyone can read across.
 *
 * So the date is lifted out of the grid and printed as the row's heading, which
 * buys back a whole column, and the money figure sits under its quantity rather
 * than beside it. That is `MBLedgerTable`'s `heading` and `note`, and it is the
 * only reason five columns fit without a horizontal scroller — which would hide
 * the last column, and the last column is the balance.
 *
 * ---------------------------------------------------------------------------
 * "Sold" is stock leaving the shelf, not money taken
 * ---------------------------------------------------------------------------
 * Every amount here — including the sold column — values its quantity at the
 * product's **current** price, so the row keeps reconciling (`previous + new −
 * sold − returned + adjustment = remaining`) on a day that carried a discount or
 * a since-changed price. It is therefore not the day's takings and the screen
 * says so in as many words. See `services/api/stockHistoryApi.ts`.
 *
 * ---------------------------------------------------------------------------
 * A capped window is reported, never quietly shortened
 * ---------------------------------------------------------------------------
 * The ledger read has a row ceiling. A branch with a large catalogue asking for
 * thirty days can get twenty back, oldest-first, and the server says so with
 * `capped` plus the `from` it actually reached. Showing twenty rows under a "30
 * days" chip with nothing else on screen is a number that reads exactly like the
 * right one.
 */

const RANGES = [
  { key: '7', label: '7 days', accessibilityLabel: 'Last 7 business days' },
  { key: '30', label: '30 days', accessibilityLabel: 'Last 30 business days' },
  { key: '90', label: '90 days', accessibilityLabel: 'Last 90 business days' },
] as const;

export function StockHistoryScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{
    goBack: () => void;
    navigate: (screen: string, params?: object) => void;
  }>();

  const [range, setRange] = useState<string>('7');
  const days = Number(range);

  const history = useQuery({
    queryKey: qk.stock.history(null, days),
    // A branch role sends no branchId — the server scopes to its own shop from
    // the JWT, and a branch account may not read another shop's ledger at all.
    queryFn: () => getBranchStockHistory({ days }),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const rows = useMemo<LedgerRow[]>(
    () => (history.data?.rows ?? []).map(toLedgerRow),
    [history.data?.rows],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        tone="brand"
        title="Stock history"
        subtitle="Quantity and value per business day. Stock is valued at current prices, so Sold is not the till total."
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={history.isFetching && !history.isPending}
            onRefresh={() => history.refetch()}
            tintColor={theme.colors.primary}
          />
        }>
        <MBFilterChips
          options={RANGES}
          selectedKey={range}
          onSelect={setRange}
          testIDPrefix="stock-history-range"
        />

        {history.isPending ? (
          <MBSkeletonList rows={6} />
        ) : history.isError ? (
          <MBErrorState
            error={history.error}
            onRetry={() => history.refetch()}
            retrying={history.isFetching}
          />
        ) : rows.length === 0 ? (
          <MBEmptyState
            title="No stock movements"
            message="Nothing has moved in or out of this branch in the selected window."
            icon="stock"
          />
        ) : (
          <>
            {history.data?.capped ? (
              /* Offline is a warning, and so is this: the answer is real, it
                 just does not cover everything that was asked for. Painting it
                 as an error would send someone looking for a fault. */
              <View
                accessible
                accessibilityLabel={`Showing from ${formatBusinessDate(
                  history.data.from,
                )} only. The ledger read hit its row limit.`}
                style={[
                  styles.notice,
                  {
                    backgroundColor: theme.colors.warningBg,
                    borderRadius: theme.radius.md,
                    padding: theme.space.md,
                  },
                ]}>
                <Text style={[theme.type.caption, { color: theme.colors.warning }]}>
                  Too much history to read in one go. These rows start at{' '}
                  {formatBusinessDate(history.data.from)}, not {range} days back.
                </Text>
              </View>
            ) : null}

            <MBLedgerTable columns={COLUMNS} rows={rows} testID="stock-history-table" />

            {/* One way into the per-day statement, and it is here rather than
                on every row: a five-column row has nowhere to put a chevron
                that would not eat a column, and making the whole row tappable
                on a table people read across is how a scroll becomes a
                navigation. */}
            <MBPressable
              onPress={() => navigation.navigate('StockDay')}
              accessibilityRole="button"
              accessibilityLabel="Open the day-by-day statement"
              feedback="opacity"
              style={styles.link}>
              <Text style={[theme.type.label, { color: theme.colors.accent }]}>
                Open a single day&apos;s statement
              </Text>
            </MBPressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Five equal columns, all right-aligned.
 *
 * No fixed widths: every cell is a number of similar length, so equal shares
 * beat guessed pixels — and right-alignment is what puts the units digits under
 * each other, which is the entire reason to read this as a table.
 */
const COLUMNS = [
  { key: 'opening', title: 'Prev', align: 'right' as const },
  { key: 'new', title: 'New', align: 'right' as const },
  { key: 'sold', title: 'Sold', align: 'right' as const },
  { key: 'adjust', title: 'Ret/Adj', align: 'right' as const },
  { key: 'balance', title: 'Remain', align: 'right' as const },
];

function toLedgerRow(row: BranchStockHistoryRow): LedgerRow {
  /**
   * Returns and adjustments share a column.
   *
   * They are two different things — units handed back to production, and an
   * admin correction — but on the overwhelming majority of days both are zero,
   * and a sixth column that is empty six days in seven costs the five that are
   * never empty. Summed with the adjustment's sign preserved, so the row still
   * reconciles; the per-day statement splits them back out.
   */
  const retAdjQty = row.returnedQty - row.adjustmentQty;
  const retAdjAmount = row.returnedAmount - row.adjustmentAmount;

  return {
    key: row.date,
    heading: formatBusinessDate(row.date, { weekday: true }),
    cells: [
      { value: formatQty(row.openingQty), note: formatAmount(row.openingAmount), tone: 'muted' },
      { value: formatQty(row.newQty), note: formatAmount(row.newAmount), tone: 'success' },
      { value: formatQty(row.soldQty), note: formatAmount(row.soldAmount), tone: 'danger' },
      {
        value: retAdjQty === 0 ? '—' : formatQty(retAdjQty),
        note: retAdjQty === 0 ? undefined : formatAmount(retAdjAmount),
        tone: 'warning',
      },
      { value: formatQty(row.balanceQty), note: formatAmount(row.balanceAmount) },
    ],
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notice: {},
  link: { alignSelf: 'center', paddingVertical: space.md },
});
