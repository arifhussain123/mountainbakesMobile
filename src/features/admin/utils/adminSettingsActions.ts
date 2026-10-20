import { z } from 'zod';
import type { AppSettings, RestrictionGroup, RestrictionRequest, RestrictionRules } from '@/api';

/**
 * Pure rules behind Super Admin's Settings actions — the web `SettingsPage`
 * ("Save Settings"), the Restriction Rules `RulesTab` (one Save per group)
 * and `ApprovalsTab` (Approve / Reject), reproduced exactly. Every gate here
 * is courtesy: the API re-validates each body with its own Zod schema.
 */

// ─── Settings form (web SettingsPage) ───────────────────────────────────────

/** Number inputs are held as typed text and converted on save, as the web converts on change. */
export interface SettingsForm {
  companyName: string;
  receiptFooter: string;
  currency: string;
  currencySymbol: string;
  gstEnabled: boolean;
  gstRate: string;
  businessStartTime: string;
  businessClosingTime: string;
  orderStartTime: string;
  orderEndTime: string;
  autoCloseBusiness: boolean;
  autoStockClosing: boolean;
  closingNotificationsEnabled: boolean;
  orderConfirmationsEnabled: boolean;
  eventNotificationsEnabled: boolean;
  geofencingEnabled: boolean;
  geofenceDefaultRadiusKm: string;
  geofenceVerifyIntervalMin: string;
  geofenceGpsTimeoutSec: string;
  geofenceMaxPositionAgeSec: string;
  geofenceRequireHighAccuracy: boolean;
}

/** The loaded settings as the form starts — the web's own `?? default` for every control. */
export function settingsFormFrom(s: AppSettings): SettingsForm {
  return {
    companyName: s.companyName || '',
    receiptFooter: s.receiptFooter || '',
    currency: s.currency ?? '',
    currencySymbol: s.currencySymbol ?? '',
    gstEnabled: s.gstEnabled || false,
    gstRate: String(s.gstRate ?? 0),
    businessStartTime: s.businessStartTime ?? '',
    businessClosingTime: s.businessClosingTime ?? '',
    orderStartTime: s.orderStartTime ?? '',
    orderEndTime: s.orderEndTime ?? '',
    autoCloseBusiness: s.autoCloseBusiness ?? true,
    autoStockClosing: s.autoStockClosing ?? true,
    closingNotificationsEnabled: s.closingNotificationsEnabled ?? false,
    orderConfirmationsEnabled: s.orderConfirmationsEnabled ?? false,
    eventNotificationsEnabled: s.eventNotificationsEnabled ?? false,
    geofencingEnabled: s.geofencingEnabled ?? false,
    geofenceDefaultRadiusKm: String(s.geofenceDefaultRadiusKm ?? 50),
    geofenceVerifyIntervalMin: String(s.geofenceVerifyIntervalMin ?? 5),
    geofenceGpsTimeoutSec: String(s.geofenceGpsTimeoutSec ?? 20),
    geofenceMaxPositionAgeSec: String(s.geofenceMaxPositionAgeSec ?? 300),
    geofenceRequireHighAccuracy: s.geofenceRequireHighAccuracy ?? true,
  };
}

/** The web's `Number(e.target.value) || 0` for the geofencing inputs. */
const numberOr0 = (text: string) => Number(text.trim()) || 0;

/**
 * The web's GST Rate conversion: `parseFloat('')` is NaN and JSON turns NaN
 * into null, which the server's `z.number()` refuses — so an emptied field is 0.
 */
const gstRateOf = (text: string) => {
  const n = parseFloat(text);
  return Number.isFinite(n) ? n : 0;
};

/** Never sent back — the logo has its own upload route, and the stamps are the server's. */
const NOT_SENT = ['logoUrl', 'logoPath', 'updatedAt', 'updatedBy'] as const;

/**
 * The `PUT /api/settings` body: the whole loaded settings object (as the web
 * sends it — the server keeps only the fields it knows) with the form's
 * values over it.
 */
export function settingsPayload(base: AppSettings, form: SettingsForm): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...base };
  for (const k of NOT_SENT) delete rest[k];
  return {
    ...rest,
    ...form,
    // Checked trimmed by settingsFormProblem, so sent trimmed.
    businessStartTime: form.businessStartTime.trim(),
    businessClosingTime: form.businessClosingTime.trim(),
    orderStartTime: form.orderStartTime.trim(),
    orderEndTime: form.orderEndTime.trim(),
    gstRate: gstRateOf(form.gstRate),
    geofenceDefaultRadiusKm: numberOr0(form.geofenceDefaultRadiusKm),
    geofenceVerifyIntervalMin: numberOr0(form.geofenceVerifyIntervalMin),
    geofenceGpsTimeoutSec: numberOr0(form.geofenceGpsTimeoutSec),
    geofenceMaxPositionAgeSec: numberOr0(form.geofenceMaxPositionAgeSec),
  };
}

/** The server's `HHMM`: 24-hour 'HH:mm', 00:00–23:59. */
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const SETTINGS_TIME_FIELDS = [
  ['businessStartTime', 'Business Start Time'],
  ['businessClosingTime', 'Business Closing Time'],
  ['orderStartTime', 'Order Start Time'],
  ['orderEndTime', 'Order End Time'],
] as const;

/**
 * The one check the web makes before sending: its time inputs only ever hold
 * a 24-hour 'HH:mm'. A phone text field can hold anything, so it is checked
 * here; everything else is left to the server, as on the web.
 */
export function settingsFormProblem(form: SettingsForm): string | null {
  for (const [key, label] of SETTINGS_TIME_FIELDS) {
    if (!HHMM.test(form[key].trim())) return `${label}: enter a 24-hour time as HH:mm, e.g. 08:00 or 02:00.`;
  }
  return null;
}

// ─── Restriction Rules → Rules (web RulesTab) ───────────────────────────────

/**
 * The API's `RestrictionGroupSchemas` (restriction.schemas.ts), copied
 * exactly — the web lights a group's Save only when its schema passes, so a
 * save it allows is never refused.
 */
export const RESTRICTION_GROUP_SCHEMAS = {
  demand: z
    .object({
      pendingLimit: z.object({ enabled: z.boolean(), warnAt: z.number().int().min(0).max(100), blockAt: z.number().int().min(1).max(100) }),
      backdated: z.object({ enabled: z.boolean(), requireApproval: z.boolean() }),
      lowSales: z.object({ enabled: z.boolean(), minSoldPercent: z.number().int().min(1).max(100) }),
    })
    .refine((v) => v.pendingLimit.warnAt < v.pendingLimit.blockAt, {
      message: 'Warning threshold must be lower than the blocking threshold.',
      path: ['pendingLimit', 'warnAt'],
    }),
  sales: z.object({ hourly: z.object({ enabled: z.boolean(), threshold: z.number().int().min(1).max(1000) }) }),
  production: z.object({ stockShortage: z.object({ enabled: z.boolean(), allowAdminOverride: z.boolean() }) }),
  cash: z.object({ dailyLimit: z.object({ enabled: z.boolean(), limit: z.number().int().min(1).max(100), allowExceptions: z.boolean() }) }),
  ledger: z.object({ backdate: z.object({ enabled: z.boolean(), allowedDays: z.number().int().min(0).max(365) }) }),
  company: z.object({ shareIncome: z.object({ enabled: z.boolean(), allowApproval: z.boolean() }) }),
} as const;

export const RESTRICTION_GROUPS: readonly RestrictionGroup[] = ['demand', 'sales', 'production', 'cash', 'ledger', 'company'];

/** Replace one rule inside one group, leaving the rest of the draft alone. */
export function patchRule<G extends RestrictionGroup, R extends keyof RestrictionRules[G]>(
  draft: RestrictionRules,
  group: G,
  rule: R,
  change: Partial<RestrictionRules[G][R]>,
): RestrictionRules {
  return { ...draft, [group]: { ...draft[group], [rule]: { ...draft[group][rule], ...change } } };
}

/** JSON with object keys sorted — the server's copy and the merged-over-defaults copy need not list keys in one order. */
function stableJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(Number.isNaN(v) ? null : v);
  if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`)
    .join(',')}}`;
}

/** The web's `JSON.stringify(draft[g]) !== JSON.stringify(saved[g])`, key order aside. */
export function isGroupDirty(draft: RestrictionRules, saved: RestrictionRules, g: RestrictionGroup): boolean {
  return stableJson(draft[g]) !== stableJson(saved[g]);
}

export function isGroupValid(draft: RestrictionRules, g: RestrictionGroup): boolean {
  return RESTRICTION_GROUP_SCHEMAS[g].safeParse(draft[g]).success;
}

/** The web's Save button: lit only for a changed, valid group, and never while another group is saving. */
export function canSaveGroup(draft: RestrictionRules, saved: RestrictionRules, g: RestrictionGroup, saving: RestrictionGroup | null): boolean {
  return isGroupDirty(draft, saved, g) && isGroupValid(draft, g) && saving === null;
}

/**
 * The web `NumberField`'s onChange: an emptied field is held as NaN (shown
 * blank, refused on save); anything else is a whole number, never negative.
 */
export function ruleNumberFrom(text: string): number {
  return text === '' ? Number.NaN : Math.max(0, Math.trunc(Number(text)) || 0);
}

/** What the field shows for a held value — NaN is blank. */
export function ruleNumberText(v: number): string {
  return Number.isNaN(v) ? '' : String(v);
}

/** NaN (an emptied field) reads as 0 in ladders and summaries. */
export const ruleN = (v: number) => (Number.isNaN(v) ? 0 : v);

/** The web's inline field errors under the two rules that have one. */
export function pendingLimitError(dp: RestrictionRules['demand']['pendingLimit']): string | null {
  return ruleN(dp.warnAt) < ruleN(dp.blockAt) ? null : 'Warning threshold must be lower than the blocking threshold.';
}

export function lowSalesError(cs: RestrictionRules['demand']['lowSales']): string | null {
  const p = ruleN(cs.minSoldPercent);
  return p >= 1 && p <= 100 ? null : 'Enter a percentage between 1 and 100.';
}

// ─── Restriction Rules → Approvals (web ApprovalsTab) ───────────────────────

export type RestrictionDecision = 'approved' | 'rejected';

/** Only a pending request can be decided; a decided one shows its decision instead. */
export function canDecideRequest(r: Pick<RestrictionRequest, 'status'>): boolean {
  return r.status === 'pending';
}

/** The web's one check: a reject needs a reason (it is shown to the requester). */
export function decisionReasonProblem(decision: RestrictionDecision, reason: string): string | null {
  return decision === 'rejected' && !reason.trim() ? 'Enter a reason before rejecting.' : null;
}

/** The `decide` body's reason: trimmed, and left out when empty. */
export function decisionReason(reason: string): string | undefined {
  return reason.trim() || undefined;
}

/** The web's success toast: `REQ-000141 approved (APR-000421)`. */
export function decisionMessage(r: Pick<RestrictionRequest, 'requestNo' | 'approvalNo'>, decision: RestrictionDecision): string {
  return `${r.requestNo} ${decision} (${r.approvalNo})`;
}
