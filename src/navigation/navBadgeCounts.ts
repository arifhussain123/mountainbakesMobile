import { getBusinessDate, queryClient, queryKeys } from '@/api';
import type {
  BackupHealth,
  BackupHealthStatus,
  BranchDiscountListResponse,
  CashTransferListResponse,
  DailySaleRecordList,
  FinanceCashTransferQuery,
  FinanceDashboard,
  FinanceDayClosing,
  FinancePendingApproval,
  FinanceSettings,
  FinanceTicketStats,
  MessagingProviderStatus,
  ProductionBranchStockResponse,
  ProductionOrderListResponse,
  ProductionOrderStatus,
  ProductionStockListResponse,
  SpecialEventListResponse,
  SupportTicketListResponse,
} from '@/api';
import { isActiveOrder } from '@/features/orders/utils/demandLines';
import type { NavBadgeSource } from './navItems';

export type NavBadges = Partial<Record<Exclude<NavBadgeSource, null>, number>>;

/**
 * Badge counts straight from whatever TanStack Query already has cached for
 * each module — never a fresh network call, so opening the drawer is never
 * gated on the network (CLAUDE.md Section 36/the Drawer brief's own rule). A
 * module nobody has opened yet in this session simply shows no badge rather
 * than a zero that would otherwise need a request to earn.
 *
 * `getQueriesData` with a one-element key (not the full key with params) does
 * a PREFIX match — this reads whatever params each screen actually queried
 * with, rather than guessing the exact params object a cache entry was stored
 * under.
 */
function firstCached<T>(root: string): T | undefined {
  return queryClient.getQueriesData<T>({ queryKey: [root] }).find(([, data]) => data)?.[1];
}

function setIfPositive(badges: NavBadges, key: keyof NavBadges, count: number | undefined): void {
  if (count && count > 0) badges[key] = count;
}

function helpDeskReplied(): number | undefined {
  // No "unread" flag exists server-side (support_tickets carries no read
  // state) — a resolved/rejected ticket counts as "replied" here. Marking
  // one seen (clearing it from this badge) is the Query Detail screen's job
  // once it exists.
  return firstCached<SupportTicketListResponse>('supportTickets')?.tickets.filter((t) => t.status !== 'open' && t.resolutionNote).length;
}

export function computeBranchBadges(): NavBadges {
  const badges: NavBadges = {};

  setIfPositive(badges, 'orders', firstCached<ProductionOrderListResponse>('productionOrders')?.orders.filter(isActiveOrder).length);
  setIfPositive(
    badges,
    'discounts',
    firstCached<BranchDiscountListResponse>('branchDiscounts')?.discounts.filter((d) => d.status === 'pending').length,
  );

  // "Demand due soon" mirrors the Special Events screen's own threshold (7
  // days, no server constant exists — see that module's Step 0 report).
  setIfPositive(
    badges,
    'events',
    firstCached<SpecialEventListResponse>('specialEvents')?.events.filter(
      (e) => e.status !== 'cancelled' && e.demandDueDate && e.daysRemaining != null && e.daysRemaining >= 0 && e.daysRemaining <= 7,
    ).length,
  );

  const today = getBusinessDate();
  setIfPositive(
    badges,
    'dailySale',
    firstCached<DailySaleRecordList>('dailySaleRecords')?.records.filter(
      (r) => r.businessDate !== today && r.manualCash === null && r.manualEasypaisa === null && r.manualBank === null,
    ).length,
  );

  setIfPositive(badges, 'helpDesk', helpDeskReplied());
  return badges;
}

/**
 * The two points where a demand waits on Production's sign-off: 'pending'
 * (the web's "Waiting" — not yet reviewed and sent) and 'verified' (the
 * branch has counted it in; `PUT /:id/final-approve` only accepts this
 * status). 'awaiting_verification' is waiting on the branch, not Production.
 */
const PRODUCTION_ORDER_NEEDS_APPROVAL: readonly ProductionOrderStatus[] = ['pending', 'verified'];

/**
 * Same cache-only rule as the Branch badges. Returns/Discounts/Stock are kept
 * warm by `useProductionNavCounts` (mounted once by the Production drawer), so
 * these badges show from launch rather than only after each screen is opened.
 */
export function computeProductionBadges(): NavBadges {
  const badges: NavBadges = {};

  setIfPositive(
    badges,
    'orders',
    firstCached<ProductionOrderListResponse>('productionOrders')?.orders.filter((o) => PRODUCTION_ORDER_NEEDS_APPROVAL.includes(o.status)).length,
  );
  setIfPositive(badges, 'returns', queryClient.getQueryData<number>(queryKeys.productionReturnsAwaitingCount()));
  setIfPositive(badges, 'discounts', queryClient.getQueryData<number>(queryKeys.productionDiscountsAwaitingCount()));
  // Today's pool only — the status is the server's (`balance < branchDemand`
  // → 'shortage'); 'out' is a different state and not counted here.
  setIfPositive(
    badges,
    'productionStock',
    queryClient.getQueryData<ProductionStockListResponse>(queryKeys.productionStock())?.rows.filter((r) => r.status === 'shortage').length,
  );
  setIfPositive(badges, 'helpDesk', helpDeskReplied());
  return badges;
}

/** The count-only query behind Finance's Cash Transfers badge — `useFinanceNavCounts` fetches it, `computeFinanceBadges` reads its `total`. */
export const FINANCE_PENDING_TRANSFERS_QUERY: FinanceCashTransferQuery = { status: 'pending', limit: 1 };

/**
 * Same cache-only rule again, kept warm by `useFinanceNavCounts`. Daily
 * Closing and Settings are states, not counts (`badgeDot` items): 1 means
 * "show the dot" — today's ledger day is still open, or Super Admin is
 * currently allowed to modify finance records.
 */
export function computeFinanceBadges(): NavBadges {
  const badges: NavBadges = {};

  setIfPositive(badges, 'approvals', queryClient.getQueryData<FinancePendingApproval[]>(queryKeys.pendingApprovals())?.length);
  setIfPositive(
    badges,
    'cashTransfers',
    queryClient.getQueryData<CashTransferListResponse>(queryKeys.financeCashTransfers(FINANCE_PENDING_TRANSFERS_QUERY))?.total,
  );

  // The server's business date, as the Daily Closing screen itself keys it.
  const businessDate = queryClient.getQueryData<FinanceDashboard>(queryKeys.financeDashboard())?.businessDate;
  if (businessDate && queryClient.getQueryData<FinanceDayClosing>(queryKeys.dayClosing(businessDate))?.status === 'open') {
    badges.dailyClosing = 1;
  }

  // `waiting` is the server's "Waiting for Finance" bucket.
  setIfPositive(badges, 'helpDesk', queryClient.getQueryData<Partial<FinanceTicketStats>>(queryKeys.financeTicketStats())?.waiting);
  if (queryClient.getQueryData<FinanceSettings>(queryKeys.financeSettings())?.allowSuperAdminWrite) badges.financeSettings = 1;
  return badges;
}

const BACKUP_ALERT_STATUSES: readonly BackupHealthStatus[] = ['overdue', 'failed', 'never'];

/**
 * Super Admin's badges, by the same cache-only rule. Orders, Finance Ledger,
 * Recipients, Users, Database Backup and Branch Stock are kept warm by
 * `useSuperAdminNavCounts`; Daily Sale Records, Special Events and Support
 * Center show once their screens have loaded data. Settings' restriction
 * signal has no server source yet, so it never shows.
 *
 * Dot items set 1 for "show the dot", like Finance's.
 */
export function computeSuperAdminBadges(): NavBadges {
  const badges: NavBadges = {};

  // Demands waiting for Production, the same two statuses Production's own badge counts.
  setIfPositive(
    badges,
    'orders',
    firstCached<ProductionOrderListResponse>('productionOrders')?.orders.filter((o) => PRODUCTION_ORDER_NEEDS_APPROVAL.includes(o.status)).length,
  );

  const today = getBusinessDate();
  setIfPositive(
    badges,
    'dailySale',
    firstCached<DailySaleRecordList>('dailySaleRecords')?.records.filter(
      (r) => r.businessDate !== today && r.manualCash === null && r.manualEasypaisa === null && r.manualBank === null,
    ).length,
  );

  // A branch with any product below zero. The matrix is products × branches.
  const branchStock = queryClient.getQueryData<ProductionBranchStockResponse>(queryKeys.productionBranchStock());
  if (branchStock?.branches.some((b) => branchStock.rows.some((r) => (r.byBranch[b.branchId] ?? 0) < 0))) {
    badges.branchStockNegative = 1;
  }

  // Demand window closed on an event that is still ahead. The list carries no
  // per-branch submission state, so "branches pending" can't be checked here.
  setIfPositive(
    badges,
    'events',
    firstCached<SpecialEventListResponse>('specialEvents')?.events.filter(
      (e) => (e.status === 'upcoming' || e.status === 'active') && e.demandDueDate !== null && e.demandDueDate < today,
    ).length,
  );

  setIfPositive(badges, 'approvals', queryClient.getQueryData<FinancePendingApproval[]>(queryKeys.pendingApprovals())?.length);
  setIfPositive(badges, 'supportCenter', firstCached<SupportTicketListResponse>('supportTickets')?.tickets.filter((t) => t.status === 'open').length);

  if (queryClient.getQueryData<MessagingProviderStatus>(queryKeys.messagingProvider())?.live === false) badges.recipientsTestMode = 1;
  // "New" = flagged today. The server keeps no seen/unseen state for an admin.
  if (queryClient.getQueryData<number>(queryKeys.suspiciousSignInCount(today))) badges.suspiciousSignIns = 1;

  const backup = queryClient.getQueryData<BackupHealth>(queryKeys.backupHealth());
  if (backup && [backup.daily, backup.weekly, backup.monthly].some((t) => BACKUP_ALERT_STATUSES.includes(t.status))) {
    badges.backupAlert = 1;
  }
  return badges;
}

export function computeNoBadges(): NavBadges {
  return {};
}
