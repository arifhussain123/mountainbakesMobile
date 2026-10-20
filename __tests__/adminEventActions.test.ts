/**
 * @format
 */
import type { AdminSpecialEvent } from '@/api/types';
import {
  anchorError,
  buildEventInput,
  canClearConfirmation,
  canReviewDemand,
  clampStagePercent,
  confirmDateMessage,
  confirmDateProblem,
  deleteEventPrompt,
  dispatchResultMessage,
  eventDatePreview,
  hijriSkipsYear,
  initialEventForm,
  isValidDateStr,
  nthWeekdayOf,
  scheduleRebuiltMessage,
  stageDirty,
  statusChangeMessage,
  toggleBranchId,
  type EventFormValues,
} from '@/features/admin/utils/eventActions';

const form = (over: Partial<EventFormValues> = {}): EventFormValues => ({
  ...initialEventForm(null, 2026),
  name: 'Branch Opening',
  gregorianMonth: '11',
  gregorianDay: '5',
  ...over,
});

const event = (over: Partial<AdminSpecialEvent> = {}) =>
  ({
    id: 'e1',
    eventNumber: 'EVT-000001',
    name: 'Eid-ul-Fitr',
    description: null,
    category: 'islamic',
    eventType: 'Religious Festival',
    calendarSystem: 'hijri',
    eventYear: 2027,
    hijriMonth: 10,
    hijriDay: 1,
    gregorianMonth: null,
    gregorianDay: null,
    nthWeekday: null,
    weekday: null,
    anchorOffsetDays: 0,
    isRecurring: true,
    confirmedDate: null,
    durationDays: 3,
    demandLeadDays: 10,
    reminderLeadDays: 30,
    priority: 'critical',
    appliesToAllBranches: false,
    branchIds: ['b1', 'b2'],
    color: '#F97316',
    notes: 'stored note',
    eventDate: '2027-03-10',
    eventEndDate: '2027-03-12',
    dateIsEstimated: true,
    daysRemaining: 141,
    demandDueDate: '2027-02-28',
    status: 'upcoming',
    ...over,
  }) as AdminSpecialEvent;

describe('event form seeding', () => {
  it('starts a new event on the web defaults', () => {
    const v = initialEventForm(null, 2026);
    expect(v).toMatchObject({
      category: 'company',
      calendarSystem: 'gregorian',
      eventYear: '2026',
      isRecurring: true,
      anchorOffsetDays: '0',
      durationDays: '1',
      demandLeadDays: '10',
      reminderLeadDays: '14',
      priority: 'normal',
      appliesToAllBranches: true,
      branchIds: [],
    });
    expect(v.color).toBeUndefined();
    expect(v.notes).toBeUndefined();
  });

  it('seeds an edit from the event, carrying color and notes through', () => {
    const v = initialEventForm(event(), 2026);
    expect(v).toMatchObject({ name: 'Eid-ul-Fitr', calendarSystem: 'hijri', eventYear: '2027', hijriMonth: 10, hijriDay: '1', durationDays: '3', reminderLeadDays: '30' });
    expect(v.branchIds).toEqual(['b1', 'b2']);
    expect(v.color).toBe('#F97316');
    expect(v.notes).toBe('stored note');
    expect(buildEventInput(v)).toEqual({
      input: expect.objectContaining({ color: '#F97316', notes: 'stored note', appliesToAllBranches: false, branchIds: ['b1', 'b2'] }),
    });
  });
});

describe('buildEventInput', () => {
  it('builds the create body with numbers and a null confirmed date', () => {
    const r = buildEventInput(form({ name: '  Branch Opening ' }));
    expect(r).toEqual({
      input: {
        name: 'Branch Opening',
        description: '',
        category: 'company',
        eventType: '',
        calendarSystem: 'gregorian',
        eventYear: 2026,
        hijriMonth: null,
        hijriDay: null,
        gregorianMonth: 11,
        gregorianDay: 5,
        nthWeekday: null,
        weekday: null,
        anchorOffsetDays: 0,
        isRecurring: true,
        confirmedDate: null,
        durationDays: 1,
        demandLeadDays: 10,
        reminderLeadDays: 14,
        priority: 'normal',
        appliesToAllBranches: true,
        branchIds: [],
      },
    });
  });

  it('needs a name of 2+ characters', () => {
    expect(buildEventInput(form({ name: ' a ' }))).toEqual({ error: 'Event name is required' });
  });

  it('rejects out-of-range numbers', () => {
    expect(buildEventInput(form({ eventYear: '1999' }))).toEqual({ error: 'Year must be a whole number from 2000 to 2200' });
    expect(buildEventInput(form({ gregorianMonth: '13' }))).toEqual({ error: 'Month must be a whole number from 1 to 12' });
    expect(buildEventInput(form({ durationDays: '0' }))).toEqual({ error: 'Duration (days) must be a whole number from 1 to 60' });
    expect(buildEventInput(form({ reminderLeadDays: '' }))).toEqual({ error: 'First reminder (days before) must be a whole number from 1 to 120' });
    expect(buildEventInput(form({ demandLeadDays: '0' }))).toEqual({ input: expect.objectContaining({ demandLeadDays: 0 }) });
  });

  it('applies the anchor check with the schema messages', () => {
    expect(buildEventInput(form({ gregorianDay: '' }))).toEqual({ error: 'Day is required' });
    expect(buildEventInput(form({ calendarSystem: 'hijri' }))).toEqual({ error: 'Hijri month is required for a Hijri event' });
    expect(buildEventInput(form({ calendarSystem: 'hijri', hijriMonth: 9 }))).toEqual({ error: 'Hijri day is required for a Hijri event' });
    expect(buildEventInput(form({ calendarSystem: 'gregorian_nth_weekday' }))).toEqual({ error: 'Which occurrence (1st–5th) is required' });
    expect(buildEventInput(form({ calendarSystem: 'hijri_last_weekday', hijriMonth: 9 }))).toEqual({ error: 'Weekday is required' });
  });

  it('lets a one-off event with a confirmed date skip the anchor', () => {
    const r = buildEventInput(form({ gregorianMonth: '', gregorianDay: '', isRecurring: false, confirmedDate: '2026-12-01' }));
    expect(r).toEqual({ input: expect.objectContaining({ confirmedDate: '2026-12-01', gregorianMonth: null }) });
    expect(anchorError({ calendarSystem: 'gregorian', isRecurring: true, confirmedDate: '2026-12-01', hijriMonth: null, hijriDay: null, gregorianMonth: null, gregorianDay: null, nthWeekday: null, weekday: null })).toBe('Month is required');
  });

  it('rejects a confirmed date that is not a real day', () => {
    expect(buildEventInput(form({ confirmedDate: '2026-02-30' }))).toEqual({ error: 'Confirmed date must be a real date in YYYY-MM-DD format' });
  });

  it('keeps hidden anchor fields from another calendar system, leniently', () => {
    const r = buildEventInput(form({ hijriMonth: 9, hijriDay: 'x', anchorOffsetDays: '' }));
    expect(r).toEqual({ input: expect.objectContaining({ hijriMonth: 9, hijriDay: null, anchorOffsetDays: 0 }) });
  });

  it('validates the shift only where it is shown', () => {
    const nth = form({ calendarSystem: 'gregorian_nth_weekday', nthWeekday: 4, weekday: 4, anchorOffsetDays: '40' });
    expect(buildEventInput(nth)).toEqual({ error: 'Shift by (days) must be a whole number from -30 to 30' });
    expect(buildEventInput({ ...nth, anchorOffsetDays: '-3' })).toEqual({ input: expect.objectContaining({ anchorOffsetDays: -3 }) });
  });
});

describe('date preview', () => {
  it('previews a fixed Gregorian date and rejects an impossible one', () => {
    expect(eventDatePreview(form())).toEqual({ date: '2026-11-05', deviceCannotResolve: false });
    expect(eventDatePreview(form({ gregorianMonth: '2', gregorianDay: '30' })).date).toBeNull();
  });

  it('previews the nth weekday with its shift (Black Friday 2026)', () => {
    expect(nthWeekdayOf(2026, 11, 4, 4)).toBe('2026-11-26');
    expect(nthWeekdayOf(2026, 2, 5, 0)).toBeNull();
    const v = form({ calendarSystem: 'gregorian_nth_weekday', nthWeekday: 4, weekday: 4, anchorOffsetDays: '1' });
    expect(eventDatePreview(v).date).toBe('2026-11-27');
  });

  it('resolves Hijri dates through the injected converter', () => {
    // 1 Shawwal 1448 → 2027-03-09 under Umm al-Qura (Node's full ICU).
    const v = form({ calendarSystem: 'hijri', eventYear: '2027', hijriMonth: 10, hijriDay: '1' });
    expect(eventDatePreview(v)).toEqual({ date: '2027-03-09', deviceCannotResolve: false });
    const lastFriday = form({ calendarSystem: 'hijri_last_weekday', eventYear: '2027', hijriMonth: 9, weekday: 5 });
    const d = eventDatePreview(lastFriday).date!;
    expect(new Date(`${d}T12:00:00Z`).getUTCDay()).toBe(5);
    expect(d.startsWith('2027-03')).toBe(true);
  });

  it('says so when the device cannot convert Hijri dates', () => {
    const v = form({ calendarSystem: 'hijri', hijriMonth: 10, hijriDay: '1' });
    const p = eventDatePreview(v, () => null);
    expect(p).toEqual({ date: null, deviceCannotResolve: true });
    expect(hijriSkipsYear(v, p)).toBe(false);
  });

  it('flags a Hijri anniversary that skips the chosen year', () => {
    const v = form({ calendarSystem: 'hijri', hijriMonth: 10, hijriDay: '1' });
    expect(hijriSkipsYear(v, { date: null, deviceCannotResolve: false })).toBe(true);
    expect(hijriSkipsYear({ ...v, confirmedDate: '2026-03-20' }, { date: null, deviceCannotResolve: false })).toBe(false);
  });
});

describe('admin controls and tab actions', () => {
  it('validates the confirmed date', () => {
    expect(confirmDateProblem('')).toBe('Enter the confirmed date');
    expect(confirmDateProblem('20-03-2026')).toBe('Enter the date as YYYY-MM-DD');
    expect(confirmDateProblem(' 2026-03-20 ')).toBeNull();
    expect(isValidDateStr('2027-02-29')).toBe(false);
  });

  it('offers Clear confirmation only while a confirmed date is in use', () => {
    expect(canClearConfirmation({ dateIsEstimated: true })).toBe(false);
    expect(canClearConfirmation({ dateIsEstimated: false })).toBe(true);
  });

  it('uses the web toast wording', () => {
    expect(confirmDateMessage('2026-03-20')).toBe('Date confirmed — reminders rescheduled');
    expect(confirmDateMessage(null)).toBe('Confirmation cleared — the estimate is in use again');
    expect(statusChangeMessage('cancelled')).toBe('Event cancelled — pending reminders stopped');
    expect(statusChangeMessage('active')).toBe('Status updated');
    expect(deleteEventPrompt('Eid')).toBe('Remove "Eid" from the events calendar? Pending reminders will be cancelled.');
    expect(scheduleRebuiltMessage({ created: 2, updated: 1, removed: 0, skippedPast: 3 })).toBe('Schedule rebuilt — 2 added, 1 moved, 0 cancelled.');
  });

  it('reports a dispatch run like the web', () => {
    const base = { onDate: '2026-10-20', dispatched: 0, sent: 0, failed: 0, messagesSent: 0, messagesFailed: 0 };
    expect(dispatchResultMessage({ ...base, skipped: 'dry run — nothing was sent' })).toEqual({ tone: 'info', text: 'dry run — nothing was sent' });
    expect(dispatchResultMessage(base)).toEqual({ tone: 'info', text: 'No reminders are due today.' });
    expect(dispatchResultMessage({ ...base, dispatched: 3, sent: 2, messagesSent: 9, failed: 1 })).toEqual({
      tone: 'success',
      text: '2 reminder(s) sent · 9 message(s) delivered · 1 failed',
    });
  });

  it('reviews only submitted demands', () => {
    expect(canReviewDemand({ status: 'submitted' })).toBe(true);
    expect(canReviewDemand({ status: 'draft' })).toBe(false);
    expect(canReviewDemand({ status: 'approved' })).toBe(false);
  });

  it('clamps the stage percentage and tracks changes', () => {
    expect(clampStagePercent('140')).toBe(100);
    expect(clampStagePercent('-5')).toBe(0);
    expect(clampStagePercent('abc')).toBe(0);
    const stage = { completionPercentage: 50, remarks: null };
    expect(stageDirty(stage, 50, '')).toBe(false);
    expect(stageDirty(stage, 75, '')).toBe(true);
    expect(stageDirty(stage, 50, 'flour in')).toBe(true);
  });

  it('toggles a branch in or out of the target list', () => {
    expect(toggleBranchId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleBranchId(['a', 'b'], 'a')).toEqual(['b']);
  });
});
