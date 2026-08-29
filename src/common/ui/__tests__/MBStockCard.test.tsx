import React from 'react';

import { renderScreen } from '@/common/test-utils/render';
import { MBStockCard } from '../cards/MBStockCard';
import type { StockRow } from '@/shared/types/stock.types';

/**
 * The Waiting / Expected pair, and the distinction the whole thing rests on.
 *
 * `waiting` is three-state — not drawn, unknown, or a number — because zero and
 * unknown are different answers that look identical if either is allowed to
 * stand in for the other. A shop told "0 waiting" reads it as "Production owes
 * us nothing"; if that same cell were also what a failed request drew, the
 * screen would state a fact nobody had established, and Expected would silently
 * equal the balance.
 */

const ROW: StockRow = {
  productId: 'p1',
  stockCode: 'STK-000001',
  productName: 'Milk Rusk',
  isActive: true,
  opening: 100,
  newQty: 50,
  sold: 30,
  returned: 5,
  adjustment: -2,
  balance: 113,
};

const noop = (): void => undefined;

describe('MBStockCard — waiting and expected', () => {
  it('draws neither cell when the caller does not supply the figure', async () => {
    const { queryByText } = await renderScreen(
      <MBStockCard row={ROW} expanded onToggle={noop} />,
    );

    // A screen that cannot ask the question must not draw a blank where the
    // answer goes — the older movement cells are still there.
    expect(queryByText('Waiting')).toBeNull();
    expect(queryByText('Expected')).toBeNull();
    expect(queryByText('Opening')).toBeTruthy();
  });

  it('draws a dash for both when the figure was asked for and is unknown', async () => {
    const { getByText, getAllByText } = await renderScreen(
      <MBStockCard row={ROW} expanded onToggle={noop} waiting={null} />,
    );

    expect(getByText('Waiting')).toBeTruthy();
    expect(getByText('Expected')).toBeTruthy();
    // An em dash, twice — and crucially not a "0".
    expect(getAllByText('—')).toHaveLength(2);
    // The balance still appears ONCE, in the headline. Expected must not add a
    // second copy of it: an unknown waiting figure makes Expected unknowable,
    // and quietly echoing the balance there would assert that nothing is coming.
    expect(getAllByText('113')).toHaveLength(1);
  });

  it('states a real zero rather than hiding it, and expects the balance itself', async () => {
    const { getByText, getAllByText, queryByText } = await renderScreen(
      <MBStockCard row={ROW} expanded onToggle={noop} waiting={0} />,
    );

    // Zero waiting is a useful thing to be told: Production owes nothing.
    expect(getByText('Waiting')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
    expect(queryByText('—')).toBeNull();
    // balance + 0 — so 113 now appears twice: the headline and Expected.
    expect(getAllByText('113')).toHaveLength(2);
  });

  it('derives expected as balance + waiting', async () => {
    const { getByText } = await renderScreen(
      <MBStockCard row={ROW} expanded onToggle={noop} waiting={12} />,
    );

    expect(getByText('12')).toBeTruthy();
    // 113 + 12, computed on the device and never sent by the server.
    expect(getByText('125')).toBeTruthy();
  });

  it('keeps both cells behind the disclosure, like every other movement', async () => {
    const { queryByText } = await renderScreen(
      <MBStockCard row={ROW} expanded={false} onToggle={noop} waiting={12} />,
    );

    expect(queryByText('Waiting')).toBeNull();
    expect(queryByText('Expected')).toBeNull();
  });
});
