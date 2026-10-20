import Clipboard from '@react-native-clipboard/clipboard';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import Share from 'react-native-share';
import { logger } from '@/shared/utils';

/**
 * The phone's side of the web's file handling: share a downloaded file, pick
 * one to upload, copy text. Downloads themselves are `apiClient.download`
 * (they need the session's token).
 */

export const MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  pdf: 'application/pdf',
} as const;

export type FileKind = keyof typeof MIME;

/** `report.xlsx` → `xlsx`; anything unknown is treated as CSV text. */
export function fileKindOf(fileName: string): FileKind {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext === 'xlsx' || ext === 'pdf' ? ext : 'csv';
}

/**
 * Opens the Android share sheet on a local file — Drive, Files, WhatsApp,
 * Gmail, a PDF viewer's Print. Closing the sheet is not an error.
 */
export async function shareFile(path: string, fileName: string, title?: string): Promise<void> {
  await Share.open({
    url: path.startsWith('file://') ? path : `file://${path}`,
    type: MIME[fileKindOf(fileName)],
    filename: fileName.replace(/\.[^.]+$/, ''),
    title: title ?? fileName,
    failOnCancel: false,
  });
}

/** What a multipart upload needs — React Native's FormData reads this `{ uri, name, type }` shape. */
export interface PickedFile {
  uri: string;
  name: string;
  type: string;
  size: number | null;
}

/** Excel or CSV, as the web's `accept=".xlsx,.csv"`. */
const SPREADSHEET_TYPES = [types.xlsx, types.xls, ...types.csv];

/** Lets the user choose one spreadsheet. `null` when they back out. */
export async function pickSpreadsheet(): Promise<PickedFile | null> {
  try {
    const [file] = await pick({ type: SPREADSHEET_TYPES });
    const name = file.name ?? 'import.xlsx';
    return { uri: file.uri, name, type: file.type ?? MIME[fileKindOf(name)], size: file.size ?? null };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return null;
    logger.error('document pick failed', error);
    throw error;
  }
}

export function copyToClipboard(text: string): void {
  Clipboard.setString(text);
}

export { writeTextFile } from './textFile';
