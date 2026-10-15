import { useState } from 'react';
import { useCreateBranchDiscount, useProductionOrders } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import type { ProductionOrder } from '@/api';

/** branchApp.md screen 07 — Request Discount: a claim against one of the branch's own demands. */
export function useRequestDiscountForm() {
  const demands = useProductionOrders();
  const createDiscount = useCreateBranchDiscount();

  const [demand, setDemand] = useState<ProductionOrder | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [reason, setReason] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const amount = parseFloat(amountInput) || 0;
  const canSubmit = !!demand && amount > 0 && reason.trim().length >= 3 && !createDiscount.isPending;

  const submit = async (): Promise<boolean> => {
    if (!canSubmit || !demand) return false;
    setSubmitError(null);
    try {
      await createDiscount.mutateAsync({ productionOrderId: demand.id, amount, reason: reason.trim() });
      setDemand(null);
      setAmountInput('');
      setReason('');
      return true;
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  return {
    demands: demands.data?.orders ?? [],
    demand,
    setDemand,
    amountInput,
    setAmountInput,
    reason,
    setReason,
    canSubmit,
    isSubmitting: createDiscount.isPending,
    submitError,
    submit,
  };
}
