import type { EventBranchDemand } from '@/shared/types/special-event.types';

import {
  demandStatusFor,
  isDueSoon,
  urgencyOf,
  daysUntil,
  DEMAND_STATE_LABEL,
} from '../demandState';

/**
 * The four demand states, and the one asymmetry the whole screen turns on.
 *
 * The server gates SAVING on the demand deadline and does not gate submitting at
 * all, which is the opposite of where anybody looks for it. Getting it backwards
 * offers a Save that always 409s and refuses a send the server would accept, so
 * it is asserted here rather than left to a component to re-derive.
 */

const TODAY = '2026-08-29';

function demand(status: EventBranchDemand['status']): EventBranchDemand {
  return { id: 'd1', status } as unknown as EventBranchDemand;
}

describe('demandStatusFor', () => {
  it('is not started when there is no demand and time remains', () => {
    const s = demandStatusFor({ demandDueDate: '2026-09-05' }, null, TODAY);
    expect(s.state).toBe('not_started');
    expect(s.canSave).toBe(true);
    expect(s.canSubmit).toBe(false);
    expect(s.needsAction).toBe(true);
  });

  it('is a draft once something is saved', () => {
    const s = demandStatusFor({ demandDueDate: '2026-09-05' }, demand('draft'), TODAY);
    expect(s.state).toBe('draft');
    expect(s.canSave).toBe(true);
    expect(s.canSubmit).toBe(true);
  });

  it('closes SAVING after the deadline, which is where the server puts it', () => {
    const s = demandStatusFor({ demandDueDate: '2026-08-28' }, demand('draft'), TODAY);
    expect(s.state).toBe('missed');
    expect(s.canSave).toBe(false);
  });

  it('still allows an in-time draft to be SENT after the deadline', () => {
    // The submit route checks only draft-status and branch ownership. Refusing
    // here would block something the server accepts.
    const s = demandStatusFor({ demandDueDate: '2026-08-28' }, demand('draft'), TODAY);
    expect(s.canSubmit).toBe(true);
  });

  it('is missed when the deadline passed with nothing saved', () => {
    const s = demandStatusFor({ demandDueDate: '2026-08-28' }, null, TODAY);
    expect(s.state).toBe('missed');
    expect(s.canSave).toBe(false);
    expect(s.canSubmit).toBe(false);
    expect(s.needsAction).toBe(false);
  });

  it('still reads Submitted after the deadline, because it was in time', () => {
    const s = demandStatusFor({ demandDueDate: '2026-08-20' }, demand('submitted'), TODAY);
    expect(s.state).toBe('submitted');
    expect(DEMAND_STATE_LABEL[s.state]).toBe('Submitted');
    expect(s.needsAction).toBe(false);
  });

  it.each(['approved', 'rejected', 'fulfilled'] as const)(
    'treats %s as sent — the branch has done its part',
    status => {
      const s = demandStatusFor({ demandDueDate: '2026-09-05' }, demand(status), TODAY);
      expect(s.state).toBe('submitted');
      expect(s.canSave).toBe(false);
      expect(s.needsAction).toBe(false);
    },
  );

  it('does not treat a missing deadline as an expired one', () => {
    // An event nobody set a due date on must not lock the branch out of it.
    const s = demandStatusFor({ demandDueDate: null }, null, TODAY);
    expect(s.state).toBe('not_started');
    expect(s.canSave).toBe(true);
    expect(s.daysToDeadline).toBeNull();
  });

  it('counts the deadline day itself as still open', () => {
    const s = demandStatusFor({ demandDueDate: TODAY }, null, TODAY);
    expect(s.daysToDeadline).toBe(0);
    expect(s.canSave).toBe(true);
    expect(s.state).toBe('not_started');
  });
});

describe('isDueSoon', () => {
  it('counts an outstanding demand close to its deadline', () => {
    const s = demandStatusFor({ demandDueDate: '2026-08-31' }, null, TODAY);
    expect(isDueSoon(s)).toBe(true);
  });

  it('does not count one already submitted, however close the date', () => {
    // Counting met deadlines would leave the tile permanently lit, and a warning
    // that is always on is one nobody reads.
    const s = demandStatusFor({ demandDueDate: '2026-08-30' }, demand('submitted'), TODAY);
    expect(isDueSoon(s)).toBe(false);
  });

  it('does not count one whose deadline has already gone', () => {
    const s = demandStatusFor({ demandDueDate: '2026-08-01' }, null, TODAY);
    expect(isDueSoon(s)).toBe(false);
  });
});

describe('urgencyOf', () => {
  it('grades by lead time alone, so a card and an agenda agree', () => {
    expect(urgencyOf(0)).toBe('urgent');
    expect(urgencyOf(1)).toBe('urgent');
    expect(urgencyOf(2)).toBe('soon');
    expect(urgencyOf(10)).toBe('soon');
    expect(urgencyOf(11)).toBe('normal');
  });

  it('is normal when the date is unresolved rather than guessing', () => {
    expect(urgencyOf(null)).toBe('normal');
  });
});

describe('daysUntil', () => {
  it('counts forward and backward across a month boundary', () => {
    expect(daysUntil('2026-09-01', TODAY)).toBe(3);
    expect(daysUntil('2026-08-27', TODAY)).toBe(-2);
  });

  it('returns null rather than NaN for an unusable date', () => {
    expect(daysUntil(null, TODAY)).toBeNull();
    expect(daysUntil('not-a-date', TODAY)).toBeNull();
  });
});
