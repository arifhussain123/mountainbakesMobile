import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/api/services/catalogService', () => ({
  getStock: jest.fn(),
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSettings: jest.fn(),
  getBranches: jest.fn(),
}));

// The write path itself is covered by useCreateStockReturn's own test and by
// the sync suite. What is under test here is the SCREEN's gate: that no return
// reaches that path until the confirm step has been taken.
const mockCreateReturn = jest.fn();
jest.mock('@/api/hooks/useReturnsApi', () => ({
  useCreateStockReturn: () => ({ createReturn: mockCreateReturn, isSaving: false }),
}));

// The picker is native on both ends. The real module's behaviour — options,
// error codes, the size ceiling — has its own suite; here it only has to hand
// the screen a photo, an error, or a cancel.
const mockPickReturnPhoto = jest.fn();
jest.mock('@/common/utils/image/returnPhoto', () => ({
  pickReturnPhoto: (...args: unknown[]) => mockPickReturnPhoto(...args),
  PHOTO_MESSAGES: {
    permission: 'Camera permission is required to capture a return photo.',
    cameraUnavailable: 'No camera is available on this device.',
    unprocessable: 'Unable to process this photo. Please try another image.',
  },
}));

import { Linking } from 'react-native';
import * as catalogApi from '@/api/services/catalogService';
import { useAuthStore } from '@/state/authStore';
import { renderScreen } from '@/common/test-utils/render';
import { StockReturnScreen } from '../StockReturnScreen';

const getStock = catalogApi.getStock as jest.Mock;

const ROW = {
  productId: 'p1',
  stockCode: 'STK-000001',
  productName: 'Milk Rusk',
  opening: 100,
  newQty: 0,
  sold: 0,
  returned: 0,
  adjustment: 0,
  balance: 3,
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    status: 'signedIn',
    claims: {
      userId: 'u1',
      email: 'a@b.com',
      role: 'branch_manager' as never,
      branchId: 'b-1',
      branchName: 'Saddar',
      mustChangePassword: false,
    },
  });
  getStock.mockResolvedValue({ date: '2026-08-18', rows: [ROW] });
  (catalogApi.getProducts as jest.Mock).mockResolvedValue([]);
  (catalogApi.getCategories as jest.Mock).mockResolvedValue([]);
  (catalogApi.getBranches as jest.Mock).mockResolvedValue([]);
  mockCreateReturn.mockResolvedValue({
    outcome: 'synced',
    clientOperationId: '0191-aaaa',
    businessDate: '2026-08-18',
  });
  mockPickReturnPhoto.mockResolvedValue({ status: 'picked', photo: PHOTO });
});

const PHOTO = {
  uri: 'file:///cache/rn_image_picker_lib_temp_1.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 148_000,
  width: 1280,
  height: 960,
};

/** One unit on the return and NO photo — the state the submit gate is about. */
async function addOneUnitOnly() {
  const screen = await renderScreen(<StockReturnScreen />);
  await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Return one more Milk Rusk'));
  return screen;
}

/** One unit and a photo: a return that is allowed to be submitted. */
async function addOneUnit() {
  const screen = await addOneUnitOnly();
  await fireEvent.press(screen.getByTestId('return-photo-camera'));
  await waitFor(() => expect(screen.getByTestId('return-photo-preview')).toBeTruthy());
  return screen;
}

describe('StockReturnScreen', () => {
  it('does not move stock until the return is confirmed', async () => {
    // The submit button opens the sheet. A stock movement is append-only and
    // reversing one needs an admin correction, so the tap that starts the
    // transaction must be the second one, not the first.
    const screen = await addOneUnit();

    await fireEvent.press(screen.getByTestId('submit-return'));

    expect(mockCreateReturn).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-return-confirm')).toBeTruthy();
  });

  it('sends the return once confirmed, with its reason', async () => {
    const screen = await addOneUnit();
    await fireEvent.changeText(screen.getByTestId('return-reason'), 'Unsold at close');

    await fireEvent.press(screen.getByTestId('submit-return'));
    await fireEvent.press(screen.getByTestId('confirm-return-confirm'));

    await waitFor(() =>
      expect(mockCreateReturn).toHaveBeenCalledWith({
        items: [{ productId: 'p1', qty: 1 }],
        reason: 'Unsold at close',
        photo: PHOTO,
      }),
    );
  });

  it('writes nothing when the confirm is backed out of', async () => {
    const screen = await addOneUnit();
    await fireEvent.press(screen.getByTestId('submit-return'));

    await fireEvent.press(screen.getByText('Go back'));

    expect(mockCreateReturn).not.toHaveBeenCalled();
  });

  it('names every product in the confirm, not just a total', async () => {
    // "1 product" is not something a person can check against the crate in
    // their hands; a named line with its count is.
    const screen = await addOneUnit();
    await fireEvent.press(screen.getByTestId('submit-return'));

    expect(screen.getByText('Return 1 unit?')).toBeTruthy();
    expect(screen.getAllByText('Milk Rusk').length).toBeGreaterThan(1);
  });

  it('caps the quantity at the balance the branch actually holds', async () => {
    // The server refuses an overdraw with a 409; catching it here means the
    // branch is told before submitting rather than after a round trip.
    const screen = await addOneUnit();
    const plus = screen.getByLabelText('Return one more Milk Rusk');
    await fireEvent.press(plus);
    await fireEvent.press(plus);
    await fireEvent.press(plus); // 4th — balance is 3

    await fireEvent.press(screen.getByTestId('submit-return'));
    await fireEvent.press(screen.getByTestId('confirm-return-confirm'));

    await waitFor(() =>
      expect(mockCreateReturn).toHaveBeenCalledWith({
        items: [{ productId: 'p1', qty: 3 }],
        reason: '',
        photo: PHOTO,
      }),
    );
  });

  /**
   * The day the units come off is on the screen, because the day the units come
   * off is not the day the phone is showing.
   *
   * 01:30 Karachi on the 30th is business day **29 August** — the rollover is at
   * 02:00, not midnight, so a branch closing out a late shift is booking to
   * yesterday's calendar date. This is the hour that makes the subtitle worth
   * drawing, and asserting it at any other instant would only prove the helper
   * formats.
   */
  it('names the business day it books to, across the 02:00 rollover', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-29T20:30:00Z')); // 01:30 on the 30th, Karachi
    try {
      const screen = await renderScreen(<StockReturnScreen />);
      await waitFor(() => expect(screen.getByText('Milk Rusk')).toBeTruthy());
      expect(screen.getByText(/Back to production · Sat 29 Aug/)).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  /**
   * The outcome reports the date the RECORD carries, not the clock.
   *
   * This is the one that matters on a queued return: the row was stamped when it
   * was written and may not drain for hours, so recomputing here would show the
   * day of the drain — the reading that makes a correctly-dated return look
   * wrong. The stub's date is deliberately nowhere near today.
   */
  it('reports the business date the record carries, not the day it is read', async () => {
    mockCreateReturn.mockResolvedValue({
      outcome: 'queued',
      clientOperationId: '0191-bbbb',
      businessDate: '2026-08-18',
    });
    const screen = await addOneUnit();
    await fireEvent.press(screen.getByTestId('submit-return'));
    await fireEvent.press(screen.getByTestId('confirm-return-confirm'));
    await waitFor(() => expect(screen.getByText(/Booked to Tue 18 Aug/)).toBeTruthy());
  });

  /**
   * The photo is required, and the place to learn that is before submitting.
   *
   * The server refuses a photo-less return with `photo_required`. Offline that
   * refusal arrives hours later as a parked row — so the screen holds the rule
   * itself: no photo, no confirm sheet, and a line saying why.
   */
  describe('the return photo', () => {
    it('blocks the submit until a photo is chosen, and says why', async () => {
      const screen = await addOneUnitOnly();

      expect(screen.getByTestId('return-photo-required')).toBeTruthy();
      await fireEvent.press(screen.getByTestId('submit-return'));

      expect(screen.queryByTestId('confirm-return-confirm')).toBeNull();
      expect(mockCreateReturn).not.toHaveBeenCalled();
    });

    it('opens the camera or the gallery, whichever was asked for', async () => {
      const screen = await addOneUnitOnly();

      await fireEvent.press(screen.getByTestId('return-photo-gallery'));
      await waitFor(() => expect(mockPickReturnPhoto).toHaveBeenCalledWith('gallery'));

      await fireEvent.press(screen.getByTestId('return-photo-retake'));
      await waitFor(() => expect(mockPickReturnPhoto).toHaveBeenLastCalledWith('camera'));
    });

    it('unblocks the submit once a photo is chosen and shows it in the confirm', async () => {
      const screen = await addOneUnit();

      expect(screen.queryByTestId('return-photo-required')).toBeNull();
      await fireEvent.press(screen.getByTestId('submit-return'));

      expect(screen.getByTestId('confirm-return-photo').props.source).toEqual({ uri: PHOTO.uri });
    });

    it('blocks the submit again when the photo is removed', async () => {
      const screen = await addOneUnit();

      await fireEvent.press(screen.getByTestId('return-photo-remove'));

      expect(screen.getByTestId('return-photo-required')).toBeTruthy();
      expect(screen.queryByTestId('return-photo-preview')).toBeNull();
    });

    it('changes nothing when the picker is cancelled', async () => {
      const screen = await addOneUnit();
      mockPickReturnPhoto.mockResolvedValueOnce({ status: 'cancelled' });

      await fireEvent.press(screen.getByTestId('return-photo-retake'));
      await waitFor(() => expect(mockPickReturnPhoto).toHaveBeenCalledTimes(2));

      // The photo already chosen stays, and backing out is not an error.
      expect(screen.getByTestId('return-photo-preview')).toBeTruthy();
      expect(screen.queryByTestId('return-photo-error')).toBeNull();
    });

    it('offers the trip to settings when the camera permission is refused', async () => {
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
      mockPickReturnPhoto.mockResolvedValueOnce({
        status: 'error',
        code: 'permission',
        message: 'Camera permission is required to capture a return photo.',
        canOpenSettings: true,
      });
      const screen = await addOneUnitOnly();

      await fireEvent.press(screen.getByTestId('return-photo-camera'));

      await waitFor(() =>
        expect(
          screen.getByText('Camera permission is required to capture a return photo.'),
        ).toBeTruthy(),
      );
      await fireEvent.press(screen.getByTestId('return-photo-error-action'));
      expect(openSettings).toHaveBeenCalled();
      openSettings.mockRestore();
    });

    it('reports a photo it cannot use and stays blocked', async () => {
      mockPickReturnPhoto.mockResolvedValueOnce({
        status: 'error',
        code: 'too_large',
        message: 'Unable to process this photo. Please try another image.',
        canOpenSettings: false,
      });
      const screen = await addOneUnitOnly();

      await fireEvent.press(screen.getByTestId('return-photo-camera'));

      await waitFor(() =>
        expect(
          screen.getByText('Unable to process this photo. Please try another image.'),
        ).toBeTruthy(),
      );
      // No settings trip is offered for a problem settings cannot fix.
      expect(screen.queryByTestId('return-photo-error-action')).toBeNull();
      expect(screen.getByTestId('return-photo-required')).toBeTruthy();
    });

    it('clears the photo with the rest of the form once the return has synced', async () => {
      const screen = await addOneUnit();

      await fireEvent.press(screen.getByTestId('submit-return'));
      await fireEvent.press(screen.getByTestId('confirm-return-confirm'));

      await waitFor(() => expect(mockCreateReturn).toHaveBeenCalled());
      await waitFor(() => expect(screen.queryByTestId('return-photo-preview')).toBeNull());
    });

    it('says the return AND its photo are saved offline when it is queued', async () => {
      mockCreateReturn.mockResolvedValue({
        outcome: 'queued',
        clientOperationId: '0191-bbbb',
        businessDate: '2026-08-18',
      });
      const screen = await addOneUnit();

      await fireEvent.press(screen.getByTestId('submit-return'));
      await fireEvent.press(screen.getByTestId('confirm-return-confirm'));

      await waitFor(() =>
        expect(
          screen.getByText(/return and its photo are both saved offline and will sync automatically/),
        ).toBeTruthy(),
      );
      // Queued is not done: the photo stays with the lines it belongs to.
      expect(screen.getByTestId('return-photo-preview')).toBeTruthy();
    });

    it('leaves the form intact when the photo cannot be stored', async () => {
      // `createReturn` throws before anything is queued when the copy into app
      // storage fails. Nothing was written, so nothing may be cleared.
      mockCreateReturn.mockRejectedValue(new Error('ENOSPC'));
      const screen = await addOneUnit();

      await fireEvent.press(screen.getByTestId('submit-return'));
      await fireEvent.press(screen.getByTestId('confirm-return-confirm'));

      await waitFor(() =>
        expect(
          screen.getByText('Unable to process this photo. Please try another image.'),
        ).toBeTruthy(),
      );
      expect(screen.getByTestId('submit-return')).toBeTruthy();
    });
  });

  it('keeps the lines when the return is only queued', async () => {
    // A queued return has moved no units. Clearing the form would tell the
    // branch it was done while the stock is still on their shelf.
    mockCreateReturn.mockResolvedValue({
      outcome: 'queued',
      clientOperationId: '0191-bbbb',
      businessDate: '2026-08-18',
    });
    const screen = await addOneUnit();

    await fireEvent.press(screen.getByTestId('submit-return'));
    await fireEvent.press(screen.getByTestId('confirm-return-confirm'));

    await waitFor(() => expect(mockCreateReturn).toHaveBeenCalled());
    // The footer only renders while a line carries a quantity.
    expect(screen.getByTestId('submit-return')).toBeTruthy();
  });
});
