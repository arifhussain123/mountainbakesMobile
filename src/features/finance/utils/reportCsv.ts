import type { FinanceReport } from '@/api/types';

/**
 * A report as CSV, built from exactly what the screen shows.
 *
 * Built here rather than downloaded from `/finance/reports/export`: the
 * server's Daily Cash Book export still carries the posting-order balance
 * (see cashBookBalance.ts), so the only CSV guaranteed to match the screen is
 * one made from the screen's own rows. `balances`, when given, replaces the
 * Balance column row for row; null writes an empty cell (a filtered book).
 */

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const money = (n: number) => n.toFixed(2);

export function reportToCsv(report: FinanceReport, balances?: (number | null)[]): string {
  const cols = report.columns;
  const lines: string[] = [
    cell(`Mountain Bakes · ${report.title}`),
    cell(`Period ${report.periodFrom === report.periodTo ? report.periodFrom : `${report.periodFrom} to ${report.periodTo}`}`),
    cell(`Generated ${report.generatedAt} by ${report.generatedBy}`),
    '',
  ];
  for (const s of report.summary) lines.push([cell(s.label), s.format === 'money' ? money(s.value) : cell(s.value)].join(','));
  if (report.summary.length) lines.push('');

  lines.push(cols.map((c) => cell(c.label)).join(','));
  report.rows.forEach((row, i) => {
    lines.push(
      cols
        .map((c) => {
          const raw = c.key === 'balance' && balances ? balances[i] ?? null : row[c.key] ?? null;
          return c.format === 'money' && typeof raw === 'number' ? money(raw) : cell(raw);
        })
        .join(','),
    );
  });
  if (Object.keys(report.totals).length) {
    lines.push(
      cols
        .map((c, i) => {
          const t = report.totals[c.key];
          if (t !== undefined) return money(t);
          return i === 0 ? 'Total' : '';
        })
        .join(','),
    );
  }
  return lines.join('\n');
}
