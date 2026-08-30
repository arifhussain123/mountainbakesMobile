import { create } from 'zustand';

import { PreferenceKeys, prefs } from '@/common/storage/preferences';
import { DEFAULT_PROFILE, type PrinterProfile } from '@/common/printing/profiles';

/**
 * Which receipt printer **this phone** prints to.
 *
 * ---------------------------------------------------------------------------
 * Device state, not tenant state, and it never reaches the API
 * ---------------------------------------------------------------------------
 * A branch may have four phones on the counter and two printers behind it. The
 * pairing is a fact about one handset, exactly like the accent and the
 * typeface, so it lives beside them in the unencrypted preferences MMKV and
 * there is no endpoint for it. Putting it in `AppSettings` would make one
 * shift's choice of printer everybody's.
 *
 * ---------------------------------------------------------------------------
 * Read at module scope, for the same reason the theme is
 * ---------------------------------------------------------------------------
 * The initial state below is a real synchronous read, not a default a later
 * effect corrects. The slip's Print button has to know on the **first** frame
 * whether a printer exists: a button that appears one render after the slip is
 * a button the cashier has already decided is not there, and one that starts
 * enabled and then disappears is worse.
 *
 * This holds an **address and a name, not a connection.** There is no socket to
 * keep alive here — `NativeThermalPrinter.write` opens and closes one per
 * receipt, for the reasons its spec gives. So a printer being "set up" says
 * only that a human once picked it from the paired list; whether it answers is
 * decided at the moment of printing and reported then.
 */

interface PrinterState {
  /** MAC address of the chosen printer, or null when none has been picked. */
  address: string | null;
  /**
   * What to call it on screen.
   *
   * Cached alongside the address rather than looked up: reading the name back
   * means going to the Bluetooth adapter, which needs the runtime permission
   * and can be slow — neither of which a settings row that just says which
   * printer is selected should depend on.
   */
  name: string | null;
  /**
   * The paper profile. One exists today (`Black Copper BC-89AC`), and it is
   * stored rather than assumed so adding a second model does not silently
   * reinterpret every device already set up.
   */
  profile: PrinterProfile;
  select: (printer: { address: string; name: string }) => void;
  clear: () => void;
}

function initialAddress(): string | null {
  try {
    return prefs.getString(PreferenceKeys.printerAddress) ?? null;
  } catch {
    // A preference is never worth failing a cold start over. No printer set up
    // is a state the whole feature already handles.
    return null;
  }
}

function initialName(): string | null {
  try {
    return prefs.getString(PreferenceKeys.printerName) ?? null;
  } catch {
    return null;
  }
}

export const usePrinterStore = create<PrinterState>(set => ({
  address: initialAddress(),
  name: initialName(),
  profile: DEFAULT_PROFILE,

  select: printer => {
    prefs.set(PreferenceKeys.printerAddress, printer.address);
    prefs.set(PreferenceKeys.printerName, printer.name);
    set({ address: printer.address, name: printer.name });
  },

  clear: () => {
    prefs.remove(PreferenceKeys.printerAddress);
    prefs.remove(PreferenceKeys.printerName);
    set({ address: null, name: null });
  },
}));

/**
 * The chosen printer as a plain read, for callers outside React.
 *
 * `printService.printSale` is the one that needs it: it is invoked from a
 * button handler and must not be a hook, or every screen that can print would
 * have to subscribe to a store it only reads at the moment of a tap.
 */
export function selectedPrinter(): { address: string; name: string; profile: PrinterProfile } | null {
  const { address, name, profile } = usePrinterStore.getState();
  return address ? { address, name: name ?? address, profile } : null;
}
