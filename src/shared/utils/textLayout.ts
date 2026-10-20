/**
 * Fixed-width plain-text layout for the documents the app "prints" through
 * the Share sheet (there is no printer SDK — Android routes the text to a
 * print service, RawBT, or any app). Every line is laid out to a column
 * count so a monospace printer keeps the figures aligned: 48 on an 80mm roll,
 * 32 on 58mm, 64 for an A4 sheet's text rendition.
 *
 * Pure string work — no React, no API — so every document built on it can be
 * unit-tested line by line.
 */

export type TextPaper = '80mm' | '58mm' | 'a4';

/** Characters per line — 80mm rolls fit 48 at the printer's standard font, 58mm rolls 32. */
export const TEXT_COLUMNS: Record<TextPaper, number> = { '80mm': 48, '58mm': 32, a4: 64 };

/** Word-wraps to `width`, hard-breaking any single word longer than a line. */
export function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of String(text ?? '').trim().split(/\s+/)) {
    let rest = word;
    while (rest.length > width) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(rest.slice(0, width));
      rest = rest.slice(width);
    }
    if (!rest) continue;
    if (!current) current = rest;
    else if (current.length + 1 + rest.length <= width) current = `${current} ${rest}`;
    else {
      lines.push(current);
      current = rest;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

export function centerText(text: string, width: number): string[] {
  return wrapText(text, width).map((line) => ' '.repeat(Math.max(0, Math.floor((width - line.length) / 2))) + line);
}

/** Label left, value right-aligned on the label's last line; a long label wraps rather than overflowing. */
export function kvLine(label: string, value: string, width: number): string[] {
  const labelWidth = width - value.length - 1;
  // Too little room beside the value to read — the label takes the whole
  // width and the value drops onto its own right-aligned line.
  if (labelWidth < 8) return [...wrapText(label, width), ...wrapText(value, width).map((v) => v.padStart(width))];
  const lines = wrapText(label, labelWidth);
  const last = lines.length - 1;
  lines[last] = lines[last].padEnd(labelWidth) + ' ' + value;
  return lines;
}

export function ruleLine(width: number, dashed = false): string {
  return dashed ? '- '.repeat(Math.ceil(width / 2)).slice(0, width) : '-'.repeat(width);
}

export interface TextColumn {
  header: string;
  /** Characters; the FIRST column takes whatever the others leave. */
  width?: number;
  align?: 'left' | 'right';
}

/**
 * A table: the first column wraps, the rest are fixed and (by default)
 * right-aligned figures. A figure wider than its column is never cut — it
 * pushes the line long rather than printing a wrong number.
 */
export function textTable(columns: TextColumn[], rows: string[][], width: number): string[] {
  return [...textRow(columns, columns.map((c) => c.header), width), ruleLine(width), ...rows.flatMap((r) => textRow(columns, r, width))];
}

/** One row laid out to `textTable`'s columns — for a Totals line under a table. */
export function textRow(columns: TextColumn[], cells: string[], width: number): string[] {
  const fixed = columns.slice(1).reduce((n, c) => n + (c.width ?? 8) + 1, 0);
  const firstWidth = Math.max(6, width - fixed);
  const first = wrapText(cells[0] ?? '', firstWidth);
  const rest = columns.slice(1).map((c, i) => {
    const v = cells[i + 1] ?? '';
    const w = c.width ?? 8;
    return c.align === 'left' ? v.padEnd(w) : v.padStart(w);
  });
  const lastIdx = first.length - 1;
  return first.map((line, i) => (i === lastIdx ? [line.padEnd(firstWidth), ...rest].join(' ') : line));
}

/** Joins the document, trimming the padding each line carries on its right. */
export function joinLines(lines: string[]): string {
  return lines.map((line) => line.trimEnd()).join('\n');
}

/** `1,234` — rounded, thousands-separated, no symbol (the web receipts' `num`). */
export function numText(value: number): string {
  return Math.round(Number(value) || 0).toLocaleString('en-US');
}
