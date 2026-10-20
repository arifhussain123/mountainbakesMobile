import { Text, View } from 'react-native';
import {
  DELIVERY_PROVIDER_LABEL,
  PURCHASE_DEMAND_STATUS_LABEL,
  PURCHASE_PAYMENT_PREFERENCE_LABEL,
  type PurchaseDemandDetail,
  type Quotation,
  type SupplierBill,
  type WhatsAppMessage,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { LinkButton, MessageCard, Notice, Row, Section } from '../../components';
import {
  AVAILABILITY_LABEL,
  AVAILABILITY_VARIANT,
  BILL_STATUS_LABEL,
  BILL_STATUS_VARIANT,
  CREDIT_STATUS_LABEL,
  CREDIT_STATUS_VARIANT,
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_VARIANT,
  DEMAND_STATUS_VARIANT,
  DIFFERENCE_FIELD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
  PRIORITY_LABEL,
  PRIORITY_VARIANT,
  QUOTATION_STATUS_LABEL,
  QUOTATION_STATUS_VARIANT,
  SUPPLIER_PAYMENT_STATUS_LABEL,
  SUPPLIER_PAYMENT_STATUS_VARIANT,
  eventLabel,
  formatQty,
} from '../../utils';
import { styles } from './styles';

/** `12 Oct 2026 · 08:45 PM` */
export function stamp(iso: string | null | undefined): string {
  if (!iso) return '-';
  return `${formatDisplayDate(iso.slice(0, 10))} · ${formatDisplayTime(iso)}`;
}

export function OverviewCard({ d }: { d: PurchaseDemandDetail }) {
  const theme = useAppTheme();
  return (
    <Section title={d.supplierName} subtitle={`${d.supplierWhatsapp}${d.supplier?.contactPerson ? ` · ${d.supplier.contactPerson}` : ''}`}>
      <View style={styles.badges}>
        <StatusBadge label={PURCHASE_DEMAND_STATUS_LABEL[d.status] ?? d.status} variant={DEMAND_STATUS_VARIANT[d.status] ?? 'neutral'} />
        <StatusBadge label={PRIORITY_LABEL[d.priority]} variant={PRIORITY_VARIANT[d.priority]} />
        {d.approvedBillId ? <StatusBadge label={PAYMENT_STATUS_LABEL[d.paymentStatus]} variant={PAYMENT_STATUS_VARIANT[d.paymentStatus]} /> : null}
        <StatusBadge label={`Delivery: ${DELIVERY_STATUS_LABEL[d.deliveryStatus]}`} variant={DELIVERY_STATUS_VARIANT[d.deliveryStatus]} />
      </View>
      <View style={{ marginTop: 8 }}>
        <Row label="Required by" value={formatDisplayDate(d.requiredDate)} strong />
        <Row
          label="Payment preference"
          value={`${PURCHASE_PAYMENT_PREFERENCE_LABEL[d.paymentPreference]}${d.paymentPreference === 'credit' && d.creditAmountRequested ? ` · ${formatCurrency(d.creditAmountRequested)}` : ''}`}
        />
        {d.paymentPreference === 'credit' && d.creditTerms ? <Row label="Credit terms" value={d.creditTerms} /> : null}
        {d.paymentPreference === 'credit' && d.creditDueDate ? <Row label="Credit due" value={formatDisplayDate(d.creditDueDate)} /> : null}
        <Row label="Created" value={`${stamp(d.createdAt)}${d.createdByName ? ` · ${d.createdByName}` : ''}`} />
        {d.verifiedAt ? <Row label="Verified" value={`${stamp(d.verifiedAt)}${d.verifiedByName ? ` · ${d.verifiedByName}` : ''}`} /> : null}
        {d.sentAt ? <Row label="Sent" value={`${stamp(d.sentAt)}${d.sentByName ? ` · ${d.sentByName}` : ''}`} /> : null}
        {d.linkExpiresAt ? <Row label="Supplier link expires" value={stamp(d.linkExpiresAt)} /> : null}
        {d.closedAt ? <Row label="Closed" value={`${stamp(d.closedAt)}${d.closedByName ? ` · ${d.closedByName}` : ''}`} tone="danger" /> : null}
      </View>
      {d.closedReason ? <Notice text={`Reason: ${d.closedReason}`} tone="danger" icon="warning" /> : null}
      {d.deliveryInstructions ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 8 }]}>Delivery: {d.deliveryInstructions}</Text>
      ) : null}
      {d.notes ? <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 4 }]}>Notes: {d.notes}</Text> : null}
    </Section>
  );
}

export function ItemsSection({ d }: { d: PurchaseDemandDetail }) {
  const theme = useAppTheme();
  return (
    <Section title="Requested items" subtitle={`${d.items.length} item${d.items.length === 1 ? '' : 's'}`}>
      {[...d.items]
        .sort((a, b) => a.lineNo - b.lineNo)
        .map((i) => (
          <View key={i.id} style={[styles.line, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[theme.typography.body, { color: theme.colors.text }]}>{i.itemName}</Text>
              {i.itemCode || i.note ? (
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{[i.itemCode, i.note].filter(Boolean).join(' · ')}</Text>
              ) : null}
            </View>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatQty(i.requestedQty, i.unit)}</Text>
          </View>
        ))}
    </Section>
  );
}

export interface QuotationActions {
  onApprove: (q: Quotation) => void;
  onRequestChanges: (q: Quotation) => void;
  onReject: (q: Quotation) => void;
}

function QuotationCard({ q, d, actions, busy }: { q: Quotation; d: PurchaseDemandDetail; actions: QuotationActions | null; busy: boolean }) {
  const theme = useAppTheme();
  const nameOf = (id: string | null) => d.items.find((i) => i.id === id)?.itemName ?? 'a requested item';
  return (
    <View style={[styles.subCard, { borderColor: q.status === 'submitted' ? theme.colors.violet : theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
      <View style={styles.rowBetween}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Version {q.version}</Text>
        <StatusBadge label={QUOTATION_STATUS_LABEL[q.status]} variant={QUOTATION_STATUS_VARIANT[q.status]} />
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        {q.submittedVia === 'portal' ? 'From the supplier link' : `Entered by ${q.enteredByName ?? 'staff'}`} · {stamp(q.submittedAt)}
      </Text>
      <View style={[styles.tableHead, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.colItem, theme.typography.label, { color: theme.colors.primary }]}>ITEM</Text>
        <Text style={[styles.colNum, theme.typography.label, { color: theme.colors.primary }]}>ASKED</Text>
        <Text style={[styles.colNum, theme.typography.label, { color: theme.colors.primary }]}>OFFERED</Text>
        <Text style={[styles.colMoney, theme.typography.label, { color: theme.colors.primary }]}>TOTAL</Text>
      </View>
      {[...q.items]
        .sort((a, b) => a.lineNo - b.lineNo)
        .map((l) => {
          const short = l.requestedQty !== null && l.availableQty < l.requestedQty;
          return (
            <View key={l.id} style={[styles.tableRow, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.colItem}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{l.itemName}</Text>
                <View style={[styles.badges, { marginTop: 2 }]}>
                  <StatusBadge label={AVAILABILITY_LABEL[l.availability]} variant={AVAILABILITY_VARIANT[l.availability]} />
                </View>
                {l.substituteForDemandItemId ? (
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Instead of {nameOf(l.substituteForDemandItemId)}</Text>
                ) : null}
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>@ {formatCurrency(l.unitRate)} / {l.unit}</Text>
                {l.note ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{l.note}</Text> : null}
              </View>
              <Text style={[styles.colNum, theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{l.requestedQty === null ? '–' : formatQty(l.requestedQty)}</Text>
              <Text style={[styles.colNum, theme.typography.bodySmall, { color: short ? theme.colors.warning : theme.colors.text, fontWeight: '700' }]}>{formatQty(l.availableQty)}</Text>
              <Text style={[styles.colMoney, theme.typography.bodySmall, { color: theme.colors.text }]}>{formatCurrency(l.lineTotal)}</Text>
            </View>
          );
        })}
      <View style={{ marginTop: 6 }}>
        <Row label="Subtotal" value={formatCurrency(q.subtotal)} />
        <Row label="Delivery charge" value={formatCurrency(q.deliveryCharge)} />
        <Row label="Total" value={formatCurrency(q.total)} strong />
        {q.estimatedDeliveryDate ? <Row label="Estimated delivery" value={formatDisplayDate(q.estimatedDeliveryDate)} /> : null}
      </View>
      {q.deliveryNotes ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>Delivery: {q.deliveryNotes}</Text> : null}
      {q.notes ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>Notes: {q.notes}</Text> : null}
      {q.decidedAt ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>
          Decided {stamp(q.decidedAt)}
          {q.decidedByName ? ` by ${q.decidedByName}` : ''}
          {q.decisionReason ? ` — ${q.decisionReason}` : ''}
        </Text>
      ) : null}
      {actions && q.status === 'submitted' && q.id === d.currentQuotationId ? (
        <View style={[styles.actionsRow, { marginTop: 10 }]}>
          <LinkButton label="Approve" icon="check" onPress={() => actions.onApprove(q)} disabled={busy} />
          <LinkButton label="Request changes" icon="pencil" tone="text" onPress={() => actions.onRequestChanges(q)} disabled={busy} />
          <LinkButton label="Reject" icon="close" tone="danger" onPress={() => actions.onReject(q)} disabled={busy} />
        </View>
      ) : null}
    </View>
  );
}

export function QuotationsSection({
  d,
  actions,
  onEnter,
  busy,
}: {
  d: PurchaseDemandDetail;
  actions: QuotationActions | null;
  onEnter: (() => void) | null;
  busy: boolean;
}) {
  const theme = useAppTheme();
  const versions = [...d.quotations].sort((a, b) => b.version - a.version);
  return (
    <Section
      title="Quotations"
      subtitle={versions.length ? `${versions.length} version${versions.length === 1 ? '' : 's'} · requested vs offered` : 'Waiting for the supplier'}
      action={onEnter ? <LinkButton label="Enter for supplier" icon="plus" onPress={onEnter} /> : null}>
      {versions.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          No quotation yet. The supplier quotes through their link — or, if they sent it as a message, enter it for them.
        </Text>
      ) : null}
      {versions.map((q) => (
        <QuotationCard key={q.id} q={q} d={d} actions={actions} busy={busy} />
      ))}
    </Section>
  );
}

export interface BillActions {
  onApprove: (b: SupplierBill) => void;
  onReject: (b: SupplierBill) => void;
}

function BillCard({ b, actions, busy }: { b: SupplierBill; actions: BillActions | null; busy: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.subCard, { borderColor: b.status === 'submitted' ? theme.colors.violet : theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
      <View style={styles.rowBetween}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text, flex: 1 }]}>Bill {b.supplierBillNo}</Text>
        <StatusBadge label={BILL_STATUS_LABEL[b.status]} variant={BILL_STATUS_VARIANT[b.status]} />
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        Against quotation v{b.quotationVersion} · invoice {formatDisplayDate(b.invoiceDate)} · {b.submittedVia === 'portal' ? 'from the supplier link' : `entered by ${b.enteredByName ?? 'staff'}`}
      </Text>
      {[...b.items]
        .sort((a, c) => a.lineNo - c.lineNo)
        .map((l) => (
          <View key={l.id} style={[styles.line, { borderBottomColor: theme.colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{l.itemName}</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                {formatQty(l.qty, l.unit)} @ {formatCurrency(l.unitRate)}
              </Text>
            </View>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{formatCurrency(l.lineTotal)}</Text>
          </View>
        ))}
      <View style={{ marginTop: 6 }}>
        <Row label="Subtotal" value={formatCurrency(b.subtotal)} />
        <Row label="Delivery charge" value={formatCurrency(b.deliveryCharge)} />
        {b.otherCharges > 0 ? <Row label={`Other charges${b.otherChargesNote ? ` (${b.otherChargesNote})` : ''}`} value={formatCurrency(b.otherCharges)} /> : null}
        {b.discount > 0 ? <Row label="Discount" value={`− ${formatCurrency(b.discount)}`} /> : null}
        <Row label="Grand total" value={formatCurrency(b.grandTotal)} strong />
        {b.deliveryDate ? <Row label="Delivery date" value={formatDisplayDate(b.deliveryDate)} /> : null}
        {b.supplierStatedPaid > 0 || b.supplierPaymentMethod ? (
          <Row
            label="Supplier says paid"
            value={`${formatCurrency(b.supplierStatedPaid)}${b.supplierPaymentMethod ? ` · ${b.supplierPaymentMethod}` : ''}`}
          />
        ) : null}
      </View>
      {b.differsFromQuotation ? (
        <View style={{ marginTop: 6 }}>
          <Text style={[theme.typography.label, { color: theme.colors.warning, fontWeight: '700' }]}>DIFFERS FROM THE APPROVED QUOTATION</Text>
          {b.differences.map((x, i) => (
            <Row
              key={`${x.field}-${x.item ?? ''}-${i}`}
              label={`${x.item ? `${x.item} · ` : ''}${DIFFERENCE_FIELD_LABEL[x.field]}`}
              value={x.field === 'quantity' ? `${formatQty(x.quoted)} → ${formatQty(x.billed)}` : `${formatCurrency(x.quoted)} → ${formatCurrency(x.billed)}`}
              tone="warning"
            />
          ))}
          {b.acceptedDifferences ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Differences accepted.</Text> : null}
        </View>
      ) : null}
      {b.notes ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>Notes: {b.notes}</Text> : null}
      {b.decidedAt ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>
          Decided {stamp(b.decidedAt)}
          {b.decidedByName ? ` by ${b.decidedByName}` : ''}
          {b.decisionReason ? ` — ${b.decisionReason}` : ''}
        </Text>
      ) : null}
      {actions && b.status === 'submitted' ? (
        <View style={[styles.actionsRow, { marginTop: 10 }]}>
          <LinkButton label={b.differsFromQuotation ? 'Review & approve' : 'Approve'} icon="check" onPress={() => actions.onApprove(b)} disabled={busy} />
          <LinkButton label="Reject" icon="close" tone="danger" onPress={() => actions.onReject(b)} disabled={busy} />
        </View>
      ) : null}
    </View>
  );
}

export function BillsSection({ d, actions, onEnter, busy }: { d: PurchaseDemandDetail; actions: BillActions | null; onEnter: (() => void) | null; busy: boolean }) {
  const theme = useAppTheme();
  const bills = [...d.bills].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  if (bills.length === 0 && !onEnter) return null;
  return (
    <Section title="Supplier bill" subtitle={bills.length ? 'Compared with the approved quotation' : 'Waiting for the supplier'} action={onEnter ? <LinkButton label="Enter for supplier" icon="plus" onPress={onEnter} /> : null}>
      {bills.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          The supplier sends their bill through the link. If it came as a message or on paper, enter it for them.
        </Text>
      ) : null}
      {bills.map((b) => (
        <BillCard key={b.id} b={b} actions={actions} busy={busy} />
      ))}
    </Section>
  );
}

export function DeliverySection({ d, onEdit }: { d: PurchaseDemandDetail; onEdit: (() => void) | null }) {
  const theme = useAppTheme();
  const del = d.delivery;
  if (!del && !onEdit) return null;
  return (
    <Section title="Delivery" subtitle={del ? DELIVERY_PROVIDER_LABEL[del.provider] : 'Not booked'} action={onEdit ? <LinkButton label={del ? 'Update' : 'Book'} icon="pencil" onPress={onEdit} /> : null}>
      {del ? (
        <View>
          <View style={styles.badges}>
            <StatusBadge label={DELIVERY_STATUS_LABEL[del.status]} variant={DELIVERY_STATUS_VARIANT[del.status]} />
          </View>
          {del.providerName ? <Row label="Service" value={del.providerName} /> : null}
          {del.bookingReference ? <Row label="Booking reference" value={del.bookingReference} /> : null}
          {del.estimatedFee !== null ? <Row label="Estimated fee" value={formatCurrency(del.estimatedFee)} /> : null}
          {del.actualFee !== null ? <Row label="Actual fee" value={formatCurrency(del.actualFee)} /> : null}
          <Row label="Fee paid by" value={del.feePaidBy === 'supplier' ? 'Supplier' : 'Mountain Bakes'} />
          {del.receivedByName ? <Row label="Received by" value={del.receivedByName} /> : null}
          {del.pickupDetails ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>Pickup: {del.pickupDetails}</Text> : null}
          {del.deliveryNotes ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>Notes: {del.deliveryNotes}</Text> : null}
          <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 4 }]}>
            Updated {stamp(del.updatedAt)}
            {del.updatedByName ? ` by ${del.updatedByName}` : ''}
          </Text>
        </View>
      ) : (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Book the ride in its own app, then note it here.</Text>
      )}
    </Section>
  );
}

export function ReceiptSection({ d, onReceive }: { d: PurchaseDemandDetail; onReceive: (() => void) | null }) {
  const theme = useAppTheme();
  if (d.receiptProgress.length === 0 && d.receipts.length === 0) return null;
  return (
    <Section title="Goods receipt" subtitle="Per approved-bill line" action={onReceive ? <LinkButton label="Record receipt" icon="plus" onPress={onReceive} /> : null}>
      <View style={[styles.tableHead, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.colItem, theme.typography.label, { color: theme.colors.primary }]}>ITEM</Text>
        <Text style={[styles.colNum, theme.typography.label, { color: theme.colors.primary }]}>BILLED</Text>
        <Text style={[styles.colNum, theme.typography.label, { color: theme.colors.primary }]}>GOT</Text>
        <Text style={[styles.colNum, theme.typography.label, { color: theme.colors.primary }]}>OWED</Text>
      </View>
      {d.receiptProgress.map((p) => (
        <View key={p.billItemId} style={[styles.tableRow, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.colItem}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{p.itemName}</Text>
            {p.damaged > 0 ? <Text style={[theme.typography.label, { color: theme.colors.danger }]}>{formatQty(p.damaged, p.unit)} damaged</Text> : null}
          </View>
          <Text style={[styles.colNum, theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{formatQty(p.billed, p.unit)}</Text>
          <Text style={[styles.colNum, theme.typography.bodySmall, { color: theme.colors.text }]}>{formatQty(p.received)}</Text>
          <Text style={[styles.colNum, theme.typography.bodySmall, { color: p.outstanding > 0 ? theme.colors.warning : theme.colors.success, fontWeight: '700' }]}>
            {formatQty(p.outstanding)}
          </Text>
        </View>
      ))}
      {d.receipts.map((r) => (
        <Text key={r.id} style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>
          {r.receiptNo} · {formatDisplayDate(r.businessDate)}
          {r.receivedByName ? ` · ${r.receivedByName}` : ''}
          {r.isFinal ? ' · closed' : ''} — {r.items.map((i) => `${i.itemName} ${formatQty(i.acceptedQty, i.unit)}`).join(', ')}
          {r.notes ? ` (${r.notes})` : ''}
        </Text>
      ))}
    </Section>
  );
}

export function PaymentsSection({
  d,
  onPay,
  onCredit,
}: {
  d: PurchaseDemandDetail;
  onPay: (() => void) | null;
  onCredit: (() => void) | null;
}) {
  const theme = useAppTheme();
  const t = d.totals;
  if (t.billTotal === null && d.payments.length === 0 && d.credits.length === 0) return null;
  return (
    <Section
      title="Payment"
      subtitle="Recorded here, approved by Finance"
      action={
        <View style={styles.actionsRow}>
          {onPay ? <LinkButton label="Record payment" icon="plus" onPress={onPay} /> : null}
          {onCredit ? <LinkButton label="Request credit" icon="plus" tone="text" onPress={onCredit} /> : null}
        </View>
      }>
      <Row label="Bill total" value={t.billTotal === null ? '-' : formatCurrency(t.billTotal)} strong />
      <Row label="Paid (posted by Finance)" value={formatCurrency(t.paidPosted)} tone="success" />
      {t.paidPending > 0 ? <Row label="Waiting for Finance" value={formatCurrency(t.paidPending)} tone="warning" /> : null}
      {t.creditOutstanding > 0 ? <Row label="On credit" value={formatCurrency(t.creditOutstanding)} /> : null}
      <Row label="Outstanding" value={t.outstanding === null ? '-' : formatCurrency(t.outstanding)} strong tone={t.outstanding ? 'danger' : undefined} />

      {d.payments.map((p) => (
        <View key={p.id} style={[styles.subCard, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
          <View style={styles.rowBetween}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', flex: 1 }]}>
              {p.paymentNo} · {formatCurrency(p.amount)}
            </Text>
            <StatusBadge label={SUPPLIER_PAYMENT_STATUS_LABEL[p.status]} variant={SUPPLIER_PAYMENT_STATUS_VARIANT[p.status]} />
          </View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            {p.method === 'easypaisa' ? 'Easypaisa' : p.method === 'bank' ? 'Bank' : 'Cash'} · paid {formatDisplayDate(p.paidOn)}
            {p.referenceNo ? ` · ref ${p.referenceNo}` : ''}
            {p.creditId ? ' · credit repayment' : ''}
            {p.recordedByName ? ` · by ${p.recordedByName}` : ''}
          </Text>
          {p.voucherNo ? <Text style={[theme.typography.label, { color: theme.colors.success }]}>Posted as {p.voucherNo}{p.approvedByName ? ` by ${p.approvedByName}` : ''}</Text> : null}
          {p.rejectionReason ? <Text style={[theme.typography.label, { color: theme.colors.danger }]}>Rejected: {p.rejectionReason}</Text> : null}
          {p.reversalReason ? (
            <Text style={[theme.typography.label, { color: theme.colors.danger }]}>
              Reversed{p.reversalVoucherNo ? ` (${p.reversalVoucherNo})` : ''}: {p.reversalReason}
            </Text>
          ) : null}
        </View>
      ))}
      {d.credits.map((c) => (
        <View key={c.id} style={[styles.subCard, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
          <View style={styles.rowBetween}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', flex: 1 }]}>
              {c.creditNo} · credit {formatCurrency(c.approvedAmount ?? c.requestedAmount)}
            </Text>
            <StatusBadge label={CREDIT_STATUS_LABEL[c.status]} variant={CREDIT_STATUS_VARIANT[c.status]} />
          </View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            Requested {formatCurrency(c.requestedAmount)}
            {c.status === 'active' ? ` · outstanding ${formatCurrency(c.outstanding)}` : ''}
            {c.dueDate ? ` · due ${formatDisplayDate(c.dueDate)}` : ''}
            {c.terms ? ` · ${c.terms}` : ''}
          </Text>
          {c.decisionReason ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Finance: {c.decisionReason}</Text> : null}
        </View>
      ))}
      {d.payments.some((p) => p.status === 'pending_approval') ? <Notice text="A recorded payment waits for Finance approval before it counts as paid." /> : null}
    </Section>
  );
}

export function MessagesSection({
  messages,
  onRetry,
  retryingId,
  onOpenConversation,
}: {
  messages: WhatsAppMessage[];
  onRetry: (m: WhatsAppMessage) => void;
  retryingId: string | null;
  onOpenConversation: (() => void) | null;
}) {
  const theme = useAppTheme();
  const sorted = [...messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Section
      title="Messages"
      subtitle={sorted.length ? `${sorted.length} on this demand` : 'None yet'}
      action={onOpenConversation ? <LinkButton label="Conversation" icon="message-circle" onPress={onOpenConversation} /> : null}>
      {sorted.length === 0 ? <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Nothing has been sent for this demand yet.</Text> : null}
      {sorted.map((m) => (
        <MessageCard key={m.id} message={m} onRetry={() => onRetry(m)} retrying={retryingId === m.id} />
      ))}
    </Section>
  );
}

export function TimelineSection({ d }: { d: PurchaseDemandDetail }) {
  const theme = useAppTheme();
  const events = [...d.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Section title="Timeline" subtitle={`${events.length} event${events.length === 1 ? '' : 's'}`}>
      {events.map((e) => (
        <View key={e.id} style={styles.event}>
          <View style={[styles.dot, { backgroundColor: e.actorType === 'supplier' ? theme.colors.violet : e.actorType === 'system' ? theme.colors.textFaint : theme.colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>
              {eventLabel(e.event)}
              {e.toStatus && e.fromStatus !== e.toStatus ? ` → ${PURCHASE_DEMAND_STATUS_LABEL[e.toStatus as keyof typeof PURCHASE_DEMAND_STATUS_LABEL] ?? e.toStatus}` : ''}
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              {stamp(e.createdAt)} · {e.actorName ?? (e.actorType === 'supplier' ? 'Supplier' : e.actorType === 'system' ? 'System' : 'Staff')}
            </Text>
            {e.reason ? <Text style={[theme.typography.label, { color: theme.colors.text }]}>{e.reason}</Text> : null}
          </View>
        </View>
      ))}
    </Section>
  );
}
