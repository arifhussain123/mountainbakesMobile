/** PKR note/coin denominations shown in the "Count notes" helper, largest first. Coins are counted as one amount, not a per-coin quantity. */
export const PKR_NOTE_DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10] as const;

export type NoteDenomination = (typeof PKR_NOTE_DENOMINATIONS)[number];

export interface NoteCounterState {
  /** Quantity counted for each denomination — `null`/absent means "not entered", not zero. */
  quantities: Partial<Record<NoteDenomination, number>>;
  /** A single counted amount for all coins, entered directly (there's no fixed set of coin denominations to count by quantity). */
  coinsAmount: number;
}

export function noteCounterTotal(state: NoteCounterState): number {
  const notesTotal = PKR_NOTE_DENOMINATIONS.reduce((sum, denom) => sum + denom * (state.quantities[denom] ?? 0), 0);
  return notesTotal + Math.max(0, state.coinsAmount);
}

export function emptyNoteCounterState(): NoteCounterState {
  return { quantities: {}, coinsAmount: 0 };
}
