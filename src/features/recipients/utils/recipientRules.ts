import type { BranchSummary, NotificationLog, NotificationRecipient, RecipientChannel, RecipientDepartment } from '@/api';
import { formatDisplayTime } from '@/shared/utils';

/**
 * Who receives what, read from the server's own rules
 * (`closing-notifications.service.ts`): a branch recipient gets that branch's
 * summary; `production` gets the production summary; `admin` gets EVERY
 * summary — each active branch's, production's and the company's.
 */

export type Receives = 'branch' | 'company' | 'production';

export function receivesOf(r: Pick<NotificationRecipient, 'branchId' | 'department'>): Receives {
  if (r.branchId) return 'branch';
  return r.department === 'production' ? 'production' : 'company';
}

export const RECEIVES_LABEL: Record<Receives, string> = {
  branch: 'One branch',
  company: 'All branches (company summary)',
  production: 'Production summary',
};

export function receivesLine(r: Pick<NotificationRecipient, 'branchId' | 'branchName' | 'department'>): string {
  const kind = receivesOf(r);
  if (kind === 'branch') return r.branchName ?? 'A branch';
  return kind === 'company' ? 'All branches' : 'Production';
}

/** The department a "Receives" choice is stored as. */
export function departmentFor(kind: Receives): RecipientDepartment | null {
  return kind === 'company' ? 'admin' : kind === 'production' ? 'production' : null;
}

export const CHANNEL_LABEL = { sms: 'SMS', whatsapp: 'WhatsApp' } as const;

export function channelFlags(channel: RecipientChannel): { sms: boolean; whatsapp: boolean } {
  return { sms: channel !== 'whatsapp', whatsapp: channel !== 'sms' };
}

/** null when neither box is ticked. */
export function channelFrom(flags: { sms: boolean; whatsapp: boolean }): RecipientChannel | null {
  if (flags.sms && flags.whatsapp) return 'both';
  if (flags.sms) return 'sms';
  if (flags.whatsapp) return 'whatsapp';
  return null;
}

/** The same number already receiving the same summary (inactive ones included — re-activate rather than add twice). */
export function findDuplicate(
  recipients: readonly NotificationRecipient[],
  candidate: { mobileNumber: string; branchId: string | null; department: RecipientDepartment | null },
  excludeId?: string,
): NotificationRecipient | null {
  return (
    recipients.find(
      (r) =>
        r.id !== excludeId &&
        r.mobileNumber === candidate.mobileNumber &&
        (candidate.branchId ? r.branchId === candidate.branchId : !r.branchId && r.department === candidate.department),
    ) ?? null
  );
}

export interface BranchCoverage {
  branchId: string;
  branchName: string;
  /** Active recipients of this branch's own summary. */
  count: number;
}

export interface Coverage {
  branches: BranchCoverage[];
  company: number;
  production: number;
}

/** Active recipients per active branch (0s included, uncovered first), plus the central ones. */
export function coverageOf(branches: readonly BranchSummary[], recipients: readonly NotificationRecipient[]): Coverage {
  const active = recipients.filter((r) => r.active);
  const rows = branches
    .filter((b) => b.isActive !== false)
    .map((b) => ({ branchId: b.id, branchName: b.name, count: active.filter((r) => r.branchId === b.id).length }))
    .sort((a, b) => (a.count === 0 ? 0 : 1) - (b.count === 0 ? 0 : 1) || a.branchName.localeCompare(b.branchName));
  return {
    branches: rows,
    company: active.filter((r) => receivesOf(r) === 'company').length,
    production: active.filter((r) => receivesOf(r) === 'production').length,
  };
}

/**
 * How many messages one night's run sends: per active recipient, its reports ×
 * its channels. A company (admin) recipient gets one per active branch plus
 * production plus company.
 */
export function messagesPerRun(recipients: readonly NotificationRecipient[], activeBranchCount: number): number {
  let n = 0;
  for (const r of recipients) {
    if (!r.active) continue;
    const kind = receivesOf(r);
    const reports = kind === 'company' ? activeBranchCount + 2 : 1;
    n += reports * (r.channel === 'both' ? 2 : 1);
  }
  return n;
}

/** Each recipient's newest log row — `logs` arrive newest first. */
export function latestLogByRecipient(logs: readonly NotificationLog[]): Map<string, NotificationLog> {
  const out = new Map<string, NotificationLog>();
  for (const l of logs) if (l.recipientId && !out.has(l.recipientId)) out.set(l.recipientId, l);
  return out;
}

/**
 * A log row in words. `sent` is "accepted by the provider" — there are no
 * delivery receipts, so nothing here ever says "Delivered". With the log
 * provider (test mode) nothing left the server at all.
 */
export function deliveryLabel(log: Pick<NotificationLog, 'provider' | 'status' | 'errorMessage' | 'sentAt' | 'createdAt'>): string {
  if (log.status === 'failed') return `Failed: ${shortReason(log.errorMessage)}`;
  if (log.provider === 'log') return 'Logged only · test mode';
  return `Sent ${formatDisplayTime(log.sentAt ?? log.createdAt)}`;
}

function shortReason(error: string | null): string {
  if (!error) return 'no reason given';
  if (/63016/.test(error)) return 'WhatsApp needs an approved template';
  if (/21211|21614|invalid.*number/i.test(error)) return 'invalid number';
  return error.length > 60 ? `${error.slice(0, 57)}…` : error;
}

/** The business day before `today` — the last one the 2 AM close has summarised. */
export function lastClosedBusinessDay(today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
