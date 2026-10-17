/**
 * @format
 */
import { mergeReadState } from '@/api/hooks/useNotificationsApi';
import type { AppNotification } from '@/api';

function notification(id: string, isRead: boolean): AppNotification {
  return {
    id,
    type: 'support_resolved',
    title: 'Title',
    message: 'Message',
    isRead,
    targetUserId: null,
    targetRole: null,
    branchId: null,
    relatedId: null,
    createdAt: new Date().toISOString(),
  };
}

describe('mergeReadState', () => {
  it('is unread when isRead is false and the id is not in readIds', () => {
    const result = mergeReadState([notification('a', false)], []);
    expect(result[0]!.read).toBe(false);
  });

  it('is read when readIds contains the id, even if the legacy isRead flag is false (a broadcast notification this reader has personally read)', () => {
    const result = mergeReadState([notification('a', false)], ['a']);
    expect(result[0]!.read).toBe(true);
  });

  it('is read when the legacy isRead flag is true, even if readIds does not contain the id', () => {
    const result = mergeReadState([notification('a', true)], []);
    expect(result[0]!.read).toBe(true);
  });

  it('does not mark an unrelated id as read from another notification being in readIds', () => {
    const result = mergeReadState([notification('a', false), notification('b', false)], ['a']);
    expect(result.find((n) => n.id === 'a')!.read).toBe(true);
    expect(result.find((n) => n.id === 'b')!.read).toBe(false);
  });

  it('returns an empty array for an empty feed', () => {
    expect(mergeReadState([], ['a', 'b'])).toEqual([]);
  });
});
