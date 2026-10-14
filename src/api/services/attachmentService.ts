import { apiClient } from '../client';
import type { Attachment, AttachmentEntity } from '../types';

export interface CapturedPhoto {
  uri: string;
  type: string;
  fileName?: string;
}

/**
 * Stages one photo against `entity` (`POST /api/attachments`, multipart).
 * Returns the staged attachment's id — pass it as one of `attachmentIds` on
 * the create call that binds it, or it stays orphaned in the bucket.
 *
 * No client-side resize/compression pass (unlike the web app's
 * `compressImage`) — `launchCamera`/`launchImageLibrary` are called with
 * `maxWidth`/`maxHeight`/`quality` tuned to `RETURN_PHOTO_*` instead. The
 * server's `RETURN_PHOTO_MAX_BYTES` (1MB) is the backstop either way.
 */
export async function uploadAttachment(entity: AttachmentEntity, photo: CapturedPhoto): Promise<Attachment> {
  const form = new FormData();
  form.append('entity', entity);
  // React Native's FormData accepts this {uri,type,name} shape for a file part;
  // it is not a real Blob, which is why the cast is needed against the DOM type.
  form.append('photo', { uri: photo.uri, type: photo.type, name: photo.fileName ?? 'photo.jpg' } as unknown as Blob);
  const { attachment } = await apiClient.post<{ attachment: Attachment }>('/attachments', form);
  return attachment;
}

/** Discards a staged (never bound) upload — used when the user removes a photo before saving. */
export async function discardAttachment(id: string): Promise<void> {
  await apiClient.delete<void>(`/attachments/${id}`);
}
