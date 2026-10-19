import { StyleSheet, Text, View } from 'react-native';
import type { FinanceMonthlyDashboard, SalesAnalytics, SalesAnalyticsPaymentMethod, SalesAnalyticsTopProduct } from '@/api/types';
import { SalesChart } from '@/features/dashboard';
import { formatMoney2, monthLong } from '@/features/finance';
import { useAppTheme } from '@/shared/theme';
import { Card, LoadingSkeleton } from '@/shared/ui';
import { pctOf, plural } from '../../utils/dashboardModel';
import { Banner, DashSection, KpiGrid, KpiTile, Toggle, type DrillTo } from './parts';

/** The web's PAYMENT_METHOD_LABELS. */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank Account',
  staff: 'Staff',
  card: 'Card',
  online: 'Online',
};

export type TopLimit = 5 | 10;

/** The month's four headline tiles — the web's HeadlineKpis. */
export function HeadlineKpis({
  data,
  sales,
  salesFailed,
  drillTo,
}: {
  data: FinanceMonthlyDashboard;
  sales: SalesAnalytics | null;
  salesFailed: boolean;
  drillTo: DrillTo;
}) {
  const s = data.summary;
  const prevMonth = monthLong(data.previousMonth);
  return (
    <KpiGrid>
      <KpiTile
        label="Total Sales"
        value={sales ? formatMoney2(sales.totalSales) : salesFailed ? '—' : '…'}
        sub={sales ? `${plural(sales.totalTransactions, 'transaction')} at the counter` : salesFailed ? 'Sales could not be loaded' : 'Loading sales…'}
        icon="sales"
        tone="accent"
      />
      <KpiTile
        label="Company Share"
        value={formatMoney2(s.companyShare)}
        sub={`${pctOf(s.companyShare, s.demand)} of ${formatMoney2(s.demand)} demand`}
        icon="banknote"
        tone="share"
        onPress={s.orders ? () => drillTo('share') : undefined}
      />
      <KpiTile
        label="Received"
        value={formatMoney2(s.received)}
        sub={`${pctOf(s.received, s.companyShare)} of company share`}
        icon="wallet"
        tone="received"
        onPress={s.receipts ? () => drillTo('received') : undefined}
      />
      <KpiTile
        label="Balance"
        value={formatMoney2(s.balance)}
        negative={s.balance < 0}
        sub={s.lastMonthBalance === null ? `No records in ${prevMonth}` : `${prevMonth}: ${formatMoney2(s.lastMonthBalance)}`}
        icon="scales"
        tone="neutral"
      />
    </KpiGrid>
  );
}

/** Sales Overview — point-of-sale figures from `/sales-analytics` for the dashboard's window. */
export function SalesOverview({
  sales,
  loading,
  failed,
  onRetry,
  topLimit,
  onTopLimit,
  subtitle,
}: {
  sales: SalesAnalytics | null;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  topLimit: TopLimit;
  onTopLimit: (l: TopLimit) => void;
  subtitle: string;
}) {
  const theme = useAppTheme();
  const s = sales;
  return (
    <DashSection title="Sales Overview" sub={`Point-of-sale orders · ${subtitle}`}>
      {failed && !s ? (
        <Banner text="The sales figures could not be loaded. The rest of the dashboard is unaffected." onRetry={onRetry} />
      ) : (
        <>
          <KpiGrid>
            <KpiTile label="Total Sales" value={s ? formatMoney2(s.totalSales) : '…'} sub="Paid orders at the counter" icon="sales" tone="accent" />
            <KpiTile
              label="Transactions"
              value={s ? s.totalTransactions.toLocaleString('en-US') : '…'}
              sub="Paid orders, cancelled and staff excluded"
              icon="cart"
            />
            <KpiTile
              label="Average Sale"
              value={s ? (s.totalTransactions ? formatMoney2(s.totalSales / s.totalTransactions) : '—') : '…'}
              sub="Total Sales ÷ transactions"
              icon="receipt"
              tone="received"
            />
            <KpiTile label="Average Daily Sales" value={s ? formatMoney2(s.averageDailySales) : '…'} sub="Over every elapsed day of the range" icon="calendar" tone="ledger" />
            <KpiTile
              label="Staff Sales (unpaid)"
              value={s ? formatMoney2(s.staffTotal ?? 0) : '…'}
              sub={s ? `${plural(s.staffCount, 'sale')} · not in Total Sales` : 'Not in Total Sales'}
              icon="users"
              tone="neutral"
            />
          </KpiGrid>
          {s ? (
            s.daily.length ? (
              <SalesChart key={`${s.from}${s.effectiveTo}`} data={s.daily} average={s.averageDailySales} />
            ) : (
              <Card>
                <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Daily Sales</Text>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 8 }]}>No sales in this date range.</Text>
              </Card>
            )
          ) : (
            <LoadingSkeleton height={260} borderRadius={16} />
          )}
          <PaymentMethodSummary methods={s?.paymentMethods ?? []} staffCount={s?.staffCount ?? 0} staffTotal={s?.staffTotal ?? 0} loading={loading && !s} />
          <TopSellingProducts products={s?.topProducts ?? []} loading={loading && !s} limit={topLimit} onLimit={onTopLimit} />
        </>
      )}
    </DashSection>
  );
}

/**
 * The web's PaymentMethodSummary: one row per method, the bar a share of the
 * largest method; staff (unpaid) sales below the line, outside the total.
 */
function PaymentMethodSummary({
  methods,
  staffCount,
  staffTotal,
  loading,
}: {
  methods: SalesAnalyticsPaymentMethod[];
  staffCount: number;
  staffTotal: number;
  loading: boolean;
}) {
  const theme = useAppTheme();
  const largest = methods.reduce((max, m) => Math.max(max, m.total), 0);
  return (
    <Card style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={[theme.typography.cardTitle, { color: theme.colors.text }]}>
        Payment Methods
      </Text>
      {loading ? (
        <LoadingSkeleton height={120} />
      ) : methods.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 12 }]}>
          No payments recorded for this period.
        </Text>
      ) : (
        methods.map((m) => (
          <View key={m.method} accessible accessibilityLabel={`${PAYMENT_METHOD_LABELS[m.method] ?? m.method}, ${formatMoney2(m.total)}, ${plural(m.count, 'sale')}`}>
            <View style={styles.rowBetween}>
              <Text numberOfLines={1} style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', flex: 1 }]}>
                {PAYMENT_METHOD_LABELS[m.method] ?? m.method}
              </Text>
              <Text style={[theme.typography.bodySmall, styles.num, { color: theme.colors.text, fontWeight: '700' }]}>{formatMoney2(m.total)}</Text>
            </View>
            <View style={[styles.rowBetween, { marginTop: 5 }]}>
              <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
                <View style={[styles.fill, { width: `${largest > 0 ? (m.total / largest) * 100 : 0}%`, backgroundColor: theme.colors.primary }]} />
              </View>
              <Text style={[theme.typography.label, styles.num, { color: theme.colors.textSecondary, width: 76, textAlign: 'right' }]}>{plural(m.count, 'sale')}</Text>
            </View>
          </View>
        ))
      )}
      {!loading && staffCount > 0 ? (
        <View style={[styles.rowBetween, styles.staff, { borderTopColor: theme.colors.border }]}>
          <Text numberOfLines={1} style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, flex: 1 }]}>
            Staff (unpaid) · {staffCount.toLocaleString('en-US')}
          </Text>
          <Text style={[theme.typography.bodySmall, styles.num, { color: theme.colors.textSecondary }]}>{formatMoney2(staffTotal)}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const qty = (n: number) => Number(n.toFixed(3)).toLocaleString('en-US');

/** The web's TopSellingProducts phone layout — a ranked list: #, product + category, sales and qty sold. */
function TopSellingProducts({
  products,
  loading,
  limit,
  onLimit,
}: {
  products: SalesAnalyticsTopProduct[];
  loading: boolean;
  limit: TopLimit;
  onLimit: (l: TopLimit) => void;
}) {
  const theme = useAppTheme();
  return (
    <Card style={{ gap: 8 }}>
      <View style={styles.rowBetween}>
        <Text accessibilityRole="header" style={[theme.typography.cardTitle, { color: theme.colors.text, flex: 1 }]}>
          Top Selling Products
        </Text>
        <Toggle<TopLimit>
          options={[
            { value: 5, label: 'Top 5' },
            { value: 10, label: 'Top 10' },
          ]}
          value={limit}
          onChange={onLimit}
        />
      </View>
      {loading ? (
        <LoadingSkeleton height={160} />
      ) : products.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 12 }]}>No products sold in this period.</Text>
      ) : (
        products.map((p, i) => (
          <View
            key={p.productId || `name:${p.productName}`}
            accessible
            accessibilityLabel={`${i + 1}. ${p.productName}, ${qty(p.qty)} sold, ${formatMoney2(p.sales)}`}
            style={[styles.productRow, { borderTopColor: theme.colors.border, borderTopWidth: i ? StyleSheet.hairlineWidth : 0 }]}>
            <Text style={[theme.typography.label, styles.num, { color: theme.colors.textSecondary, width: 20 }]}>{i + 1}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>
                {p.productName}
              </Text>
              {p.categoryName ? (
                <Text numberOfLines={1} style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                  {p.categoryName}
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[theme.typography.bodySmall, styles.num, { color: theme.colors.text, fontWeight: '700' }]}>{formatMoney2(p.sales)}</Text>
              <Text style={[theme.typography.label, styles.num, { color: theme.colors.textSecondary }]}>{qty(p.qty)} sold</Text>
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  num: { fontVariant: ['tabular-nums'] },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  staff: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
});
