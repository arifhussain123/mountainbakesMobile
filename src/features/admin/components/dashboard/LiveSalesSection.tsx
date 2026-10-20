import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useBranchSales, useBranches } from '@/api';
import { formatMoney2 } from '@/features/finance';
import { useNetworkStatus } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { Card, DateRangeSheet, FilterChipRow, LoadingSkeleton } from '@/shared/ui';
import {
  SALES_PERIODS,
  dateRangeText,
  liveSaleRows,
  pad2,
  plural,
  salesPeriodLabel,
  salesPeriodRange,
  type LiveSaleRow,
  type SalesPeriod,
} from '../../utils/dashboardModel';
import { SmallButton } from './parts';

/** Three of the web's 30-second refresh ticks without a successful refresh, and the board stops calling itself live. */
const STALE_AFTER_MS = 90_000;
const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000;

/** "10:28:04 pm" in Karachi time. */
function clock(ms: number): string {
  const k = new Date(ms + KARACHI_OFFSET_MS);
  const h = k.getUTCHours();
  return `${h % 12 || 12}:${pad2(k.getUTCMinutes())}:${pad2(k.getUTCSeconds())} ${h < 12 ? 'am' : 'pm'}`;
}

type Status = 'loading' | 'live' | 'closed' | 'stale' | 'offline' | 'error';

/**
 * Live Sales — All Branches: one card per branch that sold in the chosen
 * period (a branch at Rs. 0 is left off) and the combined total under them.
 * Every figure is a per-branch sum from the server; the total is those branch
 * figures added, so it matches the cards exactly. Always every branch,
 * whatever the dashboard's own branch filter is on.
 */
export function LiveSalesSection({ today }: { today: string }) {
  const theme = useAppTheme();
  const [period, setPeriod] = useState<SalesPeriod>('today');
  const [custom, setCustom] = useState({ from: today, to: today });
  const sheetRef = useRef<BottomSheetModal>(null);
  const range = salesPeriodRange(period, today, custom);
  const salesQ = useBranchSales(range);
  const branchesQ = useBranches();
  const { isOffline } = useNetworkStatus();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // A failed branch list still lets the sales through.
  const branchesSettled = !!branchesQ.data || !!branchesQ.error;
  const rows = useMemo(
    () => (salesQ.data && branchesSettled ? liveSaleRows(branchesQ.data?.branches ?? [], salesQ.data) : []),
    [salesQ.data, branchesQ.data, branchesSettled],
  );
  const failed = !!salesQ.error;
  const loading = !failed && (!salesQ.data || !branchesSettled);
  const updatedAt = salesQ.data ? salesQ.dataUpdatedAt : null;

  let status: Status = 'loading';
  if (updatedAt) {
    if (isOffline) status = 'offline';
    else if (failed) status = 'error';
    else if (range.to < today) status = 'closed';
    else if (now - updatedAt > STALE_AFTER_MS && !salesQ.isFetching) status = 'stale';
    else status = 'live';
  }

  const label = salesPeriodLabel(period, range.from, range.to);
  const total = rows.reduce((s, r) => s + r.sales, 0);
  const orders = rows.reduce((s, r) => s + r.orders, 0);
  const retry = () => void salesQ.refetch();

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={[styles.head, { borderBottomColor: theme.colors.border }]}>
        <Text accessibilityRole="header" style={[theme.typography.cardTitle, { color: theme.colors.text, fontWeight: '800', letterSpacing: 0.6 }]}>
          LIVE SALES — ALL BRANCHES
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          {label} · {dateRangeText(range.from, range.to)} · paid orders, cancelled and staff sales excluded
        </Text>
        <LiveStatus status={status} updatedAt={updatedAt} onRetry={retry} />
        <FilterChipRow
          options={SALES_PERIODS}
          value={period}
          onChange={(p) => {
            setPeriod(p);
            if (p === 'custom') sheetRef.current?.present();
          }}
        />
        {period === 'custom' ? (
          <Pressable accessibilityRole="button" onPress={() => sheetRef.current?.present()} hitSlop={6}>
            <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>
              {dateRangeText(range.from, range.to)} · Change dates ›
            </Text>
          </Pressable>
        ) : null}
      </View>

      {failed && !rows.length ? (
        <View accessibilityRole="alert" style={styles.body}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>
            Branch sales could not be loaded. No figures are shown rather than out-of-date ones.
          </Text>
          <View style={{ alignSelf: 'flex-start', marginTop: 8 }}>
            <SmallButton label="Retry" onPress={retry} />
          </View>
        </View>
      ) : !loading && !rows.length ? (
        <Text style={[theme.typography.bodySmall, styles.empty, { color: theme.colors.textSecondary }]}>No branch has made a sale in this period.</Text>
      ) : (
        <View style={[styles.body, { gap: 10 }]}>
          <View style={styles.grid}>
            {loading
              ? [0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.cardCell}>
                    <LoadingSkeleton height={96} borderRadius={12} />
                  </View>
                ))
              : rows.map((r) => <LiveSaleCard key={r.branchId} row={r} label={label} />)}
          </View>
          {!loading ? (
            <View style={[styles.total, { backgroundColor: theme.colors.background, borderRadius: theme.radii.md }]}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '800' }]}>TOTAL SALES</Text>
              <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.totalValue, { color: theme.colors.text }]}>
                  {formatMoney2(total)}
                </Text>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{plural(orders, 'order')}</Text>
              </View>
            </View>
          ) : null}
        </View>
      )}

      <DateRangeSheet
        ref={sheetRef}
        today={today}
        value={custom}
        onApply={(r) => setCustom({ from: r.from, to: r.to })}
        onRequestClose={() => sheetRef.current?.dismiss()}
      />
    </Card>
  );
}

function LiveSaleCard({ row, label }: { row: LiveSaleRow; label: string }) {
  const theme = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${row.branch}, ${formatMoney2(row.sales)}, ${plural(row.orders, 'order')}`}
      style={[styles.cardCell, styles.saleCard, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md, backgroundColor: theme.colors.cardFill }]}>
      <View style={[styles.saleHead, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <Text numberOfLines={2} style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>
          {row.branch}
        </Text>
      </View>
      <View style={{ padding: 10 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.saleValue, { color: theme.colors.text }]}>
          {formatMoney2(row.sales)}
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{row.orders ? plural(row.orders, 'order') : 'No sales yet'}</Text>
      </View>
    </View>
  );
}

function LiveStatus({ status, updatedAt, onRetry }: { status: Status; updatedAt: number | null; onRetry: () => void }) {
  const theme = useAppTheme();
  if (status === 'loading' || !updatedAt) return null;
  const at = clock(updatedAt);
  const [dot, text] =
    status === 'live'
      ? [theme.colors.success, `Live · updated ${at}`]
      : status === 'closed'
        ? [theme.colors.textFaint, `Closed period · loaded ${at}`]
        : status === 'offline'
          ? [theme.colors.warning, `Offline · showing figures from ${at}`]
          : status === 'stale'
            ? [theme.colors.warning, `Not updating · last updated ${at}`]
            : [theme.colors.danger, `Could not refresh · showing figures from ${at}`];
  return (
    <View style={styles.status} accessibilityLiveRegion="polite">
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flexShrink: 1 }]}>{text}</Text>
      {status === 'error' || status === 'stale' ? <SmallButton label="Retry" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { padding: 14, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  body: { padding: 14 },
  empty: { padding: 20, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardCell: { flexBasis: '46%', flexGrow: 1, minWidth: 0 },
  saleCard: { borderWidth: 1, overflow: 'hidden' },
  saleHead: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  saleValue: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  totalValue: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
