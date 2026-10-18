import type { ProductionBranchSummaryRow, ProductionCurrentStockRow } from '@/api';

/**
 * Rules for the Production Dashboard's two column charts — the same charts the
 * web dashboard draws (`frontend/src/components/production/dashboard/charts.tsx`
 * `BranchGroupedBars` / `StockBars`), laid out for a phone. Pure, so the
 * components only draw.
 */

/**
 * The web's `--dash-*` colours (`frontend/src/app/globals.css`), light and
 * dark. A meaning keeps its colour across every chart: orange is always
 * demand, gold always delivered. Fixed, never the user's accent, so a chart's
 * meaning never shifts with a colour preference.
 */
const PALETTE = {
  light: {
    demand: '#E04F1A',
    delivered: '#D3AD1B',
    returned: '#8C352D',
    productionStock: '#7E3E1B',
    branchStock: '#D3AD1B',
    lowStock: '#DC8900',
    outOfStock: '#CC2827',
  },
  dark: {
    demand: '#D24100',
    delivered: '#C39227',
    returned: '#9C2E5A',
    productionStock: '#A04F27',
    branchStock: '#B58D47',
    lowStock: '#ED990E',
    outOfStock: '#F14D4C',
  },
} as const;

export type DashboardChartColors = { [K in keyof (typeof PALETTE)['light']]: string };

export function dashboardChartColors(isDark: boolean): DashboardChartColors {
  return isDark ? PALETTE.dark : PALETTE.light;
}

/** Plot height of both charts, in points; labels and names sit outside it. */
export const COLUMN_PLOT_HEIGHT = 170;
/** Width of a branch's group of three columns; past what the screen holds the chart scrolls sideways. */
export const BRANCH_GROUP_WIDTH = 84;
/** Width of a product's stacked column, its name included. */
export const STOCK_COLUMN_WIDTH = 64;

/** "1.2k" — the web's `compact`, for figures drawn on a chart where room is short. */
export function compactUnits(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (a >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(n * 10) / 10);
}

/** "3,948" — the web's `fmt`. */
export function formatUnits(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

/** The scale's top: the largest value drawn, never below 1 so an all-zero chart divides safely. */
export function columnScaleMax(values: number[]): number {
  return Math.max(1, ...values.map((v) => (Number.isFinite(v) ? v : 0)));
}

/**
 * A column's height on that scale. Nothing (or a negative) draws nothing; any
 * real amount draws at least 2pt, so a small figure is still visible next to
 * a large one.
 */
export function columnHeight(value: number, max: number, plotHeight = COLUMN_PLOT_HEIGHT): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(2, Math.round((value / Math.max(1, max)) * plotHeight));
}

/** The shared prefix dropped from every branch name, as the web's `shortBranch` does. */
export const shortBranchName = (name: string) => name.replace('Mountain Bakes ', '');

/**
 * The figure written above a branch's columns: its demand, the figure the
 * branches are ranked by. None at zero — the dashboard never draws "0" labels.
 */
export function branchColumnLabel(row: ProductionBranchSummaryRow): string | null {
  return row.demanded > 0 ? compactUnits(row.demanded) : null;
}

/** "Demanded 1,190 · Delivered 1,170 · Returned 2 · Fulfilment 98.3%" — what the web's tooltip states. */
export function describeBranchColumns(row: ProductionBranchSummaryRow): string {
  const fulfilment = row.fulfilment === null ? '—' : `${row.fulfilment.toFixed(1)}%`;
  return `${shortBranchName(row.branchName)}: Demanded ${formatUnits(row.demanded)}, Delivered ${formatUnits(row.delivered)}, Returned ${formatUnits(row.returned)}, Fulfilment ${fulfilment}`;
}

export interface StockColumnParts {
  /** Production stock drawn from zero — the column's lower part. */
  production: number;
  /** Branch stock drawn from zero — stacked on top. */
  branch: number;
}

/** A negative pool is drawn as nothing, as on the web; the total is already counted from zero. */
export function stockColumnParts(row: ProductionCurrentStockRow): StockColumnParts {
  return { production: Math.max(row.production, 0), branch: Math.max(row.branch, 0) };
}

/**
 * The label above a product's column. Status is never colour alone: out of
 * stock reads "Out" with a ● mark, low stock gets a ▲ mark beside its exact
 * total, anything else is the exact total.
 */
export function stockColumnLabel(row: ProductionCurrentStockRow): { text: string; mark: 'low' | 'out' | null } {
  if (row.state === 'out') return { text: 'Out', mark: 'out' };
  return { text: formatUnits(row.total), mark: row.state === 'low' ? 'low' : null };
}

/** "Cream Puff: production 5,600, branch 4,400, total 10,000" — what the web's tooltip states. */
export function describeStockColumn(row: ProductionCurrentStockRow): string {
  const state = row.state === 'out' ? 'out of stock' : row.state === 'low' ? `low stock, total ${formatUnits(row.total)}` : `total ${formatUnits(row.total)}`;
  return `${row.productName}: production stock ${formatUnits(row.production)}, branch stock ${formatUnits(row.branch)}, ${state}`;
}
