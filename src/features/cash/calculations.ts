import type { CashTransfer } from '@/api';

export type CashTransferChannel = 'cash' | 'easypaisa' | 'bank_account';

/**
 * "Does this transfer match channel X" — ported from the backend's own
 * `CHANNEL_COLUMNS` predicate (`cash-transfers.service.ts`): the channel's
 * own amount column is greater than zero. Fuel is intentionally not a
 * channel here — it's a separate figure, never part of the channel filter.
 */
export function matchesChannel(transfer: CashTransfer, channel: CashTransferChannel): boolean {
  switch (channel) {
    case 'cash':
      return transfer.cashAmount > 0;
    case 'easypaisa':
      return transfer.easypaisaAmount > 0;
    case 'bank_account':
      return transfer.bankAmount > 0;
  }
}

export interface CashTransferTotals {
  totalTransferred: number;
  cash: number;
  easypaisa: number;
  bank: number;
  fuelCharges: number;
  pendingAmount: number;
  pendingCount: number;
}

/**
 * Summary-strip totals over whatever set is passed in. There is no
 * server-side aggregate endpoint for this list (confirmed — `GET
 * /api/cash-transfers` only returns rows + a row count), so this sums the
 * loaded set itself. The caller is responsible for fetching a complete-enough
 * page (this app requests the server's max `limit=200`, comfortably above
 * normal transfer volume) — this function makes no claim about completeness
 * beyond what it's given.
 *
 * `totalTransferred` deliberately excludes fuel — `transfer.amount` is
 * already the server-computed Total (cash+easypaisa+bank), DB-enforced to
 * exclude fuel by a CHECK constraint, not a client-side choice.
 */
export function computeCashTransferTotals(transfers: CashTransfer[]): CashTransferTotals {
  return transfers.reduce<CashTransferTotals>(
    (acc, t) => ({
      totalTransferred: acc.totalTransferred + t.amount,
      cash: acc.cash + t.cashAmount,
      easypaisa: acc.easypaisa + t.easypaisaAmount,
      bank: acc.bank + t.bankAmount,
      fuelCharges: acc.fuelCharges + t.fuelCharges,
      pendingAmount: acc.pendingAmount + (t.status === 'pending' ? t.amount : 0),
      pendingCount: acc.pendingCount + (t.status === 'pending' ? 1 : 0),
    }),
    { totalTransferred: 0, cash: 0, easypaisa: 0, bank: 0, fuelCharges: 0, pendingAmount: 0, pendingCount: 0 },
  );
}

/**
 * A transfer is "Final" (locked) once Finance has decided either way —
 * matches the web's own `pending` doc comment ("the branch cannot edit it")
 * and the fact there is no edit/withdraw endpoint at all, for any status.
 */
export function isTransferFinal(status: CashTransfer['status']): boolean {
  return status !== 'pending';
}
