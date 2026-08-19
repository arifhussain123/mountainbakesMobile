import { createNavigationContainerRef } from '@react-navigation/native';
import { routeForNotification, type NotificationPayload } from './linking';
import { landingTabFor, type AccessProfile } from './roleConfig';
import type { AppTabName, AppTabParamList } from './types';

/**
 * Imperative navigation for callers that live outside React.
 *
 * ---------------------------------------------------------------------------
 * Who calls this, honestly
 * ---------------------------------------------------------------------------
 * **Nothing yet.** `RootNavigator` attaches the ref to `NavigationContainer`,
 * and that is the only reference in the app today. The two intended callers are
 * both still ahead of their transport:
 *
 *   - **The notification handler.** `openNotification` below is its entry point.
 *     There is no notification library in the project — no Firebase, no notifee
 *     — so nothing delivers a payload to it yet.
 *   - **The sync engine.** A drain that parks a row as a conflict should be able
 *     to offer "review it". Today a conflict is recorded and the user reaches
 *     Sync Center by tapping the sync pill, which is declarative navigation and
 *     needs none of this.
 *
 * That is deliberate rather than dead code: the routing decisions are unit
 * tested ahead of the transports, so wiring one up later is a call site rather
 * than a design. It is written down because "two of them exist" is what this
 * comment used to claim, and a doc that overstates what is wired is worse than
 * no doc.
 *
 * Everything inside a component should use `useNavigation()`. Imperative
 * navigation skips the type-checked screen props and is easy to call before the
 * tree is mounted, which is why the helpers here refuse rather than throw when
 * it is not ready — a notification arriving during cold start must not crash the
 * app it is trying to open.
 */
export const navigationRef = createNavigationContainerRef<AppTabParamList>();

/** True once NavigationContainer has mounted and can accept an action. */
export function isNavigationReady(): boolean {
  return navigationRef.isReady();
}

/**
 * Navigate if the tree is up; report whether it happened.
 *
 * Callers that must not lose the intent (a cold-start notification) should hold
 * the payload and retry from `onReady`, rather than assume this succeeded.
 */
export function navigateIfReady<Name extends keyof AppTabParamList>(
  ...args: undefined extends AppTabParamList[Name]
    ? [screen: Name] | [screen: Name, params: AppTabParamList[Name]]
    : [screen: Name, params: AppTabParamList[Name]]
): boolean {
  if (!navigationRef.isReady()) return false;
  // The tuple spread is exactly React Navigation's own `navigate` signature; TS
  // cannot prove that through the conditional type, so this is the one cast.
  (navigationRef.navigate as (...a: unknown[]) => void)(...args);
  return true;
}

/**
 * Reset to a tab, clearing the stack behind it.
 *
 * Takes the tab rather than assuming `Home`, which is the bug this replaced: a
 * `branch_user` has no Home tab, so resetting to a literal `'Home'` targeted a
 * route that role's navigator does not contain and the reset went nowhere. Pass
 * `landingTabFor(profile)`.
 */
export function resetToTab(tab: AppTabName): boolean {
  if (!navigationRef.isReady()) return false;
  navigationRef.reset({ index: 0, routes: [{ name: tab }] });
  return true;
}

/**
 * What happened to a notification tap.
 *
 * Three outcomes rather than a boolean, because the caller must treat them
 * differently: `not-ready` is the cold-start case and the payload should be held
 * and replayed from `NavigationContainer`'s `onReady`, while `not-permitted` is
 * final — replaying it later would not help.
 */
export type NotificationOutcome = 'opened' | 'not-permitted' | 'not-ready';

/**
 * Open what a notification points at.
 *
 * This is the bridge the resolver was written for: `routeForNotification`
 * decides *where*, and this drives the navigator. It exists separately from
 * `linking.ts` so that file stays a pure function of (profile, payload) with no
 * navigation state in it — which is what makes its whole decision table
 * testable without mounting a navigator.
 *
 * A production-order push therefore opens the order **inside the Orders stack**:
 * the tab is navigated first and the detail pushed within it, so back goes to
 * the order list rather than dismissing onto whatever happened to be underneath.
 *
 * An unpermitted payload lands nowhere at all rather than on the landing tab.
 * A deep link is a URL someone followed and owes an answer; an unpermitted push
 * is a notification that should not have been delivered to this account, and
 * yanking the user off their screen for it would be the wrong answer twice.
 */
export function openNotification(
  profile: AccessProfile,
  payload: NotificationPayload,
): NotificationOutcome {
  const route = routeForNotification(profile, payload);
  if (!route) return 'not-permitted';
  if (!navigationRef.isReady()) return 'not-ready';

  // Nested form: `navigate(tab, { screen, params })` puts the detail inside the
  // tab's own stack. Navigating to the screen name alone would either miss (it
  // is not a route on the tab navigator) or, where names collide, land in the
  // wrong tab's copy of it.
  (navigationRef.navigate as (...a: unknown[]) => void)(
    route.tab,
    route.screen ? { screen: route.screen, params: route.params } : undefined,
  );
  return 'opened';
}

/**
 * The tab an unpermitted **deep link** falls back to.
 *
 * Re-exported through here so a caller outside React has one import for
 * imperative navigation rather than reaching into the config itself.
 */
export function landingTabFrom(profile: AccessProfile): AppTabName {
  return landingTabFor(profile);
}
