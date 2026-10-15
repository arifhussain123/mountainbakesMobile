import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductionEventDemandScreen, ProductionEventsListScreen } from '@/features/production';
import { Routes } from '../routes';
import type { ProductionEventsStackParamList } from '../types';

const Stack = createNativeStackNavigator<ProductionEventsStackParamList>();

/** mountainbakesProduction.html screen 12 — Special Events: upcoming events, then one event's branch demand + preparation. */
export function ProductionEventsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.PRODUCTION_EVENTS_LIST} component={ProductionEventsListScreen} />
      <Stack.Screen name={Routes.PRODUCTION_EVENT_DEMAND} component={ProductionEventDemandScreen} />
    </Stack.Navigator>
  );
}
