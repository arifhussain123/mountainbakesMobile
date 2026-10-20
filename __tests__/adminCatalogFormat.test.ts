/**
 * @format
 */
import {
  formatDistanceKm,
  formatRsCompact,
  googleMapsUrl,
  karachiDisplayDate,
  resolveShareSplit,
} from '@/features/admin/utils/catalogFormat';

describe('resolveShareSplit (web Branches "Company / Branch")', () => {
  it('uses the branch override when set', () => {
    expect(resolveShareSplit(70, 75)).toEqual({ companySharePct: 70, branchSharePct: 30, isOverride: true });
  });

  it('falls back to the global default and marks it Default', () => {
    expect(resolveShareSplit(null, 75)).toEqual({ companySharePct: 75, branchSharePct: 25, isOverride: false });
    expect(resolveShareSplit(undefined, 60)).toEqual({ companySharePct: 60, branchSharePct: 40, isOverride: false });
  });

  it('rounds the branch half to 2 dp', () => {
    expect(resolveShareSplit(33.33, 75).branchSharePct).toBe(66.67);
  });

  it('ignores an out-of-range override', () => {
    expect(resolveShareSplit(150, 75).isOverride).toBe(false);
  });
});

describe('formatDistanceKm (web Branch Locations radius)', () => {
  it('shows metres under a kilometre', () => {
    expect(formatDistanceKm(0.25)).toBe('250 m');
  });
  it('shows one-decimal KM from a kilometre up', () => {
    expect(formatDistanceKm(1)).toBe('1.0 KM');
    expect(formatDistanceKm(2.46)).toBe('2.5 KM');
  });
  it('dashes a missing value', () => {
    expect(formatDistanceKm(null)).toBe('—');
  });
});

describe('formatRsCompact', () => {
  it('formats like the web table cells', () => {
    expect(formatRsCompact(1250)).toBe('Rs.1,250');
    expect(formatRsCompact(null)).toBe('—');
  });
});

describe('karachiDisplayDate', () => {
  it('uses the Karachi calendar day (UTC+5)', () => {
    // 21:00 UTC on 19 Oct is 02:00 on 20 Oct in Karachi.
    expect(karachiDisplayDate('2026-10-19T21:00:00Z')).toBe('20 Oct 2026');
  });
  it('dashes a missing date', () => {
    expect(karachiDisplayDate(undefined)).toBe('—');
  });
});

describe('googleMapsUrl', () => {
  it('builds the web link', () => {
    expect(googleMapsUrl(33.6, 73.05)).toBe('https://www.google.com/maps/search/?api=1&query=33.6,73.05');
  });
});
