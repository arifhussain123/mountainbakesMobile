import type {
  BillInput,
  PurchaseDemandDetail,
  PurchaseUnit,
  Quotation,
  QuotationAvailability,
  QuotationInput,
  ReceiptInput,
} from '@/api/purchasingTypes';
import { asPurchaseUnit, newLineKey } from './demandForm';
import { lineTotalPreview, numberToField, parseMoney, parseQuantity, sumMoney, trimOrNull } from './numbers';

/**
 * Forms Production fills in on a supplier's behalf — a quotation or a bill
 * the supplier sent as a plain WhatsApp message — and the goods receipt.
 * Each maps to exactly one request body, validated the way the schema does.
 */

export type FormErrors = Record<string, string>;

// ── Quotation ───────────────────────────────────────────────────────────────

export interface QuotationLineForm {
  key: string;
  /** The requested line this answers; null for a substitute. */
  demandItemId: string | null;
  /** A substitute's requested line. */
  substituteForDemandItemId: string | null;
  itemName: string;
  unit: PurchaseUnit | null;
  requestedQty: number | null;
  availability: QuotationAvailability;
  availableQty: string;
  unitRate: string;
  note: string;
}

export interface QuotationFormState {
  lines: QuotationLineForm[];
  deliveryCharge: string;
  estimatedDeliveryDate: string;
  deliveryNotes: string;
  notes: string;
}

/** One line per requested item, prefilled "available, as requested". */
export function quotationFormFromDemand(demand: Pick<PurchaseDemandDetail, 'items'>): QuotationFormState {
  return {
    lines: [...demand.items]
      .sort((a, b) => a.lineNo - b.lineNo)
      .map((item) => ({
        key: newLineKey(),
        demandItemId: item.id,
        substituteForDemandItemId: null,
        itemName: item.itemName,
        unit: asPurchaseUnit(item.unit),
        requestedQty: item.requestedQty,
        availability: 'available' as const,
        availableQty: numberToField(item.requestedQty),
        unitRate: '',
        note: '',
      })),
    deliveryCharge: '0',
    estimatedDeliveryDate: '',
    deliveryNotes: '',
    notes: '',
  };
}

/** A substitute offered in place of a requested line. */
export function substituteLine(forLine: QuotationLineForm): QuotationLineForm {
  return {
    key: newLineKey(),
    demandItemId: null,
    substituteForDemandItemId: forLine.demandItemId,
    itemName: '',
    unit: forLine.unit,
    requestedQty: null,
    availability: 'substitute',
    availableQty: '',
    unitRate: '',
    note: '',
  };
}

/** Switching availability keeps the quantity honest: unavailable is 0, available is the requested amount. */
export function withAvailability(line: QuotationLineForm, availability: QuotationAvailability): QuotationLineForm {
  if (availability === 'unavailable') return { ...line, availability, availableQty: '0', unitRate: line.unitRate || '0' };
  if (availability === 'available' && line.requestedQty !== null) return { ...line, availability, availableQty: numberToField(line.requestedQty) };
  if (line.availability === 'unavailable') return { ...line, availability, availableQty: '' };
  return { ...line, availability };
}

export function validateQuotationForm(form: QuotationFormState): FormErrors {
  const errors: FormErrors = {};
  if (form.lines.length === 0) errors.lines = 'Add at least one line';
  for (const line of form.lines) {
    const k = `line.${line.key}`;
    if (!line.itemName.trim()) errors[`${k}.itemName`] = 'Enter the item name';
    if (line.availability === 'unavailable') {
      const qty = parseQuantity(line.availableQty || '0', { allowZero: true });
      if (!qty.ok || qty.value !== 0) errors[`${k}.availableQty`] = 'An unavailable item has quantity 0';
    } else {
      const qty = parseQuantity(line.availableQty);
      if (!qty.ok) errors[`${k}.availableQty`] = line.availableQty.trim() ? qty.error : 'Enter the quantity available';
      else if (line.availability === 'partial' && line.requestedQty !== null && qty.value >= line.requestedQty) {
        errors[`${k}.availableQty`] = 'Partial means less than requested — choose Available instead';
      }
    }
    const rate = parseMoney(line.unitRate || (line.availability === 'unavailable' ? '0' : ''));
    if (!rate.ok) errors[`${k}.unitRate`] = line.unitRate.trim() ? rate.error : 'Enter the rate';
    if (line.availability === 'substitute' && !line.unit) errors[`${k}.unit`] = 'Choose a unit';
  }
  const delivery = parseMoney(form.deliveryCharge || '0');
  if (!delivery.ok) errors.deliveryCharge = delivery.error;
  return errors;
}

export function toQuotationInput(form: QuotationFormState): QuotationInput {
  const delivery = parseMoney(form.deliveryCharge || '0');
  return {
    items: form.lines.map((line) => {
      const qty = parseQuantity(line.availableQty || '0', { allowZero: true });
      const rate = parseMoney(line.unitRate || '0');
      return {
        demandItemId: line.availability === 'substitute' ? null : line.demandItemId,
        substituteForDemandItemId: line.availability === 'substitute' ? line.substituteForDemandItemId : null,
        itemName: line.itemName.trim(),
        ...(line.unit ? { unit: line.unit } : {}),
        availableQty: line.availability === 'unavailable' ? 0 : qty.ok ? qty.value : 0,
        unitRate: rate.ok ? rate.value : 0,
        availability: line.availability,
        note: trimOrNull(line.note),
      };
    }),
    deliveryCharge: delivery.ok ? delivery.value : 0,
    estimatedDeliveryDate: form.estimatedDeliveryDate || null,
    deliveryNotes: trimOrNull(form.deliveryNotes),
    notes: trimOrNull(form.notes),
  };
}

/** A preview of the total the server will compute — shown as an estimate, never saved. */
export function quotationTotalPreview(form: QuotationFormState): number | null {
  const parts: number[] = [];
  for (const line of form.lines) {
    if (line.availability === 'unavailable') continue;
    const qty = parseQuantity(line.availableQty);
    const rate = parseMoney(line.unitRate);
    if (!qty.ok || !rate.ok) return null;
    parts.push(lineTotalPreview(qty.value, rate.value));
  }
  const delivery = parseMoney(form.deliveryCharge || '0');
  if (!delivery.ok) return null;
  return sumMoney([...parts, delivery.value]);
}

// ── Bill ────────────────────────────────────────────────────────────────────

export interface BillLineForm {
  key: string;
  quotationItemId: string;
  itemName: string;
  unit: string;
  quotedQty: number;
  quotedRate: number;
  included: boolean;
  qty: string;
  unitRate: string;
}

export interface BillFormState {
  supplierBillNo: string;
  invoiceDate: string;
  deliveryDate: string;
  lines: BillLineForm[];
  quotedDeliveryCharge: number;
  deliveryCharge: string;
  discount: string;
  otherCharges: string;
  otherChargesNote: string;
  supplierPaymentMethod: string;
  supplierStatedPaid: string;
  notes: string;
}

/** A bill exactly as the approved quotation, lines with nothing available left out. */
export function billFormFromQuotation(quotation: Quotation, invoiceDate: string): BillFormState {
  return {
    supplierBillNo: '',
    invoiceDate,
    deliveryDate: '',
    lines: [...quotation.items]
      .filter((l) => l.availableQty > 0)
      .sort((a, b) => a.lineNo - b.lineNo)
      .map((l) => ({
        key: newLineKey(),
        quotationItemId: l.id,
        itemName: l.itemName,
        unit: l.unit,
        quotedQty: l.availableQty,
        quotedRate: l.unitRate,
        included: true,
        qty: numberToField(l.availableQty),
        unitRate: numberToField(l.unitRate),
      })),
    quotedDeliveryCharge: quotation.deliveryCharge,
    deliveryCharge: numberToField(quotation.deliveryCharge) || '0',
    discount: '0',
    otherCharges: '0',
    otherChargesNote: '',
    supplierPaymentMethod: '',
    supplierStatedPaid: '0',
    notes: '',
  };
}

export function validateBillForm(form: BillFormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.supplierBillNo.trim()) errors.supplierBillNo = 'Enter the bill number';
  else if (form.supplierBillNo.trim().length > 60) errors.supplierBillNo = 'At most 60 characters';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.invoiceDate)) errors.invoiceDate = 'Choose the invoice date';
  const included = form.lines.filter((l) => l.included);
  if (included.length === 0) errors.lines = 'A bill needs at least one line';
  for (const line of included) {
    const qty = parseQuantity(line.qty);
    if (!qty.ok) errors[`line.${line.key}.qty`] = qty.error;
    const rate = parseMoney(line.unitRate);
    if (!rate.ok) errors[`line.${line.key}.unitRate`] = rate.error;
  }
  for (const field of ['deliveryCharge', 'discount', 'otherCharges', 'supplierStatedPaid'] as const) {
    const m = parseMoney(form[field] || '0');
    if (!m.ok) errors[field] = m.error;
  }
  return errors;
}

export function toBillInput(form: BillFormState): BillInput {
  const money = (text: string) => {
    const m = parseMoney(text || '0');
    return m.ok ? m.value : 0;
  };
  return {
    supplierBillNo: form.supplierBillNo.trim(),
    invoiceDate: form.invoiceDate,
    deliveryDate: form.deliveryDate || null,
    items: form.lines
      .filter((l) => l.included)
      .map((l) => {
        const qty = parseQuantity(l.qty);
        return { quotationItemId: l.quotationItemId, qty: qty.ok ? qty.value : 0, unitRate: money(l.unitRate) };
      }),
    deliveryCharge: money(form.deliveryCharge),
    discount: money(form.discount),
    otherCharges: money(form.otherCharges),
    otherChargesNote: trimOrNull(form.otherChargesNote),
    supplierPaymentMethod: trimOrNull(form.supplierPaymentMethod),
    supplierStatedPaid: money(form.supplierStatedPaid),
    notes: trimOrNull(form.notes),
  };
}

/**
 * Where this bill departs from the approved quotation — the same comparison
 * the server makes, shown before saving so nobody is surprised that approving
 * it will need the differences accepted.
 */
export function billDifferencesPreview(form: BillFormState): string[] {
  const out: string[] = [];
  for (const line of form.lines) {
    if (!line.included) {
      out.push(`${line.itemName}: left off the bill`);
      continue;
    }
    const qty = parseQuantity(line.qty);
    const rate = parseMoney(line.unitRate);
    if (qty.ok && qty.value !== line.quotedQty) out.push(`${line.itemName}: quantity ${line.quotedQty} → ${qty.value}`);
    if (rate.ok && rate.value !== line.quotedRate) out.push(`${line.itemName}: rate ${line.quotedRate} → ${rate.value}`);
  }
  const delivery = parseMoney(form.deliveryCharge || '0');
  if (delivery.ok && delivery.value !== form.quotedDeliveryCharge) out.push(`Delivery charge ${form.quotedDeliveryCharge} → ${delivery.value}`);
  const other = parseMoney(form.otherCharges || '0');
  if (other.ok && other.value > 0) out.push(`Other charges ${other.value}`);
  return out;
}

/** The bill's grand total as the server will compute it — a preview only. */
export function billTotalPreview(form: BillFormState): number | null {
  const parts: number[] = [];
  for (const line of form.lines) {
    if (!line.included) continue;
    const qty = parseQuantity(line.qty);
    const rate = parseMoney(line.unitRate);
    if (!qty.ok || !rate.ok) return null;
    parts.push(lineTotalPreview(qty.value, rate.value));
  }
  const delivery = parseMoney(form.deliveryCharge || '0');
  const other = parseMoney(form.otherCharges || '0');
  const discount = parseMoney(form.discount || '0');
  if (!delivery.ok || !other.ok || !discount.ok) return null;
  return sumMoney([...parts, delivery.value, other.value, -discount.value]);
}

// ── Goods receipt ───────────────────────────────────────────────────────────

export interface ReceiptLineForm {
  billItemId: string;
  itemName: string;
  unit: string;
  outstanding: number;
  /** The ingredient-stock item this line adds to. */
  itemId: string | null;
  itemLabel: string | null;
  /** The demand named a catalog item for this line: the receipt must go to that one (server rule). */
  itemFixed: boolean;
  received: string;
  damaged: string;
  note: string;
}

export interface ReceiptFormState {
  lines: ReceiptLineForm[];
  final: boolean;
  notes: string;
}

/**
 * The stock item behind an approved-bill line, when the demand line it came
 * from was picked from the catalog: bill line → quotation line → demand line
 * → itemId. Free-text lines (and substitutes) have none; the person picks one.
 */
export function stockItemForBillLine(detail: Pick<PurchaseDemandDetail, 'bills' | 'quotations' | 'items'>, billItemId: string): { id: string; name: string } | null {
  const billLine = detail.bills.flatMap((b) => b.items).find((i) => i.id === billItemId);
  if (!billLine?.quotationItemId) return null;
  const qLine = detail.quotations.flatMap((q) => q.items).find((i) => i.id === billLine.quotationItemId);
  const demandItemId = qLine?.demandItemId;
  if (!demandItemId) return null;
  const demandLine = detail.items.find((i) => i.id === demandItemId);
  return demandLine?.itemId ? { id: demandLine.itemId, name: demandLine.itemName } : null;
}

/** One row per approved-bill line still owed, prefilled with the full outstanding quantity. */
export function receiptFormFromDetail(detail: Pick<PurchaseDemandDetail, 'bills' | 'quotations' | 'items' | 'receiptProgress'>): ReceiptFormState {
  return {
    lines: detail.receiptProgress
      .filter((p) => p.outstanding > 0)
      .map((p) => {
        const stock = stockItemForBillLine(detail, p.billItemId);
        return {
          billItemId: p.billItemId,
          itemName: p.itemName,
          unit: p.unit,
          outstanding: p.outstanding,
          itemId: stock?.id ?? null,
          itemLabel: stock?.name ?? null,
          itemFixed: !!stock,
          received: numberToField(p.outstanding),
          damaged: '',
          note: '',
        };
      }),
    final: false,
    notes: '',
  };
}

export function validateReceiptForm(form: ReceiptFormState): FormErrors {
  const errors: FormErrors = {};
  let anyReceived = false;
  for (const line of form.lines) {
    const k = `line.${line.billItemId}`;
    const received = parseQuantity(line.received || '0', { allowZero: true });
    const damaged = parseQuantity(line.damaged || '0', { allowZero: true });
    if (!received.ok) {
      errors[`${k}.received`] = received.error;
      continue;
    }
    if (!damaged.ok) errors[`${k}.damaged`] = damaged.error;
    if (received.value > line.outstanding) errors[`${k}.received`] = `Only ${line.outstanding} ${line.unit} is still owed`;
    if (damaged.ok && damaged.value > received.value) errors[`${k}.damaged`] = 'Damaged cannot exceed received';
    if (received.value > 0) {
      anyReceived = true;
      if (!line.itemId) errors[`${k}.itemId`] = 'Choose the stock item';
    }
  }
  if (!anyReceived && !form.final) errors.lines = 'Enter what arrived, or tick "Nothing more is coming" to close the receipt';
  return errors;
}

export function toReceiptInput(form: ReceiptFormState): ReceiptInput {
  return {
    items: form.lines
      .map((line) => {
        const received = parseQuantity(line.received || '0', { allowZero: true });
        const damaged = parseQuantity(line.damaged || '0', { allowZero: true });
        return {
          billItemId: line.billItemId,
          itemId: line.itemId ?? '',
          receivedQty: received.ok ? received.value : 0,
          damagedQty: damaged.ok ? damaged.value : 0,
          note: trimOrNull(line.note),
        };
      })
      .filter((l) => l.receivedQty > 0),
    final: form.final,
    notes: trimOrNull(form.notes),
  };
}

