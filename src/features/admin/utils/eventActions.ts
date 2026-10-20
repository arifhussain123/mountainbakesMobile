import type {
  AdminSpecialEvent,
  EventBranchDemand,
  EventCalendarSystem,
  EventCategory,
  EventDispatchResult,
  EventPriority,
  EventScheduleResult,
  EventStatus,
  SpecialEventInput,
} from '@/api';
import { toHijriParts } from '../screens/SpecialEvents/eventModel';

/**
 * Pure rules behind Super Admin's Special Events actions — the web's
 * `EventFormDialog` (CreateSpecialEventSchema + its anchor check), the event
 * page's Admin Controls, `BranchDemandPanel`'s review buttons,
 * `ProductionReadinessPanel`'s stage editor and `EventNotificationSchedule`'s
 * Rebuild / Send buttons, reproduced exactly. Every check here is courtesy:
 * the API re-validates each body with the same zod schemas.
 */

export const CALENDAR_SYSTEM_LABEL: Record<EventCalendarSystem, string> = {
  gregorian: 'Gregorian (fixed date)',
  hijri: 'Hijri (Islamic)',
  gregorian_nth_weekday: 'Nth weekday of a month',
  hijri_last_weekday: 'Last weekday of a Hijri month',
};
export const CALENDAR_SYSTEMS: readonly EventCalendarSystem[] = ['gregorian', 'hijri', 'gregorian_nth_weekday', 'hijri_last_weekday'];

/** 0 = Sunday, as the server's `weekday` column. */
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const NTH_LABELS = ['1st', '2nd', '3rd', '4th', '5th'] as const;

export const EVENT_STATUSES: readonly EventStatus[] = ['upcoming', 'active', 'completed', 'cancelled'];

/**
 * The form as typed. Number inputs are kept as text so a half-typed value is
 * not coerced; the three pickers (Hijri month, occurrence, weekday) hold numbers.
 * Fields for the OTHER calendar systems stay in state when the system is
 * switched, exactly as the web's react-hook-form keeps them.
 */
export interface EventFormValues {
  name: string;
  description: string;
  category: EventCategory;
  eventType: string;
  calendarSystem: EventCalendarSystem;
  eventYear: string;
  hijriMonth: number | null;
  hijriDay: string;
  gregorianMonth: string;
  gregorianDay: string;
  nthWeekday: number | null;
  weekday: number | null;
  anchorOffsetDays: string;
  isRecurring: boolean;
  /** 'YYYY-MM-DD' or '' for none. */
  confirmedDate: string;
  durationDays: string;
  demandLeadDays: string;
  reminderLeadDays: string;
  priority: EventPriority;
  appliesToAllBranches: boolean;
  branchIds: string[];
  /** No input for these; an edit carries the stored values through. */
  color?: string | null;
  notes?: string;
}

const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

/** The web form's defaults for a new event, or the event's own values for an edit. */
export function initialEventForm(event: AdminSpecialEvent | null, thisYear: number): EventFormValues {
  if (!event) {
    return {
      name: '',
      description: '',
      category: 'company',
      eventType: '',
      calendarSystem: 'gregorian',
      eventYear: String(thisYear),
      hijriMonth: null,
      hijriDay: '',
      gregorianMonth: '',
      gregorianDay: '',
      nthWeekday: null,
      weekday: null,
      anchorOffsetDays: '0',
      isRecurring: true,
      confirmedDate: '',
      durationDays: '1',
      demandLeadDays: '10',
      reminderLeadDays: '14',
      priority: 'normal',
      appliesToAllBranches: true,
      branchIds: [],
    };
  }
  return {
    name: event.name,
    description: event.description ?? '',
    category: event.category,
    eventType: event.eventType ?? '',
    calendarSystem: event.calendarSystem,
    eventYear: str(event.eventYear),
    hijriMonth: event.hijriMonth ?? null,
    hijriDay: str(event.hijriDay),
    gregorianMonth: str(event.gregorianMonth),
    gregorianDay: str(event.gregorianDay),
    nthWeekday: event.nthWeekday ?? null,
    weekday: event.weekday ?? null,
    anchorOffsetDays: str(event.anchorOffsetDays ?? 0),
    isRecurring: event.isRecurring,
    confirmedDate: event.confirmedDate ?? '',
    durationDays: str(event.durationDays ?? 1),
    demandLeadDays: str(event.demandLeadDays),
    reminderLeadDays: str(event.reminderLeadDays),
    priority: event.priority,
    appliesToAllBranches: event.appliesToAllBranches ?? true,
    branchIds: event.branchIds ?? [],
    color: event.color,
    notes: event.notes ?? '',
  };
}

/** A real calendar date in 'YYYY-MM-DD' — the web's `<input type="date">` can produce nothing else. */
export function isValidDateStr(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Whole number in [min, max], or null for blank / anything else. */
function wholeIn(raw: string, min: number, max: number): number | null {
  const t = raw.trim();
  if (t === '' || !/^-?\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= min && n <= max ? n : null;
}

type Parsed = { value: number | null } | { error: string };

/** A shown number field: blank → null (the anchor check names it), otherwise a whole number in range. */
function shownWhole(raw: string, min: number, max: number, label: string): Parsed {
  if (raw.trim() === '') return { value: null };
  const n = wholeIn(raw, min, max);
  return n === null ? { error: `${label} must be a whole number from ${min} to ${max}` } : { value: n };
}

/** A required number field (Year, Duration, the lead days). */
function requiredWhole(raw: string, min: number, max: number, label: string): { value: number } | { error: string } {
  const n = wholeIn(raw, min, max);
  return n === null ? { error: `${label} must be a whole number from ${min} to ${max}` } : { value: n };
}

/** Which anchor inputs each calendar system shows. */
function shownAnchors(system: EventCalendarSystem) {
  return {
    hijriMonth: system === 'hijri' || system === 'hijri_last_weekday',
    hijriDay: system === 'hijri',
    gregorianMonth: system === 'gregorian' || system === 'gregorian_nth_weekday',
    gregorianDay: system === 'gregorian',
    nthWeekday: system === 'gregorian_nth_weekday',
    weekday: system === 'gregorian_nth_weekday' || system === 'hijri_last_weekday',
    anchorOffsetDays: system === 'gregorian_nth_weekday',
  };
}

/**
 * The create / update body, or the first problem to show — the shared
 * `CreateSpecialEventSchema` field rules, then its `checkAnchor`: a one-off
 * (not recurring) event with a confirmed date needs no anchor; everything else
 * needs the anchor fields its calendar system resolves from.
 */
export function buildEventInput(v: EventFormValues): { input: SpecialEventInput } | { error: string } {
  const name = v.name.trim();
  if (name.length < 2) return { error: 'Event name is required' };
  if (name.length > 120) return { error: 'Event name can be at most 120 characters' };

  const year = requiredWhole(v.eventYear, 2000, 2200, 'Year');
  if ('error' in year) return year;

  const shown = shownAnchors(v.calendarSystem);
  const hijriDay = shown.hijriDay ? shownWhole(v.hijriDay, 1, 30, 'Hijri day') : { value: wholeIn(v.hijriDay, 1, 30) };
  if ('error' in hijriDay) return hijriDay;
  const gregorianMonth = shown.gregorianMonth ? shownWhole(v.gregorianMonth, 1, 12, 'Month') : { value: wholeIn(v.gregorianMonth, 1, 12) };
  if ('error' in gregorianMonth) return gregorianMonth;
  const gregorianDay = shown.gregorianDay ? shownWhole(v.gregorianDay, 1, 31, 'Day') : { value: wholeIn(v.gregorianDay, 1, 31) };
  if ('error' in gregorianDay) return gregorianDay;
  // Blank shift means no shift; hidden, it keeps whatever the event had.
  let anchorOffsetDays = 0;
  if (v.anchorOffsetDays.trim() !== '') {
    const offset = wholeIn(v.anchorOffsetDays, -30, 30);
    if (offset === null) {
      if (shown.anchorOffsetDays) return { error: 'Shift by (days) must be a whole number from -30 to 30' };
    } else {
      anchorOffsetDays = offset;
    }
  }

  const confirmed = v.confirmedDate.trim();
  if (confirmed !== '' && !isValidDateStr(confirmed)) return { error: 'Confirmed date must be a real date in YYYY-MM-DD format' };

  const duration = requiredWhole(v.durationDays, 1, 60, 'Duration (days)');
  if ('error' in duration) return duration;
  const reminder = requiredWhole(v.reminderLeadDays, 1, 120, 'First reminder (days before)');
  if ('error' in reminder) return reminder;
  const demandLead = requiredWhole(v.demandLeadDays, 0, 120, 'Demand due (days before)');
  if ('error' in demandLead) return demandLead;

  if (v.eventType.length > 60) return { error: 'Event type can be at most 60 characters' };
  if (v.description.length > 1000) return { error: 'Description can be at most 1000 characters' };

  const input: SpecialEventInput = {
    name,
    description: v.description,
    category: v.category,
    eventType: v.eventType,
    calendarSystem: v.calendarSystem,
    eventYear: year.value,
    hijriMonth: v.hijriMonth,
    hijriDay: hijriDay.value,
    gregorianMonth: gregorianMonth.value,
    gregorianDay: gregorianDay.value,
    nthWeekday: v.nthWeekday,
    weekday: v.weekday,
    anchorOffsetDays,
    isRecurring: v.isRecurring,
    confirmedDate: confirmed === '' ? null : confirmed,
    durationDays: duration.value,
    demandLeadDays: demandLead.value,
    reminderLeadDays: reminder.value,
    priority: v.priority,
    appliesToAllBranches: v.appliesToAllBranches,
    branchIds: v.branchIds,
  };
  if (v.color !== undefined) input.color = v.color;
  if (v.notes !== undefined) input.notes = v.notes;

  const anchorProblem = anchorError(input);
  return anchorProblem ? { error: anchorProblem } : { input };
}

/** The shared schema's `checkAnchor`, same messages, first one only. */
export function anchorError(
  v: Pick<SpecialEventInput, 'calendarSystem' | 'isRecurring' | 'confirmedDate' | 'hijriMonth' | 'hijriDay' | 'gregorianMonth' | 'gregorianDay' | 'nthWeekday' | 'weekday'>,
): string | null {
  if (v.isRecurring === false && v.confirmedDate) return null;
  const missing = (x: number | null | undefined) => x === null || x === undefined;
  switch (v.calendarSystem) {
    case 'hijri':
      if (missing(v.hijriMonth)) return 'Hijri month is required for a Hijri event';
      if (missing(v.hijriDay)) return 'Hijri day is required for a Hijri event';
      return null;
    case 'gregorian':
      if (missing(v.gregorianMonth)) return 'Month is required';
      if (missing(v.gregorianDay)) return 'Day is required';
      return null;
    case 'gregorian_nth_weekday':
      if (missing(v.gregorianMonth)) return 'Month is required';
      if (missing(v.nthWeekday)) return 'Which occurrence (1st–5th) is required';
      if (missing(v.weekday)) return 'Weekday is required';
      return null;
    case 'hijri_last_weekday':
      if (missing(v.hijriMonth)) return 'Hijri month is required';
      if (missing(v.weekday)) return 'Weekday is required';
      return null;
    default:
      return null;
  }
}

export function toggleBranchId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

// ─── Date preview (display only; the server resolves and stores the date) ───

type ToHijri = (dateKey: string) => { year: number; month: number; day: number } | null;

const DAY_MS = 86_400_000;
const HIJRI_EPOCH_UTC = Date.UTC(622, 6, 19, 12, 0, 0);
const MEAN_HIJRI_YEAR = 354.36707;
const MEAN_HIJRI_MONTH = 29.530589;

const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDaysToDateStr(dateStr: string, n: number): string {
  return isoOf(new Date(`${dateStr}T12:00:00.000Z`).getTime() + n * DAY_MS);
}

/** Web `nthWeekdayOf`: the nth <weekday> (0 = Sunday) of a month, or null when the month has no such occurrence. */
export function nthWeekdayOf(year: number, month: number, nth: number, weekday: number): string | null {
  if (month < 1 || month > 12 || nth < 1 || nth > 5 || weekday < 0 || weekday > 6) return null;
  const first = new Date(Date.UTC(year, month - 1, 1, 12));
  const dayOfMonth = 1 + ((weekday - first.getUTCDay() + 7) % 7) + (nth - 1) * 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  return dayOfMonth > daysInMonth ? null : isoOf(Date.UTC(year, month - 1, dayOfMonth, 12));
}

/** Web `fromHijri`: a seeded ±5-day search, exact by construction. */
function fromHijri(toHijri: ToHijri, year: number, month: number, day: number): string | null {
  const seedDays = Math.round((year - 1) * MEAN_HIJRI_YEAR + (month - 1) * MEAN_HIJRI_MONTH + (day - 1));
  const seed = HIJRI_EPOCH_UTC + seedDays * DAY_MS;
  for (let radius = 0; radius <= 5; radius += 1) {
    for (const offset of radius === 0 ? [0] : [radius, -radius]) {
      const candidate = isoOf(seed + offset * DAY_MS);
      const h = toHijri(candidate);
      if (h && h.year === year && h.month === month && h.day === day) return candidate;
    }
  }
  return null;
}

/** The Hijri years overlapping a Gregorian year, or null when the device cannot convert. */
function hijriYearsIn(toHijri: ToHijri, gregorianYear: number): number[] | null {
  const a = toHijri(`${gregorianYear}-01-01`);
  const b = toHijri(`${gregorianYear}-12-31`);
  if (!a || !b) return null;
  const years: number[] = [];
  for (let y = a.year; y <= b.year; y += 1) years.push(y);
  return years;
}

function lastWeekdayOfHijriMonth(toHijri: ToHijri, hijriYear: number, hijriMonth: number, weekday: number): string | null {
  const lastDay = fromHijri(toHijri, hijriYear, hijriMonth, 30) ?? fromHijri(toHijri, hijriYear, hijriMonth, 29);
  if (!lastDay) return null;
  const d = new Date(`${lastDay}T12:00:00.000Z`);
  return addDaysToDateStr(lastDay, -((d.getUTCDay() - weekday + 7) % 7));
}

export interface DatePreview {
  /** 'YYYY-MM-DD', or null when the fields do not resolve yet. */
  date: string | null;
  /** True when a Hijri date was asked for but this device's Intl has no Umm al-Qura calendar. */
  deviceCannotResolve: boolean;
}

/**
 * The web form's live "estimated date" preview — offset applied only for the
 * nth-weekday system, as the web preview does. A preview only: on an old
 * runtime the Hijri arithmetic can be off, so the server is the authority.
 */
export function eventDatePreview(v: EventFormValues, toHijri: ToHijri = toHijriParts): DatePreview {
  const year = wholeIn(v.eventYear, 2000, 2200);
  const none = { date: null, deviceCannotResolve: false };
  if (year === null) return none;
  const hijriDay = wholeIn(v.hijriDay, 1, 30);
  const gMonth = wholeIn(v.gregorianMonth, 1, 12);
  const gDay = wholeIn(v.gregorianDay, 1, 31);
  switch (v.calendarSystem) {
    case 'gregorian': {
      if (gMonth === null || gDay === null) return none;
      const candidate = `${year}-${String(gMonth).padStart(2, '0')}-${String(gDay).padStart(2, '0')}`;
      return { date: isValidDateStr(candidate) ? candidate : null, deviceCannotResolve: false };
    }
    case 'gregorian_nth_weekday': {
      if (gMonth === null || v.nthWeekday === null || v.weekday === null) return none;
      const base = nthWeekdayOf(year, gMonth, v.nthWeekday, v.weekday);
      const offset = wholeIn(v.anchorOffsetDays, -30, 30) ?? 0;
      return { date: base && offset ? addDaysToDateStr(base, offset) : base, deviceCannotResolve: false };
    }
    case 'hijri':
    case 'hijri_last_weekday': {
      if (v.hijriMonth === null) return none;
      if (v.calendarSystem === 'hijri' && hijriDay === null) return none;
      if (v.calendarSystem === 'hijri_last_weekday' && v.weekday === null) return none;
      const hijriYears = hijriYearsIn(toHijri, year);
      if (!hijriYears) return { date: null, deviceCannotResolve: true };
      for (const hy of hijriYears) {
        const resolved =
          v.calendarSystem === 'hijri'
            ? fromHijri(toHijri, hy, v.hijriMonth, hijriDay!)
            : lastWeekdayOfHijriMonth(toHijri, hy, v.hijriMonth, v.weekday!);
        if (resolved && Number(resolved.slice(0, 4)) === year) return { date: resolved, deviceCannotResolve: false };
      }
      return none;
    }
    default:
      return none;
  }
}

/** The web's warning case: a complete Hijri month/day that does not fall in the chosen year. */
export function hijriSkipsYear(v: EventFormValues, preview: DatePreview): boolean {
  return (
    v.calendarSystem === 'hijri' &&
    v.confirmedDate.trim() === '' &&
    !preview.date &&
    !preview.deviceCannotResolve &&
    v.hijriMonth !== null &&
    wholeIn(v.hijriDay, 1, 30) !== null
  );
}

// ─── Event page: Admin Controls ─────────────────────────────────────────────

/** Confirm is enabled once a date is entered; the date must be real (the web's date input guarantees it). */
export function confirmDateProblem(raw: string): string | null {
  const t = raw.trim();
  if (t === '') return 'Enter the confirmed date';
  return isValidDateStr(t) ? null : 'Enter the date as YYYY-MM-DD';
}

/** "Clear confirmation" shows only while a confirmed date is in use. */
export function canClearConfirmation(event: Pick<AdminSpecialEvent, 'dateIsEstimated'>): boolean {
  return !event.dateIsEstimated;
}

export function confirmDateMessage(date: string | null): string {
  return date ? 'Date confirmed — reminders rescheduled' : 'Confirmation cleared — the estimate is in use again';
}

export function statusChangeMessage(status: EventStatus): string {
  return status === 'cancelled' ? 'Event cancelled — pending reminders stopped' : 'Status updated';
}

export function deleteEventPrompt(name: string): string {
  return `Remove "${name}" from the events calendar? Pending reminders will be cancelled.`;
}

// ─── Branch demands, readiness, reminders ───────────────────────────────────

/** Approve / Reject show only on a submitted demand. */
export function canReviewDemand(demand: Pick<EventBranchDemand, 'status'>): boolean {
  return demand.status === 'submitted';
}

export const STAGE_PRESETS = [0, 25, 50, 75, 100] as const;

/** The web's number input: clamped to 0–100, non-numbers to 0. */
export function clampStagePercent(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
}

/** Save is enabled only once the percentage or the remarks differ from the server's. */
export function stageDirty(stage: { completionPercentage: number; remarks: string | null }, percentage: number, remarks: string): boolean {
  return percentage !== stage.completionPercentage || remarks !== (stage.remarks ?? '');
}

/** "Send due reminders now" outcome — `info` for nothing-sent, `success` otherwise. */
export function dispatchResultMessage(r: EventDispatchResult): { tone: 'info' | 'success'; text: string } {
  if (r.skipped) return { tone: 'info', text: r.skipped };
  if (r.dispatched === 0) return { tone: 'info', text: 'No reminders are due today.' };
  return {
    tone: 'success',
    text: `${r.sent} reminder(s) sent · ${r.messagesSent} message(s) delivered${r.failed > 0 ? ` · ${r.failed} failed` : ''}`,
  };
}

export function scheduleRebuiltMessage(r: EventScheduleResult): string {
  return `Schedule rebuilt — ${r.created} added, ${r.updated} moved, ${r.removed} cancelled.`;
}
