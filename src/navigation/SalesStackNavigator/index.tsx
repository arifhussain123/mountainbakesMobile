import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NewSaleScreen, SaleDetailScreen, SalesListScreen } from '@/features/sales';
import { Routes } from '../routes';
import type { SalesStackParamList } from '../types';

const Stack = createNativeStackNavigator<SalesStackParamList>();

export function SalesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.SALES_LIST} component={SalesListScreen} />
      <Stack.Screen name={Routes.NEW_SALE} component={NewSaleScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name={Routes.SALE_DETAIL} component={SaleDetailScreen} />
    </Stack.Navigator>
  );
}
