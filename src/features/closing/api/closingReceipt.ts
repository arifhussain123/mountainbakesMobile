import { format } from 'date-fns';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { BranchClosingPaymentMethodTotal, ClosingTotals, StockRow } from '@/api';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank Account',
};

export type ReceiptPaper = '80mm' | '58mm';

/** Characters per line at the printer's standard font — 80mm rolls fit 48, 58mm rolls 32. */
export const RECEIPT_COLUMNS: Record<ReceiptPaper, number> = { '80mm': 48, '58mm': 32 };

export interface BalanceStockLine {
  productName: string;
  balance: number;
}

/**
 * The receipt's Balance Stock section — positive balance only, same rule as
 * the web's Branch Closing print (`BranchClosingPage.tsx`). A missing or
 * non-numeric balance is treated as zero rather than printed as stock that
 * isn't there. Print data only: the on-screen Closing Stock table still gets
 * every row, since a product at zero says what ran out.
 */
export function selectPrintableBalanceStock(rows: StockRow[]): BalanceStockLine[] {
  return rows
    .filter((r) => Number.isFinite(Number(r.balance)) && Number(r.balance) > 0)
    .map((r) => ({ productName: r.productName, balance: Number(r.balance) }));
}

export interface ClosingReceiptInput {
  branchName: string;
  /** 'YYYY-MM-DD' business date. */
  date: string;
  printedAt: Date;
  totals: ClosingTotals;
  paymentMethods: BranchClosingPaymentMethodTotal[];
  /** Already filtered by `selectPrintableBalanceStock`; laid out as given. */
  stockLines: BalanceStockLine[];
}

/** Word-wraps to `width`, hard-breaking any single word longer than a line. */
function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.trim().split(/\s+/)) {
    let rest = word;
    while (rest.length > width) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(rest.slice(0, width));
      rest = rest.slice(width);
    }
    if (!rest) continue;
    if (!current) current = rest;
    else if (current.length + 1 + rest.length <= width) current = `${current} ${rest}`;
    else {
      lines.push(current);
      current = rest;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

function center(text: string, width: number): string[] {
  return wrap(text, width).map((line) => ' '.repeat(Math.floor((width - line.length) / 2)) + line);
}

/** Label left, value right-aligned on the label's last line; long labels wrap rather than overflow. */
function kv(label: string, value: string, width: number): string[] {
  const labelWidth = width - value.length - 1;
  // Too little room left beside the value to be readable — give the label the
  // whole width and drop the value onto its own right-aligned line.
  if (labelWidth < 8) return [...wrap(label, width), value.padStart(width)];
  const lines = wrap(label, labelWidth);
  const last = lines.length - 1;
  lines[last] = lines[last].padEnd(labelWidth) + ' ' + value;
  return lines;
}

/**
 * The Branch Closing end-of-day slip as fixed-width text for a thermal
 * receipt printer, mirroring the web's `buildBranchClosingDocument`: branch
 * and business date, Balance Stock (product + quantity only), then Payment
 * Details and the closing totals. Every figure is the server's own
 * (`/api/branch-closing` + `/api/stock`), nothing re-derived here.
 *
 * Like Sale Reprint and POP Print, this goes out through the Share sheet —
 * there's no printer SDK in this app — to a print-service app (RawBT, the
 * Android print service). Every line is padded to the roll's column count so
 * a monospace printer keeps the amounts column aligned.
 */
export function buildClosingReceiptText(
  { branchName, date, printedAt, totals, paymentMethods, stockLines }: ClosingReceiptInput,
  paper: ReceiptPaper = '80mm',
): string {
  const w = RECEIPT_COLUMNS[paper];
  const rule = '-'.repeat(w);
  // Device-local calendar day — `toISOString()` is UTC, which is the previous
  // day for anything printed before 5am in Pakistan.
  const printed = `${formatDisplayDate(format(printedAt, 'yyyy-MM-dd'))} ${formatDisplayTime(printedAt.toISOString())}`;

  const lines: string[] = [
    ...center('MOUNTAIN BAKES', w),
    ...center('BRANCH CLOSING', w),
    ...center(branchName, w),
    rule,
    ...kv('Business Date', formatDisplayDate(date), w),
    ...kv('Printed', printed, w),
    rule,
    'BALANCE STOCK',
    ...(stockLines.length > 0
      ? [...kv('Product', 'Balance', w), ...stockLines.flatMap((line) => kv(line.productName, String(line.balance), w))]
      : ['No balance stock.']),
    rule,
    'PAYMENT DETAILS',
    ...(paymentMethods.length > 0
      ? paymentMethods.flatMap((pm) => kv(PAYMENT_METHOD_LABEL[pm.method] ?? pm.method, formatCurrency(pm.amount), w))
      : ['No sales recorded for this date.']),
    rule,
    ...kv('Total Sales', formatCurrency(totals.sales), w),
    ...(totals.discounts > 0 ? kv('Discounts', formatCurrency(totals.discounts), w) : []),
    ...kv('Expenses', formatCurrency(totals.expenses), w),
    ...kv('Closing Cash', formatCurrency(totals.cashInHand), w),
    ...kv('Orders / Cancelled', `${totals.orderCount} / ${totals.cancelled}`, w),
    rule,
    ...center('End of Closing Report', w),
  ];
  return lines.map((line) => line.trimEnd()).join('\n');
}
