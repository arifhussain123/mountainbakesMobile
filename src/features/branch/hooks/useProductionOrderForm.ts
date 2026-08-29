import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  clearOrderDraft,
  readOrderDraft,
  saveOrderDraft,
  type OrderDraftLine,
} from '@/common/database/repositories/orderDraftRepository';
import { toQty, writeOutcomeCopy, type WriteOutcomeCopy, type WriteSubject } from '@/common/ui';
import { businessDateStr } from '@/shared/utils/timezone';
import type { Product } from '@/shared/types/product.types';
import { useAuthStore } from '@/state/authStore';

import { useCreateProductionOrder } from './useCreateProductionOrder';
import { useOrderWindow } from './useOrderWindow';

/**
 * Everything screen 20 holds: the quantity map, the required date, the two
 * flags the footer reports, both submit paths, and the draft.
 *
 * The screen that uses this is composition only. That split is not tidiness —
 * the rules below (what a quantity of zero means, what the date gates, which
 * path clears the form) are the parts worth testing without a renderer, and the
 * parts that go wrong quietly.
 */

/**
 * One picked product.
 *
 * The map is keyed by product id and holds a **line**, not a bare number, and
 * that is load-bearing rather than convenient: the product list is filtered by a
 * debounced server-side search, so a branch that picks two rusks and then
 * searches "cake" no longer has the rusks in `products.data` at all. A review
 * built from the visible list would silently omit them, and the amount could not
 * be computed for a product the screen can no longer see. Selection captures
 * what the rest of the flow needs at the moment it happens.
 *
 * `rate` is captured for the same reason the payload used to copy it: the figure
 * the branch is shown must be the figure it agreed to. It is **not sent** — see
 * `submit()`.
 */
export interface OrderLine {
  productId: string;
  name: string;
  qty: number;
  /** Catalogue price at the moment the product was picked. Display only. */
  rate: number;
  remark: string;
}

/**
 * What a caller needs to name a line before it exists — the identity and the
 * rate, without the quantity it is about to be given or the remark it may never
 * get. `Omit<OrderLine, 'remark'>` was wrong here: it keeps `qty`, so every call
 * site had to invent one to change one.
 */
export type OrderLineIdentity = Pick<OrderLine, 'productId' | 'name' | 'rate'>;

/** Selected count, total units and total amount — one pass, never stored. */
export interface OrderTotals {
  selected: number;
  quantity: number;
  amount: number;
}

export type OrderBusy = 'draft' | 'submit' | null;

/**
 * Re-exported, not redefined. The rule — a quantity is a non-negative integer or
 * it is nothing — belongs to the control that takes it (`MBQtyStepper`), and a
 * second copy here would be the one that stops matching.
 */
export { toQty };

/** Shared wording for the outcome banner. */
const ORDER_SUBJECT: WriteSubject = {
  noun: 'order',
  confirmed: 'Order submitted to production.',
  refusedNote: 'do not send it again',
};

export interface ProductionOrderForm {
  lines: Record<string, OrderLine>;
  /** The picked lines, in a stable order. */
  selected: OrderLine[];
  totals: OrderTotals;

  requiredDate: string;
  setRequiredDate: (value: string) => void;
  /** Null until the field has been touched or a submit has been attempted. */
  dateError: string | null;

  setQty: (product: Product, qty: number) => void;
  setQtyFor: (line: OrderLineIdentity, qty: number) => void;
  setRemark: (productId: string, text: string) => void;

  /** Inline message for anything that is not the date — an empty basket, the window, a failure. */
  error: string | null;
  banner: WriteOutcomeCopy | null;
  dismissBanner: () => void;

  busy: OrderBusy;
  /** Epoch ms of the stored draft, or null when there is none. */
  draftSavedAt: number | null;
  /** True for one render pass after a stored draft has been put back on screen. */
  draftRestored: boolean;

  review: boolean;
  /** Validates, and opens the review only if the demand could actually be sent. */
  openReview: () => void;
  closeReview: () => void;

  submit: () => Promise<void>;
  saveDraft: () => Promise<void>;
  clear: () => Promise<void>;
}

export function useProductionOrderForm(): ProductionOrderForm {
  const branchId = useAuthStore(s => s.claims?.branchId);
  const { createProductionOrder } = useCreateProductionOrder();
  const orderWindow = useOrderWindow();

  const [lines, setLines] = useState<Record<string, OrderLine>>({});
  /**
   * Empty by default, and deliberately not "tomorrow".
   *
   * A pre-filled required date is a commitment nobody chose that submits without
   * ever being read — and this field is the one the server will not default for
   * exactly that reason. The cost is one more thing to type; the alternative is
   * a delivery date filed under the branch's name that no one at the branch
   * picked.
   */
  const [requiredDate, setRequiredDateValue] = useState('');
  const [dateTouched, setDateTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<WriteOutcomeCopy | null>(null);
  const [busy, setBusy] = useState<OrderBusy>(null);
  const [review, setReview] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  /**
   * `busy` is duplicated into a ref because both submit paths are async and a
   * second press can land before React has re-rendered with the new state — the
   * exact double-submit the flag exists to stop. The state drives the UI; the
   * ref decides.
   */
  const busyRef = useRef<OrderBusy>(null);

  /** Restore the branch's own unsent draft, once, on mount. */
  useEffect(() => {
    if (!branchId) return;
    let live = true;

    const restore = async (): Promise<void> => {
      const draft = await readOrderDraft(branchId).catch(() => null);
      if (!live || !draft || draft.lines.length === 0) return;

      setLines(fromDraftLines(draft.lines));
      setRequiredDateValue(draft.requiredDate);
      setDraftSavedAt(draft.savedAt);
      setDraftRestored(true);
    };
    restore().catch(() => undefined);

    return () => {
      live = false;
    };
  }, [branchId]);

  const selected = useMemo(
    () => Object.values(lines).filter(line => line.qty > 0),
    [lines],
  );

  /**
   * All three figures in one pass, and none of them stored.
   *
   * A stored total is a second answer to a question the lines already answer,
   * and the two disagree the first time a quantity changes through a path that
   * forgot to update it.
   */
  const totals = useMemo<OrderTotals>(() => {
    let quantity = 0;
    let amount = 0;
    for (const line of selected) {
      quantity += line.qty;
      amount += line.qty * line.rate;
    }
    return { selected: selected.length, quantity, amount };
  }, [selected]);

  /**
   * The date's own error, shown only once the field has been touched or a submit
   * has been attempted — an error on a field nobody has reached yet reads as the
   * form being broken rather than incomplete.
   */
  const dateError = useMemo(() => {
    if (!dateTouched) return null;
    return validateRequiredDate(requiredDate);
  }, [dateTouched, requiredDate]);

  const setRequiredDate = useCallback((value: string) => {
    setRequiredDateValue(value);
    setDateTouched(true);
  }, []);

  /**
   * A quantity of zero **deletes the line** rather than storing a 0.
   *
   * That is what makes "selected" the key count and nothing else, and it takes
   * the remark with it — a remark left behind on a removed line would be
   * resurrected, silently, by re-adding the product later.
   */
  const setQtyFor = useCallback((line: OrderLineIdentity, qty: number) => {
    setLines(current => {
      if (qty <= 0) {
        if (!current[line.productId]) return current;
        const rest = { ...current };
        delete rest[line.productId];
        return rest;
      }
      const existing = current[line.productId];
      return {
        ...current,
        [line.productId]: { ...line, qty, remark: existing?.remark ?? '' },
      };
    });
  }, []);

  /**
   * The table's view of it: the whole product, so the name and the rate are
   * captured at selection time.
   *
   * Passed to every row whole rather than wrapped per row — a
   * `qty => setQty(product, qty)` closure is a new function on every render,
   * which defeats the row's memoisation entirely and re-renders the visible
   * catalogue on every stepper tap.
   */
  const setQty = useCallback(
    (product: Product, qty: number) =>
      setQtyFor(
        { productId: product.id, name: product.name, rate: Number(product.price) || 0 },
        qty,
      ),
    [setQtyFor],
  );

  const setRemark = useCallback((productId: string, text: string) => {
    setLines(current => {
      const line = current[productId];
      return line ? { ...current, [productId]: { ...line, remark: text } } : current;
    });
  }, []);

  const dismissBanner = useCallback(() => setBanner(null), []);
  const closeReview = useCallback(() => setReview(false), []);

  /**
   * Everything that must be true before a demand may be queued, in the order the
   * person can act on it.
   *
   * The window check is here rather than left to the server because this write
   * is offline-first: a demand composed at 03:00 with no signal would be queued,
   * drained hours later, refused, and parked as a failed row — the branch
   * believing it ordered, Production never seeing it, and the only trace an
   * entry in Sync Center someone has to notice.
   */
  const openReview = useCallback(() => {
    setError(null);
    setDateTouched(true);

    if (selected.length === 0) {
      setError('Add at least one product.');
      return;
    }
    if (validateRequiredDate(requiredDate)) return; // the field carries this one

    // Not blocked while settings are still loading: guessing the window would
    // refuse a legitimate order on a slow connection, and the server is still
    // the authority.
    if (!orderWindow.isLoading && !orderWindow.isOpen) {
      setError(
        `Orders can be placed between ${orderWindow.opensAt} and ${orderWindow.closesAt}. ` +
          `It is ${orderWindow.nowAt} now.`,
      );
      return;
    }

    setReview(true);
  }, [orderWindow, requiredDate, selected.length]);

  const submit = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = 'submit';
    setBusy('submit');
    setError(null);

    try {
      const result = await createProductionOrder({
        /*
         * Products, quantities and remarks — and nothing else.
         *
         * `CreateProductionOrderSchema` has no rate and no amount: money on a
         * demand is Production's to work out, and Zod would strip the keys
         * silently anyway. The rate the branch was shown is kept on the local
         * line and in the draft, where it is a record of what they saw, not an
         * instruction about what anything costs.
         */
        items: selected.map(line => ({
          productId: line.productId,
          qty: line.qty,
          remarks: line.remark.trim(),
        })),
        requiredDate,
      });

      // Whatever the server made of it, this form is done with it — including a
      // refusal, which is now waiting for a person in Sync Center and must not
      // be sitting here to be sent a second time.
      setLines({});
      setRequiredDateValue('');
      setDateTouched(false);
      setReview(false);
      setDraftRestored(false);
      if (branchId) {
        await clearOrderDraft(branchId).catch(() => undefined);
      }
      setDraftSavedAt(null);
      setBanner(writeOutcomeCopy(result.outcome, ORDER_SUBJECT, result.reason));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the order.');
    } finally {
      busyRef.current = null;
      setBusy(null);
    }
  }, [branchId, createProductionOrder, requiredDate, selected]);

  /**
   * Save draft goes to the device and nowhere else, and it does **not** need a
   * required date — that is the whole difference between a draft and a demand.
   *
   * The form is left exactly as it is afterwards. A draft that cleared the
   * screen would be indistinguishable from a submit to anyone glancing at it,
   * which is the one confusion this button must not create.
   */
  const saveDraft = useCallback(async () => {
    if (busyRef.current) return;
    if (!branchId) {
      setError('No branch is associated with this account.');
      return;
    }
    if (selected.length === 0) {
      setError('Add at least one product.');
      return;
    }

    busyRef.current = 'draft';
    setBusy('draft');
    setError(null);

    try {
      const savedAt = Date.now();
      await saveOrderDraft(branchId, { lines: selected, requiredDate }, savedAt);
      setDraftSavedAt(savedAt);
      setDraftRestored(false);
    } catch {
      setError('Could not save the draft on this device.');
    } finally {
      busyRef.current = null;
      setBusy(null);
    }
  }, [branchId, requiredDate, selected]);

  /** Clear takes the stored draft with it, or the next mount puts it all back. */
  const clear = useCallback(async () => {
    setLines({});
    setRequiredDateValue('');
    setDateTouched(false);
    setError(null);
    setReview(false);
    setDraftRestored(false);
    setDraftSavedAt(null);
    if (branchId) await clearOrderDraft(branchId).catch(() => undefined);
  }, [branchId]);

  return {
    lines,
    selected,
    totals,
    requiredDate,
    setRequiredDate,
    dateError,
    setQty,
    setQtyFor,
    setRemark,
    error,
    banner,
    dismissBanner,
    busy,
    draftSavedAt,
    draftRestored,
    review,
    openReview,
    closeReview,
    submit,
    saveDraft,
    clear,
  };
}

/**
 * The required date's rules, in one place so the field and the submit path
 * cannot disagree about them.
 *
 * "Not in the past" is checked against the user's own clock only. The server
 * deliberately does not re-check it: ordinary clock skew at the day boundary
 * would otherwise reject a legitimate demand.
 */
function validateRequiredDate(value: string): string | null {
  if (value.trim() === '') return 'Enter the date this delivery is needed.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter the required date as YYYY-MM-DD.';
  if (value < businessDateStr()) return 'The required date cannot be in the past.';
  return null;
}

function fromDraftLines(list: readonly OrderDraftLine[]): Record<string, OrderLine> {
  const map: Record<string, OrderLine> = {};
  for (const line of list) {
    if (!line?.productId || !(line.qty > 0)) continue;
    map[line.productId] = {
      productId: line.productId,
      name: String(line.name ?? ''),
      qty: line.qty,
      rate: Number(line.rate) || 0,
      remark: String(line.remark ?? ''),
    };
  }
  return map;
}
