import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import type { NavigationState, PartialState } from '@react-navigation/native';
import { useAppTheme } from '@/shared/theme';
import { GlowLayer, WARM_GLOW_RGB } from '@/shared/ui';
import { useAppearanceSheetStore } from '@/features/appearance';
import { useAuthStore, useOfflineQueueStore } from '@/state';
import { Routes } from '../routes';
import { BranchStrip, DrawerFooter, DrawerHeader, DrawerItem, DrawerSectionLabel, SignOutSheet } from '../components';
import { MENU_CONTENT_HORIZONTAL_PADDING, MENU_CONTENT_WIDTH_RATIO } from '../components/drawerLayout';
import { MountainWatermark } from '../components/MountainWatermark';
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

/**
 * "3D slide-back" menu — full-screen charcoal background (warm top-left glow
 * + a diagonal mountain-outline watermark), with the actual header/branch
 * line/item list/footer constrained to `MENU_CONTENT_WIDTH_RATIO` so nothing
 * ever sits under the tilted, part-opaque screen card (see
 * `DrawerScreenCard`, rendered around every screen, not here — this
 * component only ever renders the menu side).
 */
export function DrawerContent({ navigation, state }: DrawerContentComponentProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const pendingCount = useOfflineQueueStore((s) => s.pendingCount);
  const failedCount = useOfflineQueueStore((s) => s.failedCount);
  const badges = useNavBadges();
  const openAppearance = useAppearanceSheetStore((s) => s.open);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const focusedChain = getFocusedChain(state);
  const roleLabel = user ? (ROLE_LABEL[user.role] ?? user.role) : 'Branch Manager';
  const contentWidth = windowWidth * MENU_CONTENT_WIDTH_RATIO;

  const handleSignOut = () => {
    setSignOutOpen(false);
    navigation.closeDrawer();
    void logout();
  };

  const activeIndex = NAV_ITEMS.findIndex((item) => isNavItemActive(item, focusedChain));

  let lastGroup: string | null = null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GlowLayer rgb={WARM_GLOW_RGB} alpha={0.22} corner="topLeft" />
      <MountainWatermark />

      {__DEV__ ? (
        <Text style={{ position: 'absolute', top: insets.top, color: 'lime', fontSize: 9, zIndex: 10 }}>
          chain={JSON.stringify(focusedChain)} activeIndex={activeIndex}
        </Text>
      ) : null}

      <View style={{ width: contentWidth }}>
        <DrawerHeader roleLabel={roleLabel} insetTop={insets.top} />
        <BranchStrip branchName={user?.branchName ?? 'No branch assigned'} />
        <View style={[styles.headerDivider, { marginHorizontal: MENU_CONTENT_HORIZONTAL_PADDING, backgroundColor: theme.colors.border }]} />
      </View>

      <View style={{ flex: 1, width: contentWidth }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
          {NAV_ITEMS.map((item, index) => {
            const showSectionLabel = DRAWER_GROUPED && item.group !== lastGroup;
            const showDividerAbove = showSectionLabel && lastGroup !== null;
            lastGroup = item.group;
            return (
              <View key={item.key}>
                {showSectionLabel ? <DrawerSectionLabel label={GROUP_LABEL[item.group]} showDividerAbove={showDividerAbove} /> : null}
                <DrawerItem
                  label={item.label}
                  icon={item.icon}
                  active={index === activeIndex}
                  badgeCount={item.badgeSource ? badges[item.badgeSource] : undefined}
                  onPress={() => item.navigate(navigation)}
                />
              </View>
            );
          })}

          <DrawerSectionLabel label="Settings" showDividerAbove />
          <DrawerItem label="Appearance" icon="palette" active={false} onPress={openAppearance} />
          <DrawerItem label="Logout" icon="logout" active={false} destructive onPress={() => setSignOutOpen(true)} />
        </ScrollView>
      </View>

      <View style={{ width: contentWidth }}>
        <DrawerFooter
          name={user?.displayName ?? roleLabel}
          pendingSyncCount={pendingCount + failedCount}
          onPressProfile={() => {
            navigation.closeDrawer();
            navigation.navigate(Routes.PROFILE);
          }}
          insetBottom={insets.bottom}
        />
      </View>

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerDivider: { height: StyleSheet.hairlineWidth, marginTop: 4 },
});
