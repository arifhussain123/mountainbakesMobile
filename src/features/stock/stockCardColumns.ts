import { formatSigned } from '@/shared/utils';
import type { StockRowWithDemand } from './calculations';

/** How a figure is colored: green for a positive movement, red for anything negative, the plain text color otherwise. */
export type StockFigureTone = 'positive' | 'negative' | 'neutral';

export interface StockCardColumn {
  key: 'opening' | 'newQty' | 'sold' | 'returned' | 'adjustment' | 'waitingDemand' | 'expectedBalance';
  label: string;
  /** Short label for the accessibility read-out. */
  spokenLabel: string;
  value: string;
  tone: StockFigureTone;
}

/** A level (opening, waiting, expected, stock) is only ever flagged when it has gone negative — a positive level is not a "gain". */
function levelTone(value: number): StockFigureTone {
  return value < 0 ? 'negative' : 'neutral';
}

/** A movement is colored by the sign it is displayed with (sold/returned are shown as negatives). */
function movementTone(signed: number): StockFigureTone {
  if (signed > 0) return 'positive';
  if (signed < 0) return 'negative';
  return 'neutral';
}

/**
 * The stock card's seven columns, in the fixed order Opening Stock → New Stock
 * → Sold → Return → Adjust → Waiting → Expected. Display only: every number
 * is the row's own field (`expectedBalance` is still `balance + waitingDemand`
 * from `withExpectedBalance`), and the signs match the old movement line —
 * sold and returned shown as negatives via `formatSigned`, so a zero always
 * reads "0", never "+0"/"-0".
 */
export function stockCardColumns(row: StockRowWithDemand): StockCardColumn[] {
  return [
    { key: 'opening', label: 'Opening Stock', spokenLabel: 'opening stock', value: String(row.opening), tone: levelTone(row.opening) },
    { key: 'newQty', label: 'New Stock', spokenLabel: 'new stock', value: formatSigned(row.newQty), tone: movementTone(row.newQty) },
    { key: 'sold', label: 'Sold', spokenLabel: 'sold', value: formatSigned(-row.sold), tone: movementTone(-row.sold) },
    { key: 'returned', label: 'Return', spokenLabel: 'returned', value: formatSigned(-row.returned), tone: movementTone(-row.returned) },
    { key: 'adjustment', label: 'Adjust', spokenLabel: 'adjustment', value: formatSigned(row.adjustment), tone: movementTone(row.adjustment) },
    { key: 'waitingDemand', label: 'Waiting', spokenLabel: 'waiting', value: String(row.waitingDemand), tone: levelTone(row.waitingDemand) },
    { key: 'expectedBalance', label: 'Expected', spokenLabel: 'expected', value: String(row.expectedBalance), tone: levelTone(row.expectedBalance) },
  ];
}

/** The card's "Stock" line — the row's live `balance`. */
export function stockBalanceTone(balance: number): StockFigureTone {
  return levelTone(balance);
}
