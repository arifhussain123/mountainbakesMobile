import { useState } from 'react';
import { useFeedDailySaleRecord, useGenerateDailySaleRecord } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { isLargeDifference, liveChannelDifference } from '../api/dailySaleCalculations';
import type { DailySaleRecord, PaymentMethod, PaymentMethodLock } from '@/api';

/** Whichever channel a branch may key by hand — Foodpanda is permanently excluded (the aggregator settles it). */
export type ManualFeedChannel = 'cash' | 'easypaisa' | 'bank';

const CHANNEL_TO_PAYMENT_METHOD: Record<ManualFeedChannel, PaymentMethod> = {
  cash: 'cash',
  easypaisa: 'easypaisa',
  bank: 'bank_account',
};

/**
 * branchApp.md screen 22 — Manual Feed. "Leave a field blank to leave that
 * figure as it is" — a blank input omits that key from the request entirely,
 * matching `feed_daily_sale_record`'s own semantics.
 *
 * A record only accepts new counts while its own status is 'open' or
 * 'pending_verification' (confirmed server-side: the `daily_sale_records`
 * migration's own comment is explicit that these are the only two states a
 * branch may write in) — past that, the whole form is read-only regardless of
 * any per-channel lock. A per-channel lock (`locks`, admin-configured per
 * branch/payment-method, NOT per day) is a separate, narrower gate: it can
 * block just one channel even on an otherwise open day.
 */
export function useManualFeedForm(businessDate: string, record: DailySaleRecord | null, locks: PaymentMethodLock[]) {
  const generate = useGenerateDailySaleRecord();
  const feed = useFeedDailySaleRecord();

  const [cashInput, setCashInput] = useState('');
  const [easypaisaInput, setEasypaisaInput] = useState('');
  const [bankInput, setBankInput] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const recordLocked = record !== null && record.status !== 'open' && record.status !== 'pending_verification';

  const isChannelLocked = (channel: ManualFeedChannel): boolean =>
    recordLocked || (locks.find((l) => l.paymentMethod === CHANNEL_TO_PAYMENT_METHOD[channel])?.isLocked ?? false);

  const inputs: Record<ManualFeedChannel, string> = { cash: cashInput, easypaisa: easypaisaInput, bank: bankInput };
  const setters: Record<ManualFeedChannel, (v: string) => void> = { cash: setCashInput, easypaisa: setEasypaisaInput, bank: setBankInput };
  const autoValues: Record<ManualFeedChannel, number> = {
    cash: record?.autoCash ?? 0,
    easypaisa: record?.autoEasypaisa ?? 0,
    bank: record?.autoBank ?? 0,
  };
  const countedValues: Record<ManualFeedChannel, number | null> = {
    cash: record?.manualCash ?? null,
    easypaisa: record?.manualEasypaisa ?? null,
    bank: record?.manualBank ?? null,
  };

  const liveDifference = (channel: ManualFeedChannel): number | null => liveChannelDifference(inputs[channel], autoValues[channel]);

  const hasLargeDifference = (['cash', 'easypaisa', 'bank'] as ManualFeedChannel[]).some((c) => isLargeDifference(liveDifference(c)));

  const hasAnyInput = cashInput.trim() !== '' || easypaisaInput.trim() !== '' || bankInput.trim() !== '';
  const canSubmit = hasAnyInput && !recordLocked && !feed.isPending && !generate.isPending;

  const submit = async (): Promise<boolean> => {
    if (!canSubmit) return false;
    setSubmitError(null);
    try {
      // The record may not exist yet — generate (idempotent) ensures it before feeding.
      await generate.mutateAsync(businessDate);
      await feed.mutateAsync({
        businessDate,
        ...(cashInput.trim() !== '' && !isChannelLocked('cash') ? { cash: parseFloat(cashInput) || 0 } : {}),
        ...(easypaisaInput.trim() !== '' && !isChannelLocked('easypaisa') ? { easypaisa: parseFloat(easypaisaInput) || 0 } : {}),
        ...(bankInput.trim() !== '' && !isChannelLocked('bank') ? { bank: parseFloat(bankInput) || 0 } : {}),
      });
      return true;
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  return {
    inputs,
    setInput: (channel: ManualFeedChannel, value: string) => setters[channel](value),
    autoValues,
    countedValues,
    isChannelLocked,
    liveDifference,
    hasLargeDifference,
    recordLocked,
    canSubmit,
    isSubmitting: feed.isPending || generate.isPending,
    submitError,
    submit,
  };
}
