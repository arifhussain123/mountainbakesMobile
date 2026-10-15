import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import type { NavigationState, PartialState } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useAppTheme } from '@/shared/theme';
import { useAuthStore } from '@/state';
import { Routes } from '../routes';

type AnyNavState = NavigationState | PartialState<NavigationState>;

interface MenuItem {
  label: string;
  onPress: (navigation: DrawerContentComponentProps['navigation']) => void;
  /** True when `chain` (the focused route-name path from the drawer down) means this item is the active one. */
  isActive: (chain: string[]) => boolean;
}

const goToTab = (tab: string, screen?: string) => (navigation: DrawerContentComponentProps['navigation']) => {
  navigation.closeDrawer();
  navigation.navigate(Routes.TABS, { screen: tab, params: screen ? { screen } : undefined });
};

const goToDrawerStack = (stack: string, screen?: string) => (navigation: DrawerContentComponentProps['navigation']) => {
  navigation.closeDrawer();
  navigation.navigate(stack, screen ? { screen } : undefined);
};

/** Active when the focused chain passes through the Tabs route and this tab, and (if given) ends at this nested screen. */
const tabActive = (tab: string, screen?: string) => (chain: string[]) => {
  if (!chain.includes(Routes.TABS) || !chain.includes(tab)) return false;
  return screen ? chain[chain.length - 1] === screen : true;
};

/** Active when the focused chain passes through this drawer-level stack and (if given) ends at this nested screen. */
const stackActive = (stack: string, screen?: string) => (chain: string[]) => {
  if (!chain.includes(stack)) return false;
  return screen ? chain[chain.length - 1] === screen : true;
};

/**
 * The flat, un-grouped 13-item list from `design UIandUX/mountainbakesBranch.html`,
 * screen "26 More" — do not reintroduce section headers (see CLAUDE.md's
 * superseded-on-visuals note at the top of that file).
 */
const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', onPress: goToTab(Routes.HOME_TAB), isActive: tabActive(Routes.HOME_TAB) },
  { label: 'New Orders', onPress: goToTab(Routes.ORDERS_TAB), isActive: tabActive(Routes.ORDERS_TAB) },
  { label: 'Sales', onPress: goToTab(Routes.SALES_TAB), isActive: tabActive(Routes.SALES_TAB) },
  { label: 'Stock', onPress: goToTab(Routes.STOCK_TAB, Routes.STOCK_OVERVIEW), isActive: tabActive(Routes.STOCK_TAB, Routes.STOCK_OVERVIEW) },
  {
    label: 'Return Stock',
    onPress: goToTab(Routes.STOCK_TAB, Routes.RETURN_STOCK_LIST),
    isActive: tabActive(Routes.STOCK_TAB, Routes.RETURN_STOCK_LIST),
  },
  { label: 'Discounts', onPress: goToDrawerStack(Routes.DISCOUNTS_STACK), isActive: stackActive(Routes.DISCOUNTS_STACK) },
  { label: 'Cash Deposits', onPress: goToDrawerStack(Routes.CASH_STACK), isActive: stackActive(Routes.CASH_STACK) },
  { label: 'Shop Expenses', onPress: goToDrawerStack(Routes.EXPENSES_STACK), isActive: stackActive(Routes.EXPENSES_STACK) },
  { label: 'Events', onPress: goToDrawerStack(Routes.EVENTS_STACK), isActive: stackActive(Routes.EVENTS_STACK) },
  {
    label: 'Branch Closing',
    onPress: goToDrawerStack(Routes.CLOSING_STACK, Routes.BRANCH_CLOSING),
    isActive: stackActive(Routes.CLOSING_STACK, Routes.BRANCH_CLOSING),
  },
  {
    label: 'Daily Sale Record',
    onPress: goToDrawerStack(Routes.CLOSING_STACK, Routes.DAILY_SALE_RECORD),
    isActive: stackActive(Routes.CLOSING_STACK, Routes.DAILY_SALE_RECORD),
  },
  { label: 'Reports', onPress: goToDrawerStack(Routes.REPORTS_STACK), isActive: stackActive(Routes.REPORTS_STACK) },
  { label: 'Help Desk', onPress: goToDrawerStack(Routes.HELP_DESK_STACK), isActive: stackActive(Routes.HELP_DESK_STACK) },
];

/** Walks the focused route down through nested navigators, e.g. ["Tabs", "StockTab", "ReturnStockList"]. */
function getFocusedChain(state: AnyNavState | undefined): string[] {
  if (!state || !state.routes || state.routes.length === 0) return [];
  const index = state.index ?? state.routes.length - 1;
  const route = state.routes[index];
  if (!route) return [];
  const nested = (route as { state?: AnyNavState }).state;
  return [route.name, ...getFocusedChain(nested)];
}

function SignOutIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9" />
    </Svg>
  );
}

export function DrawerContent({ navigation, state }: DrawerContentComponentProps) {
  const theme = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const focusedChain = getFocusedChain(state);

  return (
    <ScrollView style={{ backgroundColor: theme.colors.surface }} contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={[styles.header, { padding: theme.spacing.lg }]}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.avatarText}>MB</Text>
        </View>
        <View style={{ marginLeft: theme.spacing.sm, flexShrink: 1 }}>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Mountain Bakes</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>Branch Manager</Text>
        </View>
      </View>

      <View style={[styles.branchPill, { backgroundColor: 'rgba(255, 107, 53, 0.12)', marginHorizontal: 12 }]}>
        <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>
          {user?.branchName ?? 'No branch assigned'}
        </Text>
      </View>

      <View style={{ marginTop: theme.spacing.sm }}>
        {MENU_ITEMS.map((item) => {
          const active = item.isActive(focusedChain);
          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              onPress={() => item.onPress(navigation)}
              style={({ pressed }) => [
                styles.item,
                {
                  marginHorizontal: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  backgroundColor: active ? theme.colors.primary : pressed ? theme.colors.background : 'transparent',
                },
              ]}>
              <Text style={[theme.typography.body, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: theme.spacing.xl, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.md }}>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{user?.displayName ?? 'Branch Manager'}</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>{user?.email ?? ''}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            navigation.closeDrawer();
            void logout();
          }}
          style={[styles.item, styles.signOutRow, { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm }]}>
          <SignOutIcon color={theme.colors.text} />
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#3D1C06', fontWeight: '800', fontSize: 11 },
  branchPill: { height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, flexDirection: 'row' },
  item: { height: 40, justifyContent: 'center', borderRadius: 12 },
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
