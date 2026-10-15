import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductionDashboardScreen } from '@/features/production';
import { Routes } from '../routes';

const Stack = createNativeStackNavigator();

export function ProductionHomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.PRODUCTION_DASHBOARD} component={ProductionDashboardScreen} />
    </Stack.Navigator>
  );
}
