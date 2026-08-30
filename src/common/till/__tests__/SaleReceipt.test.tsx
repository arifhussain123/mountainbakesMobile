import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

/**
 * The slip's two exits: the share sheet, and the paper.
 *
 * What is asserted here is the **order of events around printing** — Print
 * opens the receipt rather than sending it, the preview is what sends it, and a
 * printer that refuses leaves the preview up. The layout of the receipt itself
 * belongs to `printing/__tests__/receipt.test.ts`; this file only cares that
 * the right thing is shown at the right moment.
 */

jest.mock('@/common/printing', () => {
  const actual = jest.requireActual('@/common/printing');
  // The preview and the layout stay real: this test's whole point is that the
  // paper the user approves is the paper that gets sent, and a mocked preview
  // could not show that.
  return { ...actual, printingSupported: jest.fn(() => true), printSale: jest.fn() };
});

jest.mock('@/api/hooks/useCatalogApi', () => ({
  useSettings: () => ({ data: { companyName: 'Mountain Bakes', receiptFooter: 'Thank you' } }),
}));

import { PrintError, printSale, printingSupported } from '@/common/printing';
import { renderScreen } from '@/common/test-utils/render';
import { usePrinterStore } from '@/state';
import { SaleReceipt } from '../SaleReceipt';
import type { SaleSlip } from '../types';

const mockPrint = printSale as jest.Mock;
const mockSupported = printingSupported as jest.Mock;

const SALE: SaleSlip = {
  lines: [{ productId: 'p1', productName: 'Almond Croissant', unitPrice: 180, qty: 2, discount: 0 }],
  totals: {
    grossSubtotal: 360,
    discountTotal: 0,
    subtotal: 360,
    taxRate: 0,
    taxAmount: 0,
    grandTotal: 360,
  },
  paymentMethod: 'cash',
  customerName: '',
  customerPhone: '',
  notes: '',
  receivedCash: null,
  returned: null,
  businessDate: '2026-08-30',
  currencySymbol: 'Rs.',
  confirmed: true,
  authoritative: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSupported.mockReturnValue(true);
  mockPrint.mockResolvedValue(undefined);
  usePrinterStore.getState().select({ address: '00:11', name: 'BC-89AC' });
});

function slip() {
  return renderScreen(<SaleReceipt sale={SALE} branchName="Jutial" onDone={() => {}} />);
}

describe('SaleReceipt printing', () => {
  it('offers Print beside Share where the device can print', async () => {
    const screen = await slip();

    expect(screen.getByTestId('print-slip')).toBeTruthy();
    expect(screen.getByTestId('share-slip')).toBeTruthy();
  });

  it('hides Print entirely where it could never work', async () => {
    // iOS, or an APK built before the native module existed. A button that can
    // only ever report "this device cannot print" is worse than no button.
    mockSupported.mockReturnValue(false);
    const screen = await slip();

    expect(screen.queryByTestId('print-slip')).toBeNull();
    expect(screen.getByTestId('share-slip')).toBeTruthy();
  });

  /**
   * The change this file exists for. Print used to go straight to the printer,
   * so the first sight of the receipt was the cut paper — and every mistake on
   * it cost a roll and a re-ring.
   */
  it('opens the paper rather than printing it', async () => {
    const screen = await slip();

    await fireEvent.press(screen.getByTestId('print-slip'));

    await waitFor(() => expect(screen.getByTestId('receipt-paper')).toBeTruthy());
    expect(mockPrint).not.toHaveBeenCalled();
  });

  it('previews the receipt this sale will actually produce', async () => {
    const screen = await slip();

    await fireEvent.press(screen.getByTestId('print-slip'));
    await measurePaper(screen);

    // The tenant name from settings, not the hard-coded brand, and the receipt
    // footer from settings too.
    expect(screen.getByText('Mountain Bakes')).toBeTruthy();
    expect(screen.getByText(/Thank you/)).toBeTruthy();

    // The total padded to the full 48 columns, with the amount flush right.
    // Asserted as width-and-ending rather than as a literal run of spaces: the
    // claim is that the column lands at the edge of the roll, and spelling the
    // gap out would make the test fail for a label reworded by one letter.
    const total = screen.getByText(/^GRAND TOTAL/).props.children as string;
    expect(total).toHaveLength(48);
    expect(total.endsWith('Rs. 360')).toBe(true);
  });

  it('sends it only once the preview is confirmed, then closes', async () => {
    const screen = await slip();
    await fireEvent.press(screen.getByTestId('print-slip'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('receipt-preview-print'));
    });

    expect(mockPrint).toHaveBeenCalledTimes(1);
    expect(mockPrint.mock.calls[0]?.[0]).toBe(SALE);
    expect(mockPrint.mock.calls[0]?.[1]).toMatchObject({
      branchName: 'Jutial',
      companyName: 'Mountain Bakes',
    });
    await waitFor(() => expect(screen.queryByTestId('receipt-paper')).toBeNull());
  });

  /**
   * Every failure `printSale` can report is one the user fixes and retries —
   * switch the printer on, turn Bluetooth back on, choose a printer. Dropping
   * them back to the slip would make them find Print again to do the same
   * thing.
   */
  it('keeps the paper up when the printer refuses, and says why', async () => {
    mockPrint.mockRejectedValue(new PrintError('connect-failed'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = await slip();
    await fireEvent.press(screen.getByTestId('print-slip'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('receipt-preview-print'));
    });

    expect(String(alert.mock.calls[0]?.[1])).toContain('switched on and in range');
    expect(screen.getByTestId('receipt-paper')).toBeTruthy();
    alert.mockRestore();
  });

  it('lets the cashier back out without printing', async () => {
    const screen = await slip();
    await fireEvent.press(screen.getByTestId('print-slip'));

    await fireEvent.press(screen.getByTestId('receipt-preview-cancel'));

    await waitFor(() => expect(screen.queryByTestId('receipt-paper')).toBeNull());
    expect(mockPrint).not.toHaveBeenCalled();
    // Still on the slip, so Share and Done are where they were.
    expect(screen.getByTestId('slip-done')).toBeTruthy();
  });
});

/** See `printing/__tests__/ReceiptPreview.test.tsx` — Jest fires no layout. */
async function measurePaper(screen: Awaited<ReturnType<typeof renderScreen>>): Promise<void> {
  await fireEvent(
    screen.getByTestId('receipt-mono-probe', { includeHiddenElements: true }),
    'layout',
    { nativeEvent: { layout: { width: 60, height: 100, x: 0, y: 0 } } },
  );
  await fireEvent(screen.getByTestId('receipt-paper'), 'layout', {
    nativeEvent: { layout: { width: 288, height: 400, x: 0, y: 0 } },
  });
}
