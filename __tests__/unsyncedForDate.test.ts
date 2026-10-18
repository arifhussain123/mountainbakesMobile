/**
 * @format
 */
import { countUnsyncedForDate } from '@/features/closing/api/unsyncedForDate';
import type { QueuedWrite } from '@/shared/offline';

function write(overrides: Partial<QueuedWrite>): QueuedWrite {
  return {
    id: 'w1',
    idempotencyKey: 'w1',
    endpoint: '/orders/pos',
    method: 'post',
    payload: {},
    status: 'pending',
    attempts: 0,
    lastError: null,
    invalidateKeys: [],
    createdAt: Date.now(),
    nextAttemptAt: Date.now(),
    ...overrides,
  };
}

describe('countUnsyncedForDate', () => {
  it('counts a dated-endpoint write only when its payload businessDate matches', () => {
    const writes = [
      write({ endpoint: '/orders/pos', payload: { businessDate: '2026-10-16' } }),
      write({ endpoint: '/expenses', payload: { businessDate: '2026-10-15' } }),
    ];
    expect(countUnsyncedForDate(writes, '2026-10-16', '2026-10-16')).toBe(1);
  });

  it('counts a today-only endpoint (stock return) only when the viewed date is the current business date', () => {
    const writes = [write({ endpoint: '/stock/return', payload: {} })];
    expect(countUnsyncedForDate(writes, '2026-10-16', '2026-10-16')).toBe(1);
    expect(countUnsyncedForDate(writes, '2026-10-15', '2026-10-16')).toBe(0);
  });

  it('never counts a synced write', () => {
    const writes = [write({ status: 'synced' as never, payload: { businessDate: '2026-10-16' } })];
    expect(countUnsyncedForDate(writes, '2026-10-16', '2026-10-16')).toBe(0);
  });

  it('ignores an endpoint it does not recognize', () => {
    const writes = [write({ endpoint: '/special-events/foo/demands', payload: { businessDate: '2026-10-16' } })];
    expect(countUnsyncedForDate(writes, '2026-10-16', '2026-10-16')).toBe(0);
  });
});
