/**
 * Daily Cash Book — the running balance in the order the rows are shown.
 *
 * WHY THE SERVER'S BALANCE COLUMN CANNOT BE SHOWN AS IS. `ledger_entries.balance`
 * is stamped at posting time by `post_finance_ledger_entry`: the balance of the
 * last row POSTED (by `seq`, any date) plus this row. The report lists rows by
 * `entry_date`, then `seq`. A voucher dated 17 Oct but approved at 2 am on
 * 18 Oct is posted after 18 Oct's first entries, so its stored balance — and
 * every neighbour's — follows posting order while the screen shows date order.
 * That is how the first row of a day can read 45,940.99 under an opening of
 * 38,778.49 and a receipt of 24,262.50.
 *
 * So the screen recomputes: opening + Σ(debit − credit), row by row, in the
 * displayed order. Where the recomputed figure and the stored one disagree, the
 * row is marked, so a reader comparing with an old export can see why.
 *
 * This is only meaningful for the whole company's book. With a branch or a
 * ledger-head filter the book has gaps by construction (other vouchers moved
 * the balance too), so `filtered: true` turns every row's balance into a gap
 * marker rather than a number that looks authoritative.
 */

export interface CashBookRowIn {
  debit: number | null;
  credit: number | null;
  /** The server's stored, posting-order balance. */
  balance: number | null;
}

export interface CashBookRowOut<T> {
  row: T;
  /** Running balance in displayed order; null when the book is filtered. */
  runningBalance: number | null;
  /** The stored balance disagrees with the displayed-order one. */
  postingOrderDiffers: boolean;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeCashBookBalances<T extends CashBookRowIn>(
  opening: number,
  rows: T[],
  options: { filtered?: boolean } = {},
): CashBookRowOut<T>[] {
  let running = opening;
  return rows.map((row) => {
    running = round2(running + (row.debit ?? 0) - (row.credit ?? 0));
    if (options.filtered) return { row, runningBalance: null, postingOrderDiffers: false };
    return {
      row,
      runningBalance: running,
      postingOrderDiffers: row.balance !== null && round2(row.balance) !== running,
    };
  });
}

/** Closing = the last running balance, or the opening when there are no rows. It must equal the summary's Closing. */
export function cashBookClosing(opening: number, rows: CashBookRowIn[]): number {
  return round2(rows.reduce((b, r) => b + (r.debit ?? 0) - (r.credit ?? 0), opening));
}

/** Rows grouped by date, keeping the displayed order inside and between groups. */
export function groupByDate<T extends { row: { entryDate?: unknown } }>(rows: T[]): { date: string; rows: T[] }[] {
  const groups: { date: string; rows: T[] }[] = [];
  for (const r of rows) {
    const date = String(r.row.entryDate ?? '');
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.rows.push(r);
    else groups.push({ date, rows: [r] });
  }
  return groups;
}
