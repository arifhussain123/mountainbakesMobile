import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { AdminBranchStockScreen, AdminDashboardScreen, AdminReportsScreen } from '@/features/admin';
import { NoopScreen } from '../BottomTabNavigator/NoopScreen';
import { Routes } from '../routes';
import { SuperAdminOrdersStackNavigator } from '../SuperAdminOrdersStackNavigator';
import { NotchTabBar } from '../tabBar';
import type { SuperAdminBottomTabParamList } from '../types';

const Tab = createBottomTabNavigator<SuperAdminBottomTabParamList>();

/**
 * Super Admin's tabs — Dashboard, Orders, Branch Stock, Reports, More — on the
 * same `NotchTabBar` as every other role. Icons, labels and badges are
 * `SUPER_ADMIN_TAB_ITEMS` (`tabItems.ts`). Each tab is Super Admin's own
 * screen (`features/admin`), matching the web's Dashboard, Production
 * Orders, Branch Stock Control and Reports pages.
 */
export function SuperAdminBottomTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <NotchTabBar {...props} />}>
      <Tab.Screen name={Routes.SUPER_ADMIN_DASHBOARD_TAB} component={AdminDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name={Routes.SUPER_ADMIN_ORDERS_TAB} component={SuperAdminOrdersStackNavigator} options={{ title: 'Orders' }} />
      <Tab.Screen name={Routes.SUPER_ADMIN_BRANCH_STOCK_TAB} component={AdminBranchStockScreen} options={{ title: 'Branch Stock' }} />
      <Tab.Screen name={Routes.SUPER_ADMIN_REPORTS_TAB} component={AdminReportsScreen} options={{ title: 'Reports' }} />
      <Tab.Screen
        name={Routes.SUPER_ADMIN_MORE_TAB}
        component={NoopScreen}
        options={{ title: 'More' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.getParent()?.dispatch(DrawerActions.openDrawer());
          },
        })}
      />
    </Tab.Navigator>
  );
}
