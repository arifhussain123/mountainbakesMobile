import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  useAdminBranches,
  useAppSettings,
  usePreviousOrderBalance,
  useProductionOrder,
  useProducts,
  type PreviousOrderBalance,
  type ProductionOrder,
} from '@/api';
import { Routes } from '@/navigation';
import { useHideTabBarOnFocus } from '@/navigation/tabBar';
import type { SuperAdminOrdersStackParamList } from '@/navigation/types';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, LoadingSkeleton, Screen, StatusBadge } from '@/shared/ui';
import { formatCount, formatCurrency, formatDisplayDate } from '@/shared/utils';
import { PhotoStrip } from '../components/PhotoStrip';
import {
  PRODUCTION_ORDER_STATUS_VARIANT,
  productionOrderStatusLabel,
  slipPackingLines,
  slipReference,
  slipView,
} from '../utils/productionOrders';

function SectionTitle({ children }: { children: string }) {
  const theme = useAppTheme();
  return (
    <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginTop: theme.spacing.lg, marginBottom: 8 }]}>
      {children.toUpperCase()}
    </Text>
  );
}

function MetaKV({ k, v }: { k: string; v: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.half}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{k}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{v || '—'}</Text>
    </View>
  );
}

function Figure({ label, value, strong, align }: { label: string; value: string; strong?: boolean; align?: 'left' | 'right' }) {
  const theme = useAppTheme();
  return (
    <View style={{ flex: 1, alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: strong ? theme.colors.primary : theme.colors.text, fontWeight: strong ? '700' : '600' }]}>
        {value}
      </Text>
    </View>
  );
}

function Tag({ children }: { children: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.tag, { borderColor: theme.colors.border }]}>
      <Text style={{ fontSize: 9, fontWeight: '700', color: theme.colors.textSecondary }}>{children}</Text>
    </View>
  );
}

function TotalLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.totalLine}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: bold ? '700' : '600' }]}>{value}</Text>
    </View>
  );
}

function BoxTable({ header, rows }: { header: [string, ...string[]]; rows: ReactNode[][] }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <View style={[styles.tableRow, { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        {header.map((h, i) => (
          <Text
            key={h}
            style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', flex: i === 0 ? 2 : 1, textAlign: i === 0 ? 'left' : 'right' }]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((cells, r) => (
        <View key={r} style={[styles.tableRow, r > 0 && { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
          {cells.map((c, i) => (
            <Text
              key={i}
              style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: i === 0 ? '500' : '600', flex: i === 0 ? 2 : 1, textAlign: i === 0 ? 'left' : 'right' }]}>
              {c}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function PreviousBalanceSection({ balance, loading }: { balance: PreviousOrderBalance | undefined; loading: boolean }) {
  const theme = useAppTheme();
  const muted = [theme.typography.bodySmall, { color: theme.colors.textSecondary }];
  if (loading) {
    return (
      <Card>
        <Text style={muted}>Loading…</Text>
      </Card>
    );
  }
  if (!balance?.previous) {
    return (
      <Card>
        <Text style={muted}>No previous delivery for this branch — nothing to collect.</Text>
      </Card>
    );
  }
  const returnsQty = balance.returnItems.reduce((a, r) => a + (Number(r.qty) || 0), 0);
  const remaining = balance.remainingBalance ?? Math.max(0, balance.amountToCollect - (balance.paymentsReceivedValue ?? 0));
  const fields: { k: string; v: string; strong?: boolean }[] = [
    { k: 'Previous Order', v: `${balance.previous.demandNumber} · ${formatDisplayDate(balance.previous.date)}` },
    { k: 'Delivered Value', v: formatCurrency(balance.deliveredValue) },
    { k: 'Company Share', v: formatCurrency(balance.companyShareValue) },
    { k: 'Less Returns', v: returnsQty > 0 ? `${formatCount(returnsQty)} · ${formatCurrency(balance.returnsValue)}` : '—' },
    { k: 'Less Discount', v: balance.discountsValue > 0 ? formatCurrency(balance.discountsValue) : '—' },
    { k: 'Amount to Collect', v: formatCurrency(balance.amountToCollect), strong: true },
    { k: 'Payment Received', v: balance.paymentsReceivedValue > 0 ? formatCurrency(balance.paymentsReceivedValue) : '—' },
    { k: 'Remaining Balance', v: formatCurrency(remaining), strong: true },
  ];
  return (
    <Card>
      <View style={styles.metaGrid}>
        {fields.map((f) => (
          <View key={f.k} style={styles.half}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{f.k.toUpperCase()}</Text>
            <Text style={[theme.typography.bodySmall, { color: f.strong ? theme.colors.primary : theme.colors.text, fontWeight: f.strong ? '700' : '600' }]}>
              {f.v}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function OrderSlip({ order }: { order: ProductionOrder }) {
  const theme = useAppTheme();
  const settingsQ = useAppSettings();
  const branchesQ = useAdminBranches();
  const productsQ = useProducts();
  const balanceQ = usePreviousOrderBalance(order.id);

  const branch = (branchesQ.data?.branches ?? []).find((b) => b.id === order.branchId) ?? null;
  const livePriceById = useMemo(() => new Map((productsQ.data?.products ?? []).map((p) => [p.id, Number(p.price) || 0])), [productsQ.data]);
  const { lines, totals } = useMemo(() => slipView(order, livePriceById), [order, livePriceById]);
  const packing = useMemo(() => slipPackingLines(order), [order]);
  const balance = balanceQ.data;
  const hasDemandPhotos = (order.demandPhotos?.length ?? 0) > 0;
  const hasDeliveryPhotos = (order.verificationPhotos?.length ?? 0) > 0;

  return (
    <View>
      {/* Slip header */}
      <Card>
        <View style={styles.slipHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{settingsQ.data?.companyName || 'Mountain Bakes'}</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Production Department</Text>
            {branch?.name ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{branch.name}</Text> : null}
            {branch?.address ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                {branch.address}
                {branch.city ? `, ${branch.city}` : ''}
              </Text>
            ) : null}
            {branch?.phone ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Phone: {branch.phone}</Text> : null}
          </View>
          <StatusBadge label={productionOrderStatusLabel(order.status)} variant={PRODUCTION_ORDER_STATUS_VARIANT[order.status] ?? 'neutral'} />
        </View>
        <View style={[styles.metaGrid, { marginTop: 12, borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 }]}>
          <MetaKV k="Order #" v={slipReference(order)} />
          <MetaKV k="Demand Date" v={order.date ? formatDisplayDate(order.date) : ''} />
          <MetaKV k="Required Date" v={order.requiredDate ? formatDisplayDate(order.requiredDate) : ''} />
          <MetaKV k="Time" v={order.time} />
          <MetaKV k="Branch" v={order.branchName} />
          <MetaKV k="Requested By" v={order.createdByName} />
          <MetaKV k="Status" v={productionOrderStatusLabel(order.status)} />
        </View>
        {order.changeReason ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 10 }]}>Reason for change: {order.changeReason}</Text>
        ) : null}
        {order.cancelReason ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 10 }]}>Reason: {order.cancelReason}</Text>
        ) : null}
      </Card>

      {/* The branch's photos */}
      {hasDemandPhotos || hasDeliveryPhotos ? (
        <Card style={{ marginTop: theme.spacing.md }}>
          <PhotoStrip title="DEMAND PHOTO" photos={order.demandPhotos} />
          <PhotoStrip title={`DELIVERY PHOTO · VERIFIED BY ${(order.verifiedByName ?? '—').toUpperCase()}`} photos={order.verificationPhotos} />
        </Card>
      ) : null}

      {/* Products */}
      <SectionTitle>Products</SectionTitle>
      <View style={{ gap: 8 }}>
        {lines.map((l) => (
          <Card key={l.key} style={{ padding: 12 }}>
            <View style={styles.lineHead}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600', flexShrink: 1 }]}>{l.productName}</Text>
              {l.isSpecial ? <Tag>SPECIAL</Tag> : null}
              {l.isAdded ? <Tag>ADDED</Tag> : null}
            </View>
            {l.isSpecial && l.description ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: 2 }]}>{l.description}</Text>
            ) : null}
            <View style={[styles.figures, { borderTopColor: theme.colors.border }]}>
              <Figure label="Demand" value={l.isAdded ? '—' : formatCount(l.demand)} />
              <Figure label="Approved" value={formatCount(l.approved)} />
              <Figure label="Unit Price" value={formatCurrency(l.unitPrice)} />
              <Figure label="Amount" value={formatCurrency(l.amount)} strong align="right" />
            </View>
          </Card>
        ))}
        <View style={[styles.totalsBox, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
          <TotalLine label="Total Demand" value={formatCount(totals.demand)} />
          <TotalLine label="Total Approved" value={formatCount(totals.approved)} />
          <TotalLine label="Total Amount" value={formatCurrency(totals.amount)} bold />
        </View>
      </View>

      {/* Packing Material Demand — only when the demand has packing lines */}
      {packing.length > 0 ? (
        <>
          <SectionTitle>Packing Material Demand</SectionTitle>
          <BoxTable
            header={['Packing Material', 'Requested Qty', 'Approved Qty']}
            rows={packing.map((p) => [p.materialName, formatCount(p.requested), formatCount(p.approved)])}
          />
        </>
      ) : null}

      {/* Previous Order Balance */}
      <SectionTitle>Previous Order Balance</SectionTitle>
      {balanceQ.error ? (
        <ErrorState message={mapErrorToMessage(balanceQ.error)} onRetry={() => void balanceQ.refetch()} />
      ) : (
        <PreviousBalanceSection balance={balance} loading={balanceQ.isLoading} />
      )}
      {balance && balance.returnItems.length > 0 ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <BoxTable
            header={['Returned Product (Since Last Order)', 'Qty', 'Value']}
            rows={balance.returnItems.map((r) => [r.productName, formatCount(r.qty), formatCurrency(r.amount)])}
          />
        </View>
      ) : null}
      {balance && balance.discountItems.length > 0 ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <BoxTable
            header={['Discount Against (Since Last Order)', 'Amount']}
            rows={balance.discountItems.map((d) => [d.demandNumber, formatCurrency(d.amount)])}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Super Admin → Orders → one demand: the web's order slip (`OrderPrintPreview`)
 * read-only — header, meta, the branch's photos, the review table, packing
 * materials and the previous order's balance. Review, add-product, returns and
 * printing are not part of this phase.
 */
export function AdminOrderDetailScreen() {
  const theme = useAppTheme();
  useHideTabBarOnFocus();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<SuperAdminOrdersStackParamList, typeof Routes.SUPER_ADMIN_ORDER_DETAIL>>();
  const orderQ = useProductionOrder(route.params.orderId);
  const order = orderQ.data?.order;

  return (
    <Screen>
      <AppHeader
        title={order?.demandNumber ?? 'Order'}
        subtitle={order ? slipReference(order) : undefined}
        actions={[{ icon: 'close', onPress: () => navigation.goBack(), accessibilityLabel: 'Close' }]}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}>
        {orderQ.isLoading ? <LoadingSkeleton height={240} /> : null}
        {orderQ.error ? <ErrorState message={mapErrorToMessage(orderQ.error)} onRetry={() => void orderQ.refetch()} /> : null}
        {order ? <OrderSlip order={order} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  slipHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  half: { width: '50%', paddingRight: 8 },
  lineHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  tag: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  figures: { flexDirection: 'row', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  totalsBox: { padding: 12, gap: 4 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between' },
  box: { borderWidth: 1, paddingHorizontal: 12 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
});
