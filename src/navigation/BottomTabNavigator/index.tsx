import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { HomeStackNavigator } from '../HomeStackNavigator';
import { SalesStackNavigator } from '../SalesStackNavigator';
import { OrdersStackNavigator } from '../OrdersStackNavigator';
import { StockStackNavigator } from '../StockStackNavigator';
import { Routes } from '../routes';
import type { BottomTabParamList } from '../types';
import { NoopScreen } from './NoopScreen';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const TAB_ICON: Record<string, IconName> = {
  [Routes.HOME_TAB]: 'menu',
  [Routes.SALES_TAB]: 'search',
  [Routes.ORDERS_TAB]: 'check',
  [Routes.STOCK_TAB]: 'refresh',
  [Routes.MORE_TAB]: 'menu',
};

/**
 * CLAUDE.md Section 4: Home, Sales, Orders, Stock, More. "More" (which per
 * Section 4 opens the drawer, not its own stack) is out of Phase 1's build
 * scope — its `tabPress` is intercepted so tapping it never actually
 * navigates to the never-rendered `NoopScreen`.
 */
export function BottomTabNavigator() {
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
      <Tab.Screen name={Routes.HOME_TAB} component={HomeStackNavigator} options={{ title: 'Home' }} />
      <Tab.Screen name={Routes.SALES_TAB} component={SalesStackNavigator} options={{ title: 'Sales' }} />
      <Tab.Screen name={Routes.ORDERS_TAB} component={OrdersStackNavigator} options={{ title: 'Orders' }} />
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
