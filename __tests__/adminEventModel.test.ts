import {
  buildMonthGrid,
  clampPercent,
  eventCountdown,
  eventsByDate,
  groupTimeline,
  longDateLabel,
  progressTone,
  shiftMonth,
} from '../src/features/admin/screens/SpecialEvents/eventModel';

describe('Super Admin Special Events — display model (web EventBits/EventCalendar/EventTimeline)', () => {
  it('countdown text and colour bands match the web', () => {
    expect(eventCountdown(null)).toEqual({ text: '—', tone: 'muted' });
    expect(eventCountdown(0)).toEqual({ text: 'Today', tone: 'danger' });
    expect(eventCountdown(1)).toEqual({ text: 'in 1 day', tone: 'danger' });
    expect(eventCountdown(3)).toEqual({ text: 'in 3 days', tone: 'danger' });
    expect(eventCountdown(14)).toEqual({ text: 'in 14 days', tone: 'warning' });
    expect(eventCountdown(15)).toEqual({ text: 'in 15 days', tone: 'normal' });
    expect(eventCountdown(-1)).toEqual({ text: '1 day ago', tone: 'muted' });
    expect(eventCountdown(-12)).toEqual({ text: '12 days ago', tone: 'muted' });
  });

  it('progress clamps and picks the web fill tone', () => {
    expect(clampPercent(140)).toBe(100);
    expect(clampPercent(-5)).toBe(0);
    expect(progressTone(100)).toBe('success');
    expect(progressTone(50)).toBe('primary');
    expect(progressTone(10)).toBe('warning');
    expect(progressTone(0)).toBe('empty');
  });

  it('builds a Monday-start grid of whole weeks', () => {
    // October 2026 starts on a Thursday: Mon 28 Sep … Sun 1 Nov = 35 cells.
    const grid = buildMonthGrid(2026, 10);
    expect(grid).toHaveLength(35);
    expect(grid[0]).toEqual({ key: '2026-09-28', day: 28, outside: true });
    expect(grid[3]).toEqual({ key: '2026-10-01', day: 1, outside: false });
    expect(grid[grid.length - 1]).toEqual({ key: '2026-11-01', day: 1, outside: true });
    expect(buildMonthGrid(2026, 2).length % 7).toBe(0);
  });

  it('expands multi-day events across every day they span', () => {
    const map = eventsByDate([
      { eventDate: '2026-03-20', eventEndDate: '2026-03-22' },
      { eventDate: '2026-03-21', eventEndDate: null },
      { eventDate: null, eventEndDate: null },
    ]);
    expect(map.get('2026-03-20')).toHaveLength(1);
    expect(map.get('2026-03-21')).toHaveLength(2);
    expect(map.get('2026-03-22')).toHaveLength(1);
    expect(map.has('2026-03-23')).toBe(false);
  });

  it('groups the timeline by month, undated last', () => {
    const groups = groupTimeline([
      { eventDate: '2026-05-10' },
      { eventDate: null },
      { eventDate: '2026-03-01' },
      { eventDate: '2026-05-01' },
    ]);
    expect(groups.map((g) => g.label)).toEqual(['March 2026', 'May 2026', 'Date not yet resolved']);
    expect(groups[1]?.events.map((e) => e.eventDate)).toEqual(['2026-05-01', '2026-05-10']);
  });

  it('month navigation and labels', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(longDateLabel('2026-10-05')).toBe('5 October 2026');
  });
});
