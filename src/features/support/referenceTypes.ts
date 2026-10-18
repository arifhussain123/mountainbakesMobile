// Direct file imports, not the `@/navigation` barrel — that barrel also
// exports `RootNavigator`, which pulls in every feature screen (including
// this one's own `HelpDeskListScreen`, which pulls in the API layer's SQLite
// offline queue). Jest can't transform that native module, so this file
// going through the full barrel broke every test that imports it — this is
// the one place in the app that distinction actually matters.
import { navigateToRecord } from '@/navigation/helpers';
import { Routes } from '@/navigation/routes';
import type { IconName } from '@/shared/ui';
import type { SupportReference, SupportReferenceType } from '@/api';
import type { SupportedReferencePrefix } from './schemas';

export interface ReferenceTypeConfig {
  type: SupportReferenceType;
  prefix: SupportedReferencePrefix;
  /** "Sale", "Demand", … — used as the card's type label and in a11y strings. */
  label: string;
  icon: IconName;
  /**
   * Opens the record's own screen. A detail screen for sale/demand/cash
   * deposit (needs `reference.entityId`, the DB id — never `referenceId`,
   * the human number); the module's LIST screen for expense/stock, which
   * have no detail screen today (confirmed in Step 0 — `ExpensesStackParamList`/
   * `StockStackParamList` carry no detail route for either).
   */
  openRecord: (reference: Pick<SupportReference, 'entityId'>) => void;
}

/** Keyed by prefix (not `SupportReferenceType`) because that's what a typed reference ID and `refType()` on the server both start from. */
export const REFERENCE_TYPES: Record<SupportedReferencePrefix, ReferenceTypeConfig> = {
  MB: {
    type: 'sale',
    prefix: 'MB',
    label: 'Sale',
    icon: 'sales',
    openRecord: (reference) => {
      if (reference.entityId) navigateToRecord(Routes.SALE_DETAIL, { orderId: reference.entityId });
    },
  },
  DMD: {
    type: 'demand',
    prefix: 'DMD',
    label: 'Demand',
    icon: 'orders',
    openRecord: (reference) => {
      if (reference.entityId) navigateToRecord(Routes.ORDER_DETAIL, { orderId: reference.entityId });
    },
  },
  EXP: {
    type: 'expense',
    prefix: 'EXP',
    label: 'Expense',
    icon: 'receipt',
    // No Expense Detail screen exists (Step 0) — the list is the closest "open record" gets.
    openRecord: () => navigateToRecord(Routes.SHOP_EXPENSES_LIST, {}),
  },
  STK: {
    type: 'stock',
    prefix: 'STK',
    label: 'Stock',
    icon: 'stock',
    // STK- is a per-PRODUCT code (products.stock_code), not a per-movement id — there is
    // no single-item Stock Detail screen to deep-link into, only the branch's Stock list.
    openRecord: () => navigateToRecord(Routes.STOCK_OVERVIEW, {}),
  },
  CT: {
    type: 'cash_transfer',
    prefix: 'CT',
    label: 'Cash Deposit',
    icon: 'transfer',
    openRecord: (reference) => {
      if (reference.entityId) navigateToRecord(Routes.CASH_TRANSFER_DETAIL, { transferId: reference.entityId });
    },
  },
};

/** `referenceId` must already be validated/normalized (see `schemas.ts`) — this only reads its prefix, it does not re-check the pattern. */
export function referenceTypeFor(referenceId: string): ReferenceTypeConfig | null {
  const prefix = referenceId.split('-')[0] as SupportedReferencePrefix | undefined;
  if (!prefix) return null;
  return REFERENCE_TYPES[prefix] ?? null;
}
