import { apiClient } from '../client';

/**
 * Round-2 parity calls the web makes outside any one Super Admin page: the
 * header's Global Search, the forced password change, the Settings logo upload
 * and the Database Backup download link. Same endpoints, same bodies.
 */

// ─── Global Search (web components/shared/GlobalSearch.tsx) ─────────────────

/** `type` is the server's own: 'order' | 'product' | 'customer' | 'packingMaterial'. */
export interface GlobalSearchResult {
  id: string;
  label: string;
  type: string;
  /** The web route the result opens — mapped to a phone screen by `globalSearchTarget`. */
  href: string;
  status?: string;
}

/** One heading: 'Orders' | 'Products' | 'Packing Materials' | 'Customers' (empty groups are dropped by the server). */
export interface GlobalSearchGroup {
  type: string;
  items: GlobalSearchResult[];
}

/** `GET /api/search?q=` — under two characters the server answers `[]` without searching. */
export async function globalSearch(q: string): Promise<GlobalSearchGroup[]> {
  const { results } = await apiClient.get<{ results: GlobalSearchGroup[] }>('/search', { q });
  return results ?? [];
}

// ─── Forced password change (web app/change-password/page.tsx) ──────────────

/**
 * `POST /api/auth/change-password` — `{ newPassword }` only (the confirmation is
 * checked on the device, as the web does). The server re-checks the strong
 * policy, clears `must_change_password` and signs every OTHER device out; this
 * session stays valid.
 */
export async function changeOwnPassword(newPassword: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>('/auth/change-password', { newPassword });
}

// ─── Settings logo (web SettingsPage) ───────────────────────────────────────

export interface PickedLogo {
  uri: string;
  /** Mimetype — the server sniffs it and only accepts PNG, JPEG, WebP or SVG. */
  type: string;
  fileName?: string;
}

/**
 * `POST /api/settings/logo`, multipart, the file in the `logo` field (multer,
 * 2 MB cap). Returns the new public URL, which the server has already written
 * to the settings row.
 */
export async function uploadSettingsLogo(logo: PickedLogo): Promise<{ success: boolean; logoUrl: string }> {
  const form = new FormData();
  // React Native's FormData takes this {uri,type,name} shape for a file part (see attachmentService).
  form.append('logo', { uri: logo.uri, type: logo.type, name: logo.fileName ?? 'logo' } as unknown as Blob);
  return apiClient.post<{ success: boolean; logoUrl: string }>('/settings/logo', form);
}

// ─── Database Backup download (web DatabaseBackupPage) ──────────────────────

export type BackupArchive = 'main' | 'auth';

export interface BackupDownloadUrlResponse {
  url: string;
  expiresInSeconds: number;
  fileName: string;
}

/** `GET /api/admin/backups/:id/download-url?file=main|auth` — a five-minute presigned link, logged by the API. Never cached. */
export async function getBackupDownloadUrl(id: string, file: BackupArchive): Promise<BackupDownloadUrlResponse> {
  return apiClient.get<BackupDownloadUrlResponse>(`/admin/backups/${encodeURIComponent(id)}/download-url`, { file });
}
