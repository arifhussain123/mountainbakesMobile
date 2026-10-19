import { formatDeviceKind, formatLocation, formatPlatform, formatSessionDuration } from '../src/features/admin/screens/security/sessionFormat';
import { formatBackupDuration, formatBytes, keyFileName, shortChecksum } from '../src/features/admin/screens/backup/backupFormat';
import { addDaysToDateStr, daysBetweenDateStr, ladderRange, restrictionDmy, time12 } from '../src/features/admin/screens/settings/restrictionFormat';
import { isQuickRange, quickRange } from '../src/features/admin/screens/security/quickRanges';

describe('Security session format (web sessionFormat.tsx)', () => {
  it('formats durations the way the web does', () => {
    expect(formatSessionDuration(45_000)).toBe('45s');
    expect(formatSessionDuration(18 * 60_000)).toBe('18m');
    expect(formatSessionDuration((3 * 60 + 7) * 60_000)).toBe('3h 07m');
    expect(formatSessionDuration((2 * 24 + 4) * 3_600_000)).toBe('2d 4h');
    expect(formatSessionDuration(-1)).toBe('—');
  });

  it('composes location, platform and device from what the row knows', () => {
    expect(formatLocation({ area: null, city: 'Karachi', country: 'Pakistan' })).toBe('Karachi, Pakistan');
    expect(formatLocation({ area: null, city: null, country: null })).toBe('Location unavailable');
    expect(formatPlatform({ os: 'Linux', deviceType: 'desktop' })).toBe('Linux Desktop');
    expect(formatPlatform({ os: 'Android', deviceType: 'unknown' })).toBe('Android');
    expect(formatDeviceKind({ deviceType: 'mobile', deviceName: 'SM-A155F' })).toBe('SM-A155F (Mobile)');
  });

  it('anchors quick ranges on the business date, today included', () => {
    expect(quickRange(6, '2026-10-20')).toEqual({ from: '2026-10-14', to: '2026-10-20' });
    expect(isQuickRange({ from: '2026-10-20', to: '2026-10-20' }, 0, '2026-10-20')).toBe(true);
    expect(isQuickRange(null, 0, '2026-10-20')).toBe(false);
  });
});

describe('Database Backup format (web backupFormat.tsx)', () => {
  it('sizes, durations, checksums and keys', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(null)).toBe('—');
    expect(formatBackupDuration(800)).toBe('800 ms');
    expect(formatBackupDuration(12_300)).toBe('12.3 s');
    expect(formatBackupDuration(125_000)).toBe('2m 5s');
    expect(shortChecksum('0123456789abcdef')).toBe('0123456789ab…');
    expect(keyFileName('database-backups/daily/2026/09/mb-daily.dump')).toBe('mb-daily.dump');
  });
});

describe('Restriction Rules format', () => {
  it('dates, times and ladder ranges', () => {
    expect(restrictionDmy('2026-10-20')).toBe('20-10-2026');
    expect(time12('02:00')).toBe('02:00 AM');
    expect(time12('14:30')).toBe('02:30 PM');
    expect(time12('00:15')).toBe('12:15 AM');
    expect(addDaysToDateStr('2026-10-02', -3)).toBe('2026-09-29');
    expect(daysBetweenDateStr('2026-10-18', '2026-10-20')).toBe(2);
    expect(ladderRange(0, 1)).toBe('0–1');
    expect(ladderRange(2, 2)).toBe('2');
    expect(ladderRange(3, 2)).toBe('—');
  });
});
