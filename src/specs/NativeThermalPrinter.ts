import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * A Bluetooth **Classic** serial port, which is all a thermal receipt printer is.
 *
 * ---------------------------------------------------------------------------
 * Why a module of our own rather than a library
 * ---------------------------------------------------------------------------
 * `SaleReceipt.tsx` used to open with "nothing in this app prints", and the
 * reason it gave still holds: `react-native-print` pins RN 0.84.1 through a
 * mandatory `react-native-windows` peer, and it targets the OS print dialog
 * anyway — which an 80mm roll on a serial link is not. The ESC/POS libraries in
 * the ecosystem (`react-native-bluetooth-escpos-printer` and its forks) are old
 * -architecture bridge modules; this app is New Architecture on RN 0.86, where
 * an unmaintained `ReactContextBaseJavaModule` is a build to fix rather than a
 * dependency to add.
 *
 * What the job actually needs is small enough to state in three methods: which
 * printers has the phone been paired with, is Bluetooth on, and send these
 * bytes to that one. Everything above it — the ESC/POS command stream, the
 * 48-column layout, the device profile — is plain TypeScript in
 * `common/printing/`, where it can be unit-tested without a device.
 *
 * ---------------------------------------------------------------------------
 * Bonded devices only: no scan, and therefore no location permission
 * ---------------------------------------------------------------------------
 * There is no discovery here on purpose. Pairing a printer is a one-off act the
 * user performs in Android's own Bluetooth settings, and a paired printer stays
 * paired. Scanning for one from inside the app would cost `BLUETOOTH_SCAN` and,
 * below API 31, `ACCESS_FINE_LOCATION` — a location prompt on a till app, to
 * find a device the phone already knows about.
 *
 * So `getPairedDevices` reads the **bonded** set. On API 31+ that needs
 * `BLUETOOTH_CONNECT` and nothing else; below it, the manifest's legacy
 * `BLUETOOTH` permission is install-time and there is no prompt at all.
 *
 * ---------------------------------------------------------------------------
 * One connection per print
 * ---------------------------------------------------------------------------
 * `write` opens the socket, sends, flushes, and closes. A held-open socket is
 * the standard way this goes wrong: the printer drops the link when it sleeps
 * or the roll is changed, and the next sale prints nothing while the app still
 * believes it is connected. Reconnecting per receipt costs about a second and
 * makes every print either work or fail out loud.
 *
 * `get`, not `getEnforcing`: there is no iOS implementation and no native
 * runtime under Jest. Both must degrade to "this device cannot print", which
 * the printing layer already has to handle for a phone with no printer paired.
 */

/** One printer the phone is already paired with. */
export type PairedPrinter = {
  /** The name the printer advertises, e.g. `BlackCopper BC-89AC`. */
  name: string;
  /** MAC address — the stable identity, and what `write` addresses. */
  address: string;
};

export interface Spec extends TurboModule {
  /**
   * Whether this device has a Bluetooth adapter **and** it is switched on.
   *
   * Two failures folded into one answer deliberately: from the till's point of
   * view "this phone has no Bluetooth" and "Bluetooth is off" lead to the same
   * next step, which is that nothing can print until someone fixes it outside
   * the app. Turning the adapter on programmatically is deprecated from API 33
   * and was never something a POS should do behind the operator's back.
   */
  isEnabled(): Promise<boolean>;

  /**
   * Every bonded Bluetooth Classic device, printer or not.
   *
   * Unfiltered on purpose. Android exposes a device class for a bonded device,
   * but thermal printers from this end of the market report themselves
   * inconsistently — `IMAGING`, `UNCATEGORIZED`, and sometimes a class of zero.
   * Filtering on it is how a printer that is sitting right there fails to
   * appear in the list with no way for the user to say otherwise. The screen
   * shows all of them and lets a human pick.
   *
   * Rejects with `unauthorized` when `BLUETOOTH_CONNECT` has not been granted.
   */
  getPairedDevices(): Promise<PairedPrinter[]>;

  /**
   * Connect to `address`, send `payloadBase64`, close.
   *
   * Base64 rather than an array of numbers: an ESC/POS receipt is a few
   * kilobytes of arbitrary bytes, and the bridge has no byte-array type — a
   * `number[]` would cross as that many doubles. `common/printing/escpos.ts`
   * does the encoding.
   *
   * Rejects with a coded reason (`unauthorized`, `bluetooth-off`,
   * `unknown-device`, `connect-failed`, `write-failed`) so the caller can say
   * something specific rather than showing a stack trace to a cashier.
   */
  write(address: string, payloadBase64: string): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('ThermalPrinter');
