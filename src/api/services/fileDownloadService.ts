import { apiClient } from '../client';

/**
 * A server-built file (the web's Excel / PDF / CSV downloads) saved to the
 * app's cache. Returns the local path, ready for `shareFile` in `@/shared/files`.
 */
export function downloadServerFile(endpoint: string, params: Record<string, unknown> | undefined, fileName: string): Promise<string> {
  return apiClient.download(endpoint, params, fileName);
}
