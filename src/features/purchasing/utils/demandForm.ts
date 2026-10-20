import {
  PURCHASE_UNITS,
  type DemandInput,
  type PurchaseDemand,
  type PurchasePaymentPreference,
  type PurchasePriority,
  type PurchaseUnit,
} from '@/api/purchasingTypes';
import { numberToField, parseMoney, parseQuantity, trimOrNull } from './numbers';

/**
 * The New Demand form's state and its one mapping to `DemandInput`
 * (`DemandInputSchema`). Validation mirrors the schema so a mistake is shown on
 * its field before the round trip; the server re-checks everything.
 */

export interface DemandLineForm {
  /** Local row id, for React keys and field errors. */
  key: string;
  /** A catalog item, or null for free text. */
  itemId: string | null;
  itemCode: string | null;
  itemName: string;
  qty: string;
  unit: PurchaseUnit | null;
  note: string;
}

export interface DemandSupplierRef {
  id: string;
  name: string;
  whatsappNumber: string;
}

export interface DemandFormState {
  supplier: DemandSupplierRef | null;
  priority: PurchasePriority;
  requiredDate: string;
  notes: string;
  deliveryInstructions: string;
  paymentPreference: PurchasePaymentPreference;
  creditReference: string;
  creditAmount: string;
  creditTerms: string;
  creditDueDate: string;
  creditNotes: string;
  lines: DemandLineForm[];
}

let lineSeq = 0;
/** A new local row id. */
export function newLineKey(): string {
  lineSeq += 1;
  return `line-${Date.now().toString(36)}-${lineSeq}`;
}

export function emptyDemandLine(): DemandLineForm {
  return { key: newLineKey(), itemId: null, itemCode: null, itemName: '', qty: '', unit: null, note: '' };
}

export function emptyDemandForm(requiredDate: string): DemandFormState {
  return {
    supplier: null,
    priority: 'normal',
    requiredDate,
    notes: '',
    deliveryInstructions: '',
    paymentPreference: 'cash',
    creditReference: '',
    creditAmount: '',
    creditTerms: '',
    creditDueDate: '',
    creditNotes: '',
    lines: [emptyDemandLine()],
  };
}

export function asPurchaseUnit(unit: string | null | undefined): PurchaseUnit | null {
  return (PURCHASE_UNITS as readonly string[]).includes(unit ?? '') ? (unit as PurchaseUnit) : null;
}

/** A saved demand back into the form, for editing a draft. */
export function demandFormFromDemand(d: PurchaseDemand): DemandFormState {
  return {
    supplier: { id: d.supplierId, name: d.supplierName, whatsappNumber: d.supplierWhatsapp },
    priority: d.priority,
    requiredDate: d.requiredDate,
    notes: d.notes ?? '',
    deliveryInstructions: d.deliveryInstructions ?? '',
    paymentPreference: d.paymentPreference,
    creditReference: d.creditReference ?? '',
    creditAmount: numberToField(d.creditAmountRequested),
    creditTerms: d.creditTerms ?? '',
    creditDueDate: d.creditDueDate ?? '',
    creditNotes: d.creditNotes ?? '',
    lines: [...d.items]
      .sort((a, b) => a.lineNo - b.lineNo)
      .map((i) => ({
        key: newLineKey(),
        itemId: i.itemId,
        itemCode: i.itemCode,
        itemName: i.itemName,
        qty: numberToField(i.requestedQty),
        unit: asPurchaseUnit(i.unit),
        note: i.note ?? '',
      })),
  };
}

/** Field → message. Line fields are keyed `line.<key>.<field>`. */
export type DemandFormErrors = Record<string, string>;

export const MAX_DEMAND_LINES = 100;

export function validateDemandForm(form: DemandFormState): DemandFormErrors {
  const errors: DemandFormErrors = {};
  if (!form.supplier) errors.supplier = 'Choose a supplier';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.requiredDate)) errors.requiredDate = 'Choose the date it is needed by';
  if (form.lines.length === 0) errors.lines = 'Add at least one item';
  if (form.lines.length > MAX_DEMAND_LINES) errors.lines = `At most ${MAX_DEMAND_LINES} items`;
  for (const line of form.lines) {
    if (!line.itemName.trim()) errors[`line.${line.key}.itemName`] = 'Enter the item name';
    else if (line.itemName.trim().length > 120) errors[`line.${line.key}.itemName`] = 'At most 120 characters';
    const qty = parseQuantity(line.qty);
    if (!qty.ok) errors[`line.${line.key}.qty`] = qty.error;
    if (!line.unit) errors[`line.${line.key}.unit`] = 'Choose a unit';
    if (line.note.trim().length > 300) errors[`line.${line.key}.note`] = 'At most 300 characters';
  }
  if (form.notes.trim().length > 1000) errors.notes = 'At most 1000 characters';
  if (form.deliveryInstructions.trim().length > 1000) errors.deliveryInstructions = 'At most 1000 characters';
  if (form.paymentPreference === 'credit') {
    const amount = parseMoney(form.creditAmount, { positive: true });
    if (!amount.ok) errors.creditAmount = form.creditAmount.trim() ? amount.error : 'Enter the credit amount requested';
  }
  return errors;
}

/**
 * The request body. Credit fields go only with the Loan / Credit preference,
 * so switching back to Cash clears them on the server instead of leaving a
 * stale amount behind. Call `validateDemandForm` first — this assumes it passed.
 */
export function toDemandInput(form: DemandFormState): DemandInput {
  const credit = form.paymentPreference === 'credit';
  const creditAmount = parseMoney(form.creditAmount, { positive: true });
  return {
    supplierId: form.supplier?.id ?? '',
    priority: form.priority,
    requiredDate: form.requiredDate,
    notes: trimOrNull(form.notes),
    deliveryInstructions: trimOrNull(form.deliveryInstructions),
    paymentPreference: form.paymentPreference,
    creditReference: credit ? trimOrNull(form.creditReference) : null,
    creditAmountRequested: credit && creditAmount.ok ? creditAmount.value : null,
    creditTerms: credit ? trimOrNull(form.creditTerms) : null,
    creditDueDate: credit && form.creditDueDate ? form.creditDueDate : null,
    creditNotes: credit ? trimOrNull(form.creditNotes) : null,
    items: form.lines.map((line) => {
      const qty = parseQuantity(line.qty);
      return {
        itemId: line.itemId,
        itemName: line.itemName.trim(),
        itemCode: line.itemId ? line.itemCode : null,
        requestedQty: qty.ok ? qty.value : 0,
        unit: line.unit as PurchaseUnit,
        note: trimOrNull(line.note),
      };
    }),
  };
}
