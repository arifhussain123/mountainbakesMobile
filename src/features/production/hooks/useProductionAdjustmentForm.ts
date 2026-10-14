import { useState } from 'react';
import { useCreateProductionAdjustment } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import type { Product, ProductionAdjustmentResult, ProductionAdjustmentType } from '@/api';

export type AdjustmentDirection = 'in' | 'out';

/**
 * `POST /production-stock/adjustment` — books ONE signed movement with a
 * mandatory reason. The user picks a direction (add/remove) and an unsigned
 * quantity; the sign is derived here, never typed directly, so "remove 5" can
 * never be mistyped as a silent +5.
 */
export function useProductionAdjustmentForm() {
  const createAdjustment = useCreateProductionAdjustment();

  const [product, setProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<ProductionAdjustmentType>('count_correction');
  const [direction, setDirection] = useState<AdjustmentDirection>('out');
  const [qtyInput, setQtyInput] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ProductionAdjustmentResult | null>(null);

  const qty = parseInt(qtyInput, 10) || 0;
  const canSubmit = !!product && qty > 0 && reason.trim().length > 0 && !createAdjustment.isPending;

  const submit = async (): Promise<boolean> => {
    if (!product || qty <= 0) return false;
    setSubmitError(null);
    try {
      const signedQty = direction === 'out' ? -qty : qty;
      const outcome = await createAdjustment.mutateAsync({
        productId: product.id,
        adjustmentType,
        qty: signedQty,
        reason: reason.trim(),
        remarks: remarks.trim() || undefined,
      });
      setResult(outcome);
      return true;
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  return {
    product,
    setProduct,
    adjustmentType,
    setAdjustmentType,
    direction,
    setDirection,
    qtyInput,
    setQtyInput,
    reason,
    setReason,
    remarks,
    setRemarks,
    canSubmit,
    isSubmitting: createAdjustment.isPending,
    submitError,
    result,
    submit,
  };
}
