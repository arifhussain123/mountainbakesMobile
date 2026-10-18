import { useCallback, useReducer, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getBusinessDate } from '@/api';

/**
 * What coming back to a Discounts screen should do for the monthly summary.
 *
 * - `rekey`   — the business day has turned over since the screen last
 *               rendered (and with it, perhaps, the month). The summary's query
 *               key carries the business date, so a re-render alone moves it to
 *               a new key, which fetches by itself. Refetching the old key
 *               first would be a wasted request for last month's figures.
 * - `refetch` — same day, but the figures are past their stale time.
 * - `none`    — fresh, or a request is already in flight (no duplicate).
 */
export type SummaryFocusAction = 'rekey' | 'refetch' | 'none';

export function summaryFocusAction(input: { renderedDate: string; today: string; isStale: boolean; isFetching: boolean }): SummaryFocusAction {
  if (input.today !== input.renderedDate) return 'rekey';
  if (input.isFetching || !input.isStale) return 'none';
  return 'refetch';
}

/**
 * Refreshes a monthly summary when its screen regains focus — returning from a
 * claim's detail, or switching back to the tab. A stack screen stays mounted
 * underneath, so neither the mount fetch nor the app-foreground refetch
 * (queryClient.ts) covers this. The first focus is the mount, which already
 * fetches, so it is skipped. No polling: nothing runs while the screen is not
 * in front.
 */
export function useSummaryFocusRefresh(query: { isStale: boolean; isFetching: boolean; refetch: () => unknown }): void {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const renderedDate = getBusinessDate();
  const latest = useRef({ query, renderedDate });
  latest.current = { query, renderedDate };
  const mounted = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!mounted.current) {
        mounted.current = true;
        return;
      }
      const { query: q, renderedDate: rendered } = latest.current;
      const action = summaryFocusAction({ renderedDate: rendered, today: getBusinessDate(), isStale: q.isStale, isFetching: q.isFetching });
      if (action === 'rekey') rerender();
      else if (action === 'refetch') void q.refetch();
    }, []),
  );
}
