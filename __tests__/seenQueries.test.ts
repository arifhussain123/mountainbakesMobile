/**
 * @format
 */
import { hasUnseenReply } from '@/features/support/store/seenQueriesStore';

describe('hasUnseenReply', () => {
  it('is false when there is no resolution note yet', () => {
    expect(hasUnseenReply('t1', null, null, {})).toBe(false);
  });

  it('is false when there is a note but no resolvedAt (defensive — should not happen server-side)', () => {
    expect(hasUnseenReply('t1', 'Fixed it', null, {})).toBe(false);
  });

  it('is true for a replied ticket that has never been opened', () => {
    expect(hasUnseenReply('t1', 'Fixed it', '2026-10-16T10:00:00.000Z', {})).toBe(true);
  });

  it('is false once the ticket has been seen at or after the reply time', () => {
    const seenAt = { t1: '2026-10-16T12:00:00.000Z' };
    expect(hasUnseenReply('t1', 'Fixed it', '2026-10-16T10:00:00.000Z', seenAt)).toBe(false);
  });

  it('is true again if the ticket was re-resolved AFTER it was last seen', () => {
    const seenAt = { t1: '2026-10-16T10:00:00.000Z' };
    expect(hasUnseenReply('t1', 'Fixed it again', '2026-10-16T12:00:00.000Z', seenAt)).toBe(true);
  });

  it('does not confuse one ticket\'s seen state with another\'s', () => {
    const seenAt = { t2: '2026-10-16T12:00:00.000Z' };
    expect(hasUnseenReply('t1', 'Fixed it', '2026-10-16T10:00:00.000Z', seenAt)).toBe(true);
  });
});
