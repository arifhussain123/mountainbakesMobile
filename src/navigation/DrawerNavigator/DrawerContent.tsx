import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAppTheme } from '@/shared/theme';
import { images } from '@/assets';
import { useAuthStore } from '@/state';
import { Routes } from '../routes';
import { openComingSoon } from '../helpers';

interface MenuItem {
  label: string;
  onPress: (navigation: DrawerContentComponentProps['navigation']) => void;
}

const goToTab = (tab: string, screen?: string) => (navigation: DrawerContentComponentProps['navigation']) => {
  navigation.closeDrawer();
  navigation.navigate(Routes.TABS, { screen: tab, params: screen ? { screen } : undefined });
};

const goToDrawerStack = (stack: string, screen?: string) => (navigation: DrawerContentComponentProps['navigation']) => {
  navigation.closeDrawer();
  navigation.navigate(stack, screen ? { screen } : undefined);
};

const comingSoon = (title: string) => (navigation: DrawerContentComponentProps['navigation']) => {
  navigation.closeDrawer();
  openComingSoon(title);
};

/** CLAUDE.md Section 5's Main / Management / Support / Account groups. */
const SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', onPress: goToTab(Routes.HOME_TAB) },
      { label: 'New Sale', onPress: goToTab(Routes.SALES_TAB, Routes.NEW_SALE) },
      { label: 'Sales History', onPress: goToTab(Routes.SALES_TAB, Routes.SALES_LIST) },
      { label: 'Orders', onPress: goToTab(Routes.ORDERS_TAB) },
      { label: 'Stock', onPress: goToTab(Routes.STOCK_TAB) },
      { label: 'Stock History', onPress: comingSoon('Stock History') },
      { label: 'Branch Demand', onPress: comingSoon('Branch Demand') },
      { label: 'Returns', onPress: goToTab(Routes.STOCK_TAB, Routes.RETURN_STOCK_LIST) },
      { label: 'Discounts', onPress: goToDrawerStack(Routes.DISCOUNTS_STACK) },
      { label: 'Cash Deposits', onPress: goToDrawerStack(Routes.CASH_STACK) },
      { label: 'Expenses', onPress: goToDrawerStack(Routes.EXPENSES_STACK) },
      { label: 'Special Events', onPress: goToDrawerStack(Routes.EVENTS_STACK) },
      { label: 'Branch Closing', onPress: goToDrawerStack(Routes.CLOSING_STACK, Routes.BRANCH_CLOSING) },
      { label: 'Daily Sale Record', onPress: goToDrawerStack(Routes.CLOSING_STACK, Routes.DAILY_SALE_RECORD) },
      { label: 'Reports', onPress: goToDrawerStack(Routes.REPORTS_STACK) },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Products', onPress: comingSoon('Products') },
      { label: 'Price List', onPress: comingSoon('Price List') },
      { label: 'Packaging Materials', onPress: comingSoon('Packaging Materials') },
      { label: 'Notifications', onPress: comingSoon('Notifications') },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Support Center', onPress: comingSoon('Support Center') },
      { label: 'Help Desk', onPress: goToDrawerStack(Routes.HELP_DESK_STACK) },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', onPress: goToDrawerStack(Routes.PROFILE) },
      { label: 'Settings', onPress: goToDrawerStack(Routes.SETTINGS) },
    ],
  },
];

export function DrawerContent({ navigation }: DrawerContentComponentProps) {
  const theme = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <ScrollView style={{ backgroundColor: theme.colors.surface }} contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={[styles.header, { padding: theme.spacing.lg }]}>
        <Image source={images.logo} style={styles.logo} />
        <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginTop: theme.spacing.sm }]}>Mountain Bakes</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
          {user?.branchName ?? 'No branch assigned'}
        </Text>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={{ marginTop: theme.spacing.md }}>
          <Text
            style={[
              theme.typography.label,
              { color: theme.colors.textSecondary, paddingHorizontal: theme.spacing.lg, textTransform: 'uppercase', letterSpacing: 0.6 },
            ]}>
            {section.title}
          </Text>
          {section.items.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              onPress={() => item.onPress(navigation)}
              style={({ pressed }) => [
                styles.item,
                { paddingHorizontal: theme.spacing.lg, backgroundColor: pressed ? theme.colors.background : 'transparent' },
              ]}>
              <Text style={[theme.typography.body, { color: theme.colors.text }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ))}

      <View style={{ marginTop: theme.spacing.xl, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.md }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            navigation.closeDrawer();
            void logout();
          }}
          style={[styles.item, { paddingHorizontal: theme.spacing.lg }]}>
          <Text style={[theme.typography.body, { color: theme.colors.danger, fontWeight: '600' }]}>Logout</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'flex-start' },
  logo: { width: 48, height: 48, borderRadius: 24 },
  item: { height: 44, justifyContent: 'center' },
});
