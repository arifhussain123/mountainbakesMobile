import { useMemo, useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  useAddProductionOrderItem,
  useAdminBranches,
  useAppSettings,
  useCreateProductionReturn,
  useFinalApproveProductionOrder,
  usePreviousOrderBalance,
  useProductionOrder,
  useProducts,
  useReviewProductionOrder,
  type PreviousOrderBalance,
  type Product,
  type ProductionOrder,
} from '@/api';
import { Routes } from '@/navigation';
import { useHideTabBarOnFocus } from '@/navigation/tabBar';
import type { SuperAdminOrdersStackParamList } from '@/navigation/types';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  Card,
  Dropdown,
  ErrorState,
  Icon,
  LoadingSkeleton,
  PrimaryButton,
  QtyStepper,
  Screen,
  SecondaryButton,
  StatusBadge,
  TextField,
} from '@/shared/ui';
import { formatCount, formatCurrency, formatDisplayDate } from '@/shared/utils';
import { PhotoStrip } from '../components/PhotoStrip';
import { OrderPrintActions } from '../components/OrderPrintActions';
import {
  PRODUCTION_ORDER_STATUS_VARIANT,
  addableProducts,
  productionOrderStatusLabel,
  returnableItems,
  reviewSubmission,
  shortageFromError,
  slipPackingLines,
  slipReference,
  slipView,
  type QtyEdits,
  type StockShortageNotice,
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

interface QtyEditing {
  editing: boolean;
  edits: QtyEdits;
  packingEdits: QtyEdits;
  setEdit: (productId: string, qty: number | null) => void;
  setPackingEdit: (packingMaterialId: string, qty: number | null) => void;
}

function OrderSlip({ order, qty }: { order: ProductionOrder; qty: QtyEditing }) {
  const theme = useAppTheme();
  const settingsQ = useAppSettings();
  const branchesQ = useAdminBranches();
  const productsQ = useProducts();
  const balanceQ = usePreviousOrderBalance(order.id);

  const branch = (branchesQ.data?.branches ?? []).find((b) => b.id === order.branchId) ?? null;
  const livePriceById = useMemo(() => new Map((productsQ.data?.products ?? []).map((p) => [p.id, Number(p.price) || 0])), [productsQ.data]);
  const { lines, totals } = useMemo(() => slipView(order, livePriceById, qty.edits), [order, livePriceById, qty.edits]);
  const packing = useMemo(() => slipPackingLines(order, qty.packingEdits), [order, qty.packingEdits]);
  const editable = qty.editing && order.status === 'pending';
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
            {editable ? (
              <View style={styles.qtyRow}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>APPROVED QTY</Text>
                <QtyStepper
                  value={qty.edits[l.productId] === undefined ? l.approved : qty.edits[l.productId] ?? null}
                  onChange={(v) => qty.setEdit(l.productId, v)}
                  accessibilityLabel={`Approved quantity for ${l.productName}`}
                />
              </View>
            ) : null}
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
          {editable ? (
            <View style={{ gap: 8 }}>
              {packing.map((p) => (
                <Card key={p.key} style={{ padding: 12 }}>
                  <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>{p.materialName}</Text>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                    Requested {formatCount(p.requested)}
                  </Text>
                  <View style={styles.qtyRow}>
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>APPROVED QTY</Text>
                    <QtyStepper
                      value={qty.packingEdits[p.packingMaterialId] === undefined ? p.approved : qty.packingEdits[p.packingMaterialId] ?? null}
                      onChange={(v) => qty.setPackingEdit(p.packingMaterialId, v)}
                      accessibilityLabel={`Approved quantity for ${p.materialName}`}
                    />
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <BoxTable
              header={['Packing Material', 'Requested Qty', 'Approved Qty']}
              rows={packing.map((p) => [p.materialName, formatCount(p.requested), formatCount(p.approved)])}
            />
          )}
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

function ShortageCard({ notice }: { notice: StockShortageNotice }) {
  const theme = useAppTheme();
  return (
    <Card style={{ marginTop: theme.spacing.lg, borderColor: theme.colors.danger, borderWidth: 1 }}>
      <View style={styles.noticeHead}>
        <Icon name="warning" size={16} color={theme.colors.danger} />
        <Text style={[theme.typography.cardTitle, { color: theme.colors.danger, flex: 1 }]}>{notice.title}</Text>
      </View>
      {notice.messages.map((m) => (
        <Text key={m} style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 6 }]}>
          {m}
        </Text>
      ))}
      {notice.shortages.length > 0 ? (
        <View style={{ marginTop: 10 }}>
          <BoxTable
            header={['Product', 'Required', 'Available', 'Short']}
            rows={notice.shortages.map((x) => [x.productName, formatCount(x.required), formatCount(x.available), formatCount(x.short)])}
          />
        </View>
      ) : null}
      {notice.after.map((m) => (
        <Text key={m} style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 6 }]}>
          {m}
        </Text>
      ))}
    </Card>
  );
}

function InfoCard({ title, lines }: { title: string; lines: string[] }) {
  const theme = useAppTheme();
  return (
    <Card style={{ marginTop: theme.spacing.lg }}>
      <View style={styles.noticeHead}>
        <Icon name="info" size={16} color={theme.colors.primary} />
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text, flex: 1 }]}>{title}</Text>
      </View>
      {lines.map((m) => (
        <Text key={m} style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 6 }]}>
          {m}
        </Text>
      ))}
    </Card>
  );
}

/** Add a product the branch never asked for — while the demand is still pending only. */
function AddProductForm({ order, products, loading, onDone }: { order: ProductionOrder; products: Product[]; loading: boolean; onDone: () => void }) {
  const theme = useAppTheme();
  const addItem = useAddProductionOrderItem();
  const [productId, setProductId] = useState<string | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const options = useMemo(() => addableProducts(products, order).map((p) => ({ value: p.id, label: p.name })), [products, order]);

  const submit = () => {
    if (!productId || !qty || qty <= 0) return;
    addItem.mutate(
      { id: order.id, productId, qty },
      {
        onSuccess: () => {
          Alert.alert('Product Added', 'Product added to the demand.');
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Add Product', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <Card style={{ marginTop: theme.spacing.lg }}>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Add Product</Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 10, marginBottom: 6 }]}>PRODUCT</Text>
      <Dropdown
        options={options}
        value={productId}
        onChange={setProductId}
        placeholder={loading ? 'Loading…' : 'Select a product'}
        loading={loading}
        emptyLabel="Every product is already on this demand"
      />
      <View style={styles.qtyRow}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>QTY</Text>
        <QtyStepper value={qty} onChange={setQty} min={1} accessibilityLabel="Quantity to add" />
      </View>
      <View style={styles.formButtons}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Cancel" onPress={onDone} disabled={addItem.isPending} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Add" onPress={submit} loading={addItem.isPending} disabled={!productId || !qty || qty <= 0} />
        </View>
      </View>
    </Card>
  );
}

/**
 * Records goods coming back against a verified delivery. It goes through the
 * ordinary production-returns flow (created 'pending', accepted separately),
 * so it records the claim — it does not move stock.
 */
function ReturnForm({ order, onDone }: { order: ProductionOrder; onDone: () => void }) {
  const theme = useAppTheme();
  const createReturn = useCreateProductionReturn();
  const [productId, setProductId] = useState<string | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const options = useMemo(() => returnableItems(order).map((it) => ({ value: it.productId, label: it.productName })), [order]);
  const ready = !!productId && !!qty && qty > 0 && reason.trim().length > 0;

  const submit = () => {
    if (!ready || !productId || !qty) return;
    createReturn.mutate(
      { branchId: order.branchId, productId, qty, reason: reason.trim() },
      {
        onSuccess: () => {
          Alert.alert('Return Recorded', 'Return recorded — awaiting review.');
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Record Return', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <Card style={{ marginTop: theme.spacing.lg }}>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Record Return</Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 10, marginBottom: 6 }]}>PRODUCT</Text>
      <Dropdown options={options} value={productId} onChange={setProductId} placeholder="Select a delivered product" />
      <View style={styles.qtyRow}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>QTY</Text>
        <QtyStepper value={qty} onChange={setQty} min={1} accessibilityLabel="Quantity returned" />
      </View>
      <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="Why is this coming back?" />
      <View style={styles.formButtons}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Cancel" onPress={onDone} disabled={createReturn.isPending} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Record Return" onPress={submit} loading={createReturn.isPending} disabled={!ready} />
        </View>
      </View>
    </Card>
  );
}

/**
 * Super Admin → Orders → one demand: the web's order slip (`OrderPrintPreview`)
 * — header, meta, the branch's photos, the review table, packing materials,
 * the previous order's balance — and its actions:
 *
 *   pending   Add Product · Change Quantity (+ reason) · Reject · Submit for Verification
 *   verified  Return · Approve (the closing sign-off; no Reject — the stock already moved)
 *   approved  a done marker, nothing left to act on
 *
 * Every action is the web's own endpoint; the server re-checks stock and status.
 * Production Check (pending), POP Print and A4 Challan share the web's three
 * documents as text — see `OrderPrintActions`.
 */
export function AdminOrderDetailScreen() {
  const theme = useAppTheme();
  useHideTabBarOnFocus();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<SuperAdminOrdersStackParamList, typeof Routes.SUPER_ADMIN_ORDER_DETAIL>>();
  const orderQ = useProductionOrder(route.params.orderId);
  const order = orderQ.data?.order;
  const productsQ = useProducts();

  const review = useReviewProductionOrder();
  const finalApprove = useFinalApproveProductionOrder();

  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<QtyEdits>({});
  const [packingEdits, setPackingEdits] = useState<QtyEdits>({});
  const [reason, setReason] = useState<string | null>(null);
  const [panel, setPanel] = useState<'add' | 'return' | null>(null);
  const [shortage, setShortage] = useState<StockShortageNotice | null>(null);
  const [unverified, setUnverified] = useState(false);

  const qty: QtyEditing = {
    editing,
    edits,
    packingEdits,
    setEdit: (id, v) => setEdits((p) => ({ ...p, [id]: v })),
    setPackingEdit: (id, v) => setPackingEdits((p) => ({ ...p, [id]: v })),
  };

  const submission = useMemo(() => (order ? reviewSubmission(order, edits, packingEdits) : null), [order, edits, packingEdits]);
  const reasonText = reason ?? order?.changeReason ?? '';
  const busy = review.isPending || finalApprove.isPending;

  const submitForVerification = () => {
    if (!order || !submission) return;
    setShortage(null);
    setUnverified(false);
    review.mutate(
      {
        id: order.id,
        input: {
          status: 'awaiting_verification',
          approvedItems: submission.approvedItems,
          approvedPackingItems: submission.approvedPackingItems,
          reason: submission.changed ? reasonText : undefined,
        },
      },
      {
        onSuccess: () => {
          Alert.alert('Sent to Branch', 'Sent to branch for verification — stock transferred.');
          navigation.goBack();
        },
        onError: (e) => {
          const notice = shortageFromError(e);
          if (notice) setShortage(notice);
          // The stock check is the server's: with no answer, nothing was submitted.
          else if ((e as { status?: unknown }).status === null) setUnverified(true);
          else Alert.alert('Could Not Submit', mapErrorToMessage(e));
        },
      },
    );
  };

  const reject = () => {
    if (!order) return;
    Alert.alert('Reject Order', `Reject ${order.demandNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () =>
          review.mutate(
            { id: order.id, input: { status: 'rejected' } },
            {
              onSuccess: () => {
                Alert.alert('Order Rejected', `${order.demandNumber} was rejected.`);
                navigation.goBack();
              },
              onError: (e) => Alert.alert('Could Not Reject', mapErrorToMessage(e)),
            },
          ),
      },
    ]);
  };

  const approve = () => {
    if (!order) return;
    finalApprove.mutate(order.id, {
      onSuccess: () => {
        Alert.alert('Order Approved', `${order.demandNumber} is approved.`);
        navigation.goBack();
      },
      onError: (e) => Alert.alert('Could Not Approve', mapErrorToMessage(e)),
    });
  };

  return (
    <Screen>
      <AppHeader
        title={order?.demandNumber ?? 'Order'}
        subtitle={order ? slipReference(order) : undefined}
        actions={[{ icon: 'close', onPress: () => navigation.goBack(), accessibilityLabel: 'Close' }]}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }} keyboardShouldPersistTaps="handled">
        {orderQ.isLoading ? <LoadingSkeleton height={240} /> : null}
        {orderQ.error ? <ErrorState message={mapErrorToMessage(orderQ.error)} onRetry={() => void orderQ.refetch()} /> : null}
        {order ? (
          <>
            {panel === 'add' && order.status === 'pending' ? (
              <AddProductForm order={order} products={productsQ.data?.products ?? []} loading={productsQ.isLoading} onDone={() => setPanel(null)} />
            ) : null}
            {panel === 'return' && order.status === 'verified' ? <ReturnForm order={order} onDone={() => setPanel(null)} /> : null}

            <View style={{ marginTop: panel ? theme.spacing.lg : 0 }}>
              <OrderSlip order={order} qty={qty} />
            </View>

            {editing && order.status === 'pending' && submission?.changed ? (
              <TextField
                label="Reason for change"
                value={reasonText}
                onChangeText={setReason}
                placeholder="Why was the quantity adjusted?"
                multiline
              />
            ) : null}

            {shortage ? <ShortageCard notice={shortage} /> : null}
            {unverified ? (
              <InfoCard
                title="Verification Required"
                lines={['Stock verification requires a current stock check.', 'Please reconnect to the internet and try again.']}
              />
            ) : null}

            <OrderPrintActions order={order} edits={edits} packingEdits={packingEdits} disabled={busy} />

            {order.status === 'pending' ? (
              <View style={{ marginTop: theme.spacing.lg, gap: 10 }}>
                <View style={styles.formButtons}>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton label="Add Product" onPress={() => setPanel((p) => (p === 'add' ? null : 'add'))} disabled={busy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton label={editing ? 'Done' : 'Change Quantity'} onPress={() => setEditing((e) => !e)} disabled={busy} />
                  </View>
                </View>
                <View style={styles.formButtons}>
                  <View style={{ flex: 1 }}>
                    <SecondaryButton label="Reject" onPress={reject} disabled={busy} />
                  </View>
                  <View style={{ flex: 1.4 }}>
                    <PrimaryButton label="Submit for Verification" onPress={submitForVerification} loading={review.isPending} disabled={busy} />
                  </View>
                </View>
              </View>
            ) : null}

            {order.status === 'verified' ? (
              <View style={[styles.formButtons, { marginTop: theme.spacing.lg }]}>
                <View style={{ flex: 1 }}>
                  <SecondaryButton label="Return" onPress={() => setPanel((p) => (p === 'return' ? null : 'return'))} disabled={busy} />
                </View>
                <View style={{ flex: 1.4 }}>
                  <PrimaryButton label="Approve" onPress={approve} loading={finalApprove.isPending} disabled={busy} />
                </View>
              </View>
            ) : null}

            {order.status === 'approved' ? (
              <View style={[styles.doneMarker, { borderColor: theme.colors.success, borderRadius: theme.radii.md, marginTop: theme.spacing.lg }]}>
                <Icon name="check" size={16} color={theme.colors.success} />
                <Text style={[theme.typography.body, { color: theme.colors.success, fontWeight: '700' }]}>Approved</Text>
              </View>
            ) : null}
          </>
        ) : null}
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
  noticeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  formButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  doneMarker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, height: 52 },
  totalsBox: { padding: 12, gap: 4 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between' },
  box: { borderWidth: 1, paddingHorizontal: 12 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
});
