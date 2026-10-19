import { getOfflineDb } from './db';

export interface LocalPhoto {
  id: string;
  mimeType: string;
  base64: string;
}

interface LocalPhotoRow {
  id: string;
  mime_type: string;
  base64: string;
}

/**
 * Photos kept on the phone for a queued write (the `local_photos` table).
 * App-private storage — never the gallery — and deleted once the write syncs
 * or the queue is cleared.
 */
export async function saveLocalPhoto(photo: LocalPhoto): Promise<void> {
  const db = getOfflineDb();
  await db.execute('INSERT OR REPLACE INTO local_photos (id, mime_type, base64, created_at) VALUES (?, ?, ?, ?)', [
    photo.id,
    photo.mimeType,
    photo.base64,
    Date.now(),
  ]);
}

export async function readLocalPhoto(id: string): Promise<LocalPhoto | null> {
  const db = getOfflineDb();
  const result = await db.execute('SELECT id, mime_type, base64 FROM local_photos WHERE id = ?', [id]);
  const row = (result.rows as unknown as LocalPhotoRow[])[0];
  return row ? { id: row.id, mimeType: row.mime_type, base64: row.base64 } : null;
}

export async function deleteLocalPhotos(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = getOfflineDb();
  await db.execute(`DELETE FROM local_photos WHERE id IN (${ids.map(() => '?').join(', ')})`, ids);
}

/** Deletes every kept photo whose id is not in `keepIds` — the start-up sweep for photos whose write is gone. */
export async function pruneLocalPhotos(keepIds: string[]): Promise<void> {
  const db = getOfflineDb();
  if (keepIds.length === 0) {
    await db.execute('DELETE FROM local_photos');
    return;
  }
  await db.execute(`DELETE FROM local_photos WHERE id NOT IN (${keepIds.map(() => '?').join(', ')})`, keepIds);
}
