/**
 * Route names — the single import surface for "what is this screen called".
 *
 * Deliberately a re-export rather than a fresh `Routes` const. The names are
 * already defined once in `types.ts`, where `AppTabName` is a union and
 * `TAB_ROOT_ROUTE` is `satisfies Record<AppTabName, string>` — so an unlisted
 * tab is a *compile* error, and the root route of every tab is checked against
 * the tab list. A parallel const of string literals would be a second place the
 * same names are written, and the comment on `TAB_ROOT_ROUTE` records what
 * happened last time three places disagreed: a deep link resolving to a route
 * name no navigator had, silently doing nothing.
 *
 * So: names are *declared* in `types.ts` and *reached* through here.
 */

export { TAB_ROOT_ROUTE, MORE_DETAIL_SCREENS } from './types';
export type { AppTabName, MoreRouteName } from './types';
