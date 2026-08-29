/**
 * The unsent production order a branch left on the screen, against a real SQLite
 * database.
 *
 * The thing worth testing here is not that a JSON blob round-trips — it is the
 * boundary a draft sits on the wrong side of. `writeOffline` pairs a domain row
 * with a `sync_queue` row so a transaction can never exist without a way to
 * reach the server; a draft is work the branch has explicitly NOT committed, and
 * a draft that reached the queue would be an order nobody placed. A string
 * comparison against the SQL cannot check that. A queue table that is still
 * empty afterwards can.
 *
 * Runs the REAL migrations and the REAL repository SQL through `node:sqlite`
 * (see `test-utils/sqliteTestDb.ts`).
 */

import { createTestDb, type TestDb } from '@/common/test-utils/sqliteTestDb';

const shared = globalThis as unknown as { __orderDraftDb: TestDb };

jest.mock('@/common/database/localDb', () => ({
  getDb: () => (globalThis as Record<string, any>).__orderDraftDb,
}));

import { runMigrations } from '@/common/database/runMigrations';
import {
  clearOrderDraft,
  readOrderDraft,
  saveOrderDraft,
} from '@/common/database/repositories/orderDraftRepository';

const RUSK = { productId: 'p1', name: 'Milk Rusk', qty: 4, rate: 100, remark: 'thin icing' };
const ROLL = { productId: 'p2', name: 'Cream Roll', qty: 2, rate: 60, remark: '' };

beforeEach(async () => {
  shared.__orderDraftDb = createTestDb();
  await runMigrations(shared.__orderDraftDb);
});

afterEach(() => {
  shared.__orderDraftDb.close();
});

async function rowCount(table: string): Promise<number> {
  const res = await shared.__orderDraftDb.execute(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(res.rows[0]?.n ?? 0);
}

describe('orderDraftRepository', () => {
  it('round-trips the lines, the date and when it was saved', async () => {
    await saveOrderDraft('b-1', { lines: [RUSK, ROLL], requiredDate: '2026-08-20' }, 1_700_000);

    const draft = await readOrderDraft('b-1');
    expect(draft).toEqual({
      lines: [RUSK, ROLL],
      requiredDate: '2026-08-20',
      savedAt: 1_700_000,
    });
  });

  /**
   * The line's rate is stored rather than looked up on restore, for the reason
   * the demand copies nothing to the server: a price that moves overnight must
   * not silently rewrite what the branch saw when it saved.
   */
  it('keeps the rate the branch was shown', async () => {
    await saveOrderDraft('b-1', { lines: [RUSK], requiredDate: '' });

    const draft = await readOrderDraft('b-1');
    expect(draft?.lines[0]?.rate).toBe(100);
  });

  /** A draft is explicitly allowed to have no required date — that is Save draft. */
  it('stores a draft with no required date', async () => {
    await saveOrderDraft('b-1', { lines: [RUSK], requiredDate: '' });

    expect((await readOrderDraft('b-1'))?.requiredDate).toBe('');
  });

  it('replaces the branch’s draft rather than accumulating them', async () => {
    await saveOrderDraft('b-1', { lines: [RUSK], requiredDate: '' });
    await saveOrderDraft('b-1', { lines: [ROLL], requiredDate: '2026-08-21' });

    expect(await rowCount('app_metadata')).toBe(1);
    expect((await readOrderDraft('b-1'))?.lines).toEqual([ROLL]);
  });

  /**
   * `branch_user` is a shift account carrying its manager's branchId, so two
   * devices share a branch — but a device moved to another branch must not
   * inherit the previous one's half-written demand.
   */
  it('keeps one branch’s draft out of another’s', async () => {
    await saveOrderDraft('b-1', { lines: [RUSK], requiredDate: '' });

    expect(await readOrderDraft('b-2')).toBeNull();
    expect((await readOrderDraft('b-1'))?.lines).toEqual([RUSK]);
  });

  it('reads as absent once cleared, and clears only that branch', async () => {
    await saveOrderDraft('b-1', { lines: [RUSK], requiredDate: '' });
    await saveOrderDraft('b-2', { lines: [ROLL], requiredDate: '' });

    await clearOrderDraft('b-1');

    expect(await readOrderDraft('b-1')).toBeNull();
    expect((await readOrderDraft('b-2'))?.lines).toEqual([ROLL]);
  });

  it('reads as absent when nothing was ever saved', async () => {
    expect(await readOrderDraft('b-1')).toBeNull();
  });

  /**
   * A draft is a convenience, not a record anyone is owed. Throwing on a value
   * this version no longer understands would fail the whole screen at mount, so
   * a branch could not raise a demand at all because of a leftover it never
   * asked to keep.
   */
  it('reads as absent rather than throwing when the stored value is unreadable', async () => {
    await shared.__orderDraftDb.execute(
      'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
      ['branch.orderDraft.b-1', 'not json'],
    );

    await expect(readOrderDraft('b-1')).resolves.toBeNull();
  });

  /**
   * The whole reason this is not a row in `local_production_orders`. A draft in
   * that table would be counted as pending, badged in Sync Center, and
   * eventually drained — turning "let me finish this after the delivery" into an
   * order nobody placed.
   */
  it('never queues anything', async () => {
    await saveOrderDraft('b-1', { lines: [RUSK, ROLL], requiredDate: '2026-08-20' });

    expect(await rowCount('sync_queue')).toBe(0);
    expect(await rowCount('local_production_orders')).toBe(0);
  });
});
