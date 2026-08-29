import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import {
  MBCard,
  MBDateStepper,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBHeroCard,
  MBListCard,
  MBListRow,
  MBMoney,
  MBSkeletonList,
  MBStatCard,
  MBStatGrid,
  type StatTone,
} from '@/common/ui';
import { useStock } from '@/api/hooks/useCatalogApi';
import { getOrders } from '@/api/services/financeService';
import { getExpenses } from '@/api/services/expensesService';
import { qk } from '@/api/queryKeys';
import { paymentMethodLabel } from '@/common/constants/paymentMethods';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { formatBusinessDate, shiftBusinessDate } from '@/common/helpers/businessDay';
import { formatCurrency, formatQty, round2, toNumber } from '@/common/utils/money';
import { businessDateStr, businessDayBounds } from '@/shared/utils/timezone';
import { contentColumn, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

import { summariseDay } from '../helpers/daySummary';

/**
 * Branch closing — one business day's takings and spending, on one screen
 * (v6, screen 22).
 *
 * ---------------------------------------------------------------------------
 * A read, and the screen says so twice
 * ---------------------------------------------------------------------------
 * "End-of-day read · not a lock" is kept verbatim from the mock and repeated in
 * the footer, because the thing a manager will look for on a screen called
 * *closing* is a button that closes the day — and pressing one here would do
 * nothing of the sort. Locking a day is a server-side operation with its own
 * audit trail; the business-date validator is what refuses a write to a closed
 * day. Figures here move if a sale is recorded later, and that is not a defect
 * to be papered over with a button.
 *
 * ---------------------------------------------------------------------------
 * What is deliberately NOT here: the cash reconciliation
 * ---------------------------------------------------------------------------
 * v6 draws a drawer count, an expected-cash figure and a variance with a Rs. 50
 * tolerance, and that reconciliation is the reason the design has this screen at
 * all. None of it is built, and the reason is not that it was skipped: **there
 * is nowhere to put a counted figure.** No table, no column, no endpoint, in
 * this app or the server or any migration — `CashPad` is a tender pad for what a
 * customer hands over at the till, not a count of the drawer at close.
 *
 * A count that cannot be saved is worse than no count: it invites someone to do
 * the work of counting out a drawer nightly and produces nothing anybody can
 * read back, audit, or compare. So this screen shows the books, and the drawer
 * against them is a server change first — a counted-cash table storing the
 * count and its variance against a business date, plus a branch-scoped closing
 * endpoint (`buildBranchReport` exists but sits behind `requireFinance('view')`,
 * which a branch manager cannot pass).
 *
 * What IS honoured is the half of the rule that survives the gap: only `cash`
 * touches a drawer. `paymentMethod` is a closed enum, so that is a type-safe
 * check rather than a name match, and Easypaisa, Foodpanda and bank transfers
 * are already outside the cash figure below.
 *
 * ---------------------------------------------------------------------------
 * Every figure is summed here, and none is fetched
 * ---------------------------------------------------------------------------
 * `sales` is the sum of the tender rows, `expenses` the sum of the expense rows,
 * and `net` their difference. There is no server-computed total to disagree with
 * them, which is the point: a rounded figure sitting above rows that do not add
 * up to it is worse than no figure, because it is the one a manager writes down.
 *
 * The sums come from `summariseDay`, the register's own arithmetic, rather than
 * a second implementation — two screens summing one day slightly differently
 * would produce two truths about the same takings with nothing to say which was
 * wrong.
 */

/**
 * The tiles, in order, with their tone.
 *
 * The order is the reading order a close is done in — what came in, what went
 * out, what is left, and how many sales produced it — and it lives here so a
 * fifth figure is one entry rather than an edit in three places.
 *
 * `currency: false` on the count matters: `MBStatCard` formats as money by
 * default, and a sale count rendered "Rs. 14" is a figure that reads as money
 * on a screen made of money.
 */
interface ClosingKpi {
  key: string;
  label: string;
  subtitle: string;
  tone: StatTone;
  currency: boolean;
  of: (t: ClosingTotals) => number;
}

const KPIS: readonly ClosingKpi[] = [
  {
    key: 'takings',
    label: 'Takings',
    subtitle: 'All tenders, after discount',
    tone: 'success',
    currency: true,
    of: t => t.sales,
  },
  {
    key: 'expenses',
    label: 'Expenses',
    subtitle: 'Paid out of the shop',
    tone: 'warning',
    currency: true,
    of: t => t.expenses,
  },
  {
    key: 'net',
    label: 'Net',
    subtitle: 'Takings less expenses',
    tone: 'brand',
    currency: true,
    of: t => t.net,
  },
  {
    key: 'sales',
    label: 'Sales',
    subtitle: 'Cancelled ones excluded',
    tone: 'info',
    currency: false,
    of: t => t.count,
  },
];

/** The three figures the tiles and the ledgers share, summed in one place. */
interface ClosingTotals {
  sales: number;
  expenses: number;
  net: number;
  count: number;
  /** Cash only — the tender that would be counted against a drawer. */
  cashTakings: number;
  /** Cash only, for the same reason. */
  cashExpenses: number;
}

const NOT_A_LOCK = 'End-of-day read · not a lock';

export function ClosingScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();
  const { currencySymbol } = useCatalogSettings();

  const [date, setDate] = useState(() => businessDateStr());

  /**
   * The day's sales, on business-day instants rather than a bare date.
   *
   * `created_at` is compared as an instant and the day rolls at 02:00, so a bare
   * `YYYY-MM-DD` would cut two hours off both ends and drop a 01:00 sale out of
   * the night it was rung up on — the same bounds the register uses, for the
   * same reason.
   */
  const bounds = useMemo(() => businessDayBounds(date), [date]);
  const orderFilters = useMemo(
    () => ({ from: bounds.fromISO, to: bounds.toISO }),
    [bounds.fromISO, bounds.toISO],
  );

  const orders = useQuery({
    queryKey: qk.orders.list(orderFilters),
    queryFn: () => getOrders(orderFilters),
    placeholderData: previous => previous,
  });

  /**
   * The day's expenses, on a bare date and correctly so: `expenses.date` is a
   * Postgres `date` column already stamped with the business day, not an
   * instant needing the 02:00 window applied to it.
   */
  const expenseFilters = useMemo(() => ({ from: date, to: date }), [date]);
  const expenses = useQuery({
    queryKey: qk.expenses.list(expenseFilters),
    queryFn: () => getExpenses(expenseFilters),
    placeholderData: previous => previous,
  });

  /** Stock is current, not per-day, so the band only carries it for today. */
  const stock = useStock();
  const showsStock = date === businessDateStr();

  const day = useMemo(() => summariseDay(orders.data ?? []), [orders.data]);
  const expenseRows = useMemo(() => expenses.data ?? [], [expenses.data]);

  /**
   * Everything, from the two ledgers and nothing else.
   *
   * `round2` closes each sum the way `summariseDay` does — the drift is
   * invisible once formatted, but it is what an accessibility label reads out
   * and what any later comparison sees.
   */
  const totals = useMemo<ClosingTotals>(() => {
    const expenseTotal = expenseRows.reduce((sum, e) => sum + toNumber(e.amount), 0);
    const cashExpenses = expenseRows
      .filter(e => e.paymentMethod === 'cash')
      .reduce((sum, e) => sum + toNumber(e.amount), 0);
    // `method` is a closed enum, so this is a type-safe test of the tender
    // rather than a match on a label somebody may re-word.
    const cashTakings = day.payments
      .filter(p => p.method === 'cash')
      .reduce((sum, p) => sum + p.total, 0);

    return {
      sales: round2(day.total),
      expenses: round2(expenseTotal),
      net: round2(day.total - expenseTotal),
      count: day.count,
      cashTakings: round2(cashTakings),
      cashExpenses: round2(cashExpenses),
    };
  }, [day, expenseRows]);

  const stockOnHand = useMemo(
    () => round2((stock.data?.rows ?? []).reduce((sum, r) => sum + toNumber(r.balance), 0)),
    [stock.data],
  );

  const isPending = orders.isPending || expenses.isPending;
  /**
   * Failed and empty are different screens.
   *
   * Only a failure of BOTH reads is an error state — one ledger answering while
   * the other does not still says something true about the day, and replacing it
   * with a retry would hide takings that loaded perfectly well.
   */
  const isError = orders.isError && expenses.isError;
  const tradedNothing = !isPending && !isError && day.count === 0 && expenseRows.length === 0;

  const refreshing = (orders.isFetching || expenses.isFetching) && !isPending;
  const refetch = (): void => {
    // Both, and neither allowed to reject into an unhandled rejection: a pull to
    // refresh with no signal is the ordinary case, not an error worth a red box.
    orders.refetch().catch(() => undefined);
    expenses.refetch().catch(() => undefined);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Branch closing"
        subtitle={NOT_A_LOCK}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        testID="closing-scroll">
        <MBDateStepper
          value={date}
          onChange={setDate}
          /* The server bounds a queued transaction at seven business days, so
             beyond that there is nothing left to reconcile — only a report to
             read, which is Reports' job. */
          minDate={shiftBusinessDate(businessDateStr(), -6)}
          testID="closing-date"
        />

        {isPending ? (
          <MBSkeletonList rows={6} />
        ) : isError ? (
          <MBErrorState
            error={orders.error ?? expenses.error}
            onRetry={refetch}
            retrying={refreshing}
          />
        ) : tradedNothing ? (
          /* A quiet day is not a broken one. This is reachable only when both
             reads succeeded and both came back empty. */
          <MBEmptyState
            icon="reports"
            title="No trading on this day"
            message={`Nothing was sold and nothing was spent on ${formatBusinessDate(date)}.`}
          />
        ) : (
          <>
            <MBStatGrid>
              {KPIS.map(kpi => (
                <MBStatCard
                  key={kpi.key}
                  label={kpi.label}
                  value={kpi.of(totals)}
                  subtitle={kpi.subtitle}
                  tone={kpi.tone}
                  currency={kpi.currency}
                  currencySymbol={currencySymbol}
                  testID={`closing-kpi-${kpi.key}`}
                />
              ))}
            </MBStatGrid>

            {/* The plum band. Stock is a CURRENT balance rather than a figure
                per business date, so it is only true of today — on a back-dated
                close the band would pair tonight's shelf with an old day's
                takings and imply they belong together. */}
            {showsStock ? (
              <MBHeroCard
                caption={`Shop · ${formatBusinessDate(date)}`}
                value={stockOnHand}
                currency={false}
                stats={[
                  { label: 'Sales', value: formatQty(totals.count) },
                  { label: 'Units sold', value: formatQty(day.units) },
                  { label: 'Products', value: formatQty(day.products.length) },
                ]}
                testID="closing-band"
              />
            ) : null}

            {/* Takings by payment method. Fixed four-wide order, and a tender
                that took nothing keeps its row — the absence is information at
                a close, not a row to drop. */}
            <Ledger
              title="Takings by payment method"
              total={totals.sales}
              currencySymbol={currencySymbol}
              testID="closing-takings">
              {day.payments.map(row => (
                <MBListRow
                  key={row.method}
                  title={paymentMethodLabel(row.method)}
                  subtitle={
                    row.count === 0
                      ? 'Nothing taken'
                      : `${row.count} ${row.count === 1 ? 'sale' : 'sales'}`
                  }
                  initials={paymentMethodLabel(row.method).slice(0, 2).toUpperCase()}
                  value={<MBMoney size="sm" value={row.total} symbol={currencySymbol} />}
                  testID={`closing-tender-${row.method}`}
                />
              ))}
            </Ledger>

            <Ledger
              title="Shop expenses"
              total={totals.expenses}
              currencySymbol={currencySymbol}
              testID="closing-expenses">
              {expenseRows.length === 0 ? (
                <MBListRow
                  title="No expenses"
                  subtitle="Nothing was paid out of the shop"
                  value=""
                  testID="closing-expense-none"
                />
              ) : (
                expenseRows.map(expense => (
                  <MBListRow
                    key={expense.id}
                    title={expense.description || expense.category}
                    subtitle={`${expense.category} · ${paymentMethodLabel(expense.paymentMethod)}`}
                    value={<MBMoney size="sm" value={expense.amount} symbol={currencySymbol} />}
                    testID={`closing-expense-${expense.id}`}
                  />
                ))
              )}
            </Ledger>

            {/*
              The cash position, stated as far as the books go and no further.

              This is NOT a reconciliation and must not read as one: it is what
              the drawer *should* hold, with nothing to compare it against, and
              it says so. Drawing a variance of zero here would assert that the
              drawer was counted and balanced when nobody counted anything.
            */}
            <MBCard testID="closing-cash">
              <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
                CASH POSITION
              </Text>
              <View style={styles.cashRow}>
                <Text style={[theme.type.body, { color: theme.colors.text }]}>
                  Expected in the drawer
                </Text>
                <MBMoney
                  size="sm"
                  value={round2(totals.cashTakings - totals.cashExpenses)}
                  symbol={currencySymbol}
                />
              </View>
              <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                {`Cash takings ${formatCurrency(totals.cashTakings, currencySymbol)} less cash expenses ${formatCurrency(totals.cashExpenses, currencySymbol)}. Card, Easypaisa, Foodpanda and bank transfers never reach the drawer.`}
              </Text>
              <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                Counting the drawer against this figure is not yet recorded anywhere,
                so it is not offered here.
              </Text>
            </MBCard>

            {/* The mock's note, repeated where the reading ends. */}
            <Text
              style={[theme.type.caption, styles.footer, { color: theme.colors.textMuted }]}
              testID="closing-footer-note">
              {`${NOT_A_LOCK} — these figures move if a sale is recorded later.`}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * A titled ledger with its own footer total — the same card for both lists,
 * because they answer the same shape of question and a manager reading two
 * differently-built lists has to learn each one.
 */
function Ledger({
  title,
  total,
  currencySymbol,
  children,
  testID,
}: {
  title: string;
  total: number;
  currencySymbol?: string;
  children: React.ReactNode;
  testID?: string;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space.sm }} testID={testID}>
      <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>{title}</Text>
      <MBListCard>{children}</MBListCard>
      <View
        style={[
          styles.total,
          {
            backgroundColor: theme.colors.primarySoft,
            borderRadius: theme.radius.lg,
            padding: theme.layout.cardPad,
          },
        ]}>
        <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>TOTAL</Text>
        <MBMoney size="sm" value={total} symbol={currencySymbol} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  footer: { textAlign: 'center' },
});
