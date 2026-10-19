import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { NoopScreen } from '../BottomTabNavigator/NoopScreen';
import { ProductionHomeStackNavigator } from '../ProductionHomeStackNavigator';
import { ProductionOrdersStackNavigator } from '../ProductionOrdersStackNavigator';
import { ProductionReturnsStackNavigator } from '../ProductionReturnsStackNavigator';
import { ProductionStockStackNavigator } from '../ProductionStockStackNavigator';
import { Routes } from '../routes';
import { NotchTabBar } from '../tabBar';
import type { ProductionBottomTabParamList } from '../types';

const Tab = createBottomTabNavigator<ProductionBottomTabParamList>();

/**
 * Production's tabs — Dashboard, Orders, Production Stock, Returns,
 * More — on the same `NotchTabBar` as the Branch shell. Icons, labels and
 * badges are `PRODUCTION_TAB_ITEMS` (`tabItems.ts`); this only maps each route
 * to its stack. Like the Branch shell, the bar is an absolute overlay, so each
 * tab-root screen pads its own scroll content by `useTabBarHeight()`.
 */
export function ProductionBottomTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <NotchTabBar {...props} />}>
      <Tab.Screen name={Routes.PRODUCTION_DASHBOARD_TAB} component={ProductionHomeStackNavigator} options={{ title: 'Dashboard' }} />
      <Tab.Screen name={Routes.PRODUCTION_ORDERS_TAB} component={ProductionOrdersStackNavigator} options={{ title: 'Orders' }} />
      <Tab.Screen name={Routes.PRODUCTION_STOCK_TAB} component={ProductionStockStackNavigator} options={{ title: 'Production Stock' }} />
      <Tab.Screen name={Routes.PRODUCTION_RETURNS_TAB} component={ProductionReturnsStackNavigator} options={{ title: 'Returns' }} />
      <Tab.Screen
        name={Routes.PRODUCTION_MORE_TAB}
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
