import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/api/services/returnsService', () => ({
  getBranchReturns: jest.fn(),
  getProductionReturns: jest.fn(),
  reviewProductionReturn: jest.fn(),
}));
jest.mock('@/common/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({ total: 0, pending: 0, needsAttention: 0 })),
}));

import { getBranchReturns } from '@/api/services/returnsService';
import type { ProductionReturn } from '@/shared/types/production-ops.types';
import { businessDateStr } from '@/shared/utils/timezone';
import { useNetworkStore } from '@/state/networkStore';
import { renderScreen } from '@/common/test-utils/render';
import { BranchReturnsScreen, byUrgency } from '../BranchReturnsScreen';

const getReturns = getBranchReturns as jest.Mock;

const RETURN: ProductionReturn = {
  id: 'r1',
  branchId: 'b1',
  branchName: 'Committee Chowk',
  productId: 'p1',
  productName: 'Cream Puff',
  qty: 12,
  reason: 'Unsold at close',
  status: 'pending',
  source: 'branch',
  date: '2026-08-25',
} as ProductionReturn;

beforeEach(() => {
  jest.clearAllMocks();
  getReturns.mockResolvedValue([RETURN]);
  useNetworkStore.setState({ isOnline: true, hasResolved: true });
});

describe('BranchReturnsScreen', () => {
  /**
   * The branch route, not the production queue.
   *
   * `GET /api/production-returns` is `requireRole('super_admin',
   * 'production_user')` on the router itself — a branch account is refused the
   * read outright, so calling it here would be a 403 on first load rather than
   * an empty list.
   */
  it('reads the branch route with the window it advertises', async () => {
    await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(getReturns).toHaveBeenCalled());
    expect(getReturns).toHaveBeenCalledWith(90);
  });

  it('states the window, because the chips do not change it', async () => {
    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByText(/Last 90 days/)).toBeTruthy());
  });

  /**
   * The one word this screen must not get wrong.
   *
   * A branch return takes the units off the shelf **as it is raised** and then
   * waits for the counter to decide. Labelling that `pending` reads as "nothing
   * has happened yet", which is the opposite of the truth — the stock is already
   * gone and only its destination is open.
   */
  it('never labels a raised return as though nothing had happened', async () => {
    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByText('With production')).toBeTruthy());
    expect(screen.queryByText('Pending')).toBeNull();
  });

  it('filters what came back rather than re-querying', async () => {
    getReturns.mockResolvedValue([
      RETURN,
      { ...RETURN, id: 'r2', status: 'accepted', productName: 'Almond Tart' },
    ]);

    const screen = await renderScreen(<BranchReturnsScreen />);

    // Lands on Waiting, so only the pending row is on screen.
    await waitFor(() => expect(screen.getByText('Cream Puff')).toBeTruthy());
    expect(screen.queryByText('Almond Tart')).toBeNull();

    await fireEvent.press(screen.getByTestId('branch-returns-filter-accepted'));

    await waitFor(() => expect(screen.getByText('Almond Tart')).toBeTruthy());
    expect(screen.queryByText('Cream Puff')).toBeNull();
    // One request for the window; the chips narrow the rows in place.
    expect(getReturns).toHaveBeenCalledTimes(1);
  });

  /**
   * v6 lands screen 10 on the open work, because what has not been decided is
   * why the screen is opened. All is one tap away carrying its own total.
   */
  it('lands on Waiting rather than on everything', async () => {
    getReturns.mockResolvedValue([
      RETURN,
      { ...RETURN, id: 'r2', status: 'accepted', productName: 'Almond Tart' },
    ]);

    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByText('Cream Puff')).toBeTruthy());
    expect(screen.queryByText('Almond Tart')).toBeNull();

    await fireEvent.press(screen.getByTestId('branch-returns-filter-all'));
    await waitFor(() => expect(screen.getByText('Almond Tart')).toBeTruthy());
  });

  /** A count says what tapping the chip would show, so it is taken over the window. */
  it('counts every chip over the whole window', async () => {
    getReturns.mockResolvedValue([
      RETURN,
      { ...RETURN, id: 'r2', status: 'accepted' },
      { ...RETURN, id: 'r3', status: 'returned' },
    ]);

    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByLabelText('All, 3')).toBeTruthy());
    expect(screen.getByLabelText('Waiting, 1')).toBeTruthy();
    expect(screen.getByLabelText('Accepted, 1')).toBeTruthy();
    expect(screen.getByLabelText('Sent back, 1')).toBeTruthy();
    expect(screen.getByLabelText('Rejected, 0')).toBeTruthy();
  });

  /**
   * Two open states, and they are not equally urgent to the shop. `returned` is
   * waiting on THIS reader; `pending` is waiting on the counter. So the thing
   * needing an action from the person holding the phone sorts above it, and the
   * two terminal states share the bottom rank.
   */
  it('puts what needs this shop above what needs the counter', () => {
    const order = byUrgency([
      { ...RETURN, id: 'r1', status: 'accepted' },
      { ...RETURN, id: 'r2', status: 'pending' },
      { ...RETURN, id: 'r3', status: 'returned' },
    ]).map(r => r.id);

    expect(order).toEqual([
      'r3', // returned — waiting on this shop
      'r2', // pending  — waiting on the counter
      'r1', // accepted — finished
    ]);
  });

  /**
   * Accepted and rejected share the bottom rank: both are finished, and
   * ordering one above the other would imply a judgement the screen is not
   * making. Stability is what keeps them in the server's own newest-first
   * order rather than swapping between renders.
   */
  it('treats both terminal states as equally finished, stably', () => {
    const order = byUrgency([
      { ...RETURN, id: 'newest', status: 'rejected' },
      { ...RETURN, id: 'older', status: 'accepted' },
      { ...RETURN, id: 'oldest', status: 'rejected' },
    ]).map(r => r.id);

    expect(order).toEqual(['newest', 'older', 'oldest']);
  });

  /**
   * The landing filter is the open work, so its empty case is good news and has
   * to read as good news — not as "nothing has been handed back", which is a
   * different and much worse claim.
   */
  it('reads a settled quarter as settled, not as empty', async () => {
    getReturns.mockResolvedValue([{ ...RETURN, id: 'r2', status: 'accepted' }]);

    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByText('Nothing waiting')).toBeTruthy());
    expect(screen.queryByText('No returns')).toBeNull();

    await fireEvent.press(screen.getByText('Show all'));
    await waitFor(() => expect(screen.getByText('Cream Puff')).toBeTruthy());
  });

  /**
   * The units figure counts every return raised today whatever its status: the
   * branch balance is debited as a return is saved, so that is what left the
   * shelf today. `date` is the business date — the day rolls at 02:00 Karachi.
   */
  it('counts today\'s units by business date, across every status', async () => {
    const today = businessDateStr();
    getReturns.mockResolvedValue([
      { ...RETURN, id: 'r1', date: today, qty: 12, status: 'pending' },
      { ...RETURN, id: 'r2', date: today, qty: 3, status: 'rejected' },
      { ...RETURN, id: 'r3', date: '2026-01-02', qty: 99, status: 'pending' },
    ]);

    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByTestId('returns-units-today')).toBeTruthy());
    expect(screen.getByText('15')).toBeTruthy();
  });

  /**
   * The tile appears only when the counter has actually handed something back.
   * A permanent "0 needs you" is a tile that teaches the reader to stop looking.
   */
  it('hides the attention tile when nothing was sent back', async () => {
    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByTestId('returns-waiting')).toBeTruthy());
    expect(screen.queryByTestId('returns-needs-you')).toBeNull();
  });

  it('shows the attention tile once the counter hands something back', async () => {
    getReturns.mockResolvedValue([{ ...RETURN, id: 'r3', status: 'returned' }]);
    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByTestId('returns-needs-you')).toBeTruthy());
  });

  it('shows the quantity handed back and no money figure', async () => {
    const screen = await renderScreen(<BranchReturnsScreen />);

    await waitFor(() => expect(screen.getByText('Cream Puff')).toBeTruthy());
    expect(screen.getByText('12')).toBeTruthy();
    // `ProductionReturn` carries no amount. Valuing it from the cached price
    // list would put a figure on the row the server never agreed to — and one a
    // reader would take for a refund.
    expect(screen.queryByText(/Rs\./)).toBeNull();
  });
});
