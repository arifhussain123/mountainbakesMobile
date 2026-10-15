import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { FINANCE_ROLE_LABELS, type FinanceRole } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { images } from '@/assets';
import { useAuthStore } from '@/state';
import { Routes } from '../routes';

interface MenuItem {
  label: string;
  onPress: (navigation: DrawerContentComponentProps['navigation']) => void;
}

const goToTab = (tab: string, screen?: string) => (navigation: DrawerContentComponentProps['navigation']) => {
  navigation.closeDrawer();
  navigation.navigate(Routes.FINANCE_TABS, { screen: tab, params: screen ? { screen } : undefined });
};

const goToDrawerStack = (stack: string) => (navigation: DrawerContentComponentProps['navigation']) => {
  navigation.closeDrawer();
  navigation.navigate(stack);
};

const SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', onPress: goToTab(Routes.FINANCE_DASHBOARD_TAB) },
      { label: 'Daily Ledger', onPress: goToTab(Routes.FINANCE_LEDGER_TAB) },
      { label: 'Cash Transfers', onPress: goToTab(Routes.FINANCE_CASH_TRANSFERS_TAB) },
      { label: 'Income & Expense', onPress: goToTab(Routes.FINANCE_INCOME_EXPENSE_TAB) },
      { label: 'Payroll', onPress: goToDrawerStack(Routes.FINANCE_PAYROLL_STACK) },
      { label: 'Partner Transactions', onPress: goToDrawerStack(Routes.FINANCE_PARTNERS_STACK) },
      { label: 'Company Transaction Details', onPress: goToDrawerStack(Routes.FINANCE_COMPANY_TRANSACTION_DETAILS_STACK) },
      { label: 'Ledger Heads', onPress: goToDrawerStack(Routes.FINANCE_LEDGER_HEADS_STACK) },
      { label: 'Daily Closing', onPress: goToDrawerStack(Routes.FINANCE_CLOSING_STACK) },
      { label: 'Reports', onPress: goToDrawerStack(Routes.FINANCE_REPORTS_STACK) },
      { label: 'Audit Trail', onPress: goToDrawerStack(Routes.FINANCE_AUDIT_TRAIL_STACK) },
    ],
  },
  {
    title: 'Support',
    items: [{ label: 'Help Desk', onPress: goToDrawerStack(Routes.FINANCE_HELP_DESK_STACK) }],
  },
];

/** mountainbakesFinance.html — no drawer mockup frame exists for this role; mirrors Branch/Production's own drawer shape. */
export function FinanceDrawerContent({ navigation }: DrawerContentComponentProps) {
  const theme = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <ScrollView style={{ backgroundColor: theme.colors.surface }} contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={[styles.header, { padding: theme.spacing.lg }]}>
        <Image source={images.logo} style={styles.logo} />
        <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginTop: theme.spacing.sm }]}>Mountain Bakes</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
          {user?.role ? (FINANCE_ROLE_LABELS[user.role as FinanceRole] ?? 'Finance') : 'Finance'}
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

      <View style={{ marginTop: theme.spacing.md }}>
        <Text
          style={[
            theme.typography.label,
            { color: theme.colors.textSecondary, paddingHorizontal: theme.spacing.lg, textTransform: 'uppercase', letterSpacing: 0.6 },
          ]}>
          Account
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => goToDrawerStack(Routes.FINANCE_SETTINGS_STACK)(navigation)}
          style={({ pressed }) => [
            styles.item,
            { paddingHorizontal: theme.spacing.lg, backgroundColor: pressed ? theme.colors.background : 'transparent' },
          ]}>
          <Text style={[theme.typography.body, { color: theme.colors.text }]}>Settings</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: theme.spacing.xl, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.md }}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, paddingHorizontal: theme.spacing.lg }]}>
          {user?.displayName ?? user?.email}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            navigation.closeDrawer();
            void logout();
          }}
          style={[styles.item, { paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm }]}>
          <Text style={[theme.typography.body, { color: theme.colors.danger, fontWeight: '600' }]}>Sign Out</Text>
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
