import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import type { NavigationState, PartialState } from '@react-navigation/native';
import { useAppTheme } from '@/shared/theme';
import { useAuthStore, useOfflineQueueStore } from '@/state';
import { BranchStrip, DrawerFooter, DrawerHeader, DrawerItem, DrawerSectionLabel, SignOutSheet } from '../components';
import { DRAWER_GROUPED, GROUP_LABEL, NAV_ITEMS, isNavItemActive } from '../navItems';
import { useNavBadges } from '../useNavBadges';

type AnyNavState = NavigationState | PartialState<NavigationState>;

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  branch_manager: 'Branch Manager',
  production_user: 'Production',
  finance_admin: 'Finance Admin',
  finance_manager: 'Finance Manager',
  accountant: 'Accountant',
  finance_auditor: 'Finance Auditor',
};

/** Walks the focused route down through nested navigators, e.g. ["Tabs", "StockTab", "ReturnStockList"]. */
function getFocusedChain(state: AnyNavState | undefined): string[] {
  if (!state || !state.routes || state.routes.length === 0) return [];
  const index = state.index ?? state.routes.length - 1;
  const route = state.routes[index];
  if (!route) return [];
  const nested = (route as { state?: AnyNavState }).state;
  return [route.name, ...getFocusedChain(nested)];
}

/** `main app shell` — matches the Drawer visual spec: deep-brown chrome, orange active pill, branch strip, footer with Sign Out. */
export function DrawerContent({ navigation, state }: DrawerContentComponentProps) {
  const theme = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const pendingCount = useOfflineQueueStore((s) => s.pendingCount);
  const failedCount = useOfflineQueueStore((s) => s.failedCount);
  const badges = useNavBadges();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const focusedChain = getFocusedChain(state);
  const roleLabel = user ? (ROLE_LABEL[user.role] ?? user.role) : 'Branch Manager';

  const handleSignOut = () => {
    setSignOutOpen(false);
    navigation.closeDrawer();
    void logout();
  };

  let lastGroup: string | null = null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.drawer.bg }}>
      <DrawerHeader roleLabel={roleLabel} />
      <BranchStrip branchName={user?.branchName ?? 'No branch assigned'} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: theme.spacing.sm }}>
        {NAV_ITEMS.map((item) => {
          const showGroupLabel = DRAWER_GROUPED && item.group !== lastGroup;
          lastGroup = item.group;
          const active = isNavItemActive(item, focusedChain);
          return (
            <View key={item.key}>
              {showGroupLabel ? <DrawerSectionLabel label={GROUP_LABEL[item.group]} /> : null}
              <View style={{ marginTop: 2, marginBottom: 2 }}>
                <DrawerItem
                  label={item.label}
                  icon={item.icon}
                  active={active}
                  badgeCount={item.badgeSource ? badges[item.badgeSource] : undefined}
                  onPress={() => item.navigate(navigation)}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <DrawerFooter
        name={user?.displayName ?? roleLabel}
        email={user?.email ?? ''}
        pendingSyncCount={pendingCount + failedCount}
        onSignOut={() => setSignOutOpen(true)}
      />

      <SignOutSheet
        visible={signOutOpen}
        pendingCount={pendingCount}
        failedCount={failedCount}
        onSignOut={handleSignOut}
        onClose={() => setSignOutOpen(false)}
      />
    </View>
  );
}
