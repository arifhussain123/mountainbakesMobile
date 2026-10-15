import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { getBusinessDate, useBranchClosing, useStock } from '@/api';
import {
  BranchClosingHeroCard,
  BusinessDateControl,
  ClosingStockHistogram,
  ClosingStockTable,
} from '@/features/closing/components';
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
import { styles } from './styles';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank Account',
};

/** Design lines 959-960 — Cash/Easypaisa dot swatches; falls back to the theme's chart palette for any other method. */
const PAYMENT_METHOD_DOT: Record<string, string> = {
  cash: '#7B6CD9',
  easypaisa: '#C9BFF0',
};
const DOT_FALLBACK = ['#34C38A', '#4EA8DE', '#FF8A5C', '#9D91E8'];

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
  const today = useMemo(() => getBusinessDate(), []);
  const [date, setDate] = useState(today);

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

  const isLoading = closing.isLoading || stock.isLoading;
  const error = closing.error ?? stock.error;
  const onRefresh = () => {
    void closing.refetch();
    void stock.refetch();
  };

  const totals = closing.data?.totals;

  // TODO: no export/print pipeline exists anywhere in the app yet (checked
  // Shop Expenses and Finance Reports — both defer this the same way; see
  // FinanceReportsScreen's own "Export to PDF/Excel/CSV is deferred" note).
  // Wire these to a real export endpoint/share-sheet once one exists instead
  // of fabricating a file here.
  const handleExportExcel = () =>
    Alert.alert('Export to Excel', 'Excel export is not wired up yet.');
  const handlePrint = () =>
    Alert.alert('Print', 'Printing is not wired up yet.');

  return (
    <Screen>
      <AppHeader
        title="Branch Closing"
        subtitle="End-of-day summary. This is a read of the day, not a lock on it."
        actions={[]}
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
                onPress={handleExportExcel}
                style={[
                  styles.pill,
                  {
                    backgroundColor: theme.colors.border,
                    borderRadius: theme.radii.md,
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
                  Excel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handlePrint}
                style={[
                  styles.pill,
                  {
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radii.md,
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

          {isLoading ? <LoadingSkeleton height={160} /> : null}
          {error ? (
            <ErrorState
              message={mapErrorToMessage(error)}
              onRetry={onRefresh}
            />
          ) : null}

          {totals ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <BranchClosingHeroCard
                net={totals.net}
                sales={totals.sales}
                expenses={totals.expenses}
              />
            </View>
          ) : null}

          {totals ? (
            <View style={[styles.twoCol, { marginTop: theme.spacing.sm }]}>
              <View
                style={[
                  styles.statBox,
                  {
                    backgroundColor: theme.colors.cardFill,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.statHeader}>
                  <Text
                    style={[
                      theme.typography.label,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Cash in Hand
                  </Text>
                  <Icon
                    name="wallet"
                    size={15}
                    color={theme.colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    theme.typography.cardTitle,
                    { color: theme.colors.text, marginTop: 6, fontSize: 18 },
                  ]}
                >
                  {formatCurrency(totals.cashInHand)}
                </Text>
              </View>
              <View
                style={[
                  styles.statBox,
                  {
                    backgroundColor: theme.colors.cardFill,
                    borderColor: theme.colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.statHeader}>
                  <Text
                    style={[
                      theme.typography.label,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Stock on Hand
                  </Text>
                  <Icon
                    name="box"
                    size={15}
                    color={theme.colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    theme.typography.cardTitle,
                    { color: theme.colors.text, marginTop: 6, fontSize: 18 },
                  ]}
                >
                  {stockTotals.balance}
                </Text>
              </View>
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
                            PAYMENT_METHOD_DOT[pm.method] ??
                            DOT_FALLBACK[i % DOT_FALLBACK.length],
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
