import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Alert, Pressable, RefreshControl, ScrollView, Share, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { getBusinessDate, getReportExportCsv, useReportSummary, useSalesAnalytics, usePackingUsage } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { useNetworkStatus } from '@/shared/hooks';
import { getCachedResponse, setCachedResponse } from '@/shared/offline';
import { DateRangeSheet, EmptyState, ErrorState, Icon, InfoBanner, LoadingSkeleton, Screen, SegmentedControl, type SegmentedOption } from '@/shared/ui';
import { formatCurrency, formatDisplayTime } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import {
  ExportMenu,
  KpiGrid,
  PackingMaterialsList,
  PaymentMethodsCard,
  ReportsHeader,
  ReportsHero,
  SalesTrendChart,
  TopProductsList,
  type KpiItem,
} from '../../components';
import { computeAvgOrderValue, computeNet } from '../../calculations';
import { formatRangeLabel, rangeIncludesToday, resolveReportRange, stepReportRange, type ReportRange, type UiReportPeriod } from '../../ranges';
import { styles } from './styles';

const TABS: SegmentedOption<'trend' | 'topProducts' | 'packing'>[] = [
  { value: 'trend', label: 'Trend' },
  { value: 'topProducts', label: 'Top products' },
  { value: 'packing', label: 'Packing' },
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
  const revenueDelta = comparison && comparison.changePct !== null ? { pct: comparison.changePct, direction: comparison.direction } : undefined;
  // 2026 redesign B23: Revenue, orders, net and expenses sit on the violet hero; the pastel tiles carry the rest.
  const kpis: KpiItem[] = data
    ? [
        { id: 'avg', label: 'Avg order value', value: formatCurrency(computeAvgOrderValue(data.summary.totalRevenue, data.summary.totalOrders, data.summary.totalCancelled)), icon: 'bar-chart' },
        { id: 'cancelled', label: 'Cancelled', value: String(data.summary.totalCancelled), icon: 'rotate-ccw', muted: data.summary.totalCancelled === 0 },
      ]
    : [];

  const isLoading = (summary.isLoading || analytics.isLoading) && !data;
  const firstError = summary.error ?? analytics.error;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xxl, gap: theme.spacing.lg }}
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
          onPressRange={period === 'custom' ? () => customRangeSheetRef.current?.present() : undefined}
        />

        <SegmentedControl options={TABS} value={tab} onChange={setTab} />

        {showingCache ? (
          <InfoBanner kind="warn" icon="clock">
            {`Last updated ${formatDisplayTime(new Date(cached!.updatedAt).toISOString())} · Offline`}
          </InfoBanner>
        ) : null}

        {isLoading ? (
          <View style={{ gap: theme.spacing.md }}>
            <LoadingSkeleton height={160} />
            <LoadingSkeleton height={120} />
          </View>
        ) : null}
        {firstError && !data ? <ErrorState message={mapErrorToMessage(firstError)} onRetry={() => void summary.refetch()} /> : null}

        {data ? (
          <>
            <ReportsHero
              revenue={formatCurrency(data.summary.totalRevenue)}
              totalOrders={data.summary.totalOrders}
              net={formatCurrency(computeNet(data.summary.totalRevenue, data.summary.totalExpenses))}
              expenses={formatCurrency(data.summary.totalExpenses)}
              delta={revenueDelta}
            />
            <KpiGrid items={kpis} />
          </>
        ) : null}

        {tab === 'trend' && data ? (
          data.analytics.daily.length > 0 ? (
            <SalesTrendChart data={data.analytics.daily} />
          ) : (
            <EmptyState icon="bar-chart" title="No Sales Yet" message="Sales for this range will appear here." />
          )
        ) : null}

        {tab === 'topProducts' && data ? (
          data.analytics.topProducts.length > 0 ? (
            <TopProductsList products={data.analytics.topProducts} />
          ) : (
            <EmptyState icon="bar-chart" title="No Sales Yet" message="Top products for this range will appear here." />
          )
        ) : null}

        {tab === 'packing' ? (
          <View style={{ gap: theme.spacing.md }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Packing range ${formatRangeLabel(packingRange)}. Change`}
              onPress={() => packingRangeSheetRef.current?.present()}
              style={[
                styles.rangeChip,
                { backgroundColor: theme.colors.cardFill, borderColor: theme.isDark ? theme.colors.border : '#E6E1FA' },
              ]}>
              <Icon name="calendar" size={16} color={theme.colors.textFaint} />
              <Text style={[styles.rangeText, { color: theme.colors.text }]} numberOfLines={1}>
                {formatRangeLabel(packingRange)}
              </Text>
              <Text style={[styles.rangeChange, { color: theme.colors.primary }]}>Change</Text>
            </Pressable>
            {packing.isLoading ? (
              <LoadingSkeleton height={120} />
            ) : packing.error ? (
              <ErrorState message={mapErrorToMessage(packing.error)} onRetry={() => void packing.refetch()} />
            ) : packing.data && packing.data.usage.length > 0 ? (
              <PackingMaterialsList rows={packing.data.usage} />
            ) : (
              <EmptyState icon="box" title="No Packing Requests" message="Packing material usage for this range will appear here." />
            )}
          </View>
        ) : null}

        {data ? <PaymentMethodsCard methods={data.analytics.paymentMethods} /> : null}
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
