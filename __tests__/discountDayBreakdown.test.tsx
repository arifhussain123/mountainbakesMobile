/**
 * @format
 *
 * Discount detail → "Product breakdown" — the web's Discounts → View check on
 * both sides: which URL each side calls, nothing fetched until it is opened,
 * and the match / mismatch figures it shows.
 */
const mockGet = jest.fn();
jest.mock('@/api/client', () => ({ apiClient: { get: (...args: unknown[]) => mockGet(...args) } }));

const mockTheme = {
  isDark: false,
  colors: { text: '#111', textSecondary: '#555', textFaint: '#999', border: '#ddd', surface: '#fff', primary: '#f60', success: '#0a0', danger: '#c00' },
  spacing: { sm: 8, lg: 16 },
  typography: { label: {}, body: {}, bodySmall: {} },
};
jest.mock('@/shared/theme', () => ({ useAppTheme: () => mockTheme }));
jest.mock('@/shared/ui', () => {
  const { View, Text } = require('react-native');
  return {
    Card: ({ children }: { children: unknown }) => <View>{children}</View>,
    Icon: () => null,
    LoadingSkeleton: () => <Text>loading</Text>,
    ErrorState: ({ message }: { message: string }) => <Text>{message}</Text>,
  };
});

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DiscountDayCheck } from '@/api/types';
import { DiscountDayBreakdown } from '@/features/discounts/components/DiscountDayBreakdown';

const BRANCH = '11111111-1111-1111-1111-111111111111';

function check(over: Partial<DiscountDayCheck> = {}): DiscountDayCheck {
  return {
    branchId: BRANCH,
    date: '2026-11-05',
    products: [
      { productId: 'p1', productName: 'Cream Puff', qty: 4, discount: 200 },
      { productId: 'p2', productName: 'KitKat Cake', qty: 1, discount: 300 },
    ],
    actualTotal: 500,
    claimedTotal: 500,
    difference: 0,
    matches: true,
    claims: [{ id: 'c1', demandNumber: 'DMD-1', amount: 500, status: 'pending' }],
    ...over,
  };
}

let clients: QueryClient[] = [];
afterEach(() => {
  clients.forEach((c) => c.clear());
  clients = [];
  mockGet.mockReset();
});

async function render(side: 'production' | 'branch') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  clients.push(client);
  let r!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    r = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <DiscountDayBreakdown side={side} branchId={BRANCH} date="2026-11-05" />
      </QueryClientProvider>,
    );
  });
  return r;
}

const text = (r: ReactTestRenderer.ReactTestRenderer) =>
  r.root.findAllByType(require('react-native').Text).map((t) => [].concat(t.props.children).join('')).join('\n');

async function open(r: ReactTestRenderer.ReactTestRenderer) {
  await act(async () => {
    r.root.find((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function').props.onPress();
  });
  // Let the query resolve and re-render.
  await act(async () => {
    await new Promise<void>((res) => setTimeout(res, 0));
  });
}

it('fetches nothing until opened, then calls the Production route with the branch', async () => {
  mockGet.mockResolvedValue(check());
  const r = await render('production');
  expect(mockGet).not.toHaveBeenCalled();
  await open(r);
  expect(mockGet).toHaveBeenCalledWith('/production-discounts/day-check', { branchId: BRANCH, date: '2026-11-05' });
  const t = text(r);
  expect(t).toContain('Cream Puff');
  expect(t).toContain('KitKat Cake');
  expect(t).toContain('Claimed amount matches the till');
});

it('the Branch side calls its own route and shows the Actual / Claimed / Difference gap', async () => {
  mockGet.mockResolvedValue(check({ claimedTotal: 700, difference: 200, matches: false }));
  const r = await render('branch');
  await open(r);
  expect(mockGet).toHaveBeenCalledWith('/branch-discounts/day-check', { date: '2026-11-05', branchId: BRANCH });
  const t = text(r);
  expect(t).toContain('Claimed amount does not match the till');
  expect(t).toContain('Actual amount');
  expect(t).toContain('Difference amount');
  expect(t).toContain('The branch claimed more than the till gave away.');
});

it('says so when the till gave no discounts that day', async () => {
  mockGet.mockResolvedValue(check({ products: [], actualTotal: 0, claimedTotal: 500, difference: 500, matches: false }));
  const r = await render('branch');
  await open(r);
  expect(text(r)).toContain('No discounts were given at the till on this day.');
});
