import { useMemo } from 'react';
import { queryClient } from '@/api';
import type { CashTransfer, CashTransferListResponse, Expense, ExpenseListResponse, Order, OrderListResponse, ProductionOrder, ProductionOrderListResponse } from '@/api';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { IconName } from '@/shared/ui';

export interface RecentRecordOption {
  referenceId: string;
  icon: IconName;
  /** "Walk-in · Rs. 400" / "45 products · 16 Oct" — one line, enough to recognize the record without opening it. */
  subtitle: string;
  date: string;
}

const RECENT_LIMIT = 8;

/**
 * "Pick from recent" reads straight from whatever TanStack Query already has
 * cached for Sales/Orders/Expenses/Cash Transfers — the same zero-extra-
 * network-call approach `useNavBadges` uses for the Drawer's badges — so
 * opening this sheet is never gated on the network and never fires four more
 * list requests just to populate a picker. A module nobody has opened this
 * session simply contributes nothing to the list, same as that badge logic.
 */
export function useRecentRecords(): RecentRecordOption[] {
  return useMemo(() => {
    const options: RecentRecordOption[] = [];

    const orders = queryClient.getQueriesData<OrderListResponse>({ queryKey: ['orders'] });
    const orderList = (orders.find(([, data]) => data)?.[1]?.orders ?? []) as Order[];
    for (const order of orderList.slice(0, RECENT_LIMIT)) {
      options.push({
        referenceId: order.orderNumber,
        icon: 'sales',
        subtitle: `${order.customerName || 'Walk-in'} · ${formatCurrency(order.grandTotal)}`,
        date: order.businessDate,
      });
    }

    const demands = queryClient.getQueriesData<ProductionOrderListResponse>({ queryKey: ['productionOrders'] });
    const demandList = (demands.find(([, data]) => data)?.[1]?.orders ?? []) as ProductionOrder[];
    for (const demand of demandList.slice(0, RECENT_LIMIT)) {
      options.push({
        referenceId: demand.demandNumber,
        icon: 'orders',
        subtitle: `${demand.items.length} product${demand.items.length === 1 ? '' : 's'} · ${formatDisplayDate(demand.date)}`,
        date: demand.date,
      });
    }

    const expenses = queryClient.getQueriesData<ExpenseListResponse>({ queryKey: ['expenses'] });
    const expenseList = (expenses.find(([, data]) => data)?.[1]?.expenses ?? []) as Expense[];
    for (const expense of expenseList.slice(0, RECENT_LIMIT)) {
      options.push({
        referenceId: expense.expenseNumber,
        icon: 'receipt',
        subtitle: `${expense.description} · ${formatCurrency(expense.amount)}`,
        date: expense.date,
      });
    }

    const deposits = queryClient.getQueriesData<CashTransferListResponse>({ queryKey: ['cashTransfers'] });
    const depositList = (deposits.find(([, data]) => data)?.[1]?.transfers ?? []) as CashTransfer[];
    for (const deposit of depositList.slice(0, RECENT_LIMIT)) {
      options.push({
        referenceId: deposit.transferNo,
        icon: 'transfer',
        subtitle: `${formatCurrency(deposit.amount)} · ${formatDisplayDate(deposit.date)}`,
        date: deposit.date,
      });
    }

    return options.sort((a, b) => b.date.localeCompare(a.date));
  }, []);
}
