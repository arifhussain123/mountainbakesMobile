import React from 'react';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@/services/api/productionApi', () => ({
  getPreviousBalance: jest.fn(),
  markPrinted: jest.fn(async () => undefined),
}));

// The slip reads the currency symbol through useCatalogSettings, which is a
// second query on the same mount. Left unmocked it calls the real catalog API,
// so the suite attempts a live HTTP request and then settles — long after the
// test that triggered it has finished — which is what React was reporting as an
// update outside act(). Nothing here asserts on the symbol; the mock exists to
// keep the mount self-contained.
jest.mock('@/services/api/catalogApi', () => ({
  getSettings: jest.fn(async () => ({ currencySymbol: 'Rs.', gstEnabled: false, gstRate: 0 })),
}));

import { getPreviousBalance } from '@/services/api/productionApi';
import type { BranchProductionOrder } from '@/shared/types/production-order.types';
import { renderScreen } from '@/test-utils/render';
import { OrderPrintPreview } from '../OrderPrintPreview';

const mockBalance = getPreviousBalance as jest.Mock;

const ORDER = {
  id: 'o1',
  demandNumber: 'DMD-000042',
  branchId: 'b1',
  branchName: 'Saddar',
  date: '2026-08-19',
  time: '09:30',
  requiredDate: '2026-08-20',
  items: [
    { productId: 'p1', productName: 'Milk Rusk', qty: 20, approvedQty: 15 },
    { productId: 'p2', productName: 'Cake Rusk', qty: 10, approvedQty: 10 },
  ],
  status: 'delivered',
  createdBy: 'u1',
  createdByName: 'Ayesha',
  submittedAt: '2026-08-19T04:30:00.000Z',
} as unknown as BranchProductionOrder;

beforeEach(() => {
  jest.clearAllMocks();
  mockBalance.mockResolvedValue({
    amountToCollect: 8400,
    deliveredValue: 12000,
    returnsValue: 1500,
    companySharePct: 80,
  });
});

/**
 * Renders the slip and lets the on-mount previous-balance query settle.
 *
 * Every test needs that flush, including the ones that assert nothing about
 * money: the query resolves on a later tick, so a test that asserts
 * synchronously finishes first and the resolution then updates a component
 * belonging to a torn-down test — which React reports as an update outside
 * act(). Flushing here rather than in each test also covers the rejection case,
 * where there is no rendered payment block to wait for.
 */
async function renderSlip() {
  const screen = await renderScreen(<OrderPrintPreview order={ORDER} onClose={() => {}} />);
  await act(async () => {});
  return screen;
}

/**
 * A printed slip is evidence. These tests are about the ways it could be
 * evidence of the wrong thing.
 */
describe('OrderPrintPreview', () => {
  it('prints both copies', async () => {
    const screen = await renderSlip();
    expect(screen.getByText('CUSTOMER COPY')).toBeTruthy();
    expect(screen.getByText('COMPANY COPY')).toBeTruthy();
  });

  /**
   * The two halves of a signed document must not disagree. The balance and the
   * signature block used to be on the company copy only, which left the branch
   * signing for an amount its own copy never showed.
   */
  it('puts the same money and signatures on both copies', async () => {
    const screen = await renderSlip();

    await waitFor(() => expect(screen.getAllByText('Payment information')).toHaveLength(2));
    expect(screen.getAllByText('Previous balance to collect')).toHaveLength(2);
    expect(screen.getAllByText('Prepared by')).toHaveLength(2);
    expect(screen.getAllByText('Received by')).toHaveLength(2);
  });

  it('carries every header field the slip is identified by', async () => {
    const screen = await renderSlip();
    for (const label of ['Printed', 'Order', 'Business date', 'Branch', 'Status']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText('Production Department')).toHaveLength(2);
  });

  /**
   * The working, not just the answer: a branch receiving "collect 8400" with no
   * derivation cannot check what it is signing for.
   */
  it('shows how the amount to collect was reached', async () => {
    const screen = await renderSlip();
    await waitFor(() => expect(screen.getAllByText('Previous delivery')).toHaveLength(2));
    expect(screen.getAllByText('Less returns')).toHaveLength(2);
    expect(screen.getAllByText('80%')).toHaveLength(2);
  });

  /**
   * Each settlement line is optional on the response. A missing one must be
   * absent, not rendered blank — a reader treats an empty "Returns" as zero.
   */
  it('omits a settlement line the server did not send', async () => {
    mockBalance.mockResolvedValue({ amountToCollect: 8400 });
    const screen = await renderSlip();

    await waitFor(() => expect(screen.getAllByText('Previous balance to collect')).toHaveLength(2));
    expect(screen.queryByText('Less returns')).toBeNull();
    expect(screen.queryByText('Previous delivery')).toBeNull();
  });

  /** A branch's first order has no previous balance; that is normal, not an error. */
  it('prints without a payment block when there is no previous balance', async () => {
    mockBalance.mockRejectedValue(new Error('no previous order'));
    const screen = await renderSlip();

    await waitFor(() => expect(screen.getByText('CUSTOMER COPY')).toBeTruthy());
    expect(screen.queryByText('Payment information')).toBeNull();
  });

  /**
   * A short delivery has to be visible on the slip. Discovering it at the
   * counter, after both parties have signed, is the failure this prevents.
   */
  it('flags a quantity that was cut', async () => {
    const screen = await renderSlip();
    expect(screen.getAllByText(/asked 20/).length).toBeGreaterThan(0);
  });
});
