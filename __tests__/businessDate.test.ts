/**
 * @format
 */
import { getBusinessDate, getBusinessDayBounds } from '@/api/businessDate';

// A full App render-test needs reanimated 4/worklets' native module mocked,
// which this phase doesn't build out (see the folder-structure skill's "Known
// Gaps" — no test convention is established yet). This is a real, narrow unit
// test instead: the business-date rollover is exactly the kind of logic that
// silently drifting from the backend's own `businessDateStr()` would be a
// quiet, hard-to-notice bug (a sale landing on the wrong day), so it's worth
// protecting even before a broader test strategy exists.
describe('getBusinessDate', () => {
  it('keeps a time at or after 02:00 Karachi on the same calendar day', () => {
    // 10:00 UTC = 15:00 Karachi (UTC+5) on 12 Oct.
    expect(getBusinessDate(new Date('2026-10-12T10:00:00.000Z'))).toBe('2026-10-12');
  });

  it('rolls a time before 02:00 Karachi back to the previous business day', () => {
    // 20:30 UTC on 11 Oct = 01:30 Karachi on 12 Oct — before the 02:00 rollover.
    expect(getBusinessDate(new Date('2026-10-11T20:30:00.000Z'))).toBe('2026-10-11');
  });

  it('treats exactly 02:00 Karachi as the new business day', () => {
    // 21:00 UTC on 11 Oct = 02:00 Karachi on 12 Oct — the rollover instant itself.
    expect(getBusinessDate(new Date('2026-10-11T21:00:00.000Z'))).toBe('2026-10-12');
  });
});

describe('getBusinessDayBounds', () => {
  it('spans 02:00 Karachi that day to 01:59:59.999 Karachi the next, in UTC', () => {
    const bounds = getBusinessDayBounds('2026-10-12');
    expect(bounds.from).toBe('2026-10-11T21:00:00.000Z');
    expect(bounds.to).toBe('2026-10-12T20:59:59.999Z');
  });
});
