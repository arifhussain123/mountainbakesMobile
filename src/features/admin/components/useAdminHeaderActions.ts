import { useWindowDimensions } from 'react-native';
import { StackActions } from '@react-navigation/native';
import { useAppearanceHeaderActions } from '@/features/appearance';
import { useNotificationBellAction } from '@/features/notifications';
import { Routes, navigationRef, openDrawer } from '@/navigation';
import type { AppHeaderAction } from '@/shared/ui';
import { composeAdminHeaderActions } from '../utils/adminHeaderActions';

const MENU: AppHeaderAction = { icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' };

/** Global Search is a root-level modal, so it opens from any stack — the same push the bell uses. */
function openGlobalSearch(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(StackActions.push(Routes.GLOBAL_SEARCH));
}

const SEARCH: AppHeaderAction = { icon: 'search', onPress: openGlobalSearch, accessibilityLabel: 'Search' };

/**
 * Every Super Admin top-level header's actions: Search, Appearance and the
 * notifications bell (the web Topbar on every page), then the page's own
 * `extras`, then the menu button — or `nav` in its place.
 */
export function useAdminHeaderActions(options: { extras?: AppHeaderAction[]; nav?: AppHeaderAction } = {}): AppHeaderAction[] {
  const { width } = useWindowDimensions();
  const appearance = useAppearanceHeaderActions();
  const bell = useNotificationBellAction();
  return composeAdminHeaderActions({ search: SEARCH, appearance, bell, extras: options.extras, nav: options.nav ?? MENU, width });
}
