/**
 * @format
 */
import { expectedCashInHand, isLargeDifference, liveChannelDifference, LARGE_DIFFERENCE_THRESHOLD } from '@/features/closing/api/dailySaleCalculations';

describe('liveChannelDifference', () => {
  it('returns null for a blank input — "not yet counted", not "short by the whole amount"', () => {
    expect(liveChannelDifference('', 37100)).toBeNull();
    expect(liveChannelDifference('   ', 37100)).toBeNull();
  });

  it('returns null for an unparseable input', () => {
    expect(liveChannelDifference('abc', 37100)).toBeNull();
  });

  it('is a generic counted-vs-baseline diff — the caller decides which baseline to pass', () => {
    expect(liveChannelDifference('37100', 37100)).toBe(0);
  });

  it('is positive when over, negative when short', () => {
    expect(liveChannelDifference('37300', 37100)).toBe(200);
    expect(liveChannelDifference('36900', 37100)).toBe(-200);
  });
});

describe('expectedCashInHand', () => {
  it('matches the reference example: 37,100 cash − 300 cash expense = 36,800', () => {
    expect(expectedCashInHand(37100, 300)).toBe(36800);
  });

  it('can legitimately go negative when cash expenses exceed cash takings', () => {
    // 15-10 reference: 32,850 cash − 36,790 cash expense = -3,940
    expect(expectedCashInHand(32850, 36790)).toBe(-3940);
  });
});

describe('isLargeDifference', () => {
  it('is false for null (not yet counted)', () => {
    expect(isLargeDifference(null)).toBe(false);
  });

  it('is false just under the threshold, true at and above it, either direction', () => {
    expect(isLargeDifference(LARGE_DIFFERENCE_THRESHOLD - 1)).toBe(false);
    expect(isLargeDifference(LARGE_DIFFERENCE_THRESHOLD)).toBe(true);
    expect(isLargeDifference(-LARGE_DIFFERENCE_THRESHOLD)).toBe(true);
  });
});
