import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NewProductionReturnScreen, ProductionReturnDetailScreen, ProductionReturnsListScreen } from '@/features/production';
import { Routes } from '../routes';
import type { ProductionReturnsStackParamList } from '../types';

const Stack = createNativeStackNavigator<ProductionReturnsStackParamList>();

/** mountainbakesProduction.html screen 10 — Product Returns: review a branch's return, or record one directly. */
export function ProductionReturnsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.PRODUCTION_RETURNS_LIST} component={ProductionReturnsListScreen} />
      <Stack.Screen name={Routes.PRODUCTION_RETURN_DETAIL} component={ProductionReturnDetailScreen} />
      <Stack.Screen name={Routes.PRODUCTION_NEW_RETURN} component={NewProductionReturnScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
