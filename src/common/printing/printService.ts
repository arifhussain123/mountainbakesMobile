import { PermissionsAndroid, Platform } from 'react-native';

import NativeThermalPrinter, { type PairedPrinter } from '@/specs/NativeThermalPrinter';
import { selectedPrinter } from '@/state/printerStore';
import type { SaleSlip } from '@/common/till/types';

import type { ReceiptContext } from './receipt';
import { saleReceiptBase64, testPageBase64 } from './receipt';
import type { PrinterProfile } from './profiles';

/**
 * The one way anything in this app prints.
 *
 * Everything below the surface is here: the runtime permission, the absent
 * native module, the printer that did not answer, and the mapping from a native
 * reject code to a sentence a cashier can act on. Screens call `printSale` and
 * show what comes back.
 *
 * ---------------------------------------------------------------------------
 * Every failure has a name, and every name has a next step
 * ---------------------------------------------------------------------------
 * A print fails for six distinguishable reasons and they lead to five different
 * actions — grant a permission, switch Bluetooth on, pick a printer, turn the
 * printer on, or try again. Collapsing them into "Could not print" is what
 * produces a counter that has given up on the feature by Thursday, so
 * [PrintError] carries a code and [printErrorMessage] is the only place the
 * wording lives.
 */

export type PrintErrorCode =
  /** No native module: iOS, Jest, or a build without it. Nothing to retry. */
  | 'unsupported'
  /** `BLUETOOTH_CONNECT` was refused. */
  | 'unauthorized'
  /** The adapter is off, or the phone has none. */
  | 'bluetooth-off'
  /** Nothing has been picked on the Printer screen yet. */
  | 'no-printer'
  /** The stored address is not a device this phone knows — unpaired since. */
  | 'unknown-device'
  /** The printer did not accept a connection: off, asleep, or out of range. */
  | 'connect-failed'
  /** Connected, then the link dropped part-way through the receipt. */
  | 'write-failed';

export class PrintError extends Error {
  readonly code: PrintErrorCode;

  constructor(code: PrintErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'PrintError';
    this.code = code;
  }
}

/**
 * What to tell the person holding the phone.
 *
 * Each of these names the next action rather than the internal cause. The one
 * that does not is `write-failed`, because there genuinely is no action beyond
 * looking at the printer — and saying "check the paper" is the most likely
 * useful thing when a receipt stopped half-way.
 */
export function printErrorMessage(code: PrintErrorCode): string {
  switch (code) {
    case 'unsupported':
      return 'This device cannot print.';
    case 'unauthorized':
      return 'Allow Bluetooth for Mountain Bakes in Android settings, then try again.';
    case 'bluetooth-off':
      return 'Turn Bluetooth on, then try again.';
    case 'no-printer':
      return 'No printer set up on this device. Choose one under More > Printer.';
    case 'unknown-device':
      return 'That printer is no longer paired with this phone. Pair it in Android settings, then choose it again under More > Printer.';
    case 'connect-failed':
      return 'The printer did not answer. Check it is switched on and in range.';
    case 'write-failed':
      return 'The receipt was cut short. Check the paper roll and print again.';
  }
}

/** Whether this build can print at all — false on iOS and under Jest. */
export function printingSupported(): boolean {
  return Platform.OS === 'android' && NativeThermalPrinter != null;
}

/**
 * Ask for `BLUETOOTH_CONNECT`, once, at the moment it is needed.
 *
 * Not at startup: a Bluetooth prompt on first launch, before the user has done
 * anything, is the prompt everybody denies. It is requested from the Printer
 * screen when they go looking for a printer, which is the one moment the reason
 * is self-evident.
 *
 * Below API 31 the permission does not exist as a runtime one — the manifest's
 * install-time `BLUETOOTH` covers it — so this resolves true without a prompt.
 * `PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT` is undefined on those
 * versions of the constant map, which is what the guard is really checking.
 */
export async function requestBluetoothPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (Number(Platform.Version) < 31) return true;

  const permission = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;
  if (!permission) return true;

  try {
    const already = await PermissionsAndroid.check(permission);
    if (already) return true;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    // The permissions module itself failed. Treat as refused: the print will
    // then fail with `unauthorized`, which is the truthful outcome.
    return false;
  }
}

/**
 * Every printer this phone is paired with.
 *
 * Asks for the permission first, so the screen has one call to make rather than
 * a request-then-list dance it could get wrong.
 */
export async function listPairedPrinters(): Promise<PairedPrinter[]> {
  const printer = requireModule();
  if (!(await requestBluetoothPermission())) throw new PrintError('unauthorized');
  try {
    return await printer.getPairedDevices();
  } catch (error) {
    throw asPrintError(error);
  }
}

/** Whether the adapter is on. `false` also covers a phone with no radio. */
export async function bluetoothEnabled(): Promise<boolean> {
  const printer = NativeThermalPrinter;
  if (!printer || Platform.OS !== 'android') return false;
  try {
    return await printer.isEnabled();
  } catch {
    return false;
  }
}

/**
 * Print the slip for a sale on the printer this device is set up with.
 *
 * Throws a [PrintError] on every failure path, including "no printer chosen" —
 * the caller shows [printErrorMessage] and does not have to know which of the
 * seven happened.
 */
export async function printSale(sale: SaleSlip, context: ReceiptContext = {}): Promise<void> {
  const target = selectedPrinter();
  if (!target) throw new PrintError('no-printer');
  await send(target.address, saleReceiptBase64(sale, { ...context, profile: target.profile }));
}

/** The test page, addressed explicitly — it is printed before anything is saved. */
export async function printTestPage(
  address: string,
  profile: PrinterProfile,
  context: ReceiptContext = {},
): Promise<void> {
  await send(address, testPageBase64(profile, context));
}

async function send(address: string, payloadBase64: string): Promise<void> {
  const printer = requireModule();
  if (!(await requestBluetoothPermission())) throw new PrintError('unauthorized');
  try {
    await printer.write(address, payloadBase64);
  } catch (error) {
    throw asPrintError(error);
  }
}

function requireModule(): NonNullable<typeof NativeThermalPrinter> {
  if (Platform.OS !== 'android' || !NativeThermalPrinter) {
    throw new PrintError('unsupported');
  }
  return NativeThermalPrinter;
}

const NATIVE_CODES: readonly PrintErrorCode[] = [
  'unauthorized',
  'bluetooth-off',
  'unknown-device',
  'connect-failed',
  'write-failed',
];

/**
 * A rejected native promise as a [PrintError].
 *
 * React Native puts the string passed to `Promise.reject(code, message)` on the
 * JS error's `code`. The list above is the contract with
 * `ThermalPrinterModule.kt`; anything outside it is a reject nobody planned
 * for, and it maps to `connect-failed` — the failure whose advice ("check the
 * printer is on") is the most likely to be useful when the cause is unknown.
 */
function asPrintError(error: unknown): PrintError {
  if (error instanceof PrintError) return error;
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : undefined;
  if (typeof code === 'string' && (NATIVE_CODES as readonly string[]).includes(code)) {
    return new PrintError(code as PrintErrorCode, message);
  }
  return new PrintError('connect-failed', message);
}
