import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Alert, Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getBusinessDate, getReportExportCsv, useReportSummary, useSalesAnalytics, usePackingUsage } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { useNetworkStatus } from '@/shared/hooks';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { DateRangeSheet, EmptyState, ErrorState, FilterChipRow, Icon, LoadingSkeleton, Screen, type FilterChipOption } from '@/shared/ui';
import { formatCurrency, formatDisplayTime } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import {
  ExportMenu,
  KpiGrid,
  PackingMaterialsList,
  PaymentMethodsCard,
  ReportsHeader,
  SalesTrendChart,
  TopProductsList,
  type KpiItem,
} from '../../components';
import { computeAvgOrderValue, computeNet } from '../../calculations';
import { formatRangeLabel, rangeIncludesToday, resolveReportRange, stepReportRange, type ReportRange, type UiReportPeriod } from '../../ranges';
import { styles } from './styles';

const TABS: FilterChipOption<'trend' | 'topProducts' | 'packing'>[] = [
  { value: 'trend', label: 'Sales Trend' },
  { value: 'topProducts', label: 'Top Products' },
  { value: 'packing', label: 'Packing Materials' },
];

interface ReportsCachePayload {
  summary: NonNullable<ReturnType<typeof useReportSummary>['data']>;
  analytics: NonNullable<ReturnType<typeof useSalesAnalytics>['data']>;
}

/** branchApp.md screen 23 — Reports & Analytics. */
export function ReportsScreen() {
  const theme = useAppTheme();
  const { isOffline } = useNetworkStatus();
  const exportSheetRef = useRef<BottomSheetModal>(null);
  const customRangeSheetRef = useRef<BottomSheetModal>(null);
  const packingRangeSheetRef = useRef<BottomSheetModal>(null);

  const today = useMemo(() => getBusinessDate(), []);
  const [period, setPeriod] = useState<UiReportPeriod>('monthly');
  const [anchorDate, setAnchorDate] = useState(today);
  const [customRange, setCustomRange] = useState<ReportRange>(() => resolveReportRange('monthly', today));
  const [packingRangeOverride, setPackingRangeOverride] = useState<ReportRange | null>(null);
  const [tab, setTab] = useState<'trend' | 'topProducts' | 'packing'>('trend');
  const [exporting, setExporting] = useState(false);

  const resolvedRange = period === 'custom' ? customRange : resolveReportRange(period, anchorDate);
  const packingRange = packingRangeOverride ?? resolvedRange;

  // Packing's own range re-defaults to the selected period whenever that period changes — an override only sticks within one period selection.
  useEffect(() => {
    setPackingRangeOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedRange.from, resolvedRange.to]);

  const summary = useReportSummary(period === 'custom' ? 'custom' : period, resolvedRange.from, resolvedRange.to);
  const analytics = useSalesAnalytics(resolvedRange.from, resolvedRange.to, true, 10);
  const packing = usePackingUsage(packingRange.from, packingRange.to);

  const handleStep = (direction: 'prev' | 'next') => {
    if (period === 'custom') return;
    setAnchorDate((current) => stepReportRange(period, current, direction));
  };

  // Offline cache — the two period-bound queries only; packing has its own
  // independent range and isn't cached (same scope the brief's own "cache
  // the last result per range" asks for, kept to the main period window).
  const cacheKey = `reports:${period}:${resolvedRange.from}:${resolvedRange.to}`;
  const [cached, setCached] = useState<{ data: ReportsCachePayload; updatedAt: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getCachedResponse<ReportsCachePayload>(cacheKey).then((result) => {
      if (!cancelled) setCached(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);
  const liveData: ReportsCachePayload | null = useMemo(
    () => (summary.data && analytics.data ? { summary: summary.data, analytics: analytics.data } : null),
    [summary.data, analytics.data],
  );
  useEffect(() => {
    if (liveData) void setCachedResponse(cacheKey, liveData);
  }, [cacheKey, liveData]);
  const showingCache = !liveData && isOffline && !!cached;
  const data = liveData ?? (showingCache ? cached!.data : null);

  // Refetch when the app returns to the foreground — figures can change while backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void summary.refetch();
        void analytics.refetch();
        void packing.refetch();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const csv = await getReportExportCsv(period === 'custom' ? 'custom' : period, resolvedRange.from, resolvedRange.to);
      await Share.share({ title: `Branch report ${resolvedRange.from} to ${resolvedRange.to}`, message: csv });
      exportSheetRef.current?.dismiss();
    } catch (error) {
      Alert.alert('Export failed', mapErrorToMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const comparison = data?.analytics.comparison;
  const kpis: KpiItem[] = data
    ? [
        { id: 'orders', label: 'Total Orders', value: String(data.summary.totalOrders), icon: 'hash' },
        {
          id: 'revenue',
          label: 'Revenue',
          value: formatCurrency(data.summary.totalRevenue),
          icon: 'wallet',
          delta: comparison && comparison.changePct !== null ? { pct: comparison.changePct, direction: comparison.direction } : undefined,
        },
        { id: 'avg', label: 'Avg. Order Value', value: formatCurrency(computeAvgOrderValue(data.summary.totalRevenue, data.summary.totalOrders, data.summary.totalCancelled)), icon: 'bar-chart' },
        { id: 'cancelled', label: 'Cancelled', value: String(data.summary.totalCancelled), icon: 'rotate-ccw', muted: data.summary.totalCancelled === 0 },
        { id: 'expenses', label: 'Expenses', value: formatCurrency(data.summary.totalExpenses), icon: 'minus' },
        { id: 'net', label: 'Net (Sales − Expenses)', value: formatCurrency(computeNet(data.summary.totalRevenue, data.summary.totalExpenses)), icon: 'trending-up', valueColor: theme.colors.success },
      ]
    : [];

  const isLoading = (summary.isLoading || analytics.isLoading) && !data;
  const firstError = summary.error ?? analytics.error;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={summary.isRefetching || analytics.isRefetching}
            onRefresh={() => {
              void summary.refetch();
              void analytics.refetch();
              void packing.refetch();
            }}
          />
        }>
        <ReportsHeader
          rangeLabel={formatRangeLabel(resolvedRange)}
          includesTodayNote={rangeIncludesToday(resolvedRange, today) ? 'Includes today. Figures update until the day closes at 2 AM.' : undefined}
          period={period}
          onChangePeriod={(next) => {
            setPeriod(next);
            if (next === 'custom') setCustomRange(resolveReportRange('monthly', today));
          }}
          onStep={handleStep}
          onOpenExport={() => exportSheetRef.current?.present()}
        />

        {period === 'custom' ? (
          <View style={{ marginTop: theme.spacing.sm }}>
            <Text
              onPress={() => customRangeSheetRef.current?.present()}
              style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>
              Change custom range
            </Text>
          </View>
        ) : null}

        {showingCache ? (
          <View style={[styles.offlinePill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, marginTop: theme.spacing.sm }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              Last updated {formatDisplayTime(new Date(cached!.updatedAt).toISOString())} · Offline
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
            <LoadingSkeleton height={160} />
            <LoadingSkeleton height={120} />
          </View>
        ) : null}
        {firstError && !data ? <ErrorState message={mapErrorToMessage(firstError)} onRetry={() => void summary.refetch()} /> : null}

        {data ? (
          <>
            <View style={{ marginTop: theme.spacing.md }}>
              <KpiGrid items={kpis} />
            </View>

            <View style={{ marginTop: theme.spacing.sm }}>
              <PaymentMethodsCard methods={data.analytics.paymentMethods} />
            </View>
          </>
        ) : null}

        <View style={{ marginTop: theme.spacing.md }}>
          <FilterChipRow options={TABS} value={tab} onChange={setTab} />
        </View>

        <View style={{ marginTop: theme.spacing.sm }}>
          {tab === 'trend' && data ? (
            data.analytics.daily.length > 0 ? (
              <SalesTrendChart data={data.analytics.daily} />
            ) : (
              <EmptyState title="No Sales Yet" message="Sales for this range will appear here." />
            )
          ) : null}

          {tab === 'topProducts' && data ? (
            data.analytics.topProducts.length > 0 ? (
              <TopProductsList products={data.analytics.topProducts} />
            ) : (
              <EmptyState title="No Sales Yet" message="Top products for this range will appear here." />
            )
          ) : null}

          {tab === 'packing' ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => packingRangeSheetRef.current?.present()}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.sm }}>
                <Icon name="calendar" size={12} color={theme.colors.primary} />
                <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>{formatRangeLabel(packingRange)}</Text>
              </Pressable>
              {packing.isLoading ? (
                <LoadingSkeleton height={120} />
              ) : packing.error ? (
                <ErrorState message={mapErrorToMessage(packing.error)} onRetry={() => void packing.refetch()} />
              ) : packing.data && packing.data.usage.length > 0 ? (
                <PackingMaterialsList rows={packing.data.usage} />
              ) : (
                <EmptyState title="No Packing Requests" message="Packing material usage for this range will appear here." />
              )}
            </>
          ) : null}
        </View>
      </ScrollView>

      <ExportMenu ref={exportSheetRef} onExportCsv={() => void handleExportCsv()} exporting={exporting} onRequestClose={() => exportSheetRef.current?.dismiss()} />

      <DateRangeSheet
        ref={customRangeSheetRef}
        today={today}
        value={customRange}
        onApply={setCustomRange}
        onRequestClose={() => customRangeSheetRef.current?.dismiss()}
      />

      <DateRangeSheet
        ref={packingRangeSheetRef}
        today={today}
        value={packingRange}
        onApply={setPackingRangeOverride}
        onRequestClose={() => packingRangeSheetRef.current?.dismiss()}
      />
    </Screen>
  );
}
