import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  MBButton,
  MBCard,
  MBColumnChart,
  MBEmptyState,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBListCard,
  MBListRow,
  MBMoney,
  MBSectionHeader,
  MBSkeletonList,
} from '@/common/ui';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { useExportReport, type ExportScope } from '@/common/hooks/useExportReport';
import { useNetworkStore } from '@/state/networkStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { formatAmount, formatCurrency, toNumber } from '@/common/utils/money';
import { contentColumn, space } from '@/common/theme/spacing';
import { businessDayBounds } from '@/shared/utils/timezone';

import { NetCard, SeriesCards } from '../components';
import { useComparison } from '../hooks';
import { describePeriod, type ComparisonRangeKey } from '../comparisonPeriods';

/**
 * Money in against money out, over a calendar period. v6, screen 17.
 *
 * The screen is composition and states. Every figure comes from
 * `useComparison`, and the calendar underneath it from `comparisonPeriods.ts` —
 * which is where the two things worth testing live: what a bucket covers, and
 * what the previous period is bounded to.
 *
 * ---------------------------------------------------------------------------
 * Calendar periods, and buckets that have not happened
 * ---------------------------------------------------------------------------
 * Week is Monday to Sunday, Month is the calendar month by week, Quarter is
 * three months. A period you are inside therefore has buckets still to come —
 * December in a quarter you are three weeks into — and those are **not zeros**.
 * They draw as a hairline pair with a dimmed label and are excluded from every
 * total and average, because counting them makes an ordinary quarter read as a
 * collapse in trade.
 *
 * The comparison is truncated to match: five days of November against the first
 * five days of October, never against the whole of it. Untruncated, this screen
 * would report a 70% collapse on the 8th of every month, on the one screen a
 * manager opens to find out whether something is wrong.
 *
 * ---------------------------------------------------------------------------
 * Two sources, and neither is a subset of the other
 * ---------------------------------------------------------------------------
 * The series and the totals come from `GET /api/reports/summary`, which
 * populates `dailyData[].expenses` for exactly this chart. The **category
 * split** does not exist in that response — `categoryBreakdown` there is sales
 * by *product* category, what was sold, and using it under a heading about
 * spending would be a wrong number that reads exactly like a right one. So the
 * split comes from `GET /api/expenses` for the same range and is grouped here.
 *
 * That second read returns rows rather than aggregates, which is why the ranges
 * stop at a quarter: a year of expense rows is the one request on this screen
 * big enough to matter, and no endpoint in this API paginates.
 */

const RANGES = [
  { key: 'week', label: 'Week', accessibilityLabel: 'This week, Monday to Sunday' },
  { key: 'month', label: 'Month', accessibilityLabel: 'This calendar month, by week' },
  { key: 'quarter', label: 'Quarter', accessibilityLabel: 'This quarter, by month' },
] as const;

export function SalesVsExpensesScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();
  const { currencySymbol } = useCatalogSettings();
  const isOnline = useNetworkStore(s => s.isOnline);
  const { exportReport, isExporting, error: exportError } = useExportReport();

  const comparison = useComparison('month');
  const { period, totals, expenses } = comparison;
  const wording = useMemo(() => describePeriod(period), [period]);

  /**
   * What the export covers, which must be what is on screen.
   *
   * Week and Month map onto the server's own named periods — `businessRange` is
   * calendar-aligned in exactly the same way, so the file is named `weekly` or
   * `monthly` and a person can tell three downloads apart. A quarter has no
   * named period, so it goes as a custom span and is named for the dates it
   * covers. Sending `period` alone for that would export the current *month*
   * under a file called `custom` while the screen showed a quarter.
   */
  const scope = useMemo<Omit<ExportScope, 'type'>>(() => {
    if (period.key === 'week') return { period: 'weekly' };
    if (period.key === 'month') return { period: 'monthly' };
    return {
      period: 'custom',
      from: businessDayBounds(period.from).fromISO,
      to: businessDayBounds(period.to).toISO,
    };
  }, [period.from, period.key, period.to]);

  const categories = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const row of expenses.data ?? []) {
      const key = row.category || 'Uncategorised';
      byCategory.set(key, (byCategory.get(key) ?? 0) + toNumber(row.amount));
    }
    const rows = [...byCategory.entries()].map(([category, amount]) => ({ category, amount }));
    rows.sort((a, b) => b.amount - a.amount);
    return { rows, sum: rows.reduce((t, r) => t + r.amount, 0) };
  }, [expenses.data]);

  /**
   * The bucketed totals against the server's own headline figures.
   *
   * `dailyData` groups on each order's stored `business_date` while the query
   * bounds `created_at`, so an order written either side of the 02:00 rollover
   * can land a day outside the window. The bucketed figure is what the bars are
   * drawn from and is therefore what the cards show; when the two disagree by
   * more than a rupee the screen says so rather than leaving someone to
   * reconcile them by hand and conclude the app is wrong.
   */
  const drift = useMemo(() => {
    const server = comparison.serverTotals;
    if (!server) return null;
    const salesGap = Math.abs(server.sales - totals.sales);
    const spendGap = Math.abs(server.expenses - totals.expenses);
    return salesGap > 1 || spendGap > 1 ? server : null;
  }, [comparison.serverTotals, totals.expenses, totals.sales]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Sales vs expenses"
        subtitle={wording.title}
        onBack={() => navigation.goBack()}
      />

      <View style={{ padding: theme.layout.screenPad }}>
        <MBFilterChips
          options={RANGES}
          selectedKey={comparison.rangeKey}
          onSelect={key => comparison.setRangeKey(key as ComparisonRangeKey)}
          testIDPrefix="sve-range"
        />
      </View>

      {comparison.isPending ? (
        <MBSkeletonList rows={5} />
      ) : comparison.isError ? (
        <MBErrorState
          error={comparison.error}
          onRetry={comparison.refetch}
          retrying={comparison.isFetching}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            contentColumn,
            { padding: theme.layout.screenPad, gap: theme.space.md },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={comparison.isFetching && !comparison.isPending}
              onRefresh={comparison.refetch}
              tintColor={theme.colors.primary}
            />
          }>
          {comparison.isEmpty ? (
            /*
              A real state, not zeroed cards. A margin of nothing is undefined
              rather than 0%, an expense ratio of nothing is not "Rs. 0.00
              spent per rupee", and a chart of flat stubs looks exactly like a
              chart of a terrible month. Saying it plainly is the only reading
              that cannot be misread.
            */
            <MBEmptyState
              title={`Nothing recorded in ${wording.title.toLowerCase()}`}
              message="No sales and no expenses have been logged in this period yet."
              icon="reports"
            />
          ) : (
            <>
              <SeriesCards
                sales={totals.sales}
                expenses={totals.expenses}
                change={comparison.change}
                comparisonLabel={wording.comparisonLabel}
                {...(currencySymbol ? { currencySymbol } : {})}
              />

              <MBCard>
                {/* No legend of its own: the two cards above carry the swatches,
                    read from the same `colors.series` this fills its columns
                    with, so a second key would be a second thing to keep true. */}
                <MBColumnChart
                  series={['Sales', 'Expenses']}
                  groups={comparison.groups}
                  accessibilityLabel={chartSummary(comparison, wording.bucketNoun, currencySymbol)}
                  formatValue={v => formatCurrency(v, currencySymbol)}
                  testID="sve-chart"
                />
              </MBCard>

              <NetCard
                totals={totals}
                previousMargin={comparison.previous?.margin ?? null}
                average={comparison.averages}
                bucketNoun={wording.bucketNoun}
                lossBuckets={comparison.lossBuckets}
                periodLabel={wording.title}
                {...(currencySymbol ? { currencySymbol } : {})}
              />

              {drift ? (
                <Text style={[theme.type.caption, styles.note, { color: theme.colors.textMuted }]}>
                  The buckets total {formatAmount(totals.sales)} in and{' '}
                  {formatAmount(totals.expenses)} out, against the server&apos;s{' '}
                  {formatAmount(drift.sales)} and {formatAmount(drift.expenses)}. The cards
                  match the bars; an order written either side of the 2 AM rollover can fall
                  a day outside the window.
                </Text>
              ) : null}
            </>
          )}

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

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Export</Text>
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              Generated by the server and shared from this device. The file covers{' '}
              {wording.title.toLowerCase()}.
            </Text>
            {/*
              `lg` (56), not the `sm` the Reports index uses. These are the only
              actions on a screen that is otherwise read rather than operated,
              and 56 is the one button height in this app that clears
              `layout.tapMin`.
            */}
            <View style={styles.exportRow}>
              <MBButton
                label="Excel"
                onPress={() => exportReport({ type: 'excel', ...scope })}
                loading={isExporting}
                disabled={!isOnline}
                variant="secondary"
                style={styles.grow}
                testID="sve-export-excel"
              />
              <MBButton
                label="PDF"
                onPress={() => exportReport({ type: 'pdf', ...scope })}
                loading={isExporting}
                disabled={!isOnline}
                variant="secondary"
                style={styles.grow}
                testID="sve-export-pdf"
              />
              <MBButton
                label="CSV"
                onPress={() => exportReport({ type: 'csv', ...scope })}
                loading={isExporting}
                disabled={!isOnline}
                variant="secondary"
                style={styles.grow}
                testID="sve-export-csv"
              />
            </View>
            {!isOnline ? (
              <Text style={[theme.type.caption, { color: theme.colors.offline }]}>
                Offline — the file is built on the server, so an export needs a connection.
              </Text>
            ) : null}
            {exportError ? (
              <Text
                accessibilityRole="alert"
                style={[theme.type.caption, { color: theme.colors.danger }]}>
                {exportError}
              </Text>
            ) : null}
          </MBCard>
        </ScrollView>
      )}
    </View>
  );
}

/**
 * The chart in a sentence.
 *
 * Ten columns read out one at a time is noise; the shape they make is the
 * content. It names the future buckets explicitly, because "nothing there" and
 * "not yet" are the distinction the hairline is drawing and a reader who cannot
 * see it gets no other clue.
 */
function chartSummary(
  comparison: ReturnType<typeof useComparison>,
  bucketNoun: string,
  symbol?: string,
): string {
  const drawn = comparison.groups.filter(g => !g.future);
  const pending = comparison.groups.length - drawn.length;
  const money = (v: number) => formatCurrency(v, symbol);

  const head =
    `Sales against expenses over ${drawn.length} ${bucketNoun}${drawn.length === 1 ? '' : 's'}. ` +
    `${money(comparison.totals.sales)} taken, ${money(comparison.totals.expenses)} spent.`;

  if (pending === 0) return head;
  return `${head} ${pending} ${bucketNoun}${pending === 1 ? '' : 's'} still to come, not counted.`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  note: { paddingHorizontal: space.xs },
  exportRow: { flexDirection: 'row', gap: space.sm },
  grow: { flex: 1 },
});
