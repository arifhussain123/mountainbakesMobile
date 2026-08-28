import {
  BUSINESS_DAY_START_MINUTES,
  ORDER_WINDOW_CLOSE_MINUTES,
  ORDER_WINDOW_OPEN_MINUTES,
  businessDateStr,
  businessDayBounds,
  isWithinOrderWindow,
  karachiDateStr,
  karachiMinutesOfDay,
} from '@/shared/utils/timezone';

/**
 * These pin the business-day rule the whole app bills on. The bakery trades
 * 8:00 AM → 2:00 AM, so the business date rolls at 2:00 AM Karachi, NOT midnight.
 * A sale rung up at 01:30 belongs to the previous business date.
 *
 * The helpers under test are the byte-for-byte mirror of the server's
 * src/shared/utils/timezone.ts. If these fail after a shared/ re-sync, the mobile
 * client and the API have started disagreeing about which day a sale lands on.
 *
 * Karachi is a fixed UTC+5 offset, so the UTC instants below are exact.
 */

/** Build the UTC instant for a Karachi wall-clock time. */
function pkt(iso: string): Date {
  return new Date(`${iso}+05:00`);
}

describe('the 2 AM business-day boundary', () => {
  it('is 120 minutes past midnight', () => {
    expect(BUSINESS_DAY_START_MINUTES).toBe(120);
  });

  it('keeps evening trade on the same business date', () => {
    expect(businessDateStr(pkt('2026-08-18T20:00:00'))).toBe('2026-08-18');
  });

  it('bills after-midnight trade to the PREVIOUS business date', () => {
    // 01:30 on the 19th is still the 18th's business day.
    expect(businessDateStr(pkt('2026-08-19T01:30:00'))).toBe('2026-08-18');
    expect(businessDateStr(pkt('2026-08-19T01:59:59'))).toBe('2026-08-18');
  });

  it('rolls over exactly at 02:00', () => {
    expect(businessDateStr(pkt('2026-08-19T02:00:00'))).toBe('2026-08-19');
  });

  it('differs from the plain calendar date in the midnight–2 AM window', () => {
    const afterMidnight = pkt('2026-08-19T01:30:00');
    expect(karachiDateStr(afterMidnight)).toBe('2026-08-19');
    expect(businessDateStr(afterMidnight)).toBe('2026-08-18');
  });

  it('spans 02:00 to next-day 01:59:59.999 in UTC', () => {
    const { fromISO, toISO } = businessDayBounds('2026-08-18');
    // 02:00 PKT on the 18th === 21:00Z on the 17th.
    expect(fromISO).toBe('2026-08-17T21:00:00.000Z');
    // 01:59:59.999 PKT on the 19th === 20:59:59.999Z on the 18th.
    expect(toISO).toBe('2026-08-18T20:59:59.999Z');
  });

  it('places a 01:30 sale inside the previous day bounds and outside the next', () => {
    const sale = pkt('2026-08-19T01:30:00');
    const prev = businessDayBounds('2026-08-18');
    const next = businessDayBounds('2026-08-19');
    expect(sale.toISOString() >= prev.fromISO && sale.toISOString() <= prev.toISO).toBe(true);
    expect(sale.toISOString() >= next.fromISO).toBe(false);
  });
});

describe('karachiMinutesOfDay', () => {
  it('counts minutes from Karachi midnight', () => {
    expect(karachiMinutesOfDay(pkt('2026-08-18T00:00:00'))).toBe(0);
    expect(karachiMinutesOfDay(pkt('2026-08-18T10:00:00'))).toBe(600);
    expect(karachiMinutesOfDay(pkt('2026-08-18T23:59:00'))).toBe(1439);
  });
});

describe('the order window (wraps past midnight)', () => {
  const open = ORDER_WINDOW_OPEN_MINUTES; // 08:00
  const close = ORDER_WINDOW_CLOSE_MINUTES; // 02:00

  it('defaults to 08:00 → 02:00', () => {
    expect(open).toBe(480);
    expect(close).toBe(120);
  });

  it('accepts times inside the wrapping window', () => {
    expect(isWithinOrderWindow(480, open, close)).toBe(true); // 08:00 exactly
    expect(isWithinOrderWindow(1200, open, close)).toBe(true); // 20:00
    expect(isWithinOrderWindow(0, open, close)).toBe(true); // midnight
    expect(isWithinOrderWindow(120, open, close)).toBe(true); // 02:00 inclusive
  });

  it('rejects times in the closed gap', () => {
    expect(isWithinOrderWindow(121, open, close)).toBe(false); // 02:01
    expect(isWithinOrderWindow(479, open, close)).toBe(false); // 07:59
  });

  it('still handles a non-wrapping window', () => {
    expect(isWithinOrderWindow(600, 480, 1080)).toBe(true);
    expect(isWithinOrderWindow(1140, 480, 1080)).toBe(false);
  });
});
