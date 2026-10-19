import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { AdminDashboardScreen } from '@/features/admin';
import { ProductionBranchStockScreen } from '@/features/production';
import { NoopScreen } from '../BottomTabNavigator/NoopScreen';
import { ProductionOrdersStackNavigator } from '../ProductionOrdersStackNavigator';
import { ReportsStackNavigator } from '../ReportsStackNavigator';
import { Routes } from '../routes';
import { NotchTabBar } from '../tabBar';
import type { SuperAdminBottomTabParamList } from '../types';

const Tab = createBottomTabNavigator<SuperAdminBottomTabParamList>();

/**
 * Super Admin's tabs — Dashboard, Orders, Branch Stock, Reports, More — on the
 * same `NotchTabBar` as every other role. Icons, labels and badges are
 * `SUPER_ADMIN_TAB_ITEMS` (`tabItems.ts`). Orders and Branch Stock are
 * Production's all-branch screens and Reports is the branch Reports screen:
 * the server answers super_admin with every branch on each of them.
 */
export function SuperAdminBottomTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <NotchTabBar {...props} />}>
      <Tab.Screen name={Routes.SUPER_ADMIN_DASHBOARD_TAB} component={AdminDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name={Routes.SUPER_ADMIN_ORDERS_TAB} component={ProductionOrdersStackNavigator} options={{ title: 'Orders' }} />
      <Tab.Screen name={Routes.SUPER_ADMIN_BRANCH_STOCK_TAB} component={ProductionBranchStockScreen} options={{ title: 'Branch Stock' }} />
      <Tab.Screen name={Routes.SUPER_ADMIN_REPORTS_TAB} component={ReportsStackNavigator} options={{ title: 'Reports' }} />
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
