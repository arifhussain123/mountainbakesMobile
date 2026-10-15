import { useMemo, useRef, useState } from 'react';
import { generateIdempotencyKey, useCreatePosSale, useProducts, useStock } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import type { InsufficientStockDetail, PaymentMethod, Product } from '@/api';

interface SaleLine {
  key: string;
  product: Product | null;
  qty: number;
  discountInput: string;
}

let nextKey = 0;
const newLine = (): SaleLine => ({ key: String(nextKey++), product: null, qty: 1, discountInput: '' });

/** `"10%"` or a flat amount, matching the reference design's own convention. */
function resolveDiscount(raw: string, lineGross: number): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  if (trimmed.endsWith('%')) {
    const pct = parseFloat(trimmed) || 0;
    return Math.round(lineGross * pct) / 100;
  }
  return Math.min(lineGross, Math.max(0, parseFloat(trimmed) || 0));
}

export function useNewSaleForm() {
  const branchId = useAuthStore((state) => state.user?.branchId ?? null);
  const products = useProducts();
  const stock = useStock();
  const createSale = useCreatePosSale();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [lines, setLines] = useState<SaleLine[]>([newLine()]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [receivedCash, setReceivedCash] = useState('');
  const [insufficientStock, setInsufficientStock] = useState<InsufficientStockDetail[] | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Minted once per sale attempt and reused on every retry — a new key would let
  // a timed-out submit followed by "try again" double-book the same sale.
  const idempotencyKeyRef = useRef(generateIdempotencyKey('sale'));

  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stock.data?.rows ?? []) map.set(row.productId, row.balance);
    return map;
  }, [stock.data]);

  const computedLines = useMemo(
    () =>
      lines.map((line) => {
        const gross = (line.product?.price ?? 0) * line.qty;
        const discount = resolveDiscount(line.discountInput, gross);
        return { ...line, gross, discount, amount: gross - discount };
      }),
    [lines],
  );

  const subtotal = computedLines.reduce((sum, l) => sum + l.gross, 0);
  const discountTotal = computedLines.reduce((sum, l) => sum + l.discount, 0);
  const grandTotal = Math.max(0, subtotal - discountTotal);

  const receivedCashNumber = parseFloat(receivedCash) || 0;
  const changeDue = paymentMethod === 'cash' ? receivedCashNumber - grandTotal : null;

  const hasValidLine = computedLines.some((l) => l.product && l.qty > 0);
  const cashCovers = paymentMethod !== 'cash' || receivedCashNumber >= grandTotal;
  const canSubmit = hasValidLine && cashCovers && !createSale.isPending && !!branchId;

  const updateLine = (key: string, patch: Partial<SaleLine>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (key: string) => setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.key !== key) : prev));

  const submit = async (): Promise<boolean> => {
    if (!canSubmit || !branchId) return false;
    setSubmitError(null);
    setInsufficientStock(null);

    const items = computedLines
      .filter((line) => line.product && line.qty > 0)
      .map((line) => ({ productId: line.product!.id, qty: line.qty, discount: Math.round(line.discount) }));

    try {
      await createSale.mutateAsync({
        input: {
          branchId,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items,
          paymentMethod,
          receivedCash: paymentMethod === 'cash' ? receivedCashNumber : undefined,
        },
        idempotencyKey: idempotencyKeyRef.current,
      });
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 409) {
        const details = (error as { details?: unknown }).details;
        if (Array.isArray(details)) setInsufficientStock(details as InsufficientStockDetail[]);
      }
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  return {
    products: products.data?.products ?? [],
    productsLoading: products.isLoading,
    stockByProductId,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    lines: computedLines,
    addLine,
    removeLine,
    updateLine,
    paymentMethod,
    setPaymentMethod,
    receivedCash,
    setReceivedCash,
    subtotal,
    discountTotal,
    grandTotal,
    changeDue,
    insufficientStock,
    submitError,
    canSubmit,
    isSubmitting: createSale.isPending,
    submit,
  };
}
