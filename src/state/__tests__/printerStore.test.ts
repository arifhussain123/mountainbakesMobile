import { PreferenceKeys, prefs } from '@/common/storage/preferences';
import { BLACK_COPPER_BC_89AC } from '@/common/printing/profiles';
import { selectedPrinter, usePrinterStore } from '../printerStore';

/**
 * Which printer this handset uses, and that it survives a cold start.
 *
 * The persistence half is the part worth a test. The store reads MMKV at module
 * scope so the slip's Print button knows on the first frame whether a printer
 * exists — a read that happens one render later is a button that flickers in,
 * and one that never happens is a counter that has to re-pick its printer every
 * morning.
 */

beforeEach(() => {
  prefs.clearAll();
  usePrinterStore.setState({ address: null, name: null, profile: BLACK_COPPER_BC_89AC });
});

describe('usePrinterStore', () => {
  it('starts with nothing chosen', () => {
    expect(usePrinterStore.getState().address).toBeNull();
    expect(selectedPrinter()).toBeNull();
  });

  it('writes the choice through to preferences, not only to memory', () => {
    usePrinterStore.getState().select({ address: '00:11:22:33:44:55', name: 'BC-89AC' });

    expect(prefs.getString(PreferenceKeys.printerAddress)).toBe('00:11:22:33:44:55');
    expect(prefs.getString(PreferenceKeys.printerName)).toBe('BC-89AC');
  });

  /**
   * The cold-start path: `jest.resetModules()` re-runs the module body, which
   * is where the MMKV read lives. Without it this would only prove the setter
   * works within one session, which is not the claim the store makes.
   */
  it('reads the stored choice back at module scope on the next launch', () => {
    usePrinterStore.getState().select({ address: 'AA:BB:CC:DD:EE:FF', name: 'Counter printer' });

    jest.resetModules();
    const reloaded = require('../printerStore') as typeof import('../printerStore');

    expect(reloaded.usePrinterStore.getState().address).toBe('AA:BB:CC:DD:EE:FF');
    expect(reloaded.usePrinterStore.getState().name).toBe('Counter printer');
  });

  it('forgets a printer from storage as well as from state', () => {
    usePrinterStore.getState().select({ address: '00:11', name: 'BC-89AC' });
    usePrinterStore.getState().clear();

    expect(usePrinterStore.getState().address).toBeNull();
    expect(prefs.contains(PreferenceKeys.printerAddress)).toBe(false);
    expect(prefs.contains(PreferenceKeys.printerName)).toBe(false);
  });

  it('defaults to the 80mm Black Copper profile', () => {
    expect(usePrinterStore.getState().profile).toEqual(BLACK_COPPER_BC_89AC);
    expect(usePrinterStore.getState().profile.columns).toBe(48);
  });
});

describe('selectedPrinter', () => {
  it('reads the choice without a hook, for the button handler that prints', () => {
    usePrinterStore.getState().select({ address: '00:11', name: 'BC-89AC' });
    expect(selectedPrinter()).toEqual({
      address: '00:11',
      name: 'BC-89AC',
      profile: BLACK_COPPER_BC_89AC,
    });
  });

  it('falls back to the address when the printer reported no name', () => {
    // A bonded device can come back nameless while Android's cache is cold. The
    // address is what actually addresses it, so a nameless printer stays usable
    // rather than showing an empty row.
    usePrinterStore.setState({ address: '00:11', name: null });
    expect(selectedPrinter()?.name).toBe('00:11');
  });
});
