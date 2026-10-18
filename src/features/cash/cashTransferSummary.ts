import { formatCurrency } from '@/shared/utils';
import type { CashTransferBucket, MonthlyCashTransferSummary } from '@/api';

/**
 * Layout for the monthly Cash Transfer summary — the same eight figures, in the
 * same order and words, as the web's Branch → Cash Transfer Details
 * (`MonthlyCashTransferSummary.tsx`).
 *
 * Nothing here adds anything up; every figure is the server's (backend
 * shared/utils/cash-transfer-summary.ts):
 * - Total Transferred is Total Amount, every status; Cash, Easypaisa and Bank
 *   split it.
 * - Approved, Awaiting Finance and Rejected split that same Total Amount by
 *   Finance's decision.
 * - Fuel Charges is booked by Finance on its own and is never part of Total
 *   Amount, so it is its own figure, never added to another.
 * - A tile's count is the transfers with a non-zero amount for that figure.
 */

export type CashSummaryTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface CashSummaryTile {
  key: keyof MonthlyCashTransferSummary['totals'];
  label: string;
  value: string;
  sub: string;
  tone: CashSummaryTone;
  /** The headline tile, drawn in the primary colour. */
  highlight?: boolean;
}

const transfers = (b: CashTransferBucket) => `${b.count.toLocaleString('en-US')} ${b.count === 1 ? 'transfer' : 'transfers'}`;

export function buildCashTransferSummaryTiles(summary: MonthlyCashTransferSummary): CashSummaryTile[] {
  const t = summary.totals;
  return [
    { key: 'transferred', label: 'Total Transferred', value: formatCurrency(t.transferred.amount), sub: `${transfers(t.transferred)} · every status`, tone: 'neutral', highlight: true },
    { key: 'cash', label: 'Cash', value: formatCurrency(t.cash.amount), sub: transfers(t.cash), tone: 'neutral' },
    { key: 'easypaisa', label: 'Easypaisa', value: formatCurrency(t.easypaisa.amount), sub: transfers(t.easypaisa), tone: 'neutral' },
    { key: 'bank', label: 'Bank', value: formatCurrency(t.bank.amount), sub: transfers(t.bank), tone: 'neutral' },
    { key: 'approved', label: 'Approved', value: formatCurrency(t.approved.amount), sub: transfers(t.approved), tone: 'success' },
    { key: 'pending', label: 'Awaiting Finance', value: formatCurrency(t.pending.amount), sub: transfers(t.pending), tone: 'warning' },
    { key: 'rejected', label: 'Rejected', value: formatCurrency(t.rejected.amount), sub: transfers(t.rejected), tone: 'danger' },
    { key: 'fuel', label: 'Fuel Charges', value: formatCurrency(t.fuel.amount), sub: `across ${transfers(t.fuel)}`, tone: 'neutral' },
  ];
}
