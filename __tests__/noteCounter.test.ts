/**
 * @format
 */
import { emptyNoteCounterState, noteCounterTotal } from '@/features/closing/calculations/noteCounter';

describe('noteCounterTotal', () => {
  it('is 0 for an empty state', () => {
    expect(noteCounterTotal(emptyNoteCounterState())).toBe(0);
  });

  it('sums denomination x quantity across notes', () => {
    const total = noteCounterTotal({ quantities: { 5000: 2, 1000: 3, 100: 5 }, coinsAmount: 0 });
    expect(total).toBe(5000 * 2 + 1000 * 3 + 100 * 5);
  });

  it('adds the coins amount on top of the notes total', () => {
    const total = noteCounterTotal({ quantities: { 100: 1 }, coinsAmount: 45 });
    expect(total).toBe(145);
  });

  it('treats a missing denomination as zero, not an error', () => {
    expect(noteCounterTotal({ quantities: {}, coinsAmount: 10 })).toBe(10);
  });

  it('never lets a negative coins amount reduce the total', () => {
    expect(noteCounterTotal({ quantities: {}, coinsAmount: -50 })).toBe(0);
  });
});
