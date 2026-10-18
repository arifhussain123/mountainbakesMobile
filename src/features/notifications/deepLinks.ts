// Direct file imports, not the `@/navigation` barrel — that barrel also
// exports `RootNavigator`, which pulls in every feature screen (including
// this one's own notification screens, and the API layer's SQLite offline
// queue). Jest can't transform that native module, so going through the full
// barrel here broke every test importing this file — same fix as
// `support/referenceTypes.ts` needed for the identical reason.
import { navigateToRecord } from '@/navigation/helpers';
import { Routes } from '@/navigation/routes';
import type { IconName } from '@/shared/ui';
import type { AppNotification, NotificationType } from '@/api';

export interface NotificationTypeConfig {
  icon: IconName;
  /** `null` when this type has nothing sensible to deep-link to in the branch app (e.g. Finance-only types, or types this app has no detail screen for) — the caller falls back to a plain alert/detail view. */
  openRecord: ((relatedId: string) => void) | null;
}

/**
 * One entry per `NotificationType` the server can create (Step 0's own
 * enumeration, from `notify()`'s call sites) — not just the ones this app's
 * role typically receives, so a type this role doesn't normally see still
 * renders and routes sensibly if the server ever sends one.
 *
 * `relatedId` is always the record's own DB id (never the human reference
 * number) — confirmed against each route's own detail screen, which all key
 * off the DB id the same way Help Desk's `SupportReference.entityId` does.
 */
export const NOTIFICATION_TYPES: Record<NotificationType, NotificationTypeConfig> = {
  order_created: { icon: 'sales', openRecord: (id) => navigateToRecord(Routes.SALE_DETAIL, { orderId: id }) },
  order_ready: { icon: 'sales', openRecord: (id) => navigateToRecord(Routes.SALE_DETAIL, { orderId: id }) },
  order_cancelled: { icon: 'sales', openRecord: (id) => navigateToRecord(Routes.SALE_DETAIL, { orderId: id }) },
  low_stock: { icon: 'stock', openRecord: null },
  new_user: { icon: 'user', openRecord: null },
  branch_added: { icon: 'building', openRecord: null },
  price_changed: { icon: 'receipt', openRecord: null },
  password_reset: { icon: 'lock', openRecord: null },
  production_demand: { icon: 'orders', openRecord: (id) => navigateToRecord(Routes.ORDER_DETAIL, { orderId: id }) },
  production_reviewed: { icon: 'orders', openRecord: (id) => navigateToRecord(Routes.ORDER_DETAIL, { orderId: id }) },
  production_return: { icon: 'rotate-ccw', openRecord: null },
  production_order_verified: { icon: 'orders', openRecord: (id) => navigateToRecord(Routes.ORDER_DETAIL, { orderId: id }) },
  production_demand_cancelled: { icon: 'orders', openRecord: (id) => navigateToRecord(Routes.ORDER_DETAIL, { orderId: id }) },
  branch_discount: { icon: 'percent', openRecord: (id) => navigateToRecord(Routes.DISCOUNT_DETAIL, { discountId: id }) },
  branch_discount_reviewed: { icon: 'percent', openRecord: (id) => navigateToRecord(Routes.DISCOUNT_DETAIL, { discountId: id }) },
  cash_transfer: { icon: 'transfer', openRecord: (id) => navigateToRecord(Routes.CASH_TRANSFER_DETAIL, { transferId: id }) },
  cash_transfer_reviewed: { icon: 'transfer', openRecord: (id) => navigateToRecord(Routes.CASH_TRANSFER_DETAIL, { transferId: id }) },
  support_query: { icon: 'headset', openRecord: (id) => navigateToRecord(Routes.QUERY_DETAIL, { ticketId: id }) },
  support_resolved: { icon: 'headset', openRecord: (id) => navigateToRecord(Routes.QUERY_DETAIL, { ticketId: id }) },
  // Finance Help Desk — a separate queue/role this app's branch_manager
  // screens have no detail route for (that's the Finance app shell's own
  // FinanceTicketDetailScreen, a different navigator entirely).
  finance_query: { icon: 'headset', openRecord: null },
  finance_query_resolved: { icon: 'headset', openRecord: null },
  finance_query_updated: { icon: 'headset', openRecord: null },
  finance_query_message: { icon: 'headset', openRecord: null },
  finance_query_amended: { icon: 'headset', openRecord: null },
  event_created: { icon: 'calendar', openRecord: (id) => navigateToRecord(Routes.EVENT_DEMAND, { eventId: id }) },
  event_reminder: { icon: 'calendar', openRecord: (id) => navigateToRecord(Routes.EVENT_DEMAND, { eventId: id }) },
  event_demand_due: { icon: 'calendar', openRecord: (id) => navigateToRecord(Routes.EVENT_DEMAND, { eventId: id }) },
  event_demand_submitted: { icon: 'calendar', openRecord: (id) => navigateToRecord(Routes.EVENT_DEMAND, { eventId: id }) },
  event_demand_reviewed: { icon: 'calendar', openRecord: (id) => navigateToRecord(Routes.EVENT_DEMAND, { eventId: id }) },
  event_production_updated: { icon: 'calendar', openRecord: null },
  security_alert: { icon: 'warning', openRecord: null },
};

/** Opens the right screen for a notification, or returns `false` when this type has no deep link (`relatedId` missing or the type has none) — the caller falls back to a plain alert-style detail view. */
export function openNotificationRecord(notification: Pick<AppNotification, 'type' | 'relatedId'>): boolean {
  const config = NOTIFICATION_TYPES[notification.type];
  if (!config.openRecord || !notification.relatedId) return false;
  config.openRecord(notification.relatedId);
  return true;
}
