import {
  useDayClosing,
  useFinanceCashTransfers,
  useFinanceDashboard,
  useFinanceSettings,
  useFinanceTicketStats,
  usePendingApprovals,
  usePendingSupplierPaymentCount,
} from '@/api';
import { FINANCE_PENDING_TRANSFERS_QUERY } from '../navBadgeCounts';

/**
 * Keeps the queries behind Finance's badges (`computeFinanceBadges`) in the
 * cache from launch. The dashboard, ticket stats and settings are the very
 * queries their screens render; Cash Transfers asks for one row and reads
 * `total`. Today's closing waits for the dashboard's business date so it
 * shares the Daily Closing screen's own cache entry.
 */
export function useFinanceNavCounts(): void {
  const dashboard = useFinanceDashboard();
  const businessDate = dashboard.data?.businessDate;
  usePendingApprovals();
  useFinanceCashTransfers(FINANCE_PENDING_TRANSFERS_QUERY);
  useFinanceTicketStats();
  useFinanceSettings();
  usePendingSupplierPaymentCount();
  useDayClosing(businessDate, { enabled: !!businessDate });
}
