import { createNavigationContainerRef, StackActions, CommonActions, DrawerActions } from '@react-navigation/native';
import { Routes } from './routes';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Navigate by name from anywhere, including outside a component (e.g. a session-expired handler). */
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(CommonActions.navigate({ name: name as string, params }));
}

/** Discards the whole navigation history — used after logout / session expiry. */
export function resetTo(name: keyof RootStackParamList): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: name as string }] }));
}

/** Every "not built yet" destination, reached from anywhere in the app. */
export function openComingSoon(title: string): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(StackActions.push(Routes.COMING_SOON, { title }));
}

/** Opens New Query, optionally prefilled with a reference ID — the Help Desk's own FAB, or "Report an issue" from a Sale/Order/Expense/Stock/Cash Transfer screen several stacks away. Root-level modal, same push pattern as `openComingSoon`. */
export function openNewQuery(prefillReferenceId?: string): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(StackActions.push(Routes.NEW_QUERY, { prefillReferenceId }));
}

/** Opens a Help Desk query's detail by ticket id — root-level modal. */
export function openQueryDetail(ticketId: string): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(StackActions.push(Routes.QUERY_DETAIL, { ticketId }));
}

/** Opens the Notification Center — root-level modal, reachable from any module header's bell. */
export function openNotifications(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(StackActions.push(Routes.NOTIFICATIONS));
}

/**
 * Jumps to a screen by name anywhere in the tree, including a stack this
 * screen is not nested in (e.g. opening a Sale's own detail screen from the
 * Help Desk's root-level Query Detail modal). `CommonActions.navigate`
 * resolves a route name against the WHOLE navigation state, unlike
 * `StackActions.push`, which only ever targets the nearest stack — this is the
 * one place that distinction matters, so it is not exposed more generally.
 * Loosely typed on purpose: the destination's own param list lives in a
 * different stack's `*ParamList`, which `RootStackParamList` does not (and
 * should not) know about.
 */
export function navigateToRecord(routeName: string, params: Record<string, unknown>): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(CommonActions.navigate({ name: routeName, params }));
}

/** Opens the side drawer from anywhere, regardless of nesting depth. */
export function openDrawer(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(DrawerActions.openDrawer());
}

export function goBack(): void {
  if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
}
