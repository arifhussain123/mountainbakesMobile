/**
 * @format
 *
 * The mobile Production Dashboard's two column charts — the web dashboard's
 * Branch-wise summary and Current stock (`frontend/.../dashboard/charts.tsx`),
 * drawn as upright columns. Rules as pure functions, the two requests, and the
 * components rendered (heights, order, tap-to-filter, marks).
 */
const mockGet = jest.fn();
jest.mock('@/api/client', () => ({ apiClient: { get: (...args: unknown[]) => mockGet(...args) } }));

const mockTheme = {
  isDark: false,
  colors: { text: '#111', textSecondary: '#555', border: '#ddd' },
  typography: { label: { fontSize: 11 } },
};
jest.mock('@/shared/theme', () => ({ useAppTheme: () => mockTheme }));

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ProductionBranchSummaryRow, ProductionCurrentStockRow } from '@/api';
import { getProductionBranchSummary, getProductionCurrentStock } from '@/api/services/productionOverviewService';
import { queryKeys } from '@/api/queryKeys';
import { BranchGroupedColumns } from '@/features/production/components/BranchGroupedColumns';
import { StockColumns } from '@/features/production/components/StockColumns';
import {
  COLUMN_PLOT_HEIGHT,
  branchColumnLabel,
  columnHeight,
  columnScaleMax,
  compactUnits,
  dashboardChartColors,
  stockColumnLabel,
  stockColumnParts,
} from '@/features/production/dashboardColumns';

const branch = (id: string, branchName: string, demanded: number, delivered: number, returned: number): ProductionBranchSummaryRow => ({
  branchId: id, branchName, demanded, delivered, returned, fulfilment: demanded ? (delivered / demanded) * 100 : null,
});
const product = (id: string, name: string, production: number, branchQty: number, state: ProductionCurrentStockRow['state'] = 'ok'): ProductionCurrentStockRow => ({
  productId: id, productName: name, production, branch: branchQty, total: Math.max(production, 0) + Math.max(branchQty, 0), state,
});

const BRANCHES = [
  branch('a', 'Alabad Branch', 1190, 1170, 2),
  branch('c', 'Committee Chowk Branch', 1013, 929, 8),
  branch('z', 'Banigala Stall', 0, 0, 0),
];

const heightOf = (r: ReactTestRenderer.ReactTestRenderer, testID: string) => {
  const style = [r.root.findByProps({ testID }).props.style].flat(Infinity) as { height?: number }[];
  return style.reduce<number | undefined>((h, s) => (s && s.height !== undefined ? s.height : h), undefined);
};

beforeEach(() => mockGet.mockReset());

describe('requests', () => {
  it('asks for the Branch-wise section by period only — every branch, never the filter', async () => {
    mockGet.mockResolvedValue({ series: [] });
    await getProductionBranchSummary('month');
    expect(mockGet).toHaveBeenCalledWith('/production/dashboard/branch-summary', { period: 'month' });
  });

  it('asks for current stock by branch only — stock right now, never a period', async () => {
    mockGet.mockResolvedValue({ series: [] });
    await getProductionCurrentStock(null);
    expect(mockGet).toHaveBeenLastCalledWith('/production/dashboard/current-stock', undefined);
    await getProductionCurrentStock('b1');
    expect(mockGet).toHaveBeenLastCalledWith('/production/dashboard/current-stock', { branchId: 'b1' });
  });

  it('keys follow the same rule', () => {
    expect(queryKeys.productionBranchSummary('week')).toEqual(['productionBranchSummary', 'week']);
    expect(queryKeys.productionCurrentStock('b1')).toEqual(['productionCurrentStock', 'b1']);
  });
});

describe('column rules', () => {
  it('scales to the largest value, never below 1', () => {
    expect(columnScaleMax([0, 0])).toBe(1);
    expect(columnScaleMax([1190, 1170, 2])).toBe(1190);
  });

  it('draws nothing for nothing, and any real amount at least 2pt tall', () => {
    expect(columnHeight(0, 100)).toBe(0);
    expect(columnHeight(-5, 100)).toBe(0);
    expect(columnHeight(100, 100)).toBe(COLUMN_PLOT_HEIGHT);
    expect(columnHeight(1, 10_000)).toBe(2);
  });

  it('labels a branch by its demand, and never with a 0', () => {
    expect(branchColumnLabel(BRANCHES[0]!)).toBe('1.2k');
    expect(branchColumnLabel(BRANCHES[2]!)).toBeNull();
    expect(compactUnits(331)).toBe('331');
    expect(compactUnits(1000)).toBe('1k');
  });

  it('labels stock with its exact total, a ▲ when low, "Out" when out', () => {
    expect(stockColumnLabel(product('p', 'Cream Puff', 5600, 4400))).toEqual({ text: '10,000', mark: null });
    expect(stockColumnLabel(product('p', 'Rusk', 6, 2, 'low'))).toEqual({ text: '8', mark: 'low' });
    expect(stockColumnLabel(product('p', 'Cake', 0, 0, 'out'))).toEqual({ text: 'Out', mark: 'out' });
  });

  it('draws a negative production pool as nothing', () => {
    expect(stockColumnParts(product('p', 'X', -40, 12))).toEqual({ production: 0, branch: 12 });
  });

  it('uses the web dashboard colours, light and dark', () => {
    expect(dashboardChartColors(false).demand).toBe('#E04F1A');
    expect(dashboardChartColors(true).demand).toBe('#D24100');
    expect(dashboardChartColors(false).branchStock).toBe(dashboardChartColors(false).delivered);
  });
});

describe('BranchGroupedColumns', () => {
  it('draws the branches left to right in the server order, three columns each, tallest on the scale', () => {
    let r!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      r = ReactTestRenderer.create(<BranchGroupedColumns rows={BRANCHES} selectedId={null} onSelect={() => {}} />);
    });
    // Pressable passes its testID to the view inside it, so take the pressable layer only.
    const groups = r.root.findAll((n) => typeof n.props.testID === 'string' && /^branch-columns-/.test(n.props.testID) && typeof n.props.onPress === 'function');
    expect(groups.map((g) => g.props.testID)).toEqual(['branch-columns-a', 'branch-columns-c', 'branch-columns-z']);
    expect(heightOf(r, 'branch-column-a-demanded')).toBe(COLUMN_PLOT_HEIGHT);
    expect(heightOf(r, 'branch-column-c-demanded')).toBe(Math.round((1013 / 1190) * COLUMN_PLOT_HEIGHT));
    expect(heightOf(r, 'branch-column-z-demanded')).toBe(0);
    const texts = r.root.findAllByType('Text' as never).map((t) => t.props.children).flat();
    expect(texts).toEqual(expect.arrayContaining(['1.2k', '1k', 'Alabad Branch', 'Committee Chowk Branch', 'Demanded', 'Delivered', 'Returned']));
    expect(texts).not.toContain('0');
    ReactTestRenderer.act(() => r.unmount());
  });

  it('a tap filters the dashboard to that branch, and the others dim', () => {
    const onSelect = jest.fn();
    let r!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      r = ReactTestRenderer.create(<BranchGroupedColumns rows={BRANCHES} selectedId="c" onSelect={onSelect} />);
    });
    const group = (id: string) => r.root.find((n) => n.props.testID === `branch-columns-${id}` && typeof n.props.onPress === 'function');
    ReactTestRenderer.act(() => group('a').props.onPress());
    expect(onSelect).toHaveBeenCalledWith('a');
    expect(group('c').props.accessibilityState).toEqual({ selected: true });
    expect([group('a').props.style].flat().find((s: { opacity?: number }) => s && s.opacity !== undefined).opacity).toBe(0.3);
    expect(group('a').props.accessibilityLabel).toBe('Alabad Branch: Demanded 1,190, Delivered 1,170, Returned 2, Fulfilment 98.3%');
    ReactTestRenderer.act(() => r.unmount());
  });
});

describe('StockColumns', () => {
  const STOCK = [
    product('cp', 'Cream Puff', 5600, 4400),
    product('rk', 'Rusk', 6, 2, 'low'),
    product('pc', 'Pineapple Cake 1 lb', 0, 0, 'out'),
  ];

  it('stacks production under branch stock, the two parts adding up to the column', () => {
    let r!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      r = ReactTestRenderer.create(<StockColumns rows={STOCK} threshold={10} />);
    });
    const prod = heightOf(r, 'stock-column-cp-production')!;
    const shelf = heightOf(r, 'stock-column-cp-branch')!;
    expect(prod + shelf).toBe(COLUMN_PLOT_HEIGHT);
    expect(prod).toBe(Math.round(0.56 * COLUMN_PLOT_HEIGHT));
    // Out of stock draws no column at all.
    expect(r.root.findAll((n) => n.props.testID === 'stock-column-pc-production')).toHaveLength(0);
    const texts = r.root.findAllByType('Text' as never).map((t) => t.props.children).flat(Infinity);
    expect(texts).toEqual(expect.arrayContaining(['10,000', '▲ ', '8', '● ', 'Out', 'Low (< 10)']));
    ReactTestRenderer.act(() => r.unmount());
  });

  it('repaints a low product amber, both parts', () => {
    // On a scale where the low product is tall enough for both parts to draw
    // (beside a 10,000 one it is the 2pt minimum, and its branch part rounds away).
    const rows = [product('cp', 'Cream Puff', 10, 0), product('rk', 'Rusk', 6, 2, 'low')];
    let r!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      r = ReactTestRenderer.create(<StockColumns rows={rows} threshold={10} />);
    });
    const fill = (id: string) =>
      ([r.root.findByProps({ testID: id }).props.style].flat(Infinity) as { backgroundColor?: string }[]).reduce<string | undefined>(
        (c, s) => (s && s.backgroundColor ? s.backgroundColor : c),
        undefined,
      );
    expect(fill('stock-column-rk-production')).toBe(dashboardChartColors(false).lowStock);
    expect(fill('stock-column-rk-branch')).toBe(dashboardChartColors(false).lowStock);
    expect(fill('stock-column-cp-production')).toBe(dashboardChartColors(false).productionStock);
    ReactTestRenderer.act(() => r.unmount());
  });
});
