import { useCallback, useState } from 'react';
import Share from 'react-native-share';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { env } from '@/config/env';
import { getAccessToken } from '@/services/supabase/client';
import type { ReportPeriod } from '@/shared/types/report.types';

/**
 * Download a server-generated report and hand it to the share sheet.
 *
 * Uses blob-util rather than the axios client because the response is a binary
 * file, not JSON: it streams straight to disk instead of being buffered through
 * the JS bridge as a base64 string, which is what makes a large spreadsheet
 * feasible on a low-end phone.
 *
 * The token is fetched per call, never cached — the same rule the sync engine
 * follows, so a long-lived screen cannot send an expired one.
 */

export type ExportType = 'excel' | 'pdf' | 'csv';

const EXTENSION: Record<ExportType, string> = {
  excel: 'xlsx',
  pdf: 'pdf',
  csv: 'csv',
};

const MIME: Record<ExportType, string> = {
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  csv: 'text/csv',
};

export function useExportReport(): {
  exportReport: (options: { type: ExportType; period: ReportPeriod }) => Promise<void>;
  isExporting: boolean;
  error: string | null;
} {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportReport = useCallback(
    async ({ type, period }: { type: ExportType; period: ReportPeriod }) => {
      setIsExporting(true);
      setError(null);

      const filename = `mountain-bakes-report-${period}.${EXTENSION[type]}`;
      const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;

      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Your session has expired. Sign in again.');

        const response = await ReactNativeBlobUtil.config({ path, fileCache: true }).fetch(
          'GET',
          `${env.apiUrl}/api/reports/export?type=${type}&period=${period}`,
          { Authorization: `Bearer ${token}` },
        );

        const status = response.info().status;
        if (status >= 400) {
          // The body is an error payload, not a file — clean up rather than
          // leaving a broken download in the cache for the share sheet to open.
          await ReactNativeBlobUtil.fs.unlink(path).catch(() => {});
          throw new Error(
            status === 403
              ? "You don't have permission to export reports."
              : 'The report could not be generated.',
          );
        }

        await Share.open({
          url: `file://${path}`,
          type: MIME[type],
          filename,
          failOnCancel: false,
        });
      } catch (err) {
        // Share.open rejects on dismissal in some versions even with
        // failOnCancel; treat a user cancellation as a non-event.
        const message = err instanceof Error ? err.message : 'Export failed.';
        if (!/cancel/i.test(message)) setError(message);
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  return { exportReport, isExporting, error };
}
