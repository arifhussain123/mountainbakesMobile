import { businessDateStr } from '@/shared/utils/timezone';
import { shiftBusinessDate } from '@/common/helpers/businessDay';

/**
 * The calendar periods Sales vs Expenses compares, and the buckets it draws
 * them in.
 *
 * ---------------------------------------------------------------------------
 * Calendar, not trailing
 * ---------------------------------------------------------------------------
 * "Last 30 business days" is easy to compute and nobody talks that way. A branch
 * manager asks how *this month* is going, and the answer has to be a month —
 * which is also what makes "was 24%" mean anything, because the thing it is
 * being compared to is the same shape.
 *
 * This mirrors the server's own vocabulary (`businessRange` in `@mb/shared`
 * takes `weekly` / `monthly` and is calendar-aligned), so the export can send a
 * named period rather than a custom span and the file is named for something a
 * person recognises.
 *
 * ---------------------------------------------------------------------------
 * A period you are inside has buckets that have not happened
 * ---------------------------------------------------------------------------
 * On the 8th of November, a quarter has October and November in it and December
 * still to come. December is **not zero** — and drawing it as zero, or averaging
 * over it, makes an ordinary quarter read as a collapse in trade. Every bucket
 * therefore knows whether it has started, and both the chart and the totals are
 * built from that flag rather than from the raw list.
 *
 * All dates here are **business dates** (`YYYY-MM-DD`, the day rolling at 02:00
 * Asia/Karachi), never instants. The bucket boundaries are calendar facts; the
 * conversion to the ISO instants the API wants happens at the call site, once.
 */

export type ComparisonRangeKey = 'week' | 'month' | 'quarter';

export interface PeriodBucket {
  /** The axis label — `Mon`, `1–7`, `Oct`. */
  label: string;
  /** Inclusive business dates this bucket covers. */
  from: string;
  to: string;
  /** Nothing in it has happened yet. Excluded from every total and average. */
  future: boolean;
  /** Today falls inside it — the one the reader is living through. */
  current: boolean;
}

export interface Period {
  key: ComparisonRangeKey;
  /** Inclusive business dates for the whole period, future included. */
  from: string;
  to: string;
  buckets: PeriodBucket[];
  /**
   * Business days from the period's first day up to and including today,
   * capped at the period's length.
   *
   * This is what bounds the comparison. Comparing eight days of November
   * against the whole of October is how a screen reports a 70% collapse on the
   * 8th of every month.
   */
  elapsedDays: number;
  /** How long the period runs in total. */
  totalDays: number;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function parts(date: string): [number, number, number] {
  return date.split('-').map(Number) as [number, number, number];
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Days in a month, via the zeroth day of the next one. */
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Inclusive day count between two business dates. */
export function daysBetween(from: string, to: string): number {
  const [ay, am, ad] = parts(from);
  const [by, bm, bd] = parts(to);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Monday of the week containing `date`, ISO-8601 style (weeks start Monday). */
function mondayOf(date: string): string {
  const [y, m, d] = parts(date);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return shiftBusinessDate(date, -((dow + 6) % 7));
}

/**
 * The current week, month or quarter as of `today`.
 *
 * `today` is a business date rather than a `Date` on purpose: the day rolls at
 * 02:00, so 01:30 on the 1st of the month still belongs to the previous month's
 * period, and taking a clock reading here would put it in the new one.
 */
export function periodFor(
  key: ComparisonRangeKey,
  today: string = businessDateStr(),
): Period {
  const [y, m] = parts(today);

  if (key === 'week') {
    const from = mondayOf(today);
    const to = shiftBusinessDate(from, 6);
    const buckets = WEEKDAYS.map((label, i) => {
      const day = shiftBusinessDate(from, i);
      return bucket(label, day, day, today);
    });
    return assemble(key, from, to, buckets, today);
  }

  if (key === 'month') {
    const last = daysInMonth(y, m);
    const from = iso(y, m, 1);
    const to = iso(y, m, last);
    const buckets: PeriodBucket[] = [];
    // Seven-day slices from the 1st, so the labels are day spans a person can
    // find on a wall calendar. The final slice is short in every month.
    for (let start = 1; start <= last; start += 7) {
      const end = Math.min(start + 6, last);
      buckets.push(bucket(`${start}–${end}`, iso(y, m, start), iso(y, m, end), today));
    }
    return assemble(key, from, to, buckets, today);
  }

  // quarter — three calendar months, bucketed by month
  const firstMonth = Math.floor((m - 1) / 3) * 3 + 1;
  const from = iso(y, firstMonth, 1);
  const to = iso(y, firstMonth + 2, daysInMonth(y, firstMonth + 2));
  const buckets = [0, 1, 2].map(offset => {
    const month = firstMonth + offset;
    return bucket(
      MONTHS[month - 1] ?? String(month),
      iso(y, month, 1),
      iso(y, month, daysInMonth(y, month)),
      today,
    );
  });
  return assemble(key, from, to, buckets, today);
}

function bucket(label: string, from: string, to: string, today: string): PeriodBucket {
  return {
    label,
    from,
    to,
    // Future means "has not started". A bucket containing today is half-lived
    // and its figures are real, so it counts — it is marked `current` instead,
    // which is what the chart emphasises.
    future: from > today,
    current: from <= today && today <= to,
  };
}

function assemble(
  key: ComparisonRangeKey,
  from: string,
  to: string,
  buckets: PeriodBucket[],
  today: string,
): Period {
  const totalDays = daysBetween(from, to);
  const elapsedDays =
    today < from ? 0 : Math.min(totalDays, daysBetween(from, today > to ? to : today));
  return { key, from, to, buckets, elapsedDays, totalDays };
}

/**
 * The same period, one back — and **truncated to the same number of days**.
 *
 * The truncation is the point. On the 8th of November, the honest comparison is
 * the 1st to the 8th of October, not the whole of it: measuring eight days
 * against thirty-one reports a collapse that is the calendar, every month, on
 * exactly the screen a manager checks to see whether something is wrong.
 *
 * Ratios (margin, expense per rupee) would survive an untruncated comparison and
 * totals would not, so both are taken from the same truncated window rather than
 * two — one range means the two figures on a card cannot be describing different
 * spans.
 */
export function previousPeriodFor(
  key: ComparisonRangeKey,
  today: string = businessDateStr(),
): { from: string; to: string } {
  const current = periodFor(key, today);
  const [y, m] = parts(current.from);

  const from =
    key === 'week'
      ? shiftBusinessDate(current.from, -7)
      : key === 'month'
        ? previousMonthFirst(y, m)
        : previousQuarterFirst(y, m);

  const end = previousEnd(key, from);
  // Same elapsed span, clamped to the previous period's own length — February
  // is shorter than January and cannot lend days it does not have.
  const span = Math.max(1, Math.min(current.elapsedDays, daysBetween(from, end)));
  return { from, to: shiftBusinessDate(from, span - 1) };
}

function previousMonthFirst(y: number, m: number): string {
  return m === 1 ? iso(y - 1, 12, 1) : iso(y, m - 1, 1);
}

function previousQuarterFirst(y: number, m: number): string {
  return m === 1 ? iso(y - 1, 10, 1) : iso(y, m - 3, 1);
}

function previousEnd(key: ComparisonRangeKey, from: string): string {
  const [y, m] = parts(from);
  if (key === 'week') return shiftBusinessDate(from, 6);
  if (key === 'month') return iso(y, m, daysInMonth(y, m));
  return iso(y, m + 2, daysInMonth(y, m + 2));
}

/**
 * How a period reads on screen.
 *
 * Kept here with the maths rather than in the screen, because every one of these
 * strings is a claim about the numbers beside it — "the same 5 days last month"
 * is only true because `previousPeriodFor` truncates, and a caption that drifted
 * from that would be a lie nobody would catch.
 */
export interface PeriodWording {
  /** The header's subtitle — `November so far`, `Oct–Dec so far`. */
  title: string;
  /** What one bucket is, singular: `day`, `week`, `month`. */
  bucketNoun: string;
  /** What a change is measured against: `vs the same 5 days last month`. */
  comparisonLabel: string;
}

const NOUNS: Record<ComparisonRangeKey, string> = {
  week: 'day',
  month: 'week',
  quarter: 'month',
};

const PREVIOUS: Record<ComparisonRangeKey, string> = {
  week: 'last week',
  month: 'last month',
  quarter: 'last quarter',
};

export function describePeriod(period: Period): PeriodWording {
  const [y, m] = parts(period.from);
  const [, endMonth] = parts(period.to);
  const complete = period.elapsedDays >= period.totalDays;

  const span =
    period.key === 'week'
      ? `Week of ${Number(parts(period.from)[2])} ${MONTHS[m - 1]}`
      : period.key === 'month'
        ? `${MONTHS[m - 1]} ${y}`
        : `${MONTHS[m - 1]}–${MONTHS[endMonth - 1]} ${y}`;

  return {
    title: complete ? span : `${span} so far`,
    bucketNoun: NOUNS[period.key],
    // Once the period is over the windows are the same length, so naming the
    // day count would be noise. Before that it is the whole point: the reader
    // is being shown five days against five, not five against thirty-one.
    comparisonLabel: complete
      ? `vs ${PREVIOUS[period.key]}`
      : `vs the same ${period.elapsedDays} ${period.elapsedDays === 1 ? 'day' : 'days'} ${PREVIOUS[period.key]}`,
  };
}
