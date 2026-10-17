import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import type { NavigationState, PartialState } from '@react-navigation/native';
import { useAppTheme } from '@/shared/theme';
import { GlowLayer, WARM_GLOW_RGB } from '@/shared/ui';
import { useAuthStore, useOfflineQueueStore } from '@/state';
import { BranchStrip, DrawerFooter, DrawerHeader, DrawerItem, DrawerSectionLabel, SignOutSheet } from '../components';
import { computeDrawerRowMetrics, computeHeaderLogoSize } from '../components/drawerLayout';
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
 * `main app shell` — charcoal theme matching the rest of the app (`colors.bg`
 * + a dim warm glow, same family as Splash/Login's), orange active pill,
 * hairline dividers + chevrons between rows, and a compact header/branch
 * strip/footer sized so all 13 items fit without scrolling on a normal
 * phone — see `drawerLayout.ts` for the row-height math.
 */
export function DrawerContent({ navigation, state }: DrawerContentComponentProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
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

  const headerLogoSize = computeHeaderLogoSize(windowWidth);
  const metrics = computeDrawerRowMetrics(windowHeight, insets.top, insets.bottom, NAV_ITEMS.length, headerLogoSize);
  const activeIndex = NAV_ITEMS.findIndex((item) => isNavItemActive(item, focusedChain));

  let lastGroup: string | null = null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GlowLayer rgb={WARM_GLOW_RGB} alpha={0.18} corner="topRight" />

      <DrawerHeader roleLabel={roleLabel} insetTop={insets.top} logoSize={headerLogoSize} />
      <BranchStrip branchName={user?.branchName ?? 'No branch assigned'} />

      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} scrollEnabled={metrics.needsScroll} contentContainerStyle={{ paddingTop: theme.spacing.xs }}>
          {NAV_ITEMS.map((item, index) => {
            const showGroupLabel = DRAWER_GROUPED && item.group !== lastGroup;
            lastGroup = item.group;
            const active = index === activeIndex;
            // No divider directly above or below the active pill — it already
            // reads as its own self-contained shape without one.
            const isLast = index === NAV_ITEMS.length - 1;
            const nextIsActive = index + 1 === activeIndex;
            const showDividerBelow = !isLast && !active && !nextIsActive;
            return (
              <View key={item.key}>
                {showGroupLabel ? <DrawerSectionLabel label={GROUP_LABEL[item.group]} /> : null}
                <DrawerItem
                  label={item.label}
                  icon={item.icon}
                  active={active}
                  badgeCount={item.badgeSource ? badges[item.badgeSource] : undefined}
                  onPress={() => item.navigate(navigation)}
                  rowHeight={metrics.rowHeight}
                  iconSize={metrics.iconSize}
                  fontSize={metrics.fontSize}
                  lineHeight={metrics.lineHeight}
                  showDividerBelow={showDividerBelow}
                />
              </View>
            );
          })}
        </ScrollView>
        {/* Only the small-screen/large-font-scale fallback ever actually
            scrolls (see drawerLayout.ts#needsScroll) — this hints that there's
            more below without adding permanent visual noise to the common
            case, where every item already fits. */}
        {metrics.needsScroll ? (
          <LinearGradient
            colors={[`${theme.colors.background}00`, theme.colors.background]}
            pointerEvents="none"
            style={styles.scrollFade}
          />
        ) : null}
      </View>

      <DrawerFooter
        name={user?.displayName ?? roleLabel}
        email={user?.email ?? ''}
        pendingSyncCount={pendingCount + failedCount}
        onSignOut={() => setSignOutOpen(true)}
        insetBottom={insets.bottom}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 24 },
});
