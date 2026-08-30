import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

/**
 * The screen that decides which printer a shift prints on.
 *
 * The transport is mocked at `common/printing` rather than at the native
 * module: what this screen is responsible for is the *states* — nothing chosen,
 * Bluetooth off, permission refused, nothing paired, one selected — and each of
 * those has to say what to do next. `printService.test.ts` covers the mapping
 * from a native reject to those states.
 */

jest.mock('@/common/printing', () => {
  const actual = jest.requireActual('@/common/printing');
  return {
    ...actual,
    printingSupported: jest.fn(() => true),
    listPairedPrinters: jest.fn(),
    printTestPage: jest.fn(),
  };
});

jest.mock('@/api/hooks/useCatalogApi', () => ({
  useSettings: () => ({ data: { companyName: 'Mountain Bakes', receiptFooter: 'Thank you' } }),
}));

import {
  BLACK_COPPER_BC_89AC,
  PrintError,
  listPairedPrinters,
  printTestPage,
  printingSupported,
} from '@/common/printing';
import { renderScreen } from '@/common/test-utils/render';
import { usePrinterStore } from '@/state';
import { PrinterScreen } from '../PrinterScreen';

const mockList = listPairedPrinters as jest.Mock;
const mockTest = printTestPage as jest.Mock;
const mockSupported = printingSupported as jest.Mock;

const BC = { name: 'BlackCopper BC-89AC', address: '00:11:22:33:44:55' };
const OTHER = { name: 'Kitchen printer', address: 'AA:BB:CC:DD:EE:FF' };

beforeEach(() => {
  jest.clearAllMocks();
  mockSupported.mockReturnValue(true);
  mockList.mockResolvedValue([BC, OTHER]);
  mockTest.mockResolvedValue(undefined);
  usePrinterStore.setState({ address: null, name: null, profile: BLACK_COPPER_BC_89AC });
});

describe('PrinterScreen', () => {
  it('lists every paired device rather than guessing which one is a printer', async () => {
    // Printers at this end of the market report an inconsistent Bluetooth
    // device class, so filtering on it hides a printer that is sitting right
    // there with no way for the user to say otherwise.
    const screen = await renderScreen(<PrinterScreen />);

    await waitFor(() => expect(screen.getByTestId(`printer-device-${BC.address}`)).toBeTruthy());
    expect(screen.getByTestId(`printer-device-${OTHER.address}`)).toBeTruthy();
  });

  it('says nothing is chosen, and names the printer the app is set up for', async () => {
    const screen = await renderScreen(<PrinterScreen />);

    expect(screen.getByTestId('printer-selected')).toHaveTextContent('Nothing chosen yet');
    await waitFor(() => expect(screen.queryByText(/Black Copper BC-89AC/)).toBeTruthy());
  });

  it('stores the tapped device on this handset', async () => {
    const screen = await renderScreen(<PrinterScreen />);
    await waitFor(() => expect(screen.getByTestId(`printer-device-${BC.address}`)).toBeTruthy());

    fireEvent.press(screen.getByTestId(`printer-device-${BC.address}`));

    expect(usePrinterStore.getState().address).toBe(BC.address);
    await waitFor(() =>
      expect(screen.getByTestId('printer-selected')).toHaveTextContent(BC.name),
    );
  });

  it('forgets the printer without touching anything else', async () => {
    usePrinterStore.setState({ address: BC.address, name: BC.name });
    const screen = await renderScreen(<PrinterScreen />);

    fireEvent.press(screen.getByTestId('printer-forget'));

    expect(usePrinterStore.getState().address).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId('printer-selected')).toHaveTextContent('Nothing chosen yet'),
    );
  });

  /**
   * The test page is the point of the screen: choosing a name proves nothing,
   * because the address is stored whether or not anything is switched on at the
   * other end.
   */
  it('prints a test page on the selected printer, with the shop name on it', async () => {
    usePrinterStore.setState({ address: BC.address, name: BC.name });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = await renderScreen(<PrinterScreen />);

    await pressAndSettle(() => fireEvent.press(screen.getByTestId('printer-test-selected')));

    expect(mockTest).toHaveBeenCalledTimes(1);
    expect(mockTest.mock.calls[0]?.[0]).toBe(BC.address);
    expect(mockTest.mock.calls[0]?.[1]).toEqual(BLACK_COPPER_BC_89AC);
    expect(mockTest.mock.calls[0]?.[2]).toMatchObject({ companyName: 'Mountain Bakes' });
    expect(alert).toHaveBeenCalled();
    alert.mockRestore();
  });

  it('says what to do when the printer does not answer', async () => {
    usePrinterStore.setState({ address: BC.address, name: BC.name });
    mockTest.mockRejectedValue(new PrintError('connect-failed'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = await renderScreen(<PrinterScreen />);

    await pressAndSettle(() => fireEvent.press(screen.getByTestId('printer-test-selected')));

    expect(alert).toHaveBeenCalled();
    expect(String(alert.mock.calls[0]?.[1])).toContain('switched on and in range');
    alert.mockRestore();
  });

  /**
   * Every reason the list can be empty leads somewhere different, and all of
   * them are states of the phone the user has to go and change — so they stay
   * on screen rather than appearing as an alert they would dismiss on the way
   * to Android settings.
   */
  it('tells the user where to pair when nothing is bonded yet', async () => {
    mockList.mockResolvedValue([]);
    const screen = await renderScreen(<PrinterScreen />);

    await waitFor(() => expect(screen.getByText('No paired devices')).toBeTruthy());
    expect(screen.getByText(/Bluetooth settings/)).toBeTruthy();
  });

  it('asks for Bluetooth to be switched on rather than showing an empty list', async () => {
    mockList.mockRejectedValue(new PrintError('bluetooth-off'));
    const screen = await renderScreen(<PrinterScreen />);

    await waitFor(() => expect(screen.getByText('Cannot list printers')).toBeTruthy());
    expect(screen.getByText(/Turn Bluetooth on/)).toBeTruthy();
  });

  it('offers no retry on a device that can never print', async () => {
    // iOS, or a build without the native module. Retrying cannot change it, so
    // a Try again button would be a button that does nothing.
    mockSupported.mockReturnValue(false);
    const screen = await renderScreen(<PrinterScreen />);

    await waitFor(() => expect(screen.getByText('This device cannot print.')).toBeTruthy());
    expect(screen.queryByText('Try again')).toBeNull();
    expect(mockList).not.toHaveBeenCalled();
  });
});

/**
 * Press, and let the whole handler finish inside `act`.
 *
 * `onTest` sets a spinner, awaits the print, and clears the spinner in a
 * `finally`. A bare `fireEvent.press` followed by `waitFor(alert)` leaves that
 * last `setTesting(null)` to land after the assertion has released `act`, which
 * React reports as an update outside `act(...)` — a warning printed over a
 * green run, which is the kind that gets learned and then ignored.
 */
async function pressAndSettle(press: () => void): Promise<void> {
  await act(async () => {
    press();
  });
}
