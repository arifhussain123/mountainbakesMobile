import { useRef, useState } from 'react';
import { generateIdempotencyKey, isApiError, useApproveFinanceCashTransfer, useRejectFinanceCashTransfer, type CashTransfer } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';

/**
 * Approve or reject one cash transfer — exactly once.
 *
 * Three guards, because a decision posts money:
 *
 *   - ONE IN FLIGHT. A ref, not `isPending`: the mutation's flag only flips on
 *     the next render, so a second tap in the same frame would get through it.
 *   - ONE KEY PER DECISION, reused across retries, so a retry after a dropped
 *     connection is the same request (the API's row lock is the real guard —
 *     approving twice raises "already approved" — the key keeps the client
 *     honest about it being one operation).
 *   - SOMEONE ELSE GOT THERE FIRST. The API answers 409 with "CT-… is already
 *     approved…". That is not a failure to retry: it is a decision to show. The
 *     outcome says so, and the mutations' onSettled refetches the transfer so
 *     the screen shows what was actually decided.
 */

/**
 * What approving posts, mirroring `app.cash_transfer_slices` server-side: one
 * RV- for the Total under Company Share, and a second for fuel only when there
 * is any. Shown on the confirmation before anything is posted.
 */
export function approvalPostings(t: Pick<CashTransfer, 'amount' | 'fuelCharges'>): { head: string; code: string; amount: number }[] {
  return [
    ...(t.amount > 0 ? [{ head: 'Company Share', code: 'INC-COMPANY-SHARE', amount: t.amount }] : []),
    ...(t.fuelCharges > 0 ? [{ head: 'Fuel', code: 'INC-FUEL', amount: t.fuelCharges }] : []),
  ];
}

export type DecisionOutcome =
  | { kind: 'done'; decision: 'approved' | 'rejected' }
  | { kind: 'already-decided'; message: string }
  | { kind: 'failed'; message: string }
  | { kind: 'busy' };

export function useCashTransferDecision(transferId: string) {
  const approveMut = useApproveFinanceCashTransfer();
  const rejectMut = useRejectFinanceCashTransfer();
  const inFlight = useRef(false);
  const approveKey = useRef(generateIdempotencyKey('finance_cash_transfer_approve'));
  const rejectKey = useRef(generateIdempotencyKey('finance_cash_transfer_reject'));
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null);

  async function run(which: 'approve' | 'reject', call: () => Promise<unknown>): Promise<DecisionOutcome> {
    if (inFlight.current) return { kind: 'busy' };
    inFlight.current = true;
    setPending(which);
    try {
      await call();
      return { kind: 'done', decision: which === 'approve' ? 'approved' : 'rejected' };
    } catch (error) {
      if (isApiError(error) && error.status === 409) return { kind: 'already-decided', message: error.message };
      return { kind: 'failed', message: mapErrorToMessage(error) };
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  return {
    pending,
    approve: (note?: string) =>
      run('approve', () => approveMut.mutateAsync({ id: transferId, input: { note: note?.trim() || undefined }, idempotencyKey: approveKey.current })),
    reject: (reason: string) =>
      run('reject', () => rejectMut.mutateAsync({ id: transferId, input: { reason: reason.trim() }, idempotencyKey: rejectKey.current })),
  };
}
