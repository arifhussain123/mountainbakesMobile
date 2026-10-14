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

/** Opens the side drawer from anywhere, regardless of nesting depth. */
export function openDrawer(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(DrawerActions.openDrawer());
}

export function goBack(): void {
  if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
}
