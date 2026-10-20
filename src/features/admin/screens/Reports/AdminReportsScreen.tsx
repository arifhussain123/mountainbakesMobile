import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  getBusinessDate,
  getBusinessMonthStart,
  getReportExportCsv,
  useAdminReportSummary,
  useAllPackingMaterials,
  useBranches,
  usePackingUsagePages,
  type PackingUsageRow,
  type PackingUsageSortKey,
} from '@/api';
import { KpiGrid, type KpiItem } from '@/features/reports/components';
import { useAppTheme } from '@/shared/theme';
import { mapErrorToMessage } from '@/shared/helpers';
import {
  AppHeader,
  Card,
  DateRangeSheet,
  Dropdown,
  EmptyState,
  ErrorState,
  FilterChipRow,
  Icon,
  LoadingSkeleton,
  Screen,
  type DropdownOption,
  type FilterChipOption,
} from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { ActiveFilterChips, FieldGrid, SortControl } from '../../components';
import { activeChips, chipLabel, rangeChipLabel, toSortPair, type SortField, type SortState } from '../../utils/listControls';
import { useAdminHeaderActions } from '../../components/useAdminHeaderActions';
import { shareText, useExportSheet } from '../../components/ExportSheet';
import { EXCEL_ON_WEB, PDF_ON_WEB, buildReportsPrintText } from '../../utils/exports';
import { BranchPerformanceCard, DailySalesChartCard, PaymentMethodsSummaryCard, TopProductsDonutCard, TopTenProductsCard } from './reportCharts';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';
type Tab = 'sales' | 'branches' | 'products' | 'packing';

const PERIODS: FilterChipOption<Period>[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'yearly', label: 'This Year' },
];

const TABS: FilterChipOption<Tab>[] = [
  { value: 'sales', label: 'Sales Trend' },
  { value: 'branches', label: 'Branch Comparison' },
  { value: 'products', label: 'Top Products' },
  { value: 'packing', label: 'Packing Materials' },
];

const ALL = 'all';

/** The web Packing Materials table's sortable columns, sorted by the server (`sortBy` / `sortDir`). */
const PACKING_SORT_FIELDS: SortField<PackingUsageRow>[] = [
  { key: 'date', label: 'Date', kind: 'date' },
  { key: 'materialName', label: 'Packing Material', kind: 'text' },
  { key: 'branchName', label: 'Branch', kind: 'text' },
  { key: 'requestedQty', label: 'Requested Qty', kind: 'number' },
  { key: 'approvedQty', label: 'Approved Qty', kind: 'number' },
  { key: 'deliveredQty', label: 'Delivered Qty', kind: 'number' },
];

const rs = (n: number) => `Rs.${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

/**
 * Super Admin → Reports & Analytics (web /reports, `ReportsPage` as super_admin).
 * Every figure on the page comes from ONE call — `GET /reports/summary?period=`
 * without `fields=basic` — across all branches. The Packing Materials tab has
 * its own date range, branch and material filters and its own server-paged
 * call (`GET /reports/packing-usage`), with the web table's sortable columns
 * and active-filter chips. Read-only; the CSV export and Print are shared as
 * text (this app has no file module for PDF/Excel, which stay listed, disabled).
 *
 * Kept separate from the branch manager's `ReportsScreen`, which reads a
 * different shape (`/sales-analytics`) for one branch.
 */
export function AdminReportsScreen() {
  const theme = useAppTheme();
  const rangeSheetRef = useRef<BottomSheetModal>(null);
  const today = getBusinessDate();

  const [period, setPeriod] = useState<Period>('monthly');
  const [tab, setTab] = useState<Tab>('sales');

  const q = useAdminReportSummary(period);
  const s = q.data;

  // ── Packing Materials: own filters, default month to date ──
  const defaultPackRange = { from: getBusinessMonthStart(), to: today };
  const [packRange, setPackRange] = useState(defaultPackRange);
  const [packSort, setPackSort] = useState<SortState | null>(null);
  const [packBranch, setPackBranch] = useState<string>(ALL);
  const [packMaterial, setPackMaterial] = useState<string>(ALL);
  const branchesQ = useBranches();
  const materialsQ = useAllPackingMaterials();
  const branchOptions = useMemo<DropdownOption[]>(
    () => [{ value: ALL, label: 'All branches' }, ...(branchesQ.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [branchesQ.data],
  );
  const materialOptions = useMemo<DropdownOption[]>(
    () => [
      { value: ALL, label: 'All packing materials' },
      ...(materialsQ.data?.packingMaterials ?? []).map((m) => ({ value: m.id, label: m.materialName, hint: m.isActive ? undefined : 'Inactive' })),
    ],
    [materialsQ.data],
  );
  const packing = usePackingUsagePages({
    from: packRange.from,
    to: packRange.to,
    branchId: packBranch === ALL ? null : packBranch,
    packingMaterialId: packMaterial === ALL ? null : packMaterial,
    ...toSortPair<PackingUsageSortKey>(packSort),
  });
  const packRows = useMemo(() => packing.data?.pages.flatMap((p) => p.usage) ?? [], [packing.data]);
  const packTotals = packing.data?.pages[0]?.totals ?? { requested: 0, approved: 0, delivered: 0 };
  const packTotal = packing.data?.pages[0]?.pagination?.total ?? packing.data?.pages[0]?.total ?? 0;

  // The web's chips name only what differs from the defaults — month to date is not a chip.
  const packDateChanged = packRange.from !== defaultPackRange.from || packRange.to !== defaultPackRange.to;
  const packChips = activeChips([
    packDateChanged && {
      key: 'businessDate',
      label: rangeChipLabel('Date', packRange.from, packRange.to, formatDisplayDate),
      onRemove: () => setPackRange(defaultPackRange),
    },
    packBranch !== ALL && {
      key: 'branchId',
      label: chipLabel('Branch', branchOptions.find((o) => o.value === packBranch)?.label ?? 'Branch'),
      onRemove: () => setPackBranch(ALL),
    },
    packMaterial !== ALL && {
      key: 'packingMaterialId',
      label: chipLabel('Packing Material', materialOptions.find((o) => o.value === packMaterial)?.label ?? 'Packing Material'),
      onRemove: () => setPackMaterial(ALL),
    },
  ]);
  const clearPackFilters = () => {
    setPackRange(defaultPackRange);
    setPackBranch(ALL);
    setPackMaterial(ALL);
  };

  // The web's PDF · Excel · CSV · Print buttons, in one sheet. PDF and Excel
  // are binary files the phone cannot share; CSV is the server's own file;
  // Print is the page (stats, payment methods, the open tab) as text.
  const exportSheet = useExportSheet();
  const openExport = () =>
    exportSheet.open({
      title: 'Reports & Analytics',
      subtitle: s ? `${s.from.slice(0, 10)} – ${s.to.slice(0, 10)}` : undefined,
      options: [
        { key: 'pdf', section: 'Export', label: 'PDF', icon: 'file-list', hint: PDF_ON_WEB, disabled: true },
        { key: 'excel', section: 'Export', label: 'Excel', hint: EXCEL_ON_WEB, disabled: true },
        {
          key: 'csv',
          section: 'Export',
          label: 'CSV',
          hint: 'The period’s report, shared as text',
          errorTitle: 'Export failed',
          run: async () => shareText(`mountain-bakes-report-${period}.csv`, await getReportExportCsv(period)),
        },
        {
          key: 'print',
          section: 'Print',
          label: 'Print',
          icon: 'printer',
          hint: 'This page as a text document — route it to a print service',
          disabled: !s,
          errorTitle: 'Could Not Print',
          run: async () =>
            s &&
            shareText(
              `Reports & Analytics ${s.from.slice(0, 10)} – ${s.to.slice(0, 10)}`,
              buildReportsPrintText(
                s,
                tab,
                tab === 'packing'
                  ? {
                      rangeText: `${formatDisplayDate(packRange.from)} – ${formatDisplayDate(packRange.to)}`,
                      branchLabel: branchOptions.find((o) => o.value === packBranch)?.label ?? 'All branches',
                      materialLabel: materialOptions.find((o) => o.value === packMaterial)?.label ?? 'All packing materials',
                      totals: packTotals,
                      rows: packRows,
                      total: packTotal,
                    }
                  : undefined,
              ),
            ),
        },
      ],
    });

  const tiles: KpiItem[] = s
    ? [
        { id: 'orders', label: 'Total Orders', value: s.totalOrders.toLocaleString('en-US'), icon: 'cart' },
        { id: 'revenue', label: 'Revenue', value: rs(s.totalRevenue), icon: 'wallet' },
        { id: 'aov', label: 'Avg. Order Value', value: rs(s.averageOrderValue), icon: 'bar-chart' },
        { id: 'cancelled', label: 'Cancelled', value: String(s.totalCancelled), icon: 'trending-down' },
        { id: 'expenses', label: 'Expenses', value: rs(s.totalExpenses), icon: 'receipt' },
        { id: 'profit', label: 'Profit (Sales − Expenses)', value: rs(s.totalProfit), icon: 'trending-up' },
      ]
    : [];

  const summaryLoading = q.isLoading && !s;

  const tabBody = (() => {
    if (tab === 'packing') return null;
    if (summaryLoading) return <LoadingSkeleton height={240} />;
    if (!s) return null;
    if (tab === 'sales') return <DailySalesChartCard data={s.dailyData ?? []} />;
    if (tab === 'branches') return <BranchPerformanceCard data={s.branchData ?? []} />;
    return (
      <View style={{ gap: 10 }}>
        <TopProductsDonutCard data={s.topProducts ?? []} />
        <TopTenProductsCard data={s.topProducts ?? []} />
      </View>
    );
  })();

  const packingHeader =
    tab === 'packing' ? (
      <View style={{ gap: 10 }}>
        <Card style={{ gap: 10, padding: theme.spacing.md }}>
          <View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 4 }]}>Date</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Date range ${formatDisplayDate(packRange.from)} to ${formatDisplayDate(packRange.to)}`}
              onPress={() => rangeSheetRef.current?.present()}
              style={[styles.field, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
              <Icon name="calendar" size={14} color={theme.colors.primary} />
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>
                {formatDisplayDate(packRange.from)} – {formatDisplayDate(packRange.to)}
              </Text>
            </Pressable>
          </View>
          <View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 4 }]}>Branch</Text>
            <Dropdown options={branchOptions} value={packBranch} onChange={setPackBranch} loading={branchesQ.isLoading} />
          </View>
          <View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 4 }]}>Packing Material</Text>
            <Dropdown options={materialOptions} value={packMaterial} onChange={setPackMaterial} loading={materialsQ.isLoading} />
          </View>
          <SortControl fields={PACKING_SORT_FIELDS} value={packSort} onChange={setPackSort} defaultLabel="Newest date first" />
        </Card>
        <ActiveFilterChips chips={packChips} onClearAll={clearPackFilters} />

        {/* Summed server-side over the WHOLE filtered range, never just the pages loaded. */}
        <View style={styles.totals}>
          {(
            [
              ['Total Requested', packTotals.requested, false],
              ['Total Approved', packTotals.approved, false],
              ['Total Delivered', packTotals.delivered, true],
            ] as const
          ).map(([label, value, accent]) => (
            <Card
              key={label}
              style={[styles.totalTile, accent && { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}14` }]}>
              <Text style={[theme.typography.label, { color: accent ? theme.colors.primary : theme.colors.textSecondary }]} numberOfLines={1}>
                {label}
              </Text>
              <Text style={[theme.typography.cardTitle, { color: accent ? theme.colors.primary : theme.colors.text, marginTop: 2 }]}>
                {value.toLocaleString('en-US')}
              </Text>
            </Card>
          ))}
        </View>
        {packing.data ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {packTotal.toLocaleString('en-US')} {packTotal === 1 ? 'row' : 'rows'}
          </Text>
        ) : null}
        {packing.isLoading ? <LoadingSkeleton height={160} /> : null}
        {packing.error ? <ErrorState message={mapErrorToMessage(packing.error)} onRetry={() => void packing.refetch()} /> : null}
      </View>
    ) : null;

  const header = (
    <View style={{ gap: 12, marginBottom: theme.spacing.sm }}>
      <FilterChipRow options={PERIODS} value={period} onChange={setPeriod} />
      {summaryLoading ? <LoadingSkeleton height={200} /> : null}
      {q.error && !s ? <ErrorState message={mapErrorToMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
      {s ? (
        <>
          <KpiGrid items={tiles} />
          <PaymentMethodsSummaryCard methods={s.paymentMethodBreakdown ?? []} />
        </>
      ) : null}
      <FilterChipRow options={TABS} value={tab} onChange={setTab} />
      {tabBody}
      {packingHeader}
    </View>
  );

  const renderPackingRow = ({ item }: { item: PackingUsageRow }) => (
    <Card style={{ padding: 14 }}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={2}>
            {item.materialName}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {item.branchName}
          </Text>
        </View>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{formatDisplayDate(item.date)}</Text>
      </View>
      <FieldGrid
        items={[
          { label: 'Requested Qty', value: item.requestedQty.toLocaleString('en-US') },
          { label: 'Approved Qty', value: item.approvedQty.toLocaleString('en-US'), valueStyle: { fontWeight: '700' } },
          { label: 'Delivered Qty', value: item.deliveredQty.toLocaleString('en-US') },
        ]}
      />
    </Card>
  );

  const showPackingRows = tab === 'packing' && !packing.isLoading && !packing.error;
  const headerActions = useAdminHeaderActions({
    extras: [{ icon: 'file-spreadsheet', onPress: openExport, accessibilityLabel: 'Export or print' }],
  });

  return (
    <Screen>
      <AppHeader
        title="Reports & Analytics"
        subtitle={s ? `${s.from.slice(0, 10)} – ${s.to.slice(0, 10)}` : 'Loading…'}
        actions={headerActions}
      />
      <FlatList
        data={showPackingRows ? packRows : []}
        keyExtractor={(r) => `${r.date}|${r.branchId}|${r.packingMaterialId ?? r.materialName}`}
        renderItem={renderPackingRow}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 3, gap: 8 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          showPackingRows && packing.data ? (
            <EmptyState title="No packing material requests" message="Nothing was requested for this range and filter." />
          ) : undefined
        }
        ListFooterComponent={
          tab === 'packing' && packing.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: theme.spacing.md }} color={theme.colors.primary} /> : undefined
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (tab === 'packing' && packing.hasNextPage && !packing.isFetchingNextPage) void packing.fetchNextPage();
        }}
        refreshing={q.isRefetching || (tab === 'packing' && packing.isRefetching && !packing.isFetchingNextPage)}
        onRefresh={() => {
          void q.refetch();
          if (tab === 'packing') void packing.refetch();
        }}
      />
      <DateRangeSheet
        ref={rangeSheetRef}
        today={today}
        value={packRange}
        onApply={setPackRange}
        onRequestClose={() => rangeSheetRef.current?.dismiss()}
      />
      {exportSheet.element}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { height: 44, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  totals: { flexDirection: 'row', gap: 8 },
  totalTile: { flex: 1, padding: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
});
