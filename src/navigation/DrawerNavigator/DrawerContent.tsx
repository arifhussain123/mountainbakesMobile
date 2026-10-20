import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import type { NavigationState, PartialState } from '@react-navigation/native';
import { useAuthStore } from '@/state';
import { roleLabel } from '@/shared/utils';
import { Routes } from '../routes';
import { DrawerMenu, type DrawerMenuRow } from '../components';
import { DRAWER_GROUPED, GROUP_LABEL, isNavItemActive } from '../navItems';
import { useRoleShell } from '../roleShells';
import { useNavBadges } from '../useNavBadges';

type AnyNavState = NavigationState | PartialState<NavigationState>;

/** Walks the focused route down through nested navigators, e.g. ["Tabs", "StockTab", "ReturnStockList"]. */
export function getFocusedChain(state: AnyNavState | undefined): string[] {
  if (!state || !state.routes || state.routes.length === 0) return [];
  const index = state.index ?? state.routes.length - 1;
  const route = state.routes[index];
  if (!route) return [];
  const nested = (route as { state?: AnyNavState }).state;
  return [route.name, ...getFocusedChain(nested)];
}

/**
 * Every role's drawer menu (Branch, Production, Finance, Super Admin): the signed-in role's
 * shell (`roleShells.ts`) supplies the items, badges and context line, so this
 * component never checks a role itself. Layout lives in `DrawerMenu`.
 */
export function DrawerContent({ navigation, state }: DrawerContentComponentProps) {
  const user = useAuthStore((s) => s.user);
  const { navItems, contextLine } = useRoleShell();
  const badges = useNavBadges();

  const focusedChain = getFocusedChain(state);
  const activeIndex = navItems.findIndex((item) => isNavItemActive(item, focusedChain));
  const rows: DrawerMenuRow[] = navItems.map((item, index) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    section: DRAWER_GROUPED ? GROUP_LABEL[item.group] : null,
    active: index === activeIndex,
    badgeCount: item.badgeSource ? badges[item.badgeSource] : undefined,
    badgeDot: item.badgeDot,
    badgeTone: item.badgeTone,
    onPress: () => item.navigate(navigation),
  }));

  return (
    <DrawerMenu
      roleLabel={user ? roleLabel(user.role) : ''}
      contextLine={user ? contextLine(user) : ''}
      rows={rows}
      closeDrawer={navigation.closeDrawer}
      onPressProfile={() => {
        navigation.closeDrawer();
        navigation.navigate(Routes.PROFILE);
      }}
    />
  );
}
