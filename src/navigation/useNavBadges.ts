import { useEffect, useRef, useState } from 'react';
import { queryClient } from '@/api';
import type { NavBadges } from './navBadgeCounts';
import { useRoleShell } from './roleShells';

export type { NavBadges } from './navBadgeCounts';

function badgesEqual(a: NavBadges, b: NavBadges): boolean {
  const aKeys = Object.keys(a) as (keyof NavBadges)[];
  const bKeys = Object.keys(b) as (keyof NavBadges)[];
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

/**
 * The signed-in role's badge counts (its shell's `computeBadges`, see
 * `navBadgeCounts.ts`). Refreshes on every render of the drawer (cheap — reads
 * already-fetched cache, no network) plus right after any query or mutation
 * settles, via TanStack's own cache-subscription so a sale/demand/ticket
 * syncing while the drawer is open updates its badge without the drawer
 * needing to be reopened.
 */
export function useNavBadges(): NavBadges {
  const { computeBadges } = useRoleShell();
  const [badges, setBadges] = useState<NavBadges>(() => computeBadges());
  const badgesRef = useRef(badges);
  badgesRef.current = badges;

  useEffect(() => {
    // `computeBadges()` always returns a brand-new object, so calling
    // `setBadges` unconditionally on every cache event gives this
    // always-mounted hook a fresh object reference every time — forcing
    // DrawerContent/NotchTabBar to re-render even when the counts didn't
    // change. If anything downstream of that re-render touches the query
    // cache (mounts/unmounts a query observer, etc.), the cache fires
    // another event, which calls `setBadges` again, forever — exactly
    // React's "Maximum update depth exceeded". Comparing against the
    // previous value and only updating state when the counts actually
    // changed breaks that cycle.
    const next = computeBadges();
    if (!badgesEqual(badgesRef.current, next)) setBadges(next);

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
      void Promise.resolve().then(() => {
        const updated = computeBadges();
        if (!badgesEqual(badgesRef.current, updated)) setBadges(updated);
      });
    });
    return unsubscribe;
  }, [computeBadges]);

  return badges;
}
