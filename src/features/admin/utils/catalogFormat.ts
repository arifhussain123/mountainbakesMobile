import { formatDisplayDate } from '@/shared/utils';

const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, no DST

/** The web's `karachiDateStr` of a timestamp, shown as "12 Oct 2026"; "—" when missing. */
export function karachiDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  return formatDisplayDate(new Date(t + KARACHI_OFFSET_MS).toISOString().slice(0, 10));
}

/** The web tables' compact money, "Rs.1,250" (no space); a missing value is "—". */
export function formatRsCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return '—';
  return `Rs.${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** Same as the shared `formatDistanceKm`: metres under a kilometre, otherwise "x.x KM". */
export function formatDistanceKm(km: number | null | undefined): string {
  if (typeof km !== 'number' || !Number.isFinite(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${(Math.round(km * 10) / 10).toFixed(1)} KM`;
}

function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function isUsablePct(value: unknown): value is number {
  const n = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(n) && n >= 0 && n <= 100;
}

export interface ShareSplit {
  companySharePct: number;
  branchSharePct: number;
  /** `false` = the branch follows the global split (the web's "Default" badge). */
  isOverride: boolean;
}

/** The shared `resolveShareSplit`: a branch's own company % if set, else the global one; branch = 100 − company. */
export function resolveShareSplit(branchCompanySharePct: number | null | undefined, defaultCompanySharePct: number): ShareSplit {
  const isOverride = isUsablePct(branchCompanySharePct);
  const fallback = isUsablePct(defaultCompanySharePct) ? Number(defaultCompanySharePct) : 0;
  const companySharePct = round2(isOverride ? Number(branchCompanySharePct) : fallback);
  return { companySharePct, branchSharePct: round2(100 - companySharePct), isOverride };
}

/** "https://www.google.com/maps/search/?api=1&query=lat,lng" — the web's "View on Google Maps" link. */
export function googleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
