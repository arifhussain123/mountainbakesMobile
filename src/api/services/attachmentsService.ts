import { api } from '@/api/client';
import type { Attachment, AttachmentEntity } from '@/shared/types/attachment.types';

/**
 * Photo attachments — the staged upload a document later claims by id.
 *
 * `POST /api/attachments` is Bearer-only: no `Idempotency-Key` and no geofence.
 * That is why the sync layer, not this function, is what guarantees a photo is
 * uploaded once — it writes the returned id back onto the queued row before
 * anything else happens (see `api/sync/returnPhotoStep.ts`).
 */

/** A phone on a weak branch connection sending ~200 KB; the 20 s default is tight. */
const UPLOAD_TIMEOUT_MS = 60_000;

export interface UploadablePhoto {
  /** A `file://` URI. */
  uri: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
}

function fileNameFor(photo: UploadablePhoto): string {
  const fromUri = photo.uri.split('/').pop();
  if (fromUri && /\.[a-z0-9]+$/i.test(fromUri)) return fromUri;
  const ext = photo.mimeType === 'image/png' ? 'png' : photo.mimeType === 'image/webp' ? 'webp' : 'jpg';
  return `photo.${ext}`;
}

export async function uploadAttachment(
  entity: AttachmentEntity,
  photo: UploadablePhoto,
): Promise<Attachment> {
  const form = new FormData();
  form.append('entity', entity);
  if (photo.width) form.append('width', String(Math.round(photo.width)));
  if (photo.height) form.append('height', String(Math.round(photo.height)));
  // React Native's FormData takes a `{uri, name, type}` descriptor and streams
  // the file natively; the web `Blob` typing does not know that shape.
  form.append('photo', {
    uri: photo.uri,
    name: fileNameFor(photo),
    type: photo.mimeType,
  } as unknown as Blob);

  // The client's interceptor drops the JSON Content-Type for FormData so the
  // platform can write the multipart boundary itself.
  const { attachment } = await api.post<{ attachment: Attachment }>('/api/attachments', form, {
    timeout: UPLOAD_TIMEOUT_MS,
  });
  return attachment;
}

/** Discard the caller's own still-unused upload. The server answers 204 always. */
export async function discardAttachment(id: string): Promise<void> {
  await api.delete<void>(`/api/attachments/${encodeURIComponent(id)}`);
}
