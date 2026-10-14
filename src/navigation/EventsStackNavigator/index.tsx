import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EventDemandScreen, SpecialEventsScreen } from '@/features/events';
import { Routes } from '../routes';
import type { EventsStackParamList } from '../types';

const Stack = createNativeStackNavigator<EventsStackParamList>();

export function EventsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.SPECIAL_EVENTS} component={SpecialEventsScreen} />
      <Stack.Screen name={Routes.EVENT_DEMAND} component={EventDemandScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
