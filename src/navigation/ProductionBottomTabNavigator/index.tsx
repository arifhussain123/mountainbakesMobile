import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { NoopScreen } from '../BottomTabNavigator/NoopScreen';
import { ProductionHomeStackNavigator } from '../ProductionHomeStackNavigator';
import { ProductionOrdersStackNavigator } from '../ProductionOrdersStackNavigator';
import { ProductionSalesStackNavigator } from '../ProductionSalesStackNavigator';
import { ProductionStockStackNavigator } from '../ProductionStockStackNavigator';
import { Routes } from '../routes';
import { tabBarScreenOptions } from '../tabBarScreenOptions';
import type { ProductionBottomTabParamList } from '../types';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';

const Tab = createBottomTabNavigator<ProductionBottomTabParamList>();

// Same icon set as the Branch shell's tabs (mountainbakesBranch.html design
// line ~1273) — Dashboard reads as "Home" here, the rest line up directly.
const TAB_ICON: Record<string, IconName> = {
  [Routes.PRODUCTION_DASHBOARD_TAB]: 'home',
  [Routes.PRODUCTION_ORDERS_TAB]: 'orders',
  [Routes.PRODUCTION_SALES_TAB]: 'sales',
  [Routes.PRODUCTION_STOCK_TAB]: 'stock',
  [Routes.PRODUCTION_MORE_TAB]: 'more',
};

export function ProductionBottomTabNavigator() {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabBarScreenOptions(theme),
        tabBarIcon: ({ color, size }: { color: string; size: number }) => <Icon name={TAB_ICON[route.name] ?? 'home'} color={color} size={size} />,
      })}>
      <Tab.Screen name={Routes.PRODUCTION_DASHBOARD_TAB} component={ProductionHomeStackNavigator} options={{ title: 'Dashboard' }} />
      <Tab.Screen name={Routes.PRODUCTION_ORDERS_TAB} component={ProductionOrdersStackNavigator} options={{ title: 'Orders' }} />
      <Tab.Screen name={Routes.PRODUCTION_SALES_TAB} component={ProductionSalesStackNavigator} options={{ title: 'Sales' }} />
      <Tab.Screen name={Routes.PRODUCTION_STOCK_TAB} component={ProductionStockStackNavigator} options={{ title: 'Stock' }} />
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
