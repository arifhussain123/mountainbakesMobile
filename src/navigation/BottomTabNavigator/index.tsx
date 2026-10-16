import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { HomeStackNavigator } from '../HomeStackNavigator';
import { SalesStackNavigator } from '../SalesStackNavigator';
import { OrdersStackNavigator } from '../OrdersStackNavigator';
import { StockStackNavigator } from '../StockStackNavigator';
import { Routes } from '../routes';
import { NotchTabBar } from '../tabBar/NotchTabBar';
import type { BottomTabParamList } from '../types';
import { NoopScreen } from './NoopScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

/**
 * design UIandUX/mountainbakesBranch.html's own tab order — Home, Orders,
 * Sales, Stock, More — which supersedes CLAUDE.md Section 4's listed order
 * per the file's own "SUPERSEDED ON VISUALS/STRUCTURE" note.
 *
 * Rendering is entirely `NotchTabBar`'s (the animated notch bar) — icons,
 * labels, badges and the "More opens the drawer, never active" rule all live
 * in `tabItems.ts`/`NotchTabBar`, not here. "More"'s screen is still a real
 * (never-rendered) `Tab.Screen` so React Navigation keeps a route/state slot
 * for it; its `tabPress` is intercepted the same way as before so it never
 * actually navigates to `NoopScreen`.
 */
export function BottomTabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <NotchTabBar {...props} />}>
      <Tab.Screen name={Routes.HOME_TAB} component={HomeStackNavigator} options={{ title: 'Dashboard' }} />
      <Tab.Screen name={Routes.ORDERS_TAB} component={OrdersStackNavigator} options={{ title: 'Orders' }} />
      <Tab.Screen name={Routes.SALES_TAB} component={SalesStackNavigator} options={{ title: 'Sales' }} />
      <Tab.Screen name={Routes.STOCK_TAB} component={StockStackNavigator} options={{ title: 'Stock' }} />
      <Tab.Screen
        name={Routes.MORE_TAB}
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
