import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { addDays, format, parseISO } from 'date-fns';
import { getBusinessDate, useBranchClosing, useStock } from '@/api';
import { StockRow } from '@/features/stock/components';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, Icon, LoadingSkeleton, Screen } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { styles } from './styles';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank Account',
};

function shiftDate(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd');
}

/**
 * branchApp.md screen 20 — Branch Closing: the ledger's own end-of-day
 * reconciliation for one business date, read from `GET /api/branch-closing`
 * (added alongside this screen — previously only a file export existed; see
 * `docs/mobile-api-contract.md`). The closing-stock table reuses `GET
 * /api/stock?date=` (`useStock`), already built for the Stock screen.
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
        (acc, row) => ({ sold: acc.sold + row.sold, returned: acc.returned + row.returned, balance: acc.balance + row.balance }),
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

  return (
    <Screen>
      <AppHeader title="Branch Closing" subtitle={closing.data?.branchName ?? 'A read of the day, not a lock on it'} actions={[]} />
      <FlatList
        data={stockRows}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            <View style={[styles.dateRow, { backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous day"
                onPress={() => setDate((d) => shiftDate(d, -1))}
                style={[styles.dateButton, { borderColor: theme.colors.cardBorder }]}>
                <View style={{ transform: [{ rotate: '90deg' }] }}>
                  <Icon name="chevron-down" size={14} color={theme.colors.text} />
                </View>
              </Pressable>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatDisplayDate(date)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next day"
                onPress={() => setDate((d) => (d < today ? shiftDate(d, 1) : d))}
                disabled={date >= today}
                style={[styles.dateButton, { borderColor: theme.colors.cardBorder, opacity: date >= today ? 0.4 : 1 }]}>
                <View style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Icon name="chevron-down" size={14} color={theme.colors.text} />
                </View>
              </Pressable>
            </View>

            {isLoading ? <LoadingSkeleton height={160} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={onRefresh} /> : null}

            {totals ? (
              <View style={[styles.totalsGrid, { marginTop: theme.spacing.md }]}>
                <View style={[styles.statBox, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>NET</Text>
                  <Text
                    style={[
                      theme.typography.body,
                      { color: totals.net >= 0 ? theme.colors.success : theme.colors.danger, marginTop: 3, fontWeight: '700' },
                    ]}>
                    {formatCurrency(totals.net)}
                  </Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>SALES</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 3, fontWeight: '700' }]}>
                    {formatCurrency(totals.sales)}
                  </Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>EXPENSES</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 3, fontWeight: '700' }]}>
                    {formatCurrency(totals.expenses)}
                  </Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>CASH IN HAND</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 3, fontWeight: '700' }]}>
                    {formatCurrency(totals.cashInHand)}
                  </Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>ORDERS</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 3, fontWeight: '700' }]}>
                    {totals.orderCount} <Text style={{ color: theme.colors.danger }}>({totals.cancelled} cancelled)</Text>
                  </Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>DISCOUNTS GIVEN</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 3, fontWeight: '700' }]}>
                    {formatCurrency(totals.discounts)}
                  </Text>
                </View>
              </View>
            ) : null}

            {closing.data && closing.data.paymentMethods.length > 0 ? (
              <View style={{ marginTop: theme.spacing.lg }}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>TAKINGS BY PAYMENT METHOD</Text>
                <Card style={{ marginTop: 8 }}>
                  {closing.data.paymentMethods.map((pm, i) => (
                    <View
                      key={pm.method}
                      style={[
                        styles.breakdownRow,
                        { borderBottomColor: theme.colors.cardBorder, borderBottomWidth: i === closing.data!.paymentMethods.length - 1 ? 0 : 1 },
                      ]}>
                      <View>
                        <Text style={[theme.typography.body, { color: theme.colors.text }]}>{PAYMENT_METHOD_LABEL[pm.method] ?? pm.method}</Text>
                        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                          {pm.orderCount} order{pm.orderCount === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(pm.amount)}</Text>
                    </View>
                  ))}
                </Card>
              </View>
            ) : null}

            {closing.data && closing.data.expenseCategories.length > 0 ? (
              <View style={{ marginTop: theme.spacing.lg }}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>SHOP EXPENSES</Text>
                <Card style={{ marginTop: 8 }}>
                  {closing.data.expenseCategories.map((ec, i) => (
                    <View
                      key={ec.category}
                      style={[
                        styles.breakdownRow,
                        { borderBottomColor: theme.colors.cardBorder, borderBottomWidth: i === closing.data!.expenseCategories.length - 1 ? 0 : 1 },
                      ]}>
                      <Text style={[theme.typography.body, { color: theme.colors.text }]}>{ec.category}</Text>
                      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(ec.amount)}</Text>
                    </View>
                  ))}
                </Card>
              </View>
            ) : null}

            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>
              CLOSING STOCK — {stockTotals.sold} sold · {stockTotals.returned} returned to production · {stockTotals.balance} left on the shelf
            </Text>
          </View>
        }
        ListEmptyComponent={
          !isLoading && !error ? <EmptyState title="No Stock Activity" message="No products held stock on this day." /> : undefined
        }
        renderItem={({ item }) => <StockRow row={item} />}
        refreshing={closing.isRefetching || stock.isRefetching}
        onRefresh={onRefresh}
      />
    </Screen>
  );
}
