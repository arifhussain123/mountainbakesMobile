import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import type { RestrictionEventResult, RestrictionRequestStatus, RestrictionRequestType } from '@/api';
import type { PillTone } from '../../components/AdminDetail';

/** The web's restriction vocabulary (`restriction.types.ts`, `restriction-rules/format.ts`). */

export const REQUEST_TYPES: RestrictionRequestType[] = ['BACKDATED_DEMAND', 'LEDGER_BACKDATE', 'COMPANY_SHARE_INCOME', 'CASH_DEPOSIT_LIMIT'];

export const REQUEST_TYPE_LABELS: Record<RestrictionRequestType, string> = {
  BACKDATED_DEMAND: 'Backdated Demand',
  LEDGER_BACKDATE: 'Ledger Back-entry',
  COMPANY_SHARE_INCOME: 'Company Share Income',
  CASH_DEPOSIT_LIMIT: 'Cash Deposit Exception',
};

export const REQUEST_STATUS_LABELS: Record<RestrictionRequestStatus, string> = {
  pending: 'Pending Admin Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const REQUEST_STATUS_TONES: Record<RestrictionRequestStatus, PillTone> = { pending: 'warning', approved: 'success', rejected: 'danger' };

export const EVENT_RESULT_TONES: Record<RestrictionEventResult, PillTone> = {
  Blocked: 'danger',
  Rejected: 'danger',
  Warned: 'warning',
  'Approval requested': 'info',
  Approved: 'success',
  Allowed: 'success',
  Updated: 'neutral',
};

export const MONITOR_STATUS_TONES = { Normal: 'success', Warning: 'warning', Blocked: 'danger' } as const satisfies Record<string, PillTone>;

/** Every code the Audit Log can be narrowed to. */
export const AUDIT_RULE_CODES = [
  'DEMAND_PENDING_LIMIT',
  'BACKDATED_DEMAND',
  'LOW_SALES_AFTER_CLOSING',
  'HOURLY_SALES_LIMIT',
  'CASH_DEPOSIT_LIMIT',
  'LEDGER_BACKDATE',
  'COMPANY_SHARE_INCOME',
  'PRODUCTION_STOCK_SHORTAGE',
  'RULES_CONFIG',
] as const;

/** 'YYYY-MM-DD' → 'DD-MM-YYYY' (the web's `restrictionDmy`). */
export function restrictionDmy(date: string | null | undefined): string {
  if (!date) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : date;
}

/** '02:00' → '02:00 AM'. */
export function time12(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  return `${String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0')}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

export function addDaysToDateStr(date: string, days: number): string {
  const d = parseISO(date);
  return isValid(d) ? format(addDays(d, days), 'yyyy-MM-dd') : date;
}

export function daysBetweenDateStr(from: string, to: string): number {
  const a = parseISO(from);
  const b = parseISO(to);
  return isValid(a) && isValid(b) ? differenceInCalendarDays(b, a) : 0;
}

/** The web ladder's range text: '0–1', '2', or '—' when empty. */
export function ladderRange(from: number, to: number): string {
  return from === to ? String(from) : from > to ? '—' : `${from}–${to}`;
}
