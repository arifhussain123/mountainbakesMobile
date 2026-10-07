/**
 * One stable image URI per attachment, however often its URL is re-signed.
 *
 * The API mints a fresh signed URL for a photo on EVERY read. To the image
 * pipeline a new URL is a new image: a list refetch would re-download every
 * thumbnail on screen and blank each one while it did. The attachment's `id`
 * is the thing that does not change, so the first URL seen for an id is the one
 * kept, and later ones are ignored while it is still good.
 *
 * "Still good" is the part with a clock in it. A signed URL lives an hour; a
 * kept one is replaced once it is old enough that a cache miss could hit an
 * expired link, and immediately when a load with it has failed.
 *
 * In memory only, and deliberately: a signed URL must never be persisted.
 */

/** Comfortably inside the server's one-hour TTL. */
export const ATTACHMENT_URI_MAX_AGE_MS = 45 * 60 * 1000;

/** A list screen shows a few dozen thumbs; this bounds a long session. */
const MAX_ENTRIES = 300;

interface Entry {
  uri: string;
  at: number;
}

const cache = new Map<string, Entry>();

export function stableAttachmentUri(id: string, freshUri: string, now: number = Date.now()): string {
  const kept = cache.get(id);
  if (kept && now - kept.at < ATTACHMENT_URI_MAX_AGE_MS) return kept.uri;

  if (!kept && cache.size >= MAX_ENTRIES) {
    // Maps iterate in insertion order, so the first key is the oldest.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(id, { uri: freshUri, at: now });
  return freshUri;
}

/** Drop a kept URI that failed to load, so the next call adopts the fresh one. */
export function forgetAttachmentUri(id: string): void {
  cache.delete(id);
}

/** Test seam. */
export function clearAttachmentUriCache(): void {
  cache.clear();
}
