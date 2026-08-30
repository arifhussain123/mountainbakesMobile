/**
 * What differs between one thermal printer and the next.
 *
 * Almost nothing does, at this end of the market — they all speak the same
 * Epson command set, which is why `escpos.ts` carries no model-specific bytes.
 * What a receipt genuinely has to know is **how many characters fit across the
 * roll**, because that is what every column of a total is padded against. Get
 * it wrong by four and the amounts wrap onto their own lines.
 */

export interface PrinterProfile {
  /** Stable key. Stored with the chosen device, so renaming one is a migration. */
  id: string;
  /** What the Printer screen calls it. */
  label: string;
  /** Roll width, for the screen to show. */
  paperWidthMm: number;
  /**
   * Characters across one line in the printer's default font (Font A).
   *
   * 48 is the standard figure for an 80mm roll: a 72mm print area at 12 dots
   * per character on a 576-dot head. Font B would give 64, but nothing here
   * selects it — a receipt read at arm's length across a counter wants the
   * larger face.
   */
  columns: number;
}

/**
 * The Black Copper BC-89AC — an 80mm Bluetooth thermal receipt printer, and the
 * unit this app is set up for.
 *
 * The values are the standard 80mm ESC/POS ones rather than anything read off
 * this model's datasheet, and that is the right call rather than a shortcut:
 * every 80mm printer in this class shares a 576-dot head and a 48-column Font
 * A, and a profile that guessed at model-specific behaviour would be a claim
 * nobody has verified against the hardware.
 *
 * The one thing genuinely uncertain is whether a given unit has an auto-cutter
 * fitted. `escpos.cut()` handles that without a flag here — see the note on it.
 */
export const BLACK_COPPER_BC_89AC: PrinterProfile = {
  id: 'black-copper-bc-89ac',
  label: 'Black Copper BC-89AC',
  paperWidthMm: 80,
  columns: 48,
};

/**
 * The profiles the app offers. One, deliberately.
 *
 * A picker with a single entry is not a picker, and the screen does not draw
 * one — it names the printer this app is set up for and prints to whatever
 * paired device you select. Adding a second model means adding it here and
 * giving the screen the picker; nothing else in the printing layer changes,
 * because everything downstream reads `columns` from the profile rather than
 * assuming 48.
 */
export const PRINTER_PROFILES: readonly PrinterProfile[] = [BLACK_COPPER_BC_89AC];

export const DEFAULT_PROFILE: PrinterProfile = BLACK_COPPER_BC_89AC;

export function profileById(id: string | undefined): PrinterProfile {
  return PRINTER_PROFILES.find(p => p.id === id) ?? DEFAULT_PROFILE;
}
