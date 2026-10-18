/**
 * @format
 */
import { groupNotificationsByDay } from '@/features/notifications/groupNotifications';

// Noon UTC, well clear of any timezone's day boundary, so this suite's
// pass/fail doesn't depend on the machine running it being near UTC.
const NOW = new Date('2026-10-17T12:00:00.000Z');

function item(createdAt: string) {
  return { id: createdAt, createdAt };
}

describe('groupNotificationsByDay', () => {
  it('buckets Today/Yesterday/Earlier by calendar day, not a 24h rolling window', () => {
    const items = [
      item('2026-10-17T12:00:00.000Z'), // today, noon
      item('2026-10-16T12:00:00.000Z'), // yesterday, noon
      item('2026-10-10T12:00:00.000Z'), // earlier
    ];
    const groups = groupNotificationsByDay(items, NOW);
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Earlier']);
    expect(groups[0]!.items).toHaveLength(1);
    expect(groups[1]!.items).toHaveLength(1);
    expect(groups[2]!.items).toHaveLength(1);
  });

  it('omits empty groups rather than rendering a blank section', () => {
    const groups = groupNotificationsByDay([item('2026-10-17T10:00:00.000Z')], NOW);
    expect(groups.map((g) => g.label)).toEqual(['Today']);
  });

  it('returns no groups for an empty list', () => {
    expect(groupNotificationsByDay([], NOW)).toEqual([]);
  });

  it('keeps items within a group in their original (already newest-first) order', () => {
    const items = [item('2026-10-17T14:00:00.000Z'), item('2026-10-17T09:00:00.000Z')];
    const groups = groupNotificationsByDay(items, NOW);
    expect(groups[0]!.items.map((i) => i.id)).toEqual([items[0]!.id, items[1]!.id]);
  });
});
