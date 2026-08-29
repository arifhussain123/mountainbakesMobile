import React from 'react';

import { renderScreen } from '@/common/test-utils/render';
import { OrderReview, reviewBlockers } from '../OrderReview';
import type { OrderLine } from '../../hooks/useProductionOrderForm';

/**
 * The two rules the confirmation step exists to hold, tested at the component
 * rather than through the screen: both are decided purely by props, and driving
 * them from the form means holding a request open mid-flight to observe one of
 * them.
 */

const LINE: OrderLine = {
  productId: 'p1',
  name: 'Milk Rusk',
  qty: 2,
  rate: 100,
  remark: '',
};

const TOTALS = { selected: 1, quantity: 2, amount: 200 };

function props(overrides: Partial<React.ComponentProps<typeof OrderReview>> = {}) {
  return {
    lines: [LINE],
    requiredDate: '2026-09-01',
    branchName: 'Saddar',
    totals: TOTALS,
    busy: null,
    error: null,
    onQty: jest.fn(),
    onRemark: jest.fn(),
    onBack: jest.fn(),
    onConfirm: jest.fn(),
    ...overrides,
  } as React.ComponentProps<typeof OrderReview>;
}

describe('reviewBlockers', () => {
  it('finds nothing wrong with a demand that has lines and a date', () => {
    expect(reviewBlockers([LINE], '2026-09-01')).toEqual([]);
  });

  it('names the empty basket rather than leaving it to a grey button', () => {
    const [reason] = reviewBlockers([], '2026-09-01');
    expect(reason).toMatch(/Every line was removed/);
  });

  it('names a missing required date', () => {
    const [reason] = reviewBlockers([LINE], '   ');
    expect(reason).toMatch(/date this delivery is needed/);
  });

  it('reports both when both are missing', () => {
    expect(reviewBlockers([], '')).toHaveLength(2);
  });
});

describe('OrderReview', () => {
  it('withholds the way back while the demand is in flight', async () => {
    /*
     * Dismissing mid-send does not cancel anything — the demand still lands and
     * still reports its outcome. A back arrow that reads as "cancel" while the
     * order goes anyway is how somebody believes they stopped an order they in
     * fact sent.
     */
    const sending = await renderScreen(<OrderReview {...props({ busy: 'submit' })} />);
    expect(sending.queryByLabelText('Go back')).toBeNull();
  });

  it('offers the way back again once the attempt is over', async () => {
    const idle = await renderScreen(<OrderReview {...props()} />);
    expect(idle.getByLabelText('Go back')).toBeTruthy();
  });

  it('states why Confirm is dead instead of only greying it', async () => {
    const screen = await renderScreen(<OrderReview {...props({ lines: [] })} />);

    expect(screen.getByTestId('review-blocker')).toBeTruthy();
    expect(screen.getByText(/Every line was removed/)).toBeTruthy();
  });

  it('says nothing when there is nothing to say', async () => {
    const screen = await renderScreen(<OrderReview {...props()} />);
    expect(screen.queryByTestId('review-blocker')).toBeNull();
  });
});
