import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import { HomeStackNavigator } from '../HomeStackNavigator';
import { SalesStackNavigator } from '../SalesStackNavigator';
import { OrdersStackNavigator } from '../OrdersStackNavigator';
import { StockStackNavigator } from '../StockStackNavigator';
import { Routes } from '../routes';
import { tabBarScreenOptions } from '../tabBarScreenOptions';
import type { BottomTabParamList } from '../types';
import { NoopScreen } from './NoopScreen';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';

const Tab = createBottomTabNavigator<BottomTabParamList>();

// mountainbakesBranch.html's own tab icons (design line ~1273), not a
// placeholder borrowed from elsewhere in the icon set.
const TAB_ICON: Record<string, IconName> = {
  [Routes.HOME_TAB]: 'home',
  [Routes.SALES_TAB]: 'sales',
  [Routes.ORDERS_TAB]: 'orders',
  [Routes.STOCK_TAB]: 'stock',
  [Routes.MORE_TAB]: 'more',
};

/**
 * design UIandUX/mountainbakesBranch.html's own tab order — Home, Orders,
 * Sales, Stock, More — which supersedes CLAUDE.md Section 4's listed order
 * per the file's own "SUPERSEDED ON VISUALS/STRUCTURE" note. "More" (which
 * opens the drawer, not its own stack) is out of Phase 1's build scope — its
 * `tabPress` is intercepted so tapping it never actually navigates to the
 * never-rendered `NoopScreen`.
 */
export function BottomTabNavigator() {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabBarScreenOptions(theme),
        tabBarIcon: ({ color, size }: { color: string; size: number }) => <Icon name={TAB_ICON[route.name] ?? 'home'} color={color} size={size} />,
      })}>
      <Tab.Screen name={Routes.HOME_TAB} component={HomeStackNavigator} options={{ title: 'Home' }} />
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
