/**
 * The web's table Export menu (`data-engine/ExportMenu.tsx`) on the phone.
 * The server builds the file from the list's own query
 * (`GET /data/:resource/export?scope=page|all&format=csv`), so the columns,
 * cell formats and the 10,000-row ceiling are the web's by construction —
 * only the hand-off differs: CSV text into the Share sheet. Excel needs a
 * binary file, which this app cannot share, so those items show disabled.
 */

/** Said beside every Excel / PDF item the phone cannot produce. */
export const EXCEL_ON_WEB = 'Excel files are made on the web';
export const PDF_ON_WEB = 'PDF files are made on the web';

/** The web's file name: `<fileName>-<YYYY-MM-DD>.csv`, `fileName` defaulting to `mountain-bakes-<resource>`. */
export function exportFileTitle(resource: string, fileName: string | undefined, now: Date = new Date()): string {
  return `${fileName ?? `mountain-bakes-${resource}`}-${now.toISOString().slice(0, 10)}.csv`;
}

/**
 * The phone's "current page" is every page the list has loaded (it scrolls
 * rather than pages), so it is fetched page by page with `scope=page` — the
 * same rows, built by the same server code — and joined here: the first
 * page whole, each later one without its header line. A page with no rows
 * adds nothing.
 */
export function mergeCsvPages(pages: string[]): string {
  const [first, ...rest] = pages.map((p) => p.replace(/\r?\n$/, ''));
  if (first === undefined) return '';
  const bodies = rest
    .map((p) => {
      const i = p.indexOf('\n');
      return i < 0 ? '' : p.slice(i + 1);
    })
    .filter((b) => b.length > 0);
  return [first, ...bodies].join('\n');
}

/** The Export button is dead when there is nothing to export (web: no rows on the page and a total of 0). */
export function canExport(loaded: number, total: number | null | undefined): boolean {
  return loaded > 0 || (total ?? 0) > 0;
}

/** "Export all 1,234 results" — or without the count until the total is known. */
export function exportAllLabel(total: number | null | undefined): string {
  return total !== undefined && total !== null ? `Export all ${total.toLocaleString('en-US')} results` : 'Export all results';
}

/**
 * Collections export file name — named after the window AND the branch, as
 * the web names it: `mountain-bakes-collections-<all-branches|branch-slug>-<from>[_to_<to>].csv`.
 */
export function collectionsFileName(from: string, to: string, branchName: string | null): string {
  const window = from === to ? from : `${from}_to_${to}`;
  const who = branchName === null ? 'all-branches' : (branchName || 'branch').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `mountain-bakes-collections-${who}-${window}.csv`;
}

/** The Collections window, put in order and clamped to today (the web's date inputs cap at today, `from ≤ to`). */
export function collectionsWindow(from: string, to: string, today: string): { from: string; to: string } {
  const a = (from || today) > today ? today : from || today;
  const b = (to || today) > today ? today : to || today;
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}
