import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  DELIVERY_PROVIDERS,
  DELIVERY_PROVIDER_LABEL,
  SUPPLIER_PAYMENT_METHODS,
  getBusinessDate,
  useDecidePurchaseBill,
  useRecordSupplierPayment,
  useRequestSupplierCredit,
  useSavePurchaseDelivery,
  type PurchaseDemandDetail,
  type SupplierBill,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Checkbox, DateField } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { ChoiceChips, FieldError, FieldLabel, FormModal, Input, Notice, Row } from '../../components';
import { useSubmission } from '../../hooks';
import {
  DIFFERENCE_FIELD_LABEL,
  billRoom,
  deliveryFormFrom,
  emptyCreditForm,
  emptyPaymentForm,
  formatQty,
  paymentRoom,
  reasonError,
  toCreditInput,
  toDeliveryInput,
  toPaymentInput,
  validateCreditForm,
  validateDeliveryForm,
  validatePaymentForm,
  type CreditFormState,
  type DeliveryFormState,
  type PaymentFormState,
} from '../../utils';

const PROVIDER_OPTIONS = DELIVERY_PROVIDERS.map((p) => ({ value: p, label: DELIVERY_PROVIDER_LABEL[p] }));
const DELIVERY_STATE_OPTIONS = [
  { value: 'booked' as const, label: 'Booked' },
  { value: 'dispatched' as const, label: 'Dispatched' },
  { value: 'delivered' as const, label: 'Delivered' },
];
const FEE_PAID_BY_OPTIONS = [
  { value: 'mountain_bakes' as const, label: 'Mountain Bakes' },
  { value: 'supplier' as const, label: 'Supplier' },
];
const METHOD_LABEL = { cash: 'Cash', easypaisa: 'Easypaisa', bank: 'Bank' } as const;
const METHOD_OPTIONS = SUPPLIER_PAYMENT_METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m] }));

interface ModalProps {
  visible: boolean;
  detail: PurchaseDemandDetail;
  onClose: () => void;
  /** After a successful save; `message` is what to tell the person. */
  onDone: (message: string) => void;
}

/** Delivery is a manual note of a ride booked elsewhere — no provider API is called. */
export function DeliveryModal({ visible, detail, onClose, onDone }: ModalProps) {
  const save = useSavePurchaseDelivery();
  const sub = useSubmission('purchase_delivery');
  const [form, setForm] = useState<DeliveryFormState>(() => deliveryFormFrom(detail.delivery));
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setForm(deliveryFormFrom(detail.delivery));
      setShowErrors(false);
      setError(null);
    }
  }, [visible, detail.delivery]);
  const errors = validateDeliveryForm(form);
  const err = (k: string) => (showErrors ? errors[k] : undefined);
  const set = <K extends keyof DeliveryFormState>(k: K, v: DeliveryFormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const input = toDeliveryInput(form);
    setError(null);
    const outcome = await sub.run(input, () => save.mutateAsync({ id: detail.id, input }));
    if (outcome.kind === 'done') onDone('Delivery saved.');
    else if (outcome.kind === 'failed') setError(outcome.message);
  };

  return (
    <FormModal visible={visible} title="Delivery" subtitle={detail.demandNo} onClose={onClose} submitLabel="Save Delivery" onSubmit={() => void submit()} submitting={sub.pending} error={error}>
      <Notice text="Manual reference only. Book the ride in Bykea, inDrive or Yango yourself and note it here; nothing is booked from this app." />
      <FieldLabel required>Service</FieldLabel>
      <ChoiceChips options={PROVIDER_OPTIONS} value={form.provider} onChange={(v) => set('provider', v)} />
      {form.provider === 'other' ? (
        <>
          <FieldLabel required>Service name</FieldLabel>
          <Input value={form.providerName} onChangeText={(v) => set('providerName', v)} maxLength={80} error={err('providerName')} />
          <FieldError message={err('providerName')} />
        </>
      ) : null}
      {form.provider !== 'self_pickup' ? (
        <>
          <FieldLabel>Booking reference</FieldLabel>
          <Input value={form.bookingReference} onChangeText={(v) => set('bookingReference', v)} placeholder="Ride / order ID" maxLength={80} error={err('bookingReference')} />
          <FieldError message={err('bookingReference')} />
        </>
      ) : null}
      <FieldLabel required>Status</FieldLabel>
      <ChoiceChips options={DELIVERY_STATE_OPTIONS} value={form.status} onChange={(v) => set('status', v)} />
      {form.status === 'delivered' ? (
        <>
          <FieldLabel required>Received by</FieldLabel>
          <Input value={form.receivedByName} onChangeText={(v) => set('receivedByName', v)} maxLength={120} error={err('receivedByName')} />
          <FieldError message={err('receivedByName')} />
        </>
      ) : null}
      <FieldLabel>Estimated fee</FieldLabel>
      <Input value={form.estimatedFee} onChangeText={(v) => set('estimatedFee', v)} placeholder="Rs." keyboardType="decimal-pad" error={err('estimatedFee')} />
      <FieldError message={err('estimatedFee')} />
      <FieldLabel>Actual fee</FieldLabel>
      <Input value={form.actualFee} onChangeText={(v) => set('actualFee', v)} placeholder="Rs." keyboardType="decimal-pad" error={err('actualFee')} />
      <FieldError message={err('actualFee')} />
      <FieldLabel>Fee paid by</FieldLabel>
      <ChoiceChips options={FEE_PAID_BY_OPTIONS} value={form.feePaidBy} onChange={(v) => set('feePaidBy', v)} />
      <FieldLabel>Pickup details</FieldLabel>
      <Input value={form.pickupDetails} onChangeText={(v) => set('pickupDetails', v)} multiline maxLength={500} />
      <FieldLabel>Notes</FieldLabel>
      <Input value={form.deliveryNotes} onChangeText={(v) => set('deliveryNotes', v)} multiline maxLength={500} />
    </FormModal>
  );
}

/** A payment Production made to the supplier. It is recorded only; Finance approves it before it posts. */
export function PaymentModal({ visible, detail, onClose, onDone }: ModalProps) {
  const theme = useAppTheme();
  const today = getBusinessDate();
  const record = useRecordSupplierPayment();
  const sub = useSubmission('purchase_payment');
  const activeCredits = useMemo(() => detail.credits.filter((c) => c.status === 'active' && c.outstanding > 0), [detail.credits]);
  const earliest = detail.createdAt.slice(0, 10);
  const [form, setForm] = useState<PaymentFormState>(() => emptyPaymentForm(today, billRoom(detail)));
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setForm(emptyPaymentForm(getBusinessDate(), billRoom(detail)));
      setShowErrors(false);
      setError(null);
    }
    // Reset only when the modal opens, not on every refetch of the demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const room = paymentRoom(detail, form.creditId);
  const errors = validatePaymentForm(form, { room, today, earliest });
  const err = (k: string) => (showErrors ? errors[k] : undefined);
  const set = <K extends keyof PaymentFormState>(k: K, v: PaymentFormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const input = toPaymentInput(form);
    setError(null);
    const outcome = await sub.run(input, (key) => record.mutateAsync({ id: detail.id, input: { ...input, clientRequestId: key }, idempotencyKey: key }));
    if (outcome.kind === 'done') onDone(`${outcome.value.paymentNo} recorded — it waits for Finance approval before it counts as paid.`);
    else if (outcome.kind === 'failed') setError(outcome.message);
  };

  return (
    <FormModal visible={visible} title="Record Payment" subtitle={`${detail.demandNo} · ${detail.supplierName}`} onClose={onClose} submitLabel="Record Payment" onSubmit={() => void submit()} submitting={sub.pending} error={error}>
      <Notice text="This payment waits for Finance approval. Only Finance's approval posts it to the books." icon="clock" />
      {activeCredits.length > 0 ? (
        <>
          <FieldLabel>Paying for</FieldLabel>
          <ChoiceChips
            options={[{ value: 'bill', label: 'This bill' }, ...activeCredits.map((c) => ({ value: c.id, label: `Repay ${c.creditNo}` }))]}
            value={form.creditId ?? 'bill'}
            onChange={(v) => set('creditId', v === 'bill' ? null : v)}
          />
        </>
      ) : null}
      {room !== null ? (
        <View style={{ marginTop: 8 }}>
          <Row label={form.creditId ? 'Left to repay on this credit' : 'Left on this bill'} value={formatCurrency(room)} strong />
        </View>
      ) : null}
      <FieldLabel required>Method</FieldLabel>
      <ChoiceChips options={METHOD_OPTIONS} value={form.method} onChange={(v) => set('method', v)} />
      <FieldLabel required>Amount</FieldLabel>
      <Input value={form.amount} onChangeText={(v) => set('amount', v)} placeholder="Rs." keyboardType="decimal-pad" error={err('amount')} />
      <FieldError message={err('amount')} />
      <FieldLabel required={form.method !== 'cash'}>Transaction reference</FieldLabel>
      <Input value={form.referenceNo} onChangeText={(v) => set('referenceNo', v)} placeholder={form.method === 'cash' ? 'Optional' : 'TID / IBFT reference'} maxLength={80} error={err('referenceNo')} />
      <FieldError message={err('referenceNo')} />
      <FieldLabel required>Paid on</FieldLabel>
      <DateField value={form.paidOn} onChange={(v) => set('paidOn', v)} minimumDate={earliest} maximumDate={today} error={err('paidOn')} required />
      <FieldLabel>Notes</FieldLabel>
      <Input value={form.notes} onChangeText={(v) => set('notes', v)} multiline maxLength={500} />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 8 }]}>
        Recorded payments, credit and repayments together may not exceed the bill.
      </Text>
    </FormModal>
  );
}

/** Asking Finance to put part or all of the bill on credit with the supplier. */
export function CreditModal({ visible, detail, onClose, onDone }: ModalProps) {
  const today = getBusinessDate();
  const request = useRequestSupplierCredit();
  const sub = useSubmission('purchase_credit');
  const [form, setForm] = useState<CreditFormState>(() => emptyCreditForm(billRoom(detail)));
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setForm({ ...emptyCreditForm(billRoom(detail)), terms: detail.creditTerms ?? '', dueDate: detail.creditDueDate ?? '', reference: detail.creditReference ?? '' });
      setShowErrors(false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const room = billRoom(detail);
  const errors = validateCreditForm(form, room);
  const err = (k: string) => (showErrors ? errors[k] : undefined);
  const set = <K extends keyof CreditFormState>(k: K, v: CreditFormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const input = toCreditInput(form);
    setError(null);
    const outcome = await sub.run(input, (key) => request.mutateAsync({ id: detail.id, input, idempotencyKey: key }));
    if (outcome.kind === 'done') onDone(`${outcome.value.creditNo} requested — Finance decides whether to approve it.`);
    else if (outcome.kind === 'failed') setError(outcome.message);
  };

  return (
    <FormModal visible={visible} title="Request Credit" subtitle={`${detail.demandNo} · ${detail.supplierName}`} onClose={onClose} submitLabel="Request Credit" onSubmit={() => void submit()} submitting={sub.pending} error={error}>
      <Notice text="Credit is no liability until Finance approves it. One open credit per bill." icon="clock" />
      {room !== null ? (
        <View style={{ marginTop: 8 }}>
          <Row label="Not yet paid or on credit" value={formatCurrency(room)} strong />
        </View>
      ) : null}
      <FieldLabel required>Amount</FieldLabel>
      <Input value={form.amount} onChangeText={(v) => set('amount', v)} placeholder="Rs." keyboardType="decimal-pad" error={err('amount')} />
      <FieldError message={err('amount')} />
      <FieldLabel>Terms</FieldLabel>
      <Input value={form.terms} onChangeText={(v) => set('terms', v)} placeholder="e.g. 30 days" maxLength={300} />
      <FieldLabel>Due date</FieldLabel>
      <DateField value={form.dueDate} onChange={(v) => set('dueDate', v)} minimumDate={today} onClear={() => set('dueDate', '')} placeholder="No due date" />
      <FieldLabel>Reference</FieldLabel>
      <Input value={form.reference} onChangeText={(v) => set('reference', v)} maxLength={80} />
      <FieldLabel>Notes</FieldLabel>
      <Input value={form.notes} onChangeText={(v) => set('notes', v)} multiline maxLength={500} />
    </FormModal>
  );
}

/**
 * Approving a bill that differs from the approved quotation: the differences
 * must be accepted, with a reason (the API refuses a plain approve with 409
 * and an acceptance without a reason with 400).
 */
export function BillApproveModal({ visible, detail, bill, onClose, onDone }: ModalProps & { bill: SupplierBill | null }) {
  const theme = useAppTheme();
  const decide = useDecidePurchaseBill();
  const sub = useSubmission('purchase_bill_decision');
  const [accept, setAccept] = useState(false);
  const [reason, setReason] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setAccept(false);
      setReason('');
      setShowErrors(false);
      setError(null);
    }
  }, [visible]);
  if (!bill) return null;
  const reasonErr = reasonError(reason);
  const submit = async () => {
    setShowErrors(true);
    if (!accept || reasonErr) return;
    const input = { decision: 'approve' as const, acceptDifferences: true, reason: reason.trim() };
    setError(null);
    const outcome = await sub.run(input, () => decide.mutateAsync({ id: detail.id, billId: bill.id, input }));
    if (outcome.kind === 'done') onDone(`Bill ${bill.supplierBillNo} approved with its differences.`);
    else if (outcome.kind === 'failed') setError(outcome.message);
  };
  return (
    <FormModal
      visible={visible}
      title="Approve Bill"
      subtitle={`${bill.supplierBillNo} · ${formatCurrency(bill.grandTotal)}`}
      onClose={onClose}
      submitLabel="Approve with Differences"
      onSubmit={() => void submit()}
      submitting={sub.pending}
      submitInactive={!accept || !!reasonErr}
      error={error}>
      <Notice text="This bill differs from the approved quotation. Approving makes the billed amount payable." tone="warning" icon="warning" />
      <View style={{ marginTop: 10 }}>
        {bill.differences.map((x, i) => (
          <Row
            key={`${x.field}-${x.item ?? ''}-${i}`}
            label={`${x.item ? `${x.item} · ` : ''}${DIFFERENCE_FIELD_LABEL[x.field]}`}
            value={x.field === 'quantity' ? `${formatQty(x.quoted)} → ${formatQty(x.billed)}` : `${formatCurrency(x.quoted)} → ${formatCurrency(x.billed)}`}
            tone="warning"
          />
        ))}
      </View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accept }} onPress={() => setAccept(!accept)} style={{ flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'flex-start' }}>
        <Checkbox checked={accept} onChange={setAccept} accessibilityLabel="Accept these differences" />
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>I accept these differences from the quotation.</Text>
      </Pressable>
      <FieldError message={showErrors && !accept ? 'Tick to accept the differences, or reject the bill instead' : null} />
      <FieldLabel required>Reason</FieldLabel>
      <Input value={reason} onChangeText={setReason} placeholder="e.g. Flour price went up today" multiline maxLength={1000} error={showErrors ? reasonErr : null} />
      <FieldError message={showErrors ? reasonErr : null} />
    </FormModal>
  );
}
