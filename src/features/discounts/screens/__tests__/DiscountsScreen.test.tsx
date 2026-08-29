import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('@/api/services/discountsService', () => ({
  getBranchDiscounts: jest.fn(),
  createBranchDiscount: jest.fn(),
  reviseBranchDiscount: jest.fn(),
  withdrawBranchDiscount: jest.fn(),
}));
jest.mock('@/common/hooks/useCatalogSettings', () => ({
  useCatalogSettings: () => ({ currencySymbol: 'Rs.' }),
}));

import {
  getBranchDiscounts,
  reviseBranchDiscount,
  withdrawBranchDiscount,
} from '@/api/services/discountsService';
import { ApiError } from '@/api/errors';
import type { BranchDiscount } from '@/shared/types/discount.types';
import { renderScreen } from '@/common/test-utils/render';
import { DiscountsScreen } from '../DiscountsScreen';

const mockList = getBranchDiscounts as jest.Mock;
const mockRevise = reviseBranchDiscount as jest.Mock;
const mockWithdraw = withdrawBranchDiscount as jest.Mock;

function claim(over: Partial<BranchDiscount> = {}): BranchDiscount {
  return {
    id: 'c1',
    branchId: 'b1',
    branchName: 'Saddar',
    productionOrderId: 'po1',
    demandNumber: 'DMD-000001',
    amount: 500,
    reason: 'Two crates arrived crushed',
    status: 'pending',
    date: '2026-08-28',
    createdBy: 'u1',
    createdByName: 'Ayesha',
    createdAt: '2026-08-28T09:00:00.000Z',
    reviewedBy: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNote: null,
    ...over,
  } as BranchDiscount;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue([claim()]);
  mockRevise.mockResolvedValue({ discount: claim() });
  mockWithdraw.mockResolvedValue({});
});

describe('DiscountsScreen', () => {
  it('offers Change and Withdraw on a claim the branch still owns', async () => {
    const screen = await renderScreen(<DiscountsScreen />);

    await waitFor(() => expect(screen.getByTestId('claim-c1')).toBeTruthy());
    expect(screen.getByTestId('claim-change-c1')).toBeTruthy();
    expect(screen.getByTestId('claim-withdraw-c1')).toBeTruthy();
  });

  it('still offers them on a RETURNED claim, which carries a review timestamp', async () => {
    /*
     * The case a timestamp-based rule breaks. Production sent this back, which
     * stamped `reviewedAt` — and correcting it is exactly what the branch was
     * asked to do.
     */
    mockList.mockResolvedValue([
      claim({
        status: 'returned',
        reviewedAt: '2026-08-28T11:00:00.000Z',
        reviewNote: 'Which crates? Give the item names.',
      }),
    ]);
    const screen = await renderScreen(<DiscountsScreen />);

    await waitFor(() => expect(screen.getByTestId('claim-change-c1')).toBeTruthy());
    /* Twice over: once on the card and once in the "Awaiting review" tile's
       subtitle, which counts this very claim. Both are correct. */
    expect(screen.getAllByText(/still yours to change/).length).toBeGreaterThan(0);
    // Production's words are shown, so there is something to act on.
    expect(screen.getByText(/Give the item names/)).toBeTruthy();
  });

  it('states Final in words on a decided claim, and offers nothing', async () => {
    mockList.mockResolvedValue([
      claim({ status: 'approved', reviewedAt: '2026-08-28T12:00:00.000Z' }),
    ]);
    const screen = await renderScreen(<DiscountsScreen />);

    await waitFor(() => expect(screen.getByTestId('claim-c1')).toBeTruthy());
    expect(screen.getByText(/Final/)).toBeTruthy();
    expect(screen.queryByTestId('claim-change-c1')).toBeNull();
    expect(screen.queryByTestId('claim-withdraw-c1')).toBeNull();
  });

  it('counts a returned claim as still awaiting review', async () => {
    // It is money the branch can still recover by correcting and resending, so
    // leaving it out would understate the one figure that is a task.
    mockList.mockResolvedValue([
      claim({ id: 'a', status: 'pending', amount: 300 }),
      claim({ id: 'b', status: 'returned', amount: 200, reviewedAt: '2026-08-28T11:00:00.000Z' }),
      claim({ id: 'c', status: 'approved', amount: 999 }),
    ]);
    const screen = await renderScreen(<DiscountsScreen />);

    await waitFor(() => expect(screen.getByTestId('claims-awaiting')).toBeTruthy());
    expect(screen.getByText('2 still yours to change')).toBeTruthy();
  });

  it('reports the server’s own words when Production got there first', async () => {
    mockRevise.mockRejectedValue(
      new ApiError({
        kind: 'conflict',
        status: 409,
        message: 'This discount has already been decided and can no longer be changed.',
      }),
    );
    const screen = await renderScreen(<DiscountsScreen />);
    await waitFor(() => expect(screen.getByTestId('claim-change-c1')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('claim-change-c1'));
    await waitFor(() => expect(screen.getByTestId('claim-save')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('claim-save'));

    /*
     * Asserted on the form's own slot. The message also appears on the list
     * behind the modal — both read one `actionError` — so a bare text query
     * matches twice, and the surface that matters is the one in front of the
     * person who just pressed Save.
     *
     * Not "could not save": that would send someone to check their connection
     * over a claim that was simply already decided.
     */
    await waitFor(() => expect(screen.getByTestId('claim-form-error')).toBeTruthy());
    expect(screen.getByTestId('claim-form-error').props.children).toMatch(
      /already been decided/,
    );
  });

  it('refetches after a write, since the server may have reviewed meanwhile', async () => {
    const screen = await renderScreen(<DiscountsScreen />);
    await waitFor(() => expect(screen.getByTestId('claim-change-c1')).toBeTruthy());
    const callsBefore = mockList.mock.calls.length;

    await fireEvent.press(screen.getByTestId('claim-change-c1'));
    await waitFor(() => expect(screen.getByTestId('claim-save')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('claim-save'));

    await waitFor(() => expect(mockRevise).toHaveBeenCalled());
    await waitFor(() => expect(mockList.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('asks the window it states', async () => {
    await renderScreen(<DiscountsScreen />);
    // The subline says "Last 90 days" and that is the value sent, so the two
    // cannot drift — the response carries no window to read back.
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(90));
  });
});
