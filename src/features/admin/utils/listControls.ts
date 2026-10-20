/**
 * The web Data Engine's list controls, as pure rules the Super Admin lists
 * share: one sort key at a time (a table header's arrow), and the row of
 * active-filter chips with its Clear button (`ActiveFilters.tsx`).
 *
 * React-free so it can be unit-tested; the components that draw these live
 * in `../components/SortControl.tsx` and `../components/ActiveFilterChips.tsx`.
 */

export type SortDir = 'asc' | 'desc';

/** One sort, as the web's `SortState` — `null` means the server's (or the page's) own order. */
export interface SortState {
  key: string;
  dir: SortDir;
}

/**
 * What a column holds, for the words on the direction buttons: text reads
 * A–Z / Z–A, a figure Low → high / High → low, a date Oldest / Newest first.
 */
export type SortKind = 'text' | 'number' | 'date';

export interface SortField<T = unknown> {
  /** The web column's sort key — sent to the server as-is for a server-sorted list. */
  key: string;
  /** The web column header. */
  label: string;
  kind?: SortKind;
  /** The value a client-side sort compares. Not needed for a server-sorted list. */
  value?: (row: T) => string | number | boolean | null | undefined;
}

const DIR_WORDS: Record<SortKind, Record<SortDir, string>> = {
  text: { asc: 'A–Z', desc: 'Z–A' },
  number: { asc: 'Low → high', desc: 'High → low' },
  date: { asc: 'Oldest first', desc: 'Newest first' },
};

/** "A–Z", "High → low", "Newest first"… */
export function sortDirLabel(kind: SortKind | undefined, dir: SortDir): string {
  return DIR_WORDS[kind ?? 'text'][dir];
}

/** The direction a field starts in when picked: figures and dates biggest / newest first, text A–Z. */
export function defaultSortDir(kind: SortKind | undefined): SortDir {
  return kind === 'number' || kind === 'date' ? 'desc' : 'asc';
}

/** "Date · Newest first", or the fallback (the default order's name) when nothing is picked. */
export function sortSummary(sort: SortState | null, fields: readonly SortField<never>[], fallback: string): string {
  if (!sort) return fallback;
  const field = fields.find((f) => f.key === sort.key);
  if (!field) return fallback;
  return `${field.label} · ${sortDirLabel(field.kind, sort.dir)}`;
}

/** The Data Engine's `sort=key:dir`, or nothing for the default order. */
export function toSortParam(sort: SortState | null): string | undefined {
  return sort ? `${sort.key}:${sort.dir}` : undefined;
}

/** `sortBy` / `sortDir` for the endpoints that take the pair (login history, attempts, packing usage, price history). */
export function toSortPair<K extends string = string>(sort: SortState | null): { sortBy?: K; sortDir?: SortDir } {
  return sort ? { sortBy: sort.key as K, sortDir: sort.dir } : {};
}

/** Reads `key:dir` back; anything malformed is the default order. */
export function parseSortParam(param: string | null | undefined): SortState | null {
  const m = /^([A-Za-z][A-Za-z0-9]*):(asc|desc)$/.exec(param ?? '');
  return m ? { key: m[1], dir: m[2] as SortDir } : null;
}

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v));
}

/**
 * Sorts a copy of `rows` the way the web table sorts in the browser: one key,
 * numbers as numbers, text case-insensitively with digits read as numbers
 * (so "Item 10" follows "Item 9"). Blank values always go last, whichever
 * way the sort runs, and ties keep their original order.
 */
export function sortRows<T>(rows: readonly T[], sort: SortState | null, fields: readonly SortField<T>[]): T[] {
  if (!sort) return [...rows];
  const field = fields.find((f) => f.key === sort.key);
  const pick = field?.value;
  if (!pick) return [...rows];
  const sign = sort.dir === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, v: pick(row) }))
    .sort((a, b) => {
      const ab = isBlank(a.v);
      const bb = isBlank(b.v);
      if (ab || bb) return ab === bb ? a.index - b.index : ab ? 1 : -1;
      let cmp: number;
      if (typeof a.v === 'number' && typeof b.v === 'number') cmp = a.v - b.v;
      else if (typeof a.v === 'boolean' && typeof b.v === 'boolean') cmp = Number(a.v) - Number(b.v);
      else cmp = String(a.v).localeCompare(String(b.v), 'en', { numeric: true, sensitivity: 'base' });
      return cmp === 0 ? a.index - b.index : cmp * sign;
    })
    .map((x) => x.row);
}

// ─── Active-filter chips ─────────────────────────────────────────────────────

/** One chip: what the filter is ("Status: Delivered") and how to take it off. */
export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/** `Status: Delivered` — the web's wording for an equals filter. */
export function chipLabel(name: string, value: string): string {
  return `${name}: ${value}`;
}

/** `Search: “cake”` — the web shows the search box's text as a chip of its own. */
export function searchChipLabel(search: string): string {
  return `Search: “${search.trim()}”`;
}

/**
 * The web's chips for a range filter, one per side, worded as its
 * `ActiveFilters` words them: "Orders from 5", "Orders to 10". Sides left
 * blank give no chip.
 */
export function rangeSideChips(
  key: string,
  name: string,
  range: { from?: string | null; to?: string | null },
  remove: { from: () => void; to: () => void },
  format: (v: string) => string = (v) => v,
): FilterChip[] {
  const out: FilterChip[] = [];
  const from = range.from?.trim();
  const to = range.to?.trim();
  if (from) out.push({ key: `${key}.gte`, label: `${name} from ${format(from)}`, onRemove: remove.from });
  if (to) out.push({ key: `${key}.lte`, label: `${name} to ${format(to)}`, onRemove: remove.to });
  return out;
}

/**
 * One chip for a picked date window ("Date: 01 Oct 2026 – 07 Oct 2026") —
 * the web's `between` wording, for a mobile filter whose two ends are picked
 * together in one sheet. A one-day window reads as that day alone.
 */
export function rangeChipLabel(name: string, from: string, to: string, format: (v: string) => string = (v) => v): string {
  return from === to ? chipLabel(name, format(from)) : `${name}: ${format(from)} – ${format(to)}`;
}

/**
 * Builds the chip list from optional entries, dropping the inactive ones —
 * so a screen can write every filter in one array and pass `false` for
 * those on their default.
 */
export function activeChips(entries: readonly (FilterChip | FilterChip[] | false | null | undefined)[]): FilterChip[] {
  return entries.flatMap((e) => (!e ? [] : Array.isArray(e) ? e : [e]));
}

/** The web shows its Clear button beside the chips once there are two or more of them to clear. */
export function showClearAll(chipCount: number): boolean {
  return chipCount > 1;
}
