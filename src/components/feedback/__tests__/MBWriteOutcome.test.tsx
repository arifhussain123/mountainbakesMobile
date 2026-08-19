import { writeOutcomeCopy, type WriteSubject } from '../MBWriteOutcome';

/**
 * The wording rules, asserted without rendering anything.
 *
 * These are the two ways this copy can cost money, and they point in opposite
 * directions: calling a **queued** write saved invites the same sale to be rung
 * up twice, and calling a **refused** write queued guarantees nobody looks at a
 * transaction the server threw away. Both are one word in a ternary, which is
 * why they are pinned here rather than left to a screen test to notice.
 */

const SALE: WriteSubject = {
  noun: 'sale',
  confirmed: 'Sale completed.',
  refusedNote: 'do not ring it up again',
};

describe('writeOutcomeCopy', () => {
  it('claims success only when the server confirmed', () => {
    const copy = writeOutcomeCopy('synced', SALE);

    expect(copy.tone).toBe('ok');
    expect(copy.title).toBe('Sale completed.');
    // Nothing is pending, so nothing may be described as pending.
    expect(copy.status).toBeUndefined();
  });

  it('never says "completed" for a queued write, and says where it is kept', () => {
    const copy = writeOutcomeCopy('queued', SALE);

    expect(copy.tone).toBe('queued');
    expect(copy.title).toBe('Saved offline');
    expect(copy.title).not.toMatch(/completed|successful|saved\./i);
    // The three questions someone at a counter has, in order.
    expect(copy.detail).toMatch(/stored on this device/);
    expect(copy.detail).toMatch(/when the connection returns/);
    expect(copy.status).toBe('Waiting to sync');
  });

  /**
   * A refusal is parked in Sync Center for a person and never clears by
   * waiting. Describing it as offline, or giving it a "waiting to sync" status,
   * is how a sale that never landed goes unnoticed until the till is reconciled.
   */
  it('never describes a refused write as offline or waiting', () => {
    const copy = writeOutcomeCopy('refused', SALE, 'Cream roll: requested 5, available 2');

    expect(copy.tone).toBe('refused');
    expect(copy.title).toBe('Not accepted');
    expect(copy.title).not.toMatch(/offline/i);
    expect(copy.status).toBeUndefined();
  });

  it("shows the server's own words, which name what was short", () => {
    const copy = writeOutcomeCopy('refused', SALE, 'Cream roll: requested 5, available 2');

    expect(copy.detail).toMatch(/Cream roll: requested 5, available 2/);
    expect(copy.detail).toMatch(/do not ring it up again/);
  });

  it('falls back to a subject-specific sentence when the server gave no reason', () => {
    const copy = writeOutcomeCopy('refused', SALE);

    expect(copy.detail).toMatch(/The server refused this sale\./);
  });

  /**
   * "Saved" reads as "done" on a stock screen while the units are still on the
   * branch's shelf, so the return carries an extra clause the sale does not.
   */
  it('carries a subject-specific caveat into the offline case', () => {
    const copy = writeOutcomeCopy('queued', {
      noun: 'return',
      confirmed: 'Returned to production.',
      queuedNote: 'The stock has not moved yet.',
      refusedNote: 'do not send it again',
    });

    expect(copy.detail).toMatch(/Your return is stored on this device/);
    expect(copy.detail).toMatch(/The stock has not moved yet\./);
  });
});
