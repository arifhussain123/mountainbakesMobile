/**
 * Small rules around the web's table Export menu (`data-engine/ExportMenu.tsx`)
 * and the Collections export. The files themselves are the server's — see
 * `fileExports.ts` for the requests and file names.
 */

/** The Export button is dead when there is nothing to export (web: no rows on the page and a total of 0). */
export function canExport(loaded: number, total: number | null | undefined): boolean {
  return loaded > 0 || (total ?? 0) > 0;
}

/** "Export all 1,234 results" — or without the count until the total is known. */
export function exportAllLabel(total: number | null | undefined): string {
  return total !== undefined && total !== null ? `Export all ${total.toLocaleString('en-US')} results` : 'Export all results';
}

/** The Collections window, put in order and clamped to today (the web's date inputs cap at today, `from ≤ to`). */
export function collectionsWindow(from: string, to: string, today: string): { from: string; to: string } {
  const a = (from || today) > today ? today : from || today;
  const b = (to || today) > today ? today : to || today;
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}
