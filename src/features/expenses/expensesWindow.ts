import { format, parseISO } from 'date-fns';

/**
 * "This month · 1–18 Oct" / "This month · 1 Oct" — Shop Expenses' window, the
 * 1st of the business month through today (both 'YYYY-MM-DD').
 */
export function describeExpensesWindow(from: string, to: string): string {
  const end = format(parseISO(to), 'd MMM');
  return from === to ? `This month · ${end}` : `This month · ${format(parseISO(from), 'd')}–${end}`;
}
