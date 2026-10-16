import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCreateBranchDiscount, useProductionOrders } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useNetworkStatus } from '@/shared/hooks';
import type { BranchDiscount, ProductionOrder } from '@/api';
import { ReviseDiscountSchema, type ReviseDiscountFormValues } from '../schemas';
import { useDiscountActions } from './useDiscountActions';
import { findExistingClaim } from '../utils';

export interface UseDiscountFormOptions {
  /** `null`/omitted → create mode. A claim → edit (Change/Correct) mode, demand fixed to the claim's own demand. */
  editItem?: BranchDiscount | null;
  existingClaims?: BranchDiscount[];
}

/**
 * One form, shared by Request Discount (create) and Change/Correct (revise) —
 * "do not build a second discount form." Amount/reason share the same
 * server-matching Zod rules either way (`ReviseDiscountSchema`); only create
 * mode also requires picking a demand, which is plain local state (not an
 * RHF field) since the server's own revise schema has no demand field at all
 * — re-pointing a claim to a different demand isn't a "revision".
 */
export function useDiscountForm({ editItem, existingClaims = [] }: UseDiscountFormOptions) {
  const mode: 'create' | 'edit' = editItem ? 'edit' : 'create';
  const demandsQuery = useProductionOrders();
  const createDiscount = useCreateBranchDiscount();
  const { reviseDiscount, isRevising, raceError, clearRaceError } = useDiscountActions();
  const { isOffline } = useNetworkStatus();

  const [demand, setDemand] = useState<ProductionOrder | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [wasQueuedOffline, setWasQueuedOffline] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ReviseDiscountFormValues>({
    resolver: zodResolver(ReviseDiscountSchema),
    mode: 'onChange',
    defaultValues: { amount: editItem?.amount ?? 0, reason: editItem?.reason ?? '' },
  });

  // Re-seed the form whenever a different claim is opened for editing.
  useEffect(() => {
    if (editItem) reset({ amount: editItem.amount, reason: editItem.reason });
  }, [editItem, reset]);

  const demands = demandsQuery.data?.orders ?? [];
  const demandMissing = mode === 'create' && !demand;
  const duplicateClaim = mode === 'create' && demand ? findExistingClaim(demand.id, existingClaims) : null;

  const canSubmit = mode === 'edit' ? isValid && !isRevising : isValid && !demandMissing && !createDiscount.isPending;

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    setWasQueuedOffline(false);
    clearRaceError();

    if (mode === 'edit' && editItem) {
      const result = await reviseDiscount(editItem.id, values);
      if (!result.ok) {
        setSubmitError(result.error ?? 'Could not save the change.');
        return false;
      }
      setWasQueuedOffline(!!result.queued);
      return true;
    }

    if (!demand) {
      setSubmitError('Pick the demand this discount is against.');
      return false;
    }
    // Create has no server-side idempotency support — it requires connectivity rather than being queued for blind retry (see discountService.ts).
    if (isOffline) {
      setSubmitError('No internet connection. Connect and try again to send this request.');
      return false;
    }
    try {
      await createDiscount.mutateAsync({ productionOrderId: demand.id, amount: values.amount, reason: values.reason });
      setDemand(null);
      reset({ amount: 0, reason: '' });
      return true;
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  });

  return {
    mode,
    control,
    errors,
    demands,
    demand: mode === 'edit' ? editItem?.demandNumber ?? null : demand?.demandNumber ?? null,
    setDemand,
    demandMissing,
    duplicateClaim,
    canSubmit,
    isSubmitting: mode === 'edit' ? isRevising : createDiscount.isPending,
    submitError: submitError ?? raceError,
    wasQueuedOffline,
    submit,
  };
}
