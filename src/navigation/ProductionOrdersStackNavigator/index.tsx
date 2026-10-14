import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductionOrderDetailScreen, ProductionOrdersListScreen } from '@/features/production';
import { Routes } from '../routes';
import type { ProductionOrdersStackParamList } from '../types';

const Stack = createNativeStackNavigator<ProductionOrdersStackParamList>();

export function ProductionOrdersStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.PRODUCTION_ORDERS_LIST} component={ProductionOrdersListScreen} />
      <Stack.Screen name={Routes.PRODUCTION_ORDER_DETAIL} component={ProductionOrderDetailScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
