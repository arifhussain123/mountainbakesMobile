import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAppTheme, useResponsive } from '@/shared/theme';
import { images } from '@/assets';
import { useAuthStore } from '@/state';
import { Routes } from '../routes';

interface MenuItem {
  label: string;
  onPress: (navigation: DrawerContentComponentProps['navigation']) => void;
}

const goToTab = (tab: string, screen?: string) => (navigation: DrawerContentComponentProps['navigation']) => {
  navigation.closeDrawer();
  navigation.navigate(Routes.PRODUCTION_TABS, { screen: tab, params: screen ? { screen } : undefined });
};

const goToDrawerStack = (stack: string) => (navigation: DrawerContentComponentProps['navigation']) => {
  navigation.closeDrawer();
  navigation.navigate(stack);
};

const SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', onPress: goToTab(Routes.PRODUCTION_DASHBOARD_TAB) },
      { label: 'Production Orders', onPress: goToTab(Routes.PRODUCTION_ORDERS_TAB) },
      { label: 'Sales', onPress: goToTab(Routes.PRODUCTION_SALES_TAB) },
      { label: 'Production Stock', onPress: goToTab(Routes.PRODUCTION_STOCK_TAB) },
      { label: 'Returns', onPress: goToDrawerStack(Routes.PRODUCTION_RETURNS_STACK) },
      { label: 'Discounts', onPress: goToDrawerStack(Routes.PRODUCTION_DISCOUNTS_STACK) },
      { label: 'Special Events', onPress: goToDrawerStack(Routes.PRODUCTION_EVENTS_STACK) },
      { label: 'Reports', onPress: goToDrawerStack(Routes.PRODUCTION_REPORTS_STACK) },
      { label: 'Help Desk', onPress: goToDrawerStack(Routes.PRODUCTION_HELP_DESK_STACK) },
    ],
  },
];

/** mountainbakesProduction.html screen 16 — Drawer, scoped to the Production role's own menu. */
export function ProductionDrawerContent({ navigation }: DrawerContentComponentProps) {
  const theme = useAppTheme();
  const { clamp, ms } = useResponsive();
  const logoSize = clamp(40, ms(48), 56);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <ScrollView style={{ backgroundColor: theme.colors.surface }} contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={[styles.header, { padding: theme.spacing.lg }]}>
        <View style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 2, overflow: 'hidden' }}>
          <Image source={images.logo} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginTop: theme.spacing.sm }]}>Mountain Bakes</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>Production Unit</Text>
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
  logo: { width: '100%', height: '100%' },
  item: { height: 44, justifyContent: 'center' },
});
