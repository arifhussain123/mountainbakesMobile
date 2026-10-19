import { apiClient } from '../client';
import type { Attachment, AttachmentEntity } from '../types';

export interface CapturedPhoto {
  uri: string;
  type: string;
  fileName?: string;
}

export interface UploadAttachmentOptions {
  /** Aborts the upload — Return Items cancels one whose photo was retaken or removed before it finished. */
  signal?: AbortSignal;
  /** 0–1 as the bytes go out (React Native's XHR reports upload progress on both platforms). */
  onProgress?: (fraction: number) => void;
}

/**
 * Stages one photo against `entity` (`POST /api/attachments`, multipart).
 * Returns the staged attachment — pass its id on the create call that binds
 * it (a return line's `attachmentId`, or `attachmentIds` elsewhere), or the
 * server sweeps it as unused.
 *
 * No client-side resize/compression pass (unlike the web app's
 * `compressImage`) — `launchCamera`/`launchImageLibrary` are called with
 * `maxWidth`/`maxHeight`/`quality` tuned to `RETURN_PHOTO_*` instead. The
 * server's `RETURN_PHOTO_MAX_BYTES` (1MB) is the backstop either way.
 *
 * `photo.uri` may be a `file://` path or a `data:<mime>;base64,…` URI — React
 * Native's multipart encoder reads both (a queued return uploads from the
 * copy it kept in SQLite, which is a data URI).
 */
export async function uploadAttachment(entity: AttachmentEntity, photo: CapturedPhoto, options?: UploadAttachmentOptions): Promise<Attachment> {
  const form = new FormData();
  form.append('entity', entity);
  // React Native's FormData accepts this {uri,type,name} shape for a file part;
  // it is not a real Blob, which is why the cast is needed against the DOM type.
  form.append('photo', { uri: photo.uri, type: photo.type, name: photo.fileName ?? 'photo.jpg' } as unknown as Blob);
  const { attachment } = await apiClient.post<{ attachment: Attachment }>('/attachments', form, {
    signal: options?.signal,
    onUploadProgress: options?.onProgress,
  });
  return attachment;
}

/** Discards a staged (never bound) upload — used when the user removes a photo before saving. */
export async function discardAttachment(id: string): Promise<void> {
  await apiClient.delete<void>(`/attachments/${id}`);
}
