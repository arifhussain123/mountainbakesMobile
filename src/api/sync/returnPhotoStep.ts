import * as queue from '@/common/database/repositories/syncQueueRepository';
import type { SyncQueueRow } from '@/common/database/repositories/syncQueueRepository';
import { ApiError } from '@/api/errors';
import { discardAttachment, uploadAttachment } from '@/api/services/attachmentsService';
import { deletePersistedPhoto, photoExists } from '@/common/utils/image/returnPhoto';

/**
 * The return photo, as a step of the drain.
 *
 * A stock return carries one required photo, and the server takes it in two
 * requests: `POST /api/attachments` stages the file and answers an id, then
 * `POST /api/stock/return` claims that id. Offline-first means neither can
 * happen at submit time, so the queued payload carries the photo as a
 * **client-only** field and the drain does both, in order:
 *
 *   payload.localPhoto      { uri, mimeType, width, height, sizeBytes }
 *   payload.attachmentIds   []  →  ['<id>'] once uploaded
 *
 * ---------------------------------------------------------------------------
 * The id is written back BEFORE the return is posted
 * ---------------------------------------------------------------------------
 * The upload endpoint has no idempotency, so "upload, then post" on every
 * attempt would stage a new photo each time the return's response was lost. It
 * would also break the return itself: the server fingerprints the body under
 * the `Idempotency-Key`, and a retry carrying a different attachment id is a
 * different body — refused as a key mismatch rather than replayed.
 *
 * So the id goes onto the stored row first. Every later attempt finds
 * `attachmentIds` already filled, uploads nothing, and sends byte-for-byte the
 * body the first attempt sent.
 *
 * ---------------------------------------------------------------------------
 * `localPhoto` never leaves the device
 * ---------------------------------------------------------------------------
 * It is stripped from the body. A device file path is none of the server's
 * business, and leaving it in would also make the fingerprint depend on it.
 *
 * ---------------------------------------------------------------------------
 * Rows queued by an older build
 * ---------------------------------------------------------------------------
 * A `stock_movement` with no `localPhoto` is passed through untouched — same
 * object, same single POST. Whether the server still accepts a photo-less
 * return is its decision (`photo_required`), and its refusal parks the row the
 * way any other 400 does.
 */

const ATTACHMENT_UNAVAILABLE = 'attachment_unavailable';

export interface QueuedLocalPhoto {
  uri: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** The queued photo on a row, or null — including for every other entity. */
export function localPhotoOf(row: Pick<SyncQueueRow, 'entity' | 'payload'>): QueuedLocalPhoto | null {
  if (row.entity !== 'stock_movement') return null;
  const photo = asRecord(asRecord(row.payload)?.localPhoto);
  if (!photo || typeof photo.uri !== 'string' || photo.uri.length === 0) return null;
  return {
    uri: photo.uri,
    mimeType: typeof photo.mimeType === 'string' ? photo.mimeType : 'image/jpeg',
    width: typeof photo.width === 'number' ? photo.width : null,
    height: typeof photo.height === 'number' ? photo.height : null,
    sizeBytes: typeof photo.sizeBytes === 'number' ? photo.sizeBytes : null,
  };
}

function attachmentIdsOf(payload: Record<string, unknown>): string[] {
  const ids = payload.attachmentIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

function withoutLocalPhoto(payload: Record<string, unknown>): Record<string, unknown> {
  const body = { ...payload };
  delete body.localPhoto;
  return body;
}

/**
 * Resolve the body to send for a row, uploading its photo first if it has one
 * that the server has not been given yet.
 *
 * Throws what the upload throws, so a failure is classified by the drain's
 * existing rules: network / timeout / 5xx back off and retry with the row and
 * the file both kept; a 401 pauses the drain.
 */
export async function prepareReturnPhoto(row: SyncQueueRow, now: number): Promise<unknown> {
  const photo = localPhotoOf(row);
  if (!photo) return row.payload;

  const payload = asRecord(row.payload) as Record<string, unknown>;

  // Already uploaded on an earlier attempt: send the same body again.
  if (attachmentIdsOf(payload).length > 0) return withoutLocalPhoto(payload);

  // The file is the only copy of the photo. Without it the choice is a
  // photo-less return (which the server refuses, and which is not what the
  // branch submitted) or a clear stop — so it stops, as `failed`, for a person.
  if (!(await photoExists(photo.uri))) {
    throw new ApiError({
      kind: 'validation',
      code: 'photo_missing',
      message:
        'The photo for this return is no longer on this device, so it was not sent. Raise the return again with a new photo.',
    });
  }

  const attachment = await uploadAttachment('branch_return', photo);

  const next = { ...payload, attachmentIds: [attachment.id] };
  try {
    await queue.updatePayload(
      row.id,
      { entity: row.entity, clientOperationId: row.clientOperationId },
      next,
      now,
    );
  } catch (error) {
    // The id could not be remembered, so the next attempt will upload again.
    // Hand this one back rather than leave it for the server's 14-day sweep;
    // best-effort, and the return is NOT posted — posting an id the row does
    // not hold is exactly the divergence the write-back exists to prevent.
    await discardAttachment(attachment.id).catch(() => {});
    throw error;
  }

  return withoutLocalPhoto(next);
}

/**
 * The server no longer has the staged photo this row points at.
 *
 * It answers 409 `details.code = 'attachment_unavailable'` before moving any
 * stock (and without keeping the idempotency key), which happens when an upload
 * sat unused past the server's sweep. That is not a conflict a person can
 * resolve — the fix is to upload the file again — so it is only treated as one
 * when there is no local file left to upload from.
 */
export function isAttachmentUnavailable(error: ApiError): boolean {
  if (error.status !== 409) return false;
  const details = asRecord(error.details);
  const body = asRecord(error.body);
  return (
    details?.code === ATTACHMENT_UNAVAILABLE ||
    error.code === ATTACHMENT_UNAVAILABLE ||
    body?.code === ATTACHMENT_UNAVAILABLE
  );
}

/** Forget the stale id so the next attempt uploads from the local file again. */
export async function clearStaleAttachment(row: SyncQueueRow, now: number): Promise<void> {
  const payload = asRecord(row.payload);
  if (!payload) return;
  await queue.updatePayload(
    row.id,
    { entity: row.entity, clientOperationId: row.clientOperationId },
    { ...payload, attachmentIds: [] },
    now,
  );
}

/**
 * The return is on the server, so the device copy of its photo can go.
 *
 * Called only after `markSynced`. Never on a failure of any kind: until the
 * server has accepted the return, that file is the only copy of the photo.
 */
export async function releaseReturnPhoto(row: SyncQueueRow): Promise<void> {
  const photo = localPhotoOf(row);
  if (photo) await deletePersistedPhoto(photo.uri);
}
