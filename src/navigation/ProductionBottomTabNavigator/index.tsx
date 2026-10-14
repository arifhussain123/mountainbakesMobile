import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { NoopScreen } from '../BottomTabNavigator/NoopScreen';
import { ProductionHomeStackNavigator } from '../ProductionHomeStackNavigator';
import { ProductionOrdersStackNavigator } from '../ProductionOrdersStackNavigator';
import { ProductionSalesStackNavigator } from '../ProductionSalesStackNavigator';
import { ProductionStockStackNavigator } from '../ProductionStockStackNavigator';
import { Routes } from '../routes';
import type { ProductionBottomTabParamList } from '../types';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';

const Tab = createBottomTabNavigator<ProductionBottomTabParamList>();

const TAB_ICON: Record<string, IconName> = {
  [Routes.PRODUCTION_DASHBOARD_TAB]: 'menu',
  [Routes.PRODUCTION_ORDERS_TAB]: 'check',
  [Routes.PRODUCTION_SALES_TAB]: 'search',
  [Routes.PRODUCTION_STOCK_TAB]: 'box',
  [Routes.PRODUCTION_MORE_TAB]: 'menu',
};

export function ProductionBottomTabNavigator() {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarIcon: ({ color, size }: { color: string; size: number }) => <Icon name={TAB_ICON[route.name] ?? 'menu'} color={color} size={size} />,
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
