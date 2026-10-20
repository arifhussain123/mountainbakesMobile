import type { AdminBranch, AdminBranchInput, BranchLocationRow, UpsertBranchLocationInput } from '@/api';
import { formatDistanceKm, resolveShareSplit, type ShareSplit } from './catalogFormat';

/**
 * Pure rules behind Super Admin's Branches and Branch Locations actions — the
 * web's `BranchesPage` form (CreateBranchSchema + the company-share box) and
 * `LocationPickerDialog`, reproduced exactly. Every check here is courtesy:
 * the API re-validates each body with the same zod schemas.
 */

// ── Branches ────────────────────────────────────────────────────────────────

/** The form as typed. Numbers stay strings so "blank" is expressible. */
export interface BranchFormValues {
  name: string;
  location: string;
  phone: string;
  address: string;
  city: string;
  dailyBudget: string;
  weeklyBudget: string;
  monthlyBudget: string;
  /** Blank = follow the global split in Finance Settings (stored as `null`, not 0). */
  companySharePct: string;
}

export type BranchTextField = 'name' | 'location' | 'phone' | 'address' | 'city';
export type BranchBudgetField = 'dailyBudget' | 'weeklyBudget' | 'monthlyBudget';
export type BranchFormErrors = Partial<Record<BranchTextField | BranchBudgetField, string>>;

/** The web's field order and labels (it capitalises the field name). */
export const BRANCH_TEXT_FIELDS: readonly { field: BranchTextField; label: string; placeholder?: string }[] = [
  { field: 'name', label: 'Name', placeholder: 'Mountain Bakes DHA' },
  { field: 'location', label: 'Location' },
  { field: 'phone', label: 'Phone' },
  { field: 'address', label: 'Address' },
  { field: 'city', label: 'City' },
];

export const BRANCH_BUDGET_FIELDS: readonly { field: BranchBudgetField; label: string }[] = [
  { field: 'dailyBudget', label: 'Daily Budget' },
  { field: 'weeklyBudget', label: 'Weekly Budget' },
  { field: 'monthlyBudget', label: 'Monthly Budget' },
];

/** Add Branch starts from the web form's defaults — city Karachi, budgets 0. */
export function emptyBranchForm(): BranchFormValues {
  return {
    name: '',
    location: '',
    phone: '',
    address: '',
    city: 'Karachi',
    dailyBudget: '',
    weeklyBudget: '',
    monthlyBudget: '',
    companySharePct: '',
  };
}

/** Edit Branch is seeded from the row; a branch on the default split starts with a blank share. */
export function branchFormFromBranch(b: AdminBranch): BranchFormValues {
  return {
    name: b.name ?? '',
    location: b.location ?? '',
    phone: b.phone ?? '',
    address: b.address ?? '',
    city: b.city ?? '',
    dailyBudget: String(b.dailyBudget ?? 0),
    weeklyBudget: String(b.weeklyBudget ?? 0),
    monthlyBudget: String(b.monthlyBudget ?? 0),
    companySharePct: b.companySharePct == null ? '' : String(b.companySharePct),
  };
}

/** CreateBranchSchema's minimums and messages. Like the web, values are not trimmed. */
const TEXT_RULES: Record<BranchTextField, { min: number; message: string }> = {
  name: { min: 2, message: 'Branch name is required' },
  location: { min: 2, message: 'Location is required' },
  phone: { min: 10, message: 'Invalid phone number' },
  address: { min: 5, message: 'Address is required' },
  city: { min: 2, message: 'City is required' },
};

/** A budget box: blank is 0 (the web's `setValueAs`), otherwise a number ≥ 0. */
function budgetOf(raw: string): number {
  return raw.trim() === '' ? 0 : Number(raw);
}

export const SHARE_PCT_ERROR = 'Company share must be a number between 0 and 100, or blank to use the global split';

/** The live preview of what the form would store: blank or unparseable resolves to the global split. */
export function formShareSplit(raw: string, defaultCompanyPct: number): ShareSplit {
  return resolveShareSplit(raw.trim() === '' ? null : Number(raw), defaultCompanyPct);
}

/**
 * The POST / PUT body (the web sends the whole form on both), field errors
 * shown under the boxes, or the share problem the web shows as a toast after
 * the fields pass.
 */
export function branchPayload(
  v: BranchFormValues,
): { input: AdminBranchInput } | { fieldErrors: BranchFormErrors } | { error: string } {
  const fieldErrors: BranchFormErrors = {};
  for (const { field } of BRANCH_TEXT_FIELDS) {
    if (v[field].length < TEXT_RULES[field].min) fieldErrors[field] = TEXT_RULES[field].message;
  }
  for (const { field, label } of BRANCH_BUDGET_FIELDS) {
    const n = budgetOf(v[field]);
    if (!Number.isFinite(n) || n < 0) fieldErrors[field] = `${label} must be 0 or more`;
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const share = v.companySharePct.trim();
  let companySharePct: number | null = null;
  if (share !== '') {
    const n = Number(share);
    if (!Number.isFinite(n) || n < 0 || n > 100) return { error: SHARE_PCT_ERROR };
    companySharePct = n;
  }

  return {
    input: {
      name: v.name,
      location: v.location,
      phone: v.phone,
      address: v.address,
      city: v.city,
      dailyBudget: budgetOf(v.dailyBudget),
      weeklyBudget: budgetOf(v.weeklyBudget),
      monthlyBudget: budgetOf(v.monthlyBudget),
      // null, not omitted: an explicit null is what CLEARS an existing override on the server.
      companySharePct,
    },
  };
}

// ── Branch Locations ────────────────────────────────────────────────────────

/** The shared `DEFAULT_GEOFENCE_RADIUS_KM`. */
export const DEFAULT_GEOFENCE_RADIUS_KM = 50;

/** The web's radius presets. Any value 0–500 is accepted; these are shortcuts. */
export const RADIUS_PRESETS: readonly number[] = [5, 10, 25, 50, 100];

export interface LocationFormValues {
  latitude: string;
  longitude: string;
  address: string;
  radiusKm: string;
  /** Kept from the stored location — only the web's Places search sets a new one. */
  googlePlaceId: string | null;
}

/** Seeded like the web dialog: the stored point, else blank with the branch address and the default radius. */
export function initialLocationForm(row: BranchLocationRow): LocationFormValues {
  const loc = row.location;
  return {
    latitude: loc ? String(loc.latitude) : '',
    longitude: loc ? String(loc.longitude) : '',
    address: loc?.address ?? row.branchAddress ?? '',
    radiusKm: String(loc?.radiusKm ?? DEFAULT_GEOFENCE_RADIUS_KM),
    googlePlaceId: loc?.googlePlaceId ?? null,
  };
}

/** The radius box accepts digits and a point only, as on the web. */
export function sanitizeRadius(text: string): string {
  return text.replace(/[^\d.]/g, '');
}

/** Which preset the radius matches, or 'custom'. */
export function radiusPresetValue(radiusKm: string): string {
  const n = Number(radiusKm);
  return RADIUS_PRESETS.includes(n) ? String(n) : 'custom';
}

/** A device fix, written into the boxes with seven decimals — the web's `placePin`. */
export function formatCoordinate(n: number): string {
  return n.toFixed(7);
}

function hasPoint(v: LocationFormValues): boolean {
  return v.latitude !== '' && v.longitude !== '' && Number.isFinite(Number(v.latitude)) && Number.isFinite(Number(v.longitude));
}

/** The web's `canSave`: a point within WGS84 bounds, an address of 3+ characters, a radius in (0, 500]. */
export function canSaveLocation(v: LocationFormValues): boolean {
  const lat = Number(v.latitude);
  const lng = Number(v.longitude);
  const radius = Number(v.radiusKm);
  return (
    hasPoint(v) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    v.address.trim().length >= 3 &&
    Number.isFinite(radius) &&
    radius > 0 &&
    radius <= 500
  );
}

/** The web dialog's footer line. */
export function locationSummary(v: LocationFormValues): string {
  return hasPoint(v) ? `Sales allowed within ${formatDistanceKm(Number(v.radiusKm))} of this point.` : 'No location selected yet.';
}

/** The PUT body, or null while Save would be disabled on the web. */
export function locationPayload(v: LocationFormValues): UpsertBranchLocationInput | null {
  if (!canSaveLocation(v)) return null;
  return {
    latitude: Number(v.latitude),
    longitude: Number(v.longitude),
    address: v.address.trim(),
    radiusKm: Number(v.radiusKm),
    googlePlaceId: v.googlePlaceId,
  };
}

/** Enable / Disable flips the geofence's own state; the web's toast wording. */
export function geofenceToggle(row: BranchLocationRow): { isActive: boolean; label: string; success: string } | null {
  if (!row.location) return null;
  const enforced = row.location.isActive;
  return {
    isActive: !enforced,
    label: enforced ? 'Disable' : 'Enable',
    success: enforced ? `Geofence disabled for ${row.branchName}` : `Geofence enabled for ${row.branchName}`,
  };
}
