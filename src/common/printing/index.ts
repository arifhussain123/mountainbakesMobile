/**
 * Printing to a Bluetooth thermal receipt printer.
 *
 * Four layers, and each can be read without the one below it:
 *
 *   escpos.ts        the command language, as pure functions over `number[]`
 *   profiles.ts      what differs between models — the column count, really
 *   receipt.ts       a `SaleSlip` as blocks, and blocks as bytes
 *   printService.ts  permission, transport and every named failure
 *
 * The transport itself is `specs/NativeThermalPrinter.ts`, and which printer
 * this handset uses is `state/printerStore.ts`. Nothing outside this folder
 * should reach for the native module directly — `printService` is where the
 * permission and the error mapping live, and a caller that skips it gets
 * neither.
 */

export type { Align, Block, TextBlock, TextStyle } from './escpos';
export { encode, preview, renderBlocks, toBase64, wrap } from './escpos';

export type { PrinterProfile } from './profiles';
export {
  BLACK_COPPER_BC_89AC,
  DEFAULT_PROFILE,
  PRINTER_PROFILES,
  profileById,
} from './profiles';

export type { ReceiptContext } from './receipt';
export {
  amountRow,
  saleReceiptBase64,
  saleReceiptBlocks,
  saleReceiptBytes,
  testPageBase64,
  testPageBlocks,
} from './receipt';

export type { PrintErrorCode } from './printService';
export {
  PrintError,
  bluetoothEnabled,
  listPairedPrinters,
  printErrorMessage,
  printSale,
  printTestPage,
  printingSupported,
  requestBluetoothPermission,
} from './printService';
