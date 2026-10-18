import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BranchClosingScreen, DailySaleDetailScreen, DailySaleRecordListScreen } from '@/features/closing';
import { Routes } from '../routes';
import type { ClosingStackParamList } from '../types';

const Stack = createNativeStackNavigator<ClosingStackParamList>();

/**
 * branchApp.md screens 20/21/22. Branch Closing (20) is this stack's entry
 * point, matching the reference numbering — it reads `GET /api/branch-closing`
 * (added alongside it; previously only a file export existed). Manual Feed (22)
 * is a bottom sheet owned by DailySaleRecordListScreen now, not a pushed route.
 */
export function ClosingStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={Routes.BRANCH_CLOSING}>
      <Stack.Screen name={Routes.BRANCH_CLOSING} component={BranchClosingScreen} />
      <Stack.Screen name={Routes.DAILY_SALE_RECORD} component={DailySaleRecordListScreen} />
      <Stack.Screen name={Routes.DAILY_SALE_DETAIL} component={DailySaleDetailScreen} />
    </Stack.Navigator>
  );
}
