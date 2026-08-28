import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import {
  MBDateStepper,
  MBErrorState,
  MBHeader,
  MBLedgerTable,
  MBMoney,
  MBSkeletonList,
  type LedgerRow,
} from '@/common/ui';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import type { StockStackParamList } from '@/navigation/types';
import { getBranchStockDay } from '@/api/services/stockHistoryService';
import { LIVE_STALE_TIME_MS } from '@/api/queryClient';
import { qk } from '@/api/queryKeys';
import type { BranchStockHistoryRow } from '@/shared/types/stock.types';
import { businessDateStr } from '@/shared/utils/timezone';
import { useTheme } from '@/common/theme/ThemeProvider';
import { formatBusinessDate, shiftBusinessDate } from '@/common/helpers/businessDay';
import { formatAmount, formatQty } from '@/common/utils/money';
import { contentColumn, space } from '@/common/theme/spacing';

/**
 * One business day of the branch's stock ledger, line by line.
 *
 * ---------------------------------------------------------------------------
 * What this is not
 * ---------------------------------------------------------------------------
 * It is **not** the Stock tab's list with a date on it. That screen is one row
 * per product for one day — what is on which shelf — and it is what a count is
 * read against. This is the whole shop folded into a single running statement:
 * what was carried in, what production added, what sold, what went back, and
 * what is left. Four numbers, and the only question is whether they reconcile.
 *
 * ---------------------------------------------------------------------------
 * The amounts are stock at TODAY'S prices, and the screen says so
 * ---------------------------------------------------------------------------
 * The server values every quantity — including the sold column — at the
 * product's current `products.price`, so that the row keeps adding up when a
 * sale carried a discount or a price has moved since. The consequence is that
 * "Sold" here is **not** the day's takings, and the two figures will differ on
 * any day with a discount.
 *
 * That is why the header carries the sentence rather than leaving it to a
 * footnote. A branch manager reading a money column headed "Sold" will take it
 * for revenue unless told otherwise, and the number is close enough to the real
 * one to survive a sanity check.
 *
 * ---------------------------------------------------------------------------
 * Previous balance is dated the day before
 * ---------------------------------------------------------------------------
 * `openingQty` is the closing balance of the previous business day carried in,
 * so its row is stamped with that day's date and not with this one. Stamping it
 * today would say stock arrived this morning that has been on the shelf since
 * yesterday.
 *
 * ---------------------------------------------------------------------------
 * A date the ledger cannot reach is an error, never an empty day
 * ---------------------------------------------------------------------------
 * The ledger is derived by walking today's live balance backwards, so it only
 * reaches 365 days and a very large catalogue shortens that further. The server
 * refuses an unreachable date with a sentence naming the reason. Rendering that
 * as a table of zeroes would be a statement claiming nothing moved.
 */

type StockDayRoute = RouteProp<StockStackParamList, 'StockDay'>;

export function StockDayScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();
  const route = useRoute<StockDayRoute>();
  const { currencySymbol } = useCatalogSettings();

  const [date, setDate] = useState(() => route.params?.date ?? businessDateStr());

  const day = useQuery({
    queryKey: qk.stock.day(null, date),
    // A branch role sends no branchId — the server scopes to its own shop from
    // the JWT, and sending one would be refused rather than honoured.
    queryFn: () => getBranchStockDay({ date }),
    staleTime: LIVE_STALE_TIME_MS,
  });

  const row = day.data?.row;

  const rows = useMemo<LedgerRow[]>(() => (row ? ledgerRows(row, date) : []), [row, date]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        tone="brand"
        title="Stock ledger"
        subtitle="One business day, line by line. The previous balance is carried in from the day before."
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={day.isFetching && !day.isPending}
            onRefresh={() => day.refetch()}
            tintColor={theme.colors.primary}
          />
        }>
        <MBDateStepper
          value={date}
          onChange={setDate}
          /* The walk only reaches a year back, and the server refuses anything
             older with a reason. Stopping the arrow there is kinder than letting
             someone step into an error and back out of it. */
          minDate={shiftBusinessDate(businessDateStr(), -364)}
          testID="stock-day-date"
        />

        {day.isPending ? (
          <MBSkeletonList rows={5} />
        ) : day.isError ? (
          <MBErrorState
            error={day.error}
            onRetry={() => day.refetch()}
            retrying={day.isFetching}
          />
        ) : !row ? (
          <MBErrorState
            error={new Error('The server answered without a ledger row for this day.')}
            onRetry={() => day.refetch()}
            retrying={day.isFetching}
          />
        ) : (
          <>
            <MBLedgerTable
              columns={LEDGER_COLUMNS}
              rows={rows}
              testID="stock-day-ledger"
            />

            {/* The closing figure again, on its own. It is the one number
                somebody writes down, and reading it off the last line of a
                four-line table is how the "sold" line gets copied instead. */}
            <View
              accessible
              accessibilityLabel={`Closing value ${formatQty(row.balanceQty)} items on hand`}
              style={[
                styles.closing,
                {
                  backgroundColor: theme.colors.primarySoft,
                  borderRadius: theme.radius.lg,
                  padding: theme.layout.cardPad,
                  gap: theme.space.md,
                },
              ]}>
              <View style={styles.closingMain}>
                <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
                  CLOSING VALUE
                </Text>
                <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                  {formatQty(row.balanceQty)} items on hand
                </Text>
              </View>
              <MBMoney value={row.balanceAmount} symbol={currencySymbol} />
            </View>

            <Text style={[theme.type.caption, styles.note, { color: theme.colors.textMuted }]}>
              Amounts value every quantity at today&apos;s price list. Sold here is stock leaving
              the shelf, not the money taken — read Sales for that.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Four fixed columns rather than a flexible grid.
 *
 * `Detail` takes the slack and the three numeric columns are pinned, so the
 * figures sit in the same place whatever the longest label happens to be — which
 * is the whole reason to draw this as a table.
 */
const LEDGER_COLUMNS = [
  { key: 'date', title: 'Date', width: 78 },
  { key: 'detail', title: 'Detail' },
  { key: 'qty', title: 'Qty', width: 44, align: 'right' as const },
  { key: 'amount', title: 'Amount', width: 88, align: 'right' as const },
];

/**
 * The day as a statement.
 *
 * Returns and adjustments are only printed when they are non-zero, and that is
 * a deliberate asymmetry with the other four lines: opening, new, sold and
 * balance are always meaningful (a zero there is a fact about the day), whereas
 * a zero-adjustment line is noise on the overwhelming majority of days and
 * pushes the closing balance below the fold.
 */
function ledgerRows(row: BranchStockHistoryRow, date: string): LedgerRow[] {
  /**
   * The bare number, with no symbol.
   *
   * `MBMoney` is the only component that renders currency and a ledger cell is
   * deliberately a `string` rather than a node: the table draws every figure
   * with `type.number` so a column of them is tabular and aligns, which a
   * nested component would break. `formatAmount` is `MBMoney`'s own numeric
   * half, so the grouping and the rounding are identical — the symbol is simply
   * named once, on the column heading and the closing card, instead of repeated
   * down a column where it costs the alignment it is paid for.
   */
  const money = (n: number) => formatAmount(n);
  const out: LedgerRow[] = [
    {
      key: 'opening',
      cells: [
        // Stamped with the PREVIOUS business day: this is that day's closing
        // balance carried in, not something that happened this morning.
        { value: formatBusinessDate(shiftBusinessDate(date, -1)), tone: 'muted' },
        { value: 'Previous balance', tone: 'muted' },
        { value: formatQty(row.openingQty) },
        { value: money(row.openingAmount), tone: 'muted' },
      ],
    },
    {
      key: 'new',
      cells: [
        { value: formatBusinessDate(date), tone: 'muted' },
        { value: 'New stock in', tone: 'success' },
        { value: formatQty(row.newQty) },
        { value: money(row.newAmount), tone: 'success' },
      ],
    },
    {
      key: 'sold',
      cells: [
        { value: formatBusinessDate(date), tone: 'muted' },
        { value: 'Sold', tone: 'danger' },
        { value: formatQty(row.soldQty) },
        { value: money(row.soldAmount), tone: 'danger' },
      ],
    },
  ];

  if (row.returnedQty !== 0) {
    out.push({
      key: 'returned',
      cells: [
        { value: formatBusinessDate(date), tone: 'muted' },
        { value: 'Returned to production', tone: 'danger' },
        { value: formatQty(row.returnedQty) },
        { value: money(row.returnedAmount), tone: 'danger' },
      ],
    });
  }

  if (row.adjustmentQty !== 0 || row.adjustmentAmount !== 0) {
    out.push({
      key: 'adjustment',
      cells: [
        { value: formatBusinessDate(date), tone: 'muted' },
        { value: 'Adjustments', tone: 'warning' },
        { value: formatQty(row.adjustmentQty) },
        { value: money(row.adjustmentAmount), tone: 'warning' },
      ],
    });
  }

  out.push({
    key: 'balance',
    cells: [
      { value: formatBusinessDate(date), tone: 'muted' },
      { value: 'Remaining' },
      { value: formatQty(row.balanceQty) },
      { value: money(row.balanceAmount) },
    ],
  });

  return out;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  closing: { flexDirection: 'row', alignItems: 'center' },
  closingMain: { flex: 1, gap: space.hair },
  note: { paddingHorizontal: space.xs },
});
