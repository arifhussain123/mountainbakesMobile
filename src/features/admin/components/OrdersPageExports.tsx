import { useMemo, useRef, useState, type ReactElement } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  exportCollectionsCsv,
  getBusinessDate,
  productionOrdersExportParams,
  useAppSettings,
  useBranches,
  useProducts,
  type ProductionOrder,
  type ProductionOrdersDataQuery,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { DateField, Dropdown, FormBottomSheet, PrimaryButton, SecondaryButton, type DropdownOption } from '@/shared/ui';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import {
  DEMAND_PRINT_FORMATS,
  EXCEL_ON_WEB,
  buildDemandSnapshot,
  buildDemandSummaryPrintText,
  collectionsFileName,
  collectionsWindow,
  hasDemandToPrint,
} from '../utils/exports';
import { ActionChip } from './ActionChip';
import { dataTableExportOptions, dataTableExportable, shareText, useExportSheet } from './ExportSheet';

const ALL = 'all';

/**
 * Web `CollectionsExportModal`: branch + date window → the Collections sheet
 * (`/production-reports/export?report=collections`), one row per billed
 * delivery. Mounted only while open, so it always starts at today / all branches.
 */
function CollectionsForm({ onClose }: { onClose: () => void }) {
  const theme = useAppTheme();
  const today = getBusinessDate();
  const branchesQ = useBranches();
  const [branchId, setBranchId] = useState<string>(ALL);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const branches = useMemo(() => branchesQ.data?.branches ?? [], [branchesQ.data]);
  const options = useMemo<DropdownOption[]>(() => [{ value: ALL, label: 'All branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))], [branches]);

  const run = async () => {
    const w = collectionsWindow(from, to, today);
    const branch = branchId === ALL ? null : branchId;
    setBusy(true);
    try {
      const csv = await exportCollectionsCsv({ from: w.from, to: w.to, branchId: branch });
      await shareText(collectionsFileName(w.from, w.to, branch === null ? null : (branches.find((b) => b.id === branch)?.name ?? 'branch')), csv);
      onClose();
    } catch (e) {
      Alert.alert('Could Not Export', mapErrorToMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 6 }]}>Branch</Text>
        <Dropdown options={options} value={branchId} onChange={setBranchId} loading={branchesQ.isLoading} />
      </View>
      <View style={styles.pair}>
        <View style={{ flex: 1 }}>
          <DateField label="From" value={from} onChange={(v) => setFrom(v || today)} maximumDate={to || today} />
        </View>
        <View style={{ flex: 1 }}>
          <DateField label="To" value={to} onChange={(v) => setTo(v || today)} minimumDate={from} maximumDate={today} />
        </View>
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
        A delivery is billed against the one after it, so each branch&apos;s most recent delivery has no amount yet. The sheet&apos;s last line counts
        any held back.
      </Text>
      <View style={styles.pair}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Cancel" onPress={onClose} disabled={busy} />
        </View>
        <View style={{ flex: 1.4 }}>
          <PrimaryButton label="Export CSV" onPress={() => void run()} loading={busy} />
        </View>
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint, textAlign: 'center' }]}>{EXCEL_ON_WEB}.</Text>
    </View>
  );
}

/**
 * The Orders page's exports, as the web places them: "Print for Production"
 * on the Demand Summary card (POS 80mm / 58mm / A4 report of every waiting
 * demand), and "Export Collections" + the table's Export menu beside the
 * Orders heading. Returns the chips to place and one `element` (the sheets)
 * to render once.
 */
export function useOrdersPageExports({
  waitingOrders,
  stockByProduct,
  query,
  loadedPages,
  loadedRows,
  total,
}: {
  waitingOrders: ProductionOrder[];
  stockByProduct: Map<string, number> | null;
  query: ProductionOrdersDataQuery;
  loadedPages: number;
  loadedRows: number;
  total: number | null;
}): { printChip: ReactElement; ordersChips: ReactElement; element: ReactElement } {
  const theme = useAppTheme();
  const sheet = useExportSheet();
  const collectionsRef = useRef<BottomSheetModal>(null);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const settingsQ = useAppSettings();
  const productsQ = useProducts();

  const livePriceById = useMemo(() => new Map((productsQ.data?.products ?? []).map((p) => [p.id, Number(p.price) || 0])), [productsQ.data]);
  const snapshot = useMemo(() => buildDemandSnapshot(waitingOrders, livePriceById, stockByProduct), [waitingOrders, livePriceById, stockByProduct]);
  const printable = hasDemandToPrint(snapshot);

  const openPrint = () => {
    const now = new Date();
    const ctx = {
      companyName: settingsQ.data?.companyName || 'Mountain Bakes',
      currencySymbol: settingsQ.data?.currencySymbol || 'Rs.',
      businessDateText: formatDisplayDate(getBusinessDate()),
      printDateText: formatDisplayDate(getBusinessDate()),
      printTimeText: formatDisplayTime(now.toISOString()),
    };
    sheet.open({
      title: 'Print Production Demand Summary',
      subtitle: "Every waiting order's demand, consolidated by product, packing material, and branch.",
      options: DEMAND_PRINT_FORMATS.map((f) => ({
        key: f.value,
        section: 'Format',
        label: f.label,
        icon: 'printer' as const,
        hint: productsQ.isLoading ? 'Loading prices…' : snapshot.totals.grandAmount === null ? 'Some demand could not be priced — amounts show as unavailable' : undefined,
        disabled: productsQ.isLoading,
        errorTitle: 'Printing Failed',
        run: () => shareText('Production Demand Summary', buildDemandSummaryPrintText(snapshot, ctx, f.value)),
      })),
    });
  };

  const table = { resource: 'productionOrders', fileName: 'production-orders', params: productionOrdersExportParams(query), pageSize: 20, loadedPages, loadedRows, total };

  const printChip = <ActionChip icon="printer" label="Print for Production" onPress={openPrint} disabled={!printable} />;
  const ordersChips = (
    <View style={[styles.row, { marginBottom: theme.spacing.sm }]}>
      <ActionChip
        icon="file-spreadsheet"
        label="Export Collections"
        onPress={() => {
          setCollectionsOpen(true);
          collectionsRef.current?.present();
        }}
      />
      <ActionChip
        icon="file-spreadsheet"
        label="Export"
        onPress={() => sheet.open({ title: 'Export Orders', options: dataTableExportOptions(table) })}
        disabled={!dataTableExportable(table)}
      />
    </View>
  );
  const element = (
    <>
      {sheet.element}
      <FormBottomSheet
        ref={collectionsRef}
        title="Collections"
        subtitle="One row per delivery — delivered value, company share, returns, discount and the amount to collect."
        onRequestClose={() => collectionsRef.current?.dismiss()}
        onDismiss={() => setCollectionsOpen(false)}>
        {collectionsOpen ? <CollectionsForm onClose={() => collectionsRef.current?.dismiss()} /> : null}
      </FormBottomSheet>
    </>
  );
  return { printChip, ordersChips, element };
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
