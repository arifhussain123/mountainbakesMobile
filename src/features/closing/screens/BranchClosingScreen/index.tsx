import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { exportBranchClosingCsv, getBusinessDate, useBranchClosing, useStock } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { openDrawer } from '@/navigation';
import { BranchClosingHeroCard, BusinessDateControl, ClosingStockHistogram, ClosingStockTable, SyncBanner } from '@/features/closing/components';
import { buildClosingSummaryText } from '@/features/closing/api/shareSummary';
import {
  buildClosingReceiptText,
  selectPrintableBalanceStock,
  type ReceiptPaper,
} from '@/features/closing/api/closingReceipt';
import { countUnsyncedForDate } from '@/features/closing/api/unsyncedForDate';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, IconButton, type IconName, ListThumb, LoadingSkeleton, Screen, SectionHeader } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useOfflineQueueStore } from '@/state';
import { styles } from './styles';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank Account',
};

const PAYMENT_METHOD_ICON: Record<string, IconName> = {
  cash: 'banknote',
  easypaisa: 'wallet',
  foodpanda: 'cart',
  bank_account: 'bank',
};

/**
 * branchApp.md screen 20 — Branch Closing: the ledger's own end-of-day
 * reconciliation for one business date, read from `GET /api/branch-closing`
 * (added alongside this screen — previously only a file export existed; see
 * `docs/mobile-api-contract.md`). The closing-stock table reuses `GET
 * /api/stock?date=` (`useStock`), already built for the Stock screen.
 *
 * 2026 redesign (B20): icon actions (Excel / Share / Print), the business
 * date field, a violet "Net for the day" hero with Sales / Expenses / Cash in
 * hand, "Takings by payment" rows with the Orders / Discounts footer, the
 * shop-expense breakdown, the closing-stock table with its "Show all" link,
 * and the (currently data-stubbed — see `useClosingStockHistogram`)
 * closing-stock histogram.
 */
export function BranchClosingScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  const today = useMemo(() => getBusinessDate(), []);
  const [date, setDate] = useState(today);
  const [isExporting, setIsExporting] = useState(false);
  const writes = useOfflineQueueStore((s) => s.writes);

  const closing = useBranchClosing(date);
  const stock = useStock(date);

  const stockRows = useMemo(() => stock.data?.rows ?? [], [stock.data]);
  const stockTotals = useMemo(
    () =>
      stockRows.reduce(
        (acc, row) => ({
          sold: acc.sold + row.sold,
          returned: acc.returned + row.returned,
          balance: acc.balance + row.balance,
        }),
        { sold: 0, returned: 0, balance: 0 },
      ),
    [stockRows],
  );
  // Positive balance only, for the printed receipt — the table below keeps every row.
  const printableStock = useMemo(() => selectPrintableBalanceStock(stockRows), [stockRows]);

  const isLoading = closing.isLoading || stock.isLoading;
  const error = closing.error ?? stock.error;
  const onRefresh = () => {
    void closing.refetch();
    void stock.refetch();
  };

  const totals = closing.data?.totals;
  const unsyncedCount = useMemo(() => countUnsyncedForDate(writes, date, today), [writes, date, today]);

  // `GET /api/branch-closing/export?type=csv` is the same figures the web's
  // Excel export produces, requested as CSV so it can go straight into the
  // share sheet — there's no file-system/binary-share module in this app to
  // hand a real .xlsx to instead (same approach Sales' own export already uses).
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const csv = await exportBranchClosingCsv(date);
      await Share.share({ title: `Branch Closing ${date}`, message: csv });
    } catch (err) {
      Alert.alert('Export Failed', mapErrorToMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  // No printing pipeline exists anywhere in this app (confirmed in Step 0) —
  // both of these are the same plain-text Share-sheet pattern Sales' receipt
  // sharing and Production's own "POP Print" already use. Share is the chat
  // summary; Print is the fixed-width thermal slip (balance stock + payment
  // details), padded to the chosen roll's width for a print-service app.
  const handlePrintReceipt = () => {
    // Never print a slip from half-loaded stock — an empty Balance Stock
    // section would read as "nothing left on the shelf".
    if (!closing.data || !totals || stock.isLoading || stock.error) return;
    const { branchName, paymentMethods } = closing.data;
    const print = (paper: ReceiptPaper) => {
      void Share.share({
        title: `Branch Closing ${date} — Receipt`,
        message: buildClosingReceiptText(
          { branchName, date, printedAt: new Date(), totals, paymentMethods, stockLines: printableStock },
          paper,
        ),
      });
    };
    Alert.alert('Print Receipt', 'Choose the receipt paper width.', [
      { text: '80 mm roll', onPress: () => print('80mm') },
      { text: '58 mm roll', onPress: () => print('58mm') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleShareSummary = () => {
    if (!closing.data || !totals) return;
    void Share.share({
      title: `Branch Closing ${date}`,
      message: buildClosingSummaryText({
        branchName: closing.data.branchName,
        date,
        totals,
        paymentMethods: closing.data.paymentMethods,
        stockSold: stockTotals.sold,
        stockReturned: stockTotals.returned,
        stockBalance: stockTotals.balance,
      }),
    });
  };

  const rowLine = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border };
  const printDisabled = !totals || stock.isLoading;

  return (
    <Screen>
      <AppHeader
        title="Branch Closing"
        subtitle={closing.data?.branchName}
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={closing.isRefetching || stock.isRefetching} onRefresh={onRefresh} />}>
        <View style={styles.actionRow}>
          <IconButton
            icon="file-spreadsheet"
            accessibilityLabel={isExporting ? 'Exporting to Excel' : 'Export to Excel'}
            disabled={isExporting}
            onPress={() => void handleExportExcel()}
          />
          <IconButton icon="arrow-up-right" accessibilityLabel="Share summary" onPress={handleShareSummary} />
          <IconButton icon="printer" accessibilityLabel="Print closing receipt" disabled={printDisabled} onPress={handlePrintReceipt} />
        </View>

        <BusinessDateControl
          value={date}
          onChange={setDate}
          maxDate={today}
          help="End-of-day summary. This is a read of the day, not a lock on it."
        />

        <SyncBanner
          updatedAt={closing.dataUpdatedAt ? new Date(closing.dataUpdatedAt).toISOString() : null}
          unsyncedCount={unsyncedCount}
          isDayStillOpen={date === today}
        />

        {isLoading ? <LoadingSkeleton height={160} /> : null}
        {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={onRefresh} /> : null}

        {totals ? (
          <BranchClosingHeroCard
            net={totals.net}
            sales={totals.sales}
            expenses={totals.expenses}
            cashInHand={totals.cashInHand}
            cashSales={totals.cashSales}
            cashExpenses={totals.cashExpenses}
          />
        ) : null}

        {closing.data ? (
          <>
            <SectionHeader title="Takings by payment" />
            <Card style={styles.listCard}>
              {closing.data.paymentMethods.map((pm, i) => (
                <View key={pm.method} style={[styles.li, i > 0 && rowLine]}>
                  <ListThumb icon={PAYMENT_METHOD_ICON[pm.method] ?? 'wallet'} index={i} />
                  <View style={styles.grow}>
                    <Text style={[styles.liTitle, { color: theme.colors.text }]}>{PAYMENT_METHOD_LABEL[pm.method] ?? pm.method}</Text>
                    <Text style={[styles.xs, { color: theme.colors.textFaint }]}>
                      {pm.orderCount} order{pm.orderCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <Text style={[styles.amt, { color: theme.colors.text }]}>{formatCurrency(pm.amount)}</Text>
                </View>
              ))}
              {totals ? (
                <>
                  <View style={[styles.sumRow, rowLine]}>
                    <Text style={[styles.sm, { color: theme.colors.textSecondary }]}>Orders / cancelled</Text>
                    <Text style={[styles.sm, styles.strong, { color: theme.colors.text }]}>
                      {totals.orderCount} / {totals.cancelled}
                    </Text>
                  </View>
                  <View style={styles.sumRow}>
                    <Text style={[styles.sm, { color: theme.colors.textSecondary }]}>Discounts given</Text>
                    <Text style={[styles.sm, styles.strong, { color: theme.colors.text }]}>{formatCurrency(totals.discounts)}</Text>
                  </View>
                </>
              ) : null}
            </Card>
          </>
        ) : null}

        {closing.data && closing.data.expenseCategories.length > 0 ? (
          <>
            <SectionHeader title="Shop expenses" />
            <Card style={styles.listCard}>
              {closing.data.expenseCategories.map((ec, i) => (
                <View key={ec.category} style={[styles.sumRow, styles.expenseRow, i > 0 && rowLine]}>
                  <Text style={[styles.liTitle, { color: theme.colors.text }]}>{ec.category}</Text>
                  <Text style={[styles.amt, { color: theme.colors.text }]}>{formatCurrency(ec.amount)}</Text>
                </View>
              ))}
              {/* "Paid from the till (cash)" — the branch's own cash expenses, already fetched as
                    `totals.cashExpenses` (see ClosingTotals in src/api/types.ts). Shown once beneath the
                    category breakdown (not per-category, since the fetched totals aren't broken out by
                    category × payment method). */}
              {totals ? (
                <View style={[styles.sumRow, rowLine]}>
                  <Text style={[styles.sm, { color: theme.colors.textSecondary }]}>Paid from the till (cash)</Text>
                  <Text style={[styles.sm, styles.strong, { color: theme.colors.text }]}>{formatCurrency(totals.cashExpenses)}</Text>
                </View>
              ) : null}
            </Card>
          </>
        ) : null}

        <SectionHeader title="Closing stock" />
        <Text style={[styles.sm, styles.pullUp, { color: theme.colors.textSecondary }]}>
          {stockTotals.sold} sold · {stockTotals.returned} returned to Production · {stockTotals.balance} left on the shelf
        </Text>
        {stockRows.length > 0 ? (
          <ClosingStockTable rows={stockRows} />
        ) : !isLoading && !error ? (
          <EmptyState title="No Stock Activity" message="No products held stock on this day." />
        ) : null}

        {stockRows.length > 0 ? (
          <Card>
            <ClosingStockHistogram rows={stockRows} />
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
