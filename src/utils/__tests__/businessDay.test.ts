import {
  businessDateLabel,
  formatBusinessDate,
  isFutureBusinessDate,
  shiftBusinessDate,
} from '@/utils/businessDay';

/**
 * Business-date arithmetic and formatting, both of which are load-bearing on
 * every ledger screen.
 *
 * These live outside `@mb/shared` on purpose — see the header of
 * `utils/businessDay.ts` — so unlike the mirrored timezone helpers there is no
 * server copy keeping them honest. That makes this file the only thing that
 * does.
 *
 * Karachi is a fixed UTC+5 offset with no DST, so every instant below is exact.
 */

/** The UTC instant for a Karachi wall-clock time. */
function pkt(iso: string): Date {
  return new Date(`${iso}+05:00`);
}

describe('shiftBusinessDate', () => {
  it('steps a day either way', () => {
    expect(shiftBusinessDate('2026-08-21', -1)).toBe('2026-08-20');
    expect(shiftBusinessDate('2026-08-21', 1)).toBe('2026-08-22');
    expect(shiftBusinessDate('2026-08-21', 0)).toBe('2026-08-21');
  });

  it('crosses a month boundary', () => {
    expect(shiftBusinessDate('2026-09-01', -1)).toBe('2026-08-31');
    expect(shiftBusinessDate('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('crosses a year boundary', () => {
    expect(shiftBusinessDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftBusinessDate('2025-12-31', 1)).toBe('2026-01-01');
  });

  /**
   * A leap year is the case a naive `+ 86_400_000` on a parsed string gets
   * wrong exactly once every four years, on the one day nobody is looking.
   */
  it('knows 2028 has a 29th of February', () => {
    expect(shiftBusinessDate('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftBusinessDate('2028-03-01', -1)).toBe('2028-02-29');
    expect(shiftBusinessDate('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('steps a whole week at once', () => {
    expect(shiftBusinessDate('2026-08-21', -7)).toBe('2026-08-14');
    expect(shiftBusinessDate('2026-08-21', -364)).toBe('2025-08-22');
  });

  /**
   * Noon UTC rather than midnight, so a device in a zone behind UTC cannot
   * round the result into the previous day. `TZ` is not settable per-test under
   * Jest, but the arithmetic is UTC-only by construction and this pins the
   * property that matters: the output never depends on the input's time.
   */
  it('is stable across a long chain of steps', () => {
    let date = '2026-01-01';
    for (let i = 0; i < 400; i += 1) date = shiftBusinessDate(date, 1);
    expect(date).toBe('2027-02-05');
  });
});

describe('isFutureBusinessDate', () => {
  /**
   * The 2 AM rollover, from the other side. At 01:00 on the 21st the bakery is
   * still working the 20th, so the 21st has not happened yet — and a ledger
   * screen that let someone step into it would be asking the server for a day
   * it refuses.
   */
  it('treats the calendar date as future until 2 AM', () => {
    expect(isFutureBusinessDate('2026-08-21', pkt('2026-08-21T01:00:00'))).toBe(true);
    expect(isFutureBusinessDate('2026-08-21', pkt('2026-08-21T02:00:00'))).toBe(false);
    expect(isFutureBusinessDate('2026-08-21', pkt('2026-08-21T09:00:00'))).toBe(false);
  });

  it('is false for today and every day behind it', () => {
    const now = pkt('2026-08-21T09:00:00');
    expect(isFutureBusinessDate('2026-08-21', now)).toBe(false);
    expect(isFutureBusinessDate('2026-08-20', now)).toBe(false);
    expect(isFutureBusinessDate('2025-01-01', now)).toBe(false);
  });

  it('is true for tomorrow', () => {
    expect(isFutureBusinessDate('2026-08-22', pkt('2026-08-21T09:00:00'))).toBe(true);
  });
});

describe('formatBusinessDate', () => {
  it('writes a day, a short month and a year', () => {
    expect(formatBusinessDate('2026-08-21')).toBe('21 Aug 2026');
    expect(formatBusinessDate('2026-01-05')).toBe('5 Jan 2026');
    expect(formatBusinessDate('2026-12-31')).toBe('31 Dec 2026');
  });

  it('drops the year and adds the weekday when asked', () => {
    // 2026-08-21 is a Friday.
    expect(formatBusinessDate('2026-08-21', { weekday: true })).toBe('Fri 21 Aug');
    // 2026-08-16 is a Sunday — the wrap in the weekday table.
    expect(formatBusinessDate('2026-08-16', { weekday: true })).toBe('Sun 16 Aug');
  });

  /**
   * Not `toLocaleDateString`, and this is the assertion that says so: a device
   * in US English would render `8/21/2026` beside a server calling the same day
   * `21 Aug`, and one west of Karachi would render some days as the day before.
   */
  it('does not leave a leading zero on the day', () => {
    expect(formatBusinessDate('2026-08-01')).toBe('1 Aug 2026');
  });
});

describe('businessDateLabel', () => {
  const now = pkt('2026-08-21T09:00:00');

  it('names only today and yesterday', () => {
    expect(businessDateLabel('2026-08-21', now)).toBe('Today');
    expect(businessDateLabel('2026-08-20', now)).toBe('Yesterday');
  });

  /**
   * Two days back gets a date, not "2 days ago". A duration invites arithmetic;
   * a ledger is read against other dated records.
   */
  it('gives every other day a date', () => {
    expect(businessDateLabel('2026-08-19', now)).toBe('Wed 19 Aug');
    expect(businessDateLabel('2026-08-22', now)).toBe('Sat 22 Aug');
  });

  it('follows the 2 AM rollover rather than the clock', () => {
    // 01:00 on the 21st is still the 20th's shift, so the 20th is "Today".
    const lateShift = pkt('2026-08-21T01:00:00');
    expect(businessDateLabel('2026-08-20', lateShift)).toBe('Today');
    expect(businessDateLabel('2026-08-19', lateShift)).toBe('Yesterday');
  });
});
