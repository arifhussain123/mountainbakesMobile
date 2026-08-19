import { createNavigationContainerRef } from '@react-navigation/native';
import type { AppTabParamList } from './types';

/**
 * Imperative navigation for callers that live outside React.
 *
 * Two of them exist and both matter: the notification handler (a tap on a
 * production-order push must land on that order) and the sync engine (a drain
 * that parks a row as a conflict needs to be able to offer "review it"). Neither
 * is inside a component, so neither can call `useNavigation()`.
 *
 * Everything else should use `useNavigation()`. Imperative navigation skips the
 * type-checked screen props and is easy to call before the tree is mounted,
 * which is why `navigate` below refuses rather than throwing when it is not
 * ready — a notification that arrives during cold start must not crash the app
 * it is trying to open.
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

/** Return to the role's first tab. Used when a deep link is not permitted. */
export function resetToHome(): boolean {
  if (!navigationRef.isReady()) return false;
  navigationRef.reset({ index: 0, routes: [{ name: 'Home' }] });
  return true;
}
