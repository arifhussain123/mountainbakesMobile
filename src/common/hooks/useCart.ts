import { useCallback, useMemo, useState } from 'react';
import type { Product } from '@/shared/types/product.types';
import { toNumber } from '@/common/utils/money';
import { saleTotals, type CartLine, type TaxSettings } from '@/common/helpers/saleTotals';

/**
 * POS basket.
 *
 * Lines are keyed by product: tapping the same product again increments the
 * quantity rather than adding a second line. A cashier ringing up three of the
 * same rusk expects one line of 3, and duplicate lines make the discount field
 * ambiguous.
 */
export function useCart(settings: TaxSettings = {}) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addProduct = useCallback((product: Product, qty = 1) => {
    setLines(current => {
      const existing = current.find(l => l.productId === product.id);
      if (existing) {
        return current.map(l => (l.productId === product.id ? { ...l, qty: l.qty + qty } : l));
      }
      return [
        ...current,
        {
          productId: product.id,
          productName: product.name,
          // Cached price, for the running total only. Never sent.
          unitPrice: toNumber(product.price),
          qty,
          discount: 0,
        },
      ];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines(current =>
      qty <= 0
        ? current.filter(l => l.productId !== productId)
        : current.map(l => (l.productId === productId ? { ...l, qty } : l)),
    );
  }, []);

  const setDiscount = useCallback((productId: string, discount: number) => {
    setLines(current => current.map(l => (l.productId === productId ? { ...l, discount } : l)));
  }, []);

  const remove = useCallback((productId: string) => {
    setLines(current => current.filter(l => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totals = useMemo(() => saleTotals(lines, settings), [lines, settings]);
  const itemCount = useMemo(() => lines.reduce((n, l) => n + l.qty, 0), [lines]);

  /**
   * The request payload.
   *
   * Only `{productId, qty, discount}` per line — no price, no total. The server
   * resolves the current price and recomputes everything, which is what makes a
   * price change between opening the form and saving impossible to misprint.
   */
  const toOrderItems = useCallback(
    () =>
      lines.map(l => ({
        productId: l.productId,
        qty: l.qty,
        discount: l.discount,
      })),
    [lines],
  );

  /**
   * Memoised, and that is load-bearing rather than tidy.
   *
   * The POS builds its product `renderItem` from a callback that closes over the
   * cart. A fresh object here made that callback new on every render, which made
   * FlashList's `renderItem` new on every render, which re-rendered every visible
   * product row on every keystroke and every tap — on the one screen staff use
   * dozens of times a day, holding a cheap handset. The rows below are memoised;
   * this is what makes that memoisation reachable.
   */
  return useMemo(
    () => ({
      lines,
      itemCount,
      totals,
      addProduct,
      setQty,
      setDiscount,
      remove,
      clear,
      toOrderItems,
      isEmpty: lines.length === 0,
    }),
    [lines, itemCount, totals, addProduct, setQty, setDiscount, remove, clear, toOrderItems],
  );
}
