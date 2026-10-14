import { useState } from 'react';
import { useFeedDailySaleRecord, useGenerateDailySaleRecord } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';

/**
 * branchApp.md screen 22 — Manual Feed. "Leave a field blank to leave that
 * figure as it is" — a blank input omits that key from the request entirely,
 * matching `feed_daily_sale_record`'s own semantics. Foodpanda is excluded:
 * it is settled by the aggregator and `FeedDailySaleRecordSchema` has no field
 * for it.
 */
export function useManualFeedForm(businessDate: string) {
  const generate = useGenerateDailySaleRecord();
  const feed = useFeedDailySaleRecord();

  const [cashInput, setCashInput] = useState('');
  const [easypaisaInput, setEasypaisaInput] = useState('');
  const [bankInput, setBankInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasAnyInput = cashInput.trim() !== '' || easypaisaInput.trim() !== '' || bankInput.trim() !== '';
  const canSubmit = hasAnyInput && !feed.isPending && !generate.isPending;

  const submit = async (): Promise<boolean> => {
    if (!canSubmit) return false;
    setSubmitError(null);
    try {
      // The record may not exist yet — generate (idempotent) ensures it before feeding.
      await generate.mutateAsync(businessDate);
      await feed.mutateAsync({
        businessDate,
        ...(cashInput.trim() !== '' ? { cash: parseFloat(cashInput) || 0 } : {}),
        ...(easypaisaInput.trim() !== '' ? { easypaisa: parseFloat(easypaisaInput) || 0 } : {}),
        ...(bankInput.trim() !== '' ? { bank: parseFloat(bankInput) || 0 } : {}),
      });
      return true;
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  return {
    cashInput,
    setCashInput,
    easypaisaInput,
    setEasypaisaInput,
    bankInput,
    setBankInput,
    canSubmit,
    isSubmitting: feed.isPending || generate.isPending,
    submitError,
    submit,
  };
}
