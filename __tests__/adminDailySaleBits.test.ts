/**
 * @format
 */
import type { DailySaleRecord } from '@/api';
import {
  daysBetween,
  differenceState,
  displayDate,
  money,
  orDash,
  paisaMoney,
  rowDifference,
  signedMoney,
} from '@/features/admin/screens/DailySale/dailySaleBits';

describe('admin Daily Sale bits (web daily-sale/parts + columns)', () => {
  it('reads a difference with no tolerance band', () => {
    expect(differenceState(null)).toBe('uncounted');
    expect(differenceState(undefined)).toBe('uncounted');
    expect(differenceState(0)).toBe('matched');
    expect(differenceState(0.5)).toBe('over');
    expect(differenceState(-5)).toBe('short');
  });

  it('treats a row nobody counted as not counted, never matched', () => {
    const base = { overallDifference: 0, cashDifference: null, easypaisaDifference: null, bankDifference: null } as DailySaleRecord;
    expect(rowDifference(base)).toBeNull();
    expect(rowDifference({ ...base, cashDifference: -200, overallDifference: -200 })).toBe(-200);
  });

  it('formats dates and money like the web board', () => {
    expect(displayDate('2026-09-01')).toBe('01-09-2026');
    expect(money(85000.4)).toBe('Rs. 85,000');
    expect(paisaMoney(28312.5)).toBe('Rs. 28,312.50');
    expect(paisaMoney(750)).toBe('Rs. 750');
    expect(signedMoney(500)).toBe('+Rs. 500');
    expect(signedMoney(-500)).toBe('−Rs. 500');
    expect(orDash(null, money)).toBe('—');
  });

  it('counts window days inclusively', () => {
    expect(daysBetween('2026-10-01', '2026-10-01')).toBe(1);
    expect(daysBetween('2026-09-01', '2026-10-20')).toBe(50);
  });
});
