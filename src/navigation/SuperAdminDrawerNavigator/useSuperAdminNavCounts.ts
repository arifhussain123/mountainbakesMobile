import { getBusinessDate, useBackupHealth, useMessagingProvider, usePendingApprovals, useProductionBranchStock, useProductionOrders, useSuspiciousSignInCount } from '@/api';

/**
 * Keeps the queries behind Super Admin's badges (`computeSuperAdminBadges`) in
 * the cache from launch: demands waiting for Production, the branch stock
 * matrix, finance approvals, the messaging mode, today's suspicious sign-ins
 * and backup health. Each is a query its screen will read too.
 */
export function useSuperAdminNavCounts(): void {
  useProductionOrders();
  useProductionBranchStock();
  usePendingApprovals();
  useMessagingProvider();
  useSuspiciousSignInCount(getBusinessDate());
  useBackupHealth();
}
