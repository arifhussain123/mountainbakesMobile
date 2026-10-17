/**
 * @format
 */
const mockNavigateToRecord = jest.fn();

jest.mock('@/navigation/helpers', () => ({ navigateToRecord: (...args: unknown[]) => mockNavigateToRecord(...args) }));
jest.mock('@/navigation/routes', () => ({
  Routes: {
    SALE_DETAIL: 'SaleDetail',
    ORDER_DETAIL: 'OrderDetail',
    DISCOUNT_DETAIL: 'DiscountDetail',
    CASH_TRANSFER_DETAIL: 'CashTransferDetail',
    QUERY_DETAIL: 'QueryDetail',
    EVENT_DEMAND: 'EventDemand',
  },
}));

import { NOTIFICATION_TYPES, openNotificationRecord } from '@/features/notifications/deepLinks';
import type { NotificationType } from '@/api';

describe('NOTIFICATION_TYPES', () => {
  it('has an entry for every NotificationType the server can send (Step 0\'s full enumeration)', () => {
    const ALL_TYPES: NotificationType[] = [
      'order_created', 'order_ready', 'order_cancelled', 'low_stock', 'new_user', 'branch_added', 'price_changed',
      'password_reset', 'production_demand', 'production_reviewed', 'production_return', 'production_order_verified',
      'production_demand_cancelled', 'branch_discount', 'branch_discount_reviewed', 'cash_transfer',
      'cash_transfer_reviewed', 'support_query', 'support_resolved', 'finance_query', 'finance_query_resolved',
      'finance_query_updated', 'finance_query_message', 'finance_query_amended', 'event_created', 'event_reminder',
      'event_demand_due', 'event_demand_submitted', 'event_demand_reviewed', 'event_production_updated', 'security_alert',
    ];
    for (const type of ALL_TYPES) {
      expect(NOTIFICATION_TYPES[type]).toBeDefined();
      expect(NOTIFICATION_TYPES[type].icon).toBeTruthy();
    }
  });
});

describe('openNotificationRecord', () => {
  beforeEach(() => {
    mockNavigateToRecord.mockReset();
  });

  it('routes production_reviewed (demand approved/rejected) to ORDER_DETAIL with the related id as orderId', () => {
    const opened = openNotificationRecord({ type: 'production_reviewed', relatedId: 'demand-uuid-1' });
    expect(opened).toBe(true);
    expect(mockNavigateToRecord).toHaveBeenCalledWith('OrderDetail', { orderId: 'demand-uuid-1' });
  });

  it('routes branch_discount_reviewed to DISCOUNT_DETAIL', () => {
    openNotificationRecord({ type: 'branch_discount_reviewed', relatedId: 'discount-uuid' });
    expect(mockNavigateToRecord).toHaveBeenCalledWith('DiscountDetail', { discountId: 'discount-uuid' });
  });

  it('routes cash_transfer_reviewed to CASH_TRANSFER_DETAIL', () => {
    openNotificationRecord({ type: 'cash_transfer_reviewed', relatedId: 'ct-uuid' });
    expect(mockNavigateToRecord).toHaveBeenCalledWith('CashTransferDetail', { transferId: 'ct-uuid' });
  });

  it('routes support_resolved (Help Desk reply) to QUERY_DETAIL', () => {
    openNotificationRecord({ type: 'support_resolved', relatedId: 'ticket-uuid' });
    expect(mockNavigateToRecord).toHaveBeenCalledWith('QueryDetail', { ticketId: 'ticket-uuid' });
  });

  it('routes event_demand_due (demand due soon) to EVENT_DEMAND', () => {
    openNotificationRecord({ type: 'event_demand_due', relatedId: 'event-uuid' });
    expect(mockNavigateToRecord).toHaveBeenCalledWith('EventDemand', { eventId: 'event-uuid' });
  });

  it('returns false and does not navigate for a type with no deep link (e.g. security_alert)', () => {
    const opened = openNotificationRecord({ type: 'security_alert', relatedId: 'some-id' });
    expect(opened).toBe(false);
    expect(mockNavigateToRecord).not.toHaveBeenCalled();
  });

  it('returns false when relatedId is missing, even for an otherwise-linkable type', () => {
    const opened = openNotificationRecord({ type: 'cash_transfer_reviewed', relatedId: null });
    expect(opened).toBe(false);
    expect(mockNavigateToRecord).not.toHaveBeenCalled();
  });

  it('returns false for a Finance-only type this app has no detail screen for', () => {
    const opened = openNotificationRecord({ type: 'finance_query_resolved', relatedId: 'finance-ticket-uuid' });
    expect(opened).toBe(false);
  });
});
