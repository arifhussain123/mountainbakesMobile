/** A difference this large (either direction) is almost always a mis-key, not a real shortfall — worth a gentle recount prompt, never a hard block. */
export const LARGE_DIFFERENCE_THRESHOLD = 1000;

/**
 * One channel's live difference while counting — against the GROSS auto
 * figure, never against "cash on table" (which already has expenses netted
 * out of it). Conflating the two is the exact mistake the server's own
 * `daily_sale_records` migration warns against: it would make every day with
 * a cash expense read as short by exactly that expense.
 *
 * Returns null for a blank/unparseable input — "not yet counted", not "short
 * by the whole auto amount".
 */
export function liveChannelDifference(rawInput: string, autoValue: number): number | null {
  if (rawInput.trim() === '') return null;
  const typed = parseFloat(rawInput);
  if (!Number.isFinite(typed)) return null;
  return typed - autoValue;
}

/** Cash on Table — can legitimately go negative (a day whose cash expenses exceeded its cash takings). */
export function expectedCashInHand(cashSales: number, cashExpenses: number): number {
  return cashSales - cashExpenses;
}

export function isLargeDifference(diff: number | null): boolean {
  return diff !== null && Math.abs(diff) >= LARGE_DIFFERENCE_THRESHOLD;
}
