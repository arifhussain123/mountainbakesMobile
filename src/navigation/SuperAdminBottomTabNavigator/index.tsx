import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { comingSoonPane } from '@/features/placeholder';
import { NoopScreen } from '../BottomTabNavigator/NoopScreen';
import { Routes } from '../routes';
import { NotchTabBar } from '../tabBar';
import type { SuperAdminBottomTabParamList } from '../types';

const Tab = createBottomTabNavigator<SuperAdminBottomTabParamList>();

// Placeholders until each screen's own brief is built (and, for Branch Stock
// and Reports, until they have an all-branches mode). Built once, not per render.
const DashboardPane = comingSoonPane('Dashboard');
const OrdersPane = comingSoonPane('Orders');
const BranchStockPane = comingSoonPane('Branch Stock');
const ReportsPane = comingSoonPane('Reports');

/**
 * Super Admin's tabs — Dashboard, Orders, Branch Stock, Reports, More — on the
 * same `NotchTabBar` as every other role. Icons, labels and badges are
 * `SUPER_ADMIN_TAB_ITEMS` (`tabItems.ts`).
 */
export function SuperAdminBottomTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <NotchTabBar {...props} />}>
      <Tab.Screen name={Routes.SUPER_ADMIN_DASHBOARD_TAB} component={DashboardPane} options={{ title: 'Dashboard' }} />
      <Tab.Screen name={Routes.SUPER_ADMIN_ORDERS_TAB} component={OrdersPane} options={{ title: 'Orders' }} />
      <Tab.Screen name={Routes.SUPER_ADMIN_BRANCH_STOCK_TAB} component={BranchStockPane} options={{ title: 'Branch Stock' }} />
      <Tab.Screen name={Routes.SUPER_ADMIN_REPORTS_TAB} component={ReportsPane} options={{ title: 'Reports' }} />
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
