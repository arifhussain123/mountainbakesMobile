import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/errors';
import { qk } from '@/api/queryKeys';
import { createProductionSale } from '@/api/services/productionService';
import { useCart } from '@/common/hooks/useCart';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { useDebouncedValue } from '@/common/hooks/useDebouncedValue';
import { cashReturned } from '@/common/helpers/saleTotals';
import type { SaleBusy, SaleSlip } from '@/common/till';
import { parseCurrency, round2 } from '@/common/utils/money';
import { PRODUCTION_SALE_PAYMENT_METHOD_VALUES } from '@/shared/schemas/order.schemas';
import { businessDateStr } from '@/shared/utils/timezone';

/**
 * The production counter's till.
 *
 * The same two stages and the same components as the branch's — see
 * `common/till/` — over an endpoint with three rules of its own, all of them the
 * server's:
 *
 * - **`staff` is a payment method** and takes no money. It is exempt from
 *   payment and excluded from every revenue total, so
 *   `CreateProductionSaleSchema.superRefine` requires a comment: that note is
 *   the only record of who took what and why. No cash is taken and none is sent.
 * - **No branch.** The schema accepts `branchId` and the handler ignores it —
 *   these orders are pinned to the Production sentinel branch — so nothing here
 *   sends one.
 * - **The write does NOT queue.** `POST /api/orders/production-sale` carries no
 *   `idempotent()` middleware and no `businessDate` field, so a retry would ring
 *   up a second sale and a queued row would land on the day it drained. It goes
 *   straight out and fails loudly. See the header of `ProductionSalesScreen`.
 *
 * The last of those is why this is a `useMutation` rather than
 * `writeOffline` — and why the sale comes back with the server's own figures,
 * which is the one way this till is better off than the branch's.
 */

export type CounterPaymentMethod = (typeof PRODUCTION_SALE_PAYMENT_METHOD_VALUES)[number];

export type CounterStage = 'items' | 'payment';

export interface CounterSaleResult {
  slip: SaleSlip;
  orderNumber: string;
  grandTotal: number;
}

export function useCounterSale() {
  const settings = useCatalogSettings();
  const cart = useCart(settings.tax);
  const queryClient = useQueryClient();

  const [stage, setStage] = useState<CounterStage>('items');

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CounterPaymentMethod>('cash');
  const [receivedText, setReceivedText] = useState('');

  const [busy, setBusy] = useState<SaleBusy>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Mirrored into a ref because both finishes are async and a second press can
   * land before React has re-rendered — the exact double-submit the flag exists
   * to stop. It matters more here than at a branch: this write has **no
   * idempotency key**, so a duplicate request is a duplicate sale rather than a
   * replayed answer.
   */
  const busyRef = useRef<SaleBusy>(null);

  const sell = useMutation({ mutationFn: createProductionSale });

  const grandTotal = cart.totals.grandTotal;
  const isStaff = paymentMethod === 'staff';
  /** A staff sale takes no money, so there is no cash to count even in `cash`. */
  const isCash = paymentMethod === 'cash' && !isStaff;
  const received = parseCurrency(receivedText);
  const recorded = isCash && receivedText.trim() !== '';

  const returned = recorded ? Math.max(0, cashReturned(received, grandTotal)) : 0;
  const stillDue = recorded ? Math.max(0, cashReturned(grandTotal, received)) : 0;
  const shortOnCash = recorded && stillDue > 0;

  /**
   * A staff sale needs a comment, checked here as well as on the server.
   *
   * `superRefine` refuses it and paths the issue at `notes`, so the server would
   * answer 400 with a field error. Checking first means the operator sees it
   * against the field instead of after a round trip, and it is the same rule
   * stated once in each place rather than two rules.
   */
  const staffNeedsNote = isStaff && notes.trim() === '';

  /**
   * Short cash **disables** the finishes; a missing staff comment does not.
   *
   * The difference is whether the reason is already on screen. Short cash draws
   * "Still due Rs. 50" in red directly above the buttons, so a dead button has
   * its explanation attached to it. A missing comment is an *absence* — nothing
   * shows it until something says so, and a button that simply will not press,
   * with an empty optional-looking field above it, reads as the app being
   * broken. So that one is pressed, refused, and explained at the field.
   */
  const canFinish = !cart.isEmpty && !shortOnCash;

  const toItems = useCallback(() => setStage('items'), []);

  const toPayment = useCallback(() => {
    setError(null);
    if (cart.isEmpty) {
      setError('Add at least one product.');
      return;
    }
    setStage('payment');
  }, [cart.isEmpty]);

  /** Note buttons ADD; `Exact` sets. Tendering is cumulative, settling is not. */
  const addCash = useCallback((amount: number) => {
    setReceivedText(current => String(parseCurrency(current) + amount));
  }, []);

  const setExact = useCallback(() => setReceivedText(String(grandTotal)), [grandTotal]);

  const reset = useCallback(() => {
    cart.clear();
    setStage('items');
    setSearchInput('');
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setPaymentMethod('cash');
    setReceivedText('');
    setError(null);
    sell.reset();
  }, [cart, sell]);

  const commit = useCallback(
    async (mode: 'save' | 'share'): Promise<CounterSaleResult | null> => {
      if (busyRef.current) return null;
      setError(null);

      if (cart.isEmpty) {
        setError('Add at least one product.');
        return null;
      }
      if (shortOnCash) {
        setError('The cash received does not cover the total.');
        return null;
      }
      if (staffNeedsNote) {
        setError('A staff sale needs a comment saying who took what and why.');
        return null;
      }

      busyRef.current = mode;
      setBusy(mode);
      try {
        const receipt = await sell.mutateAsync({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: cart.toOrderItems(),
          paymentMethod,
          // Only for a cash sale that took money. A staff sale collects nothing,
          // and the handler guards against a stray figure landing on an unpaid
          // order — so it is not sent in the first place.
          ...(recorded ? { receivedCash: received } : {}),
          notes: notes.trim(),
        });

        /**
         * The slip is built from the SERVER's figures, not the cart's.
         *
         * `ProductionSaleReceipt` carries the subtotal, discount, tax and grand
         * total the server actually recorded — so this till, unlike the branch's,
         * can print numbers nobody can disagree with. `authoritative` is what
         * says so, and it is what drops the `estimate` mark from the slip.
         *
         * `grossSubtotal` is reconstructed because the response does not name it:
         * the receipt's `subtotal` is net of discount, and the slip shows
         * Subtotal → Discount → Tax → Grand total so the arithmetic reconciles
         * visually. `taxRate` is derived from the two figures rather than from
         * cached settings, for the same reason everything else here is.
         */
        const slip: SaleSlip = {
          lines: cart.lines.map(line => ({ ...line })),
          totals: {
            grossSubtotal: round2(receipt.subtotal + receipt.discountTotal),
            discountTotal: receipt.discountTotal,
            subtotal: receipt.subtotal,
            taxRate: receipt.subtotal > 0 ? round2(receipt.taxAmount / receipt.subtotal) : 0,
            taxAmount: receipt.taxAmount,
            grandTotal: receipt.grandTotal,
          },
          paymentMethod,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          notes: notes.trim(),
          receivedCash: receipt.receivedCash ?? (recorded ? received : null),
          returned: receipt.cashReturned ?? (recorded ? returned : null),
          // The device's business day. The endpoint takes no `businessDate` and
          // the response carries none, so this is a label on the slip and never
          // anything the server was told.
          businessDate: businessDateStr(),
          ...(settings.currencySymbol ? { currencySymbol: settings.currencySymbol } : {}),
          orderNumber: receipt.orderNumber,
          confirmed: true,
          authoritative: true,
        };

        // The sale is in the list and the pool has moved. Both are server truths
        // this device now has a stale copy of.
        queryClient.invalidateQueries({ queryKey: qk.production.all() });

        reset();
        return { slip, orderNumber: receipt.orderNumber, grandTotal: receipt.grandTotal };
      } catch (err) {
        setError(messageFor(err));
        return null;
      } finally {
        busyRef.current = null;
        setBusy(null);
      }
    },
    [
      cart,
      customerName,
      customerPhone,
      notes,
      paymentMethod,
      queryClient,
      received,
      recorded,
      reset,
      returned,
      sell,
      settings.currencySymbol,
      shortOnCash,
      staffNeedsNote,
    ],
  );

  const save = useCallback(() => commit('save'), [commit]);
  const saveAndShare = useCallback(() => commit('share'), [commit]);

  return useMemo(
    () => ({
      cart,
      currencySymbol: settings.currencySymbol,

      stage,
      toItems,
      toPayment,

      searchInput,
      setSearchInput,
      search,

      customerName,
      setCustomerName,
      customerPhone,
      setCustomerPhone,
      notes,
      setNotes,
      paymentMethod,
      setPaymentMethod,

      isCash,
      isStaff,
      staffNeedsNote,
      receivedText,
      setReceivedText,
      addCash,
      setExact,
      returned,
      stillDue,
      shortOnCash,

      canFinish,
      busy,
      error,
      save,
      saveAndShare,
      reset,
    }),
    [
      addCash,
      busy,
      canFinish,
      cart,
      customerName,
      customerPhone,
      error,
      isCash,
      isStaff,
      notes,
      paymentMethod,
      receivedText,
      reset,
      returned,
      save,
      saveAndShare,
      search,
      searchInput,
      setExact,
      settings.currencySymbol,
      shortOnCash,
      staffNeedsNote,
      stage,
      stillDue,
      toItems,
      toPayment,
    ],
  );
}

export type CounterSaleForm = ReturnType<typeof useCounterSale>;

/**
 * What went wrong, in terms the counter can act on.
 *
 * A 409 is the one worth special-casing: the server's message names the products
 * that were short, and the sentence after it is the part an operator needs —
 * **nothing was sold**. This write does not queue and has no idempotency key, so
 * a refusal is final and the cart is still exactly as it was.
 */
function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    return err.kind === 'conflict'
      ? `${err.message} Nothing was sold — re-check the pool and try again.`
      : err.userMessage;
  }
  return err instanceof Error ? err.message : 'Could not record the sale.';
}
