import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { exportBranchClosingCsv, getBusinessDate, useBranchClosing, useStock } from '@/api';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { openDrawer } from '@/navigation';
import {
  BusinessDateControl,
  CashInHandCard,
  ClosingStatTiles,
  ClosingStockHistogram,
  ClosingStockTable,
  SyncBanner,
} from '@/features/closing/components';
import { buildClosingSummaryText } from '@/features/closing/api/shareSummary';
import {
  buildClosingReceiptText,
  selectPrintableBalanceStock,
  type ReceiptPaper,
} from '@/features/closing/api/closingReceipt';
import { countUnsyncedForDate } from '@/features/closing/api/unsyncedForDate';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingSkeleton,
  Screen,
} from '@/shared/ui';
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

/**
 * branchApp.md screen 20 — Branch Closing: the ledger's own end-of-day
 * reconciliation for one business date, read from `GET /api/branch-closing`
 * (added alongside this screen — previously only a file export existed; see
 * `docs/mobile-api-contract.md`). The closing-stock table reuses `GET
 * /api/stock?date=` (`useStock`), already built for the Stock screen.
 *
 * Reworked to mountainbakesBranch.html "20 Branch Closing" (lines 934-994):
 * hero NET card, Cash-in-Hand/Stock-on-Hand row, payment-method dots with a
 * folded Orders/Discounts footer, a collapsible closing-stock table, and a
 * (currently data-stubbed — see `useClosingStockHistogram`) closing-stock
 * histogram.
 */
export function BranchClosingScreen() {
  const theme = useAppTheme();
  const appearanceActions = useAppearanceHeaderActions();
  const bellAction = useNotificationBellAction();
  // Design lines 959-960 — Cash/Easypaisa dot swatches; falls back to the
  // theme's own chart palette for any other method. Theme colors, not a
  // fixed hex list, so this follows mode (the accent itself never touches
  // these — see accents.ts).
  const paymentMethodDot: Record<string, string> = { cash: theme.colors.secondary, easypaisa: theme.colors.lavender };
  const dotFallback = [theme.colors.success, theme.colors.infoAlt, theme.colors.orange, theme.colors.violet];
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

  return (
    <Screen>
      <AppHeader
        title="Branch Closing"
        subtitle="End-of-day summary. This is a read of the day, not a lock on it."
        actions={[...appearanceActions, bellAction, { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={closing.isRefetching || stock.isRefetching}
            onRefresh={onRefresh}
          />
        }
      >
        <View>
          <View style={styles.actionRow}>
            {closing.data?.branchName ? (
              <Text
                style={[
                  theme.typography.label,
                  { color: theme.colors.primary, fontWeight: '700' },
                ]}
              >
                {closing.data.branchName}
              </Text>
            ) : (
              <View />
            )}
            <View style={styles.actionPills}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Export to Excel"
                disabled={isExporting}
                onPress={() => void handleExportExcel()}
                style={[
                  styles.pill,
                  {
                    backgroundColor: theme.colors.border,
                    borderRadius: theme.radii.md,
                    opacity: isExporting ? 0.6 : 1,
                  },
                ]}
              >
                <Icon
                  name="file-spreadsheet"
                  size={13}
                  color={theme.colors.text}
                />
                <Text
                  style={[
                    theme.typography.label,
                    { color: theme.colors.text, fontWeight: '700' },
                  ]}
                >
                  {isExporting ? 'Exporting…' : 'Excel'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share summary"
                onPress={handleShareSummary}
                style={[
                  styles.pill,
                  {
                    backgroundColor: theme.colors.border,
                    borderRadius: theme.radii.md,
                  },
                ]}
              >
                <Icon
                  name="arrow-up-right"
                  size={13}
                  color={theme.colors.text}
                />
                <Text
                  style={[
                    theme.typography.label,
                    { color: theme.colors.text, fontWeight: '700' },
                  ]}
                >
                  Share
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Print closing receipt"
                disabled={!totals || stock.isLoading}
                onPress={handlePrintReceipt}
                style={[
                  styles.pill,
                  {
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radii.md,
                    opacity: !totals || stock.isLoading ? 0.6 : 1,
                  },
                ]}
              >
                <Icon
                  name="printer"
                  size={13}
                  color={theme.colors.primaryText}
                />
                <Text
                  style={[
                    theme.typography.label,
                    { color: theme.colors.primaryText, fontWeight: '700' },
                  ]}
                >
                  Print
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: theme.spacing.md }}>
            <BusinessDateControl
              value={date}
              onChange={setDate}
              maxDate={today}
            />
          </View>

          <SyncBanner updatedAt={closing.dataUpdatedAt ? new Date(closing.dataUpdatedAt).toISOString() : null} unsyncedCount={unsyncedCount} isDayStillOpen={date === today} />

          {isLoading ? <LoadingSkeleton height={160} /> : null}
          {error ? (
            <ErrorState
              message={mapErrorToMessage(error)}
              onRetry={onRefresh}
            />
          ) : null}

          {totals ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <CashInHandCard cashInHand={totals.cashInHand} cashSales={totals.cashSales} cashExpenses={totals.cashExpenses} />
            </View>
          ) : null}

          {totals ? (
            <View style={{ marginTop: theme.spacing.sm }}>
              <ClosingStatTiles sales={totals.sales} expenses={totals.expenses} net={totals.net} stockOnHand={stockTotals.balance} />
            </View>
          ) : null}

          {closing.data ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <Card>
                <Text
                  style={[
                    theme.typography.label,
                    { color: theme.colors.textFaint, letterSpacing: 1.2 },
                  ]}
                >
                  TAKINGS BY PAYMENT METHOD
                </Text>
                {closing.data.paymentMethods.map((pm, i) => (
                  <View
                    key={pm.method}
                    style={[
                      styles.breakdownRow,
                      {
                        borderTopColor: theme.colors.cardBorder,
                        borderTopWidth: i === 0 ? 1 : 1,
                        marginTop: i === 0 ? 10 : 0,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            paymentMethodDot[pm.method] ??
                            dotFallback[i % dotFallback.length],
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          theme.typography.body,
                          { color: theme.colors.text, fontWeight: '700' },
                        ]}
                      >
                        {PAYMENT_METHOD_LABEL[pm.method] ?? pm.method}
                      </Text>
                      <Text
                        style={[
                          theme.typography.label,
                          { color: theme.colors.textSecondary, marginTop: 2 },
                        ]}
                      >
                        {pm.orderCount} order{pm.orderCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        theme.typography.body,
                        { color: theme.colors.text, fontWeight: '700' },
                      ]}
                    >
                      {formatCurrency(pm.amount)}
                    </Text>
                  </View>
                ))}
                {totals ? (
                  <>
                    <View
                      style={[
                        styles.labelValueRow,
                        { borderTopColor: theme.colors.cardBorder },
                      ]}
                    >
                      <Text
                        style={[
                          theme.typography.label,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Orders / cancelled
                      </Text>
                      <Text
                        style={[
                          theme.typography.label,
                          { color: theme.colors.text, fontWeight: '700' },
                        ]}
                      >
                        {totals.orderCount} / {totals.cancelled}
                      </Text>
                    </View>
                    <View style={[styles.labelValueRow, { borderTopWidth: 0 }]}>
                      <Text
                        style={[
                          theme.typography.label,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        Discounts given
                      </Text>
                      <Text
                        style={[
                          theme.typography.label,
                          { color: theme.colors.text, fontWeight: '700' },
                        ]}
                      >
                        {formatCurrency(totals.discounts)}
                      </Text>
                    </View>
                  </>
                ) : null}
              </Card>
            </View>
          ) : null}

          {closing.data && closing.data.expenseCategories.length > 0 ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <Card>
                <Text
                  style={[
                    theme.typography.label,
                    { color: theme.colors.textFaint, letterSpacing: 1.2 },
                  ]}
                >
                  SHOP EXPENSES
                </Text>
                {closing.data.expenseCategories.map((ec, i) => (
                  <View
                    key={ec.category}
                    style={[
                      styles.breakdownRow,
                      {
                        borderTopColor: theme.colors.cardBorder,
                        borderTopWidth: 1,
                        marginTop: i === 0 ? 10 : 0,
                        gap: 0,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        theme.typography.body,
                        { color: theme.colors.text, fontWeight: '700' },
                      ]}
                    >
                      {ec.category}
                    </Text>
                    <Text
                      style={[
                        theme.typography.body,
                        { color: theme.colors.text, fontWeight: '700' },
                      ]}
                    >
                      {formatCurrency(ec.amount)}
                    </Text>
                  </View>
                ))}
                {/* "Paid from the till (cash)" — the branch's own cash expenses, already fetched as
                      `totals.cashExpenses` (see ClosingTotals in src/api/types.ts). Shown once beneath the
                      category breakdown, matching the design's single sub-row (not per-category, since the
                      fetched totals aren't broken out by category × payment method). */}
                {totals ? (
                  <View
                    style={[
                      styles.labelValueRow,
                      { borderTopColor: theme.colors.cardBorder },
                    ]}
                  >
                    <Text
                      style={[
                        theme.typography.label,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Paid from the till (cash)
                    </Text>
                    <Text
                      style={[
                        theme.typography.label,
                        { color: theme.colors.text, fontWeight: '700' },
                      ]}
                    >
                      {formatCurrency(totals.cashExpenses)}
                    </Text>
                  </View>
                ) : null}
              </Card>
            </View>
          ) : null}

          <View style={{ marginTop: theme.spacing.md }}>
            <Card>
              <Text
                style={[
                  theme.typography.label,
                  { color: theme.colors.textFaint, letterSpacing: 1.2 },
                ]}
              >
                CLOSING STOCK
              </Text>
              <Text
                style={[
                  theme.typography.label,
                  { color: theme.colors.textFaint, marginTop: 2 },
                ]}
              >
                {stockTotals.sold} units sold · {stockTotals.returned} returned
                to production · {stockTotals.balance} left on the shelf
              </Text>
              <View style={{ marginTop: theme.spacing.sm }}>
                {stockRows.length > 0 ? (
                  <ClosingStockTable rows={stockRows} />
                ) : !isLoading && !error ? (
                  <EmptyState
                    title="No Stock Activity"
                    message="No products held stock on this day."
                  />
                ) : null}
              </View>
            </Card>
          </View>

          {stockRows.length > 0 ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <Card>
                <ClosingStockHistogram rows={stockRows} />
              </Card>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
