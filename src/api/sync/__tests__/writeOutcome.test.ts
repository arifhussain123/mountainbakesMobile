import { resolveWriteOutcome } from '@/api/sync/writeOutcome';
import * as queue from '@/common/database/repositories/syncQueueRepository';

jest.mock('@/common/database/repositories/syncQueueRepository');

const getOperationOutcome = queue.getOperationOutcome as jest.MockedFunction<
  typeof queue.getOperationOutcome
>;

/**
 * What a cashier is told after pressing Save.
 *
 * The case that matters is `conflict`. A 409 for insufficient stock used to be
 * reported as "Saved offline — it will sync automatically", because the hooks
 * read the drain's `synced` counter rather than the row. It never syncs: it is
 * parked for a person. Telling someone otherwise is how a sale that never landed
 * goes unnoticed until the till is reconciled.
 */

describe('resolveWriteOutcome', () => {
  it('reports a synced row as synced', async () => {
    getOperationOutcome.mockResolvedValue({ status: 'synced', message: null });

    expect(await resolveWriteOutcome('op-1')).toEqual({ outcome: 'synced' });
  });

  it('reports a 409 as refused, carrying the server’s own words', async () => {
    getOperationOutcome.mockResolvedValue({
      status: 'conflict',
      message: 'Cream roll: requested 5, available 2',
    });

    expect(await resolveWriteOutcome('op-2')).toEqual({
      outcome: 'refused',
      reason: 'Cream roll: requested 5, available 2',
    });
  });

  it('reports a parked 4xx as refused too — neither clears by waiting', async () => {
    getOperationOutcome.mockResolvedValue({ status: 'failed', message: 'Business day closed' });

    expect(await resolveWriteOutcome('op-3')).toEqual({
      outcome: 'refused',
      reason: 'Business day closed',
    });
  });

  it.each(['pending', 'syncing', 'blocked'] as const)(
    'reports %s as queued — it really is on its way',
    async status => {
      getOperationOutcome.mockResolvedValue({ status, message: null });

      expect(await resolveWriteOutcome('op-4')).toEqual({ outcome: 'queued' });
    },
  );

  it('treats a pruned row as synced, since pruning only follows a successful send', async () => {
    getOperationOutcome.mockResolvedValue(null);

    expect(await resolveWriteOutcome('op-5')).toEqual({ outcome: 'synced' });
  });

  it('never reports a refusal as queued, for any status', async () => {
    for (const status of ['conflict', 'failed'] as const) {
      getOperationOutcome.mockResolvedValue({ status, message: 'no' });
      expect((await resolveWriteOutcome('op')).outcome).not.toBe('queued');
    }
  });
});
