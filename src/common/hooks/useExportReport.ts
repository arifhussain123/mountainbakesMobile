import { useCallback, useState } from 'react';
import Share from 'react-native-share';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { env } from '@/config/env';
import { getAccessToken } from '@/api/supabase/client';
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
 *
 * Lives in `common/` because two features export the same report over the same
 * endpoint: the admin Reports index for whatever range is filtered there, and
 * Sales vs Expenses for the calendar period on screen. `/api/reports/export` is
 * mounted behind `requireRole('super_admin', 'branch_manager')` — the same two
 * roles that can reach either screen — so there is no capability difference
 * between the callers, only a different window.
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

/**
 * The window and scope to export, which must be the ones on screen.
 *
 * `from`/`to` are not optional decoration: the server's `getDateRange()` ignores
 * them for its four named periods and uses them for everything else, so a custom
 * range that does not forward them exports **the current month** while the
 * screen shows the fortnight the user picked. The file is what gets mailed to
 * head office; a filename that says `custom` over month-to-date figures is a
 * wrong number with a paper trail.
 */
export interface ExportScope {
  type: ExportType;
  period: ReportPeriod;
  /** ISO bounds, for a custom period. Ignored by the server for named periods. */
  from?: string;
  to?: string;
  /** Admin scoping only — a branch manager is scoped by their token and must not send it. */
  branchId?: string;
}

export function useExportReport(): {
  exportReport: (scope: ExportScope) => Promise<void>;
  isExporting: boolean;
  error: string | null;
} {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportReport = useCallback(
    async ({ type, period, from, to, branchId }: ExportScope) => {
      setIsExporting(true);
      setError(null);

      // A custom export is named for the window it covers, not for the word
      // "custom" — three of those in a downloads folder are indistinguishable.
      const stamp = period === 'custom' && from && to ? `${day(from)}_${day(to)}` : period;
      const filename = `mountain-bakes-report-${stamp}.${EXTENSION[type]}`;
      const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;

      // Built rather than interpolated: `from`/`to` are ISO timestamps whose `+`
      // and `:` are not safe raw in a query string.
      const params = new URLSearchParams({ type, period });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (branchId) params.set('branchId', branchId);
      const query = params.toString();

      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Your session has expired. Sign in again.');

        const response = await ReactNativeBlobUtil.config({
          path,
          fileCache: true,
        }).fetch('GET', `${env.apiUrl}/api/reports/export?${query}`, {
          Authorization: `Bearer ${token}`,
        });

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

/** `2026-08-19T…` → `2026-08-19`, for a filename. */
function day(iso: string): string {
  return iso.slice(0, 10);
}
