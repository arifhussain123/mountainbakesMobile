import type { QueuedWrite, WriteExecutionContext } from '@/shared/offline/types';
import type { ApiError, CreateBranchReturnInput } from './types';

/** The write-queue endpoint a queued Return Items save is filed under. */
export const QUEUED_RETURN_ENDPOINT = '/stock/return';

export interface QueuedReturnLine {
  productId: string;
  /** For the "Waiting to sync" card only — stripped before the POST. */
  productName: string;
  qty: number;
  /** Key of this line's photo in the phone's `local_photos` table — kept until the return syncs. */
  localPhotoId: string;
  mimeType: string;
  /** Set once this line's photo has been uploaded, and saved back into the queued row so a retry never uploads it twice. */
  attachmentId: string | null;
}

/** The queued row's payload. Not the request body — `toRequestBody` builds that. */
export interface QueuedReturnPayload {
  kind: 'branch_return';
  items: QueuedReturnLine[];
  reason?: string;
  /** Stamped when Save was tapped, so the return counts toward the day it was made. */
  businessDate: string;
}

export interface QueuedReturnDeps {
  /** Uploads one kept photo; resolves to the new attachment id. */
  uploadPhoto: (line: QueuedReturnLine) => Promise<string>;
  /** `POST /stock/return` with this body and key (geofence header included). */
  postReturn: (body: CreateBranchReturnInput, idempotencyKey: string) => Promise<void>;
  deleteLocalPhotos: (ids: string[]) => Promise<void>;
  newIdempotencyKey: () => string;
}

export function isQueuedReturnPayload(payload: unknown): payload is QueuedReturnPayload {
  return typeof payload === 'object' && payload !== null && (payload as { kind?: unknown }).kind === 'branch_return';
}

export function isQueuedBranchReturn(write: QueuedWrite): write is QueuedWrite & { payload: QueuedReturnPayload } {
  return write.endpoint === QUEUED_RETURN_ENDPOINT && isQueuedReturnPayload(write.payload);
}

/** "1 of 2 photos uploaded" for the queued card. */
export function queuedReturnPhotoProgress(payload: QueuedReturnPayload): { uploaded: number; total: number } {
  return { uploaded: payload.items.filter((line) => !!line.attachmentId).length, total: payload.items.length };
}

/**
 * The server fingerprints the body under its idempotency key, so a retry must
 * send it byte-for-byte — and so must a return that was first tried online
 * and queued after a dropped connection (same key): same keys, same order as
 * `stockReturnService.createBranchReturn` sends (items, reason, businessDate;
 * an empty reason left out).
 */
export function toRequestBody(payload: QueuedReturnPayload): CreateBranchReturnInput {
  return {
    items: payload.items.map((line) => ({ productId: line.productId, qty: line.qty, attachmentId: line.attachmentId ?? undefined })),
    reason: payload.reason || undefined,
    businessDate: payload.businessDate,
  };
}

/**
 * The server's "that photo is gone" refusal (swept after 24 h unused, or
 * otherwise unusable). Returns the ids it named, or every id sent when it
 * named none. Only ever answered before any stock moves.
 */
export function unavailableAttachmentIds(error: unknown, sent: string[]): string[] | null {
  if (typeof error !== 'object' || error === null) return null;
  const apiError = error as Partial<ApiError>;
  if (apiError.status !== 409) return null;
  const details = apiError.details as { code?: unknown; attachmentIds?: unknown } | undefined;
  if (details?.code !== 'attachment_unavailable') return null;
  const ids = Array.isArray(details.attachmentIds) ? details.attachmentIds.filter((id): id is string => typeof id === 'string') : [];
  return ids.length > 0 ? ids : sent;
}

/**
 * Runs one queued return: upload every line still lacking a photo id (each id
 * saved into the row as soon as it exists), then ONE idempotent POST.
 *
 * On `attachment_unavailable` the named photos are uploaded again from the
 * copies kept on the phone and the return is resubmitted under a NEW key —
 * reusing the old key with a changed body would be refused as a fingerprint
 * mismatch, and that 409 guarantees nothing moved under it. This happens at
 * most once per attempt; a second refusal surfaces as an ordinary failure.
 *
 * Throws whatever the upload or the POST threw, so the write queue's own
 * retry/backoff rules (network/5xx retry, other 4xx fail) still apply.
 */
export async function executeQueuedBranchReturn(write: QueuedWrite, context: WriteExecutionContext, deps: QueuedReturnDeps): Promise<void> {
  if (!isQueuedReturnPayload(write.payload)) throw { status: 400, message: 'This queued return is damaged and cannot be sent.' };
  let payload: QueuedReturnPayload = { ...write.payload, items: write.payload.items.map((line) => ({ ...line })) };
  let idempotencyKey = write.idempotencyKey;

  for (let attempt = 0; ; attempt++) {
    for (let i = 0; i < payload.items.length; i++) {
      if (payload.items[i].attachmentId) continue;
      const attachmentId = await deps.uploadPhoto(payload.items[i]);
      payload = { ...payload, items: payload.items.map((line, index) => (index === i ? { ...line, attachmentId } : line)) };
      await context.persist({ payload });
    }

    try {
      await deps.postReturn(toRequestBody(payload), idempotencyKey);
      break;
    } catch (error) {
      const sent = payload.items.map((line) => line.attachmentId).filter((id): id is string => !!id);
      const gone = attempt === 0 ? unavailableAttachmentIds(error, sent) : null;
      if (!gone) throw error;
      payload = { ...payload, items: payload.items.map((line) => (line.attachmentId && gone.includes(line.attachmentId) ? { ...line, attachmentId: null } : line)) };
      idempotencyKey = deps.newIdempotencyKey();
      await context.persist({ payload, idempotencyKey });
    }
  }

  try {
    await deps.deleteLocalPhotos(payload.items.map((line) => line.localPhotoId));
  } catch {
    // Best-effort: a leftover copy is swept at the next start-up (`pruneLocalPhotos`).
  }
}
