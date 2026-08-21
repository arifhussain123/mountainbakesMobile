import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import {
  MBCard,
  MBColumnChart,
  MBEmptyState,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBHeroCard,
  MBListCard,
  MBListRow,
  MBMoney,
  MBSectionHeader,
  MBSkeletonList,
  MBStatCard,
  MBStatGrid,
  type ColumnGroup,
} from '@/components';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { getExpenses } from '@/services/api/expensesApi';
import { getReportSummary } from '@/services/api/reportsApi';
import { qk } from '@/services/query/queryKeys';
import type { DailySalesData } from '@/shared/types/report.types';
import { businessDateStr, businessDaysAgoStr } from '@/shared/utils/timezone';
import { useTheme } from '@/theme/ThemeProvider';
import { resolveRange } from '@/utils/dashboardRange';
import { formatAmount, toNumber } from '@/utils/money';
import { contentColumn, space } from '@/theme/spacing';

/**
 * Money in against money out, over a period.
 *
 * ---------------------------------------------------------------------------
 * Two sources, and neither is a subset of the other
 * ---------------------------------------------------------------------------
 * The totals, the daily series and the profit all come from
 * `GET /api/reports/summary`, which is the authority: it is where `totalProfit`
 * is *defined*, and recomputing it here from two other numbers would produce a
 * second definition that drifts the moment the server's changes.
 *
 * The **category split** does not exist in that response. `categoryBreakdown`
 * there is sales by *product* category — what was sold — and using it under a
 * heading about spending would be a wrong number that reads exactly like a right
 * one. So the split comes from `GET /api/expenses` for the same range and is
 * grouped here.
 *
 * That second read returns rows rather than aggregates, which is why the range
 * chips stop at a quarter. A year of expense rows is the one request on this
 * screen big enough to matter, and no endpoint in this API paginates.
 *
 * ---------------------------------------------------------------------------
 * Weeks are buckets of days, and a partial week is labelled
 * ---------------------------------------------------------------------------
 * There is no weekly series in the response — `dailyData` is per business day —
 * so the columns are folded here, seven days at a time counting back from the
 * most recent. The final bucket is usually short, and the axis says `W…` with
 * its day count rather than pretending it is a full week beside three that are.
 */

const RANGES = [
  { key: 'week', label: 'Week', accessibilityLabel: 'The last 7 business days' },
  { key: 'month', label: 'Month', accessibilityLabel: 'The last 30 business days' },
  { key: 'quarter', label: 'Quarter', accessibilityLabel: 'The last 90 business days' },
] as const;

const RANGE_DAYS: Record<string, number> = { week: 7, month: 30, quarter: 90 };

const DAYS_PER_BUCKET = 7;

export function SalesVsExpensesScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();
  const { currencySymbol } = useCatalogSettings();

  const [rangeKey, setRangeKey] = useState<string>('month');
  const days = RANGE_DAYS[rangeKey] ?? 30;

  const dates = useMemo(
    () => ({ from: businessDaysAgoStr(days - 1), to: businessDateStr() }),
    [days],
  );
  const scope = useMemo(() => resolveRange('custom', dates), [dates]);

  const summary = useQuery({
    queryKey: qk.reports.summary(scope),
    queryFn: () => getReportSummary(scope),
    placeholderData: previous => previous,
  });

  /**
   * Expense rows for the same window.
   *
   * Business **dates**, not the ISO instants the summary takes: `/api/expenses`
   * filters on the `date` column, which already holds the business date the
   * device captured at write time. Sending an instant there would compare a
   * timestamp against a date and quietly lose the edges of the range.
   */
  const expenses = useQuery({
    queryKey: qk.expenses.list({ from: dates.from, to: dates.to }),
    queryFn: () => getExpenses({ from: dates.from, to: dates.to }),
    placeholderData: previous => previous,
  });

  const data = summary.data;
  const revenue = toNumber(data?.totalRevenue);
  const spend = toNumber(data?.totalExpenses);
  const profit = toNumber(data?.totalProfit);

  const buckets = useMemo<ColumnGroup[]>(
    () => byWeek(data?.dailyData ?? []),
    [data?.dailyData],
  );

  const categories = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of expenses.data ?? []) {
      const key = row.category || 'Uncategorised';
      totals.set(key, (totals.get(key) ?? 0) + toNumber(row.amount));
    }
    const rows = [...totals.entries()].map(([category, amount]) => ({ category, amount }));
    rows.sort((a, b) => b.amount - a.amount);
    const sum = rows.reduce((t, r) => t + r.amount, 0);
    return { rows, sum };
  }, [expenses.data]);

  /**
   * The margin, or nothing.
   *
   * A percentage of zero revenue is not zero per cent — it is undefined — and
   * printing "0.0%" on a day with no sales is a figure someone will screenshot.
   */
  const margin = revenue > 0 ? (profit / revenue) * 100 : null;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Sales vs expenses"
        subtitle={data ? `${data.from} → ${data.to}` : undefined}
        onBack={() => navigation.goBack()}
      />

      <View style={{ padding: theme.layout.screenPad }}>
        <MBFilterChips
          options={RANGES}
          selectedKey={rangeKey}
          onSelect={setRangeKey}
          testIDPrefix="sve-range"
        />
      </View>

      {summary.isPending ? (
        <MBSkeletonList rows={5} />
      ) : summary.isError ? (
        <MBErrorState
          error={summary.error}
          onRetry={() => summary.refetch()}
          retrying={summary.isFetching}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            contentColumn,
            { padding: theme.layout.screenPad, gap: theme.space.md },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={summary.isFetching && !summary.isPending}
              onRefresh={() => {
                summary.refetch();
                expenses.refetch();
              }}
              tintColor={theme.colors.primary}
            />
          }>
          <MBStatGrid>
            <MBStatCard
              label="Sales"
              value={revenue}
              currencySymbol={currencySymbol}
              icon="sales"
              tone="success"
            />
            <MBStatCard
              label="Expenses"
              value={spend}
              currencySymbol={currencySymbol}
              icon="expenses"
              tone="danger"
            />
          </MBStatGrid>

          <MBSectionHeader title="By week" subtitle={`${days} business days`} />
          <MBCard>
            <MBColumnChart
              series={['Sales', 'Expenses']}
              groups={buckets}
              accessibilityLabel={weekSummary(buckets, currencySymbol)}
              testID="sve-weeks"
            />
          </MBCard>

          <MBHeroCard
            caption={`Net over ${days} business days`}
            value={profit}
            currencySymbol={currencySymbol}
            {...(margin === null ? {} : { highlight: `Margin ${margin.toFixed(1)}%` })}
            testID="sve-net"
          />

          <MBSectionHeader title="Where it went" subtitle="Expenses by category" />
          {expenses.isPending ? (
            <MBSkeletonList rows={4} />
          ) : expenses.isError ? (
            /* The category card failing does not fail the screen: everything
               above came from a different request and is still true. */
            <MBCard>
              <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                Could not load the expense breakdown. The totals above are unaffected.
              </Text>
            </MBCard>
          ) : categories.rows.length === 0 ? (
            <MBEmptyState
              title="No expenses logged"
              message="Nothing was recorded against this branch in the selected window."
              icon="expenses"
            />
          ) : (
            <MBListCard testID="sve-categories">
              {categories.rows.map(row => (
                <MBListRow
                  key={row.category}
                  title={row.category}
                  subtitle={
                    categories.sum > 0
                      ? `${Math.round((row.amount / categories.sum) * 100)}% of spend`
                      : undefined
                  }
                  value={<MBMoney value={row.amount} size="sm" symbol={currencySymbol} />}
                />
              ))}
            </MBListCard>
          )}

          {/* The two totals come from different places and can legitimately
              disagree by a rounding step; saying which is which is cheaper than
              someone reconciling them by hand and concluding the app is wrong. */}
          {Math.abs(categories.sum - spend) > 1 ? (
            <Text style={[theme.type.caption, styles.note, { color: theme.colors.textMuted }]}>
              The category rows total {formatAmount(categories.sum)} against the period&apos;s{' '}
              {formatAmount(spend)}. The header figure is the server&apos;s; these rows are the
              expense records this branch can read.
            </Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Daily rows → weekly columns, newest week last.
 *
 * Counted back from the most recent day so the *current* week is whole and the
 * oldest bucket takes the remainder — the opposite convention would leave the
 * week being lived in looking like a collapse.
 */
function byWeek(daily: readonly DailySalesData[]): ColumnGroup[] {
  if (daily.length === 0) return [];

  const ordered = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const groups: ColumnGroup[] = [];

  for (let end = ordered.length; end > 0; end -= DAYS_PER_BUCKET) {
    const start = Math.max(0, end - DAYS_PER_BUCKET);
    const slice = ordered.slice(start, end);
    const sales = slice.reduce((sum, d) => sum + toNumber(d.totalRevenue), 0);
    const spend = slice.reduce((sum, d) => sum + toNumber(d.expenses ?? 0), 0);
    groups.unshift({
      // A short bucket says how short. Four columns where one silently covers
      // three days invites reading a drop that is a calendar artefact.
      label: slice.length === DAYS_PER_BUCKET ? shortLabel(slice) : `${slice.length}d`,
      values: [sales, spend],
      emphasis: end === ordered.length,
    });
  }

  return groups;
}

/** `12–18` — the day-of-month span the bucket covers. */
function shortLabel(slice: readonly DailySalesData[]): string {
  const first = slice[0]?.date.slice(8) ?? '';
  const last = slice[slice.length - 1]?.date.slice(8) ?? '';
  return `${Number(first)}–${Number(last)}`;
}

function weekSummary(groups: readonly ColumnGroup[], symbol?: string): string {
  if (groups.length === 0) return 'No daily figures in this period.';
  const last = groups[groups.length - 1]!;
  const [sales = 0, spend = 0] = last.values;
  return (
    `Sales against expenses over ${groups.length} weekly buckets. ` +
    `The most recent took ${symbol ?? 'Rs.'} ${formatAmount(sales)} ` +
    `and spent ${symbol ?? 'Rs.'} ${formatAmount(spend)}.`
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  note: { paddingHorizontal: space.xs },
});
