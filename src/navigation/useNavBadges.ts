import { useEffect, useState } from 'react';
import { queryClient } from '@/api';
import { getBusinessDate } from '@/api';
import type {
  BranchDiscountListResponse,
  DailySaleRecordList,
  ProductionOrderListResponse,
  SpecialEventListResponse,
  SupportTicketListResponse,
} from '@/api';
import type { NavBadgeSource } from './navItems';
import { isActiveOrder } from '@/features/orders/utils/demandLines';

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
function computeBadges(): NavBadges {
  const badges: NavBadges = {};

  const orders = queryClient.getQueriesData<ProductionOrderListResponse>({ queryKey: ['productionOrders'] });
  const orderList = orders.find(([, data]) => data)?.[1];
  if (orderList) {
    const needsAction = orderList.orders.filter(isActiveOrder).length;
    if (needsAction > 0) badges.orders = needsAction;
  }

  const discounts = queryClient.getQueriesData<BranchDiscountListResponse>({ queryKey: ['branchDiscounts'] });
  const discountList = discounts.find(([, data]) => data)?.[1];
  if (discountList) {
    const awaitingProduction = discountList.discounts.filter((d) => d.status === 'pending').length;
    if (awaitingProduction > 0) badges.discounts = awaitingProduction;
  }

  const events = queryClient.getQueriesData<SpecialEventListResponse>({ queryKey: ['specialEvents'] });
  const eventList = events.find(([, data]) => data)?.[1];
  if (eventList) {
    // "Demand due soon" mirrors the Special Events screen's own threshold (7
    // days, no server constant exists — see that module's Step 0 report).
    const dueSoon = eventList.events.filter(
      (e) => e.status !== 'cancelled' && e.demandDueDate && e.daysRemaining != null && e.daysRemaining >= 0 && e.daysRemaining <= 7,
    ).length;
    if (dueSoon > 0) badges.events = dueSoon;
  }

  const dailySale = queryClient.getQueriesData<DailySaleRecordList>({ queryKey: ['dailySaleRecords'] });
  const dailySaleList = dailySale.find(([, data]) => data)?.[1];
  if (dailySaleList) {
    const today = getBusinessDate();
    const notCounted = dailySaleList.records.filter(
      (r) => r.businessDate !== today && r.manualCash === null && r.manualEasypaisa === null && r.manualBank === null,
    ).length;
    if (notCounted > 0) badges.dailySale = notCounted;
  }

  const tickets = queryClient.getQueriesData<SupportTicketListResponse>({ queryKey: ['supportTickets'] });
  const ticketList = tickets.find(([, data]) => data)?.[1];
  if (ticketList) {
    // No "unread" flag exists server-side (support_tickets carries no read
    // state) — a resolved/rejected ticket counts as "replied" here. Marking
    // one seen (clearing it from this badge) is the Query Detail screen's job
    // once it exists.
    const replied = ticketList.tickets.filter((t) => t.status !== 'open' && t.resolutionNote).length;
    if (replied > 0) badges.helpDesk = replied;
  }

  return badges;
}

/**
 * Refreshes on every render of the drawer (cheap — reads already-fetched
 * cache, no network) plus right after any mutation settles, via TanStack's
 * own cache-subscription so a sale/demand/ticket syncing while the drawer is
 * open updates its badge without the drawer needing to be reopened.
 */
export function useNavBadges(): NavBadges {
  const [badges, setBadges] = useState<NavBadges>(() => computeBadges());

  useEffect(() => {
    setBadges(computeBadges());
    // The cache notifies its subscribers synchronously, including from
    // inside another component's render — e.g. a screen mounting its first
    // `useQuery` builds a new QueryObserver inside a `useState` initializer,
    // which registers the query and fires this subscriber mid-render. Updating
    // this (unrelated) component's state synchronously at that point is
    // exactly what triggers React's "Cannot update a component while
    // rendering a different component" warning. Deferring to a microtask
    // (via a resolved promise — `queueMicrotask` isn't in this project's TS
    // lib) moves the update to right after the current render finishes —
    // still "right after the mutation settles" for all practical purposes,
    // just not literally inside someone else's render.
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      void Promise.resolve().then(() => setBadges(computeBadges()));
    });
    return unsubscribe;
  }, []);

  return badges;
}
