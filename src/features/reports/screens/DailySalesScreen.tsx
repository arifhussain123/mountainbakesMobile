import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import {
  MBCard,
  MBColumnChart,
  MBDateStepper,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBHeroCard,
  MBListCard,
  MBListRow,
  MBMoney,
  MBSectionHeader,
  MBSkeletonList,
  type ColumnGroup,
} from '@/common/ui';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { getOrders } from '@/api/services/financeService';
import { getReportSummary } from '@/api/services/reportsService';
import { qk } from '@/api/queryKeys';
import type { Order } from '@/shared/types/order.types';
import { businessDateStr, businessDayBounds, karachiTimeStr } from '@/shared/utils/timezone';
import { useTheme } from '@/common/theme/ThemeProvider';
import { businessDateLabel, formatBusinessDate } from '@/common/helpers/businessDay';
import { resolveRange } from '@/common/helpers/dashboardRange';
import { formatAmount, formatQty, toNumber } from '@/common/utils/money';
import { contentColumn } from '@/common/theme/spacing';

/**
 * One business day of takings, in the shape a till is reconciled in.
 *
 * ---------------------------------------------------------------------------
 * Why this is its own screen and not a chip on Reports
 * ---------------------------------------------------------------------------
 * Reports answers "how is the period going" — a range, a breakdown, a trend.
 * This answers "does last night add up", which is a different job done by a
 * different person at a different time, and it needs three things Reports has no
 * room for: the split by tender, the shape of the day by hour, and what actually
 * sold. Putting all three behind a "Day" chip on Reports would make that chip
 * change the screen's whole layout, which is the tell that it was two screens.
 *
 * ---------------------------------------------------------------------------
 * Two requests, and the second one is not the same data
 * ---------------------------------------------------------------------------
 * `GET /api/reports/summary` is an aggregate — totals, tender split, top
 * products — and it does not carry timestamps, so it cannot answer "when in the
 * day". `GET /api/orders` for the same business-day bounds does, and the
 * bucketing is done here because no endpoint buckets by hour.
 *
 * That second read is bounded on purpose: **one business day** of one branch,
 * which is tens of orders, not a table scan. Widening this screen to a range
 * would make it one — see `docs/cache-policy.md` on why no endpoint paginates.
 * If the by-hour card ever needs a week, it needs a server-side rollup first.
 *
 * The hour is **Karachi's**, not the device's. Everything else in this app is on
 * the business clock, and an hour axis that quietly used the phone's timezone
 * would put the morning rush in the middle of the night for anyone travelling.
 */

/**
 * The hours drawn on the axis.
 *
 * A bakery counter is not open at 03:00 and a chart with twenty-four columns
 * spends most of its width proving it. Anything outside the window is folded
 * into the nearest end rather than dropped — a sale at 22:00 is real money and
 * must not vanish from a screen used to reconcile a till.
 */
const FIRST_HOUR = 6;
const LAST_HOUR = 21;

export function DailySalesScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();
  const { currencySymbol } = useCatalogSettings();

  const [date, setDate] = useState(() => businessDateStr());

  const scope = useMemo(() => resolveRange('custom', { from: date, to: date }), [date]);
  const bounds = useMemo(() => businessDayBounds(date), [date]);

  const summary = useQuery({
    queryKey: qk.reports.summary(scope),
    queryFn: () => getReportSummary(scope),
    // The previous day stays on screen while the next loads. Stepping the date
    // is asking the same screen a different question, not opening a new one.
    placeholderData: previous => previous,
  });

  const orders = useQuery({
    queryKey: qk.orders.list({ from: bounds.fromISO, to: bounds.toISO }),
    queryFn: () => getOrders({ from: bounds.fromISO, to: bounds.toISO }),
    placeholderData: previous => previous,
  });

  const data = summary.data;

  const hours = useMemo<ColumnGroup[]>(() => byHour(orders.data ?? []), [orders.data]);

  const takings = toNumber(data?.totalRevenue);
  const count = toNumber(data?.totalOrders);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Daily sales"
        subtitle={formatBusinessDate(date)}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={
              (summary.isFetching && !summary.isPending) || (orders.isFetching && !orders.isPending)
            }
            onRefresh={() => {
              summary.refetch();
              orders.refetch();
            }}
            tintColor={theme.colors.primary}
          />
        }>
        <MBDateStepper value={date} onChange={setDate} testID="daily-sales-date" />

        {summary.isPending ? (
          <MBSkeletonList rows={5} />
        ) : summary.isError ? (
          <MBErrorState
            error={summary.error}
            onRetry={() => summary.refetch()}
            retrying={summary.isFetching}
          />
        ) : (
          <>
            <MBHeroCard
              caption={`${businessDateLabel(date)} · gross sales`}
              value={takings}
              currencySymbol={currencySymbol}
              stats={[
                { label: 'Sales', value: formatQty(count) },
                {
                  label: 'Average',
                  value: formatAmount(toNumber(data?.averageOrderValue)),
                },
                { label: 'Discount', value: formatAmount(toNumber(data?.totalDiscount)) },
              ]}
              testID="daily-sales-hero"
            />

            {/* Nothing sold is a real answer and it gets said, not drawn as a
                row of empty columns under three cards of zeroes. */}
            {count === 0 ? (
              <MBEmptyState
                title="No sales on this day"
                message={`Nothing was rung up on ${formatBusinessDate(date)}. Step back a day to see the last one that was.`}
                icon="sales"
              />
            ) : (
              <>
                <MBSectionHeader title="By hour" subtitle={`${FIRST_HOUR}:00 – ${LAST_HOUR}:00`} />
                <MBCard>
                  {orders.isPending ? (
                    <MBSkeletonList rows={2} />
                  ) : orders.isError ? (
                    /* The hour chart failing does not fail the screen. The
                       totals above it came from a different request and are
                       still true; replacing the whole day with one error would
                       hide the figures somebody came here to read. */
                    <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                      Could not load the hourly breakdown. The totals above are unaffected.
                    </Text>
                  ) : (
                    <MBColumnChart
                      series={['Sales']}
                      groups={hours}
                      accessibilityLabel={hourSummary(hours, currencySymbol)}
                      testID="daily-sales-hours"
                    />
                  )}
                </MBCard>

                <MBSectionHeader title="By payment" />
                <MBListCard testID="daily-sales-payments">
                  {(data?.paymentMethodBreakdown ?? []).map(row => (
                    <MBListRow
                      key={row.method}
                      title={row.method}
                      subtitle={`${formatQty(row.count)} ${row.count === 1 ? 'sale' : 'sales'}`}
                      value={
                        <MBMoney value={row.total} size="sm" symbol={currencySymbol} />
                      }
                    />
                  ))}
                </MBListCard>

                <MBSectionHeader title="Top sellers" subtitle="This day" />
                <MBListCard testID="daily-sales-products">
                  {(data?.topProducts ?? []).slice(0, 5).map((product, i) => (
                    <MBListRow
                      key={product.productId}
                      rank={i + 1}
                      title={product.productName}
                      subtitle={`${formatQty(product.totalQty)} units`}
                      value={
                        <MBMoney value={product.totalRevenue} size="sm" symbol={currencySymbol} />
                      }
                    />
                  ))}
                </MBListCard>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Orders → one column per trading hour, in Karachi time.
 *
 * Cancelled orders are excluded: they took no money, and a column that counts
 * them is a peak that never happened. Staff sales are left in — they are stock
 * that left the shelf and the shape of the day is what this card is for; the
 * money figures above it come from the summary, which excludes them.
 */
function byHour(orders: readonly Order[]): ColumnGroup[] {
  const buckets = new Map<number, number>();
  for (let h = FIRST_HOUR; h <= LAST_HOUR; h += 1) buckets.set(h, 0);

  let peak = FIRST_HOUR;
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const hh = Number(karachiTimeStr(new Date(order.createdAt)).slice(0, 2));
    if (!Number.isFinite(hh)) continue;
    // Folded into the nearest end rather than dropped: an out-of-hours sale is
    // still money, and losing it here would make this card disagree with the
    // total above it.
    const key = Math.min(LAST_HOUR, Math.max(FIRST_HOUR, hh));
    buckets.set(key, (buckets.get(key) ?? 0) + toNumber(order.grandTotal));
  }

  for (const [hour, value] of buckets) {
    if (value > (buckets.get(peak) ?? 0)) peak = hour;
  }

  return [...buckets.entries()].map(([hour, value]) => ({
    label: String(hour),
    values: [value],
    // The busiest hour is emphasised rather than annotated. v4 prints a "Peak"
    // tag; a tag needs a position and a phone chart has no room for one that
    // will not collide with a column.
    emphasis: hour === peak && value > 0,
  }));
}

function hourSummary(hours: readonly ColumnGroup[], symbol?: string): string {
  const best = hours.reduce(
    (a, b) => ((b.values[0] ?? 0) > (a.values[0] ?? 0) ? b : a),
    hours[0] ?? { label: '', values: [0] },
  );
  const total = hours.reduce((sum, h) => sum + (h.values[0] ?? 0), 0);
  if (total === 0) return 'No sales were taken during trading hours on this day.';
  return (
    `Sales by hour from ${FIRST_HOUR}:00 to ${LAST_HOUR}:00. ` +
    `Busiest was ${best.label}:00 at ${symbol ?? 'Rs.'} ${formatAmount(best.values[0] ?? 0)}.`
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
