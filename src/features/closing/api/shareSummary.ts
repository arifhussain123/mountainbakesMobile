import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { BranchClosingPaymentMethodTotal, ClosingTotals } from '@/api';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank Account',
};

export interface ClosingSummaryInput {
  branchName: string;
  /** 'YYYY-MM-DD' business date. */
  date: string;
  totals: ClosingTotals;
  paymentMethods: BranchClosingPaymentMethodTotal[];
  stockSold: number;
  stockReturned: number;
  stockBalance: number;
}

/**
 * The plain-text closing summary for the system share sheet (WhatsApp etc.) —
 * no printing pipeline exists in this app (confirmed in Step 0), so this is
 * the same Share-sheet pattern Sales' own receipt sharing already uses.
 * Numbers go through `format.ts` only; no emojis unless asked.
 */
export function buildClosingSummaryText({ branchName, date, totals, paymentMethods, stockSold, stockReturned, stockBalance }: ClosingSummaryInput): string {
  const lines: string[] = [
    'Mountain Bakes — Branch Closing',
    branchName,
    formatDisplayDate(date),
    '',
    'Takings by payment method',
    ...paymentMethods.map(
      (pm) => `  ${PAYMENT_METHOD_LABEL[pm.method] ?? pm.method} (${pm.orderCount} order${pm.orderCount === 1 ? '' : 's'}): ${formatCurrency(pm.amount)}`,
    ),
    '',
    `Sales: ${formatCurrency(totals.sales)}`,
    `Discounts given: ${formatCurrency(totals.discounts)}`,
    `Expenses: ${formatCurrency(totals.expenses)}`,
    `Net: ${formatCurrency(totals.net)}`,
    '',
    `Cash in hand: ${formatCurrency(totals.cashInHand)}`,
    `  (Cash takings ${formatCurrency(totals.cashSales)} − cash expenses ${formatCurrency(totals.cashExpenses)})`,
    '',
    `Orders: ${totals.orderCount} (${totals.cancelled} cancelled)`,
    '',
    `Stock: ${stockSold} sold · ${stockReturned} returned to production · ${stockBalance} left on the shelf`,
  ];
  return lines.join('\n');
}
