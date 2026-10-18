import type { FinanceAuditLog } from '@/api/types';

/**
 * Audit Trail — how long a reviewer took between a record reaching them and
 * approving it, and bursts of approvals by one person.
 *
 * Read from the trail itself: every document writes a `created` (or
 * `submitted`) row and an `approved` row with server timestamps, so the gap
 * needs no extra endpoint. It is only as good as the window loaded — an
 * approval whose creation is outside the window has no gap (null), never a
 * guessed one.
 */

/** Under this, an approval is badged "Approved in under 10 seconds". */
export const FAST_APPROVAL_MS = 10_000;
/** Approvals by one person inside this window are reported as one burst. */
export const BURST_WINDOW_MS = 60_000;
/** A burst is worth a note from this many approvals. */
export const BURST_MIN_COUNT = 2;

export interface ReviewSpeed {
  /** Milliseconds from submission (or creation) to approval; null when the start is not in the window. */
  gapMs: number | null;
  /** What the gap is measured from. */
  from: 'submitted' | 'created' | null;
  fast: boolean;
  /** Set on every approval in a burst: "4 approvals in 3 seconds". */
  burstNote: string | null;
}

const ts = (iso: string) => new Date(iso).getTime();

/** "3 seconds", "1 minute 5 seconds" — whole seconds, never "0.4s". */
export function describeDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} ${s === 1 ? 'second' : 'seconds'}`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  const mins = `${m} ${m === 1 ? 'minute' : 'minutes'}`;
  return r ? `${mins} ${r} ${r === 1 ? 'second' : 'seconds'}` : mins;
}

/**
 * Review speed for every `approved` row in `logs`, keyed by the log's id.
 *
 * The start is the LATEST `submitted` row before the approval (a resubmitted
 * document is measured from its last submission), else the latest `created`
 * row. Bursts group one actor's approvals that start within BURST_WINDOW_MS of
 * the burst's first approval.
 */
export function computeReviewSpeeds(logs: FinanceAuditLog[]): Map<string, ReviewSpeed> {
  const byEntity = new Map<string, FinanceAuditLog[]>();
  for (const log of logs) {
    if (!log.entityId) continue;
    const key = `${log.entity}|${log.entityId}`;
    const list = byEntity.get(key);
    if (list) list.push(log);
    else byEntity.set(key, [log]);
  }

  const approvals = logs.filter((l) => l.action === 'approved');
  const result = new Map<string, ReviewSpeed>();

  for (const approval of approvals) {
    const at = ts(approval.createdAt);
    const siblings = approval.entityId ? (byEntity.get(`${approval.entity}|${approval.entityId}`) ?? []) : [];
    const latestBefore = (action: FinanceAuditLog['action']) =>
      siblings
        .filter((l) => l.action === action && ts(l.createdAt) <= at)
        .reduce<FinanceAuditLog | null>((best, l) => (!best || ts(l.createdAt) > ts(best.createdAt) ? l : best), null);
    const start = latestBefore('submitted') ?? latestBefore('created');
    const from = start ? (start.action === 'submitted' ? 'submitted' : 'created') : null;
    const gapMs = start ? at - ts(start.createdAt) : null;
    result.set(approval.id, { gapMs, from, fast: gapMs !== null && gapMs < FAST_APPROVAL_MS, burstNote: null });
  }

  const byActor = new Map<string, FinanceAuditLog[]>();
  for (const a of approvals) {
    const key = a.actorId ?? a.actorName;
    const list = byActor.get(key);
    if (list) list.push(a);
    else byActor.set(key, [a]);
  }
  for (const list of byActor.values()) {
    const sorted = [...list].sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
    let i = 0;
    while (i < sorted.length) {
      const first = ts(sorted[i]!.createdAt);
      let j = i;
      while (j + 1 < sorted.length && ts(sorted[j + 1]!.createdAt) - first < BURST_WINDOW_MS) j++;
      const count = j - i + 1;
      if (count >= BURST_MIN_COUNT) {
        const note = `${count} approvals in ${describeDuration(ts(sorted[j]!.createdAt) - first)}`;
        for (let k = i; k <= j; k++) result.get(sorted[k]!.id)!.burstNote = note;
      }
      i = j + 1;
    }
  }

  return result;
}

/** The "Fast approvals" chip: approvals that were fast or part of a burst. */
export const isFastApproval = (speed: ReviewSpeed | undefined) => Boolean(speed && (speed.fast || speed.burstNote));

// ---------------------------------------------------------------------------
// Approvals inbox — the review gate
// ---------------------------------------------------------------------------

/** Minimum time on the detail before Approve unlocks. */
export const MIN_REVIEW_MS = 2_000;

export interface ReviewGateInput {
  /** The configurable flag; on by default. Off unlocks Approve immediately. */
  enabled: boolean;
  openedPhoto: boolean;
  scrolledToEnd: boolean;
  msOnDetail: number;
}

/** Approve unlocks once the reviewer opened the photo or reached the end of the detail, and spent MIN_REVIEW_MS on it. */
export function isApproveUnlocked({ enabled, openedPhoto, scrolledToEnd, msOnDetail }: ReviewGateInput): boolean {
  if (!enabled) return true;
  return (openedPhoto || scrolledToEnd) && msOnDetail >= MIN_REVIEW_MS;
}
