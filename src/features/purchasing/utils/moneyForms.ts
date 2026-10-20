import type {
  CreditInput,
  DeliveryFeePaidBy,
  DeliveryInput,
  DeliveryProvider,
  PaymentInput,
  PurchaseDelivery,
  PurchaseDeliveryState,
  SupplierCredit,
  SupplierInput,
  SupplierPayment,
  SupplierPaymentMethod,
} from '@/api/purchasingTypes';
import { numberToField, parseMoney, parseOptionalMoney, trimOrNull } from './numbers';

/**
 * Payment, credit, delivery and supplier registration — the small forms on a
 * demand. Same rule as the others: one state shape, one validator mirroring
 * the schema, one mapping to the request body.
 */

import type { FormErrors } from './entryForms';

export type { FormErrors };

// ── Payment ─────────────────────────────────────────────────────────────────

export interface PaymentFormState {
  method: SupplierPaymentMethod;
  amount: string;
  referenceNo: string;
  paidOn: string;
  notes: string;
  /** Repaying an active credit, when one is chosen. */
  creditId: string | null;
}

export function emptyPaymentForm(paidOn: string, amount: number | null): PaymentFormState {
  return { method: 'cash', amount: amount && amount > 0 ? numberToField(amount) : '', referenceNo: '', paidOn, notes: '', creditId: null };
}

const toPaisa = (n: number | null | undefined) => Math.round((n ?? 0) * 100);

type MoneyDetail = {
  totals: { billTotal: number | null };
  payments: Pick<SupplierPayment, 'amount' | 'status' | 'creditId'>[];
  credits: Pick<SupplierCredit, 'id' | 'status' | 'requestedAmount' | 'approvedAmount' | 'outstanding'>[];
};

/** A credit's share of the bill: its request while pending, its approval once decided. */
function creditCommitted(c: MoneyDetail['credits'][number]): number {
  if (c.status === 'pending_approval') return toPaisa(c.requestedAmount);
  if (c.status === 'active' || c.status === 'settled') return toPaisa(c.approvedAmount ?? c.requestedAmount);
  return 0;
}

/**
 * Room left on the bill for a direct payment (or a new credit request): the
 * bill less direct payments recorded (posted or waiting for Finance) less
 * credit pending or approved — the server's rule, so the form says it before
 * the round trip. `null` before there is an approved bill.
 */
export function billRoom(detail: MoneyDetail): number | null {
  if (detail.totals.billTotal === null) return null;
  const direct = detail.payments
    .filter((p) => !p.creditId && (p.status === 'pending_approval' || p.status === 'posted'))
    .reduce((n, p) => n + toPaisa(p.amount), 0);
  const credit = detail.credits.reduce((n, c) => n + creditCommitted(c), 0);
  return Math.max(0, toPaisa(detail.totals.billTotal) - direct - credit) / 100;
}

/** Room left on an active credit for a repayment: its outstanding less repayments still waiting for Finance. */
export function creditRepaymentRoom(detail: MoneyDetail, creditId: string): number | null {
  const credit = detail.credits.find((c) => c.id === creditId);
  if (!credit) return null;
  const pending = detail.payments
    .filter((p) => p.creditId === creditId && p.status === 'pending_approval')
    .reduce((n, p) => n + toPaisa(p.amount), 0);
  return Math.max(0, toPaisa(credit.outstanding) - pending) / 100;
}

/** What a payment may be at most: the credit's room when repaying one, else the bill's. */
export function paymentRoom(detail: MoneyDetail, creditId: string | null): number | null {
  return creditId ? creditRepaymentRoom(detail, creditId) : billRoom(detail);
}

/** paidOn may not be in the future, nor before the demand was created (server rule). */
export function paidOnError(paidOn: string, today: string, earliest: string | null): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return 'Choose the date it was paid';
  if (paidOn > today) return 'The payment date cannot be in the future';
  if (earliest && paidOn < earliest) return 'The payment date cannot be before the demand was created';
  return null;
}

export function validatePaymentForm(form: PaymentFormState, limits: { room: number | null; today: string; earliest: string | null }): FormErrors {
  const errors: FormErrors = {};
  const amount = parseMoney(form.amount, { positive: true });
  if (!amount.ok) errors.amount = form.amount.trim() ? amount.error : 'Enter the amount paid';
  else if (limits.room !== null && amount.value > limits.room) {
    errors.amount = form.creditId
      ? `Only ${limits.room.toLocaleString('en-US')} is left to repay on this credit`
      : `Only ${limits.room.toLocaleString('en-US')} is left on this bill after payments and credit`;
  }
  if (form.method !== 'cash' && !form.referenceNo.trim()) errors.referenceNo = 'Enter the transaction reference';
  if (form.referenceNo.trim().length > 80) errors.referenceNo = 'At most 80 characters';
  const dateError = paidOnError(form.paidOn, limits.today, limits.earliest);
  if (dateError) errors.paidOn = dateError;
  if (form.notes.trim().length > 500) errors.notes = 'At most 500 characters';
  return errors;
}

export function toPaymentInput(form: PaymentFormState): PaymentInput {
  const amount = parseMoney(form.amount, { positive: true });
  return {
    method: form.method,
    amount: amount.ok ? amount.value : 0,
    referenceNo: trimOrNull(form.referenceNo),
    paidOn: form.paidOn,
    notes: trimOrNull(form.notes),
    creditId: form.creditId,
  };
}

// ── Credit ──────────────────────────────────────────────────────────────────

export interface CreditFormState {
  amount: string;
  terms: string;
  dueDate: string;
  reference: string;
  notes: string;
}

export function emptyCreditForm(amount: number | null): CreditFormState {
  return { amount: amount && amount > 0 ? numberToField(amount) : '', terms: '', dueDate: '', reference: '', notes: '' };
}

export function validateCreditForm(form: CreditFormState, room: number | null): FormErrors {
  const errors: FormErrors = {};
  const amount = parseMoney(form.amount, { positive: true });
  if (!amount.ok) errors.amount = form.amount.trim() ? amount.error : 'Enter the credit amount';
  else if (room !== null && amount.value > room) errors.amount = `Only ${room.toLocaleString('en-US')} of the bill is not yet paid or on credit`;
  if (form.terms.trim().length > 300) errors.terms = 'At most 300 characters';
  if (form.reference.trim().length > 80) errors.reference = 'At most 80 characters';
  if (form.notes.trim().length > 500) errors.notes = 'At most 500 characters';
  return errors;
}

export function toCreditInput(form: CreditFormState): CreditInput {
  const amount = parseMoney(form.amount, { positive: true });
  return {
    amount: amount.ok ? amount.value : 0,
    terms: trimOrNull(form.terms),
    dueDate: form.dueDate || null,
    reference: trimOrNull(form.reference),
    notes: trimOrNull(form.notes),
  };
}

// ── Delivery ────────────────────────────────────────────────────────────────

export interface DeliveryFormState {
  provider: DeliveryProvider;
  providerName: string;
  bookingReference: string;
  estimatedFee: string;
  actualFee: string;
  feePaidBy: DeliveryFeePaidBy;
  pickupDetails: string;
  deliveryNotes: string;
  status: PurchaseDeliveryState;
  receivedByName: string;
}

export function deliveryFormFrom(delivery: PurchaseDelivery | null): DeliveryFormState {
  return {
    provider: delivery?.provider ?? 'bykea',
    providerName: delivery?.providerName ?? '',
    bookingReference: delivery?.bookingReference ?? '',
    estimatedFee: numberToField(delivery?.estimatedFee),
    actualFee: numberToField(delivery?.actualFee),
    feePaidBy: delivery?.feePaidBy ?? 'mountain_bakes',
    pickupDetails: delivery?.pickupDetails ?? '',
    deliveryNotes: delivery?.deliveryNotes ?? '',
    status: delivery?.status ?? 'booked',
    receivedByName: delivery?.receivedByName ?? '',
  };
}

export function validateDeliveryForm(form: DeliveryFormState): FormErrors {
  const errors: FormErrors = {};
  if (form.provider === 'other' && !form.providerName.trim()) errors.providerName = 'Name the service';
  if (form.status === 'delivered' && !form.receivedByName.trim()) errors.receivedByName = 'Enter who received it';
  const est = parseOptionalMoney(form.estimatedFee);
  if (!est.ok) errors.estimatedFee = est.error;
  const act = parseOptionalMoney(form.actualFee);
  if (!act.ok) errors.actualFee = act.error;
  if (form.bookingReference.trim().length > 80) errors.bookingReference = 'At most 80 characters';
  return errors;
}

export function toDeliveryInput(form: DeliveryFormState): DeliveryInput {
  const est = parseOptionalMoney(form.estimatedFee);
  const act = parseOptionalMoney(form.actualFee);
  return {
    provider: form.provider,
    providerName: form.provider === 'other' ? trimOrNull(form.providerName) : null,
    bookingReference: trimOrNull(form.bookingReference),
    estimatedFee: est.ok ? est.value : null,
    actualFee: act.ok ? act.value : null,
    feePaidBy: form.feePaidBy,
    pickupDetails: trimOrNull(form.pickupDetails),
    deliveryNotes: trimOrNull(form.deliveryNotes),
    status: form.status,
    receivedByName: trimOrNull(form.receivedByName),
  };
}

// ── Supplier registration ───────────────────────────────────────────────────

export interface SupplierFormState {
  name: string;
  contactPerson: string;
  whatsappNumber: string;
  phone: string;
  category: string;
  address: string;
  paymentTerms: string;
  notes: string;
  /** The supplier agreed to receive WhatsApp messages from Mountain Bakes. */
  optIn: boolean;
  /** How that consent was given ("Asked in person at the market"). */
  optInSource: string;
}

export function emptySupplierForm(): SupplierFormState {
  return { name: '', contactPerson: '', whatsappNumber: '', phone: '', category: '', address: '', paymentTerms: '', notes: '', optIn: false, optInSource: '' };
}

export function validateSupplierForm(form: SupplierFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Enter the supplier name';
  else if (form.name.trim().length > 120) errors.name = 'At most 120 characters';
  const digits = form.whatsappNumber.replace(/\D/g, '');
  if (!form.whatsappNumber.trim()) errors.whatsappNumber = 'Enter the WhatsApp number';
  else if (digits.length < 10 || digits.length > 15 || /[^\d\s()+-]/.test(form.whatsappNumber)) errors.whatsappNumber = 'Enter a valid WhatsApp number, e.g. 0300 1234567';
  if (!form.optIn) errors.optIn = 'WhatsApp only allows messages to suppliers who agreed to receive them';
  if (form.optInSource.trim().length > 200) errors.optInSource = 'At most 200 characters';
  return errors;
}

export function toSupplierInput(form: SupplierFormState): SupplierInput {
  return {
    name: form.name.trim(),
    contactPerson: trimOrNull(form.contactPerson),
    whatsappNumber: form.whatsappNumber.trim(),
    phone: trimOrNull(form.phone),
    category: trimOrNull(form.category),
    address: trimOrNull(form.address),
    paymentTerms: trimOrNull(form.paymentTerms),
    notes: trimOrNull(form.notes),
    whatsappOptIn: form.optIn,
    whatsappOptInSource: trimOrNull(form.optInSource),
  };
}

/** A reason the API accepts (`ReasonSchema`: 3–1000 characters after trimming). */
export function reasonError(reason: string, min = 3): string | null {
  const t = reason.trim();
  if (t.length < min) return min <= 1 ? 'Write a note' : 'Give a reason';
  if (t.length > 1000) return 'At most 1000 characters';
  return null;
}
