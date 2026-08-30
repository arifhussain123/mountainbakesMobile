/**
 * Public API of the `printer` feature.
 *
 * The feature is one screen: which paired Bluetooth printer this handset sends
 * receipts to. Everything it drives lives outside it on purpose —
 * `common/printing/` builds the ESC/POS, `state/printerStore` holds the choice,
 * and `common/till/SaleReceipt` is what actually prints. Both of those are read
 * by more than one slice, which is what promotes them out of here.
 *
 * Cross-feature imports go through this barrel only — never reach into
 * `features/printer/screens/…` from another slice.
 */

export * from './screens';
