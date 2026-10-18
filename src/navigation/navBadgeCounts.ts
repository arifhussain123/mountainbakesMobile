import { getBusinessDate, queryClient, queryKeys } from '@/api';
import type {
  BranchDiscountListResponse,
  DailySaleRecordList,
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

export function computeNoBadges(): NavBadges {
  return {};
}
