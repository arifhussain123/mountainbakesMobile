import { createDrawerNavigator } from '@react-navigation/drawer';
import { blockedPane } from '@/features/placeholder';
import { ProductionBottomTabNavigator } from '../ProductionBottomTabNavigator';
import { ProductionDiscountsStackNavigator } from '../ProductionDiscountsStackNavigator';
import { ProductionEventsStackNavigator } from '../ProductionEventsStackNavigator';
import { ProductionHelpDeskStackNavigator } from '../ProductionHelpDeskStackNavigator';
import { ProductionReturnsStackNavigator } from '../ProductionReturnsStackNavigator';
import { Routes } from '../routes';
import type { ProductionDrawerParamList } from '../types';
import { ProductionDrawerContent } from './ProductionDrawerContent';

const Drawer = createDrawerNavigator<ProductionDrawerParamList>();

/**
 * `mobile-production-plan.md` (Slice P9): `/reports/*` explicitly refuses
 * `production_user` (`reports.routes.ts`'s `router.use`, `branch_manager`/`super_admin`
 * only) and no production-facing report endpoint exists. Building a screen against the
 * mockup's example rows would mean displaying fake values, which CLAUDE.md Section 14/26
 * rules out — so this stays blocked until a backend endpoint is added, not silently faked.
 */
const ProductionReportsScreen = blockedPane(
  'Production Reports',
  'Reports need their own backend endpoint for this role — the shared Reports API refuses production_user. Flagged to the owner; not built until that exists.',
);

/** mountainbakesProduction.html — the `production_user` app shell. */
export function ProductionDrawerNavigator() {
  return (
    <Drawer.Navigator screenOptions={{ headerShown: false }} drawerContent={(props) => <ProductionDrawerContent {...props} />}>
      <Drawer.Screen name={Routes.PRODUCTION_TABS} component={ProductionBottomTabNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_RETURNS_STACK} component={ProductionReturnsStackNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_DISCOUNTS_STACK} component={ProductionDiscountsStackNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_EVENTS_STACK} component={ProductionEventsStackNavigator} />
      <Drawer.Screen name={Routes.PRODUCTION_REPORTS_STACK} component={ProductionReportsScreen} />
      <Drawer.Screen name={Routes.PRODUCTION_HELP_DESK_STACK} component={ProductionHelpDeskStackNavigator} />
    </Drawer.Navigator>
  );
}
