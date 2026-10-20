import { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  getBusinessDate,
  markProductionOrderPrinted,
  useAdminBranches,
  useAppSettings,
  usePreviousOrderBalance,
  useProducts,
  type ProductionOrder,
} from '@/api';
import { buildOrderChallanText, buildOrderPopText, buildProductionCheckText, type SlipPrintInput } from '@/features/orders/utils/productionOrderPrint';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { formatDisplayDate, formatDisplayTime, logger } from '@/shared/utils';
import { slipPackingLines, slipView, type QtyEdits } from '../utils/productionOrders';
import { ActionChip } from './ActionChip';
import { shareText } from './ExportSheet';

/**
 * The order slip's print buttons (web `OrderPrintPreview` action bar):
 * Production Check (pending only — the floor's stock-check sheet), POP Print
 * (the receipt) and A4 Challan (Customer + Company copies). Each prints what
 * the slip shows — typed quantities included while pending — as text into the
 * Share sheet. A4 Challan and POP Print flag the slip printed on the server
 * exactly as the web does (fire-and-forget: a failed flag never turns a
 * printed slip into an error); Production Check never does.
 */
export function OrderPrintActions({
  order,
  edits,
  packingEdits,
  disabled,
}: {
  order: ProductionOrder;
  edits: QtyEdits;
  packingEdits: QtyEdits;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  const settingsQ = useAppSettings();
  const branchesQ = useAdminBranches();
  const productsQ = useProducts();
  const balanceQ = usePreviousOrderBalance(order.id);

  const livePriceById = useMemo(() => new Map((productsQ.data?.products ?? []).map((p) => [p.id, Number(p.price) || 0])), [productsQ.data]);

  /** Built at the press, so the print stamp is the moment of printing. */
  const input = (): SlipPrintInput => {
    const now = new Date();
    // Zero-approved lines are dropped by the builders, frozen or not.
    const { lines } = slipView(order, livePriceById, edits);
    return {
      order,
      branchName: (branchesQ.data?.branches ?? []).find((b) => b.id === order.branchId)?.name ?? null,
      companyName: settingsQ.data?.companyName || 'Mountain Bakes',
      currencySymbol: settingsQ.data?.currencySymbol || 'Rs.',
      lines: lines.map((l) => ({ productName: l.productName, approved: l.approved, unitPrice: l.unitPrice, amount: l.amount })),
      packing: slipPackingLines(order, packingEdits).map((p) => ({ materialName: p.materialName, qty: p.approved })),
      balance: balanceQ.isLoading ? undefined : (balanceQ.data ?? null),
      printDate: formatDisplayDate(getBusinessDate()),
      printTime: formatDisplayTime(now.toISOString()),
    };
  };

  const markPrinted = () => {
    markProductionOrderPrinted(order.id).catch((e: unknown) => logger.warn('markPrinted failed', { orderId: order.id, error: mapErrorToMessage(e) }));
  };

  const share = async (title: string, text: string): Promise<boolean> => {
    try {
      await shareText(title, text);
      return true;
    } catch (e) {
      Alert.alert('Could Not Print', mapErrorToMessage(e));
      return false;
    }
  };

  const popPrint = async () => {
    if (await share(`${order.demandNumber} — POP Print`, buildOrderPopText(input()))) markPrinted();
  };
  const a4Challan = () => {
    // The web flags the challan printed on the press, before the print dialog.
    markPrinted();
    void share(`${order.demandNumber} — A4 Challan`, buildOrderChallanText(input()));
  };
  const productionCheck = () => void share(`${order.demandNumber} — Production Check`, buildProductionCheckText(input()));

  return (
    <View style={{ marginTop: theme.spacing.lg, gap: 8 }}>
      <View style={styles.row}>
        {order.status === 'pending' ? <ActionChip icon="file-list" label="Production Check" onPress={productionCheck} disabled={disabled} /> : null}
        <ActionChip icon="printer" label="POP Print" onPress={() => void popPrint()} disabled={disabled} />
        <ActionChip icon="file-spreadsheet" label="A4 Challan" onPress={a4Challan} disabled={disabled} />
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
        POP Print shares the receipt; A4 Challan shares one page — Customer Copy on top, Company Copy below the cut line. Route either to a print
        service from the share sheet. The A4 PDF is made on the web.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
