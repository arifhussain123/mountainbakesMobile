import {
  daysBetween,
  periodFor,
  previousPeriodFor,
} from '../comparisonPeriods';

/**
 * The calendar maths behind Sales vs Expenses, tested without a renderer.
 *
 * Everything on that screen is derived from these two functions — the bar
 * scale, the totals, the averages and every "was 24%" — so an off-by-one here
 * is a wrong number on every card at once, and one that looks perfectly
 * plausible.
 */

// A Wednesday, comfortably inside Q4 and inside November.
const WED_5_NOV = '2025-11-05';

describe('periodFor', () => {
  describe('week', () => {
    it('runs Monday to Sunday around today', () => {
      const week = periodFor('week', WED_5_NOV);
      expect(week.from).toBe('2025-11-03');
      expect(week.to).toBe('2025-11-09');
      expect(week.buckets.map(b => b.label)).toEqual([
        'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
      ]);
    });

    /** Thursday onward has not happened on a Wednesday. */
    it('marks the days still to come as future, and today as current', () => {
      const week = periodFor('week', WED_5_NOV);
      expect(week.buckets.filter(b => b.future).map(b => b.label)).toEqual([
        'Thu', 'Fri', 'Sat', 'Sun',
      ]);
      expect(week.buckets.filter(b => b.current).map(b => b.label)).toEqual(['Wed']);
    });

    it('counts the days lived through, not the days in the week', () => {
      expect(periodFor('week', WED_5_NOV).elapsedDays).toBe(3);
      expect(periodFor('week', '2025-11-09').elapsedDays).toBe(7);
    });
  });

  describe('month', () => {
    it('runs the whole calendar month, in seven-day slices from the 1st', () => {
      const month = periodFor('month', WED_5_NOV);
      expect(month.from).toBe('2025-11-01');
      expect(month.to).toBe('2025-11-30');
      expect(month.buckets.map(b => b.label)).toEqual([
        '1–7', '8–14', '15–21', '22–28', '29–30',
      ]);
    });

    it('keeps the short final slice honest about its length', () => {
      // 31 days: the last slice is 29–31, not a full week pretending otherwise.
      expect(periodFor('month', '2025-10-05').buckets.at(-1)?.label).toBe('29–31');
      // And February.
      expect(periodFor('month', '2025-02-05').buckets.at(-1)?.label).toBe('22–28');
    });

    it('marks slices that have not started', () => {
      const month = periodFor('month', WED_5_NOV);
      expect(month.buckets.filter(b => b.future).map(b => b.label)).toEqual([
        '8–14', '15–21', '22–28', '29–30',
      ]);
      // The slice containing the 5th is half-lived, so it counts.
      expect(month.buckets[0]?.future).toBe(false);
      expect(month.buckets[0]?.current).toBe(true);
    });
  });

  describe('quarter', () => {
    it('runs three calendar months, bucketed by month', () => {
      const quarter = periodFor('quarter', WED_5_NOV);
      expect(quarter.from).toBe('2025-10-01');
      expect(quarter.to).toBe('2025-12-31');
      expect(quarter.buckets.map(b => b.label)).toEqual(['Oct', 'Nov', 'Dec']);
    });

    /**
     * The case the `future` flag exists for. December drawn as a zero makes an
     * ordinary quarter read as a collapse in trade.
     */
    it('marks a month still to come as future rather than empty', () => {
      const quarter = periodFor('quarter', WED_5_NOV);
      expect(quarter.buckets.map(b => b.future)).toEqual([false, false, true]);
    });

    it('starts every quarter on the right month', () => {
      expect(periodFor('quarter', '2025-01-15').from).toBe('2025-01-01');
      expect(periodFor('quarter', '2025-05-15').from).toBe('2025-04-01');
      expect(periodFor('quarter', '2025-08-15').from).toBe('2025-07-01');
      expect(periodFor('quarter', '2025-12-31').from).toBe('2025-10-01');
    });
  });
});

/**
 * The comparison, and the reason it is truncated.
 *
 * Measuring five days of November against the whole of October reports a
 * collapse that is the calendar — every month, on the screen a manager opens to
 * find out whether something is wrong.
 */
describe('previousPeriodFor', () => {
  it('takes the same number of days from the previous month', () => {
    // 5 days elapsed in November → the 1st to the 5th of October.
    expect(previousPeriodFor('month', WED_5_NOV)).toEqual({
      from: '2025-10-01',
      to: '2025-10-05',
    });
  });

  it('takes the same number of days from the previous week', () => {
    expect(previousPeriodFor('week', WED_5_NOV)).toEqual({
      from: '2025-10-27',
      to: '2025-10-29',
    });
  });

  it('takes the same number of days from the previous quarter', () => {
    // Q4 started 1 Oct; 5 Nov is day 36.
    expect(previousPeriodFor('quarter', WED_5_NOV)).toEqual({
      from: '2025-07-01',
      to: '2025-08-05',
    });
  });

  it('crosses the year boundary rather than landing on month zero', () => {
    expect(previousPeriodFor('month', '2025-01-10').from).toBe('2024-12-01');
    expect(previousPeriodFor('quarter', '2025-01-10').from).toBe('2024-10-01');
  });

  /**
   * A shorter previous period cannot lend days it does not have: 30 days of
   * March against February would run off the end of it.
   */
  it('clamps to the previous period when it is shorter', () => {
    const previous = previousPeriodFor('month', '2025-03-31');
    expect(previous.from).toBe('2025-02-01');
    expect(previous.to).toBe('2025-02-28');
  });

  it('compares a whole period against a whole one on the last day', () => {
    const previous = previousPeriodFor('month', '2025-11-30');
    expect(daysBetween(previous.from, previous.to)).toBe(30);
  });
});
