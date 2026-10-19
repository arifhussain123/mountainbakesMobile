import type { SpecialEvent } from '@/api';

/**
 * Pure display logic for Super Admin's Special Events screens, ported from the
 * web's EventBits / EventCalendar / EventTimeline so the phone shows the same
 * countdowns, calendar cells and month groups. No React, no theme — unit-tested.
 */

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Umm al-Qura month names, index 0 = Muharram (web `HIJRI_MONTHS`). */
const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  'Dhu al-Qadah',
  'Dhu al-Hijjah',
] as const;

export type CountdownTone = 'danger' | 'warning' | 'muted' | 'normal';

/** "Today" / "in 23 days" / "12 days ago" — web EventCountdown, same colour bands. */
export function eventCountdown(daysRemaining: number | null | undefined): { text: string; tone: CountdownTone } {
  if (daysRemaining === null || daysRemaining === undefined) return { text: '—', tone: 'muted' };
  if (daysRemaining === 0) return { text: 'Today', tone: 'danger' };
  const n = Math.abs(daysRemaining);
  const unit = `day${n === 1 ? '' : 's'}`;
  if (daysRemaining < 0) return { text: `${n} ${unit} ago`, tone: 'muted' };
  const tone: CountdownTone = daysRemaining <= 3 ? 'danger' : daysRemaining <= 14 ? 'warning' : 'normal';
  return { text: `in ${n} ${unit}`, tone };
}

/** Clamp to 0–100, as the web ProgressBar does. */
export function clampPercent(value: number | null | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export type ProgressTone = 'success' | 'primary' | 'warning' | 'empty';

/** Web ProgressBar fill: 100 → green, ≥50 → primary, >0 → amber, 0 → nothing. */
export function progressTone(value: number): ProgressTone {
  const v = clampPercent(value);
  if (v === 100) return 'success';
  if (v >= 50) return 'primary';
  if (v > 0) return 'warning';
  return 'empty';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' for a UTC calendar date. */
export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export interface CalendarCell {
  /** 'YYYY-MM-DD' */
  key: string;
  day: number;
  /** Falls outside the shown month (greyed, like the web's opacity-40). */
  outside: boolean;
}

/**
 * Monday-start month grid, always whole weeks (35 or 42 cells) — the web's
 * `startOfWeek(startOfMonth) … endOfWeek(endOfMonth)` with weekStartsOn: 1.
 * `month` is 1-based.
 */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1, 12));
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  // getUTCDay: 0 = Sunday. Monday-start offset: Mon → 0 … Sun → 6.
  const lead = (first.getUTCDay() + 6) % 7;
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  const cells: CalendarCell[] = [];
  for (let i = 0; i < total; i += 1) {
    const d = new Date(Date.UTC(year, month - 1, 1 - lead + i, 12));
    cells.push({
      key: toDateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()),
      day: d.getUTCDate(),
      outside: d.getUTCMonth() !== month - 1,
    });
  }
  return cells;
}

/**
 * date → events, each event expanded across every day it spans (a 3-day Eid
 * shows on all three). Guarded to 60 days like the web, so a bad end date
 * cannot loop forever.
 */
export function eventsByDate<T extends Pick<SpecialEvent, 'eventDate' | 'eventEndDate'>>(events: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const event of events) {
    if (!event.eventDate) continue;
    const end = event.eventEndDate ?? event.eventDate;
    const cursor = new Date(`${event.eventDate}T12:00:00.000Z`);
    const last = new Date(`${end}T12:00:00.000Z`);
    let guard = 0;
    while (cursor <= last && guard < 60) {
      const key = cursor.toISOString().slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), event]);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      guard += 1;
    }
  }
  return map;
}

/** Shift a 1-based (year, month) by `delta` months. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1, 12));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** "MMMM yyyy" for a 1-based month. */
export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? ''} ${year}`;
}

/** "d MMMM yyyy" for 'YYYY-MM-DD' — the web's selected-day panel title. */
export function longDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  return `${d} ${MONTH_NAMES[m - 1] ?? ''} ${y}`;
}

export interface TimelineGroup<T> {
  /** 'YYYY-MM', or null for the undated bucket. */
  monthKey: string | null;
  label: string;
  events: T[];
}

/**
 * Web EventTimeline: date-ordered, grouped by month, events with no resolved
 * date in their own "Date not yet resolved" bucket at the end.
 */
export function groupTimeline<T extends Pick<SpecialEvent, 'eventDate'>>(events: readonly T[]): TimelineGroup<T>[] {
  const byMonth = new Map<string, T[]>();
  const undated: T[] = [];
  const sorted = [...events].sort((a, b) => (a.eventDate ?? '9999').localeCompare(b.eventDate ?? '9999'));
  for (const event of sorted) {
    if (!event.eventDate) {
      undated.push(event);
      continue;
    }
    const key = event.eventDate.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), event]);
  }
  const groups: TimelineGroup<T>[] = [...byMonth.entries()].map(([key, list]) => {
    const [y, m] = key.split('-').map(Number);
    return { monthKey: key, label: monthLabel(y ?? 0, m ?? 1), events: list };
  });
  if (undated.length > 0) groups.push({ monthKey: null, label: 'Date not yet resolved', events: undated });
  return groups;
}

/** Case-insensitive match on the columns the web DataTable's global filter reaches. */
export function matchesEventSearch(event: SpecialEvent, term: string, categoryLabel: string, priorityLabel: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return [event.name, event.eventNumber, event.eventDate, event.demandDueDate, event.status, categoryLabel, priorityLabel]
    .filter((v): v is string => typeof v === 'string')
    .some((v) => v.toLowerCase().includes(t));
}

let hijriFormatter: Intl.DateTimeFormat | null | undefined;

function getHijriFormatter(): Intl.DateTimeFormat | null {
  if (hijriFormatter !== undefined) return hijriFormatter;
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
    hijriFormatter = typeof fmt.formatToParts === 'function' ? fmt : null;
  } catch {
    hijriFormatter = null;
  }
  return hijriFormatter;
}

/**
 * "1 Shawwal 1447 AH" for a Gregorian 'YYYY-MM-DD', DISPLAY ONLY — the web's
 * `formatHijriFor`. Event rows use the server's `hijriLabel`; this only labels
 * the calendar month header and a picked day. Returns null when the runtime's
 * Intl has no Umm al-Qura calendar (it then silently answers in Gregorian,
 * which the year sanity check catches) — the label is simply hidden.
 */
export function formatHijriFor(dateKey: string): string | null {
  const fmt = getHijriFormatter();
  if (!fmt) return null;
  try {
    const parts = fmt.formatToParts(new Date(`${dateKey}T12:00:00.000Z`));
    let year = 0;
    let month = 0;
    let day = 0;
    for (const part of parts) {
      if (part.type === 'year') year = Number.parseInt(part.value, 10);
      else if (part.type === 'month') month = Number.parseInt(part.value, 10);
      else if (part.type === 'day') day = Number.parseInt(part.value, 10);
    }
    if (year < 1300 || year > 1700 || month < 1 || month > 12 || day < 1 || day > 30) return null;
    return `${day} ${HIJRI_MONTHS[month - 1]} ${year} AH`;
  } catch {
    return null;
  }
}
