import { PermissionsAndroid, Platform } from 'react-native';

/**
 * The layer between a button and the Bluetooth socket.
 *
 * What is worth testing here is not the transport — there is no printer under
 * Jest — but the **classification**: every failure has to arrive at the screen
 * as a code with a next step attached, because "Could not print" repeated six
 * times is what teaches a counter to stop using the feature.
 *
 * The native module is mocked per test rather than in `jest.setup.js`: the
 * absent-module case is one of the behaviours under test, and a global mock
 * would make it unreachable.
 */

jest.mock('@/specs/NativeThermalPrinter', () => ({
  __esModule: true,
  default: { isEnabled: jest.fn(), getPairedDevices: jest.fn(), write: jest.fn() },
}));

const nativeModule = require('@/specs/NativeThermalPrinter').default as {
  isEnabled: jest.Mock;
  getPairedDevices: jest.Mock;
  write: jest.Mock;
};

/*
 * `PermissionsAndroid` is spied on rather than mocked out. Its real
 * `PERMISSIONS` map is part of what is being tested — the service reads
 * `PERMISSIONS.BLUETOOTH_CONNECT` and treats an absent key as "no runtime
 * permission on this Android version" — and a hand-written mock of that map
 * would assert the test's own copy of the constant rather than React Native's.
 */
const permissions = {
  check: jest.spyOn(PermissionsAndroid, 'check'),
  request: jest.spyOn(PermissionsAndroid, 'request'),
};

import {
  PrintError,
  bluetoothEnabled,
  listPairedPrinters,
  printErrorMessage,
  printSale,
  printTestPage,
  printingSupported,
} from '../printService';
import { BLACK_COPPER_BC_89AC } from '../profiles';
import { usePrinterStore } from '@/state/printerStore';
import type { SaleSlip } from '@/common/till/types';
import { decodeBase64 } from '@/common/test-utils/bytes';

/** A rejection shaped the way React Native shapes one from `Promise.reject(code, …)`. */
function nativeReject(code: string, message = 'boom'): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

const SALE: SaleSlip = {
  lines: [{ productId: 'p', productName: 'Bun', unitPrice: 50, qty: 1, discount: 0 }],
  totals: { grossSubtotal: 50, discountTotal: 0, subtotal: 50, taxRate: 0, taxAmount: 0, grandTotal: 50 },
  paymentMethod: 'cash',
  customerName: '',
  customerPhone: '',
  notes: '',
  receivedCash: null,
  returned: null,
  businessDate: '2026-08-30',
  confirmed: true,
  authoritative: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
  // `Platform.Version` is 31+ so the runtime permission path is the one under
  // test; below 31 it short-circuits and there would be nothing to assert.
  Object.defineProperty(Platform, 'Version', { value: 33, configurable: true });
  // Reset to "granted" each time, because several cases below override it and
  // `clearAllMocks` clears the recorded calls without restoring the behaviour.
  permissions.check.mockResolvedValue(true);
  permissions.request.mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  usePrinterStore.getState().clear();
});

describe('printingSupported', () => {
  it('is false where there is no native module to reach', () => {
    Platform.OS = 'ios';
    expect(printingSupported()).toBe(false);
  });

  it('is true on Android with the module linked', () => {
    expect(printingSupported()).toBe(true);
  });
});

describe('printSale', () => {
  it('refuses before touching Bluetooth when no printer has been chosen', async () => {
    await expect(printSale(SALE)).rejects.toMatchObject({ code: 'no-printer' });
    expect(nativeModule.write).not.toHaveBeenCalled();
  });

  it('sends the receipt to the chosen address', async () => {
    usePrinterStore.getState().select({ address: '00:11:22:33:44:55', name: 'BC-89AC' });
    nativeModule.write.mockResolvedValue(undefined);

    await printSale(SALE, { branchName: 'Jutial' });

    expect(nativeModule.write).toHaveBeenCalledTimes(1);
    const [address, payload] = nativeModule.write.mock.calls[0] as [string, string];
    expect(address).toBe('00:11:22:33:44:55');
    // Base64 of a stream that opens with `ESC @`, which is the one thing the
    // transport is entitled to assume about what it is handed.
    expect(decodeBase64(payload).slice(0, 2)).toEqual([0x1b, 0x40]);
  });

  it('asks for the permission before writing, and gives up if it is refused', async () => {
    usePrinterStore.getState().select({ address: '00:11:22:33:44:55', name: 'BC-89AC' });
    permissions.check.mockResolvedValue(false);
    permissions.request.mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

    await expect(printSale(SALE)).rejects.toMatchObject({ code: 'unauthorized' });
    expect(nativeModule.write).not.toHaveBeenCalled();
  });

  /**
   * The classification that matters. Each of these leads the user somewhere
   * different, so collapsing them would be collapsing five different next
   * steps into one dead end.
   */
  it.each([
    ['unauthorized'],
    ['bluetooth-off'],
    ['unknown-device'],
    ['connect-failed'],
    ['write-failed'],
  ])('passes the native reject code %p straight through', async code => {
    usePrinterStore.getState().select({ address: '00:11:22:33:44:55', name: 'BC-89AC' });
    nativeModule.write.mockRejectedValue(nativeReject(code));

    await expect(printSale(SALE)).rejects.toMatchObject({ code });
  });

  it('falls back to connect-failed for a reject nobody planned for', async () => {
    // "Check the printer is on" is the most likely useful advice when the cause
    // is unknown, which is why this is the fallback rather than write-failed.
    usePrinterStore.getState().select({ address: '00:11:22:33:44:55', name: 'BC-89AC' });
    nativeModule.write.mockRejectedValue(new Error('EIO'));

    await expect(printSale(SALE)).rejects.toMatchObject({ code: 'connect-failed' });
  });

  it('reports an unsupported device rather than pretending it queued', async () => {
    usePrinterStore.getState().select({ address: '00:11:22:33:44:55', name: 'BC-89AC' });
    Platform.OS = 'ios';
    await expect(printSale(SALE)).rejects.toMatchObject({ code: 'unsupported' });
  });
});

describe('listPairedPrinters', () => {
  it('returns the bonded devices the module reports', async () => {
    nativeModule.getPairedDevices.mockResolvedValue([{ name: 'BC-89AC', address: 'AA:BB' }]);
    await expect(listPairedPrinters()).resolves.toEqual([{ name: 'BC-89AC', address: 'AA:BB' }]);
  });

  it('is unauthorized when the permission is refused', async () => {
    permissions.check.mockResolvedValue(false);
    permissions.request.mockResolvedValue(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
    await expect(listPairedPrinters()).rejects.toMatchObject({ code: 'unauthorized' });
    expect(nativeModule.getPairedDevices).not.toHaveBeenCalled();
  });

  it('reports Bluetooth being off as its own state', async () => {
    nativeModule.getPairedDevices.mockRejectedValue(nativeReject('bluetooth-off'));
    await expect(listPairedPrinters()).rejects.toMatchObject({ code: 'bluetooth-off' });
  });
});

describe('printTestPage', () => {
  it('addresses the device explicitly, before anything has been saved', async () => {
    nativeModule.write.mockResolvedValue(undefined);
    await printTestPage('CC:DD', BLACK_COPPER_BC_89AC);
    expect(nativeModule.write.mock.calls[0]?.[0]).toBe('CC:DD');
    // Nothing was selected, and nothing should have been: the test page is how
    // you find out whether a device works *before* choosing it.
    expect(usePrinterStore.getState().address).toBeNull();
  });
});

describe('bluetoothEnabled', () => {
  it('answers false rather than throwing when the module cannot say', async () => {
    nativeModule.isEnabled.mockRejectedValue(new Error('no adapter'));
    await expect(bluetoothEnabled()).resolves.toBe(false);
  });
});

describe('printErrorMessage', () => {
  const codes = [
    'unsupported',
    'unauthorized',
    'bluetooth-off',
    'no-printer',
    'unknown-device',
    'connect-failed',
    'write-failed',
  ] as const;

  it('has a distinct sentence for every code', () => {
    const messages = codes.map(printErrorMessage);
    expect(new Set(messages).size).toBe(codes.length);
    for (const message of messages) expect(message.length).toBeGreaterThan(0);
  });

  it('sends someone to the Printer screen when nothing is set up', () => {
    expect(printErrorMessage('no-printer')).toContain('More > Printer');
  });

  it('is a PrintError, so a caller can branch on the code', () => {
    const error = new PrintError('bluetooth-off');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('bluetooth-off');
  });
});
