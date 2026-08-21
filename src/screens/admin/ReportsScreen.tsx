import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import {
  MBAccountButton,
  MBButton,
  MBCard,
  MBDataRow,
  MBEmptyState,
  MBErrorState,
  MBFilterChips,
  MBHeader,
  MBHeroCard,
  MBListCard,
  MBListRow,
  MBMoney,
  MBRangeFilter,
  MBShareList,
  MBSectionHeader,
  MBSkeletonList,
  MBSyncStatus,
  MBTrendChart,
  type FilterChip,
  type ShareItem,
} from '@/components';
import { useBranches } from '@/hooks/useCatalog';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { useExportReport } from '@/hooks/useExportReport';
import { getReportSummary } from '@/services/api/reportsApi';
import type { ReportSummary } from '@/shared/types/report.types';
import { businessDateStr, businessDaysAgoStr } from '@/shared/utils/timezone';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatAmount, formatCurrency, formatQty, toNumber } from '@/utils/money';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import {
  resolveRange,
  type CustomDates,
  type DashboardRangeKey,
} from '@/utils/dashboardRange';
import { contentColumnWide, space } from '@/theme/spacing';
import { qk } from '@/services/query/queryKeys';

/**
 * Reports.
 *
 * ---------------------------------------------------------------------------
 * Two filters, and they are different kinds of thing
 * ---------------------------------------------------------------------------
 * **When** (the range chips) and **where** (the branch chips) are sent to the
 * server: they change the question, and a new answer has to be fetched. **What
 * to break the answer down by** — branch, product, payment, category — is not
 * sent anywhere. The server returns all four rollups in the one summary
 * response, so switching between them is a render, not a request.
 *
 * Keeping that distinction visible in the layout is the point: the two rows at
 * the top cost a round trip, the row above the breakdown costs nothing. Drawn as
 * one undifferentiated wall of chips, every tap looks equally expensive and the
 * ones that are actually free stop being used.
 *
 * ---------------------------------------------------------------------------
 * Nothing here loads a large dataset, and that is arranged rather than lucky
 * ---------------------------------------------------------------------------
 * - The summary endpoint returns **aggregates**, never orders. Its payload is a
 *   handful of totals plus one row per day, per branch, per payment method and
 *   per category, with products capped at ten. A month of sales and a day of
 *   sales differ by a few kilobytes.
 * - **One breakdown is mounted at a time.** All four arrive together, but four
 *   bar lists stacked in a `ScrollView` mount every row of all four before the
 *   first is on screen.
 * - The daily rows are **capped, and the cap is stated** — see `DAILY_ROWS`. A
 *   silent `.slice(-14)` on a custom quarter is a screen that looks complete and
 *   is not.
 * - There is no **Year** chip. The summary route pulls every order in range with
 *   its line items into the dyno and aggregates in Node; a year is the one range
 *   on this screen big enough to matter, and Custom covers whoever truly needs
 *   it.
 *
 * Figures and files both come from the server. Exports are generated there (it
 * already has exceljs and pdfkit) and shared from the device — building a
 * spreadsheet on a phone would be slower, less capable, and a second
 * implementation of the same totals to keep in step.
 */

const ALL_BRANCHES = 'all';

/**
 * How many daily rows are listed under the trend.
 *
 * The chart takes the same slice, so the picture and the figures under it always
 * describe the same days — a chart over ninety days above a list of fourteen
 * invites reading a total off the wrong one. When the range is longer, the card
 * says so and points at the export, which has every row.
 */
const DAILY_ROWS = 14;

type Dimension = 'branch' | 'product' | 'payment' | 'category';

const DIMENSIONS: ReadonlyArray<FilterChip & { key: Dimension }> = [
  { key: 'branch', label: 'Branch' },
  { key: 'product', label: 'Product' },
  { key: 'payment', label: 'Payment' },
  { key: 'category', label: 'Category' },
];

export function ReportsScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const { currencySymbol } = useCatalogSettings();
  const isOnline = useNetworkStore(s => s.isOnline);
  const { exportReport, isExporting, error: exportError } = useExportReport();

  /**
   * Only an admin may scope by branch. A branch manager is pinned to their own
   * branch **by the server**, off the token, and must not send `branchId` at
   * all — so for them there is no branch filter, and no "Branch" breakdown
   * either: it would be one row, always, naming the shop they are standing in.
   */
  const role = useAuthStore(s => s.claims?.role);
  const canScopeBranch = role === 'super_admin';

  const [rangeKey, setRangeKey] = useState<DashboardRangeKey>('today');
  const [custom, setCustom] = useState<CustomDates>(() => ({
    from: businessDaysAgoStr(6),
    to: businessDateStr(),
  }));
  const [branchId, setBranchId] = useState(ALL_BRANCHES);
  const [dimension, setDimension] = useState<Dimension>(canScopeBranch ? 'branch' : 'product');

  const branches = useBranches({ enabled: canScopeBranch });

  const branchChips = useMemo<readonly FilterChip[]>(
    () => [
      { key: ALL_BRANCHES, label: 'All branches' },
      ...(branches.data ?? []).map(b => ({ key: b.id, label: b.name })),
    ],
    [branches.data],
  );

  const dimensionChips = useMemo(
    () => (canScopeBranch ? DIMENSIONS : DIMENSIONS.filter(d => d.key !== 'branch')),
    [canScopeBranch],
  );

  /**
   * The request. `resolveRange` owns the one rule that matters here: the server
   * takes a **named period or an explicit from/to, never both**, and silently
   * ignores the range when a name is present.
   */
  const scope = useMemo(() => {
    const range = resolveRange(rangeKey, custom);
    return {
      ...range,
      ...(canScopeBranch && branchId !== ALL_BRANCHES ? { branchId } : {}),
    };
  }, [rangeKey, custom, canScopeBranch, branchId]);

  const summary = useQuery({
    // The filters ARE the key — including the branch, or one shop's revenue is
    // served under another shop's chip.
    queryKey: qk.reports.summary(scope),
    queryFn: () => getReportSummary(scope),
    /**
     * The previous answer stays on screen while the new one loads.
     *
     * Without it, changing the filter unmounts the whole result and puts a
     * skeleton in its place — the screen empties, the layout collapses, and it
     * refills a moment later. The user did not ask for a new screen, they asked
     * the same screen a different question, so the old answer is the honest
     * thing to show until the new one arrives.
     */
    placeholderData: previous => previous,
  });

  const data = summary.data;

  const totalDays = data?.dailyData.length ?? 0;
  const recentDays = useMemo(
    () => (data?.dailyData ?? []).slice(-DAILY_ROWS),
    [data],
  );

  /**
   * The chart's spoken equivalent. A screen reader gets the conclusion — range,
   * span and best day — rather than fourteen bars it cannot compare.
   */
  const trendSummary = useMemo(() => {
    if (recentDays.length === 0) return 'No daily revenue in this period.';
    const best = recentDays.reduce((a, b) =>
      toNumber(b.totalRevenue) > toNumber(a.totalRevenue) ? b : a,
    );
    return (
      `Daily revenue for ${recentDays.length} ` +
      `${recentDays.length === 1 ? 'day' : 'days'}, ` +
      `${recentDays[0]!.date} to ${recentDays[recentDays.length - 1]!.date}. ` +
      `Highest was ${formatCurrency(toNumber(best.totalRevenue), currencySymbol)} on ${best.date}.`
    );
  }, [recentDays, currencySymbol]);

  const money = (value: unknown) => formatCurrency(toNumber(value), currencySymbol);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        leading={<MBAccountButton />}
        title="Reports"
        {...(canScopeBranch ? {} : { subtitle: 'Your branch' })}
        right={<MBSyncStatus />}
        dataAsOf={dataAsOfFrom(summary.dataUpdatedAt)}
      />

      <View style={{ padding: theme.layout.screenPad, gap: theme.space.sm }}>
        <MBRangeFilter
          value={rangeKey}
          onChange={setRangeKey}
          custom={custom}
          onCustomChange={setCustom}
        />

        {/* Second row, `accent` rather than `primary`, so two stacked scrollers
            cannot be mistaken for one long one — the same call Products makes
            where categories sit above statuses. */}
        {canScopeBranch ? (
          <MBFilterChips
            options={branchChips}
            selectedKey={branchId}
            onSelect={setBranchId}
            tone="accent"
            scroll
            testIDPrefix="report-branch"
          />
        ) : null}
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
          /* Wide cap, not the single-column one: the stat grid is genuinely
             several measures side by side, and capping it at 640 would leave a
             tablet showing a phone's 2x2 block in the middle of the screen. */
          contentContainerStyle={[
            contentColumnWide,
            { padding: theme.layout.screenPad, gap: theme.space.md },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={summary.isFetching && !summary.isPending}
              onRefresh={() => summary.refetch()}
              tintColor={theme.colors.primary}
            />
          }>
          {/* The period's answer, on the inverse block rather than as the first
              of five white cards. It is the one figure the screen exists to
              produce and everything under it is a way of taking it apart; a
              card identical to the ones below made it the first item in a list
              instead of the conclusion at the top. */}
          <MBHeroCard
            caption={`${data?.from} → ${data?.to}`}
            value={data?.totalRevenue ?? 0}
            currencySymbol={currencySymbol}
            stats={[
              { label: 'Profit', value: formatAmount(toNumber(data?.totalProfit)) },
              { label: 'Orders', value: formatQty(toNumber(data?.totalOrders)) },
              {
                label: 'Average',
                value: formatAmount(toNumber(data?.averageOrderValue)),
              },
            ]}
            testID="reports-hero"
          />

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Detail</Text>
            <MBDataRow
              label="Expenses"
              value={<MBMoney value={data?.totalExpenses} size="sm" symbol={currencySymbol} />}
            />
            <MBDataRow
              label="Discount"
              value={<MBMoney value={data?.totalDiscount} size="sm" symbol={currencySymbol} />}
            />
            <MBDataRow
              label="Staff sales"
              value={<MBMoney value={data?.staffTotal} size="sm" symbol={currencySymbol} />}
            />
            <MBDataRow label="Cancelled" value={formatQty(toNumber(data?.totalCancelled))} />
          </MBCard>

          {/* The three statements. They are the only way in — nothing in
              `roleConfig` points at them — which is what keeps each of them
              reachable from exactly one surface while still getting a whole
              screen to itself. */}
          <MBSectionHeader title="Statements" />
          <MBListCard testID="report-statements">
            <MBListRow
              title="Daily sales"
              subtitle="One day, reconciled: tender, by hour, top sellers"
              icon="sales"
              iconTone="success"
              onPress={() => navigation.navigate('DailySales')}
              testID="open-daily-sales"
            />
            <MBListRow
              title="Top products"
              subtitle="What sold, by units or by revenue"
              icon="products"
              iconTone="warning"
              onPress={() => navigation.navigate('TopProducts')}
              testID="open-top-products"
            />
            <MBListRow
              title="Sales vs expenses"
              subtitle="Money in against money out, week by week"
              icon="reports"
              iconTone="info"
              onPress={() => navigation.navigate('SalesVsExpenses')}
              testID="open-sales-vs-expenses"
            />
          </MBListCard>

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Breakdown</Text>
            {/* No round trip: all four rollups came down with the summary, so
                this row re-renders one card rather than re-asking the server. */}
            <MBFilterChips
              options={dimensionChips}
              selectedKey={dimension}
              onSelect={key => setDimension(key as Dimension)}
              tone="accent"
              testIDPrefix="report-by"
            />
            <Breakdown dimension={dimension} data={data} money={money} />
          </MBCard>

          {totalDays > 0 ? (
            <MBCard>
              <Text style={[theme.type.h3, { color: theme.colors.text }]}>Daily</Text>

              {/* The shape first, the numbers under it. Fourteen revenue figures
                  in a column can only be compared by reading all fourteen and
                  holding them in your head; the trend is the thing a manager
                  actually opens this card for. The rows stay because the exact
                  figure is what gets written down. */}
              <MBTrendChart
                data={recentDays.map(day => ({
                  label: day.date,
                  value: toNumber(day.totalRevenue),
                }))}
                accessibilityLabel={trendSummary}
              />

              {/* Said out loud rather than silently sliced. A quarter shown as
                  a fortnight looks like a complete answer to a different
                  question, and the export is where every row lives. */}
              {totalDays > DAILY_ROWS ? (
                <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                  Latest {DAILY_ROWS} of {totalDays} days · export for the full range
                </Text>
              ) : null}

              {recentDays.map(day => (
                <MBDataRow
                  key={day.date}
                  label={day.date}
                  value={<MBMoney value={day.totalRevenue} size="sm" symbol={currencySymbol} />}
                />
              ))}
            </MBCard>
          ) : null}

          <MBCard>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Export</Text>
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              Generated by the server and shared from this device. The file covers
              the range and branch selected above.
            </Text>
            <View style={styles.exportRow}>
              <MBButton
                label="Excel"
                onPress={() => exportReport({ type: 'excel', ...scope })}
                loading={isExporting}
                disabled={!isOnline}
                variant="secondary"
                size="sm"
                testID="export-excel"
              />
              <MBButton
                label="PDF"
                onPress={() => exportReport({ type: 'pdf', ...scope })}
                disabled={!isOnline || isExporting}
                variant="secondary"
                size="sm"
                testID="export-pdf"
              />
              <MBButton
                label="CSV"
                onPress={() => exportReport({ type: 'csv', ...scope })}
                disabled={!isOnline || isExporting}
                variant="secondary"
                size="sm"
                testID="export-csv"
              />
            </View>
            {!isOnline ? (
              <Text style={[theme.type.caption, { color: theme.colors.offline }]}>
                Exports need a connection — the file is built on the server.
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
 * The selected rollup, and nothing else.
 *
 * Each dimension is a different sentence about the same money, so each carries
 * its own secondary figure in the label — the count for branches and payments,
 * the quantity for products and categories — rather than a bar with a name and
 * no context.
 *
 * `categoryBreakdown` is the one field that may be absent, because this app
 * ships independently of the API and the rollup arrived after some builds were
 * already in shops. Absent is reported as **not available from this server**,
 * never as an empty category list — "no categories sold" and "your server is
 * older than your phone" are opposite facts and only one of them is about the
 * bakery. It is deliberately not folded out of `topProducts` either: that array
 * is the ten best sellers, so a category total built from it would be a
 * fraction of the real one wearing the real one's name.
 */
function Breakdown({
  dimension,
  data,
  money,
}: {
  dimension: Dimension;
  data: ReportSummary | undefined;
  /** Already carries the branch's currency symbol — formatting stays in one place. */
  money: (value: unknown) => string;
}): React.ReactElement {
  const theme = useTheme();

  if (dimension === 'category' && data && !data.categoryBreakdown) {
    return (
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        This server does not report category totals yet. Every other breakdown is
        unaffected.
      </Text>
    );
  }

  const { items, label } = rollup(dimension, data, money);

  if (items.length === 0) {
    return (
      <MBEmptyState
        title="Nothing in this range"
        message="Widen the range, or pick another branch."
      />
    );
  }

  return <MBShareList accessibilityLabel={label} items={items} />;
}

function rollup(
  dimension: Dimension,
  data: ReportSummary | undefined,
  money: (value: unknown) => string,
): { items: ShareItem[]; label: string } {
  switch (dimension) {
    case 'branch':
      return {
        label: 'Branches by revenue',
        items: (data?.branchData ?? []).map(branch => ({
          label: `${branch.branchName} · ${formatQty(branch.totalOrders)}`,
          amount: toNumber(branch.totalRevenue),
          display: money(branch.totalRevenue),
        })),
      };
    case 'product':
      return {
        label: 'Top products by revenue',
        items: (data?.topProducts ?? []).map(product => ({
          label: `${product.productName} · ${formatQty(product.totalQty)}`,
          amount: toNumber(product.totalRevenue),
          display: money(product.totalRevenue),
        })),
      };
    case 'payment':
      return {
        label: 'Revenue by payment method',
        items: (data?.paymentMethodBreakdown ?? []).map(entry => ({
          label: `${entry.method} · ${formatQty(entry.count)}`,
          amount: toNumber(entry.total),
          display: money(entry.total),
        })),
      };
    case 'category':
      return {
        label: 'Revenue by category',
        items: (data?.categoryBreakdown ?? []).map(entry => ({
          label: `${entry.categoryName} · ${formatQty(entry.totalQty)}`,
          amount: toNumber(entry.totalRevenue),
          display: money(entry.totalRevenue),
        })),
      };
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  exportRow: { flexDirection: 'row', gap: space.sm, marginTop: space.snug },
});
