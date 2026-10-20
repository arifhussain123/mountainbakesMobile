/**
 * Rules for the two file actions Super Admin has on the web that the phone now
 * repeats: the Settings logo upload (`POST /api/settings/logo`) and the
 * Database Backup download link (`GET /api/admin/backups/:id/download-url`).
 * Pure and React-free so they are unit-tested.
 */

// ─── Settings logo ───────────────────────────────────────────────────────────

/** The route's multer cap (`limits: { fileSize: 2 * 1024 * 1024 }`). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** The route's `LOGO_EXTENSIONS` keys — the only mimetypes the server stores. */
export const LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;

/** The server's own refusal, word for word. */
export const LOGO_TYPE_MESSAGE = 'Logo must be a PNG, JPEG, WebP, or SVG image';
export const LOGO_SIZE_MESSAGE = 'The logo must be 2 MB or smaller.';

/**
 * Checked before uploading so an image the server would refuse is not sent
 * over a mobile connection first. The server checks both again. An unknown
 * size is let through for the server to judge.
 */
export function logoFileProblem(file: { type?: string | null; fileSize?: number | null }): string | null {
  const type = (file.type ?? '').toLowerCase();
  if (!(LOGO_MIME_TYPES as readonly string[]).includes(type)) return LOGO_TYPE_MESSAGE;
  if (typeof file.fileSize === 'number' && file.fileSize > LOGO_MAX_BYTES) return LOGO_SIZE_MESSAGE;
  return null;
}

// ─── Backup download ─────────────────────────────────────────────────────────

// Which runs can be downloaded is `isBackupDone` (systemActions.ts) — the same "completed" test Verify uses.

/** The web's info toast once the link is issued. */
export function backupLinkMessage(res: { fileName: string; expiresInSeconds: number }): string {
  return `Download link for ${res.fileName} is valid for ${Math.round(res.expiresInSeconds / 60)} minutes`;
}
