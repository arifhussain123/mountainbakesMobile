import { apiClient } from '../client';
import type { ImportCommitResult, ImportPreviewResult, PriceImportCommitInput } from '../types';

/** What the multipart part needs — the `{ uri, name, type }` a picked file already has. */
export interface PriceImportFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * Web `previewImport` — `POST /api/products/price/import/preview`, multipart
 * field `file`. The server parses and validates the sheet and NEVER writes, so
 * the operator sees exactly what will change before committing. Super Admin only.
 */
export async function previewPriceImport(file: PriceImportFile): Promise<ImportPreviewResult> {
  const form = new FormData();
  // React Native's FormData takes this {uri,type,name} shape for a file part (see attachmentService).
  form.append('file', { uri: file.uri, type: file.type, name: file.name } as unknown as Blob);
  return apiClient.post<ImportPreviewResult>('/products/price/import/preview', form);
}

/**
 * Web `saveImport` — `POST /api/products/price/import/commit` with the
 * confirmed rows. Today or an earlier date applies now; a future one is
 * scheduled for that business day.
 */
export async function commitPriceImport(input: PriceImportCommitInput): Promise<ImportCommitResult> {
  return apiClient.post<ImportCommitResult>('/products/price/import/commit', input);
}
