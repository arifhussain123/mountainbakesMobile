import { useCallback, useMemo, useRef, useState } from 'react';

import { useCart } from '@/common/hooks/useCart';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { useDebouncedValue } from '@/common/hooks/useDebouncedValue';
import { useCreateSale, type SaleOutcome } from '@/api/hooks/useSalesApi';
import { cashReturned } from '@/common/helpers/saleTotals';
import type { SaleBusy, SaleSlip } from '@/common/till';
import { parseCurrency } from '@/common/utils/money';
import { PAYMENT_METHOD_VALUES } from '@/shared/schemas/order.schemas';

/**
 * Everything the till holds: the stage, the cart, the money taken, and both
 * ways of finishing.
 *
 * The screen that uses this is composition and a stage switch. The rules worth
 * separating out are the ones a renderer cannot show you — which button may be
 * pressed, what "short on cash" means, what is captured before the cart is
 * emptied — and those are all here.
 */

/** The catalogue-wide chip. Not a category id, so it can never collide with one. */
export const ALL_CATEGORIES = 'all';

export type SaleStage = 'items' | 'payment';

export type PaymentMethod = (typeof PAYMENT_METHOD_VALUES)[number];

/**
 * A finished sale: the slip the receipt renders, plus what the register has to
 * be told.
 *
 * `outcome` and `reason` are not on `SaleSlip` deliberately — a slip has no
 * `refused` state, because a refused sale did not happen and printing one is how
 * a customer walks out holding proof of a sale the business has no record of.
 * They ride alongside so `NewSaleScreen` can hand them to the register, which is
 * the screen the three outcomes actually have consequences on.
 */
export interface SaleCompletion extends SaleSlip {
  paymentMethod: PaymentMethod;
  outcome: SaleOutcome;
  reason?: string;
}

export function useNewSale() {
  const settings = useCatalogSettings();
  const cart = useCart(settings.tax);
  const { createSale } = useCreateSale();

  const [stage, setStage] = useState<SaleStage>('items');

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [receivedText, setReceivedText] = useState('');

  const [busy, setBusy] = useState<SaleBusy>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * `busy` is mirrored into a ref because both finishes are async and a second
   * press can land before React has re-rendered with the new state — which is
   * the exact double-submit the flag exists to stop, and on a till it books the
   * same sale twice. The state drives the buttons; the ref decides.
   */
  const busyRef = useRef<SaleBusy>(null);

  const grandTotal = cart.totals.grandTotal;
  const isCash = paymentMethod === 'cash';
  const received = parseCurrency(receivedText);
  const recorded = isCash && receivedText.trim() !== '';

  /**
   * Change owed, and what is still owed.
   *
   * Two numbers rather than one signed one, because they are two different
   * sentences at the counter — "give back 752" and "still due 250" — and a
   * screen that prints a negative change figure makes the cashier do the sign in
   * their head while somebody waits.
   */
  const returned = recorded ? Math.max(0, cashReturned(received, grandTotal)) : 0;
  const stillDue = recorded ? Math.max(0, cashReturned(grandTotal, received)) : 0;

  /**
   * Short cash blocks both finishes.
   *
   * **An empty field is not short.** It means the cashier did not record the
   * tender, which is a normal thing to skip on a card or wallet sale and on a
   * cash sale where the exact money was handed over — the key is simply omitted
   * from the payload. Treating blank as zero would refuse most sales on the
   * screen used most often.
   */
  const shortOnCash = recorded && stillDue > 0;
  const canFinish = !cart.isEmpty && !shortOnCash;

  const toItems = useCallback(() => setStage('items'), []);

  /** Forward is guarded here rather than only by a disabled button. */
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

  const setExact = useCallback(() => {
    setReceivedText(String(grandTotal));
  }, [grandTotal]);

  const reset = useCallback(() => {
    cart.clear();
    setStage('items');
    setSearchInput('');
    setCategoryId(ALL_CATEGORIES);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setPaymentMethod('cash');
    setReceivedText('');
    setError(null);
  }, [cart]);

  /**
   * The one write, behind both buttons.
   *
   * `mode` decides only what the caller does afterwards — it is carried in
   * `busy` so the spinner lands on the button that was actually pressed, and it
   * is the reason this is one flag rather than two booleans: two permit a fourth
   * state that means nothing (both saving) and reliably produce it the first
   * time somebody double-taps across the pair.
   *
   * The snapshot is taken **before** the reset, and the reset happens only on a
   * result. A write that threw leaves the cart exactly as it was, because the
   * sale has not been recorded anywhere and the cashier's next move is to try
   * again, not to ring it up from scratch.
   */
  const commit = useCallback(
    async (mode: 'save' | 'share'): Promise<SaleCompletion | null> => {
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

      busyRef.current = mode;
      setBusy(mode);
      try {
        const result = await createSale({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: cart.toOrderItems(),
          paymentMethod,
          // Only meaningful for cash; the server validates it covers the total.
          ...(recorded ? { receivedCash: received } : {}),
          notes: notes.trim(),
        });

        const completion: SaleCompletion = {
          lines: cart.lines.map(line => ({ ...line })),
          totals: cart.totals,
          paymentMethod,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          notes: notes.trim(),
          receivedCash: recorded ? received : null,
          returned: recorded ? returned : null,
          businessDate: result.businessDate,
          // The branch till is offline-first, so "the server has it" is exactly
          // `synced` and nothing else — a queued sale has no sale number and
          // nobody at head office can see it yet.
          confirmed: result.outcome === 'synced',
          // Never. `/api/orders/pos` recomputes every total and returns its own
          // snapshot, but this write path is offline-first and hands back an
          // outcome, not a body — so even a synced sale's figures here are the
          // device's arithmetic over cached AppSettings.
          authoritative: false,
          outcome: result.outcome,
          ...(result.reason ? { reason: result.reason } : {}),
          ...(settings.currencySymbol ? { currencySymbol: settings.currencySymbol } : {}),
        };

        reset();
        return completion;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not record the sale.');
        return null;
      } finally {
        busyRef.current = null;
        setBusy(null);
      }
    },
    [
      cart,
      createSale,
      customerName,
      customerPhone,
      notes,
      paymentMethod,
      received,
      recorded,
      reset,
      returned,
      settings.currencySymbol,
      shortOnCash,
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
      categoryId,
      setCategoryId,

      customerName,
      setCustomerName,
      customerPhone,
      setCustomerPhone,
      notes,
      setNotes,
      paymentMethod,
      setPaymentMethod,

      isCash,
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
      categoryId,
      customerName,
      customerPhone,
      error,
      isCash,
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
      stage,
      stillDue,
      toItems,
      toPayment,
    ],
  );
}

export type NewSaleForm = ReturnType<typeof useNewSale>;
